import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block', viewport: { width: 412, height: 915 } });
const T = '2026-09-06T12:00:00Z';

test('망원경 안내는 같은 하늘 캔버스에서 폰 윗변을 추적하고 시야 원을 표시한다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date(T));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'ondeviceorientationabsolute', {
      value: null,
      configurable: true,
    });
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      value: () => Promise.resolve('granted'),
      configurable: true,
    });
    setInterval(
      () =>
        window.dispatchEvent(
          new DeviceOrientationEvent('deviceorientationabsolute', {
            alpha: 200,
            beta: 40,
            gamma: 0,
            absolute: true,
          }),
        ),
      17,
    );
  });
  await page.goto('#/sky?scope=dso%3AM13');
  await page.getByTestId('guide-sensor').click();
  await expect(page.getByTestId('scope-directions')).toBeVisible();
  await expect(page.getByTestId('sky-canvas')).toHaveCount(1);
  await expect(page.getByTestId('guide-sky-canvas')).toHaveCount(0);
  await expect(page.getByTestId('direction-panel')).toHaveCount(0);
  await expect(page.getByTestId('guide-view-hop')).toHaveCount(0);
  await expect(page.getByTestId('tab-sky')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('time-toggle')).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as unknown as {
          __skylogScene: { controller: { getView(): { altDeg: number } } };
        };
        return Math.abs(w.__skylogScene.controller.getView().altDeg - 40);
      }),
    )
    .toBeLessThan(0.3);
  const ring = page.getByTestId('fov-overlay');
  await expect(ring).toBeVisible();
  expect(
    await ring.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      return data.filter((v, i) => i % 4 === 3 && v > 30).length;
    }),
  ).toBeGreaterThan(200);
  await page.mouse.move(206, 410);
  await page.mouse.down();
  await page.mouse.move(266, 440, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('guide-sensor')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('ar-resume')).toHaveCount(0);
  await page.getByTestId('guide-sensor').click();
  await expect(page.getByTestId('guide-sensor')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build26-main-scope.png' });
  await page.getByTestId('scope-options').click();
  await page.getByTestId('scope-close').click();
  await expect(page.getByTestId('telescope-sky-guide')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('스타호핑은 한 구간씩 확인하고 하늘 왕복·새로고침에서도 확인 위치를 복원한다', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(T));
  await page.goto('#/telescope?view=hop&course=andromeda-chain&target=dso%3AM31');
  await expect(page.getByTestId('hop-step')).toHaveCount(1);
  await expect(page.getByTestId('hop-finish')).toHaveCount(0);
  await page.getByTestId('hop-confirm').click();
  await expect(page.getByTestId('hop-step')).toContainText('뮤별');
  await page.getByTestId('hop-on-sky').click();
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await page.getByTestId('hop-return').click();
  await expect(page.getByTestId('hop-step')).toContainText('뮤별');
  await page.reload();
  await expect(page.getByTestId('hop-step')).toContainText('뮤별');
  await page.getByTestId('hop-confirm').click();
  await expect(page.getByTestId('hop-step')).toContainText('뉴별');
  await page.getByTestId('hop-back').click();
  await expect(page.getByTestId('hop-step')).toContainText('뮤별');
  await page.getByTestId('hop-overview').click();
  await expect(page.getByTestId('finder-chart')).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/build26-hop-landmarks.png' });
  await expect(page.getByTestId('hop-finish')).toHaveCount(0);
});
