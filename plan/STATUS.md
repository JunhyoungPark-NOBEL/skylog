# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-07 · 갱신자: T0 세션(Claude Code 로컬)
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- GitHub 저장소: https://github.com/JunhyoungPark-NOBEL/skylog (public, main)
- 배포 URL (GitHub Pages): **https://junhyoungpark-nobel.github.io/skylog/** (Actions 소스, `main` push마다 자동 배포)
- Actions: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/deploy.yml
- 개발 환경 경로: **A(Claude Code 로컬) 확정** — D-007. 로컬 폴더 `C:\Users\JunhyoungPark\OneDrive\Desktop\별관찰해쌀뚜`.

## 태스크 현황

| 태스크 | 상태 | 완료일 | 태그 | 비고 |
|---|---|---|---|---|
| T0a 저장소·셸·테마·i18n·DB v1·PWA·배포·테스트 하네스 | ✅ 완료 | 2026-09-06 | | 첫 배포 워크플로 성공, Pages URL 200 확인 |
| T0b 데이터 파이프라인·데이터 팩 v1·`src/astro`·G3 입력 | ✅ 완료 | 2026-09-07 | task-0-done | 별 8,920/83,476 · 별자리 88 · DSO 661(M110·C109) · astro 테스트 30개 |
| T1 천구 렌더러 | ⬜ 대기 | | | 기준 표 `tests/fixtures/reference-altaz.json` 있음 |
| T2 센서 연동(AR 모드) | ⬜ 대기 | | | G1 리서치 먼저 권장, 실기기 왕복 |
| T3a 검색·상세·찾아가기·박명/달 위젯 | ⬜ 대기 | | | |
| T3b 날씨·추천·오늘 밤·천문 현상 | ⬜ 대기 | | task-3-done | |
| T4 관측 기록·북마크·통계 | ⬜ 대기 | | | |
| T5 망원경/쌍안경 가이드 | ⬜ 대기 | | | 마운트 종류 미정(경위대식 기본) |
| T6 콘텐츠 팩(AI 요약 스토리) | ⬜ 대기 | | | G3 콘텐츠 생성 먼저 — 입력 파일 준비됨 |
| T7 학습 시스템 | ⬜ 대기 | | | G5 퀴즈·미션 먼저 |
| T8 마감·품질·릴리스 | ⬜ 대기 | | | |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ✅ 도착(2026-09-07) — T2 세션이 읽는다 | `plan/research/G1-sensors-ux.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ✅ 도착·병합 완료(D-016) | `plan/research/G2-korean-names.md`, `*.csv`, `28-mansions-ko.md`, `review-items.md` → `scripts/data/merge-g2.ts`로 `data-src/curated/`에 병합 |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | 🟡 사용자 실행 중 — 입력: `data-src/curated/content-targets.v1.csv`, `data-src/content-raw/catalog-values.v1.csv` | `data-src/content-raw/batch-N.json` |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | ⬜ | |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | ⬜ | |

## 다음 세션이 알아야 할 것

- **Task 0 완료(태그 `task-0-done`). 다음은 T1(천구 렌더러)** — `plan/task-01-sky-renderer.md`. T1이 바로 쓸 API·포맷은 `docs/ARCHITECTURE.md`의 "데이터 팩 포맷 v1"과 "`src/astro` API" 절에 있다: `loadStarPack('stars-bright')` → SoA(positions Float32Array), `eqjToSceneMatrix(date, site)` → column-major mat3, `render/shaders/refraction.glsl`(`skylogApplyRefraction`), `getPalette()`.
- 명령은 PowerShell에서 실행할 때 `$env:PATH`에 `C:\Program Files\nodejs`, `C:\Program Files\GitHub CLI`, `%APPDATA%\npm`을 앞에 붙여야 한다(새 터미널은 자동 반영). Git Bash에서는 pnpm shim이 깨져 있으므로 PowerShell을 쓴다. 파이썬 없음(데이터 검사는 node -e).
- 검증 명령 전부 통과: `pnpm typecheck && pnpm lint && pnpm test`(50개) `&& pnpm build`, `pnpm test:e2e`(4개), `pnpm data:validate`. 초기 JS gzip ≈ 120KB. 프리캐시 23개 1.86MB(stars-deep 제외).
- 데이터 원본(`data-src/raw/`, 18MB)은 gitignore. 새 clone에서는 `pnpm data:fetch`(codeberg LFS media URL) 후 `pnpm data:build`. 빌드된 팩은 커밋되어 있으므로 앱 개발만 하면 fetch가 필요 없다.
- 큐레이션 표(`data-src/curated/*.csv`)는 전부 `needs_review=true`(세션 지식). **G2 결과가 오면 컬럼이 같으므로 병합 → `pnpm data:build && pnpm data:validate`** 로 재생성. 특히 콜드웰 표(109개 전부 세션 지식)와 전통 이름은 검증 필요.
- 별자리 한글은 한국천문학회 표기(백조자리·헤르쿨레스자리·작은여우자리·살쾡이자리·조각가자리). d3-celestial ko와 다른 항목은 빌드 로그에 나온다.
- 은하수 레이어 원본은 아직 안 받았다(T1에서 NASA SVS milkyway_* 또는 d3-celestial `mw.json` 결정 → `scripts/data/lib.ts` SOURCES에 추가).
- `stars-bright.v1.json`이 490KB로 크다(이름/Bayer/Flamsteed 있는 별 3,171개). T3 검색 성능이 문제면 mag ≤ 6.5로 잘라 300KB대로 줄일 수 있다.
- 사용자 장비: 쌍안경 보유(모델 미확인 → Task 5에서 물어볼 것), SVBONY SV48P(90mm f/5.5, FL 500mm) 구매 검토 중, 마운트 미정.
- 기본 관측지: 대전(KAIST 36.37N 127.36E 70m 프리셋). 실제 관측 장소의 "보이는 하늘 범위"는 T2에서 입력.
- 프로젝트가 OneDrive 폴더 안에 있다(D-007 주의). 느려지면 OneDrive 제외 또는 이동.
- 실기기(폰) T0 체크리스트: **사용자 통과 확인(2026-09-07)** — 설치·야간 모드·언어 전환·Wake Lock·데이터 점검·오프라인 재실행.
- G2 병합 후 큐레이션 표: 별 240행(`aliases_ko` 컬럼 추가), 별자리 88(허큘리스자리·여우자리로 교정), DSO 108, 콜드웰 109(번호 검증 완료). 28수 표(`plan/research/28-mansions-ko.md`)는 A7(T6) 때 사용.

## 최근 완료 보고

### Task 0 완료 보고 (2026-09-07) — T0a + T0b
- 구현 요약: (a) Vite 8 + React 19 + TS 6 strict + Tailwind 4 앱 셸(상태 바·5탭·설정·정보·`/debug/data`), 적색 야간 모드, i18n ko/en, Wake Lock, Dexie v1(10 테이블)+settings persist, PWA·Pages 배포·Vitest·Playwright·디버그 HUD. (b) 데이터 파이프라인 `fetch → build → validate`(HYG v4.4, OpenNGC, d3-celestial), 팩 v1 9개(별 8,920/83,476, 별자리 88, DSO 661 = 메시에 110 + 콜드웰 109, 검색 인덱스 3,929, 유성우 13, 천체 9), 큐레이션 표 6개, G3 입력 2개. (c) `src/astro` 8모듈(time·coords·frames·bodies·events·refraction·visibility·optics) + GLSL 굴절 청크 + 별 팩 로더.
- 산출물: 커밋 5개(마지막 `feat: T0b …`), 태그 `task-0-done`, 배포 https://junhyoungpark-nobel.github.io/skylog/ , `public/data/*.v1.*`, `tests/fixtures/reference-altaz.json`, `data-src/content-raw/catalog-values.v1.csv`.
- 수용 기준: T0a ✅ 5/5 · T0b ✅ 5/5 (별 ≥ 8,000 ✅ 8,920 / 별자리 88 ko 100% ✅ / 메시에 110 ✅ / 콜드웰 ≥ 100 ✅ 109 / DSO ≥ 300 ✅ 661 / content-targets 120±10 ✅ 121 전부 존재 / bright.bin ≤ 400KB ✅ 244KB / 초기 JS gzip ≤ 500KB ✅ 120KB / 빠른 vs 느린 경로 ≤ 0.01° ✅ / 태양 남중 불변량 ✅ / 출몰 해석식 ±2분 ✅ / 박명 ✅ / 굴절·한계등급·광학 ✅ / Horizons 기준 표 ≤ 0.1° ✅).
- 자동 테스트: typecheck·lint 통과, Vitest 50개, Playwright 4개(스크린샷 3장 확인: 다크 셸·야간 모드(흰색 0)·데이터 점검 표), `data:validate` 통과.
- 결정 사항: D-007 환경, D-008 라이선스, D-011 해시 라우터, D-012 i18next, D-013 툴체인, D-014 데이터 팩 포맷·ID 규칙(M102=NGC5866, dso:C/B), D-015 astro 래퍼·씬 행렬 규약.
- 알려진 이슈: 큐레이션 한글·콜드웰 표는 G2 검증 전(needs_review). 은하수 원본 미확보(T1). `stars-bright.v1.json` 490KB.

## 결정 기록 요약 (`DECISIONS.md` 전체 참조)

- 2026-09-06: PWA / 로컬 우선 저장 / Claude 세션 실행 / 데이터 라이선스 정책 — 마스터 플랜 §2
- 2026-09-06 (T0a): D-007 환경 확정(Windows 11, Node 24, pnpm 12, gh 2.100, 계정 JunhyoungPark-NOBEL), D-008 MIT + CC BY-SA 4.0, D-011 해시 라우터, D-012 i18next, D-013 툴체인(Vite 8, TS 6.0, Tailwind 4, Vitest 5, Playwright 1.63)
- 2026-09-06 (T0b): D-014 데이터 팩 v1 포맷·ID 규칙, D-015 astronomy-engine 래퍼 경계·씬 행렬 규약
