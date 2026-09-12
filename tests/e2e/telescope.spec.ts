import { expect, test, type Page } from '@playwright/test';
const T = '2026-09-06T12:00:00Z';
test.use({ serviceWorkers: 'block' });
test('기본 쌍안경 시야 7.5° 원은 10° 화면의 투영 크기 ±2%이며 끄면 사라진다', async ({ page }) => {
  await page.goto('#/sky?t=' + T + '&alt=35&az=180&fov=10');
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByTestId('open-layers').click();
  await page.locator('#layer-fovRings').click();
  await page.getByTestId('close-layers').click();
  const canvas = page.getByTestId('fov-overlay');
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () =>
      canvas.evaluate((el) => {
        const c = el as HTMLCanvasElement,
          ctx = c.getContext('2d')!;
        const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
        let left = c.width,
          right = 0;
        for (let y = Math.floor(c.height / 2) - 12; y <= Math.floor(c.height / 2) + 12; y++)
          for (let x = 0; x < c.width; x++) {
            if (pixels[(y * c.width + x) * 4 + 3]! > 30) {
              left = Math.min(left, x);
              right = Math.max(right, x);
            }
          }
        const expected =
          (Math.min(c.width, c.height) * Math.tan((3.75 * Math.PI) / 180)) /
          Math.tan((5 * Math.PI) / 180);
        return Math.abs((right - left + 1) / expected - 1);
      }),
    )
    .toBeLessThan(0.02);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/telescope-fov.png' });
  await page.getByTestId('open-layers').click();
  await page.locator('#layer-fovRings').click();
  await page.getByTestId('close-layers').click();
  await expect(canvas).toBeHidden();
});
async function setup(page: Page) {
  await page.clock.setFixedTime(new Date(T));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'RelativeOrientationSensor', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      value: () => Promise.resolve('granted'),
      configurable: true,
    });
  });
  await page.goto('#/sky?t=' + T);
  // 로딩 표식이 아직 마운트되기 전에도 count=0이므로 실제 하늘과 좌표 래퍼 준비를 먼저 확인한다.
  await expect(page.getByTestId('sky-view')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const w = window as Window & {
          __skylogAstro?: { eqjToAltAzSlow?: unknown };
        };
        return typeof w.__skylogAstro?.eqjToAltAzSlow;
      }),
    )
    .toBe('function');
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
}
test('GoTo 망원경에서 쌍안경으로 바꾸면 센서 방향 안내를 제공한다', async ({ page }) => {
  await setup(page);
  await page.goto('#/equipment');
  await page
    .locator('select')
    .filter({ has: page.locator('option[value="goto"]') })
    .selectOption('goto');
  await page
    .locator('select')
    .filter({ has: page.locator('option[value="binoculars"]') })
    .selectOption('binoculars');
  await page.getByTestId('equipment-save').click();
  await expect(page.getByTestId('equipment-save')).toContainText('저장했어요');
  await page.goto('#/telescope?target=dso%3AM13');
  await page.getByTestId('guide-accept').click();
  await expect(page.getByTestId('guide-sensor')).toBeVisible();
  await expect(page.getByTestId('pointing-guide')).toHaveCount(0);
});
async function pointAt(page: Page, id: string) {
  await page.evaluate(
    async ({ id, T }) => {
      type GuideTest = {
        __skylogAstro: {
          eqjToAltAzSlow: (
            date: Date,
            site: { lat: number; lon: number; elevation: number },
            ra: number,
            dec: number,
            refraction: 'normal',
          ) => { altDeg: number; azDeg: number };
        };
        __pose?: { alpha: number; beta: number };
        __poseTimer?: number;
      };
      const w = window as unknown as GuideTest;
      const stars = (await fetch('data/stars-bright.v1.json').then((r) => r.json())) as {
        id: string;
        ra: number;
        dec: number;
      }[];
      const dsos = (await fetch('data/dso.v1.json').then((r) => r.json())) as {
        id: string;
        ra: number;
        dec: number;
      }[];
      const object = [...stars, ...dsos].find((s) => s.id === id)!;
      const aa = w.__skylogAstro.eqjToAltAzSlow(
        new Date(T),
        { lat: 36.37, lon: 127.36, elevation: 70 },
        object.ra,
        object.dec,
        'normal',
      );
      w.__pose = { alpha: (360 - aa.azDeg + 360) % 360, beta: aa.altDeg };
      if (!w.__poseTimer)
        w.__poseTimer = window.setInterval(() => {
          const p = w.__pose!;
          window.dispatchEvent(
            new DeviceOrientationEvent('deviceorientation', {
              alpha: p.alpha,
              beta: p.beta,
              gamma: 0,
              absolute: false,
            }),
          );
        }, 35);
    },
    { id, T },
  );
  await page.waitForTimeout(500);
}
test('장비 저장 → 폰 윗변 두 별 정렬 → 목표 안내·차트·스타호핑·업적', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  await page.goto('#/equipment');
  await page.getByTestId('equipment-focalLengthMm').fill('500');
  await page.getByTestId('equipment-eyepieceMm').fill('25');
  await expect(page.getByTestId('equipment-calculation')).toContainText('20× · 2.60°');
  await page.getByTestId('equipment-save').click();
  await expect(page.getByTestId('equipment-save')).toContainText('저장했어요');
  await page.screenshot({ path: 'tests/e2e/__screenshots__/telescope-equipment.png' });
  await page.goto('#/telescope?target=dso%3AM13');
  await page.getByTestId('guide-accept').click();
  await expect(page.getByTestId('direction-panel')).toContainText('별로 더 정밀하게 맞추기');
  await expect(page.getByTestId('guide-sky-canvas')).toBeVisible();
  await pointAt(page, 'star:HIP97649');
  await page.getByTestId('direction-align').click();
  await expect(page.getByTestId('alignment-wizard')).toBeVisible();
  const options = await page
    .getByTestId('alignment-star')
    .locator('option')
    .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
  expect(options).toContain('star:HIP97649');
  await page.getByTestId('alignment-star').selectOption('star:HIP97649');
  await pointAt(page, 'star:HIP97649');
  await page.getByTestId('alignment-capture').click();
  await expect(page.getByTestId('alignment-residual')).toContainText('0.0°');
  // 알타이르와 고도·방향이 다른 데네브. 기기 물리 +Y를 해당 별에 맞춘다.
  expect(options).toContain('star:HIP102098');
  await page.getByTestId('alignment-star').selectOption('star:HIP102098');
  await pointAt(page, 'star:HIP102098');
  await page.getByTestId('alignment-capture').click();
  await expect(page.getByRole('button', { name: '세 번째 별로 확인하기' })).toBeVisible();
  await expect(page.getByTestId('alignment-residual')).toContainText('0.0°');
  await page.getByTestId('alignment-done').click();
  await expect(page.getByTestId('guide-arrows')).toBeInViewport();
  await expect(page.getByTestId('direction-horizontal')).toContainText(/왼쪽|오른쪽/);
  await expect(page.getByTestId('direction-vertical')).toContainText(/위로|아래로/);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/telescope-direction.png' });
  await pointAt(page, 'dso:M13');
  await expect(page.getByTestId('direction-action')).toContainText('목표 근처');
  await expect(page.getByTestId('guide-chart')).toHaveCount(0);
  await page.getByRole('button', { name: '시야 차트로 확인하기' }).click();
  await expect(page.getByTestId('guide-chart')).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/telescope-aligned.png' });
  await page.getByTestId('guide-view-hop').click();
  await expect(page.getByTestId('starhop')).toBeVisible();
  await page.getByRole('button', { name: '출발 별을 시야 중앙에 놓았어요' }).click();
  const steps = page.getByTestId('hop-step');
  expect(await steps.count()).toBeGreaterThanOrEqual(1);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/starhop-m13.png' });
  for (let i = 0; i < (await steps.count()); i++) await steps.nth(i).getByRole('button').click();
  await page.getByTestId('hop-finish').click();
  await expect(page.getByTestId('hop-finish')).toContainText('업적');
  await page.goto('#/learn?section=achievements');
  await expect(page.getByTestId('learn-screen')).toBeVisible();
  for (const title of ['첫 별길', '두 별 정렬']) {
    await expect(page.getByRole('button', { name: new RegExp(`${title}.*획득`) })).toBeVisible();
  }
  await page.goto('#/backup');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-json').click(),
  ]);
  const { readFileSync } = await import('node:fs');
  const backup = JSON.parse(readFileSync((await download.path())!, 'utf8')) as {
    data: { progress: { key: string; value: { type?: string } }[] };
  };
  const events = backup.data.progress
    .filter((r) => r.key.startsWith('learn.event:'))
    .map((r) => r.value.type);
  expect(events).toEqual(expect.arrayContaining(['align1', 'align2', 'starhop', 'fovSetup']));
  expect(errors).toEqual([]);
});
test('태양 차단·센서 없는 차트·360px 영어와 야간 화면', async ({ page }) => {
  await setup(page);
  await page.goto('#/telescope?target=sun');
  await expect(page.getByTestId('sun-guard')).toBeVisible();
  await page.goto('#/telescope?target=dso%3AM31');
  // 같은 라우트의 쿼리가 바뀌어도 새 목표로 갱신된다.
  await page.getByTestId('guide-accept').click();
  await page.getByTestId('guide-view-finder').click();
  await expect(page.getByTestId('finder-chart')).toBeVisible();
  const chart = page.getByTestId('finder-chart');
  await chart.scrollIntoViewIfNeeded();
  const b = (await chart.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2 + 20, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: '중앙으로 돌아가기' })).toBeVisible();
  await expect(page.getByTestId('guide-status')).toContainText('미리보기');
  await page.getByText('장비·사용 방법', { exact: true }).click();
  await page.getByRole('button', { name: /야간 모드/ }).click();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/telescope-night.png' });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/telescope?target=dso%3AM31');
  await expect(page.getByTestId('guide-intro')).toContainText('Start without aligning a star');
  await page.getByTestId('guide-accept').click();
  await page.getByTestId('guide-view-finder').click();
  await expect(page.getByTestId('finder-chart')).toBeVisible();
  await page.getByTestId('finder-chart').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/telescope-en.png' });
});

test('나침반으로 바로 안내하며 별 보정 없이 실제 밤하늘을 보여 준다', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    Object.defineProperty(window, 'ondeviceorientationabsolute', {
      value: null,
      configurable: true,
    });
    type CompassWindow = Window & { __automaticPose?: { alpha: number; beta: number } };
    const w = window as CompassWindow;
    w.__automaticPose = { alpha: 200, beta: 40 };
    window.setInterval(() => {
      const pose = w.__automaticPose!;
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientationabsolute', {
          ...pose,
          gamma: 0,
          absolute: true,
        }),
      );
    }, 35);
  });
  await page.goto('#/telescope?target=dso%3AM13');
  await page.getByTestId('guide-accept').click();
  await expect(page.getByTestId('guide-arrows')).toBeVisible();
  await expect(page.getByTestId('direction-panel')).toContainText('나침반으로 잡은 대략 방향');
  await expect(page.getByTestId('alignment-wizard')).toHaveCount(0);
  await expect(page.getByTestId('guide-sky-canvas')).toBeVisible();
  await expect.poll(() => page.getByTestId('guide-sky-labels').innerText()).not.toBe('');
  const before = await page.getByTestId('direction-horizontal').innerText();
  await page.evaluate(() => {
    (window as Window & { __automaticPose?: { alpha: number; beta: number } }).__automaticPose = {
      alpha: 240,
      beta: 30,
    };
  });
  await expect(page.getByTestId('direction-horizontal')).not.toHaveText(before);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/telescope-automatic.png' });
  await page.getByTestId('guide-view-finder').click();
  await expect(page.getByTestId('guide-status')).toContainText('대략 방향');
  await page.goto('#/backup');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-json').click(),
  ]);
  const { readFileSync } = await import('node:fs');
  const backup = JSON.parse(readFileSync((await download.path())!, 'utf8')) as {
    data: { progress: { value: { type?: string } }[] };
  };
  expect(
    backup.data.progress.some((row) => row.value.type === 'align1' || row.value.type === 'align2'),
  ).toBe(false);
});

test('상대 센서만 있으면 임의 방위 화살표 대신 목표 주변 하늘을 유지한다', async ({ page }) => {
  await setup(page);
  await pointAt(page, 'star:HIP97649');
  await page.goto('#/telescope?target=dso%3AM13');
  await page.getByTestId('guide-accept').click();
  await expect(page.getByTestId('direction-panel')).toContainText('자동 방향을 확인하고 있어요', {
    timeout: 15000,
  });
  await expect(page.getByTestId('guide-sky-canvas')).toBeVisible();
  await expect.poll(() => page.getByTestId('guide-sky-labels').innerText()).not.toBe('');
  await expect(page.getByTestId('guide-arrows')).toHaveCount(0);
  await expect(page.getByTestId('alignment-wizard')).toHaveCount(0);
  await expect(page.getByTestId('direction-align')).toContainText('선택');
});

/** 저장 값만 읽지 않고 실제 시야원 캔버스 가운데에 그려진 지름을 확인한다. */
async function fovDiameterError(page: Page, fovDeg: number): Promise<number> {
  return page.getByTestId('fov-overlay').evaluate((el, fov) => {
    const c = el as HTMLCanvasElement;
    if (!c.width || !c.height) return Number.MAX_SAFE_INTEGER;
    const pixels = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let left = c.width,
      right = -1;
    for (let y = Math.floor(c.height / 2) - 12; y <= Math.floor(c.height / 2) + 12; y++)
      for (let x = 0; x < c.width; x++)
        if (pixels[(y * c.width + x) * 4 + 3]! > 30) {
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
    const actual = right < left ? 0 : right - left + 1;
    const expected =
      (Math.min(c.width, c.height) * Math.tan((fov * Math.PI) / 360)) /
      Math.tan((5 * Math.PI) / 180);
    return Math.abs(actual - expected);
  }, fovDeg);
}

test('두 장비 시야원을 개별로 켜고 끄며 전체 끄기와 새로고침에도 선택을 유지한다', async ({
  page,
}) => {
  await setup(page);
  await page.goto('#/sky?t=' + T + '&alt=35&az=180&fov=10');
  await page.getByTestId('open-layers').click();
  await page.locator('#layer-fovRings').click();
  const bino = page.locator('#fov-ring-binoculars');
  const scope = page.locator('#fov-ring-telescope');
  await expect(bino).toHaveAttribute('aria-checked', 'true');
  await expect(scope).toHaveAttribute('aria-checked', 'true');
  await expect(bino.locator('..')).toContainText('쌍안경 8×42');
  await expect(bino.locator('..')).toContainText('7.50°');
  await expect(scope.locator('..')).toContainText('SVBONY SV48P 102mm');
  await expect(scope.locator('..')).toContainText('1.96°');
  await expect(page.getByTestId('fov-ring-choices').getByText(/기본 예시/)).toHaveCount(2);
  await expect.poll(() => fovDiameterError(page, 7.5)).toBeLessThan(6);

  await bino.click();
  await expect.poll(() => fovDiameterError(page, (52 * 25) / 663)).toBeLessThan(6);
  await page.locator('#layer-fovRings').click();
  await expect(page.getByTestId('fov-overlay')).toBeHidden();
  await page.locator('#layer-fovRings').click();
  await expect(bino).toHaveAttribute('aria-checked', 'false');
  await expect(scope).toHaveAttribute('aria-checked', 'true');
  await scope.click();
  await expect.poll(() => fovDiameterError(page, 0)).toBe(0);
  await bino.click();
  await expect.poll(() => fovDiameterError(page, 7.5)).toBeLessThan(6);
  await page.getByTestId('close-layers').click();
  await page.reload();
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByTestId('open-layers').click();
  await expect(bino).toHaveAttribute('aria-checked', 'true');
  await expect(scope).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => fovDiameterError(page, 7.5)).toBeLessThan(6);
});

test('기본 장비 예시를 편집·저장하면 표시와 실제 두 시야원 크기가 갱신된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setup(page);
  await page.goto('#/equipment');
  for (const [field, value] of [
    ['apertureMm', '102'],
    ['focalLengthMm', '663'],
    ['eyepieceMm', '25'],
    ['afovDeg', '52'],
    ['binocularMag', '8'],
    ['binocularAperture', '42'],
    ['binocularFov', '7.5'],
  ])
    await expect(page.getByTestId('equipment-' + field)).toHaveValue(value!);
  const calculated = page.getByTestId('equipment-fov-rings');
  await expect(calculated).toContainText('7.50°');
  await expect(calculated).toContainText('1.96°');
  await expect(calculated.getByText('기본 예시', { exact: true })).toHaveCount(2);

  await page.getByTestId('equipment-focalLengthMm').fill('800');
  await page.getByTestId('equipment-eyepieceMm').fill('10');
  await page.getByTestId('equipment-afovDeg').fill('68');
  await page.getByTestId('equipment-binocularFov').fill('6');
  await expect(calculated).toContainText('0.85°');
  await expect(calculated).toContainText('6.00°');
  await expect(calculated.getByText('기본 예시', { exact: true })).toHaveCount(0);
  await page.getByTestId('equipment-save').click();
  await expect(page.getByTestId('equipment-save')).toContainText('저장했어요');
  await page.reload();
  await expect(page.getByTestId('equipment-eyepieceMm')).toHaveValue('10');
  await expect(page.getByTestId('equipment-binocularFov')).toHaveValue('6');
  await expect(calculated.getByText('기본 예시', { exact: true })).toHaveCount(0);
  await page.goto('#/sky?t=' + T + '&alt=35&az=180&fov=10');
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByTestId('open-layers').click();
  const choices = page.getByTestId('fov-ring-choices');
  await expect(choices).toContainText('6.00°');
  await expect(choices).toContainText('0.85°');
  await expect(choices.getByText(/기본 예시/)).toHaveCount(0);
  await expect.poll(() => fovDiameterError(page, 6)).toBeLessThan(6);
  await page.locator('#fov-ring-binoculars').click();
  await expect.poll(() => fovDiameterError(page, 0.85)).toBeLessThan(6);
  expect(errors).toEqual([]);
});
