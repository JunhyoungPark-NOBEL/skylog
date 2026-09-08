import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';

/**
 * D-022 스크롤 e2e: 탭 화면·상세 시트를 마우스로 잡아 끌면 스크롤되고(관성 포함), 끌다 놓은 자리의 버튼은 눌리지 않는다.
 * 상세 시트는 본문·헤더에서도 펼치고 접으며, 전체 열림에서는 네이티브 본문 스크롤을 유지한다.
 * Chromium의 실제 입력 경로는 CDP 터치 이벤트로 확인한다. 시각은 대전 2026-09-06 21:00 KST.
 */
const T = '2026-09-06T12:00:00Z';
const OPEN_METEO = 'https://api.open-meteo.com/**';

test.use({ serviceWorkers: 'block' });

async function openTonight(page: Page): Promise<void> {
  await page.route(OPEN_METEO, (route) => route.abort('failed'));
  await page.goto(`#/sky?t=${T}&preserve=1`);
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await page.getByTestId('tab-tonight').click();
  await page.getByTestId('tonight-filters').click();
  await page.getByText('시간순 관측 계획', { exact: true }).click();
  await expect(page.getByTestId('recommend-card').getByTestId('rec-list')).toBeVisible({
    timeout: 20_000,
  });
}

const scrollTopOf = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((el) => el.scrollTop);

interface Point {
  x: number;
  y: number;
}

async function pointIn(locator: Locator, xRatio = 0.5, yRatio = 0.5): Promise<Point> {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width * xRatio, y: box.y + box.height * yRatio };
}

async function openObjectSheet(page: Page): Promise<void> {
  await page.goto(`#/sky?t=${T}&preserve=1&select=star:HIP91262&fov=60`);
  await expect(page.getByTestId('tooltip-details')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('tooltip-details').click();
  await expect(page.getByTestId('sheet-name')).toHaveText('베가');
  await expect(page.getByTestId('sheet-altaz')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('object-sheet')).toHaveAttribute('data-stage', 'half');
}

async function mouseSwipe(page: Page, from: Point, dy: number): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + dy, { steps: 10 });
  // 관성의 유무와 관계없이 제스처가 실제로 옮긴 위치를 검사한다.
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function touchSwipe(
  page: Page,
  cdp: CDPSession,
  from: Point,
  dx: number,
  dy: number,
  end: 'touchEnd' | 'touchCancel' = 'touchEnd',
): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...from, id: 1 }],
  });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x + (dx * i) / 10, y: from.y + (dy * i) / 10, id: 1 }],
    });
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(120);
  await cdp.send('Input.dispatchTouchEvent', { type: end, touchPoints: [] });
  await page.waitForTimeout(500);
}

test('마우스: 콘텐츠를 잡아 끌면 스크롤되고 놓으면 관성으로 더 간다 · 끌다 놓은 버튼은 눌리지 않는다', async ({
  page,
}) => {
  await openTonight(page);
  const screen = page.getByTestId('tab-screen');
  const box = (await screen.boundingBox())!;
  const x = box.x + box.width / 2;
  const y0 = box.y + box.height * 0.75;

  await page.mouse.move(x, y0);
  await page.mouse.down();
  await page.mouse.move(x, y0 - 300, { steps: 12 });
  const during = await scrollTopOf(page, 'tab-screen');
  expect(during).toBeGreaterThan(200);
  await expect(screen).toHaveAttribute('data-drag-scrolling', '1');
  await page.mouse.up();
  await expect(screen).not.toHaveAttribute('data-drag-scrolling', '1');

  // 관성: 놓기 직전 80ms 안에 움직임이 있어야 한다. 이벤트 루프 지연으로 마지막 move가 늦어질 수 있으니 최대 3번 시도.
  let gained = false;
  for (let attempt = 0; attempt < 3 && !gained; attempt++) {
    await page.mouse.wheel(0, 0); // 남은 관성 정지
    await screen.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(100);
    await page.mouse.move(x, y0);
    await page.mouse.down();
    await page.mouse.move(x, y0 - 250, { steps: 10 });
    const held = await scrollTopOf(page, 'tab-screen');
    await page.mouse.up();
    await page.waitForTimeout(500);
    gained = (await scrollTopOf(page, 'tab-screen')) > held;
  }
  expect(gained).toBe(true);

  // 버튼 위에서 드래그를 시작해 놓아도 그 버튼은 눌리지 않는다(시간대 프리셋이 바뀌지 않음)
  await page.mouse.wheel(0, 0);
  await screen.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(100);
  const label = await page.getByTestId('window-label').textContent();
  const btn = (await page.getByTestId('preset-next2h').boundingBox())!;
  const bx = btn.x + btn.width / 2;
  const by = btn.y + btn.height / 2;
  expect(
    await page.evaluate(
      ([px, py]) =>
        document.elementFromPoint(px!, py!)?.closest('[data-testid="preset-next2h"]') !== null,
      [bx, by],
    ),
  ).toBe(true);
  await page.mouse.move(bx, by);
  await page.mouse.down();
  await page.mouse.move(bx, by - 80, { steps: 6 });
  await expect(screen).toHaveAttribute('data-drag-scrolling', '1');
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect(await scrollTopOf(page, 'tab-screen')).toBeGreaterThan(30);
  await expect(page.getByTestId('window-label')).toHaveText(label!);
  // 그냥 클릭은 여전히 동작한다
  await page.getByTestId('preset-next2h').click();
  await expect(page.getByTestId('window-label')).toContainText('21:00 ~ 23:00');
});

test('터치: 네이티브 스크롤은 그대로 동작한다', async ({ page }) => {
  await openTonight(page);
  const box = (await page.getByTestId('tab-screen').boundingBox())!;
  const x = box.x + box.width / 2;
  const y0 = box.y + box.height * 0.75;
  const screen = page.getByTestId('tab-screen');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y0 - i * 30 }],
    });
    await page.waitForTimeout(16);
    if (i === 4) {
      // 훅이 터치를 마우스처럼 잡았다면 여기서 드래그 상태가 켜져 있을 것이다 — 켜지면 안 된다
      await expect(screen).not.toHaveAttribute('data-drag-scrolling', '1');
      expect(await screen.evaluate((el) => el.style.userSelect)).toBe('');
    }
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  expect(await scrollTopOf(page, 'tab-screen')).toBeGreaterThan(100);
  await expect(screen).not.toHaveAttribute('data-drag-scrolling', '1');
});

test('상세 시트 마우스: 본문에서 펼치기 → 제목에서도 내용 스크롤 → 맨 위에서 접고 펼치기', async ({
  page,
}) => {
  await openObjectSheet(page);
  const sheet = page.getByTestId('object-sheet');
  const body = page.getByTestId('sheet-body');
  const halfHeight = (await sheet.boundingBox())!.height;

  await mouseSwipe(page, await pointIn(body, 0.08, 0.75), -150);
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  expect((await sheet.boundingBox())!.height).toBeGreaterThan(halfHeight + 150);
  expect(await scrollTopOf(page, 'sheet-body')).toBeLessThan(2);

  await mouseSwipe(page, await pointIn(body, 0.08, 0.8), -230);
  expect(await scrollTopOf(page, 'sheet-body')).toBeGreaterThan(100);
  await expect(sheet).toHaveAttribute('data-stage', 'full');

  const beforeHeaderScroll = await scrollTopOf(page, 'sheet-body');
  await mouseSwipe(page, await pointIn(page.getByTestId('sheet-name')), 120);
  expect(await scrollTopOf(page, 'sheet-body')).toBeLessThan(beforeHeaderScroll - 60);
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  // 제목에서 아래로 끌어도 본문을 먼저 맨 위로 돌려놓고, 다음 동작부터 시트를 접는다.
  await mouseSwipe(page, await pointIn(page.getByTestId('sheet-name')), 230);
  expect(await scrollTopOf(page, 'sheet-body')).toBeLessThan(2);
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  await mouseSwipe(page, await pointIn(page.getByTestId('sheet-name')), 120);
  await expect(sheet).toHaveAttribute('data-stage', 'half');
  await mouseSwipe(page, await pointIn(page.getByTestId('sheet-name')), -150);
  await expect(sheet).toHaveAttribute('data-stage', 'full');

  const bookmark = page.getByTestId('sheet-bookmark');
  await mouseSwipe(page, await pointIn(bookmark), 120);
  await expect(sheet).toHaveAttribute('data-stage', 'half');
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
});

test('상세 시트 마우스: 첫 이동이 시트 밖까지 한 번에 나가도 펼쳐진다', async ({ page }) => {
  await openObjectSheet(page);
  const sheet = page.getByTestId('object-sheet');
  const initial = (await sheet.boundingBox())!;
  const from = await pointIn(page.getByTestId('sheet-body'), 0.08, 0.18);
  const destination = { x: from.x, y: initial.y - 60 };
  expect(destination.y).toBeGreaterThan(0);
  expect(destination.y).toBeLessThan(initial.y);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // 손가락을 대는 순간의 영역에만 이벤트를 붙이면 이 첫 이동을 받지 못한다.
  await page.mouse.move(destination.x, destination.y, { steps: 1 });
  await page.mouse.up();
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  await page.waitForTimeout(500);
  expect((await sheet.boundingBox())!.height).toBeGreaterThan(initial.height + 150);
});

test('상세 시트 마우스: 본문 관성 스크롤 중 제목을 누르면 그 자리에서 멈춘다', async ({ page }) => {
  await openObjectSheet(page);
  const sheet = page.getByTestId('object-sheet');
  const body = page.getByTestId('sheet-body');
  await page.getByTestId('sheet-stage').click();
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  await page.waitForTimeout(500);
  const from = await pointIn(body, 0.08, 0.75);
  const header = await pointIn(page.getByTestId('sheet-name'));
  const maxTop = await body.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(maxTop).toBeGreaterThan(150);

  // 실행 부하로 놓기 전 속도 샘플이 만료되면 관성을 다시 만든다.
  // 움직이는 관성을 관찰한 뒤에는 재시도 없이 중단 여부를 검사한다.
  let observedInertia = false;
  for (let attempt = 0; attempt < 3 && !observedInertia; attempt++) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.wheel(0, 0);
    await body.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.mouse.down();
    await page.mouse.move(from.x, from.y - 80, { steps: 8 });
    const held = await scrollTopOf(page, 'sheet-body');
    await page.mouse.up();
    await page.waitForTimeout(35);
    const drifting = await scrollTopOf(page, 'sheet-body');
    if (drifting <= held + 2) continue;
    observedInertia = true;
    expect(drifting).toBeLessThan(maxTop - 30);

    await page.mouse.move(header.x, header.y);
    await page.mouse.down();
    const pressed = await scrollTopOf(page, 'sheet-body');
    await page.waitForTimeout(250);
    const stopped = await scrollTopOf(page, 'sheet-body');
    await page.mouse.up();
    expect(Math.abs(stopped - pressed)).toBeLessThan(2);
    await expect(sheet).toHaveAttribute('data-stage', 'full');
  }
  expect(observedInertia).toBe(true);
});

test('상세 시트 터치: 본문에서 펼치기 · 내용 스크롤 우선 · 맨 위에서 새로 당겨 접고 닫기', async ({
  page,
}) => {
  await openObjectSheet(page);
  const cdp = await page.context().newCDPSession(page);
  const sheet = page.getByTestId('object-sheet');
  const body = page.getByTestId('sheet-body');
  const halfHeight = (await sheet.boundingBox())!.height;

  await touchSwipe(page, cdp, await pointIn(body, 0.08, 0.75), 0, -150);
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  expect((await sheet.boundingBox())!.height).toBeGreaterThan(halfHeight + 150);
  expect(await scrollTopOf(page, 'sheet-body')).toBeLessThan(2);

  await touchSwipe(page, cdp, await pointIn(body, 0.08, 0.8), 0, -230);
  expect(await scrollTopOf(page, 'sheet-body')).toBeGreaterThan(100);
  await expect(sheet).toHaveAttribute('data-stage', 'full');

  // 내용 중간에서 시작한 아래 스크롤이 맨 위에 닿아도 같은 동작으로 시트가 접히지 않는다.
  await body.evaluate((el) => {
    el.scrollTop = 90;
  });
  await touchSwipe(page, cdp, await pointIn(body, 0.08, 0.18), 0, 230);
  expect(await scrollTopOf(page, 'sheet-body')).toBeLessThan(2);
  await expect(sheet).toHaveAttribute('data-stage', 'full');

  await touchSwipe(page, cdp, await pointIn(body, 0.08, 0.18), 0, 120);
  await expect(sheet).toHaveAttribute('data-stage', 'half');
  await touchSwipe(page, cdp, await pointIn(body, 0.08, 0.18), 0, 120);
  await expect(sheet).toHaveCount(0);
  await cdp.detach();
});

test('상세 시트: 버튼 탭은 유지하고 버튼에서 시작한 드래그는 클릭을 막는다 · 가로 액션 스크롤', async ({
  page,
}) => {
  await openObjectSheet(page);
  const sheet = page.getByTestId('object-sheet');
  const bookmark = page.getByTestId('sheet-bookmark');
  const cdp = await page.context().newCDPSession(page);

  await bookmark.tap();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await touchSwipe(page, cdp, await pointIn(bookmark), 0, -150);
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await bookmark.tap();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');

  // 버튼 행은 가로로 계속 움직이며, 세로 시트 제스처로 잘못 해석하지 않는다.
  const actions = page.getByTestId('sheet-show-in-sky').locator('..');
  expect(await actions.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(100);
  await touchSwipe(page, cdp, await pointIn(actions, 0.85), -220, 0);
  expect(await actions.evaluate((el) => el.scrollLeft)).toBeGreaterThan(80);
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  await expect(page.getByTestId('observation-form')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/sky/);

  // 키보드로도 기존 펼치기/접기 버튼을 사용할 수 있다.
  await page.getByTestId('sheet-stage').focus();
  await page.keyboard.press('Enter');
  await expect(sheet).toHaveAttribute('data-stage', 'half');
  await cdp.detach();
});

test('상세 시트 터치: 취소와 두 손가락 전환은 펼치기나 닫기로 확정하지 않는다', async ({
  page,
}) => {
  await openObjectSheet(page);
  const cdp = await page.context().newCDPSession(page);
  const sheet = page.getByTestId('object-sheet');
  const body = page.getByTestId('sheet-body');
  const halfHeight = (await sheet.boundingBox())!.height;

  await touchSwipe(page, cdp, await pointIn(body, 0.25, 0.75), 0, -150, 'touchCancel');
  await expect(sheet).toHaveAttribute('data-stage', 'half');
  expect((await sheet.boundingBox())!.height).toBeCloseTo(halfHeight, 0);
  await touchSwipe(page, cdp, await pointIn(body, 0.25, 0.18), 0, 120, 'touchCancel');
  await expect(sheet).toHaveAttribute('data-stage', 'half');
  expect((await sheet.boundingBox())!.height).toBeCloseTo(halfHeight, 0);

  const from = await pointIn(body, 0.25, 0.75);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...from, id: 1 }],
  });
  for (let i = 1; i <= 5; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x, y: from.y - i * 20, id: 1 }],
    });
    await page.waitForTimeout(20);
  }
  // 한 손가락으로 충분히 당긴 뒤 둘째 손가락을 얹어도 직전 드래그를 확정하지 않는다.
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: from.x, y: from.y - 100, id: 1 },
      { x: from.x + 80, y: from.y - 100, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: from.x, y: from.y - 120, id: 1 },
      { x: from.x + 80, y: from.y - 120, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(500);
  await expect(sheet).toHaveAttribute('data-stage', 'half');
  expect((await sheet.boundingBox())!.height).toBeCloseTo(halfHeight, 0);

  // 취소 뒤 다음 한 손가락 제스처도 정상적으로 시작한다.
  await touchSwipe(page, cdp, await pointIn(body, 0.08, 0.75), 0, -150);
  await expect(sheet).toHaveAttribute('data-stage', 'full');
  await cdp.detach();
});
