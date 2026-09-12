import { test, expect } from '@playwright/test';
interface SkyScene {
  controller: { setView(view: { fovDeg: number }): void };
  objectAltAz(id: string): { altDeg: number; azDeg: number } | null;
  project(id: string): { x: number; y: number } | null;
  renderer: { getClearAlpha(): number };
}

test.use({
  serviceWorkers: 'block',
  viewport: { width: 412, height: 915 },
  permissions: ['camera'],
  launchOptions: {
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

test('확대 중 별 선택은 센서를 유지하고 별의 색을 표시한다', async ({ page }) => {
  await page.goto('#/debug/sensors');
  await page.locator('#sensor-simulator').click();
  await page.goto('#/sky?t=2026-09-06T12:00:00Z&preserve=1&alt=45&az=180&fov=30');
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0);
  if ((await page.getByTestId('ar-toggle').getAttribute('aria-pressed')) !== 'true')
    await page.getByTestId('ar-toggle').click();
  await page.getByTestId('sim-absolute').check();
  const target = await page.evaluate(() => {
    const w = window as unknown as {
      __skylogScene: SkyScene;
      __skylogSensor: { declinationDeg: number };
    };
    return {
      ...w.__skylogScene.objectAltAz('star:HIP91262')!,
      decl: w.__skylogSensor.declinationDeg,
    };
  });
  await page
    .getByTestId('sim-alpha')
    .fill(String(Math.round((360 + target.decl - target.azDeg) % 360)));
  await page.getByTestId('sim-beta').fill(String(Math.round(90 + target.altDeg)));
  await page.evaluate(() =>
    (window as unknown as { __skylogScene: SkyScene }).__skylogScene.controller.setView({
      fovDeg: 3,
    }),
  );
  await page.waitForTimeout(900);
  const point = await page.evaluate(() =>
    (window as unknown as { __skylogScene: SkyScene }).__skylogScene.project('star:HIP91262'),
  );
  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
  await expect(page.getByTestId('tooltip-name')).toContainText('베가');
  await expect(page.getByTestId('tooltip').getByTestId('star-color')).toContainText('흰색');
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('ar-resume')).toHaveCount(0);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/field-zoom-selection.png' });
});

test('카메라 겹치기·밝기 조절·종료와 하단 버튼 배치', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/sky?t=2026-09-06T12:00:00Z&preserve=1&alt=40&az=180&fov=65');
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await page.getByTestId('camera-toggle').click();
  await expect(page.getByTestId('camera-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('rear-camera-video')).toHaveJSProperty('readyState', 4);
  expect(
    await page.evaluate(() =>
      (window as unknown as { __skylogScene: SkyScene }).__skylogScene.renderer.getClearAlpha(),
    ),
  ).toBe(0);
  await page.getByTestId('camera-settings').locator('summary').click();
  await page.getByTestId('camera-settings').locator('input').first().fill('0.35');
  await expect(page.getByTestId('rear-camera-video')).toHaveCSS('opacity', '0.35');
  const camera = (await page.getByTestId('camera-toggle').boundingBox())!;
  const sensor = (await page.getByTestId('ar-toggle-wrap').boundingBox())!;
  expect(camera.y).toBeGreaterThan(600);
  expect(sensor.x).toBeGreaterThanOrEqual(camera.x + camera.width);
  expect(sensor.x + sensor.width).toBeLessThanOrEqual(412);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/field-camera.png' });
  await page.getByTestId('camera-toggle').click();
  await expect(page.getByTestId('rear-camera-video')).toHaveJSProperty('srcObject', null);
  expect(
    await page.evaluate(() =>
      (window as unknown as { __skylogScene: SkyScene }).__skylogScene.renderer.getClearAlpha(),
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test('토성 기록은 관련 분류와 여러 색 스케치를 제공한다', async ({ page }) => {
  const uploads: string[] = [];
  await page.route('https://*.supabase.co/**', async (route) => {
    if (route.request().method() === 'POST') uploads.push(route.request().url());
    await route.fulfill({ json: [] });
  });
  await page.goto('#/log');
  await page.getByTestId('log-add').click();
  await page.getByTestId('quickpick-input').fill('토성');
  await page.getByTestId('quickpick-item').filter({ hasText: '토성' }).first().click();
  await expect(page.getByTestId('observation-form').getByRole('heading')).toContainText('토성');
  const form = page.getByTestId('observation-form');
  await expect(form.getByText('분해된 정도', { exact: true })).toBeVisible();
  await expect(form.getByText('이중성', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('obs-tags').getByText('달', { exact: true })).toHaveCount(0);
  await expect(form.getByText('평점', { exact: true })).toHaveCount(0);
  await page.getByTestId('obs-sketch-open').click();
  await expect(page.getByTestId('sketch-color-blueWhite')).toBeVisible();
  await page.getByTestId('sketch-color-orange').click();
  await expect(page.getByTestId('sketch-color-orange')).toHaveAttribute('aria-pressed', 'true');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/field-sketch-palette.png' });
  const surface = (await page.getByTestId('sketch-surface').boundingBox())!;
  await page.mouse.move(surface.x + surface.width * 0.4, surface.y + surface.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(surface.x + surface.width * 0.6, surface.y + surface.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await page.getByTestId('sketch-save').click();
  await page.getByTestId('obs-notes').fill('공유하지 않는 개인 메모');
  await page.getByTestId('obs-save').click();
  await page.getByTestId('log-item').click();
  await page.getByTestId('sketch-share').locator('summary').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('sketch-export').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^skyard-sketch-.*\.png$/);
  await page.getByTestId('sketch-community').click();
  await expect(page.getByRole('img', { name: '공유할 사진 미리보기' })).toBeVisible();
  await expect(page.getByLabel('사진 이야기', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: '검토 요청' })).toBeDisabled();
  await expect(page.getByTestId('sketch-share-account')).toBeVisible();
  expect(uploads).toEqual([]);
});
