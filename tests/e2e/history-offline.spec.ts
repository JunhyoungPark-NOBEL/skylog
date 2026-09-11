import { expect, test, type Page } from '@playwright/test';
import packageInfo from '../../package.json' with { type: 'json' };
import { HISTORY_LESSONS } from '../../src/learn/historyLessons';

test.use({ serviceWorkers: 'allow' });
const { version } = packageInfo;

const questId = 'eratosthenes-earth';
const questionId = 'eratosthenes-circumference';
const path = `#/learn?section=quiz&track=physics&quest=${questId}`;
const lesson = HISTORY_LESSONS[questionId]!;

async function storedProgress(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ key: string; value: unknown }[]>((resolve, reject) => {
        const open = indexedDB.open('skylog');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('progress').objectStore('progress').getAll();
          request.onsuccess = () => {
            resolve(request.result as { key: string; value: unknown }[]);
            db.close();
          };
          request.onerror = () => {
            reject(request.error);
            db.close();
          };
        };
      }),
  );
}

async function solvePreparation(page: Page, index: number) {
  const step = lesson.warmups[index]!;
  const section = page.getByTestId('history-preparation');
  await expect(section).toContainText(`${index + 1}/2`);
  const rightIndex = step.choices.findIndex((choice) => choice.id === step.answerId);
  await section.getByRole('radio').nth(rightIndex).check();
  await section.getByRole('button', { name: '생각 확인하기', exact: true }).click();
  await expect(page.getByTestId('preparation-feedback')).toContainText(
    '맞아요. 이렇게 이어집니다.',
  );
}

test('실제 PWA 캐시에서 선행 문제·본 문제 저장을 이어가고 새 도해와 수식 글꼴을 오프라인으로 연다', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.setTimeout(90_000);
  const origin = new URL(baseURL!).origin;
  const errors: string[] = [];
  const externalRequests: string[] = [];
  const writes: string[] = [];
  const failedFonts: string[] = [];
  const offlineResponses: { path: string; status: number; fromServiceWorker: boolean }[] = [];
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
  page.on('requestfailed', (request) => {
    if (/\.(?:woff2?|ttf)(?:\?|$)/i.test(request.url())) failedFonts.push(request.url());
  });
  page.on('response', (response) => {
    if (!offline) return;
    const url = new URL(response.url());
    if (/\.(?:js|css|woff2?)(?:$)/i.test(url.pathname))
      offlineResponses.push({
        path: url.pathname,
        status: response.status(),
        fromServiceWorker: response.fromServiceWorker(),
      });
  });
  // 실제 공공 서버를 호출하지 않는다. 앱·서비스워커·글꼴은 로컬 빌드 파일로만 읽는다.
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === origin ? route.continue() : route.abort('blockedbyclient');
  });

  try {
    await page.goto('#/settings');
    await expect(page.getByText(`버전 ${version}`, { exact: true })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    // ready는 active 슬롯이 채워지면 resolve될 수 있다. 실제 활성화·페이지 제어까지 기다린다.
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
    expect(worker.state).toBe('activated');
    expect(new URL(worker.scriptURL!).origin).toBe(origin);

    await page.goto(path);
    await expect(page.getByTestId('history-preparation')).toBeVisible();
    await solvePreparation(page, 0);
    await page.getByRole('button', { name: /다음 준비 문제/ }).click();
    const before = await storedProgress(page);
    const preparationKey = `learn.preparation:${questionId}`;
    expect(before.find((row) => row.key === preparationKey)?.value).toEqual({
      version: 1,
      answers: { [lesson.warmups[0]!.id]: [lesson.warmups[0]!.answerId] },
    });
    expect(before.filter((row) => row.key.startsWith('learn.history:'))).toEqual([]);

    const cachedFonts = await page.evaluate(async () => {
      const files: { url: string; bytes: number }[] = [];
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        for (const request of await cache.keys()) {
          if (!/\/KaTeX_[^/]+\.woff2$/.test(new URL(request.url).pathname)) continue;
          const response = await cache.match(request);
          files.push({ url: request.url, bytes: (await response!.arrayBuffer()).byteLength });
        }
      }
      return files;
    });
    expect(cachedFonts.length).toBeGreaterThan(10);
    expect(
      cachedFonts.every((font) => new URL(font.url).origin === origin && font.bytes > 100),
    ).toBe(true);

    offline = true;
    await context.setOffline(true);
    const firstOfflineDocument = await page.reload();
    expect(firstOfflineDocument?.status()).toBe(200);
    expect(firstOfflineDocument?.fromServiceWorker()).toBe(true);
    await expect(page.getByTestId('history-preparation')).toContainText('2/2');
    await expect(page.getByTestId('history-main-content')).toBeHidden();
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    await solvePreparation(page, 1);
    await page.getByRole('button', { name: /이제 본 문제 풀기/ }).click();
    await expect(page.getByTestId('history-main-content')).toBeVisible();
    await expect(page.getByTestId('history-result')).toHaveCount(0);
    await page.getByTestId('history-numeric').fill('4e4');
    const note = '두 도시의 호와 중심각을 같은 비율로 연결했다.';
    await page.getByRole('textbox', { name: /나의 풀이 메모/ }).fill(note);
    await page.getByTestId('history-hint').click();
    await expect(page.getByTestId('history-hint')).toContainText('2 / 3');
    const saved = await storedProgress(page);
    expect(saved.find((row) => row.key === preparationKey)?.value).toEqual({
      version: 1,
      answers: Object.fromEntries(lesson.warmups.map((step) => [step.id, [step.answerId]])),
    });
    expect(
      saved.find((row) => row.key === `learn.history:${questId}:${questionId}`)?.value,
    ).toMatchObject({
      input: '4e4',
      note,
      hints: 1,
      attempts: [],
    });
    const secondOfflineDocument = await page.reload();
    expect(secondOfflineDocument?.fromServiceWorker()).toBe(true);
    await expect(page.getByTestId('history-numeric')).toHaveValue('4e4');
    await expect(page.getByRole('textbox', { name: /나의 풀이 메모/ })).toHaveValue(note);
    await expect(page.getByTestId('history-hint')).toContainText('2 / 3');
    await expect(page.getByTestId('history-preparation')).toHaveCount(0);
    await expect(page.getByTestId('history-result')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('offline-history-resumed.png') });

    // 이 context에서 한 번도 열지 않은 이야기다. 온라인에서 이 도해·문제를 미리 열지 않는다.
    expect(saved.some((row) => row.key.includes('kepler'))).toBe(false);
    await page.getByRole('button', { name: /이야기 목록/ }).click();
    await page.getByTestId('history-quest-kepler-orbits').click();
    const preparation = page.getByTestId('history-preparation');
    await expect(preparation).toContainText('1/2');
    await expect(preparation.locator('svg[role="img"]')).toBeVisible();
    await preparation.getByRole('button', { name: /본 문제로/ }).click();
    const main = page.getByTestId('history-main-content');
    await main.getByText('그림과 풀이의 연결 고리', { exact: true }).click();
    await expect(main.locator('svg[role="img"]')).toBeVisible();
    await expect(main.getByTestId('history-math').first()).toBeVisible();
    expect(await main.locator('.katex math').count()).toBeGreaterThan(0);
    await expect(page.getByTestId('history-math-fallback')).toHaveCount(0);
    const loadedFonts = await page.evaluate(async () => {
      await document.fonts.ready;
      const normal = await document.fonts.load('16px KaTeX_Main', '123');
      const italic = await document.fonts.load('italic 16px KaTeX_Math', 'x');
      await document.fonts.ready;
      return {
        status: document.fonts.status,
        main: normal.map((font) => ({ family: font.family, status: font.status })),
        math: italic.map((font) => ({ family: font.family, status: font.status })),
      };
    });
    expect(loadedFonts.status).toBe('loaded');
    expect(loadedFonts.main.length).toBeGreaterThan(0);
    expect(loadedFonts.math.length).toBeGreaterThan(0);
    expect(
      [...loadedFonts.main, ...loadedFonts.math].every((font) => font.status === 'loaded'),
    ).toBe(true);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await main.getByTestId('history-math').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('offline-unvisited-kepler.png') });
    expect(
      offlineResponses.some(
        (response) => response.path.endsWith('.js') && response.fromServiceWorker,
      ),
    ).toBe(true);
    expect(externalRequests).toEqual([]);
    expect(writes).toEqual([]);
    expect(failedFonts).toEqual([]);
    expect(errors).toEqual([]);
    await testInfo.attach('offline-history-evidence', {
      body: JSON.stringify(
        {
          version,
          worker,
          cachedFonts,
          loadedFonts,
          offlineResponses,
          externalRequests,
          writes,
          failedFonts,
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
