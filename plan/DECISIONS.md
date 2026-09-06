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
  - gh 로그인 계정: **미로그인** — 사용자가 `gh auth login`을 실행한 뒤 저장소 생성·Pages·push를 진행한다(다음 세션에서 계정명 기입).
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
