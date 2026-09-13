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

## 검색·상세·찾아가기·관측 밤 (T3a, D-019)

- **검색**(`catalog/searchIndex.ts`): `search-index.v1.json`(항목당 정규화 별칭)을 선형 탐색. 외부 라이브러리 없음. 정규화 함수는 `catalog/normalize.ts` 하나를 빌드 스크립트와 앱이 공유한다. 등급 exact < prefix < substring < fuzzy(편집 거리 1, 4자 이상), 초성 질의(`ㅈㄴㅅ`), 한국어 음역 확장(`koreanLatin.ts`: "알파 리라" → `alphalyr`, 약한 일치). 같은 등급 안에서 밝기 → 지평선 위 → 유명 천체(`famous.ts`) 보너스. 별자리의 "…자리" 뗀 별칭은 약한 별칭. `lastSearchMs`로 응답 시간 확인(< 50ms).
- **지금 상태**(검색 결과·제안): `eqjToSceneMatrix` 1개 + 카탈로그 벡터(`SearchScreen.makeNowState`). 빈 검색어 제안은 `SUGGEST_ORDER` 중 고도 ≥ 10°.
- **상세 시트**(`features/object/ObjectSheet.tsx`, 어디서든 `openObject(id)`): `catalog/objectTarget.ts`(id → J2000·등급·크기·거리, 팩 전용 별은 `SkyScene.objectJ2000` 폴백) → `astro/objectDetails.ts`(순수): 지금(느린 경로 alt/az·of-date·태양/달 각거리·상태), 오늘(정오→정오 출·남중·몰, 최적 시간대 = 어두운 구간 ∩ 고도 ≥ 30°(폴백 20°) 최장 연속, 가장 좋은 달 = 15일 자정 LST≈RA), 장비 판정(`astro/equipment.ts`: 점광원 = 한계등급 여유, 확산 천체 = 표면 밝기 vs Bortle 하늘 배경 + 광학계 보너스, **근사**). 10초마다 재계산. 반쯤/전체 2단계, 핸들 스와이프. ☆ 예정 = Dexie `bookmarks`(`db/repos/bookmarks.ts`, 소프트 삭제).
- **찾아가기**(`features/sky/TargetGuide.tsx`, `selectionStore.targetId`): 80ms마다 `scene.objectDirection` → 화면 안이면 링, 밖이면 카메라 공간 x·y로 가장자리 화살표(`render/edgeArrow.ts`, 원근 나눗셈이 없으므로 뒤쪽도 뒤집지 않는다). 중앙 3° 안 피드백 1회(5° 밖으로 나가면 재무장). 지평선 아래면 다음 출 시각 + 시계 이동 버튼. "하늘에서 보기" FOV는 `fovForTarget`(행성 20°, 별 30°, DSO 크기 기반, 별자리 경계 맞춤).
- **관측 밤**(`astro/night.ts`, `observingNight`): 현지 정오→정오(`nightKey`), 박명 구간 목록(`segments`), `darkSpan`(천문박명 사이, 없으면 항해), 달 위 구간·월출몰(여러 번 가능), 위상·조도·달 나이, **어두운 창** = darkSpan ∩ 달 고도 < 10°(5분 샘플 + 이분법). 캐시는 `features/tonight/useNight.ts`(밤 키+관측지). 위젯 `SkyStatusCard`(SVG 타임라인 18~06시, 일몰/일출이 벗어나면 확장; T3b가 구름 막대를 `clouds`로 겹친다).
- **포맷**(`ui/format.ts`): 16방위, HMS/DMS, 현지 시각(Intl, `Asia/Seoul`), 시간 길이, 거리, 각크기, `zonedDateTime`/`tzOffsetMinutes`.
- **씬 준비**: `SkyScene.ready`(카탈로그+첫 행성 배치) — `skyApi.flyToObject`는 이것을 기다린다(검색 탭 → 하늘 탭 전환 직후 호출되어도 동작).

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

## 날씨·추천·천문 현상·실제 하늘처럼 (T3b, D-020)

- **날씨**(`services/weather.ts`): Open-Meteo 시간별 예보(`hourly.time`은 현지 시각 문자열 → `utc_offset_seconds`로 UTC 변환). `getWeather(lat, lon)`은 Dexie `cache`(1시간 TTL)를 먼저 보고, 실패·오프라인·8초 타임아웃이면 `null`(카드 숨김). `summarizeWeather(forecast, window)` = 구름 ≤ 30% 최장 구간·평균·결로(기온−이슬점 < 2°C)·바람·강수. 7Timer는 CORS 헤더가 없어 쓰지 않는다.
- **추천 엔진**(`astro/recommend.ts`, 순수): 입력 = 후보(`catalog/recommendCandidates.ts`: 행성·달·밝은 별·이중성·메시에/콜드웰/이름 있는 DSO·대표 별자리) + 관측지·창·관측 밤·장비·구름 함수·이벤트·계절 시그니처. 10분 샘플마다 `eqjToSceneMatrix` 1개로 모든 고정 후보를 변환하고 행성은 `bodyState`. 샘플 가시 조건과 안 보이는 이유(horizon/site/twilight/cloud)를 기록한다. 출력 = `items`(점수순), `groups`(now/naked/binoculars/telescope/settingSoon/rising), `plan`(최적 시각순 ≤ 12), `reasons`(구조화 ReasonPart → `features/tonight/reasonText.ts`가 i18n 문장으로). 가중치는 파일 상단 `WEIGHTS` 표(근거 주석).
- **장비 판정**(`astro/equipment.ts`): 점광원 = 한계등급 여유, 확산 천체 = 표면 밝기 vs Bortle 하늘 배경(+광학계 보너스), 은하·구상성단 중심부 +1.5, 큰 산개성단은 적분 등급+1.5를 점광원처럼. 근사이며 UI에 "참고" 표기.
- **천문 현상**(`astro/phenomena.ts`, astronomy-engine 검색 함수는 이 파일 안에서만): `monthPhenomena(observer, y, m, showers)` → 충·합·최대이각(시민박명 고도로 가시 판정)·금성 최대 밝기·달 위상·월식/일식(지역 가시)·슈퍼문(Espenak)·유성우 극대(등급). `specialEventsFrom()`이 추천 보너스 이벤트로 변환(유성우는 복사점 별자리 `SHOWER_RADIANT_CON`).
- **오늘 밤 탭**(`features/tonight/`): `useTonight` 훅이 관측 밤 → 창(프리셋: 지금부터 2h / 저녁(일몰~01:00) / 깊은 밤 / 새벽 / 직접) → 날씨 → 이달·다음 달 현상(관측지·달별 캐시) → 추천(입력 키가 바뀔 때 비동기 재계산, 이전 결과 유지)을 조립. 카드 순서: 하늘 상태(구름 겹침) → 날씨 → 하이라이트 → 추천(그룹 칩) → 계획(☆ = Dexie bookmarks) → 이달의 현상 → 유성우. 상태는 `state/tonightStore.ts`(프리셋·장비 persist).
- **실제 하늘처럼**(`astro/realSky.ts`, `features/sky/useRealSkySync.ts`): 켜면 30초마다 Bortle(레이어 설정 > 관측지 > 7)·달로 한계등급을 계산해 `layerStore.limitingMag`에 넣는다(끄면 6.5). 박명·낮은 렌더러가 따로 처리.
- **관측지 제약**(`features/settings/useSiteRecord.ts`): `locationStore.siteId`로 Dexie `sites`를 읽어 `visibleAz`/`minAltDeg`/`bortle`을 추천·시트에 공급.

## UI 디자인 시스템 v2 (D-021)

- 토큰은 `src/app/theme.css` 하나(반지름·표면 층·헤어라인·톤 상태색·그림자·유리·스프링 이징·타이포). Tailwind v4 `@theme`/`@theme inline`/`@utility`. 렌더러 팔레트(`app/theme.ts`)가 읽는 토큰은 리터럴 색이어야 한다(color-mix 금지).
- 구조: 떠 있는 상태 캡슐(`pt-status`로 콘텐츠 여백) + 떠 있는 pill 탭 바(`pb-tab`, 하늘 컨트롤은 `bottom-sky`) + 28px 유리 바텀 시트(하늘 위·반쯤일 때만 유리). 공용 프리미티브 `ui/Card.tsx`·`ui/Chip.tsx`·`ui/PillButton.tsx`·`ui/Toggle.tsx`·`ui/Segmented.tsx`.
- 야간 모드는 토큰 교체만(필터 hack 금지). 의미는 색 + 글리프/문구로.
- 세로 스크롤 영역은 `ui/ScrollArea.tsx`(D-022): 네이티브 터치 스크롤 + 마우스 드래그 스크롤(`ui/useDragScroll.ts`, 6px 임계값·축 고정·관성·드래그 직후 click 억제) + 아래쪽 페이드 오버레이(`fadeBottom`). 스크롤러에 `mask-image`를 걸지 않는다. 높이 제한 컨테이너는 훅만 붙인다. 드래그 스크롤이 닿으면 안 되는 영역은 `touch-action: none` 또는 `data-drag-scroll="off"`.

## 기록·콘텐츠·학습 통합 (T4/T6/T7 일부)

- 기록 쓰기는 db/repos/observations, 파생 상태는 logStore, UI 진입은 openObservationForm. blobs는 사진/스케치 별도 저장. DB v2는 인덱스 변경 없이 누락값만 보충(D-023). 기록 변경 이벤트가 하늘 MarkerLayer·검색·추천·통계·미션에 전파된다.
- content/schema와 content/crossCheck를 빌드/테스트에서 공유한다. build-content → content/v1/index.json과 항목 파일. loader는 본문을 요청할 때만 읽으며 항목 version 쿼리로 캐시를 구별한다. readProgress/TodayCard는 progress 테이블을 공유한다(D-024).
- learn/schema → build-learn → learn/v1/{paths,missions,badges,quiz,manifest}. 원본 구조 대조 후 실행 가능한 항목만 활성화한다. i18n/partials는 app/i18n에서 기본 리소스와 합친다.
- learn/runtime의 readLearning이 관측·읽음·시작 시각·체크리스트·응답에서 미션/배지를 파생한다. 미션 키는 ID+steps 해시. learn.attempt는 불변 응답, learn.sr는 덮어쓰는 복습 일정이며 같은 트랜잭션으로 저장한다. 시작 전 관측은 사용자가 연결을 선택한 경우만 사용한다.
- App에 ObservationFormHost/StoryHost/QuizHost/ToastHost를 하나씩 둔다. QuizHost는 관측 기록을 만들지 않는다. StoryView의 읽음도 명시적 버튼이다. 스크롤 영역은 ScrollArea, 그림 캔버스는 드래그 스크롤에서 제외한다.
- 백업은 관측/설정/학습과 blob을 함께 포함한다. 일괄 가져오기는 하나의 트랜잭션이며 실패 시 롤백한다. JSON 참조 ID 및 중복 정책은 db/exportImport에 모은다.
- T7 미완료: 전천 skyPick 판정/격리, 일별 복습 누적 상한, 영구 배지 이력/연출. T5 장비 실작업 증거는 D-029에서 연결했다. 기존 장문 콘텐츠 영어 번역과 JS 코드 분할은 후속이다.

## 배우기 탐색·퀴즈 여정과 지평선 (D-026·D-027)

- LearnScreen은 고정 제목/4개 메뉴 + ScrollArea. URL: #/learn?section=quiz|courses|stories|achievements, path/mission/chapter 선택. learnNavigation은 배우기 경로만 기억해 다른 탭의 hashchange가 복귀 위치를 덮어쓰지 않게 한다.
- QuizJourney는 stages.stageProgress의 unlocked/result를 표시한다. stageCatalog.json은 source에 포함되는 별도 버전 계약이며 질문 배열의 자동 정렬/재구성 금지. stageQuestions가 활성화/문항 버전을 검사하고 gradeStage가 전체 응답을 검증한다.
- QuizHost의 stage 요청은 고정 순서로 출제하며 일반 selectQuiz의 적응형 정렬과 분리된다. useLearnUiStore의 sessionId로 다음 스테이지/재도전 때 UI를 새로 만든다. recordStageAnswer가 잠금·순서·재전송을 검사하고 마지막 응답/복습/완료 이력을 함께 저장한다. readLearning은 로컬 완료 이력에서 단계별 최고점과 해제를 파생한다.
- 관측/미션·기존 퀴즈/SR·읽음·스테이지 기록은 서로 다른 progress 키를 쓴다. quiz는 observations를 만들지 않는다. DB/백업 형식 변경 없음. 온라인 순위/계정은 현재 없다.
- layerStore.showsBelowHorizon이 렌더/라벨/선택/마커를 일치시킨다. 지면은 opacity .28, 불투명 설정 우선. 셰이더 uShowBelowHorizon, 선의 uFadeBelowHorizon, BodyLayer 달 가시성으로 구현한다. below-horizon-hint는 viewStore의 중심 고도만 구독한다. 천문/관측 가시성 계산에는 영향 없음.

## 관측 코스·별길 가이드 (D-028·D-029)

- 코스 구분 `sky|observing`을 `stages.ts`에서 파생한다. 기존 단계는 명시적 track 없이 sky로 해석한다. observingStages.json의 새 ID 12개를 덧붙이되 nextStage/unlock/score는 코스별로 계산한다. `#/learn?track=observing`과 학습 복귀 상태를 지원한다. build-learn은 G5 구조 대조 후 독자 작성 60문항을 병합한다.
- TonightScreen은 추천/관측 조건/일정 패널을 나누고 기존 useTonight 결과를 공유한다. `equipmentProfile(telescopeStore.profile)`가 추천 계산 키와 ObjectSheet 계산 입력에 포함된다.
- `#/equipment`, `#/telescope?target=...&view=guide|align|finder|hop`는 지연 로드된다. App의 useHash가 동일 route의 목표 쿼리 변경도 반영한다. 진입 경로는 하늘 ◎/천체 상세/학습 미션, 장비 설정은 설정 메뉴에서도 가능하다.
- `telescopeOrientation.ts`는 기존 AR manager와 수명 주기를 공유하지 않는 상대 센서다. 30Hz 입력/65ms slerp/약16Hz 발행, 기기 물리 축 사용. 실제 상대 입력이 없으면 나침반으로 대체하지 않는다. 1.5초 중단 시 sessionId를 바꿔 이전 정렬을 무효화한다.
- `astro/pointing.ts`는 1/2별 yaw+장착축 정렬, 3번째 별 잔차, 경위/적도 차이·태양 근접 판정을 담당한다. 순수 함수는 합성 회전/노이즈/독립 좌표 테스트를 갖는다. 시간과 센서 freshness는 컴포넌트 외부 함수에서 읽는다.
- `telescopeStore`는 장비 프로필·FOV 표시·최근 정렬 참고값만 Dexie settings에 보존한다. 활성 정렬은 현재 sensor.sessionId/provider/profileKey가 모두 같아야 한다. 재실행 시 저장값을 적용하지 않는다. 장비 CRUD는 기존 repos와 선택 필드 추가를 사용해 DB v2 및 JSON 백업을 유지한다.
- `FovOverlay`는 sphere ring→실제 CameraController projection, `FinderChart`는 gnomonic chart→2D canvas다. `astro/finder.ts`는 상 방향·회전과 역투영을 제공한다. 차트 드래그는 미리보기 중심만 바꾸며 ScrollArea 드래그에서 제외한다. deep 팩은 chart 진입 때 지연 로드하고 9등급 한계를 표시한다.
- `astro/starHop.ts`는 실제 FOV 기반의 제한 탐색, `StarHop.tsx`는 단계별 확인과 하늘 경로를 담당한다. actual emitSkill(align1/align2/starhop/fovSetup)만 미션·배지 증거로 쓰고 시뮬레이션 정렬/스타호핑은 제외한다. 카메라 plate solving·GoTo 모터 제어는 없다.

## 모바일 앱 경로 (D-031)

`pnpm mobile:sync`는 Vite native 모드(`/`)로 만든 앱과 모든 데이터 팩을 Capacitor Android/iOS 프로젝트에 복사한다. PWA는 `/skylog/` 경로와 Workbox를 유지한다. 네이티브 앱은 SW 없이 포함된 데이터로 시작한다.

- `src/native/motion.ts`는 세션 토큰과 최초 샘플 시간 제한으로 네이티브 리스너를 관리한다. Android `SkylogMotionPlugin`과 iOS Core Motion 플러그인은 기기→ENU quaternion을 전달한다. 기존 `genericSensorToScene`가 AR의 화면 보정을 적용하고, 망원경은 보정 없는 물리 +Y를 쓴다.
- `src/native/OrientationProvider.ts`는 하늘 AR의 자북 provider다. `telescopeOrientation.ts`는 상대 provider를 사용한다. `pause` 후 별길 정렬은 무효가 되고, AR은 `resume`에서 다시 시작한다.
- GPS는 공식 Geolocation, 백업은 Filesystem Cache와 Share, 화면 유지와 Android 뒤로는 native bridge/App을 사용한다. 기록 DB v2는 그대로지만 PWA와 앱 사이에 저장 공간을 공유하지 않는다.
- `HOP_COURSES`는 고정된 대표 이정표, `curatedHop`은 위치각/거리/시야 수, `hopCourseProgress`는 courseId가 있는 실제 skill event와 관측 기록으로 코스 진행을 계산한다. `openTelescope`가 course를 해시에 전달한다.
- CI는 `mobile.yml`에서 Android AAB/lint/오프라인 계측, iOS arm64 컴파일을 검증한다. 서명 키는 로컬 저장소 밖에 둔다. 제출 절차는 `MOBILE-RELEASE.md`.

## beta.5 오늘 밤·달력·풍경

EventCalendar는 list/month/year UI를 분리하고 calendar.ts가 시간대 날짜·월 이동·날짜별 그룹·ICS 생성을 담당한다. useTonight의 분 경계/복귀 갱신과 CalendarBrowser 월 키로 현재 달을 따라간다. 코스는 theme/group 해시를 더하며 데이터 ID/진도를 바꾸지 않는다. HorizonLayer의 낮은 풍경 밴드에 공통 천구 투영을 적용하고 landscape.ts의 유효 불투명도를 지면·라벨·선택에 공유한다. 이미지·오프라인·설계 근거는 [개선 기록](TONIGHT-REFRESH.md).

## beta.6 풍경 합성

HorizonLayer의 지면 한 표면에서 meadow-v2 색을 혼합한 뒤 사용자/시선 alpha를 한 번 적용한다. 별도 meadowMesh는 제거했다. SkyProjection.attach 뒤에 groundMaterial.onBeforeCompile을 연결해 천구 투영을 보존한다. 동일 프레임의 유효 지면 불투명도/라벨/선택 정책은 유지한다. 상세는 LANDSCAPE-REFINEMENT.md. 향후 꾸미기/사진 서버는 COMMUNITY-AND-CUSTOMIZATION.md의 제안이며 현재 스키마를 바꾸지 않았다.

## 무료 꾸미기·커뮤니티(T9)

개인 꾸미기: src/personal의 정규화/보상과 features/personal의 독립 화면. 기존 progress 고유 키를 이용하며 DB/팩 버전은 유지한다. 온라인: src/community의 분리된 Supabase 클라이언트, features/community의 목록/상세/계정/운영 화면. 서버 마이그레이션과 Edge 함수는 supabase/. 전체 흐름·권한·실제 연결/개통 상태는 [FREE-COMMUNITY.md](FREE-COMMUNITY.md).

## beta.20 하늘·망원경·코스 (D-072, 이전 T5 구조를 갱신)

- SkyView의 상단 도구와 SkySettings가 카메라/일반 센서 설정을 맡고 하단에는 GPS 센서 전환을 둔다. ResizeObserver로 상단 도구 높이를 공유해 목표 칩을 배치한다. GPS는 관측 위치, 방향 센서는 자세라는 설명을 제공한다.
- `OrientationFilter.setViewport`는 시야각·픽셀과 왕복 움직임의 일관성으로 평활 강도를 조절한다. 일반 AR과 망원경 센서 모두 사용하며 줌 때 상태를 초기화하지 않는다. 네이티브 요청은60Hz, 망원경 필터는 모든 입력을 받고 UI 발행은 약30ms 간격으로 제한한다.
- 망원경 기본 경로는 `#/sky?scope=ObjectId`. TelescopeSkyGuide는 기존 SkyScene 하나에 `pointingCameraQuaternion`으로 물리 +Y를 카메라 -Z에 대응시킨다. 실제 안내 중 시각은 현재를 사용하고 시간 도구를 잠근다. guide FovOverlay는 중심 파인더·접안 원을 표시한다. 정렬/장비/보조 차트만 전역 탭 위 포털이며 일반 코스는 독립 ScreenFrame이다.
- 스타호핑은 `#/telescope?view=hop&course=기존ID`에 한정한다. HOP_COURSES의 밝은 이정표·한영 안내를 curatedHop으로 계산한다. 세션 체크포인트에 코스 ID·경로·FOV를 포함하며 기존 실제 완료 이벤트를 바꾸지 않는다. FinderChart는 기기 배율에 맞춘 캔버스와 이름 배치/연결선, 실제 파인더 원을 사용한다. `astro/starHop.ts` 자동 탐색은 보존하지만 코스 UI에서는 사용하지 않는다.
- 구현/검증/물리 확인 경계는 [build26 보고](SKY-REFINEMENT-BUILD26.md)를 따른다.

## 하늘 조작 최소화 (D-073, build27)

TabBar는 sky에서만 좌상단 아래꺾쇠로 접고 다른 콘텐츠 탭에서는 하단 이동을 유지한다. SkySettings 모달은 하늘/GPS/앱 탭으로 기존 LayerPanel/SettingsContent를 단일 ScrollArea에 넣는다. TimeBar는 우상단 아이콘과 팝오버, GPS는 하단 중앙, RearCameraControls는 일반 하늘 우하단이다. 센서 오류는 설정에만 표시한다. autoStart는 실행 중 상태이며 hydration은 이전 저장값을 무시하고 현재 실행의 선택을 보존한다. App의 layout effect가 CSS 테마를 먼저 적용한 뒤 SkyView가 팔레트를 읽는다.
