import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// GitHub Pages는 `/<repo>/` 하위 경로에 배포되므로 base를 저장소 이름으로 둔다.
// 다른 경로(예: 커스텀 도메인)에 배포할 때는 VITE_BASE 환경변수로 덮어쓴다.
const base = process.env.VITE_BASE ?? '/skylog/';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// 프리캐시할 기본 데이터 팩(T0b가 생성). 아직 없는 파일은 패턴에서 빼서 Workbox 경고를 막는다.
const PRECACHE_DATA_FILES = [
  'manifest.v1.json',
  'stars-bright.v1.bin',
  'stars-bright.v1.json',
  'constellations.v1.json',
  'dso.v1.json',
  'search-index.v1.json',
  'bodies.v1.json',
  'meteors.v1.json',
  'milkyway.v1.png',
];
const precacheDataPatterns = PRECACHE_DATA_FILES.filter((f) =>
  existsSync(new URL(`./public/data/${f}`, import.meta.url)),
).map((f) => `data/${f}`);

export default defineConfig(({ mode }) => ({
  base: mode === 'native' ? '/' : base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: mode === 'native',
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: '별관찰해쌀뚜',
        short_name: '별관찰',
        description: '별·달·행성 관측용 개인 PWA — 하늘 보기, 검색, 관측 기록, 망원경 가이드, 학습',
        lang: 'ko',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#05070d',
        theme_color: '#05070d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 앱 셸 + 기본 데이터 팩(밝은 별·별자리·DSO·검색 인덱스·메타)은 프리캐시
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}', ...precacheDataPatterns],
        globIgnores: ['**/data/stars-deep.v1.bin', '**/data/content/**', '**/data/learn/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // 망원경용 깊은 별 팩: 한 번 받으면 오래 유지
            urlPattern: ({ url }) => url.pathname.endsWith('/data/stars-deep.v1.bin'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'skylog-stars-deep',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // 콘텐츠·학습 팩: 있는 것을 먼저 보여주고 뒤에서 갱신
            urlPattern: ({ url }) =>
              url.pathname.includes('/data/content/') || url.pathname.includes('/data/learn/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'skylog-content',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          {
            // 날씨 API: 온라인이면 새 값, 오프라인이면 최근 값(짧은 만료)
            urlPattern: ({ url }) =>
              url.hostname.endsWith('open-meteo.com') || url.hostname.endsWith('7timer.info'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'skylog-weather',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 6 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    restoreMocks: true,
  },
}));
