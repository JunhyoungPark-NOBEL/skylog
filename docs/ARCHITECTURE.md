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

## 렌더 파이프라인 (`src/render/`, T1)

```
clockStore.now() ─┐                         ┌─ StarLayer      (Points, J2000 buffer, uEqjToScene, GLSL 굴절)
locationStore ────┼─► SkyScene.updateAstronomy ├─ DsoLayer       (Points, 카테고리 기호)
                  │   · eqjToSceneMatrix 1개/초 ├─ MilkyWayLayer  (J2000 구 + 등적색 텍스처)
                  │   · bodies.update 250ms     ├─ ConstellationLayer / GridLayer (LineLayer: 선분+aDist 대시)
layerStore ───────┤                            ├─ BodyLayer      (행성 스프라이트 + 달 구/조명 + 태양)
settings(theme) ──┤   readRenderPalette()      ├─ HorizonLayer   (아래 반구 땅 + 지평선 링·눈금)
                  │                            └─ SkyBackground  (R=150 구, 태양 고도 그라디언트)
pointer/wheel ────┴─► CameraController ─► camera(alt/az/fov) ─► renderer.render ─► Labels(HTML) · 선택 링
                        └ flyTo / setOrientationQuaternion(T2)        └ renderStats(draw call → HUD)
```

- 씬 프레임 +X 동 +Y 천정 +Z 남, 천체는 R≈100 방향 벡터. 별·선·DSO·은하수는 정점 셰이더에서 `uEqjToScene` + `skylogApplyRefraction`; 행성·달·라벨·hit-test는 CPU에서 `bodies.ts`/`apparentAltitude` — 같은 Sæmundsson 식.
- React와 렌더 루프 분리: 씬은 스토어를 `getState()`로 읽고, 스토어 구독은 `invalidate()`만 호출. viewStore는 ≤10Hz로만 갱신(ViewInfo가 구독).
- 외부 진입점 `features/sky/skyApi.ts`: `flyToObject(id, fov?)`(T3 "하늘에서 보기"), `getSkyScene()`. 테스트 훅 `window.__skylogScene / __skylogStats / __skylogAstro`.
- 결정 상세: D-017.

## 센서 파이프라인 (`src/sensors/`, T2)

```
Provider(DOAbsolute | GenericAbs | DeviceOrientation | Simulator)   ── OrientationSample{q_scene, northReference, compassHeading, raw}
   └─► SensorManager.onSample
         1. 자북이면 applyYawOffset(q, D)          D = WMM2025 편각(magvar), 절대 소스에만 한 번
         2. OrientationFilter.push(q, t)           slerp τ100ms · 적응 이득 · 출력 데드밴드 0.2° · (절대) yaw τ500ms
         3. 상대 소스: compassSyncCandidate → YawSync   iOS 상단축 heading으로 δ_sync (자세 조건 밖이면 갱신 중단)
         4. q_cal = applyOffset(q_f, δ, pitch)     δ = 별 정렬 > 나침반 동기 > 0
         5. CameraController.setSensorQuaternion(q_cal, keepLevel)   (수동 일시 정지 중이면 생략)
         6. sensorStore.patch(≤10Hz)               디버그 패널·상태 바·배지
```

- **부호 규약**(반드시 유지): 기기 프레임 +x 오른쪽, +y 상단, +z 화면 밖. W3C α는 위에서 볼 때 반시계(heading = 360 − α). 씬 프레임 +X 동, +Y 천정, +Z 남, 카메라 −Z. `deviceOrientationToScene = qY(α)·qX(β)·qZ(−γ)·qX(−π/2)·qZ(−θ)`. 방위 `atan2(x, −z)`; `yawQuaternion(Δaz) = qY(−Δaz)`(+Y 양의 회전은 방위 감소). 편각 D 동 +: 진북 = 자북 + D. 테스트 벡터는 `tests/unit/sensors/orientation.test.ts`.
- **iOS vs Android**: Android `deviceorientationabsolute`는 자북 절대 자세 → D 적용. iOS는 상대 자세 + `webkitCompassHeading`(자북, accuracy 음수면 무효) → 상단 축끼리 비교해 δ_sync. `requestPermission()`은 탭 핸들러 안에서만.
- **T5 재사용 API**: `solveYawOffset(samples)`, `applyOffset(q, δ, pitch)`, `deviceAxisInScene(q, axis, θ)`(경통 축 `t_b`를 화면 회전 없이 넣을 것), `SensorManager.currentAltAz()`.
- 위치: `sensors/geolocation.ts`(getCurrentPosition → watchPosition 개선, 마지막 위치 저장), `sensors/locationInit.ts`(시작 시 결정), 관측지 CRUD `db/repos/sites.ts` + `features/settings/Sites.tsx`(`SkyRangePicker`).

## 디렉터리

마스터 플랜 §6.4와 동일. 빈 디렉터리에는 `README.md` 한 줄.

## 데이터 파이프라인 (`scripts/data/`, T0b)

```
pnpm data:fetch     원본 → data-src/raw/ (+ sources.json: 크기·SHA-256·시각). 이미 있으면 재사용, --force로 다시 받음
pnpm data:build     data-src/{raw,curated} → public/data/*.v1.* + manifest.v1.json + data-src/content-raw/catalog-values.v1.csv
pnpm data:validate  검증 리포트(별 ≥ 8000, 별자리 88, 메시에 110, 콜드웰 ≥ 100, 좌표 범위, 중복, 크기…) — 실패 시 exit 1
```

모듈: `lib.ts`(경로·CSV·해시·정규화) · `build-stars.ts` · `build-constellations.ts` · `build-dso.ts` · `build-misc.ts`(유성우·행성 메타) · `build-search-index.ts` · `export-catalog-values.ts` · `build.ts`(오케스트레이션·manifest) · `validate.ts`. 빌드는 결정론적이다(정렬 고정, 생성 시각만 manifest에).

## 데이터 팩 포맷 v1 (`public/data/`)

| 파일                     | 내용                                                                                                                                                                                                                                             | 크기(2026-09-06) |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `manifest.v1.json`       | `{schema, version, generatedAt, packs{name→{file,version,bytes,records,sha256}}, sources[], summary{starsBright,starsDeep,namedStars,constellations,dso,messier,caldwell}}` — 타입 `src/catalog/manifest.ts`                                     | 4 KB             |
| `stars-bright.v1.bin`    | mag ≤ 6.5, 8,920개. 헤더 16B(`'SKYS'`, u16 version=1, u32 count, 6B reserved) + 레코드 28B LE `x,y,z(f32 J2000 단위벡터) mag(f32) bv(f32; 결측 0.6) hip(u32; 없으면 0) hygId(u32)`. 등급 오름차순. 인코더/디코더 `src/catalog/starPackFormat.ts` | 244 KB           |
| `stars-deep.v1.bin`      | mag ≤ 9.0, 83,476개, 같은 포맷. 지연 로드(런타임 CacheFirst)                                                                                                                                                                                     | 2.3 MB           |
| `stars-bright.v1.json`   | 이름/메타가 있는 별 3,171개: `{id, hip, hygId, en?, ko?, traditionalKo?, aliasesKo?, bayer?("α"), bayerAbbr?("Alp"), flam?, con, spect?, distLy?, mag, ra, dec}` (ra/dec는 J2000 도 — 팩 없이도 상세·검색이 좌표를 쓰도록 추가)                  | 490 KB           |
| `constellations.v1.json` | `{[iau3]: {en, ko, genitive?, label:[ra,dec], lines:[[[ra,dec],…],…], bounds:[[ra,dec],…], boundsExtra?, season?}}` RA 0..360                                                                                                                    | 58 KB            |
| `dso.v1.json`            | 661개: `[{id, aliases[], names:{en?, ko?, aliasesKo?, common[]}, type(OpenNGC), category, ra, dec, mag?, magB?, majAxArcmin?, minAxArcmin?, posAngDeg?, con, distLy?, messier?, caldwell?}]`                                                     | 151 KB           |
| `search-index.v1.json`   | 3,929개 `{id, kind, con?, mag?, n:[정규화 별칭]}`                                                                                                                                                                                                | 440 KB           |
| `bodies.v1.json`         | 행성 7 + 달 + 태양: `{id, body(astronomy-engine Body 이름), names{ko,en}, icon, kind, hints}`                                                                                                                                                    | 1 KB             |
| `meteors.v1.json`        | 유성우 13개: `{id, names, activeFrom, activeTo, peak('MM-DD'), zhr, radiant{ra,dec}, velocityKms?, parentBody?, note?}`                                                                                                                          | 3 KB             |

**ObjectId(D-014 보강)**: `dso:` 우선순위 M > NGC > IC, NGC/IC가 없는 유명 천체는 `dso:C41`(히아데스)·`dso:C99`(석탄자루)·`dso:C9`(동굴성운)·`dso:C14`(이중성단 쌍)·`dso:B33`(말머리) 처럼 콜드웰/바너드 번호. M102 = NGC 5866(OpenNGC는 M101 중복으로 보지만 관행을 따름). OpenNGC `Dup` 행은 마스터의 별칭으로 흡수(예: NGC2244→NGC2239, C50).

**검색 별칭 정규화**(`normalizeAlias`, 빌드와 클라이언트가 동일하게 적용): NFC → 소문자 → 공백·하이픈·밑줄·점·따옴표·가운뎃점 제거 → 괄호 제거. `"M 31"`=`"m31"`, `"NGC 224"`=`"ngc224"`. 그리스 문자는 `α Ori` / `Alpha Ori` / `Alp Ori` / `알파 오리온자리` / `알파 오리온`을 모두 별칭으로 넣는다. 한글은 그대로(공백 제거). 초성 검색은 T3에서 필요 시 추가.

## `src/astro` API (T0b) — T1·T3가 바로 쓰는 것

```ts
import {
  eqjToSceneMatrix,
  applyMat3,
  eqjToAltAz,
  eqjToAltAzSlow,
  bodyState,
  riseTransitSetFixed,
  nightTimeline,
} from '@/astro';

// 렌더 루프(프레임당 1회): J2000 단위벡터 버퍼 × 3×3 행렬 → 씬(+X 동, +Y 천정, +Z 남)
const m = eqjToSceneMatrix(clock.now(), { lat: 36.37, lon: 127.36, elevation: 70 }); // Float32Array(9), column-major
material.uniforms.uEqjToScene.value.fromArray(m); // THREE.Matrix3.fromArray는 column-major
const sceneVec = applyMat3(m, raDecToUnitVector(raDeg, decDeg)); // CPU 쪽 단일 변환

// 굴절: 셰이더에서 `#include <skylog_refraction>`(src/render/shaders/refraction.glsl) → skylogApplyRefraction(dir)
//        CPU에서는 apparentAltitude(trueAlt) (Sæmundsson) / trueAltitude(apparentAlt) (Bennett)

// 행성·달·태양: 겉보기 RA/Dec(of date)·alt/az(굴절 포함/미포함)·거리·등급·각지름·위상·밝은 가장자리 위치각
const saturn = bodyState('saturn', date, site);

// 출몰·박명 (별·DSO는 J2000 도 입력; 내부에서 DefineStar(Body.Star1) 재사용)
riseTransitSetFixed(raDeg, decDeg, site, date, distLy);
nightTimeline(site, date); // sunset … astronomicalDusk … sunrise, moonrise/moonset

// 별 팩 로더
const pack = await loadStarPack('stars-bright'); // { positions: Float32Array(count×3), mag, bv, hip, hygId }
```

규칙: astronomy-engine의 `Horizon`/`DefineStar`/`Constellation`은 `frames.ts`·`events.ts` 밖에서 호출하지 않는다(RA hours·EQD 실수 방지). 검증: 무작위 별 150개 빠른/느린 경로 ≤ 0.01°, JPL Horizons 기준 표(`tests/fixtures/reference-altaz.json`) ≤ 0.1°, 출몰 해석식 ±2분.
