import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block', viewport: { width: 360, height: 780 } });

test('육안·망원경 목표는 메뉴를 펼쳐도 상단 중앙 한 줄이고 보정은 하단에만 있다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/search');
  await page.getByTestId('search-input').fill('포말하우트');
  await expect(
    page.getByTestId('search-result').first().getByTestId('search-result-name'),
  ).toHaveText('포말하우트');
  await page.getByTestId('search-result').first().click();
  await expect(page.getByTestId('sheet-show-in-sky')).toHaveText('육안 네비게이션');
  await expect(page.getByTestId('sheet-telescope')).toContainText('망원경 네비게이션');
  await page.getByTestId('sheet-show-in-sky').click();
  await page.getByTestId('sheet-close').click();
  await expect(page.getByTestId('target-options')).toHaveText('포말하우트로');
  await expect(page.getByTestId('direction-align')).toHaveCount(0);
  await expect(page.getByTestId('target-clear')).toBeHidden();
  const before = (await page.getByTestId('target-pill').boundingBox())!;
  await page.getByTestId('nav-toggle').click();
  const after = (await page.getByTestId('target-pill').boundingBox())!;
  expect(after.y).toBe(before.y);
  expect(after.y).toBeLessThan(20);
  expect(after.height).toBeLessThanOrEqual(48);
  expect(Math.abs(after.x + after.width / 2 - 180)).toBeLessThan(2);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build29-naked-navigation.png' });
  await page.getByTestId('nav-toggle').click();
  await page.getByTestId('target-options').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('target-clear')).toBeVisible();
  await page.getByTestId('target-clear').click();

  await page.goto('#/sky?scope=star%3AHIP113368');
  await expect(page.getByTestId('scope-options')).toHaveText('포말하우트로');
  await expect(page.getByTestId('guide-intro')).toHaveCount(0);
  await expect(page.getByTestId('scope-close')).toHaveCount(0);
  await expect(page.getByText('하늘에서 바로 망원경 찾기', { exact: true })).toHaveCount(0);
  const gps = (await page.getByTestId('guide-sensor').boundingBox())!;
  const calibrate = (await page.getByTestId('direction-align').boundingBox())!;
  expect(Math.abs(gps.y - calibrate.y)).toBeLessThan(2);
  expect(calibrate.x).toBeGreaterThan(gps.x + gps.width);
  expect(gps.y).toBeGreaterThan(600);
  await page.getByTestId('nav-toggle').click();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build29-telescope-navigation.png' });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const pill = (await page.getByTestId('scope-target').boundingBox())!;
  const settings = (await page.getByTestId('open-settings').boundingBox())!;
  const clock = (await page.getByTestId('time-toggle').boundingBox())!;
  expect(pill.height).toBeLessThanOrEqual(48);
  expect(pill.x).toBeGreaterThan(settings.x + settings.width);
  expect(pill.x + pill.width).toBeLessThan(clock.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build29-navigation-200.png' });
  expect(errors).toEqual([]);
});
