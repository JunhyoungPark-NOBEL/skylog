# Task 0 — 프로젝트 셋업 · 데이터 파이프라인 · 배포 기반

> 실행 전 읽기: `plan/00-master-plan.md`(특히 §4~§8), `plan/STATUS.md`, `plan/DECISIONS.md`
> 예상 분량: **세션 2개** — **T0a**(저장소·툴체인·셸·테마·i18n·DB v1·PWA·CI/배포·테스트 하네스·문서 골격)와 **T0b**(데이터 파이프라인·데이터 팩 v1·`src/astro`·검증). 한 세션에 둘 다 끝나면 좋지만, 끝나지 않으면 **T0a 완료 시점이 절단선**이다(STATUS에 "T0a 완료, T0b 대기"로 기록). 태그 `task-0-done`은 둘 다 끝난 뒤에만.
> 이 태스크의 품질이 이후 8개 태스크의 속도를 결정한다. 서두르지 말 것.

## 0. 세션 시작 절차

1. STATUS를 읽고 T0가 진행 중이었는지 확인한다(진행 중이면 "다음 할 일"부터 이어서).
2. **개발 환경 확인**(경로 A: Claude Code 로컬로 확정, D-007). 확인할 것: `node -v`(≥ 20), `pnpm -v`(없으면 `corepack enable`), `git`, 저장소 push 가능 여부(`git remote -v`, `git push --dry-run`). 경로 B라면 사용자 사전 준비(빈 저장소, PAT **Contents+Workflows** 권한, Pages Source=GitHub Actions)가 되었는지 확인. push가 불가능하면 코드는 작성하되 **사용자에게 저장소 접근 방법을 먼저 요청**하고 결과를 D-007로 기록한다.
3. 외부 다운로드 가능 여부를 초기에 확인(`curl -I https://codeberg.org`, GitHub raw). 막혀 있으면 §3.3의 "원본 수동 업로드" 경로를 사용자에게 안내하고 T0a부터 진행한다.
4. 실행 계획을 짧게 제시하고 바로 시작한다. 이 프롬프트의 §3 MUST 항목을 T0a(1·2·5·6) → T0b(3·4) 순서로 처리한다.

## 1. 목표

완성 시 상태: `pnpm dev`로 뜨는 **빈 하늘 화면 + 5개 탭 셸의 PWA**가 있고, `public/data/`에 **별·별자리·DSO·검색 인덱스 데이터 팩 v1**이 재현 가능한 스크립트로 빌드되어 있으며, `main`에 push하면 **GitHub Pages(HTTPS)** 로 자동 배포되어 폰에서 열 수 있다. 천문 계산의 뼈대(`src/astro`)와 테스트 기반이 갖춰져 있다.

## 2. 범위

- In: 저장소 골격, 툴체인, 테마 토큰(다크/적색), i18n 골격, 상태 스토어 골격, Dexie 스키마(타입만 실제 사용, UI 없음), 데이터 빌드 스크립트 + 팩 v1, `src/astro` 핵심 순수 함수 + 테스트, PWA 설정, CI/CD + Pages 배포, 문서.
- Out: 실제 하늘 렌더링(T1), 센서(T2), 검색 UI(T3) 등. 이 태스크에서 하늘을 그리려 하지 말 것 — 단, 데이터가 올바른지 확인하는 **디버그 페이지**(`/debug/data`: 별 개수, 별자리 목록, DSO 목록 표)는 만든다.

## 3. 요구사항

### MUST

1. **저장소·툴체인**
   - `pnpm create vite` (React + TypeScript, SWC). 패키지: `react`, `react-dom`, `three`, `@types/three`, `astronomy-engine`, `zustand`, `dexie`, `i18next` + `react-i18next`(또는 동급의 가벼운 대안), `tailwindcss`, `vite-plugin-pwa`, `vitest`, `@playwright/test`, `eslint`, `prettier`, `tsx`(데이터 스크립트 실행용).
   - `tsconfig` strict, 경로 별칭 `@/` → `src/`. 스크립트: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `data:fetch`, `data:build`, `data:validate`.
   - `.editorconfig`, `.gitignore`(`node_modules`, `dist`, `data-src/raw/`), `.nvmrc`.
   - 마스터 플랜 §6.4 디렉터리 구조를 그대로 만든다(빈 폴더에는 `README.md` 한 줄).

2. **앱 셸**
   - 모바일 우선 레이아웃: 상단 얇은 상태 바(위치명·시각·센서 상태 자리), 중앙 `SkyView` 자리(지금은 검은 캔버스 + "Task 1에서 렌더링"), 하단 탭 5개(하늘/검색/오늘 밤/기록/배우기), 설정 아이콘. 라우팅은 해시 라우터 또는 탭 상태(선택 근거를 DECISIONS에).
   - **테마 토큰**: `src/app/theme.css`에 `--bg`, `--fg`, `--muted`, `--accent`, `--danger`, `--overlay` 등 정의. `html[data-theme="night"]`에서 모든 토큰이 적색 계열(`#ff3b30`/`#7a1010`/검정)로 바뀐다. 렌더러용 팔레트도 같은 파일의 토큰을 JS에서 읽어 쓰도록 `getPalette()` 헬퍼 제공. 설정에 "야간 모드" 토글이 실제로 동작해야 한다.
   - **i18n**: `ko.json`(기본)/`en.json`, 탭 이름·설정 문구부터 키로. 언어 전환 토글 동작.
   - **Wake Lock** 유틸(`sensors/wakeLock.ts`): 요청·해제, 미지원 시 no-op. 설정 토글로 확인.
   - **Dexie DB v1**(`db/database.ts`, D-010): 마스터 플랜 §6.3의 10개 테이블과 타입을 전부 정의(인덱스 포함). 리포지토리는 `settings`·`cache`·`sites`용 최소 함수만(나머지는 T4). `fake-indexeddb`로 스키마 생성 테스트.
   - 상태 스토어 골격(`state/`): `clockStore`(mode realtime/manual, offsetMs, rate, `now()`), `locationStore`(site, source gps/manual, accuracy), `viewStore`(centerAltAz, fovDeg, mode manual/sensor), `selectionStore`, `settingsStore`(theme, lang, units… — zustand `persist`의 storage를 **Dexie `settings` 테이블 어댑터**로 구현, localStorage 사용 금지; 하이드레이션 완료 전 짧은 스플래시). 아직 UI는 최소.

3. **데이터 파이프라인** (`scripts/data/*.ts`, `pnpm data:fetch` → `data-src/raw/`, `pnpm data:build` → `public/data/`, `pnpm data:validate`) — **T0b**
   - **원본 확보**: `fetch.ts`가 codeberg `astronexus/hyg`의 `data/hyg/CURRENT/` 디렉터리를 나열해 `hyg_v4*.csv.gz` 중 최신 파일을 받고(파일명·크기·행 수·SHA-256을 `manifest.v1.json`에 기록), OpenNGC(`NGC.csv`, `addendum.csv`), d3-celestial 데이터 3종, (은하수 텍스처 선택 시) NASA SVS 파일을 받는다. **네트워크가 막히면**: 필요한 파일 목록과 URL을 사용자에게 주고, 사용자가 업로드한 파일을 `data-src/raw/`에 두는 것으로 대체(스크립트는 이미 있는 파일을 재사용).
   - **별**: 태양(id 0) 제외. RA 시간→도. 두 팩:
     - `stars-bright.v1.bin`: `mag ≤ 6.5`. 레코드 **28바이트** little-endian: `x,y,z(f32, J2000 단위벡터), mag(f32), bv(f32, 결측 시 0.6), hip(u32, 없으면 0), hygId(u32)`. 헤더 16바이트(`'SKYS'`, version u16, count u32, reserved). ObjectId는 `hip>0 ? star:HIP<hip> : star:HYG<hygId>`. 예상 ≈ 9천 개 / ≈ 255KB.
     - `stars-deep.v1.bin`: `mag ≤ 9.0` (같은 포맷, 지연 로드용). 크기를 보고하라(≈ 3MB 예상).
     - `stars-bright.v1.json`: 이름/메타가 있는 별만 `{id, hip, hygId, en?, ko?, traditionalKo?, aliasesKo?: string[], bayer?, flam?, con, spect?, distLy?, mag}` 배열. `bayer`는 그리스 문자 그대로("α") + 라틴 약어("Alp")도 alias에 포함.
   - **별자리**: d3-celestial `data/constellations.json`(이름·라벨 위치), `constellations.lines.json`, `constellations.bounds.json`. 출력 `constellations.v1.json`: `{ [iau3]: { en, ko, genitive?, label:[raDeg, decDeg], lines: [[[ra,dec],...],...], bounds: [[ra,dec],...] } }`. RA는 0..360으로 정규화. 88개 전부 있어야 한다. 파일별 출처·라이선스를 `DATA-LICENSES.md`에 개별 기록.
   - **DSO**: OpenNGC `NGC.csv` + `addendum.csv`(**세미콜론 구분**). 파싱 규칙: 이름의 0 채움 제거(`NGC0224`→`NGC224`, `IC0434`→`IC434`), `M` 컬럼(`031`)→`M31`, 타입 `Dup`(중복)·`NonEx`(존재하지 않음)·`Other`는 제외, M40·M45는 addendum의 비-NGC 이름으로 들어오므로 `M` 컬럼 기준으로 id를 `dso:M40`·`dso:M45`로 정한다. 정규 id 우선순위 M > NGC > IC(마스터 플랜 §6.1). 포함 규칙: 메시에 110개 전부 + 콜드웰 109개(`caldwell.csv`) + 그 외 `V-Mag ≤ 10` 또는 공통 이름이 있는 객체. 타입 코드는 OpenNGC 것을 유지하되 앱용 대분류 `category: 'galaxy'|'openCluster'|'globularCluster'|'planetaryNebula'|'nebula'|'supernovaRemnant'|'other'`를 추가. 출력 `dso.v1.json`: `[{id, aliases[], names:{en?, ko?, aliasesKo?: string[], common[]}, type, category, ra, dec, mag?, majAxArcmin?, minAxArcmin?, posAngDeg?, con, distLy?}]`.
   - **큐레이션 표**(`data-src/curated/`, 커밋) — **컬럼은 GPT Pro G2 산출물과 동일하게** 맞춰 나중에 그대로 병합한다:
     - `star-names-ko.csv`: `hip, iau_name_en, name_ko, traditional_ko, note, source, confidence, needs_review` — 시리우스·베가(직녀성)·알타이르(견우성)·데네브·북극성·아르크투루스·스피카·안타레스·베텔게우스·리겔·카펠라·알데바란·프로키온·폴룩스·카스토르·레굴루스·포말하우트·카노푸스·알골·미자르·알코르 등 **최소 60개**를 세션 지식으로 채우고 `needs_review=true`.
     - `constellations-ko.csv`: `iau_abbr, name_en, name_ko, genitive_en, season_kr, note, source, confidence, needs_review` — 88개 표준 한글 이름.
     - `dso-names-ko.csv`: `id, name_en, name_ko, alt_names_ko, note, source, confidence, needs_review` — 오리온 대성운, 안드로메다 은하, 플레이아데스(좀생이별), 프레세페, 헤르쿨레스 대성단, 고리 성운, 아령 성운, 게 성운, 삼렬성운, 독수리 성운, 이중성단, 오메가 성운, 라군 성운, 솜브레로 은하, 바람개비 은하, 삼각형자리 은하 등 ≥ 40개.
     - `caldwell.csv`: `caldwell, ngc_ic, name_en, name_ko, type, source, confidence, needs_review` — 109개.
     - `meteors.csv`: 주요 유성우 ≥ 12개(이름 ko/en, 활동 기간, 극대일(월-일), ZHR, 복사점 RA/Dec, 모천체).
     - `content-targets.v1.csv`: `id, priority(1~3), reason` — T6 콘텐츠 대상 약 120개(행성·달·태양 9, 밝은 별 31, 별자리 30, DSO 50; 목록 초안은 `task-06` §3.2). **G3(콘텐츠 생성)의 입력**이므로 T0에서 만든다.
   - **G3용 카탈로그 값 내보내기** `export-catalog-values.ts` → `data-src/content-raw/catalog-values.v1.csv`: `content-targets`의 각 id에 대해 `id, names(en/ko), ra, dec, mag, distLy, spect, sizeArcmin, con, type` — GPT Pro가 수치를 카탈로그와 맞추는 데 쓴다.
   - **검색 인덱스** `search-index.v1.json`: 모든 대상(별 이름 있는 것, DSO 전체, 행성·달·태양, 별자리)에 대해 `{id, kind, con?, mag?, n:[정규화된 별칭들]}`. 한글 이름·전통 이름·`aliasesKo`를 모두 포함. 별칭 정규화 규칙(문서화): 공백·하이픈 제거, 소문자, "M 31"="M31", "NGC 224"="NGC224", 그리스 문자 ↔ 라틴 표기, 한글은 그대로(공백 제거 버전도 추가).
   - **유성우** `meteors.v1.json`, **행성 메타** `bodies.v1.json`(이름 ko/en, astronomy-engine Body 이름, 아이콘 키, 행성 7개 + 달 + 태양).
   - `data:validate`가 검증 리포트를 출력: 등급 구간별 별 개수, 이름 있는 별 수, 별자리 88개 여부와 ko 누락, 메시에 110 존재 여부(누락 목록), 콜드웰 존재 여부, 좌표 범위, 중복 id, 파일 크기, content-targets id가 카탈로그에 존재하는지. 실패 조건이면 non-zero exit.
   - `docs/DATA-LICENSES.md`: **파일 단위** 출처 URL, 버전/해시, 라이선스, 요구되는 고지 문구(Open-Meteo CC BY 4.0, 7Timer 크레딧 포함). 앱 설정에 "정보/라이선스" 화면 골격(이 문서를 그대로 렌더). 저장소 `LICENSE`(MIT)와 `public/data/LICENSE`(CC BY-SA 4.0) 생성 → D-008.

4. **천문 계산 뼈대** `src/astro/` (순수 함수, 모두 Vitest) — **T0b**
   - **공통 규칙(마스터 플랜 §6.2)**: astronomy-engine의 RA-hours·EQD 입력 함수(`Horizon`, `DefineStar`, `Constellation`)는 반드시 이 디렉터리의 래퍼를 통해 호출한다. 래퍼는 도(deg)·J2000을 받아 내부에서 `Rotation_EQJ_EQD(time)` + `RotateVector`로 of-date로 바꾸고 RA를 /15 한다.
   - `time.ts`: `toAstroTime(date)`, `julianDate`, `localSiderealTime(time, lonDeg)`(astronomy-engine `SiderealTime` 사용).
   - `coords.ts`: `raDecToUnitVector(raDeg, decDeg)`, `unitVectorToRaDec(v)`, `altAzToScene(altDeg, azDeg)`, `sceneToAltAz(v)`, `angularSeparation(a, b)`, `wrap360`, `wrap180`.
   - `frames.ts`: `eqjToSceneMatrix(time, observer): Float32Array(9)` — `Astronomy.Rotation_EQJ_HOR(time, observer)` 결과에 HOR→씬 치환(마스터 플랜 §6.2)을 곱한 3×3. **테스트**: 무작위 별 50개에 대해 빠른 경로(행렬) vs 느린 경로(`Rotation_EQJ_EQD(time)` → `RotateVector` → RA/Dec(of date) → `Horizon(time, observer, raHours, decDeg, null)`; 굴절 없음)의 alt/az 차이 ≤ 0.01°. 불변량 테스트: 북극성 alt ≈ 위도(±1°); 태양 남중 시각(`SearchHourAngle(Body.Sun, observer, 0, date)`)에 태양 az = 180°(±0.5°) — 시계 정오가 아님(대전은 ≈12:30 KST 남중); 6월 남중 고도 ≈ 90 − 36.37 + 23.4 ≈ 77°(±0.5°).
   - `bodies.ts`: 행성·달·태양의 apparent RA/Dec(of date)·alt/az(굴절 포함)·등급·각지름·거리, 달 위상(`MoonPhase` 0..360°, `Illumination`), 밝은 가장자리 위치각.
   - `events.ts`: 임의 대상의 출·남중·몰 시각. 행성·달·태양은 `SearchRiseSet`/`SearchHourAngle`; 별·DSO는 래퍼 `withStar(raDeg, decDeg, fn)`가 `DefineStar(Body.Star1, raHours, decDeg, distLy ?? 1000)`를 **질의마다 재정의**한 뒤 같은 API를 호출(슬롯 8개뿐이므로 객체마다 정의 금지). 검증용 해석식(cos H = (sin h − sin φ sin δ)/(cos φ cos δ), h = −0.5667°)도 구현해 두 결과가 ±2분 안에 일치하는지 테스트. 박명은 `SearchAltitude(Body.Sun, observer, ±1, date, 1, −6|−12|−18)`; 월출·월몰은 `SearchRiseSet(Body.Moon, …)`.
   - `refraction.ts`: Bennett(겉보기 고도→굴절, 0°에서 ≈ 34′)과 Sæmundsson(참 고도→굴절, 0°에서 ≈ 29′). 테스트 값 포함. **같은 Sæmundsson 식을 GLSL 청크(`render/shaders/refraction.glsl`)로도 제공**해 T1의 모든 레이어가 동일한 굴절을 쓰게 한다.
   - `visibility.ts`: Bortle→맨눈 한계등급(1:7.6, 2:7.1, 3:6.6, 4:6.2, 5:5.6, 6:5.1, 7:4.6, 8:4.1, 9:3.6 정도의 표, 출처 주석), 달 밝기·고도 보정, 망원경 한계등급 ≈ `2 + 5·log10(구경mm)`(보수적 표현으로 문서화), 분해능(도스 한계 116/구경mm 초).
   - `optics.ts`: 배율 = 망원경 FL / 접안렌즈 FL, 실시야 = 겉보기시야/배율, 사출동공, 쌍안경 시야.
   - 모든 함수에 짧은 JSDoc + 출처(Meeus 장, astronomy-engine 문서 링크).

5. **PWA·배포**
   - `vite-plugin-pwa`: manifest(이름 "별관찰해쌀뚜", short_name, 아이콘 192/512(임시 SVG→PNG 생성), `display: standalone`, `orientation: portrait`, 테마색 검정), `registerType: 'autoUpdate'`, 앱 셸 + `stars-bright`·`constellations`·`dso`·`search-index` 프리캐시, `stars-deep`·`content/*`·날씨 API는 런타임 캐시(StaleWhileRevalidate / NetworkFirst).
   - GitHub Actions `deploy.yml`: push(main) → install → typecheck → lint → test → build → `actions/deploy-pages`. Vite `base`는 저장소 경로(`/<repo>/`)로, 환경변수로 덮어쓸 수 있게.
   - 배포 URL을 README·STATUS에 기록. 사용자가 폰에서 열어 "홈 화면에 추가"가 되는지 확인 요청.

6. **테스트 기반**
   - Vitest 설정(`tests/unit`), Playwright 설정(`tests/e2e`): 모바일 뷰포트 Pixel 7 에뮬레이션, `timezoneId: 'Asia/Seoul'`, `locale: 'ko-KR'`, Chromium 인자 `--use-angle=swiftshader --enable-unsafe-swiftshader`(헤드리스 WebGL), 프리인스톨 Chromium 사용(클라우드 환경이면 `PLAYWRIGHT_BROWSERS_PATH` 유지, 새로 설치하지 말 것). 스모크: 앱 로드 → 탭 5개 표시 → `/debug/data`에서 별 개수 > 8000, 별자리 88, 메시에 110 → 콘솔 에러 0. 스크린샷을 `tests/e2e/__screenshots__/`에 저장하고 **세션이 Read로 직접 확인**한다.
   - 디버그 HUD(`ui/DebugHud.tsx`, 설정에서 켬): fps(rAF 기반), 프레임 시간, draw call 수(T1에서 채움). 이후 모든 성능 수용 기준은 이 HUD 값으로 측정한다.

### SHOULD

- `docs/ARCHITECTURE.md`(마스터 플랜 §4·§6 요약 + 데이터 포맷 명세), `docs/TESTING.md`(실기기 테스트 절차 템플릿), `README.md`(설치·스크립트·배포).
- 데이터 스크립트가 **결정론적**(같은 입력 → 같은 바이트)이며, 원본 파일의 SHA-256을 `public/data/manifest.v1.json`에 기록(팩 이름, 버전, 크기, 레코드 수, 생성일, 원본 해시).
- 별 팩 로더(`catalog/starPack.ts`)와 간단한 벤치(로드 시간 로그).

### COULD

- 한글 초성 검색용 별칭(예: "ㅇㄷㄹㅁㄷ")을 인덱스에 추가.
- AT-HYG v3(Gaia DR3 거리)로 거리값만 갱신하는 옵션.

## 4. 기술 사양 메모

- HYG CSV 주요 필드: `id, hip, hd, hr, gl, bf, proper, ra(h), dec(deg), dist(pc; 100000=미상), pmra, pmdec, rv, mag, absmag, spect, ci(B−V), x,y,z, …, bayer, flam, con, comp, var…`. `con`은 3글자 약어. `bf`는 "21Alp And" 같은 Bayer/Flamsteed 문자열.
- d3-celestial GeoJSON: `MultiLineString`, 좌표 `[ra(−180..180), dec]`, `id`는 IAU 3글자. `constellations.json`의 `properties`에 `name`, `desig`, `gen`(소유격), `rank`, `display`(라벨 위치) 등이 있음 — 실제 필드는 실행 시 확인.
- OpenNGC 좌표는 `HH:MM:SS.SS`/`±DD:MM:SS.S` 문자열 → 도로 변환. `M` 컬럼이 메시에 번호, `NGC`/`IC` 컬럼이 교차 참조, `Common names`는 `,` 구분.
- 큰 파일 다운로드는 `data:fetch`에서만(재시도·캐시), 빌드는 오프라인에서도 되게 `data-src/raw/`를 사용.
- 바이너리 팩은 `fetch → ArrayBuffer → DataView` 파싱, 브라우저에서 gzip은 서버(Pages)가 처리하므로 별도 압축 불필요.

## 5. UI/UX 지침 (이 태스크 범위)

- 셸은 최종 레이아웃을 흉내 내되 장식은 최소. 탭 아이콘은 인라인 SVG(외부 아이콘 폰트 금지).
- 야간 모드 전환 시 흰색이 남는 곳이 없어야 한다(스크린샷으로 확인).

## 6. 수용 기준

**T0a**
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` 모두 통과, 콘솔 에러 0.
- [ ] 야간 모드·언어 전환·Wake Lock 토글 동작(스크린샷 2장: 기본/야간). Dexie v1 스키마 생성 테스트, settings가 Dexie에 저장되는지 테스트.
- [ ] GitHub Pages 배포 성공, URL을 STATUS에 기록(불가 시 사유·대체 안내). 사용자 폰 설치 확인은 "사용자 액션" 항목으로.
- [ ] Playwright 스모크(타임존·SwiftShader 설정 포함) 통과, 디버그 HUD 표시.
- [ ] 문서 골격(README, ARCHITECTURE, DATA-LICENSES(빈 표), TESTING), `LICENSE`, `public/data/LICENSE`, DECISIONS D-007·D-008 기록.

**T0b**
- [ ] `pnpm data:fetch`(또는 수동 업로드) → `pnpm data:build && pnpm data:validate` 통과, 리포트에 별(≤6.5) ≥ 8,000 / 별자리 88(ko 100%) / 메시에 110 / 콜드웰 ≥ 100 / DSO 총 ≥ 300 / content-targets 120±10 모두 카탈로그에 존재.
- [ ] `stars-bright.v1.bin` ≤ 400KB, 초기 JS(gzip) ≤ 500KB(리포트 첨부). `manifest.v1.json`에 원본 파일명·해시.
- [ ] `src/astro` 테스트: 빠른 경로 vs 느린 경로 ≤ 0.01°, 태양 남중 불변량, 출몰 해석식 vs astronomy-engine ±2분, 박명(`SearchAltitude`), 굴절·한계등급·광학 계산 기대값.
- [ ] `catalog-values.v1.csv`(G3 입력) 생성, `DATA-LICENSES.md` 파일 단위 표 완성.
- [ ] 태그 `task-0-done`.

## 7. 테스트

- 자동: 위 명령들 + Playwright 스모크(스크린샷 확인 포함).
- 실기기(사용자에게 요청): ① 배포 URL 접속·설치 ② 야간 모드 확인 ③ 언어 전환 ④ 오프라인(비행기 모드)에서 재실행되는지.

## 8. 산출물 & 인수인계

- 완료 보고(마스터 플랜 §9.2) + 저장소 `plan/STATUS.md`(링크·상태·다음 세션이 알아야 할 것) + `plan/DECISIONS.md`(D-007 개발 환경, D-008 라이선스, 라우팅 방식, i18n 라이브러리, 팩 포맷 확정).
- 다음 태스크(T1)가 바로 쓸 수 있도록: 별 팩 로더 API 시그니처, `eqjToSceneMatrix` 사용 예시, 공용 GLSL 굴절 청크 사용법을 ARCHITECTURE에 적어 둔다.
- 사용자 액션: GPT Pro **G2**(한국어 이름 표) 실행 권고 — T0의 `needs_review` 항목을 T6 전에 정리하기 위함. T0b가 끝나면 **G3**(콘텐츠 생성)에 필요한 `content-targets.v1.csv`·`catalog-values.v1.csv`를 사용자에게 전달.
- 마스터 플랜 §8(b)의 **기준 표**가 아직 없으면 사용자에게 요청: Stellarium에서 대전 2026-09-06 21:00 KST 기준 토성·목성·달·베가·알타이르의 고도/방위(또는 세션이 JPL Horizons API로 직접 받아 `tests/fixtures/reference-altaz.json`에 저장).

## 9. 주의/금지

- Stellarium 소스코드·데이터 파일을 복사하지 말 것(참고만). 라이선스가 불명확한 데이터는 쓰지 말 것.
- 데이터 팩 포맷을 나중에 바꾸면 모든 태스크가 흔들린다. 포맷은 `manifest`에 버전을 두고, 변경 시 버전을 올린다.
- 별을 "예쁘게" 그리는 데 시간 쓰지 말 것(T1). 한 세션 안에 끝나지 않으면 STATUS에 "진행 중 + 정확히 어디까지"를 남기고 멈춘다.
