import { selectTab } from './navigation';
import { expect, test, type Page } from '@playwright/test';

/**
 * T3a e2e: 검색 → 상세 시트 → 찾아가기(화살표 방향·각거리) → 스와이프 닫기 → 북마크 저장 → 오늘 밤 하늘 상태 카드.
 * 시각은 해시 `t`로 고정(대전 2026-09-06 21:00 KST). 스크린샷: search-results / object-sheet / target-arrow / tonight.png
 */
const SHOTS = 'tests/e2e/__screenshots__';
const T = '2026-09-06T12:00:00Z';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

async function openSky(page: Page, params = ''): Promise<void> {
  await page.goto(`#/sky?t=${T}&preserve=1${params ? `&${params}` : ''}`);
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(500);
}

interface AltAz {
  altDeg: number;
  azDeg: number;
}

async function objectAltAz(page: Page, id: string): Promise<AltAz> {
  return page.evaluate((oid) => {
    const w = window as unknown as { __skylogScene: { objectAltAz(id: string): AltAz | null } };
    return w.__skylogScene.objectAltAz(oid)!;
  }, id);
}

test('검색: 토성 → 1위 → 탭하면 하늘 이동 + 상세 시트(출·남중·몰, 좌표, 장비)', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openSky(page);
  await selectTab(page, 'search');
  const input = page.getByTestId('search-input');
  await expect(input).toBeVisible();

  // 빈 검색어: 지금 보이는 유명 천체 제안(21:00 KST, 토성·목성 등)
  await expect(page.getByTestId('search-suggest').getByTestId('search-result').first()).toBeVisible(
    { timeout: 15_000 },
  );

  await input.fill('토성');
  const first = page.getByTestId('search-result').first();
  await expect(first.getByTestId('search-result-name')).toHaveText('토성', { timeout: 10_000 });
  await expect(first.getByTestId('search-result-state')).toContainText('고도');
  await expect(page.getByTestId('search-count')).toContainText('ms');
  const countText = await page.getByTestId('search-count').textContent();
  const ms = Number(/([\d.]+)ms/.exec(countText ?? '')?.[1] ?? '999');
  expect(ms).toBeLessThan(50);

  // 오타·기호·별칭
  for (const [q, name] of [
    ['andromada', '안드로메다은하'],
    ['M 13', '헤르쿨레스자리 대성단'],
    ['α Lyr', '베가'],
    ['오리온자리', '오리온자리'],
  ] as const) {
    await input.fill(q);
    await expect(
      page.getByTestId('search-result').first().getByTestId('search-result-name'),
    ).toContainText(name.slice(0, 2), { timeout: 10_000 });
  }

  // 카테고리 칩: 메시에만
  await input.fill('m');
  await page.getByTestId('search-cat-messier').click();
  await expect(
    page.getByTestId('search-result').first().getByTestId('search-result-name'),
  ).toBeVisible();
  await page.getByTestId('search-cat-all').click();

  await input.fill('토성');
  await expect(
    page.getByTestId('search-result').first().getByTestId('search-result-name'),
  ).toHaveText('토성');
  await page.screenshot({ path: `${SHOTS}/search-results.png` });
  await page.getByTestId('search-result').first().click();

  // 하늘 탭으로 이동 + 시트 반 열림
  await expect(page).toHaveURL(/#\/sky/);
  const sheet = page.getByTestId('object-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('data-stage', 'half');
  await expect(page.getByTestId('sheet-name')).toHaveText('토성');
  await expect(page.getByTestId('sheet-status')).toHaveAttribute('data-status', 'visible', {
    timeout: 15_000,
  });
  await expect(page.getByTestId('sheet-rise')).toHaveText(/\d{2}:\d{2}|—/);
  await expect(page.getByTestId('sheet-transit')).toHaveText(/\d{2}:\d{2}/);
  await expect(page.getByTestId('sheet-best-window')).toHaveText(/\d{2}:\d{2} – \d{2}:\d{2}/);
  await expect(page.getByTestId('sheet-verdict-naked')).toContainText('잘 보임');

  // 하늘이 토성으로 이동했는가(수동 flyTo)
  await page.waitForTimeout(700);
  const sat = await objectAltAz(page, 'planet:saturn');
  const view = await page.getByTestId('view-info').textContent();
  const m = /([+-]?[\d.]+)° \/ ([\d.]+)°/.exec(view ?? '');
  expect(m).not.toBeNull();
  expect(Math.abs(Number(m![1]) - sat.altDeg)).toBeLessThan(1.5);
  expect(Math.abs(Number(m![2]) - sat.azDeg)).toBeLessThan(1.5);

  // 전체 열기 → 스크린샷 → 북마크
  await page.getByTestId('sheet-stage').click();
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/object-sheet.png` });
  await page.getByTestId('sheet-plan').click();
  await expect(page.getByTestId('sheet-plan')).toHaveText('★ 예정됨');

  // 스와이프 닫기(전체 → 반 → 닫힘)
  const handle = page.getByTestId('sheet-handle');
  const box = (await handle.boundingBox())!;
  for (let i = 0; i < 2; i++) {
    const hb = (await handle.boundingBox()) ?? box;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 160, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
  await expect(sheet).toHaveCount(0);

  // 북마크가 Dexie에 남아 재열기 시 표시
  await page.reload();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await selectTab(page, 'search');
  await page.getByTestId('search-recent').getByTestId('search-result').first().click();
  await expect(page.getByTestId('sheet-plan')).toHaveText('★ 예정됨', { timeout: 10_000 });

  expect(errors, errors.join('\n')).toEqual([]);
});

test('툴팁 "자세히" → 시트 · 찾아가기: 화면 밖 화살표 방향·각거리, 화면 안 링, 중앙 진입', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openSky(page, 'select=planet:saturn&fov=60');
  await expect(page.getByTestId('tooltip')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('tooltip-details').click();
  await expect(page.getByTestId('object-sheet')).toBeVisible();
  await expect(page.getByTestId('sheet-name')).toHaveText('토성');
  // 시트가 열리면 툴팁은 숨긴다
  await expect(page.getByTestId('tooltip')).toHaveCount(0);

  await page.getByTestId('sheet-show-in-sky').click();
  await expect(page.getByTestId('target-guide')).toBeVisible();
  await page.getByTestId('sheet-close').click();
  await page.waitForTimeout(800);
  // 중앙 진입: 링 + centered
  await expect(page.getByTestId('target-ring')).toHaveAttribute('data-centered', '1', {
    timeout: 5_000,
  });

  const jup = await objectAltAz(page, 'planet:saturn');
  expect(jup.altDeg).toBeGreaterThan(5); // 21:00 KST 토성은 동쪽 하늘
  // 목표를 오른쪽 90°에 두면(같은 고도) → 오른쪽 가장자리, 각도 ≈ 0(카메라 피치 때문에 약간 위), 각거리 ≈ 90·cos(alt)
  const expectedSep = (Math.acos(Math.sin((jup.altDeg * Math.PI) / 180) ** 2) * 180) / Math.PI;
  await page.goto(
    `#/sky?t=${T}&preserve=1&alt=${jup.altDeg.toFixed(1)}&az=${((jup.azDeg - 90 + 360) % 360).toFixed(1)}&fov=60`,
  );
  await page.waitForTimeout(600);
  const arrow = page.getByTestId('target-arrow');
  await expect(arrow).toBeVisible();
  const angle1 = Number(await arrow.getAttribute('data-angle'));
  const sep1 = Number(await arrow.getAttribute('data-sep'));
  expect(Math.abs(angle1)).toBeLessThan(30);
  expect(Math.abs(sep1 - expectedSep)).toBeLessThan(3);
  await page.screenshot({ path: `${SHOTS}/target-arrow.png` });

  // 왼쪽 90° → 왼쪽 가장자리(|각도| ≈ 180)
  await page.goto(
    `#/sky?t=${T}&preserve=1&alt=${jup.altDeg.toFixed(1)}&az=${((jup.azDeg + 90) % 360).toFixed(1)}&fov=60`,
  );
  await page.waitForTimeout(600);
  const angle2 = Number(await arrow.getAttribute('data-angle'));
  const sep2 = Number(await arrow.getAttribute('data-sep'));
  expect(Math.abs(Math.abs(angle2) - 180)).toBeLessThan(30);
  expect(Math.abs(sep2 - expectedSep)).toBeLessThan(3);

  // 위쪽 40°(고도 더 낮게 봄) → 위 가장자리(각도 ≈ −90)
  await page.goto(
    `#/sky?t=${T}&preserve=1&alt=${(jup.altDeg - 40).toFixed(1)}&az=${jup.azDeg.toFixed(1)}&fov=40`,
  );
  await page.waitForTimeout(600);
  const angle3 = Number(await arrow.getAttribute('data-angle'));
  expect(Math.abs(angle3 + 90)).toBeLessThan(25);

  // 목표 해제
  await page.getByTestId('target-clear').click();
  await expect(page.getByTestId('target-guide')).toHaveCount(0);

  // 지평선 아래 목표: 안내 문구 + 시간 이동
  await selectTab(page, 'search');
  await page.getByTestId('search-input').fill('오리온성운');
  await expect(
    page.getByTestId('search-result').first().getByTestId('search-result-name'),
  ).toHaveText('오리온대성운', {
    timeout: 10_000,
  });
  await page.getByTestId('search-result').first().click();
  await expect(page.getByTestId('sheet-name')).toHaveText('오리온대성운');
  await page.getByTestId('sheet-show-in-sky').click();
  await page.getByTestId('sheet-close').click();
  await expect(page.getByTestId('target-below')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('target-jump-time').click();
  await page.waitForTimeout(800);
  await expect(page.getByTestId('target-below')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('오늘 밤: 하늘 상태 카드(일몰·박명·월출몰·어두운 창)가 USNO 기준과 맞는다', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openSky(page);
  await selectTab(page, 'tonight');
  const card = page.getByTestId('sky-status-card');
  await page.getByTestId('tonight-tab-conditions').click();
  await expect(card).toBeVisible({ timeout: 15_000 });
  // USNO(고도 0m): 일몰 18:52, 시민박명 끝 19:18, 일출 06:06; 프리셋 고도 70m라 ±2분
  await page.getByTestId('sky-details').locator('summary').click();
  await expect(page.getByTestId('status-sunset')).toHaveText(/18:5[1-4]/);
  await expect(page.getByTestId('status-sunrise')).toHaveText(/06:0[4-8]/);
  await expect(page.getByTestId('status-astro-dusk')).toHaveText(/20:[12]\d/);
  await expect(page.getByTestId('status-moonset')).toHaveText(/15:(39|4[01])/);
  await expect(page.getByTestId('status-moonrise')).toHaveText(/01:1[0-4]/);
  await expect(page.getByTestId('status-moon-phase')).toHaveText('그믐달');
  await expect(page.getByTestId('dark-list')).toBeVisible();
  await expect(card.locator('[data-testid="dark-window"]')).toHaveCount(1);
  await expect(card.locator('[data-testid="moon-band"]')).toHaveCount(1); // 정오~월몰(15:40)은 타임라인 범위 밖
  await expect(card.locator('[data-testid="now-cursor"]')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/tonight.png`, fullPage: true });
  expect(errors, errors.join('\n')).toEqual([]);
});
