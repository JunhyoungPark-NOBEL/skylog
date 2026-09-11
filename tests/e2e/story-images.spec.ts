import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
async function searchStory(page: Page, query: string, id: string) {
  await page.getByTestId('story-search').fill(query);
  const row = page.getByTestId('story-' + id);
  await expect(row).toBeVisible();
  return row;
}
async function imageLoaded(image: Locator) {
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
}
async function back(page: Page) {
  await page.getByTestId('story-host').getByTestId('back').click();
  await expect(page.getByTestId('stories-screen')).toBeVisible();
}

test('이야기의 실제 사진·별자리와 별 도해·공동 사진·상세 출처·읽음 표시를 연결한다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('#/learn?section=stories');
  const saturn = await searchStory(page, '토성', 'planet:saturn');
  await imageLoaded(saturn.getByTestId('object-photo-thumb'));
  await expect(page.getByTestId('stories-screen').getByTestId('photo-credit')).toHaveCount(0);
  await saturn.click();
  const story = page.getByTestId('story-view');
  await imageLoaded(story.getByTestId('object-photo-hero'));
  await expect(story.getByTestId('photo-credit')).toContainText('NASA');
  await expect(
    story.getByTestId('photo-credit').getByRole('link', { name: '원문', exact: true }),
  ).toHaveAttribute('href', /^https:\/\//);
  await story.getByTestId('story-mark-read').click();
  await back(page);
  const read = await searchStory(page, '토성', 'planet:saturn');
  await expect(read.getByTestId('story-image-read')).toBeVisible();
  const orion = await searchStory(page, '오리온', 'const:Ori');
  await expect(orion.getByTestId('story-sky-chart')).toBeVisible();
  await expect(orion.locator('img')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/qa-story-images/orion-list-ko.png' });
  await orion.click();
  await expect(story.getByTestId('story-sky-chart')).toBeVisible();
  await expect(story.getByTestId('story-chart-credit')).toContainText('d3-celestial');
  await expect(story).toContainText('사진이 아니에요');
  await page.screenshot({ path: 'artifacts/qa-story-images/orion-detail-ko.png' });
  await back(page);
  const vega = await searchStory(page, '베가', 'star:HIP91262');
  await expect(vega.getByTestId('story-chart-target')).toBeVisible();
  await expect(vega.locator('img')).toHaveCount(0);
  await vega.click();
  await expect(story).toContainText('주변 30°');
  await page.screenshot({ path: 'artifacts/qa-story-images/vega-detail-ko.png' });
  await back(page);
  const cluster = await searchStory(page, 'NGC869', 'dso:NGC869');
  await expect(cluster).toContainText('이중성단 사진');
  await cluster.click();
  await expect(story).toContainText('NGC 869와 NGC 884가 함께');
  await expect(story.getByTestId('object-photo-hero')).toHaveAttribute('data-object-id', 'dso:C14');
  expect(errors).toEqual([]);
});

test('이야기 사진 요청이 실패해도 상세 글·재시도·읽음 버튼을 유지한다', async ({ page }) => {
  await page.route('**/object-photos/v1/*.webp', (route) => route.abort());
  await page.goto('#/learn?section=stories');
  const row = await searchStory(page, '목성', 'planet:jupiter');
  await expect(row.getByTestId('story-image-fallback')).toBeVisible();
  await row.click();
  const story = page.getByTestId('story-view');
  await expect(story.getByTestId('photo-unavailable')).toBeVisible();
  await expect(story.getByTestId('story-story')).toBeVisible();
  await expect(story.getByTestId('story-mark-read')).toBeEnabled();
  await page.unroute('**/object-photos/v1/*.webp');
  await story.getByTestId('photo-unavailable').getByRole('button').click();
  await imageLoaded(story.getByTestId('object-photo-hero'));
});

test('영어 야간 360px·125%에서 사진 보호·원래 색 선택과 도해의 적색·폭을 지킨다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/settings');
  await page.locator('#setting-night').click();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/learn?section=stories');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  const row = await searchStory(page, 'Saturn', 'planet:saturn');
  await expect(row.getByTestId('object-photo-thumb')).toHaveClass(/object-photo-protected/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await row.click();
  const story = page.getByTestId('story-view');
  const hero = story.getByTestId('object-photo-hero');
  await imageLoaded(hero);
  await expect(hero).toHaveClass(/object-photo-protected/);
  expect(await hero.evaluate((node) => getComputedStyle(node).filter)).not.toBe('none');
  await story.getByTestId('photo-original').click();
  await expect(hero).toHaveCSS('filter', 'none');
  await story.getByTestId('photo-original').click();
  await story.getByTestId('photo-credit').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/qa-story-images/saturn-night-en-360.png' });
  await back(page);
  const vega = await searchStory(page, 'Vega', 'star:HIP91262');
  await vega.click();
  const chart = story.getByTestId('story-sky-chart');
  await expect(chart).toBeVisible();
  const color = await chart.evaluate((node) =>
    getComputedStyle(node).color.match(/\d+/g)!.map(Number),
  );
  expect(color[0]).toBeGreaterThan(200);
  expect(color[1]).toBeLessThan(100);
  expect(color[2]).toBeLessThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/qa-story-images/vega-night-en-360.png' });
});
