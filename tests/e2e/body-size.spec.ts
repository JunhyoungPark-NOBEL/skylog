import { expect, test, type Page } from '@playwright/test';

const SHOTS = 'tests/e2e/__screenshots__';
type Luminary = 'sun' | 'moon';

interface SceneBridge {
  invalidate(): void;
  project(id: string): { x: number; y: number } | null;
  pick(x: number, y: number): string | null;
  renderer: { info: { render: { frame: number } } };
  stars: { points: { material: { visible: boolean } } };
  controller: {
    getView(): { fovDeg: number };
    setView(view: { altDeg: number; azDeg: number; fovDeg: number }): void;
    directionToPixel(dir: number[], width: number, height: number): { x: number; y: number } | null;
  };
  bodies: {
    points: { material: { visible: boolean } };
    moon: { material: { visible: boolean } };
    placements: {
      key: string;
      dir: number[];
      sizePx: number;
      state: {
        altDeg: number;
        azDeg: number;
        angularDiameterArcsec: number;
        phaseFraction: number;
      };
    }[];
  };
}

async function openBody(page: Page, body: Luminary, date: string): Promise<void> {
  await page.goto(`#/sky?t=${date}&preserve=1&alt=45&az=180&fov=90`);
  await expect(page.getByTestId('sky-canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForFunction(
    () =>
      (window as unknown as { __skylogScene?: SceneBridge }).__skylogScene?.bodies.placements
        .length === 9,
  );
  await centerBody(page, body, 90);
}

/** 시각은 정지한 채 시점만 바꾼다. 크기 갱신이 천문 시각 변경에 묶여 있으면 아래 픽셀 검증이 실패한다. */
async function centerBody(page: Page, body: Luminary, fov: number): Promise<void> {
  await page.evaluate(
    async ({ body, fov }) => {
      const scene = (window as unknown as { __skylogScene: SceneBridge }).__skylogScene;
      const placement = scene.bodies.placements.find((p) => p.key === body)!;
      const previous = scene.renderer.info.render.frame;
      scene.controller.setView({
        altDeg: placement.state.altDeg,
        azDeg: placement.state.azDeg,
        fovDeg: fov,
      });
      scene.invalidate();
      await new Promise<void>((resolve) => {
        const check = () =>
          scene.renderer.info.render.frame > previous ? resolve() : requestAnimationFrame(check);
        requestAnimationFrame(check);
      });
    },
    { body, fov },
  );
}

/** 대상 재질만 잠시 숨겨 배경·별·선과 분리한 GPU 픽셀 차분. 재질은 검사 뒤 반드시 복원한다. */
async function bodyPixels(page: Page, body: Luminary) {
  return page.evaluate(async (body) => {
    const scene = (window as unknown as { __skylogScene: SceneBridge }).__skylogScene;
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="sky-canvas"]')!;
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;
    const center = scene.project(body)!;
    const placement = scene.bodies.placements.find((p) => p.key === body)!;
    // 태양 원반은 전체 글로우 스프라이트 지름의0.35. 달은 구 실루엣 지름.
    const diameterCss = (placement.sizePx / ratio) * (body === 'sun' ? 0.35 : 1);
    const r = Math.ceil(diameterCss * ratio * 0.75);
    const left = Math.max(0, Math.floor(center.x * ratio) - r);
    const top = Math.max(0, Math.floor(center.y * ratio) - r);
    const width = Math.min(canvas.width - left, r * 2 + 1);
    const height = Math.min(canvas.height - top, r * 2 + 1);
    const buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    const context = buffer.getContext('2d')!;
    const pixels = () => {
      context.drawImage(canvas, left, top, width, height, 0, 0, width, height);
      return context.getImageData(0, 0, width, height).data;
    };
    const render = async () => {
      const previous = scene.renderer.info.render.frame;
      scene.invalidate();
      await new Promise<void>((resolve) => {
        const check = () =>
          scene.renderer.info.render.frame > previous ? resolve() : requestAnimationFrame(check);
        requestAnimationFrame(check);
      });
    };
    const material = body === 'moon' ? scene.bodies.moon.material : scene.bodies.points.material;
    const wasVisible = material.visible;
    let off: Uint8ClampedArray;
    try {
      material.visible = false;
      await render();
      off = pixels();
    } finally {
      material.visible = wasVisible;
      await render();
    }
    const on = pixels();
    let moonWithoutStars: Uint8ClampedArray | null = null;
    let backgroundWithoutStars: Uint8ClampedArray | null = null;
    if (body === 'moon') {
      const starMaterial = scene.stars.points.material;
      const starsWereVisible = starMaterial.visible;
      try {
        starMaterial.visible = false;
        await render();
        moonWithoutStars = pixels();
        material.visible = false;
        await render();
        backgroundWithoutStars = pixels();
      } finally {
        starMaterial.visible = starsWereVisible;
        material.visible = wasVisible;
        await render();
      }
    }
    const difference = new Float32Array(width * height);
    let peak = 0;
    for (let i = 0; i < difference.length; i++) {
      const d = Math.max(
        on[i * 4]! - off[i * 4]!,
        on[i * 4 + 1]! - off[i * 4 + 1]!,
        on[i * 4 + 2]! - off[i * 4 + 2]!,
      );
      difference[i] = d;
      peak = Math.max(peak, d);
    }
    // 태양의 넓은 halo를 본체 크기로 오인하지 않도록 밝은 중심만 측정한다.
    const threshold = body === 'sun' ? peak * 0.9 : 12;
    let minX = width,
      maxX = -1,
      minY = height,
      maxY = -1,
      count = 0;
    let weightedX = 0,
      weightedY = 0,
      weight = 0;
    let occludedStarPeak = 0,
      underlyingStarPeak = 0;
    const moonLight: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d = difference[y * width + x]!;
        if (d > threshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          count++;
        }
        const dx = (left + x + 0.5) / ratio - center.x;
        const dy = (top + y + 0.5) / ratio - center.y;
        if (moonWithoutStars && backgroundWithoutStars && Math.hypot(dx, dy) < diameterCss * 0.4) {
          const i = (y * width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            occludedStarPeak = Math.max(
              occludedStarPeak,
              Math.abs(on[i + channel]! - moonWithoutStars[i + channel]!),
            );
            underlyingStarPeak = Math.max(
              underlyingStarPeak,
              off[i + channel]! - backgroundWithoutStars[i + channel]!,
            );
          }
        }
        // 초승달은 밝은 부분이 가장자리에 몰린다. AA 경계만 제외하고 원반 전체를 측정한다.
        if (Math.hypot(dx, dy) < diameterCss * 0.48) {
          const light = Math.max(0, d);
          weightedX += dx * light;
          weightedY += dy * light;
          weight += light;
          moonLight.push(light);
        }
      }
    }
    moonLight.sort((a, b) => a - b);
    const sun = scene.bodies.placements.find((p) => p.key === 'sun')!;
    const sunScreen = scene.controller.directionToPixel(sun.dir, rect.width, rect.height);
    const towardSun = sunScreen
      ? { x: sunScreen.x - center.x, y: sunScreen.y - center.y }
      : { x: 0, y: 0 };
    const centroid = { x: weightedX / Math.max(1, weight), y: weightedY / Math.max(1, weight) };
    const lightTowardSun =
      (centroid.x * towardSun.x + centroid.y * towardSun.y) /
      Math.max(1e-6, Math.hypot(centroid.x, centroid.y) * Math.hypot(towardSun.x, towardSun.y));
    const fov = scene.controller.getView().fovDeg;
    const physicalDiameter =
      (Math.min(rect.width, rect.height) *
        Math.tan(((placement.state.angularDiameterArcsec / 3600) * Math.PI) / 720)) /
      Math.tan((fov * Math.PI) / 720);
    return {
      diameterCss,
      physicalDiameter,
      pixelDiameter: Math.max(maxX - minX + 1, maxY - minY + 1) / ratio,
      areaCss: count / (ratio * ratio),
      peak,
      phaseFraction: placement.state.phaseFraction,
      phaseContrast:
        moonLight[Math.floor(moonLight.length * 0.95)]! -
        moonLight[Math.floor(moonLight.length * 0.05)]!,
      phasePercentiles: [0.05, 0.2, 0.8, 0.95].map(
        (p) => moonLight[Math.floor(moonLight.length * p)]!,
      ),
      lightTowardSun,
      occludedStarPeak,
      underlyingStarPeak,
      picked: scene.pick(center.x, center.y),
    };
  }, body);
}

test('태양: 낮 광각의 본체24px와 시간 정지 중 확대 크기가 실제 픽셀에 반영된다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openBody(page, 'sun', '2026-09-06T03:00:00Z');
  const wide = await bodyPixels(page, 'sun');
  expect(wide.diameterCss).toBeCloseTo(24, 1);
  expect(wide.pixelDiameter).toBeGreaterThanOrEqual(22);
  expect(wide.pixelDiameter).toBeLessThan(40);
  expect(wide.areaCss).toBeGreaterThan(250);
  expect(wide.picked).toBe('sun');
  await page.screenshot({ path: `${SHOTS}/sky-sun-readable.png` });

  await centerBody(page, 'sun', 3);
  const zoomed = await bodyPixels(page, 'sun');
  expect(zoomed.diameterCss).toBeCloseTo(zoomed.physicalDiameter, 1);
  expect(zoomed.pixelDiameter).toBeGreaterThan(wide.pixelDiameter * 2);
  expect(zoomed.picked).toBe('sun');
  await page.screenshot({ path: `${SHOTS}/sky-sun-zoomed.png` });
  expect(errors).toEqual([]);
});

test('달: 광각 본체24px·확대 실루엣·태양을 향한 밝은 위상을 유지한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openBody(page, 'moon', '2026-09-06T20:00:00Z');
  const wide = await bodyPixels(page, 'moon');
  expect(wide.diameterCss).toBeCloseTo(24, 1);
  expect(wide.pixelDiameter).toBeGreaterThanOrEqual(21);
  expect(wide.pixelDiameter).toBeLessThan(28);
  expect(wide.areaCss).toBeGreaterThan(180);
  expect(wide.picked).toBe('moon');
  // 이 실제 날짜·방향에는 달 뒤 별이 있다. 달이 있으면 별 레이어 ON/OFF가 달 내부에 영향을 주면 안 된다.
  expect(wide.underlyingStarPeak).toBeGreaterThan(20);
  expect(wide.occludedStarPeak).toBeLessThanOrEqual(2);
  await page.screenshot({ path: `${SHOTS}/sky-moon-readable.png` });

  await centerBody(page, 'moon', 3);
  const zoomed = await bodyPixels(page, 'moon');
  console.log('Moon visibility', JSON.stringify({ wide, zoomed }));
  expect(zoomed.diameterCss).toBeCloseTo(zoomed.physicalDiameter, 1);
  expect(zoomed.pixelDiameter).toBeGreaterThan(wide.pixelDiameter * 2);
  expect(zoomed.phaseFraction).toBeCloseTo(wide.phaseFraction, 8);
  expect(zoomed.phaseFraction).toBeGreaterThan(0.2);
  expect(zoomed.phaseFraction).toBeLessThan(0.6);
  expect(zoomed.phaseContrast).toBeGreaterThan(25);
  expect(zoomed.lightTowardSun).toBeGreaterThan(0.5);
  await page.screenshot({ path: `${SHOTS}/sky-moon-phase-readable.png` });
  expect(errors).toEqual([]);
});
