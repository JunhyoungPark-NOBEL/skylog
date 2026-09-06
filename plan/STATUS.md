# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-07 · 갱신자: T1 세션(Claude Code 로컬)
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- GitHub 저장소: https://github.com/JunhyoungPark-NOBEL/skylog (public, main)
- 배포 URL (GitHub Pages): **https://junhyoungpark-nobel.github.io/skylog/** (Actions 소스, `main` push마다 자동 배포)
- Actions: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/deploy.yml
- 개발 환경 경로: **A(Claude Code 로컬) 확정** — D-007. 로컬 폴더 `C:\Users\JunhyoungPark\OneDrive\Desktop\별관찰해쌀뚜`.

## 태스크 현황

| 태스크 | 상태 | 완료일 | 태그 | 비고 |
|---|---|---|---|---|
| T0a 저장소·셸·테마·i18n·DB v1·PWA·배포·테스트 하네스 | ✅ 완료 | 2026-09-06 | | 실기기 체크리스트 통과 |
| T0b 데이터 파이프라인·데이터 팩 v1·`src/astro`·G3 입력 | ✅ 완료 | 2026-09-07 | task-0-done | G2 병합 완료(D-016) |
| T1 천구 렌더러 | ✅ 완료 | 2026-09-07 | task-1-done | 스테레오그래픽 투영 보류(FOV 상한 100°) |
| T2 센서 연동(AR 모드) | ⬜ 대기 | | | G1 리서치 도착(`plan/research/G1-sensors-ux.md`), 훅 `setOrientationQuaternion` 준비됨 |
| T3a 검색·상세·찾아가기·박명/달 위젯 | ⬜ 대기 | | | `skyApi.flyToObject`, 툴팁 "자세히" 버튼 자리 있음 |
| T3b 날씨·추천·오늘 밤·천문 현상 | ⬜ 대기 | | task-3-done | |
| T4 관측 기록·북마크·통계 | ⬜ 대기 | | | |
| T5 망원경/쌍안경 가이드 | ⬜ 대기 | | | 마운트 종류 미정(경위대식 기본) |
| T6 콘텐츠 팩(AI 요약 스토리) | ⬜ 대기 | | | G3 배치 1 도착(20개) |
| T7 학습 시스템 | ⬜ 대기 | | | G5 퀴즈·미션 먼저 |
| T8 마감·품질·릴리스 | ⬜ 대기 | | | |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ✅ 도착 — T2 세션이 읽는다 | `plan/research/G1-sensors-ux.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ✅ 병합 완료(D-016) | `plan/research/G2-korean-names.md`, `*.csv`, `28-mansions-ko.md` |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | 🟡 배치 1(우선순위 1, 20개) 도착 · 배치 2~6 사용자 실행 중 | `data-src/content-raw/batch-1.json`, `plan/research/G3-content-batch-1/`(검토 메모·검증 결과) |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | ⬜ | |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | ⬜ | |

## 다음 세션이 알아야 할 것

- **T1 완료(태그 `task-1-done`). 다음은 T2(센서·AR 모드)** — `plan/task-02-sensors-ar.md`. 먼저 `plan/research/G1-sensors-ux.md`(72KB)를 읽는다. 렌더러 쪽 진입점: `CameraController.setOrientationQuaternion(q)`(씬 프레임 +X 동 +Y 천정 +Z 남 기준 카메라 쿼터니언 → alt/az), `viewStore.mode = 'sensor'`, `useLocationStore.setFromGps()`. 센서 모드에서는 컨트롤러의 드래그를 끄거나 오프셋으로 다뤄야 한다(현재 `attach()`가 포인터를 항상 받음).
- 하늘 뷰 사용법·API: `docs/ARCHITECTURE.md` "렌더 파이프라인", D-017. 다른 기능이 하늘을 조작하려면 `features/sky/skyApi.ts`(`flyToObject`)를 쓴다. 상세 시트(T3)는 `SelectionTooltip`의 "자세히" 버튼에 연결한다(`selectionStore.selectedId`).
- 테스트 전역 훅: `window.__skylogScene`(project/objectAltAz/describe/pick/flyToObject), `__skylogStats`, `__skylogAstro`. 해시 쿼리로 시각·시점 고정(`preserve=1`은 픽셀 검사용).
- 검증 명령 전부 통과: `pnpm typecheck && pnpm lint && pnpm test`(59개) `&& pnpm build`, `pnpm test:e2e`(10개: 스모크 4 + 하늘 6), `pnpm data:validate`. 초기 JS gzip ≈ 302KB(three.js 포함, 예산 500KB). 프리캐시 24개 2.5MB.
- 헤드리스(SwiftShader)에서는 fps를 재지 않는다. 실기기 fps·배터리는 사용자 체크리스트로.
- 알려진 제한: (1) 원근 투영이라 FOV 100°에서 가장자리 왜곡이 있다(스테레오그래픽은 보류). (2) 별자리 선·별의 굴절 일치는 같은 식을 쓰므로 구조적으로 보장되지만 픽셀 스냅샷 자동 검사는 없다(육안 확인). (3) 별 이름 라벨은 한글이 없으면 영문, 둘 다 없으면 생략(Bayer만 있는 별은 FOV ≤ 10°에서도 라벨 없음 — T3 검색 결과로 보완). (4) `stars-deep` 팩(2.3MB)은 FOV < 20°에서 처음 한 번 받는다(런타임 캐시).
- 명령은 PowerShell에서 실행할 때 `$env:PATH`에 `C:\Program Files\nodejs`, `C:\Program Files\GitHub CLI`, `%APPDATA%\npm`을 앞에 붙여야 한다. Git Bash에서는 pnpm shim이 깨져 있다. 파이썬 없음(`node -e` 사용).
- 데이터 원본(`data-src/raw/`)은 gitignore. 새 clone은 `pnpm data:fetch && pnpm data:build`. 빌드된 팩은 커밋되어 있다.
- 사용자 장비: 쌍안경 보유(모델 미확인 → T5에서 질문), SVBONY SV48P(90mm f/5.5, FL 500mm) 구매 검토 중, 마운트 미정. 기본 관측지: 대전(KAIST) 프리셋. 실제 관측 장소의 "보이는 하늘 범위"는 T2에서 입력.
- 프로젝트가 OneDrive 폴더 안에 있다(D-007 주의).

## 최근 완료 보고

### Task 1 완료 보고 (2026-09-07)
- 구현 요약: Three.js 천구 렌더러 — 별(J2000 버퍼 + 행렬 1개/프레임, GLSL 굴절·B−V 색·한계등급 페이드, deep 팩 지연 교체), 행성·태양 스프라이트 + 달 구/조명(위상 자동), 별자리 선·경계·이름, 고도-방위 격자·적도·황도·자오선, 지평선·땅·방위, 은하수(mw.json → 텍스처), DSO 기호, HTML 라벨(우선순위·겹침 회피), 탭 선택 + 툴팁, 카메라(드래그·핀치·휠·더블탭·관성·flyTo·센서 훅), 박명/낮 하늘 배경, 시간 바(슬라이더·날짜·배속·지금), 레이어 패널(Dexie 저장), 야간 모드 렌더러 적색.
- 산출물: 커밋 3개(`feat: T1 sky renderer …` 외), 태그 `task-1-done`, 배포 URL 동일, `public/data/milkyway.v1.png`(45KB), 스크린샷 6장(`tests/e2e/__screenshots__/sky-*.png`).
- 수용 기준: ✅ 10 / ⚠️ 1 — 고도 2° 굴절 일치 픽셀 스냅샷 자동 검사는 없음(별·선·DSO·은하수는 같은 GLSL 청크, 행성·라벨은 같은 TS 식 → 구조적으로 일치; 육안 확인). 기준 표 비교: 토성·목성·달·화성 ≤ 0.1°(굴절 없는 값), 베가·알타이르 ≤ 0.05°. 북극성 고도 36.4°, 카시오페이아 동쪽 위·북두칠성 서쪽 아래, 2시간 후 반시계 회전 확인. 달 위상(9/7 05:00 KST 하현 근처) 확인. 야간 모드 캔버스 픽셀 적색 외 0. 정지 시 draw 0.
- 자동 테스트: typecheck·lint 통과, Vitest 59개, Playwright 10개(스크린샷 남·북·천정·야간·달·낮 직접 확인 — 여름 대삼각형 남쪽 높이, 궁수자리 남서 낮게, 포말하우트 동남, 거울상 아님), 빌드 gzip 302KB.
- 결정 사항: D-017(투영·은하수·크기·라벨·DSO·팩 교체·hit-test·해시 쿼리·T2 훅).
- 알려진 이슈 / 다음으로: 스테레오그래픽 투영 보류, 별 반짝임 없음(의도), 유성우 복사점 마커·별자리 하이라이트·스크린샷 저장(SHOULD/COULD)은 미구현 → T8 또는 여유 세션.

### Task 0 완료 보고 (2026-09-07) — T0a + T0b
- 구현 요약: 앱 셸·야간 모드·i18n·Dexie v1·PWA·Pages 배포·테스트 하네스; 데이터 파이프라인(HYG v4.4·OpenNGC·d3-celestial) → 팩 v1(별 8,920/83,476, 별자리 88, DSO 661 = 메시에 110 + 콜드웰 109); `src/astro` 8모듈 + GLSL 굴절 + 별 팩 로더; JPL Horizons 기준 표.
- 수용 기준: T0a ✅ 5/5 · T0b ✅ 5/5. 자동 테스트: Vitest 50, Playwright 4, `data:validate` 통과.
- 결정: D-007~D-015. 이후 G2 병합(D-016)으로 한글 이름 별 206개·DSO 119개.

## 결정 기록 요약 (`DECISIONS.md` 전체 참조)

- 2026-09-06: PWA / 로컬 우선 저장 / Claude 세션 실행 / 데이터 라이선스 정책 — 마스터 플랜 §2
- 2026-09-06 (T0a): D-007 환경, D-008 라이선스, D-011 해시 라우터, D-012 i18next, D-013 툴체인
- 2026-09-06 (T0b): D-014 데이터 팩 v1 포맷·ID 규칙, D-015 astro 래퍼·씬 행렬 규약
- 2026-09-07: D-016 G2 병합 규칙, D-017 T1 렌더러 결정
