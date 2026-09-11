import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import packageInfo from '../../package.json' with { type: 'json' };

test.use({ serviceWorkers: 'allow' });

async function storedProfile(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const request = indexedDB.open('skylog');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const row = db
            .transaction('progress')
            .objectStore('progress')
            .index('key')
            .get('personal.profile');
          row.onsuccess = () => {
            resolve(row.result?.value ?? null);
            db.close();
          };
          row.onerror = () => {
            reject(row.error);
            db.close();
          };
        };
      }),
  );
}

test('실제 PWA 캐시에서 지평선 배치를 이어서 저장하고 첫 하늘 렌더와 재실행을 오프라인으로 완료한다', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.setTimeout(90_000);
  const origin = new URL(baseURL!).origin;
  const errors: string[] = [];
  const externalRequests: string[] = [];
  const writes: string[] = [];
  const cachedResponses: { path: string; status: number; fromServiceWorker: boolean }[] = [];
  let offline = false;
  page.on('pageerror', (error) => errors.push(error.message));
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (url.origin !== origin)
      externalRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
      writes.push(`${request.method()} ${url.origin}${url.pathname}`);
  });
  page.on('response', (response) => {
    if (!offline) return;
    const url = new URL(response.url());
    if (['http:', 'https:'].includes(url.protocol))
      cachedResponses.push({
        path: url.pathname,
        status: response.status(),
        fromServiceWorker: response.fromServiceWorker(),
      });
  });
  // 외부 서비스와 계정에는 접근하지 않는다. 앱의 실제 서비스워커·IndexedDB는 그대로 쓴다.
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  );
  try {
    await page.goto('#/settings');
    await expect(page.getByText(`버전 ${packageInfo.version}`, { exact: true })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return (
        registration?.active?.state === 'activated' &&
        navigator.serviceWorker.controller?.state === 'activated'
      );
    });
    const worker = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return { scriptURL: registration.active?.scriptURL, state: registration.active?.state };
    });
    expect(new URL(worker.scriptURL!).origin).toBe(origin);
    expect(worker.state).toBe('activated');

    await page.goto('#/profile');
    await page.getByRole('button', { name: '지평선 꾸미기', exact: true }).click();
    await page.getByRole('button', { name: '1번 자리', exact: true }).click();
    await page.getByRole('button', { name: '나무 벤치', exact: true }).click();
    await expect
      .poll(() => storedProfile(page))
      .toMatchObject({
        slots: ['bench', null, null, null, null],
        ground: 'meadow',
        sceneryEnabled: true,
        sceneryScale: 'small',
      });

    offline = true;
    await context.setOffline(true);
    const firstReload = await page.reload();
    expect(firstReload?.status()).toBe(200);
    expect(firstReload?.fromServiceWorker()).toBe(true);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    await expect(page.getByTestId('horizon-preview')).toBeVisible();
    await page.getByRole('button', { name: '지평선 꾸미기', exact: true }).click();
    await page.getByRole('button', { name: '2번 자리', exact: true }).click();
    await page.getByRole('button', { name: '나무 벤치', exact: true }).click();
    await expect
      .poll(() => storedProfile(page))
      .toMatchObject({ slots: [null, 'bench', null, null, null] });
    await page.getByRole('button', { name: '표시', exact: true }).click();
    await page.getByRole('button', { name: '조금 크게', exact: true }).click();
    await expect.poll(() => storedProfile(page)).toMatchObject({ sceneryScale: 'medium' });
    await page.getByTestId('horizon-preview').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('offline-horizon-editor.png') });

    // 온라인에서는 열지 않은 하늘 화면과 지평선 렌더러도 캐시에서 시작한다.
    await page.getByRole('button', { name: '하늘에서 보기', exact: true }).click();
    await expect(page).toHaveURL(/#\/sky$/);
    await page.goto('#/sky?alt=12&az=144&fov=70&t=2026-09-11T12:00:00Z&rate=0&preserve=1');
    await expect(page.getByTestId('sky-loading')).toBeHidden();
    const canvas = page.getByTestId('sky-canvas');
    await expect(canvas).toBeVisible();
    const contextState = await canvas.evaluate((element) => {
      const surface = element as HTMLCanvasElement;
      const gl = surface.getContext('webgl2') ?? surface.getContext('webgl');
      return {
        width: surface.width,
        height: surface.height,
        webgl: !!gl,
        lost: gl?.isContextLost(),
      };
    });
    expect(contextState.webgl).toBe(true);
    expect(contextState.lost).toBe(false);
    expect(contextState.width).toBeGreaterThan(300);
    const skyImage = await canvas.screenshot({
      path: testInfo.outputPath('offline-sky-horizon.png'),
    });
    const raster = await sharp(skyImage).removeAlpha().raw().toBuffer();
    const colors = new Set<string>();
    for (let i = 0; i < raster.length; i += 27)
      colors.add(`${raster[i]},${raster[i + 1]},${raster[i + 2]}`);
    expect(colors.size).toBeGreaterThan(40);

    const secondReload = await page.reload();
    expect(secondReload?.status()).toBe(200);
    expect(secondReload?.fromServiceWorker()).toBe(true);
    await expect(page.getByTestId('sky-loading')).toBeHidden();
    await expect(page.getByTestId('sky-canvas')).toBeVisible();
    await page.goto('#/profile');
    await page.getByRole('button', { name: '지평선 꾸미기', exact: true }).click();
    await page.getByRole('button', { name: '2번 자리', exact: true }).click();
    await expect(page.getByRole('button', { name: '나무 벤치', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const saved = await storedProfile(page);
    expect(saved).toMatchObject({
      slots: [null, 'bench', null, null, null],
      sceneryScale: 'medium',
      ground: 'meadow',
      sceneryEnabled: true,
    });
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    expect(
      cachedResponses.some(
        (response) =>
          response.path.endsWith('.js') && response.fromServiceWorker && response.status === 200,
      ),
    ).toBe(true);
    expect(externalRequests).toEqual([]);
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
    await testInfo.attach('offline-horizon-evidence', {
      body: JSON.stringify(
        {
          version: packageInfo.version,
          worker,
          contextState,
          renderedColorCount: colors.size,
          saved,
          cachedResponses,
          externalRequests,
          writes,
          errors,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  } finally {
    await context.setOffline(false);
  }
});
