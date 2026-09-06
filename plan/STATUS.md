# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-06 · 갱신자: T0a 세션(Claude Code 로컬)
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- GitHub 저장소: **(미생성 — `gh auth login` 후 `gh repo create skylog --public --source=. --remote=origin --push`)**
- 배포 URL (GitHub Pages): **(미배포 — 예정: `https://<owner>.github.io/skylog/`)**
- 개발 환경 경로: **A(Claude Code 로컬) 확정** — D-007. 로컬 폴더 `C:\Users\JunhyoungPark\OneDrive\Desktop\별관찰해쌀뚜`.

## 태스크 현황

| 태스크 | 상태 | 완료일 | 태그 | 비고 |
|---|---|---|---|---|
| T0a 저장소·셸·테마·i18n·DB v1·PWA·배포·테스트 하네스 | 🟡 진행 중 (로컬 완료, GitHub 배포 대기) | | | 남은 것: gh 로그인 → 저장소 생성·push → Pages 활성화 → `gh run watch` → URL 확인 |
| T0b 데이터 파이프라인·데이터 팩 v1·`src/astro`·G3 입력 | ⬜ 대기 | | task-0-done | 외부 다운로드 가능 확인됨(codeberg·GitHub raw·NASA SVS) |
| T1 천구 렌더러 | ⬜ 대기 | | | 기준 표(`reference-altaz.json`) 필요 |
| T2 센서 연동(AR 모드) | ⬜ 대기 | | | G1 리서치 먼저 권장, 실기기 왕복 |
| T3a 검색·상세·찾아가기·박명/달 위젯 | ⬜ 대기 | | | |
| T3b 날씨·추천·오늘 밤·천문 현상 | ⬜ 대기 | | task-3-done | |
| T4 관측 기록·북마크·통계 | ⬜ 대기 | | | |
| T5 망원경/쌍안경 가이드 | ⬜ 대기 | | | 마운트 종류 미정(경위대식 기본) |
| T6 콘텐츠 팩(AI 요약 스토리) | ⬜ 대기 | | | G3 콘텐츠 생성 먼저 |
| T7 학습 시스템 | ⬜ 대기 | | | G5 퀴즈·미션 먼저 |
| T8 마감·품질·릴리스 | ⬜ 대기 | | | |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ⬜ 지금 실행 가능 | `plan/research/G1-*.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ⬜ 지금 실행 가능 | `plan/research/G2-*.csv` |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | ⬜ T0b 후 | |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | ⬜ | |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | ⬜ | |

## 다음 세션이 알아야 할 것

- **T0a의 로컬 작업은 끝났고 GitHub 단계만 남았다.** 사용자가 `gh auth login`을 마치면 순서대로: `gh repo create skylog --public --source=. --remote=origin --push` → `gh api -X POST repos/{owner}/skylog/pages -f build_type=workflow`(이미 있으면 `-X PUT`) → `gh run watch` → `curl -I https://<owner>.github.io/skylog/` → 이 문서의 링크·README 배포 URL 기입 → D-007에 gh 계정명 추가 → 커밋·push. 그 다음 T0b.
- 명령은 PowerShell에서 실행할 때 `$env:PATH`에 `C:\Program Files\nodejs`, `C:\Program Files\GitHub CLI`, `%APPDATA%\npm`을 앞에 붙여야 한다(새 터미널은 자동 반영). Git Bash에서는 pnpm shim이 깨져 있으므로 PowerShell을 쓴다.
- 검증 명령 전부 통과 상태: `pnpm typecheck && pnpm lint && pnpm test`(17개) `&& pnpm build`, `pnpm test:e2e`(4개, Chromium 설치됨). 초기 JS gzip ≈ 119KB.
- `pnpm data:fetch/build/validate`는 T0b용 스텁(exit 2). T0b는 `plan/task-00-setup-and-data.md` §3 MUST 3·4부터. `/debug/data` 페이지는 `public/data/manifest.v1.json`의 `summary`(starsBright, constellations, dso, messier, caldwell)를 읽도록 이미 되어 있고, e2e가 그 값을 검사한다(별 > 8000, 별자리 88, 메시에 110) — T0b는 `manifest.v1.json`에 `summary`를 반드시 넣을 것(`src/catalog/manifest.ts` 타입 참조).
- vite.config의 프리캐시 목록은 `public/data/`에 실제 있는 파일만 포함한다(T0b가 팩을 만들면 자동으로 프리캐시됨).
- 사용자 장비: 쌍안경 보유(모델 미확인 → Task 5에서 물어볼 것), SVBONY SV48P(90mm f/5.5, FL 500mm) 구매 검토 중, 마운트 미정.
- 기본 관측지: 대전(KAIST 36.37N 127.36E 70m 프리셋이 `locationStore`·`sites` 기본값). 실제 관측 장소의 "보이는 하늘 범위"는 T2에서 입력.
- 기준 표(`tests/fixtures/reference-altaz.json`)가 아직 없다 — T0b에서 JPL Horizons API로 만든다(네트워크 가능).
- 프로젝트가 OneDrive 폴더 안에 있다(D-007 주의). 느려지면 OneDrive 제외 또는 이동.

## 최근 완료 보고

### T0a 중간 보고 (2026-09-06) — 로컬 완료, GitHub 배포 대기
- 구현: Vite 8 + React 19 + TS 6 strict + Tailwind 4 툴체인; 앱 셸(상태 바·5탭·설정·정보·`/debug/data`), 테마 토큰 + 적색 야간 모드, i18n ko/en, Wake Lock, Dexie v1(10 테이블) + settings/cache/sites 리포지토리, zustand 5개 스토어(settings는 Dexie persist), PWA(manifest·SW·런타임 캐시), `deploy.yml`, Vitest 17개·Playwright 4개(스크린샷 3장 확인), 디버그 HUD, 문서(README·ARCHITECTURE·TESTING·DATA-LICENSES·LICENSE×2·CHANGELOG).
- 수용 기준(T0a): ✅ 4 / ⚠️ 1(GitHub Pages 배포 — gh 미로그인).
- 결정: D-007 환경 정보, D-008 확정, D-011 해시 라우터, D-012 i18next, D-013 툴체인 버전.

## 결정 기록 요약 (`DECISIONS.md` 전체 참조)

- 2026-09-06: PWA / 로컬 우선 저장 / Claude 세션 실행 / 데이터 라이선스 정책 — 마스터 플랜 §2
- 2026-09-06 (T0a): D-007 환경 확정(Windows 11, Node 24, pnpm 12, gh 2.100), D-008 MIT + CC BY-SA 4.0, D-011 해시 라우터, D-012 i18next, D-013 툴체인(Vite 8, TS 6.0, Tailwind 4, Vitest 5, Playwright 1.63)
