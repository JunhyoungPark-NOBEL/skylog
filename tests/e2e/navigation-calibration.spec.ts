import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
test.use({ serviceWorkers: 'block', viewport: { width: 360, height: 780 } });

async function checkContrast(pill: Locator) {
  const ratio = await pill.evaluate((el) => {
    const style = getComputedStyle(el);
    const luminance = (color: string) => {
      const rgb = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((x) => {
          const s = x / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
      return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
    };
    const a = luminance(style.backgroundColor),
      b = luminance(style.color);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
}

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
  await expect(page.getByTestId('target-clear')).toBeVisible();
  const close = (await page.getByTestId('target-clear').boundingBox())!;
  expect(close.width).toBeGreaterThanOrEqual(44);
  expect(close.height).toBeGreaterThanOrEqual(44);
  const colors = await page.getByTestId('target-pill').evaluate((el) => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, foreground: style.color };
  });
  expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(colors.background).not.toBe(colors.foreground);
  await checkContrast(page.getByTestId('target-pill'));
  const before = (await page.getByTestId('target-pill').boundingBox())!;
  await page.getByTestId('nav-toggle').click();
  const after = (await page.getByTestId('target-pill').boundingBox())!;
  expect(after.y).toBe(before.y);
  expect(after.y).toBeLessThan(20);
  expect(after.height).toBeLessThanOrEqual(48);
  expect(Math.abs(after.x + after.width / 2 - 180)).toBeLessThan(2);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build30-naked-navigation.png' });
  await page.getByTestId('nav-toggle').click();
  await page.getByTestId('target-clear').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('target-pill')).toHaveCount(0);

  await page.goto('#/sky?scope=star%3AHIP113368');
  await expect(page.getByTestId('scope-options')).toHaveText('포말하우트로');
  await expect(page.getByTestId('guide-intro')).toHaveCount(0);
  await expect(page.getByTestId('scope-close')).toBeVisible();
  await checkContrast(page.getByTestId('scope-target'));
  const scopeClose = (await page.getByTestId('scope-close').boundingBox())!;
  expect(scopeClose.width).toBeGreaterThanOrEqual(44);
  expect(scopeClose.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByText('하늘에서 바로 망원경 찾기', { exact: true })).toHaveCount(0);
  const gps = (await page.getByTestId('guide-sensor').boundingBox())!;
  const calibrate = (await page.getByTestId('direction-align').boundingBox())!;
  expect(Math.abs(gps.y - calibrate.y)).toBeLessThan(2);
  expect(calibrate.x).toBeGreaterThan(gps.x + gps.width);
  expect(gps.y).toBeGreaterThan(600);
  await page.getByTestId('nav-toggle').click();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build30-telescope-navigation.png' });
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
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build30-navigation-200.png' });
  await page.getByTestId('scope-close').click();
  await expect(page.getByTestId('telescope-sky-guide')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('화성 목표는 야간 모드에도 읽히고 X로 메뉴를 열지 않고 취소한다', async ({ page }) => {
  await page.goto('#/settings');
  await page.locator('#setting-night').click();
  await page.goto('#/search');
  await page.getByTestId('search-input').fill('화성');
  await expect(
    page.getByTestId('search-result').first().getByTestId('search-result-name'),
  ).toHaveText('화성');
  await page.getByTestId('search-result').first().click();
  await page.getByTestId('sheet-show-in-sky').click();
  await page.getByTestId('sheet-close').click();
  await expect(page.getByTestId('target-options')).toHaveText('화성으로');
  await checkContrast(page.getByTestId('target-pill'));
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build30-mars-night.png' });
  await page.getByTestId('target-options').click();
  await page.getByTestId('target-details').click();
  await expect(page.getByTestId('sheet-close')).toBeVisible();
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('target-clear').click();
  await expect(page.getByTestId('target-guide')).toHaveCount(0);
});
