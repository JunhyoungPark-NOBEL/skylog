import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block', viewport: { width: 360, height: 780 } });

test('접이식 하늘 메뉴·통합 설정·GPS·시계가 200% 글자에서도 시야를 가리지 않는다', async ({
  page,
}) => {
  await page.goto('#/sky');
  await expect(page.getByTestId('sky-loading')).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const settings = (await page.getByTestId('open-settings').boundingBox())!;
  const menu = (await page.getByTestId('nav-toggle').boundingBox())!;
  const clock = (await page.getByTestId('time-toggle').boundingBox())!;
  const gps = (await page.getByTestId('ar-toggle').boundingBox())!;
  const camera = (await page.getByTestId('camera-toggle').boundingBox())!;
  expect(menu.y).toBeGreaterThanOrEqual(settings.y + settings.height + 4);
  expect(settings.x).toBeLessThan(20);
  expect(clock.x + clock.width).toBeLessThanOrEqual(350);
  expect(Math.abs(gps.x + gps.width / 2 - 180)).toBeLessThan(2);
  expect(gps.y).toBeGreaterThan(650);
  expect(camera.x).toBeGreaterThan(gps.x + gps.width);
  await expect(page.getByTestId('ar-toggle')).toHaveText('GPS');
  await expect(page.getByTestId('time-toggle')).toHaveText('');
  await expect(page.getByTestId('tab-bar')).toBeHidden();
  await expect(page.getByTestId('open-layers')).toHaveCount(0);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build27-compact-200.png' });
  await page.getByTestId('nav-toggle').click();
  await expect(page.getByTestId('tab-bar')).toBeVisible();
  await expect(page.getByTestId('tab-bar').getByRole('tab')).toHaveCount(5);
  await page.getByTestId('tab-sky').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('tab-search')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('nav-toggle')).toBeFocused();
  await expect(page.getByTestId('tab-bar')).toBeHidden();
  await page.getByTestId('nav-toggle').click();
  await page.mouse.click(340, 440);
  await expect(page.getByTestId('tab-bar')).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.getByTestId('open-settings').click();
  await expect(page.getByTestId('layer-ground-transparency')).toHaveValue('0');
  await page.getByTestId('app-settings').click();
  await expect(page.locator('#setting-night')).toBeVisible();
  await expect(page).toHaveURL(/#\/sky$/);
  await page.getByTestId('close-sky-settings').click();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build27-compact.png' });
});

test('센서 권한 거부는 메인에 패널을 띄우지 않으며 설정에서 원인을 확인한다', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('denied'),
    });
  });
  await page.goto('#/sky');
  await page.getByTestId('ar-toggle').click();
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('ar-start-help')).toHaveCount(0);
  await expect(page.getByTestId('ar-status')).toHaveCount(0);
  await expect(page.getByTestId('ar-help')).toHaveCount(0);
  await page.getByTestId('open-settings').click();
  await page.getByTestId('settings-gps').click();
  await expect(page.getByTestId('sensor-connection-status')).not.toHaveText('');
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build27-gps-settings.png' });
});
