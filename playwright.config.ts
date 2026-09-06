import { defineConfig, devices } from '@playwright/test';

// 마스터 플랜 §8: 모바일 뷰포트(Pixel 7), Asia/Seoul, ko-KR, SwiftShader(헤드리스 WebGL).
const base = process.env.VITE_BASE ?? '/skylog/';
const port = 4173;
const baseURL = `http://127.0.0.1:${port}${base}`;

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    ...devices['Pixel 7'],
    baseURL,
    timezoneId: 'Asia/Seoul',
    locale: 'ko-KR',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{ name: 'mobile-chromium' }],
  webServer: {
    command: `pnpm build && pnpm preview --port ${port} --strictPort --host 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
