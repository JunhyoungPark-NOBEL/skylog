import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });

test('실제 시뮬레이터→스토어→렌더 루프에서도 손떨림을 고정하고 의도한 이동을 반영한다', async ({
  page,
}) => {
  await page.goto('#/debug/sensors');
  await page.locator('#sensor-simulator').click();
  await page.goto('#/sky?t=2026-09-06T12:00:00Z&alt=45&az=180&fov=90');
  await expect(page.getByTestId('sky-loading')).toHaveCount(0);
  if ((await page.getByTestId('ar-toggle').getAttribute('aria-pressed')) !== 'true')
    await page.getByTestId('ar-toggle').click();
  const results = await page.evaluate(async () => {
    const w = window as unknown as {
      __skylogSensor: {
        setSim(v: { alpha: number; beta: number; gamma: number; absolute: boolean }): void;
        arActive: boolean;
      };
      __skylogAstro: { altAzToScene(alt: number, az: number): [number, number, number] };
      __skylogScene: {
        controller: {
          setView(v: { fovDeg: number }): void;
          getView(): { altDeg: number; azDeg: number };
          directionToPixel(
            dir: [number, number, number],
            w: number,
            h: number,
          ): { x: number; y: number } | null;
        };
      };
    };
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const set = (alpha: number, beta = 135, gamma = 0) =>
      w.__skylogSensor.setSim({ alpha, beta, gamma, absolute: true });
    set(180);
    await sleep(1600);
    const controller = w.__skylogScene.controller;
    const metrics = [];
    for (const fov of [90, 3]) {
      controller.setView({ fovDeg: fov });
      await sleep(100);
      const view = controller.getView();
      const dir = w.__skylogAstro.altAzToScene(view.altDeg, view.azDeg);
      const points: { x: number; y: number }[] = [];
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const frame = () => {
          const t = (performance.now() - start) / 1000;
          set(
            180 + 0.6 * Math.sin(t * 2 * Math.PI * 7.1),
            135 + 0.4 * Math.sin(t * 2 * Math.PI * 8.7),
            0.3 * Math.sin(t * 2 * Math.PI * 6.3),
          );
          const p = controller.directionToPixel(dir, innerWidth, innerHeight);
          if (t > 0.8 && p) points.push(p);
          if (t < 3.5) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      const x = points.reduce((s, p) => s + p.x, 0) / points.length,
        y = points.reduce((s, p) => s + p.y, 0) / points.length;
      const rms = Math.sqrt(
        points.reduce((s, p) => s + (p.x - x) ** 2 + (p.y - y) ** 2, 0) / points.length,
      );
      metrics.push({ fov, rms, samples: points.length });
      set(180);
      await sleep(600);
    }
    const before = controller.getView().azDeg;
    // 사용자의 방향 전환: 시뮬레이터 공급자를 그대로 둔 채 새 방향을 유지한다.
    set(200);
    await sleep(1200);
    const after = controller.getView().azDeg;
    return {
      metrics,
      turn: Math.abs(((after - before + 540) % 360) - 180),
      active: w.__skylogSensor.arActive,
    };
  });
  for (const result of results.metrics) {
    expect(result.samples).toBeGreaterThan(30);
    expect(result.rms, JSON.stringify(result)).toBeLessThan(0.5);
  }
  expect(results.turn).toBeGreaterThan(15);
  expect(results.active).toBe(true);
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'true');
});
