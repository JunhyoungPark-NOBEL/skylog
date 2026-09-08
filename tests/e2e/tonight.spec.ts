import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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

test('월 버튼·월간/연간 달력·ICS 내보내기와 간결한 날씨', async ({ page }) => {
  await page.route(OPEN_METEO, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(forecast()),
    }),
  );
  await openSky(page);
  await page.getByTestId('tab-tonight').click();
  await expect(page.getByTestId('tonight-tab-conditions')).toHaveText('날씨');
  await page.getByTestId('tonight-tab-conditions').click();
  await expect(page.getByTestId('sky-best-window')).toBeVisible();
  await expect(page.getByTestId('sky-details')).not.toHaveAttribute('open');
  await expect(page.getByTestId('weather-details')).not.toHaveAttribute('open');
  await expect(page.getByTestId('weather-summary')).toContainText('21:00');
  await page.screenshot({ path: `${SHOTS}/tonight-weather-simple.png` });
  await page.getByTestId('weather-details').locator('summary').click();
  await expect(page.getByTestId('weather-details-card').getByRole('table')).toBeVisible();
  await page.getByTestId('tonight-tab-events').click();
  await expect(page.getByTestId('phen-this')).toHaveText('9월');
  await expect(page.getByTestId('phen-next')).toHaveText('10월');
  await page.getByTestId('phen-next').click();
  await expect(page.getByTestId('phen-next')).toHaveText('10월');
  await expect(page.getByTestId('phenomena-list')).toContainText('토성');
  await page.getByTestId('events-view-month').click();
  await expect(page.getByTestId('calendar-heading')).toContainText('10월');
  await page.getByTestId('event-day-4').click();
  await expect(page.getByTestId('phenomena-list')).toContainText('토성');
  await page.getByTestId('event-day-4').press('ArrowRight');
  await expect(page.getByTestId('event-day-5')).toBeFocused();
  await page.screenshot({ path: `${SHOTS}/tonight-calendar.png` });
  await page.getByTestId('events-view-year').click();
  await expect(page.getByTestId('event-year-grid').getByRole('button')).toHaveCount(12);
  await expect(
    page.getByText('한 해의 일정을 모았어요. 월을 누르면 자세히 볼 수 있어요.'),
  ).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/tonight-calendar-year.png` });
  await page.getByText('한 해 일정 달력에 저장', { exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByTestId('calendar-export').click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('skylog-2026-ko.ics');
  const ics = await readFile((await download.path())!, 'utf8');
  expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBeGreaterThan(40);
  expect(ics).toContain('BEGIN:VCALENDAR');
  await page.getByTestId('year-month-12').click();
  await page.getByTestId('calendar-next').click();
  await expect(page.getByTestId('calendar-heading')).toHaveText('2027년 1월');
  await page.getByTestId('events-view-list').click();
  await expect(page.getByTestId('phen-this')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('phenomena-list')).not.toContainText('2027');
});

test('열어 둔 천문 일정이 월말 자정을 지나면 이번 달로 자동 이동한다', async ({ page }) => {
  await page.route(OPEN_METEO, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(forecast()),
    }),
  );
  await page.clock.install({ time: new Date('2026-09-30T14:59:30Z') });
  await page.goto('#/tonight');
  await page.getByTestId('tonight-tab-events').click();
  await expect(page.getByTestId('phen-this')).toHaveText('9월');
  await expect(page.getByTestId('phen-next')).toHaveText('10월');
  await page.getByTestId('events-view-month').click();
  await expect(page.getByTestId('calendar-heading')).toContainText('9월');
  await page.clock.fastForward(61_000);
  await expect(page.getByTestId('calendar-heading')).toHaveText('2026년 10월');
  await page.getByTestId('events-view-list').click();
  await expect(page.getByTestId('phen-this')).toHaveText('10월');
  await expect(page.getByTestId('phen-next')).toHaveText('11월');
});

async function openSky(page: Page): Promise<void> {
  await page.goto(`#/sky?t=${T}&preserve=1`);
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(400);
}

test('360px 영어·큰 글자에서도 달력과 코스 테마가 화면 안에 들어간다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.locator('#setting-night').click();
  await page.goto(`#/sky?t=${T}&alt=0&az=180&fov=90&preserve=1`);
  await expect(page.getByTestId('sky-loading')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/sky-meadow-night-en.png` });
  await page.getByTestId('tab-tonight').click();
  await page.getByTestId('tonight-tab-events').click();
  await page.getByTestId('events-view-year').click();
  await expect(page.getByTestId('year-month-12')).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  const bounds = await page
    .getByTestId('event-year-grid')
    .evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
  await page.screenshot({ path: `${SHOTS}/calendar-english-large.png` });
  await page.goto('#/learn?section=courses');
  await expect(page.getByTestId('course-theme-naked')).toBeVisible();
  await expect(page.getByTestId('course-theme-binoculars')).toBeVisible();
  await expect(page.getByTestId('course-theme-telescope')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/course-themes-en.png` });
});

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
  await expect(page.getByTestId('recommend-card').getByTestId('rec-list')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/tonight-picks.png` });
  await page.getByTestId('tonight-tab-conditions').click();
  await expect(page.getByTestId('sky-status-card')).toBeVisible({ timeout: 15_000 });

  // 날씨: 선택 시간(01:00까지) 안의 구름 적은 구간 · 결로 경고 · 출처
  const weather = page.getByTestId('weather-card');
  await expect(weather).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('weather-summary')).toContainText('21:00');
  await expect(page.getByTestId('weather-summary')).toContainText('01:00');
  await expect(page.getByTestId('weather-dew')).toBeVisible();
  await expect(weather).toContainText('Open-Meteo');
  await page.screenshot({ path: `${SHOTS}/tonight-conditions.png` });
  // 하늘 상태 타임라인에 구름 막대가 겹쳐 그려진다
  expect(
    await page.getByTestId('sky-status-card').locator('rect[fill="var(--muted)"]').count(),
  ).toBeGreaterThan(5);

  // 추천: 계산 완료 후 그룹 칩 · 토성이 목록에 있고 '지금 당장' 그룹에 있다
  await page.getByTestId('tonight-tab-picks').click();
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
  await page.getByText('오늘의 볼거리 더 보기', { exact: true }).click();
  await expect(page.getByTestId('highlights-card')).toBeVisible();

  // 시간대 프리셋: 저녁 = 일몰(18:51)부터 → 지금부터 2시간 → 창 라벨 변경, 장비 전환
  await expect(page.getByTestId('window-label')).toContainText('18:5');
  await page.getByTestId('tonight-filters').click();
  await page.getByTestId('preset-next2h').click();
  await expect(page.getByTestId('window-label')).toContainText('21:00 ~ 23:00');
  await page.getByTestId('equip-telescope').click();
  await expect(rec.getByTestId('rec-list')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('preset-evening').click();

  // 계획: ☆ → ★ (Dexie bookmarks)
  const plan = page.getByTestId('plan-card');
  await page.getByText('시간순 관측 계획', { exact: true }).click();
  await expect(plan).toBeVisible({ timeout: 20_000 });
  const star = plan.getByTestId('rec-plan-toggle').first();
  await star.click();
  await expect(star).toHaveText('★');
  await expect(star).toHaveAttribute('aria-pressed', 'true');

  // 이달의 현상: 9월 목록에 달 위상, 10월 탭에 토성 충
  const phen = page.getByTestId('phenomena-card');
  await page.getByTestId('tonight-tab-events').click();
  await expect(phen.locator('[data-kind="moonQuarter"]').first()).toBeVisible();
  await phen.getByTestId('phen-next').click();
  await expect(phen.getByTestId('phenomena-list')).toContainText('토성 충');
  await expect(phen.locator('[data-kind="meteorPeak"]').first()).toBeVisible();

  // 유성우 카드
  await expect(page.getByTestId('meteor-card')).toBeVisible();
  await expect(page.getByTestId('meteor-next')).toContainText('극대');

  await page.screenshot({ path: `${SHOTS}/tonight-full.png`, fullPage: true });
  // 추천 항목 탭 → 상세 시트
  await page.getByTestId('tonight-tab-picks').click();
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
  await page.getByTestId('tonight-tab-conditions').click();
  await expect(page.getByTestId('sky-status-card')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('weather-card')).toHaveCount(0);
  await page.getByTestId('tonight-tab-picks').click();
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
  // 별 재질을 숨긴 배경을 한 번 측정한다. 지면 등 밝은 고정 픽셀은 별 감소 비율에서 제외한다.
  const brightness = (hideStars = false) =>
    page.evaluate(async (hideStars) => {
      const scene = (
        window as unknown as {
          __skylogScene: {
            invalidate(): void;
            renderer: { info: { render: { frame: number } } };
            stars: { points: { material: { visible: boolean } } };
          };
        }
      ).__skylogScene;
      const c = document.querySelector('[data-testid="sky-canvas"]') as HTMLCanvasElement;
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      if (!gl) throw new Error('별 픽셀 검증에 필요한 WebGL 컨텍스트가 없습니다.');
      const render = async () => {
        const previous = scene.renderer.info.render.frame;
        scene.invalidate();
        await new Promise<void>((resolve) => {
          const check = () =>
            scene.renderer.info.render.frame > previous ? resolve() : requestAnimationFrame(check);
          requestAnimationFrame(check);
        });
      };
      const material = scene.stars.points.material;
      const wasVisible = material.visible;
      try {
        if (hideStars) material.visible = false;
        await render();
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const buf = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        const out: number[] = [];
        for (let i = 0; i < buf.length; i += 4) out.push(buf[i]! + buf[i + 1]! + buf[i + 2]!);
        return out;
      } finally {
        if (hideStars) {
          material.visible = wasVisible;
          await render();
        }
      }
    }, hideStars);
  // 은하수 텍스처·별자리 선은 한계등급과 무관하므로 끄고 별만 비교한다
  await page.getByTestId('open-layers').click();
  await page.locator('#layer-milkyWay').click();
  await page.locator('#layer-constellationLines').click();
  await page.getByTestId('close-layers').click();
  await page.waitForTimeout(500);
  const background = await brightness(true);
  const withoutBackground = (pixels: number[]) => {
    expect(pixels).toHaveLength(background.length);
    return pixels.map((value, i) => Math.max(0, value - background[i]!));
  };
  const before = withoutBackground(await brightness());
  const litBefore = before.filter((v) => v > 40).length;
  expect(litBefore).toBeGreaterThan(200);
  const toggle = page.getByTestId('real-sky-toggle');
  await page.getByTestId('open-layers').click();
  await expect(toggle).toHaveAttribute('data-limiting-mag', '6.5');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(toggle).toHaveAttribute('data-limiting-mag', /4\.\d/); // Bortle 7 기본: NELM 4.6 − 달
  await page.getByTestId('close-layers').click();
  await page.waitForTimeout(600);
  const after = withoutBackground(await brightness());
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
  await page.getByTestId('open-layers').click();
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-limiting-mag', '6.5');
  await page.getByTestId('close-layers').click();
  expect(errors, errors.join('\n')).toEqual([]);
});
