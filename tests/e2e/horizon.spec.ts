import { test, expect } from '@playwright/test';
interface SkyScene {
  flyToObject(id: string, fov: number): boolean;
  project(id: string): { x: number; y: number } | null;
  objectAltAz(id: string): { altDeg: number } | null;
  pick(x: number, y: number): string | null;
  controller: { isAnimating(): boolean };
}
test('반투명 지면 아래 별이 보이고 선택되며, 불투명·숨김 모드에서는 가려진다', async ({ page }) => {
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
  await expect(page.getByTestId('below-horizon-hint')).toBeVisible();
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
  expect(before.picked).toBe('star:HIP32349');
  expect(before.spread).toBeGreaterThan(40);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sky-below-translucent.png' });
  await page.getByTestId('open-layers').click();
  await page.locator('#layer-groundOpaque').click();
  await page.getByTestId('close-layers').click();
  await expect(page.getByTestId('below-horizon-hint')).toHaveCount(0);
  await expect.poll(async () => (await sample()).spread).toBeLessThan(5);
  expect((await sample()).picked).toBeNull();
  await page.getByTestId('open-layers').click();
  await page.locator('#layer-groundOpaque').click();
  await page.locator('#layer-showBelowHorizon').click();
  await page.getByTestId('close-layers').click();
  await expect.poll(async () => (await sample()).picked).toBeNull();
  await page.reload();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByTestId('open-layers').click();
  await expect(page.locator('#layer-showBelowHorizon')).toHaveAttribute('aria-checked', 'false');
  expect(errors).toEqual([]);
});
