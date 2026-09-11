import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const qa = 'artifacts/qa-build23/achievements';
mkdirSync(qa, { recursive: true });

test.use({ serviceWorkers: 'block' });

test('업적 48개가 5분류·3칸으로 보이고 전체/분류 달성수·상세 조건을 확인한다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/learn?section=achievements');
  const screen = page.getByTestId('achievements-screen');
  await expect(screen).toBeVisible();
  await expect(screen.locator('article')).toHaveCount(48);
  await expect(screen.getByRole('progressbar').first()).toHaveAttribute('aria-valuemax', '48');
  await expect(screen.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId('achievement-total')).toHaveText('0 / 48 달성');
  for (const [group, count] of [
    ['discovery', 11],
    ['deepSky', 8],
    ['journal', 9],
    ['learning', 11],
    ['fieldwork', 9],
  ] as const) {
    const section = page.getByTestId('achievement-group-' + group);
    await expect(section.locator('article')).toHaveCount(count);
    await expect(section.getByTestId('achievement-group-count')).toHaveText(`0 / ${count}`);
    expect(
      await section
        .getByTestId('achievement-grid')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
    ).toBe(3);
  }
  const objects = page.getByTestId('badge-challenge-observed-objects-10');
  await expect(objects).toContainText('천체 10개');
  await expect(objects).not.toContainText('서로 다른 천체·별자리 10개');
  await expect(objects.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(objects.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '10');
  await page.screenshot({ path: `${qa}/collection-ko-360.png` });
  await objects.getByRole('button').click();
  const detail = page.getByTestId('achievement-details');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('서로 다른 천체·별자리 10개');
  await expect(detail).toContainText('열 개의 첫 발견');
  await detail.locator('svg').first().click();
  await expect(detail).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
  await expect(objects.getByRole('button')).toBeFocused();
  await screen.getByRole('button', { name: '모은 업적만 보기' }).click();
  await expect(screen.locator('article')).toHaveCount(0);
  await expect(screen).toContainText('아직 모은 업적이 없어요');
  await expect(page.getByTestId('achievement-total')).toHaveText('0 / 48 달성');
  await expect(page.getByTestId('achievement-group-count')).toHaveCount(0);
  await screen.getByRole('button', { name: '모은 업적만 보기' }).click();
  await expect(screen.locator('article')).toHaveCount(48);

  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/learn?section=achievements');
  await page.evaluate(() => (document.documentElement.style.fontSize = '125%'));
  await expect(objects).toContainText('10 objects');
  await expect(objects).toContainText('0 / 10');
  await expect(page.getByTestId('achievement-total')).toHaveText('0 / 48 earned');
  expect(
    await page
      .getByTestId('achievement-short-name')
      .evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth)),
  ).toBe(true);
  await page.screenshot({ path: `${qa}/collection-en-125.png` });
  await page.getByTestId('badge-badge-quiz-3').getByRole('button').click();
  await expect(detail).toContainText('on the first try');
  await detail.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('badge-badge-quiz-3').getByRole('button')).toBeFocused();
  await objects.getByRole('button').click();
  await expect(detail).toContainText('Record 10 different objects or constellations as seen.');
  await page.evaluate(() => (document.documentElement.dataset.theme = 'night'));
  await expect(detail.getByRole('heading', { level: 2 })).toHaveCSS('color', 'rgb(255, 59, 48)');
  await page.screenshot({ path: `${qa}/detail-night-en.png` });
  expect(await detail.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(detail.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(objects.getByRole('button')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('관측 저장·같은 대상 재기록·새로고침 뒤 업적과 고유 대상/메모/밤 진도 보존', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
  for (let i = 0; i < 2; i++) {
    await page.goto('#/log');
    await page.getByTestId('log-add').click();
    await page.getByTestId('quickpick-input').fill('moon');
    await page.getByTestId('quickpick-item').filter({ hasText: '달' }).first().click();
    await page
      .getByTestId('obs-notes')
      .fill('달의 밝은 가장자리와 어두운 바다의 모양을 자세히 비교해서 기록했어요.');
    await page.getByTestId('obs-save').click();
    await expect(page.getByTestId('observation-form')).toHaveCount(0);
    await expect(page.getByTestId('log-item')).toHaveCount(i + 1);
  }
  await page.goto('#/learn?section=achievements');
  const first = page.getByTestId('badge-badge-first-look');
  await expect(first).toContainText('획득');
  await expect(page.getByTestId('achievement-total')).toHaveText('1 / 48 달성');
  await expect(
    page.getByTestId('achievement-group-discovery').getByTestId('achievement-group-count'),
  ).toHaveText('1 / 11');
  await page.screenshot({ path: `${qa}/collection-earned-ko.png` });
  for (const [id, total] of [
    ['observed-objects-10', 10],
    ['detailed-objects-5', 5],
    ['observation-nights-3', 3],
  ] as const) {
    const progress = page.getByTestId('badge-challenge-' + id).getByRole('progressbar');
    await expect(progress).toHaveAttribute('aria-valuenow', '1');
    await expect(progress).toHaveAttribute('aria-valuemax', String(total));
  }
  await page.reload();
  await expect(first).toContainText('획득');
  await expect(page.getByTestId('badge-challenge-observed-objects-10')).toContainText('1 / 10');
  await page
    .getByTestId('achievements-screen')
    .getByRole('button', { name: '모은 업적만 보기' })
    .click();
  await expect(page.getByTestId('achievements-screen').locator('article')).toHaveCount(1);
  await expect(first).toBeVisible();
  await page.goto('#/log');
  await expect(page.getByTestId('log-item')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('이야기 목록과 상세의 별자리 선이 일반·야간에 또렷하고 실제 도형이 동일하다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/learn?section=stories');
  await page.getByTestId('story-search').fill('오리온');
  const row = page.getByTestId('story-const:Ori');
  await expect(row).toBeVisible();
  const thumbnailLines = row.getByTestId('story-chart-lines');
  await expect(thumbnailLines).toHaveAttribute('stroke-width', '2.2');
  await expect(thumbnailLines).toHaveAttribute('stroke-opacity', '.94');
  const geometry = await thumbnailLines
    .locator('line')
    .evaluateAll((lines) =>
      lines.map((line) => ['x1', 'y1', 'x2', 'y2'].map((key) => line.getAttribute(key))),
    );
  await page.screenshot({ path: `${qa}/story-orion-thumbnail.png` });
  await row.click();
  const chart = page.getByTestId('story-image').getByTestId('story-sky-chart');
  await expect(chart).toBeVisible();
  const lines = chart.getByTestId('story-chart-lines');
  await expect(lines).toHaveAttribute('stroke-width', '1.05');
  expect(
    await lines
      .locator('line')
      .evaluateAll((items) =>
        items.map((line) => ['x1', 'y1', 'x2', 'y2'].map((key) => line.getAttribute(key))),
      ),
  ).toEqual(geometry);
  await chart.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${qa}/story-orion-detail.png` });
  await page.evaluate(() => (document.documentElement.dataset.theme = 'night'));
  await expect(lines).toHaveCSS('stroke', 'rgb(255, 59, 48)');
  await page.screenshot({ path: `${qa}/story-orion-night.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
