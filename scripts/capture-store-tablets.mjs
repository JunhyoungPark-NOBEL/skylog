// 실제 앱 UI를 새 브라우저 컨텍스트에서 촬영한다. 개인 기록·보상·로그인을 만들지 않는다.
/* global document, requestAnimationFrame, innerWidth, innerHeight, getComputedStyle */
import fs from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import sharp from 'sharp';

const base = process.env.STORE_CAPTURE_URL ?? 'http://127.0.0.1:5181/';
const output = path.resolve('docs/store-assets/launch-20260910');
const time = '2026-09-10T12:00:00Z';
const devices = [
  { name: 'tablet-7', width: 960, height: 540, scale: 2 },
  { name: 'tablet-10', width: 1280, height: 720, scale: 1.5 },
];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const report = [];
try {
  for (const device of devices) {
    const directory = path.join(output, device.name);
    await fs.mkdir(directory, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
      isMobile: true,
      hasTouch: true,
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      colorScheme: 'dark',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    async function capture(name) {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await expect
        .poll(() =>
          page.evaluate(() =>
            [...document.images].every((image) => {
              const rect = image.getBoundingClientRect();
              return (
                rect.width === 0 ||
                rect.height === 0 ||
                rect.bottom <= 0 ||
                rect.top >= innerHeight ||
                (image.complete && image.naturalWidth > 0)
              );
            }),
          ),
        )
        .toBe(true);
      const layout = await page.evaluate(() => ({
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        fontStatus: document.fonts.status,
        bodyFont: getComputedStyle(document.body).fontFamily,
        replacementCharacters: document.body.innerText.includes('\uFFFD'),
        loadingText: [...document.querySelectorAll('[role="status"]')]
          .map((node) => node.textContent?.trim())
          .filter((text) => text && /불러오|Loading/.test(text)),
      }));
      expect(layout.horizontalOverflow).toBe(false);
      expect(layout.fontStatus).toBe('loaded');
      expect(layout.replacementCharacters).toBe(false);
      expect(layout.loadingText).toEqual([]);
      const filename = `${name}.png`;
      const target = path.join(directory, filename);
      await page.mouse.move(device.width - 1, device.height - 1);
      await page.screenshot({ path: target, fullPage: false, animations: 'disabled' });
      const bytes = await fs.readFile(target);
      const metadata = await sharp(bytes).metadata();
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.hasAlpha).toBe(false);
      report.push({
        device: device.name,
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.scale,
        filename,
        width: metadata.width,
        height: metadata.height,
        bytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        layout,
      });
    }
    try {
      await page.goto(`${base}#/sky?t=${time}&preserve=1&alt=45&az=170&fov=95`);
      await expect(page.getByTestId('sky-canvas')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('sky-loading')).toHaveCount(0, { timeout: 30_000 });
      await expect(page.getByTestId('time-bar')).toContainText('21:00');
      // 첫 WebGL 프레임·은하수 텍스처가 실제 화면에 안정적으로 나타날 시간을 둔다.
      await page.waitForTimeout(1000);
      await capture('01-sky');

      await page.getByTestId('tab-search').click();
      await page.getByTestId('search-cat-messier').click();
      await expect(page.getByTestId('search-result').first()).toBeVisible();
      await capture('02-search-photos');

      await page.getByTestId('tab-learn').click();
      await expect(page.getByTestId('learn-quiz-start')).toBeVisible();
      await capture('03-learning');

      await page.goto(`${base}#/profile`);
      await expect(page.getByRole('heading', { name: '별빛 아래, 나만의 자리' })).toBeVisible();
      await expect(page.locator('svg.personal-art').first()).toBeVisible();
      await capture('04-garden');
      expect(errors).toEqual([]);
    } catch (error) {
      const debugDirectory = path.resolve('artifacts/store-tablet-capture');
      await fs.mkdir(debugDirectory, { recursive: true });
      await page.screenshot({ path: path.join(debugDirectory, `${device.name}-failure.png`) });
      await fs.writeFile(
        path.join(debugDirectory, `${device.name}-failure.json`),
        JSON.stringify(
          { message: String(error), errors, text: await page.locator('body').innerText() },
          null,
          2,
        ),
      );
      throw error;
    } finally {
      await context.close();
    }
  }
  await fs.writeFile(
    path.join(output, 'tablet-capture-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    JSON.stringify({ images: report.length, consoleErrors: 0, screenshots: report }, null, 2),
  );
} finally {
  await browser.close();
}
