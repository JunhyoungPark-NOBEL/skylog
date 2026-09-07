import { expect, test, type Page } from '@playwright/test';

/**
 * T3b e2e: 오늘 밤 탭(날씨 온라인/오프라인·추천 그룹·계획 ☆·이달의 현상·유성우) + "실제 하늘처럼" 토글.
 * 시각은 해시 `t`로 고정(대전 2026-09-06 21:00 KST). Open-Meteo는 route 목으로 대체한다.
 */
const SHOTS = 'tests/e2e/__screenshots__';
const T = '2026-09-06T12:00:00Z';
const OPEN_METEO = 'https://api.open-meteo.com/**';

// 서비스 워커가 fetch를 가로채면 page.route 목이 적용되지 않으므로 이 스펙에서는 SW를 막는다
test.use({ serviceWorkers: 'block' });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

function forecast(): unknown {
  const time: string[] = [];
  const cloud: number[] = [];
  const dew: number[] = [];
  for (let h = 0; h < 48; h++) {
    const d = h < 24 ? '2026-09-06' : '2026-09-07';
    const local = h % 24;
    time.push(`${d}T${String(local).padStart(2, '0')}:00`);
    cloud.push(local >= 21 || local <= 1 ? 10 : 85);
    dew.push(local === 23 ? 19.5 : 12);
  }
  return {
    latitude: 36.35,
    longitude: 127.375,
    utc_offset_seconds: 32400,
    timezone: 'Asia/Seoul',
    hourly: {
      time,
      cloud_cover: cloud,
      cloud_cover_low: cloud.map((c) => c / 2),
      cloud_cover_mid: cloud.map(() => 0),
      cloud_cover_high: cloud.map((c) => c / 2),
      visibility: cloud.map(() => 24140),
      relative_humidity_2m: cloud.map(() => 65),
      dew_point_2m: dew,
      temperature_2m: cloud.map(() => 20),
      wind_speed_10m: cloud.map(() => 9),
      precipitation_probability: cloud.map(() => 0),
    },
  };
}

async function openSky(page: Page): Promise<void> {
  await page.goto(`#/sky?t=${T}&preserve=1`);
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(400);
}

test('오늘 밤(온라인): 날씨 카드 · 추천 그룹(토성 포함) · 계획 ☆ · 이달의 현상(10월 토성 충) · 유성우', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.route(OPEN_METEO, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(forecast()),
    }),
  );
  await openSky(page);
  await page.getByTestId('tab-tonight').click();
  await expect(page.getByTestId('sky-status-card')).toBeVisible({ timeout: 15_000 });

  // 날씨: 요약 한 줄(21:00~02:00 구름 10%) · 결로 경고 · 출처
  const weather = page.getByTestId('weather-card');
  await expect(weather).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('weather-summary')).toContainText('21:00');
  await expect(page.getByTestId('weather-summary')).toContainText('02:00');
  await expect(page.getByTestId('weather-dew')).toBeVisible();
  await expect(weather).toContainText('Open-Meteo');
  // 하늘 상태 타임라인에 구름 막대가 겹쳐 그려진다
  expect(
    await page.getByTestId('sky-status-card').locator('rect[fill="var(--muted)"]').count(),
  ).toBeGreaterThan(5);

  // 추천: 계산 완료 후 그룹 칩 · 토성이 목록에 있고 '지금 당장' 그룹에 있다
  const rec = page.getByTestId('recommend-card');
  await expect(rec.getByTestId('rec-list')).toBeVisible({ timeout: 20_000 });
  await expect(rec.getByTestId('rec-group-now')).toBeVisible();
  await rec.getByTestId('rec-group-now').click();
  await expect(rec.locator('[data-testid="rec-item"][data-object-id="planet:saturn"]')).toHaveCount(
    1,
  );
  const reason = await rec
    .locator('[data-object-id="planet:saturn"] [data-testid="rec-reason"]')
    .textContent();
  expect(reason).toMatch(/동|남동|북동/); // 21시 토성은 동쪽
  await rec.getByTestId('rec-group-binoculars').click();
  expect(await rec.getByTestId('rec-item').count()).toBeGreaterThan(0);

  // 하이라이트: 행성 1개 이상
  await expect(page.getByTestId('highlights-card')).toBeVisible();

  // 시간대 프리셋: 저녁 = 일몰(18:51)부터 → 지금부터 2시간 → 창 라벨 변경, 장비 전환
  await expect(page.getByTestId('window-label')).toContainText('18:5');
  await page.getByTestId('preset-next2h').click();
  await expect(page.getByTestId('window-label')).toContainText('21:00 ~ 23:00');
  await page.getByTestId('equip-telescope').click();
  await expect(rec.getByTestId('rec-list')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('preset-evening').click();

  // 계획: ☆ → ★ (Dexie bookmarks)
  const plan = page.getByTestId('plan-card');
  await expect(plan).toBeVisible({ timeout: 20_000 });
  const star = plan.getByTestId('rec-plan-toggle').first();
  await star.click();
  await expect(star).toHaveText('★');
  await expect(star).toHaveAttribute('aria-pressed', 'true');

  // 이달의 현상: 9월 목록에 달 위상, 10월 탭에 토성 충
  const phen = page.getByTestId('phenomena-card');
  await expect(phen.locator('[data-kind="moonQuarter"]').first()).toBeVisible();
  await phen.getByTestId('phen-next').click();
  await expect(phen.getByTestId('phenomena-list')).toContainText('토성 충');
  await expect(phen.locator('[data-kind="meteorPeak"]').first()).toBeVisible();

  // 유성우 카드
  await expect(page.getByTestId('meteor-card')).toBeVisible();
  await expect(page.getByTestId('meteor-next')).toContainText('극대');

  await page.screenshot({ path: `${SHOTS}/tonight-full.png`, fullPage: true });
  // 추천 항목 탭 → 상세 시트
  await rec.getByTestId('rec-group-now').click();
  await rec.locator('[data-object-id="planet:saturn"] [data-testid="rec-open"]').click();
  await expect(page.getByTestId('object-sheet')).toBeVisible();
  await expect(page.getByTestId('sheet-name')).toHaveText('토성');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('오늘 밤(오프라인/실패): 날씨 카드는 조용히 숨고 추천은 동작한다', async ({ page }) => {
  const errors = collectErrors(page);
  await page.route(OPEN_METEO, (route) => route.abort('failed'));
  await openSky(page);
  await page.getByTestId('tab-tonight').click();
  await expect(page.getByTestId('sky-status-card')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('recommend-card').getByTestId('rec-list')).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForTimeout(500);
  await expect(page.getByTestId('weather-card')).toHaveCount(0);
  expect(
    errors.filter((e) => !/open-meteo|net::ERR|Failed to load resource/i.test(e)),
    errors.join('\n'),
  ).toEqual([]);
});

test('실제 하늘처럼: 켜면 별이 눈에 띄게 줄고 Bortle 변경이 즉시 반영된다', async ({ page }) => {
  const errors = collectErrors(page);
  await openSky(page);
  await page.waitForTimeout(600);
  // 캔버스 밝기 배열(픽셀 합). 같은 시점에서 켜기 전/후를 비교해 "사라진 별 픽셀" 비율을 본다(은하수·배경은 그대로).
  const brightness = () =>
    page.evaluate(() => {
      const c = document.querySelector('[data-testid="sky-canvas"]') as HTMLCanvasElement;
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      if (!gl) return [] as number[];
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const out: number[] = [];
      for (let i = 0; i < buf.length; i += 4) out.push(buf[i]! + buf[i + 1]! + buf[i + 2]!);
      return out;
    });
  // 은하수 텍스처·별자리 선은 한계등급과 무관하므로 끄고 별만 비교한다
  await page.getByTestId('open-layers').click();
  await page.locator('#layer-milkyWay').click();
  await page.locator('#layer-constellationLines').click();
  await page.getByTestId('close-layers').click();
  await page.waitForTimeout(500);
  const before = await brightness();
  const litBefore = before.filter((v) => v > 40).length;
  expect(litBefore).toBeGreaterThan(200);
  const toggle = page.getByTestId('real-sky-toggle');
  await expect(toggle).toHaveAttribute('data-limiting-mag', '6.5');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(toggle).toHaveAttribute('data-limiting-mag', /4\.\d/); // Bortle 7 기본: NELM 4.6 − 달
  await page.waitForTimeout(600);
  const after = await brightness();
  let gone = 0;
  for (let i = 0; i < before.length; i++) if (before[i]! > 40 && after[i]! < 20) gone++;
  const litAfter = after.filter((v) => v > 40).length;
  expect(litAfter, `lit before=${litBefore} after=${litAfter} gone=${gone}`).toBeLessThan(
    litBefore,
  );
  expect(
    gone / litBefore,
    `lit before=${litBefore} after=${litAfter} gone=${gone}`,
  ).toBeGreaterThan(0.2);

  // Bortle 슬라이더(레이어 패널) → 즉시 반영
  await page.getByTestId('open-layers').click();
  const slider = page.getByTestId('layer-bortle');
  await expect(slider).toBeVisible();
  await slider.fill('3');
  await expect(toggle).toHaveAttribute('data-limiting-mag', /6\.\d/);
  await slider.fill('9');
  await expect(toggle).toHaveAttribute('data-limiting-mag', /3\.\d/);
  await page.getByTestId('close-layers').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/real-sky.png` });
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-limiting-mag', '6.5');
  expect(errors, errors.join('\n')).toEqual([]);
});
