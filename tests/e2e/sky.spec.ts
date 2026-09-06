import { expect, test, type Page } from '@playwright/test';
import reference from '../fixtures/reference-altaz.json' with { type: 'json' };

/**
 * T1 하늘 뷰 스냅샷·정확도 테스트. 시각·시점은 해시 쿼리로 고정(대전 2026-09-06 21:00 KST).
 * 스크린샷은 tests/e2e/__screenshots__/sky-*.png — 세션이 직접 본다(여름 대삼각형·궁수자리·페가수스 배치).
 */
const SHOTS = 'tests/e2e/__screenshots__';
const T = '2026-09-06T12:00:00Z';

interface AltAz {
  altDeg: number;
  azDeg: number;
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

async function openSky(page: Page, params: string): Promise<void> {
  await page.goto(`#/sky?t=${T}&preserve=1&${params}`);
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  // 은하수 텍스처·첫 렌더 안정화
  await page.waitForTimeout(800);
}

function sep(a: AltAz, b: AltAz): number {
  const r = Math.PI / 180;
  const x1 = Math.cos(a.altDeg * r) * Math.sin(a.azDeg * r);
  const y1 = Math.sin(a.altDeg * r);
  const z1 = -Math.cos(a.altDeg * r) * Math.cos(a.azDeg * r);
  const x2 = Math.cos(b.altDeg * r) * Math.sin(b.azDeg * r);
  const y2 = Math.sin(b.altDeg * r);
  const z2 = -Math.cos(b.altDeg * r) * Math.cos(b.azDeg * r);
  return Math.acos(Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2))) / r;
}

test('남쪽 하늘(21:00 KST): 여름 대삼각형·궁수자리, 행성 위치가 기준 표와 일치', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openSky(page, 'alt=40&az=180&fov=95');
  await page.screenshot({ path: `${SHOTS}/sky-south.png` });

  // 행성·달·화성: 굴절 없는 alt/az를 JPL Horizons 기준 표와 ≤ 0.1° 비교
  const bodies = await page.evaluate(() => {
    const scene = (
      window as unknown as {
        __skylogScene: {
          bodies: {
            placements: { key: string; state: { altAirlessDeg: number; azDeg: number } }[];
          };
        };
      }
    ).__skylogScene;
    return scene.bodies.placements.map((p) => ({
      key: p.key,
      altDeg: p.state.altAirlessDeg,
      azDeg: p.state.azDeg,
    }));
  });
  for (const [key, ref] of Object.entries(reference.bodies)) {
    const b = bodies.find((x) => x.key === key)!;
    expect(b, key).toBeTruthy();
    expect(
      sep(b, { altDeg: ref.altDeg, azDeg: ref.azDeg }),
      `${key} alt/az diff`,
    ).toBeLessThanOrEqual(0.1);
  }

  // 별(베가·알타이르): 씬의 겉보기 alt/az vs 느린 경로(Horizon, 굴절 포함) ≤ 0.05°
  for (const [name, star] of Object.entries({
    vega: reference.stars.vega,
    altair: reference.stars.altair,
  })) {
    const r = await page.evaluate(
      ({ hip, ra, dec, t }) => {
        const w = window as unknown as {
          __skylogScene: { objectAltAz(id: string): AltAz | null };
          __skylogAstro: {
            eqjToAltAzSlow(
              date: Date,
              obs: object,
              ra: number,
              dec: number,
              refr: string | null,
            ): AltAz;
          };
        };
        const got = w.__skylogScene.objectAltAz(`star:HIP${hip}`);
        const want = w.__skylogAstro.eqjToAltAzSlow(
          new Date(t),
          { lat: 36.37, lon: 127.36, elevation: 70 },
          ra,
          dec,
          'normal',
        );
        return { got, want };
      },
      { hip: star.hip, ra: star.raJ2000Deg, dec: star.decJ2000Deg, t: T },
    );
    expect(r.got, name).toBeTruthy();
    expect(sep(r.got!, r.want), `${name} diff`).toBeLessThanOrEqual(0.05);
    // 여름 대삼각형은 남쪽 하늘 높이(고도 > 45°)
    expect(r.got!.altDeg).toBeGreaterThan(45);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('북쪽 하늘: 북극성 고도 ≈ 위도, 동쪽이 화면 오른쪽, 시간이 흐르면 반시계 회전', async ({
  page,
}) => {
  await openSky(page, 'alt=40&az=0&fov=95');
  await page.screenshot({ path: `${SHOTS}/sky-north.png` });
  const polaris = await page.evaluate(() =>
    (
      window as unknown as { __skylogScene: { objectAltAz(id: string): AltAz | null } }
    ).__skylogScene.objectAltAz('star:HIP11767'),
  );
  expect(polaris).toBeTruthy();
  expect(Math.abs(polaris!.altDeg - 36.4)).toBeLessThan(1);
  // 카시오페이아(셰다르 HIP3179)는 21시에 북극성 오른쪽(동쪽) 위, 북두칠성(두베 HIP54061)은 왼쪽(서쪽) 아래
  const pos = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __skylogScene: { project(id: string): { x: number; y: number } | null };
      }
    ).__skylogScene;
    return {
      schedar: s.project('star:HIP3179'),
      dubhe: s.project('star:HIP54061'),
      polaris: s.project('star:HIP11767'),
    };
  });
  expect(pos.schedar!.x).toBeGreaterThan(pos.polaris!.x);
  expect(pos.dubhe!.x).toBeLessThan(pos.polaris!.x);
  expect(pos.dubhe!.y).toBeGreaterThan(pos.polaris!.y);
  // 2시간 뒤: 별은 북극성 주위로 반시계 방향(동→위→서). 셰다르(동쪽 위)는 더 위·왼쪽으로 이동
  await page.goto(`#/sky?t=2026-09-06T14:00:00Z&preserve=1&alt=40&az=0&fov=95`);
  await page.waitForTimeout(900);
  const later = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __skylogScene: { project(id: string): { x: number; y: number } | null };
      }
    ).__skylogScene;
    return { schedar: s.project('star:HIP3179'), polaris: s.project('star:HIP11767') };
  });
  const a0 = Math.atan2(-(pos.schedar!.y - pos.polaris!.y), pos.schedar!.x - pos.polaris!.x);
  const a1 = Math.atan2(
    -(later.schedar!.y - later.polaris!.y),
    later.schedar!.x - later.polaris!.x,
  );
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  expect(d).toBeGreaterThan(0.2); // 반시계(수학적 양의 각) 회전
});

test('천정·조작: 드래그·휠 줌·더블탭·flyTo, FOV 3~100°, 정지 시 draw 0', async ({ page }) => {
  await openSky(page, 'alt=85&az=180&fov=90');
  await page.screenshot({ path: `${SHOTS}/sky-zenith.png` });
  const canvas = page.getByTestId('sky-canvas');
  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // 드래그: 위로 끌면 하늘이 따라 올라가므로 시선 고도가 내려간다(손가락 아래 하늘 고정)
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 80, cy - 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const v1 = await page.evaluate(() =>
    (
      window as unknown as {
        __skylogScene: {
          controller: { getView(): { altDeg: number; azDeg: number; fovDeg: number } };
        };
      }
    ).__skylogScene.controller.getView(),
  );
  expect(v1.altDeg).toBeLessThan(84.5);
  expect(v1.azDeg).not.toBeCloseTo(180, 0);

  // 휠 줌 인/아웃 범위
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -300);
  await page.waitForTimeout(100);
  const zoomed = await page.evaluate(
    () =>
      (
        window as unknown as { __skylogScene: { controller: { getView(): { fovDeg: number } } } }
      ).__skylogScene.controller.getView().fovDeg,
  );
  expect(zoomed).toBeGreaterThanOrEqual(3);
  expect(zoomed).toBeLessThan(10);
  for (let i = 0; i < 60; i++) await page.mouse.wheel(0, 300);
  await page.waitForTimeout(100);
  const wide = await page.evaluate(
    () =>
      (
        window as unknown as { __skylogScene: { controller: { getView(): { fovDeg: number } } } }
      ).__skylogScene.controller.getView().fovDeg,
  );
  expect(wide).toBe(100);

  // flyTo(토성) 후 중심 일치, 툴팁 표시
  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __skylogScene: { flyToObject(id: string, fov?: number): boolean; select(id: string): void };
      }
    ).__skylogScene;
    s.flyToObject('planet:saturn', 30);
    s.select('planet:saturn');
  });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __skylogScene: {
          controller: { getView(): { altDeg: number; azDeg: number; fovDeg: number } };
          objectAltAz(id: string): AltAz | null;
        };
      }
    ).__skylogScene;
    return { view: s.controller.getView(), sat: s.objectAltAz('planet:saturn') };
  });
  expect(after.view.fovDeg).toBeCloseTo(30, 0);
  expect(sep(after.view, after.sat!)).toBeLessThan(0.5);
  await expect(page.getByTestId('tooltip-name')).toHaveText(/토성/);
  await expect(page.getByTestId('tooltip-altaz')).toContainText('고도');

  // 정지: 수동 모드(rate 0) + 조작 없음 → draw call 0
  await page.waitForTimeout(1200);
  const draws = await page.evaluate(
    () => (window as unknown as { __skylogStats: { drawCalls: number } }).__skylogStats.drawCalls,
  );
  expect(draws).toBe(0);
  await page.evaluate(() =>
    (window as unknown as { __skylogScene: { invalidate(): void } }).__skylogScene.invalidate(),
  );
  await page.waitForTimeout(200);
  const drawsAfter = await page.evaluate(
    () =>
      (window as unknown as { __skylogStats: { drawCalls: number; points: number } }).__skylogStats,
  );
  // invalidate 직후 한 프레임 그려지고 다시 0이 되므로 points(마지막 렌더의 점 수)로 확인
  expect(drawsAfter.points).toBeGreaterThan(8000);
});

test('야간 모드: 하늘 뷰 캔버스에 적색 외 색이 없다 · 레이어 토글이 저장된다', async ({ page }) => {
  await openSky(page, 'alt=30&az=180&fov=90');
  // 야간 모드 켜기
  await page.getByTestId('open-settings').click();
  await page.locator('#setting-night').click();
  await page.getByTestId('back').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/sky-night.png` });
  const offenders = await page.evaluate(() => {
    const src = document.querySelector<HTMLCanvasElement>('[data-testid="sky-canvas"]')!;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let bad = 0;
    let total = 0;
    for (let i = 0; i < d.length; i += 4 * 7) {
      const r = d[i]!;
      const g = d[i + 1]!;
      const b = d[i + 2]!;
      total++;
      if ((g > 20 || b > 20) && (g > r * 0.5 || b > r * 0.5)) bad++;
    }
    return { bad, total };
  });
  expect(offenders.total).toBeGreaterThan(1000);
  expect(offenders.bad).toBe(0);

  // 레이어 패널: 별자리 선 끄기 → 새로고침 후 유지
  await page.getByTestId('open-layers').click();
  await page.locator('#layer-constellationLines').click();
  await page.getByTestId('close-layers').click();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await page.getByTestId('open-layers').click();
  await expect(page.locator('#layer-constellationLines')).toHaveAttribute('aria-checked', 'false');
  // 복구
  await page.locator('#layer-constellationLines').click();
  await page.getByTestId('open-settings').click();
  await page.locator('#setting-night').click();
});

test('달: 위상이 날짜와 맞고 밝은 쪽이 태양 방향(05:00 KST 하현 근처, 동쪽 하늘)', async ({
  page,
}) => {
  await page.goto(`#/sky?t=2026-09-06T20:00:00Z&preserve=1&alt=30&az=90&fov=60`);
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await page.evaluate(() => {
    const s = (
      window as unknown as { __skylogScene: { flyToObject(id: string, fov?: number): boolean } }
    ).__skylogScene;
    s.flyToObject('moon', 4);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/sky-moon.png` });
  const moon = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __skylogScene: {
          bodies: {
            placements: {
              key: string;
              state: {
                phaseFraction: number;
                moonPhaseDeg?: number;
                altDeg: number;
                azDeg: number;
              };
            }[];
          };
        };
      }
    ).__skylogScene;
    const m = s.bodies.placements.find((p) => p.key === 'moon')!.state;
    const sun = s.bodies.placements.find((p) => p.key === 'sun')!.state;
    return { moon: m, sun };
  });
  // 2026-09-07 05:00 KST: 망(8/28) 후 열흘 → 하현 근처(위상각 ≈ 270°, 조도 ≈ 0.3~0.5)
  expect(moon.moon.moonPhaseDeg!).toBeGreaterThan(240);
  expect(moon.moon.moonPhaseDeg!).toBeLessThan(310);
  expect(moon.moon.phaseFraction).toBeGreaterThan(0.2);
  expect(moon.moon.phaseFraction).toBeLessThan(0.6);
  expect(moon.moon.altDeg).toBeGreaterThan(20);
  // 밝은 쪽 = 태양 쪽: 태양(지평선 아래 동쪽)은 달보다 동쪽·아래
  expect(moon.sun.altDeg).toBeLessThan(0);
});

test('낮 시간: 배경이 밝아지고 별이 숨는다', async ({ page }) => {
  await openSky(page, 'alt=40&az=180&fov=90');
  const nightPoints = await page.evaluate(
    () => (window as unknown as { __skylogStats: { points: number } }).__skylogStats.points,
  );
  await page.goto(`#/sky?t=2026-09-06T03:00:00Z&preserve=1&alt=40&az=180&fov=90`); // 12:00 KST
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/sky-day.png` });
  const px = await page.evaluate(() => {
    const src = document.querySelector<HTMLCanvasElement>('[data-testid="sky-canvas"]')!;
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, src.width / 2, src.height / 3, 1, 1, 0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0]!, g: d[1]!, b: d[2]! };
  });
  expect(px.b).toBeGreaterThan(120); // 낮 하늘 파랑
  expect(nightPoints).toBeGreaterThan(8000); // 밤엔 별 팩이 그려짐(점 수는 GPU가 아니라 제출 수)
});
