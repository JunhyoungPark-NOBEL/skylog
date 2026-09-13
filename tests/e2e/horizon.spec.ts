import { test, expect } from '@playwright/test';
test('잔디·꽃은 하늘을 가리지 않고 아래를 볼수록 지면과 함께 사라진다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error' && /shader|webgl/i.test(e.text())) errors.push(e.text());
  });
  await page.goto('#/sky?t=2026-09-06T12:00:00Z&alt=0&az=180&fov=90&preserve=1');
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  const opacity = () =>
    page.evaluate(() => {
      const scene = (
        window as unknown as {
          __skylogScene: {
            horizon: {
              ground: { material: { opacity: number; map: { image: { width: number } } | null } };
              meadowVisible: boolean;
            };
          };
        }
      ).__skylogScene;
      return {
        opacity: scene.horizon.ground.material.opacity,
        loaded: !!scene.horizon.ground.material.map,
        visible: scene.horizon.meadowVisible,
      };
    });
  await expect.poll(async () => (await opacity()).loaded).toBe(true);
  await expect.poll(async () => (await opacity()).visible).toBe(true);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sky-meadow.png' });
  const look = async (altDeg: number) =>
    page.evaluate((alt) => {
      (
        window as unknown as {
          __skylogScene: { controller: { setView(v: { altDeg: number }): void } };
        }
      ).__skylogScene.controller.setView({ altDeg: alt });
    }, altDeg);
  await look(-14);
  await expect.poll(async () => (await opacity()).opacity).toBeCloseTo(0.5, 2);
  await expect(page.getByTestId('below-horizon-hint')).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sky-meadow-fading.png' });
  await look(-35);
  await expect.poll(async () => (await opacity()).opacity).toBe(0);
  await expect.poll(async () => (await opacity()).visible).toBe(false);
  await page.getByTestId('open-settings').click();
  await page.locator('#layer-landscape').click();
  await page.getByTestId('close-sky-settings').click();
  await expect.poll(async () => (await opacity()).opacity).toBe(1);
  await expect(page.getByTestId('below-horizon-hint')).toHaveCount(0);
  expect(errors).toEqual([]);
});
interface SkyScene {
  flyToObject(id: string, fov: number): boolean;
  project(id: string): { x: number; y: number } | null;
  objectAltAz(id: string): { altDeg: number } | null;
  pick(x: number, y: number): string | null;
  controller: { isAnimating(): boolean };
}
test('풍경의 반투명 픽셀은 지면을 한 번 합성한 값이고 야간에는 적색이다', async ({ page }) => {
  await page.goto('#/sky?t=2026-09-06T03:00:00Z&alt=0&az=180&fov=90&preserve=1');
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __skylogScene: { horizon: { meadowVisible: boolean } } })
            .__skylogScene.horizon.meadowVisible,
      ),
    )
    .toBe(true);
  const sample = () =>
    page.evaluate(() => {
      const src = document.querySelector<HTMLCanvasElement>('[data-testid="sky-canvas"]')!;
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 24;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(src, src.width * 0.45, src.height * 0.58, 64, 24, 0, 0, 64, 24);
      return Array.from(ctx.getImageData(0, 0, 64, 24).data).filter((_, i) => i % 4 !== 3);
    });
  const full = await sample();
  const transparency = async (value: string) => {
    await page.getByTestId('open-settings').click();
    await page.getByTestId('layer-ground-transparency').fill(value);
    await page.getByTestId('close-sky-settings').click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                __skylogScene: { horizon: { ground: { material: { opacity: number } } } };
              }
            ).__skylogScene.horizon.ground.material.opacity,
        ),
      )
      .toBe(1 - Number(value) / 100);
  };
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sky-meadow-day.png' });
  await transparency('50');
  const half = await sample();
  await transparency('100');
  const clear = await sample();
  const difference = full.reduce((s, v, i) => s + Math.abs(v - clear[i]!), 0) / full.length;
  expect(difference, '픽셀 검증에 충분한 풍경 대비').toBeGreaterThan(5);
  const blendError =
    half.reduce((s, v, i) => s + Math.abs(v - (full[i]! + clear[i]!) / 2), 0) / half.length;
  expect(blendError, '두 겹 합성(75%)이 아닌 한 번 합성(50%)').toBeLessThan(2);
  await transparency('0');
  await page.goto('#/settings');
  await page.locator('#setting-night').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.goto('#/sky?t=2026-09-06T12:00:00Z&alt=0&az=180&fov=90&preserve=1');
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __skylogScene: { horizon: { meadowVisible: boolean } } })
            .__skylogScene.horizon.meadowVisible,
      ),
    )
    .toBe(true);
  const red = await sample();
  expect(Math.max(...red.filter((_, i) => i % 3 !== 0))).toBeLessThanOrEqual(1);
  expect(Math.max(...red.filter((_, i) => i % 3 === 0))).toBeGreaterThan(10);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sky-meadow-night.png' });
});
test('지면 투명도 하나로 기본 불투명·반투명·투명과 별 선택이 함께 바뀐다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error' && /shader|webgl/i.test(e.text())) errors.push(e.text());
  });
  await page.goto('#/sky?t=2026-09-06T12:00:00Z&alt=0&az=90&fov=75&preserve=1');
  await expect(page.getByTestId('sky-canvas')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByTestId('open-settings').click();
  await page.locator('#layer-landscape').click();
  await page.getByTestId('close-sky-settings').click();
  await page.evaluate(() => {
    const s = (window as unknown as { __skylogScene: SkyScene }).__skylogScene;
    s.flyToObject('star:HIP32349', 25);
  });
  await expect(page.getByTestId('below-horizon-hint')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = (window as unknown as { __skylogScene: SkyScene }).__skylogScene;
        return s.controller.isAnimating();
      }),
    )
    .toBe(false);
  const sample = () =>
    page.evaluate(() => {
      const s = (window as unknown as { __skylogScene: SkyScene }).__skylogScene;
      const p = s.project('star:HIP32349')!;
      const src = document.querySelector<HTMLCanvasElement>('[data-testid="sky-canvas"]')!;
      const c = document.createElement('canvas');
      c.width = 40;
      c.height = 40;
      const ratio = src.width / src.clientWidth;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(src, p.x * ratio - 20, p.y * ratio - 20, 40, 40, 0, 0, 40, 40);
      const data = ctx.getImageData(0, 0, 40, 40).data;
      let max = 0,
        min = 765;
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i]! + data[i + 1]! + data[i + 2]!;
        max = Math.max(max, v);
        min = Math.min(min, v);
      }
      return {
        spread: max - min,
        picked: s.pick(p.x, p.y),
        alt: s.objectAltAz('star:HIP32349')!.altDeg,
      };
    });
  const before = await sample();
  expect(before.alt).toBeLessThan(-10);
  expect(before.picked).toBeNull();
  expect(before.spread).toBeLessThan(5);
  await page.getByTestId('open-settings').click();
  await expect(page.locator('#layer-ground')).toHaveCount(0);
  await expect(page.locator('#layer-groundOpaque')).toHaveCount(0);
  await expect(page.locator('#layer-showBelowHorizon')).toHaveCount(0);
  await expect(page.getByTestId('layer-ground-transparency')).toHaveValue('0');
  await page.getByTestId('layer-ground-transparency').fill('50');
  await page.getByTestId('close-sky-settings').click();
  await expect(page.getByTestId('below-horizon-hint')).toBeVisible();
  await expect.poll(async () => (await sample()).picked).toBe('star:HIP32349');
  expect((await sample()).spread).toBeGreaterThan(40);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sky-below-translucent.png' });
  await page.getByTestId('open-settings').click();
  await page.getByTestId('layer-ground-transparency').fill('100');
  await page.getByTestId('close-sky-settings').click();
  await expect.poll(async () => (await sample()).picked).toBe('star:HIP32349');
  await page.reload();
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByTestId('open-settings').click();
  await expect(page.getByTestId('layer-ground-transparency')).toHaveValue('100');
  await page.getByTestId('layer-reset').click();
  await page.locator('#layer-landscape').click();
  await expect(page.getByTestId('layer-ground-transparency')).toHaveValue('0');
  await expect(page.locator('#layer-constellationBounds')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('layer-milkyWayAlpha')).toHaveValue('0.33');
  await expect(page.locator('#layer-saturation')).toHaveValue('1');
  await page.getByTestId('close-sky-settings').click();
  await expect(page.getByTestId('below-horizon-hint')).toHaveCount(0);
  expect(errors).toEqual([]);
});
