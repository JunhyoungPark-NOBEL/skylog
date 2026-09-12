import { expect, test, type Page } from '@playwright/test';

/**
 * T2 센서 e2e (task-02 §6): 시뮬레이터로 AR 켜기 → alpha 변경 → 화면 중심 방위 일치 → 1-별 정렬 → δ 반영
 * → 수동 드래그 → 버튼으로 복귀. 관측지 CRUD·범위 선택기, 디버그 덤프 복사.
 */
const T = '2026-09-06T12:00:00Z';

interface View {
  altDeg: number;
  azDeg: number;
  fovDeg: number;
}

async function getView(page: Page): Promise<View> {
  return page.evaluate(() =>
    (
      window as unknown as { __skylogScene: { controller: { getView(): View } } }
    ).__skylogScene.controller.getView(),
  );
}

async function enableSimulator(page: Page): Promise<void> {
  await page.goto('#/debug/sensors');
  await expect(page.getByTestId('sensor-debug')).toBeVisible();
  const sim = page.locator('#sensor-simulator');
  if ((await sim.getAttribute('aria-checked')) !== 'true') await sim.click();
  await expect(sim).toHaveAttribute('aria-checked', 'true');
}

async function setSlider(page: Page, id: string, value: number): Promise<void> {
  await page.getByTestId(id).fill(String(value));
}

test('AR 모드(시뮬레이터): 켜기 → 방위 추종 → 편각 → 1-별 정렬 → 수동 드래그 → 버튼으로 복귀', async ({
  page,
}) => {
  await enableSimulator(page);
  await page.goto(`#/sky?t=${T}&preserve=1&alt=30&az=180&fov=90`);
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });

  // 켜기
  await page.getByTestId('ar-toggle').click();
  await expect(page.getByTestId('sim-panel')).toBeVisible();
  await expect(page.getByTestId('ar-status')).toBeVisible();

  // 상대 모드(iOS형): 북 기준이 준비되지 않은 yaw는 방위로 사용하지 않고 기존 차트를 유지한다.
  await setSlider(page, 'sim-beta', 90);
  await setSlider(page, 'sim-alpha', 270); // α=270 → 동쪽
  await page.waitForTimeout(600);
  let v = await getView(page);
  expect(Math.abs(v.azDeg - 180)).toBeLessThan(1.5);
  expect(Math.abs(v.altDeg - 30)).toBeLessThan(1.5);
  await expect(page.getByTestId('ar-source')).toContainText('밝은 별');

  // 절대 모드(Android형): 자북 기준 α=0 → 편각(대전 −8.7°) 적용 → 방위 ≈ 351.3
  await page.getByTestId('sim-absolute').check();
  await setSlider(page, 'sim-alpha', 0);
  await page.waitForTimeout(800);
  v = await getView(page);
  const decl = await page.evaluate(
    () =>
      (window as unknown as { __skylogSensor: { declinationDeg: number | null } }).__skylogSensor
        .declinationDeg,
  );
  expect(decl).not.toBeNull();
  expect(decl!).toBeGreaterThan(-9.5);
  expect(decl!).toBeLessThan(-7.5);
  expect(Math.abs(((v.azDeg - (360 + decl!) + 540) % 360) - 180)).toBeLessThan(1.5);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __skylogSensor: { headingSource: string } }).__skylogSensor
            .headingSource,
      ),
    )
    .toBe('absolute');
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sensor-ar.png' });

  // 1-별 정렬: 대상(베가)을 고르고 "맞췄어요" → δ = 대상 방위 − 센서 방위 → 화면 중심이 대상과 일치
  await page.getByTestId('open-layers').click();
  await page.getByTestId('ar-align').click();
  await expect(page.getByTestId('calib-wizard')).toBeVisible();
  const candidates = page.getByTestId('calib-candidates').locator('button');
  expect(await candidates.count()).toBeGreaterThan(0);
  const vegaBtn = page.getByTestId('calib-candidate-star:HIP91262');
  const target = (await vegaBtn.count()) > 0 ? vegaBtn : candidates.first();
  const targetId = (await target.getAttribute('data-testid'))!.replace('calib-candidate-', '');
  await target.click();
  await expect(page.getByTestId('calib-error')).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sensor-wizard.png' });
  await page.getByTestId('calib-confirm').click();
  await expect(page.getByTestId('calib-result')).toBeVisible();
  await page.getByTestId('calib-finish').click();
  await page.waitForTimeout(500);
  const tgt = await page.evaluate(
    (id) =>
      (
        window as unknown as {
          __skylogScene: { objectAltAz(id: string): { altDeg: number; azDeg: number } | null };
        }
      ).__skylogScene.objectAltAz(id),
    targetId,
  );
  v = await getView(page);
  expect(Math.abs(((v.azDeg - tgt!.azDeg + 540) % 360) - 180)).toBeLessThan(1.5);
  expect(Math.abs(v.altDeg - tgt!.altDeg)).toBeLessThan(1.5);
  await page.getByTestId('open-settings').click();
  await expect(page.getByTestId('alignment-setting-status')).toContainText(/맞춤/);
  await page.getByTestId('close-sky-settings').click();

  // 수동 드래그 → "수동" → 버튼으로 센서 복귀
  const box = (await page.getByTestId('sky-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('ar-resume')).toHaveCount(0);
  const dragged = await getView(page);
  expect(Math.abs(((dragged.azDeg - v.azDeg + 540) % 360) - 180)).toBeGreaterThan(5);
  await page.waitForTimeout(5600);
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('ar-toggle').click();
  await page.waitForTimeout(500);
  const back = await getView(page);
  expect(Math.abs(((back.azDeg - v.azDeg + 540) % 360) - 180)).toBeLessThan(1.5);

  // 끄기
  await page.getByTestId('ar-toggle').click();
  await expect(page.getByTestId('sim-panel')).toHaveCount(0);
});

test('기본 방향 센서: 바로 연결하고 끄기 선택은 재실행에도 유지한다', async ({ page }) => {
  await enableSimulator(page);
  await page.goto('#/sky');
  await expect(page.getByTestId('sim-panel')).toBeVisible();
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('sim-absolute').check();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __skylogSensor: { headingSource: string } }).__skylogSensor
            .headingSource,
      ),
    )
    .toBe('absolute');
  await expect(page.getByTestId('ar-align')).toHaveCount(0);
  await page.getByTestId('ar-toggle').click();
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'false');
  // 화면의 꺼짐 표시와 Dexie 비동기 저장 완료는 다르다. 저장을 확인한 뒤 재실행한다.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<unknown>((resolve, reject) => {
            const request = indexedDB.open('skylog');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction('settings', 'readonly');
              const value = tx.objectStore('settings').get('sensor.autoStart');
              tx.oncomplete = () => {
                db.close();
                resolve((value.result as { value?: unknown } | undefined)?.value);
              };
              tx.onabort = () => {
                db.close();
                reject(tx.error);
              };
            };
          }),
      ),
    )
    .toBe(false);
  await page.reload();
  await expect(page.getByTestId('sky-view')).toBeVisible();
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('sim-panel')).toHaveCount(0);
  await page.getByTestId('ar-toggle').click();
  await expect(page.getByTestId('sim-panel')).toBeVisible();
  await page.getByTestId('open-layers').click();
  await page.getByTestId('sky-overview').click();
  await expect(page.getByTestId('ar-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('view-info')).toContainText('180°');
  await page.getByTestId('tab-search').click();
  await page.getByTestId('tab-sky').click();
  await expect(page.getByTestId('sim-panel')).toBeVisible();
});

test('허용된 현재 위치는 자동 갱신하고 저장 관측지를 고르면 자동 사용을 끈다', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 37.5665, longitude: 126.978, accuracy: 20 });
  await page.goto('#/sky');
  await page.getByTestId('open-settings').click();
  await expect(page.getByTestId('status-site')).toHaveText('GPS');
  await page.goto('#/sites');
  await expect(page.locator('#sites-auto-location')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('sites-list').getByRole('button', { name: /대전/ }).first().click();
  await expect(page.getByTestId('sites-current')).toContainText('대전');
  await expect(page.locator('#sites-auto-location')).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(page.getByTestId('sites-current')).toContainText('대전');
  await expect(page.locator('#sites-auto-location')).toHaveAttribute('aria-checked', 'false');
});

test('관측지: 추가(붙여넣기 파서·범위 선택기) → 선택 → 편집 → 삭제', async ({ page }) => {
  await page.goto('#/sites');
  await expect(page.getByTestId('sites-screen')).toBeVisible();
  await expect(page.getByTestId('sites-list')).toContainText('대전');

  await page.getByTestId('site-add').click();
  await page.getByTestId('site-name').fill('베란다');
  await page.getByTestId('site-paste').fill('36°22′N 127°22′E');
  await page.getByTestId('site-paste-apply').click();
  await expect(page.getByTestId('site-lat')).toHaveValue('36.36667');
  await expect(page.getByTestId('site-lon')).toHaveValue('127.36667');
  // 범위: 링 클릭 → 90° 구간 생성
  const picker = page.getByTestId('sky-range-picker').locator('svg');
  await picker.scrollIntoViewIfNeeded(); // 새 레이아웃에서는 링이 첫 화면 아래에 있을 수 있다
  const pb = (await picker.boundingBox())!;
  await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height * 0.85); // 남쪽
  await expect(page.getByTestId('range-text')).toContainText('→');
  await page.getByTestId('range-minalt').fill('15');
  await page.screenshot({ path: 'tests/e2e/__screenshots__/sites-editor.png', fullPage: true });
  await page.getByTestId('site-save').click();
  await expect(page.getByTestId('sites-list')).toContainText('베란다');
  await expect(page.getByTestId('sites-list')).toContainText('≥15°');

  // 선택 → 상태 바 관측지 변경
  await page.getByTestId('sites-list').getByText('베란다').click();
  await expect(page.getByTestId('sites-current')).toHaveText('베란다');
  await page.goto('#/sky');
  await page.getByTestId('open-settings').click();
  await expect(page.getByTestId('status-site')).toContainText('베란다');

  // 편집·삭제
  await page.goto('#/sites');
  await page.getByTestId('site-edit-베란다').click();
  await page.getByTestId('site-name').fill('베란다2');
  await page.getByTestId('site-save').click();
  await expect(page.getByTestId('sites-list')).toContainText('베란다2');
  await page
    .getByTestId('sites-list')
    .locator('li', { hasText: '베란다2' })
    .getByRole('button', { name: '삭제' })
    .click();
  await expect(page.getByTestId('sites-list')).not.toContainText('베란다2');
});

test('GPS 거부 경로 안내 · 디버그 덤프 복사', async ({ page, context }) => {
  await context.grantPermissions([]); // 위치 권한 없음 → 거부/불가 안내
  await page.goto('#/sites');
  await page.getByTestId('sites-gps').click();
  await expect(page.getByTestId('sites-gps-error')).toBeVisible({ timeout: 20_000 });

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('#/debug/sensors');
  await expect(page.getByTestId('sensor-dump')).toContainText('provider:');
  await page.getByTestId('sensor-copy').click();
  await expect(page.getByTestId('sensor-copy')).toHaveText(/복사됨/);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('skylog sensor dump');
  expect(clip).toContain('declination:');
});
