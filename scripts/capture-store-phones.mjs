// Render the existing build17 native bundle in isolated browser viewports.
// No product UI is replaced and no remote account or user data is accessed.
/* global document, innerWidth, indexedDB, crypto */
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
import { Buffer } from 'node:buffer';

const base = process.env.STORE_PREVIEW_URL || 'http://127.0.0.1:5181/';
const dir = 'docs/store-assets/launch-20260910';
await fs.mkdir(`${dir}/raw-phone`, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const evidence = {
  base,
  source: '830c974bebeab0e873925ba58b0bd8a01798de6e',
  physicalDevice: false,
  sampleRecords: true,
  errors: [],
  shots: [],
};
try {
  const context = await browser.newContext({
    viewport: { width: 432, height: 768 },
    deviceScaleFactor: 2.5,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    serviceWorkers: 'block',
  });
  // Forecast is optional. Capture actual offline fallback instead of inventing weather.
  await context.route('https://**/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    }),
  );
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-09-10T12:00:00Z'));
  page.on('pageerror', (e) => evidence.errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') evidence.errors.push(m.text());
  });
  async function shot(name) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error(`Horizontal overflow: ${name}`);
    await page.screenshot({ path: `${dir}/raw-phone/${name}.png` });
    evidence.shots.push({ name, text: await page.locator('body').innerText() });
    console.log(`Captured ${name}`);
  }
  await page.goto(`${base}#/sky?t=2026-09-10T12:00:00Z&preserve=1&alt=35&az=180&fov=95`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('sky-canvas')).toBeVisible({ timeout: 45000 });
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 45000 });
  await shot('01-sky');
  await page.getByTestId('tab-tonight').click();
  await expect(page.getByTestId('tonight-screen')).toBeVisible();
  await page.waitForTimeout(2000);
  await shot('02-tonight');
  await page.goto(`${base}#/sky?t=2026-09-10T12:00:00Z&preserve=1&select=planet:saturn&fov=60`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('tooltip-details')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('tooltip-details').click();
  await page.getByTestId('sheet-stage').click();
  await expect(page.getByTestId('object-photo-hero')).toBeVisible();
  await expect
    .poll(() => page.getByTestId('object-photo-hero').evaluate((el) => el.naturalWidth))
    .toBeGreaterThan(0);
  await shot('03-photo');
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('tab-log').click();
  await expect(page.getByTestId('log-screen')).toBeVisible();
  // Write clearly documented fictional demo observations to this temporary browser only.
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('skylog');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const rows = [
      [
        'star:HIP91262',
        '2026-09-09T12:10:00Z',
        '2026-09-09',
        '베가를 찾고 나니 거문고자리가 눈에 들어왔다.',
        'naked',
      ],
      [
        'planet:saturn',
        '2026-09-08T13:30:00Z',
        '2026-09-08',
        '처음 찾은 토성. 다음에는 고리도 자세히 보고 싶다.',
        'telescope',
      ],
      [
        'dso:M31',
        '2026-09-07T13:00:00Z',
        '2026-09-07',
        '쌍안경으로 천천히 찾아본 안드로메다 은하.',
        'binoculars',
      ],
    ];
    await new Promise((resolve, reject) => {
      const tx = db.transaction('observations', 'readwrite');
      for (const [objectId, observedAt, nightKey, notes, kind] of rows)
        tx.objectStore('observations').put({
          id: crypto.randomUUID(),
          createdAt: observedAt,
          updatedAt: observedAt,
          schemaVersion: 1,
          objectId,
          observedAt,
          nightKey,
          outcome: 'seen',
          notes,
          tags: ['샘플 기록'],
          site: { lat: 36.37, lon: 127.36, elevation: 70, name: '대전 (예시)' },
          equipment: { kind },
        });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('log-item').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '나중에', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '나중에', exact: true }).click();
  await expect(page.getByRole('button', { name: '나중에', exact: true })).toHaveCount(0);
  await shot('04-log');
  await page.getByTestId('tab-learn').click();
  await expect(page.getByTestId('learn-quiz-start')).toBeVisible({ timeout: 30000 });
  await shot('05-learn');
  await page.getByTestId('learn-quiz-start').click();
  await expect(page.getByTestId('quiz-question')).toBeVisible();
  await shot('05b-quiz');
  await page.getByTestId('quiz-host').getByLabel('닫기', { exact: true }).click();
  await page.goto(`${base}#/profile`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('personal-screen')).toBeVisible();
  await page.getByRole('button', { name: '아바타', exact: true }).click();
  await page.getByRole('button', { name: '포근한 후디', exact: true }).click();
  await page.getByRole('button', { name: '라벤더', exact: true }).click();
  await page.getByRole('button', { name: '머리', exact: true }).click();
  await page.getByRole('button', { name: '모자 없이', exact: true }).click();
  await page.getByRole('button', { name: '물결 머리', exact: true }).click();
  await page.getByRole('button', { name: '구리빛', exact: true }).click();
  await page.getByRole('button', { name: '이 모습 적용', exact: true }).click();
  await page.goto(`${base}#/profile`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('personal-screen')).toBeVisible();
  await shot('06-garden');
  await page.goto(`${base}#/learn?section=courses`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('course-theme-telescope').click();
  await page.getByTestId('course-group-starhop').click();
  await page.getByTestId('course-hercules-keystone').click();
  await expect(page.getByTestId('hop-course-detail')).toBeVisible();
  await shot('07-starhop-course');
  await page.getByRole('button', { name: '스타호핑 시작', exact: true }).click();
  await page.getByTestId('guide-accept').click();
  await expect(page.getByTestId('starhop')).toBeVisible();
  await shot('07b-starhop-guide');
  await page.getByRole('button', { name: '하늘에 경로 펼쳐 보기', exact: true }).click();
  await expect(page.getByTestId('sky-canvas')).toBeVisible();
  await shot('07c-starhop-sky');
  const scene = await context.newPage();
  await scene.clock.setFixedTime(new Date('2026-09-10T12:00:00Z'));
  await scene.setViewportSize({ width: 1024, height: 500 });
  await scene.goto(`${base}#/sky?t=2026-09-10T12:00:00Z&preserve=1&alt=26&az=190&fov=95`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(scene.getByTestId('sky-canvas')).toBeVisible();
  await expect(scene.getByTestId('sky-loading')).toHaveCount(0);
  await scene.waitForTimeout(1000);
  const canvasData = await scene
    .getByTestId('sky-canvas')
    .evaluate((el) => el.toDataURL('image/png'));
  await fs.writeFile(
    `${dir}/feature-sky-source.png`,
    Buffer.from(canvasData.split(',')[1], 'base64'),
  );
  evidence.featureGraphicSource =
    'Actual app canvas export; promotional graphic only, not a UI screenshot.';
  if (evidence.errors.length) throw new Error(evidence.errors.join('\n'));
} finally {
  await fs.writeFile(`${dir}/phone-capture-evidence.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
