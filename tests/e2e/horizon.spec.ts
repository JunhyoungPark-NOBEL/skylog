import { test, expect } from '@playwright/test';
interface SkyScene {
  flyToObject(id: string, fov: number): boolean;
  project(id: string): { x: number; y: number } | null;
  objectAltAz(id: string): { altDeg: number } | null;
  pick(x: number, y: number): string | null;
  controller: { isAnimating(): boolean };
}
test('지면 투명도 하나로 기본 불투명·반투명·투명과 별 선택이 함께 바뀐다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error' && /shader|webgl/i.test(e.text())) errors.push(e.text());
  });
  await page.goto('#/sky?t=2026-09-06T12:00:00Z&alt=0&az=90&fov=75&preserve=1');
  await expect(page.getByTestId('sky-canvas')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
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
  await page.getByTestId('open-layers').click();
  await expect(page.locator('#layer-ground')).toHaveCount(0);
  await expect(page.locator('#layer-groundOpaque')).toHaveCount(0);
  await expect(page.locator('#layer-showBelowHorizon')).toHaveCount(0);
  await expect(page.getByTestId('layer-ground-transparency')).toHaveValue('0');
  await page.getByTestId('layer-ground-transparency').fill('50');
  await page.getByTestId('close-layers').click();
  await expect(page.getByTestId('below-horizon-hint')).toBeVisible();
  await expect.poll(async () => (await sample()).picked).toBe('star:HIP32349');
  expect((await sample()).spread).toBeGreaterThan(40);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sky-below-translucent.png' });
  await page.getByTestId('open-layers').click();
  await page.getByTestId('layer-ground-transparency').fill('100');
  await page.getByTestId('close-layers').click();
  await expect.poll(async () => (await sample()).picked).toBe('star:HIP32349');
  await page.reload();
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByTestId('open-layers').click();
  await expect(page.getByTestId('layer-ground-transparency')).toHaveValue('100');
  await page.getByTestId('layer-reset').click();
  await expect(page.getByTestId('layer-ground-transparency')).toHaveValue('0');
  await expect(page.locator('#layer-constellationBounds')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('layer-milkyWayAlpha')).toHaveValue('0.33');
  await expect(page.locator('#layer-saturation')).toHaveValue('1');
  await page.getByTestId('close-layers').click();
  await expect(page.getByTestId('below-horizon-hint')).toHaveCount(0);
  expect(errors).toEqual([]);
});
