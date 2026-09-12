import { expect, test, type Page } from '@playwright/test';

/**
 * T0a 스모크: 앱 로드 → 탭 5개 → 설정에서 야간 모드·언어·HUD 토글 → /debug/data → 콘솔 에러 0.
 * 스크린샷은 tests/e2e/__screenshots__/에 저장하고 세션이 Read로 직접 확인한다(마스터 플랜 §8.3).
 */
const SHOTS = 'tests/e2e/__screenshots__';

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test('앱 셸: 탭 5개 · 상태 바 · 콘솔 에러 0', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('#/sky');
  await expect(page.getByTestId('tab-bar')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(5);
  await expect(page.getByTestId('tab-sky')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('open-settings').click();
  await expect(page.getByTestId('status-site')).toContainText('대전');
  await page.getByTestId('close-sky-settings').click();
  await expect(page.getByTestId('time-toggle')).toContainText(/\d{2}:\d{2}/);
  await expect(page.locator('#splash')).toHaveCount(0);

  for (const tab of ['search', 'tonight', 'log', 'learn'] as const) {
    await page.getByTestId(`tab-${tab}`).click();
    await expect(page).toHaveURL(new RegExp(`#/${tab}$`));
    await expect(page.getByTestId(`tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
  }
  await page.getByTestId('tab-sky').click();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/shell-dark.png`, fullPage: true });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('작은 첫 화면: 시간 조절은 접히고 하늘 도구는 설정 안에서 열린다', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('#/sky');
  await expect(page.getByTestId('sky-view')).toBeVisible();
  const time = page.getByTestId('time-bar');
  await expect(time).toHaveAttribute('data-time-shifted', '0');
  await expect(page.getByTestId('time-controls')).toHaveCount(0);
  await expect(page.getByTestId('sky-overview')).toHaveCount(0);
  await expect(page.getByTestId('sky-telescope')).toHaveCount(0);
  await expect(page.getByTestId('real-sky-toggle')).toHaveCount(0);
  await expect(page.getByTestId('view-info')).toHaveCount(0);
  expect((await time.boundingBox())!.y).toBeLessThan(70);
  expect((await time.boundingBox())!.width).toBeLessThan(250);
  expect((await page.getByTestId('tab-bar').boundingBox())!.height).toBeLessThan(65);
  for (const tab of await page.getByRole('tab').all()) {
    const box = (await tab.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: `${SHOTS}/sky-simple.png` });
  await page.getByTestId('time-toggle').click();
  await expect(page.getByTestId('time-controls')).toBeVisible();
  await page.getByTestId('time-date').fill('2026-09-09');
  await expect(time).toHaveAttribute('data-time-shifted', '1');
  await page.getByTestId('time-toggle').click();
  await expect(page.getByTestId('time-shift-label')).toBeVisible();
  await page.getByTestId('time-now').click();
  await expect(time).toHaveAttribute('data-time-shifted', '0');
  await page.getByTestId('open-layers').click();
  await expect(page.getByTestId('sky-telescope')).toBeVisible();
  await page.getByTestId('sky-overview').click();
  await expect(page.getByTestId('layer-panel')).toHaveCount(0);
  await expect(page.getByTestId('view-info')).toContainText('180°');
});

test('큰 글자 200%: 센서 권한 안내·목표·좌표와 하단 탭이 겹치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => {
    Object.defineProperty(window.DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: async () => 'denied',
    });
  });
  await page.goto('#/sky?t=2026-09-06T12:00:00Z&select=planet:saturn');
  await expect(page.getByTestId('tooltip')).toBeVisible();
  await page.getByTestId('tooltip-details').click();
  await page.getByTestId('sheet-show-in-sky').click();
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('ar-toggle').click();
  await expect(page.getByTestId('ar-help')).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect
    .poll(async () => {
      const controls = (await page.getByTestId('ar-toggle-wrap').boundingBox())!;
      const layers = (await page.getByTestId('open-layers').boundingBox())!;
      const target = (await page.getByTestId('target-pill').boundingBox())!;
      const view = (await page.getByTestId('view-info').boundingBox())!;
      const time = (await page.getByTestId('time-bar').boundingBox())!;
      return (
        target.y >= layers.y + layers.height + 7 &&
        view.y >= target.y + target.height + 7 &&
        target.y >= time.y + time.height + 7 &&
        controls.y > view.y + view.height
      );
    })
    .toBe(true);
  const tabs = (await page.getByTestId('tab-bar').boundingBox())!;
  expect(tabs.height).toBe(60);
  for (const tab of await page.getByRole('tab').all()) {
    const box = (await tab.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await expect(page.getByTestId('tooltip')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/sky-large-text.png` });
});

test('설정: 야간 모드 · 언어 전환 · 디버그 HUD가 동작하고 Dexie에 저장된다', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('#/sky');
  await page.getByTestId('open-settings').click();
  await page.getByTestId('app-settings').click();
  await expect(page.getByTestId('settings-screen')).toBeVisible();

  // 야간 모드
  const night = page.locator('#setting-night');
  await night.click();
  await expect(night).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  const fg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(),
  );
  expect(fg).toBe('#ff3b30');

  // 디버그 HUD
  await page.locator('#setting-debug-hud').click();

  // 언어 전환 → 영어
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.getByTestId('back').click();
  await expect(page.getByTestId('tab-sky')).toHaveText(/Sky/);
  await expect(page.getByTestId('debug-hud')).toBeVisible();
  await expect(page.getByTestId('debug-hud')).toContainText(/fps/);
  await page.screenshot({ path: `${SHOTS}/shell-night-en.png`, fullPage: true });

  // 야간 모드에서 흰색이 남지 않는지: 보이는 모든 요소의 color/background/border를 검사
  const whiteOffenders = await page.evaluate(() => {
    const isWhite = (c: string) => /^rgba?\(\s*255,\s*255,\s*255(,\s*[^0)]+)?\s*\)$/.test(c);
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.getClientRects().length === 0)
        continue;
      for (const prop of [
        'color',
        'backgroundColor',
        'borderTopColor',
        'fill',
        'stroke',
      ] as const) {
        const v = cs[prop];
        if (v && isWhite(v)) {
          out.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} ${prop}=${v}`);
          break;
        }
      }
    }
    return out;
  });
  expect(whiteOffenders, whiteOffenders.join('\n')).toEqual([]);

  // 새로고침 후에도 설정이 유지된다(Dexie persist)
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(page.getByTestId('tab-sky')).toHaveText(/Sky/);
  const rows = await page.evaluate(async () => {
    const req = indexedDB.open('skylog');
    const db = await new Promise<IDBDatabase>((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    const tx = db.transaction('settings', 'readonly');
    const all = tx.objectStore('settings').getAll();
    return new Promise<{ key: string; value: unknown }[]>((res) => {
      all.onsuccess = () => res(all.result as { key: string; value: unknown }[]);
    });
  });
  expect(rows.find((r) => r.key === 'settings.theme')?.value).toBe('night');
  expect(rows.find((r) => r.key === 'settings.lang')?.value).toBe('en');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('/debug/data 페이지가 열린다', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('#/debug/data');
  await expect(page.getByTestId('debug-data')).toBeVisible();
  // T0a: 데이터 팩 없음 안내 또는(T0b 이후) 요약 표
  const noData = page.getByTestId('debug-no-data');
  const summary = page.getByTestId('debug-summary');
  await expect(noData.or(summary)).toBeVisible();
  if (await summary.isVisible()) {
    const stars = Number(await page.getByTestId('count-stars').textContent());
    const cons = Number(await page.getByTestId('count-constellations').textContent());
    const messier = Number(await page.getByTestId('count-messier').textContent());
    expect(stars).toBeGreaterThan(8000);
    expect(cons).toBe(88);
    expect(messier).toBe(110);
  }
  await page.screenshot({ path: `${SHOTS}/debug-data.png`, fullPage: true });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('PWA: manifest와 서비스 워커가 등록된다', async ({ page }) => {
  await page.goto('#/sky');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const res = await page.request.get(new URL(manifestHref!, page.url()).toString());
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as { name: string; display: string; icons: unknown[] };
  expect(manifest.name).toBe('스카이야드 Skyard - 천체 관측 가이드');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  const swRegistered = await page.evaluate(async () => {
    const sw = (navigator as Navigator).serviceWorker;
    if (!sw) return false;
    const reg = await sw.ready;
    return !!reg.active;
  });
  expect(swRegistered).toBe(true);
});
