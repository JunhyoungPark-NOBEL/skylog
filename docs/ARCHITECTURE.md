# ARCHITECTURE

> 마스터 플랜 `plan/00-master-plan.md` §4·§6의 코드 수준 요약. 데이터 포맷 명세와 T1이 바로 쓸 API는 T0b에서 채운다.

## 스택

React 19 · TypeScript(strict, `any` 금지) · Vite 8 · Tailwind CSS 4(토큰은 CSS 변수) · Zustand 5 · Dexie 4 · Three.js · astronomy-engine · i18next · vite-plugin-pwa(Workbox) · Vitest · Playwright.

## 부트스트랩 순서 (`src/main.tsx`)

1. 서비스 워커 등록(`virtual:pwa-register`, autoUpdate).
2. `waitForSettingsHydration()` — Dexie `settings` 테이블에서 설정 복원(D-010). 그동안 `index.html`의 스플래시 유지.
3. `applyTheme(theme)` → `<html data-theme>` + `theme-color` 메타. `initI18n(lang)`.
4. `<ErrorBoundary><App/></ErrorBoundary>` 렌더 후 스플래시 제거.

## 라우팅 (D-011)

해시 라우터(`src/app/router.ts`): `#/sky | #/search | #/tonight | #/log | #/learn | #/settings | #/about | #/debug/data`. `useRoute()`(useSyncExternalStore) + `navigate()`. 설정·정보·디버그는 전체 화면, 나머지는 탭.

## 테마 (`src/app/theme.css`, `theme.ts`)

- 모든 색은 `:root` CSS 변수. `html[data-theme="night"]`에서 적색 계열로 교체(필터 hack 금지).
- Tailwind v4 `@theme inline`으로 `bg-bg`, `text-fg`, `border-border` 등 유틸리티에 노출.
- 렌더러는 `getPalette()`로 같은 토큰을 읽어 머티리얼 색을 갱신한다(테마 변경 시 재호출). 키: `bg fg muted accent danger overlay star planet moon constellation constellationBound grid horizon milkyWay label marker`.

## 상태 (`src/state/`)

| 스토어           | 내용                                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settingsStore`  | theme·lang·keepAwake·debugHud·units. zustand `persist`의 storage = Dexie `settings` 어댑터(`db/repos/settings.ts`, 키마다 한 행 `settings.<key>`). localStorage 사용 안 함. |
| `clockStore`     | realtime/manual, offsetMs, rate, `now()`                                                                                                                                    |
| `locationStore`  | site{name,lat,lon,elevation}, source preset/gps/manual, accuracyM                                                                                                           |
| `viewStore`      | centerAlt/centerAz/fovDeg, mode manual/sensor                                                                                                                               |
| `selectionStore` | selectedId, targetId                                                                                                                                                        |

## 저장 (`src/db/`)

`SkylogDB` v1: `observations, bookmarks, sites, telescopes, eyepieces, binoculars, blobs, progress, settings, cache`(D-010). 타입은 `db/types.ts`(마스터 플랜 §6.3). 리포지토리는 T0에서 `settings`·`cache`·`sites`만. 테스트는 `fake-indexeddb` + 테스트마다 새 DB 이름.

## PWA

- 프리캐시: 앱 셸 + `data/manifest, stars-bright, constellations, dso, search-index, bodies, meteors`.
- 런타임: `stars-deep` CacheFirst · `content/*`·`learn/*` StaleWhileRevalidate · Open-Meteo/7Timer NetworkFirst.
- `base`는 `/skylog/`(GitHub Pages). `VITE_BASE`로 덮어쓴다.

## 디렉터리

마스터 플랜 §6.4와 동일. 빈 디렉터리에는 `README.md` 한 줄.

## 데이터 팩 포맷 (T0b에서 확정)

- `manifest.v1.json`: `{schema, version, generatedAt, packs{name→{file,version,bytes,records,sha256}}, sources[], summary}` — `src/catalog/manifest.ts`.
- `stars-bright.v1.bin` / `stars-deep.v1.bin`: 헤더 16B(`'SKYS'`, u16 version, u32 count, reserved) + 레코드 28B LE `x,y,z(f32) mag(f32) bv(f32) hip(u32) hygId(u32)`.
- 나머지 JSON 포맷은 `plan/task-00-setup-and-data.md` §3.3.

## T1이 쓸 API (T0b에서 작성)

- `catalog/starPack.ts` 로더 시그니처, `astro/frames.ts#eqjToSceneMatrix(time, observer)`, `render/shaders/refraction.glsl` 사용법.
