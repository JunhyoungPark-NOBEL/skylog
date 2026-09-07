import { expect, test, type Page } from '@playwright/test';

/**
 * D-022 스크롤 e2e: 탭 화면·상세 시트를 마우스로 잡아 끌면 스크롤되고(관성 포함), 끌다 놓은 자리의 버튼은 눌리지 않는다.
 * 터치는 브라우저 네이티브 스크롤 그대로(CDP 터치 이벤트로 확인). 시각은 대전 2026-09-06 21:00 KST.
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

test('상세 시트 본문도 마우스로 끌어서 스크롤된다', async ({ page }) => {
  await openTonight(page);
  const rec = page.getByTestId('recommend-card');
  await rec.getByTestId('rec-group-now').click();
  await rec.locator('[data-object-id="planet:saturn"] [data-testid="rec-open"]').click();
  await expect(page.getByTestId('object-sheet')).toBeVisible();
  await expect(page.getByTestId('sheet-altaz')).toBeVisible({ timeout: 15_000 });
  const body = page.getByTestId('sheet-body');
  const box = (await body.boundingBox())!;
  const x = box.x + box.width / 2;
  const y0 = box.y + box.height - 20;
  await page.mouse.move(x, y0);
  await page.mouse.down();
  await page.mouse.move(x, y0 - 150, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect(await scrollTopOf(page, 'sheet-body')).toBeGreaterThan(80);
  // 시트 자체는 닫히거나 단계가 바뀌지 않는다(손잡이만 시트를 끈다)
  await expect(page.getByTestId('object-sheet')).toHaveAttribute('data-stage', 'half');
});
