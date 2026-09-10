// 실제 코스를 열고 스크롤해서 촬영한다. 관측 완료나 기록을 만들지 않는다.
/* global document, requestAnimationFrame, innerWidth */
import fs from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
import crypto from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import sharp from 'sharp';

const base = process.env.STORE_PREVIEW_URL || 'http://127.0.0.1:5181/';
const directory = 'docs/store-assets/launch-20260910';
const sampleTime = '2026-09-10T12:00:00Z';
const evidence = {
  sourceCommit: '830c974bebeab0e873925ba58b0bd8a01798de6e',
  appVersion: '0.1.0-beta.12',
  androidBuild: 17,
  base,
  sampleTime,
  site: '대전 (KAIST) 기본 장소',
  viewport: { width: 432, height: 768, deviceScaleFactor: 2.5 },
  physicalDevice: false,
  personalData: false,
  completedObservation: false,
  errors: [],
  shots: [],
};
await fs.mkdir(`${directory}/raw-phone`, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const context = await browser.newContext({
    viewport: { width: 432, height: 768 },
    deviceScaleFactor: 2.5,
    hasTouch: true,
    isMobile: true,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => evidence.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.errors.push(message.text());
  });
  // Date만 고정하고 렌더링·로딩 타이머는 그대로 진행한다.
  await page.clock.setFixedTime(new Date(sampleTime));
  await page.goto(`${base}#/learn?section=courses`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('course-theme-telescope').click();
  await page.getByTestId('course-group-starhop').click();
  await page.getByTestId('course-hercules-keystone').click();
  await expect(page.getByTestId('hop-course-detail')).toBeVisible();
  await page.getByRole('button', { name: '스타호핑 시작', exact: true }).click();
  await page.getByTestId('guide-accept').click();
  await expect(page.getByTestId('starhop')).toContainText('허큘리스');
  await expect(page.getByTestId('hop-step')).toHaveCount(1);
  await expect(page.getByTestId('hop-distance-hint')).toContainText('원 너비의 약 41%');
  await expect(page.getByTestId('finder-chart')).toHaveAttribute('width', '320');

  async function capture(name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const layout = await page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      fontStatus: document.fonts.status,
      replacementCharacters: document.body.innerText.includes('\uFFFD'),
      actualDate: new Date().toISOString(),
    }));
    expect(layout.horizontalOverflow).toBe(false);
    expect(layout.fontStatus).toBe('loaded');
    expect(layout.replacementCharacters).toBe(false);
    expect(layout.actualDate).toBe(sampleTime.replace('Z', '.000Z'));
    const filename = `${name}.png`;
    const destination = `${directory}/raw-phone/${filename}`;
    await page.mouse.move(431, 767);
    await page.screenshot({ path: destination, animations: 'disabled', fullPage: false });
    const bytes = await fs.readFile(destination);
    const metadata = await sharp(bytes).metadata();
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1920);
    expect(metadata.hasAlpha).toBe(false);
    evidence.shots.push({
      filename,
      width: metadata.width,
      height: metadata.height,
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      layout,
      screenText: await page.locator('body').innerText(),
    });
    console.log(`Captured ${filename}`);
  }

  // 스크롤 위치만 움직인다. 차트와 안내문을 바꾸거나 관측 확인을 누르지 않는다.
  await page.getByTestId('hop-step').evaluate((section) => {
    section.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  await capture('07d-starhop-chart');

  await page.getByRole('button', { name: '하늘에 경로 펼쳐 보기', exact: true }).click();
  await expect(page.getByTestId('sky-canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('time-bar')).toContainText('21:00');
  // 실제 천체 이동 애니메이션과 은하수 텍스처가 안정된 프레임을 촬영한다.
  await page.waitForTimeout(1200);
  await page.getByTestId('tooltip-close').click();
  await capture('07e-starhop-night');
  expect(evidence.errors).toEqual([]);
} finally {
  await fs.writeFile(
    `${directory}/starhop-capture-evidence.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  await browser.close();
}
