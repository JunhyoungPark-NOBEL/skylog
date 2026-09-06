# DECISIONS — 결정 기록 (ADR 요약)

형식: `D-번호 · 날짜 · 제목` → 맥락 / 결정 / 결과·영향. 새 결정은 아래에 추가하고, 번복하면 원 항목에 "→ D-xx로 대체" 표기.

## D-001 · 2026-09-06 · 플랫폼은 PWA
- 맥락: GPS·나침반·자이로가 필요하고, 빠른 반복 개발과 URL 배포가 중요.
- 결정: React + TypeScript + Vite + Three.js 기반 PWA. 네이티브 포장(Capacitor)은 보류(D9).
- 영향: 센서는 웹 API(DeviceOrientation/Generic Sensor)에 의존 → iOS 제약을 보정 기능으로 상쇄. HTTPS 배포 필수.

## D-002 · 2026-09-06 · 저장은 로컬 우선
- 결정: Dexie(IndexedDB) + JSON 내보내기/가져오기. 모든 레코드에 `updatedAt/deletedAt` 유지.
- 영향: 서버·로그인 없음. 동기화(T9)는 나중에 추가 가능.

## D-003 · 2026-09-06 · 천문 계산은 astronomy-engine, 렌더는 Three.js
- 대안: Stellarium Web Engine(AGPL, 임베드 시 라이선스 전염) / 직접 구현(정확도 위험).
- 결정: astronomy-engine(MIT) + 자체 WebGL 렌더러. 별은 J2000 단위벡터 버퍼 + 프레임당 회전행렬 1개.

## D-004 · 2026-09-06 · 데이터 소스
- 결정: HYG v4.4(별), d3-celestial(별자리 선·경계·은하수), OpenNGC(DSO). 모두 CC BY-SA/BSD. Stellarium 데이터·코드는 참고만.
- 영향: 앱 내 라이선스 고지 화면 필요(T0에 골격, T8에 완성).

## D-005 · 2026-09-06 · 망원경 가이드는 "수동 경위대식 push-to" 기본
- 맥락: 마운트 미정(SV48P는 OTA만). 현재는 쌍안경.
- 결정: 폰-경통 부착 + 별 정렬 방식 기본. 적도의(ΔHA/ΔDec)·GoTo(좌표 표시) 모드는 선택지로만. 전동 연동은 보류(D5).

## D-006 · 2026-09-06 · 콘텐츠는 정적 팩으로 선생성
- 결정: GPT Pro로 생성 → Claude 검증 → `public/data/content/v1/*.json` 커밋. 실시간 AI 호출은 보류(D2).
- 영향: 오프라인에서도 스토리 열람 가능, API 키 불필요.

## D-007 · 2026-09-06 · 개발 환경은 경로 A: Claude Code 로컬
- 결정: 데스크톱 앱 Code 탭에서 로컬 폴더(`~/dev/skylog` 등)를 열어 실행. 저장소는 GitHub 원격(push는 사용자 계정의 git 인증 사용). 폰 테스트는 GitHub Pages 배포 URL(T0a) 또는 `vite --host`.
- 모델: 기본 `fable`(Fable 5.1) + effort `high`. 수학·센서·데이터 파이프라인(T0b, T2, T5)은 `xhigh`. 단순 UI·문서·정리 작업은 `sonnet`으로 절약 가능. `max`는 기본 사용 안 함.
- **환경 정보 (2026-09-06, T0a 세션에서 확인)**
  - OS: Windows 11 Education 10.0.26200. 셸: PowerShell 5.1 + Git Bash. 프로젝트 폴더: `C:\Users\JunhyoungPark\OneDrive\Desktop\별관찰해쌀뚜` (Git 저장소 루트, GitHub 저장소 이름은 `skylog`).
  - Node v24.19.0 (winget `OpenJS.NodeJS.LTS`로 T0a에서 설치), npm 11.17.0, pnpm 12.3.4 (`npm i -g pnpm` — `corepack enable`은 Program Files 권한 문제로 실패), git 2.53.0, GitHub CLI 2.100.0 (winget `GitHub.cli`로 설치).
  - gh 로그인 계정: **`JunhyoungPark-NOBEL`** (keyring, https, scopes: repo·workflow·read:org·gist). 저장소 `JunhyoungPark-NOBEL/skylog`(public — 무료 계정 Pages 조건), Pages는 Actions 소스(`build_type=workflow`), URL https://junhyoungpark-nobel.github.io/skylog/.
  - 외부 다운로드: codeberg.org·raw.githubusercontent.com·registry.npmjs.org·svs.gsfc.nasa.gov·api.github.com 모두 접근 가능(T0b `data:fetch` 가능).
  - git 로컬 identity: `Junhyoung Park <jhpark@nobelab.kaist.ac.kr>` (저장소 로컬 설정). 줄바꿈은 `.gitattributes`로 LF 고정, `core.autocrlf=false`.
  - 주의: 프로젝트가 OneDrive 동기화 폴더 안에 있다. `node_modules`·`dist`가 동기화 대상이 되어 느려지거나 파일 잠금이 날 수 있으므로, 문제가 생기면 OneDrive 설정에서 이 폴더를 제외하거나 `C:\dev\skylog`로 옮긴다.

## D-008 · 2026-09-06 · 프로젝트 라이선스 (T0a에서 확정)
- 결정: 코드 MIT(`/LICENSE`, 저작권자 Junhyoung Park), `public/data/` 파생 데이터 팩 CC BY-SA 4.0(`/public/data/LICENSE`, HYG·OpenNGC 파생). 앱 내 "정보/라이선스" 화면은 `docs/DATA-LICENSES.md`를 그대로 렌더하며 Open-Meteo(CC BY 4.0)·7Timer 크레딧을 포함한다.
- 영향: GitHub 저장소는 public(무료 계정 Pages 조건)이어도 문제 없음.

## D-009 · 2026-09-06 · 계획 문서의 정본은 코드 저장소의 `plan/` (Claude Code 로컬 실행 기준)
- 맥락: 실행 도구를 Claude Code(데스크톱 Code 탭)로 확정. Claude Code 세션은 저장소 파일을 직접 읽으므로 저장소가 정본이어야 한다.
- 결정: 저장소 `plan/*`(STATUS·DECISIONS·task 프롬프트·research·reports)가 정본, `CLAUDE.md`가 읽기 순서를 지시. 갱신은 커밋. Claude 프로젝트 문서 사본은 초기 배포본·백업(태스크 종료 시 STATUS만 복사, 선택). 저장소 `docs/`는 코드 문서(ARCHITECTURE·DATA-LICENSES·TESTING·RELEASE).

## D-010 · 2026-09-06 · Dexie DB v1은 Task 0에서 생성, settings는 Dexie가 단일 진실 원천
- 결정: T0에서 10개 테이블(observations, bookmarks, sites, telescopes, eyepieces, binoculars, blobs, progress, settings, cache)을 v1으로 생성. zustand `settingsStore`는 persist storage 어댑터를 Dexie `settings`로 구현(localStorage 사용 안 함). T2(sites)·T3(bookmarks, cache)가 T4 전에 DB를 쓸 수 있다.
- 구현 메모(T0a): persist 어댑터는 스토어 전체를 한 행에 넣지 않고 **키마다 한 행**(`settings.theme`, `settings.lang`, …, `settings.__version`)으로 저장한다 → 다른 모듈·내보내기가 개별 설정을 그대로 읽는다. `sites.isDefault`는 Dexie가 boolean을 인덱싱하지 않으므로 `1 | undefined`로 저장.

## D-011 · 2026-09-06 · 라우팅은 해시 라우터(자체 구현)
- 대안: 탭 상태만(URL 없음) / react-router(history 모드).
- 결정: `src/app/router.ts`의 해시 라우터(`#/sky … #/debug/data`, `useSyncExternalStore`). 이유: GitHub Pages 하위 경로(`/skylog/`)에서 서버 설정 없이 새로고침·뒤로가기가 동작하고, PWA `start_url`이 고정되며, 의존성이 없다(초기 JS 예산).
- 영향: 상세 바텀 시트 등 화면 안 상태는 URL에 넣지 않는다(T3에서 필요하면 쿼리 형태로 확장).

## D-012 · 2026-09-06 · i18n은 i18next + react-i18next
- 결정: `src/i18n/ko.json`·`en.json`을 번들에 포함(오프라인), `initI18n(lang)`으로 부트스트랩, 언어는 `settingsStore.lang`이 원천. 천체 이름은 i18n 키가 아니라 카탈로그 `names.ko/en`(마스터 플랜 §6.6).
- 이유: 보간·복수형·네임스페이스가 표준적이고 React 통합이 안정적. 번들 비용(≈ 15KB gz)은 예산 안.

## D-013 · 2026-09-06 · 툴체인 버전 확정 (T0a)
- Vite 8.2.2(rolldown 기반) + `@vitejs/plugin-react` 6.1.1(플러그인이 rolldown-vite에서는 SWC 대신 자체 플러그인을 권장하므로 `plugin-react-swc` 대신 채택), React 19.2.8, TypeScript **6.0.3**(7.x는 typescript-eslint가 아직 미지원 `<6.1`), Tailwind CSS 4.3.3(`@tailwindcss/vite`, CSS-first `@theme inline`), Vitest 5.0.0(jsdom), Playwright 1.63.0, ESLint 10 + typescript-eslint 8.69, pnpm 12.3.4(`pnpm-workspace.yaml`의 `allowBuilds`로 esbuild 빌드 스크립트 허용), Dexie 4.4.5, zustand 5.0.15, three 0.185.1, astronomy-engine 2.1.19, i18next 26.4.2.
- `tsconfig`는 프로젝트 참조(`tsc -b`: app/node). 경로 별칭 `@/` → `src/`. `noUncheckedIndexedAccess`·`verbatimModuleSyntax` 켬.
- CI(`deploy.yml`)는 typecheck → lint → test → build → Pages. e2e(Playwright)는 로컬 전용(브라우저 설치 시간·CI 비용). 필요해지면 별도 잡으로 추가.

## D-014 · 2026-09-06 · 데이터 팩 v1 포맷·ID 규칙 확정 (T0b)
- 원본: HYG **v4.4**(`hyg_v44.csv.gz`, codeberg Git LFS → `media/` 엔드포인트), OpenNGC `NGC.csv`+`addendum.csv`, d3-celestial 별자리 3종. 은하수 텍스처는 T1에서 결정(NASA SVS milkyway_* 또는 d3-celestial `mw.json`).
- 별 팩: 헤더 16B + 레코드 28B(J2000 단위벡터 f32×3, mag, bv, hip, hygId), 등급 오름차순. bright ≤ 6.5(8,920개, 244KB), deep ≤ 9.0(83,476개, 2.3MB). 인코더/디코더는 `src/catalog/starPackFormat.ts` 한 곳(스크립트·앱 공유).
- `stars-bright.v1.json`(이름/메타 별 3,171개)에 **ra/dec(J2000 도)를 추가**(계획 포맷에 없던 필드) — 팩 없이도 검색·상세·출몰 계산이 좌표를 쓰기 위함.
- DSO id: M > NGC > IC. NGC/IC가 없는 유명 천체는 **`dso:C<n>`(콜드웰)·`dso:B<n>`(바너드)** 허용(`ObjectId` 타입·정규식 확장): C9 동굴성운, C14 이중성단(쌍; NGC869/884는 별칭 C14만), C41 히아데스, C99 석탄자루, B33 말머리.
- **M102 = NGC 5866**(OpenNGC는 M101 중복으로 처리하지만 관행을 따름), M73은 OpenNGC 타입 'Other'지만 메시에라서 포함. OpenNGC `Dup` 행은 마스터의 별칭으로 흡수(C37→NGC6882, C50→NGC2239).
- 포함 규칙: 메시에 110 + 콜드웰 109 + (V ≤ 10 또는 B ≤ 10.8 또는 공통 이름 또는 한글 이름) → 661개. `*`(단일 별)·`NonEx`·`Nova` 제외.
- 검색 정규화: NFC → 소문자 → 공백·하이픈·밑줄·점·따옴표·가운뎃점·괄호 제거. 그리스 문자 별칭은 α/alpha/Alp/알파 4종. 클라이언트도 같은 함수를 써야 한다(T3에서 `src/catalog/search.ts`로 이식).
- 별자리 한글: 한국천문학회 표기 우선(백조자리·헤르쿨레스자리·**작은여우자리**). d3-celestial ko와 다른 항목은 빌드 로그에 표시.
- 기준 표: `tests/fixtures/reference-altaz.json` — JPL Horizons(대전 2026-09-06 21:00 KST, airless) 토성·목성·달·화성. astronomy-engine과 RA/Dec·alt/az ≤ 0.1° 일치 확인.

## D-015 · 2026-09-06 · astronomy-engine 래퍼 경계와 씬 행렬 규약 (T0b)
- `Horizon`/`DefineStar`/`Constellation`은 `src/astro/frames.ts`·`events.ts` 안에서만 호출. 바깥 API는 도(deg)·J2000. `Horizon`의 굴절 인자는 타입상 `string | undefined`이므로 "굴절 없음"은 `undefined`로 넘긴다.
- `eqjToSceneMatrix()`는 기저 벡터를 `RotateVector`로 돌려 열을 만든다(엔진의 행렬 관례에 비의존). 반환은 **column-major Float32Array(9)** → `THREE.Matrix3.fromArray`/GLSL `mat3` 그대로.
- 굴절은 Sæmundsson(참→겉보기)을 CPU(`refraction.ts`)와 GLSL(`render/shaders/refraction.glsl`) 두 곳에 동일하게 둔다. 값을 바꾸면 둘 다.
- 출몰 해석식은 검증·근사 전용. 실제 표시는 astronomy-engine 검색 함수.

## D-016 · 2026-09-07 · G2(한국어 이름 표) 병합 규칙
- 맥락: GPT Pro G2 산출물(`plan/research/`: 별 233행·별자리 88·DSO 66·콜드웰 109·28수 표·검토 메모)이 도착. 콜드웰 NGC/IC 대응은 T0 큐레이션과 **109개 전부 일치**(독립 출처 2개 합치 → 검증 완료로 간주).
- 결정(`scripts/data/merge-g2.ts`, 재실행 가능):
  - 별자리: G2(한국천문학회 용어표, confidence high) 우선 → **허큘리스자리, 여우자리**로 교정(T0의 헤르쿨레스자리·작은여우자리는 폐기). 계절 분류도 G2.
  - 별: 기존 통용 표기(아르크투루스 등)를 표시명으로 유지, G2의 Stellarium 번역 표기(아크투루스 등)는 새 `aliases_ko` 컬럼에 검색 별칭으로. 전통 이름은 유명한 것(직녀성·견우성·북극성·천랑성·노인성)을 우선하고 G2의 28수 역할명(왕랑, 대장 등)은 보조. "…의 구성별"(성군 그룹 관계)은 데이터에 남기되 **검색 별칭에서 제외**. G2에만 있는 120개 별 추가 → 큐레이션 240행.
  - DSO: 기존 붙여쓰기 표기(안드로메다은하) 유지, G2 띄어쓰기·대체 이름은 `alt_names_ko`. 새 id 9개(M77, M102, NGC40, NGC1275, NGC1499, NGC3132, NGC4038/4039, IC2118) 추가.
  - `needs_review`: confidence low 또는 한글 이름 빈칸만 true. 나머지는 편집 검토 완료로 본다(음역 미세 조정은 T8).
- 보류: Naga/HIP64962, Bade(HIP 충돌)는 G2 메모대로 제외. 28수 표는 A7(전통 별자리 오버레이) 때 사용 — Stellarium korean 자료는 GPL v2이므로 **선 연결 데이터는 복사하지 않고** 기준별·이름 표만 참고.
