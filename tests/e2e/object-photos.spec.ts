import { selectTab } from './navigation';
import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

const T = '2026-09-06T12:00:00Z';
async function openSaturn(page: Page) {
  await page.goto(`#/sky?t=${T}&preserve=1&select=planet:saturn&fov=60`);
  await expect(page.getByTestId('tooltip')).toBeVisible({ timeout: 30_000 });
}
async function loaded(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toBeVisible();
  await expect
    .poll(() =>
      page.getByTestId(testId).evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
}

test('천체 탭·검색은 사진만 간결하게 표시하고 자세히에서 출처를 보며 오프라인에서도 유지한다', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openSaturn(page);
  await loaded(page, 'object-photo-thumb');
  await expect(page.getByTestId('tooltip').getByTestId('photo-credit')).toHaveCount(0);
  await expect(page.getByTestId('tooltip').getByRole('link')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/screenshots/photo-tooltip-saturn.png' });
  await page.getByTestId('tooltip-details').click();
  await page.getByTestId('sheet-stage').click();
  await loaded(page, 'object-photo-hero');
  await expect(page.getByTestId('object-photo-card')).toContainText('현재 모습이나 맨눈');
  await expect(page.getByTestId('object-photo-card').getByTestId('photo-credit')).toContainText(
    'NASA',
  );
  await expect(
    page.getByTestId('object-photo-card').getByRole('link', { name: '원문', exact: true }),
  ).toHaveAttribute('href', /^https:\/\//);
  await page.screenshot({ path: 'artifacts/screenshots/photo-sheet-saturn.png' });
  await page.getByTestId('sheet-close').click();
  await selectTab(page, 'search');
  await page.getByTestId('search-input').fill('M31');
  const result = page.getByTestId('search-result').first();
  await expect(result).toHaveAttribute('data-object-id', 'dso:M31');
  await expect(result.getByTestId('object-photo-thumb')).toBeVisible();
  await expect(page.getByTestId('search-screen').getByTestId('photo-credit')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/screenshots/photo-search-m31.png' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  // 확대된 목록의 미방문 천체도 초기 캐시에 포함돼야 한다.
  await page.getByTestId('search-input').fill('M110');
  await expect(page.getByTestId('search-result').first()).toHaveAttribute(
    'data-object-id',
    'dso:M110',
  );
  await page.getByTestId('search-result').first().click();
  await page.getByTestId('sheet-stage').click();
  await loaded(page, 'object-photo-hero');
  await expect(page.getByTestId('object-photo-hero')).toHaveAttribute('data-object-id', 'dso:M110');
  await expect(
    page.getByTestId('object-photo-card').getByRole('link', { name: '원문', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/photo-m110-offline.png' });
  expect(errors).toEqual([]);
});

test('야간 사진은 적색으로 시작하고 원래 색을 직접 선택하며 작은 영어 화면에서도 출처가 잘리지 않는다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('#/settings');
  await page.locator('#setting-night').click();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await openSaturn(page);
  await page.getByTestId('tooltip-details').click();
  await page.getByTestId('sheet-stage').click();
  await loaded(page, 'object-photo-hero');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  const hero = page.getByTestId('object-photo-hero');
  await page.waitForTimeout(500);
  const shot = await hero.screenshot({ path: 'artifacts/screenshots/photo-night-pixels.png' });
  const meta = await sharp(shot).metadata();
  // 둥근 모서리 밖 부모 표면은 제외하고 사진 자체의 픽셀을 검사한다.
  const middle = {
    left: Math.floor(meta.width! * 0.2),
    top: Math.floor(meta.height! * 0.2),
    width: Math.floor(meta.width! * 0.6),
    height: Math.floor(meta.height! * 0.6),
  };
  const pixels = await sharp(shot).extract(middle).removeAlpha().raw().toBuffer();
  let bright = 0,
    wrong = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    if (pixels[i]! > 20) {
      bright++;
      if (pixels[i + 1]! > 3 || pixels[i + 2]! > 3) wrong++;
    }
  }
  expect(bright).toBeGreaterThan(100);
  expect(wrong / bright).toBeLessThan(0.001);
  await page.getByTestId('photo-original').click();
  await expect(hero).not.toHaveClass(/object-photo-protected/);
  await expect(hero).toHaveCSS('filter', 'none');
  await expect(page.getByTestId('object-photo-card')).toContainText('may appear bright');
  await page.getByTestId('photo-original').click();
  await expect(hero).toHaveClass(/object-photo-protected/);
  await page.getByTestId('object-photo-card').getByTestId('photo-credit').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/photo-night-en-large.png' });
});

test('사진 요청 실패에도 상세 정보와 검색은 작동하고 사진 없는 대상에는 다른 사진을 표시하지 않는다', async ({
  page,
}) => {
  await page.route('**/object-photos/v1/*.webp', (route) => route.abort());
  await openSaturn(page);
  await expect(page.getByTestId('object-photo-thumb')).toHaveCount(0);
  await page.getByTestId('tooltip-details').click();
  await page.getByTestId('sheet-stage').click();
  await expect(page.getByTestId('photo-unavailable')).toBeVisible();
  await expect(page.getByTestId('sheet-transit')).toHaveText(/\d{2}:\d{2}/);
  await page.getByTestId('sheet-close').click();
  await selectTab(page, 'search');
  await page.getByTestId('search-input').fill('베가');
  const result = page.getByTestId('search-result').first();
  await expect(result.getByTestId('search-result-name')).toHaveText('베가');
  await result.click();
  await expect(page.getByTestId('object-photo-card')).toHaveCount(0);
});
