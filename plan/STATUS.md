# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-07 · 갱신자: T2 세션(Claude Code 로컬, 연구실 데스크톱)
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- GitHub 저장소: https://github.com/JunhyoungPark-NOBEL/skylog (public, main)
- 배포 URL (GitHub Pages): **https://junhyoungpark-nobel.github.io/skylog/** (Actions 소스, `main` push마다 자동 배포)
- Actions: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/deploy.yml
- 개발 환경 경로: **A(Claude Code 로컬) 확정** — D-007. 로컬 폴더 `C:\Users\JunhyoungPark\OneDrive\Desktop\별관찰해쌀뚜`(OneDrive로 두 PC에 동기화됨; 두 PC 모두 Node 24·pnpm 12·gh 로그인·Playwright 준비).

## 태스크 현황

| 태스크 | 상태 | 완료일 | 태그 | 비고 |
|---|---|---|---|---|
| T0a 저장소·셸·테마·i18n·DB v1·PWA·배포·테스트 하네스 | ✅ 완료 | 2026-09-06 | | 실기기 통과 |
| T0b 데이터 파이프라인·데이터 팩 v1·`src/astro`·G3 입력 | ✅ 완료 | 2026-09-07 | task-0-done | G2 병합(D-016) |
| T1 천구 렌더러 | ✅ 완료 | 2026-09-07 | task-1-done | 실기기 통과(방위·별자리 Stellarium과 일치) |
| T2 센서 연동(AR 모드) | ✅ 완료 | 2026-09-07 | task-2-done | 실기기 통과("문제 없이 잘 돼", 덤프 없음 → D-018 기본값 유지) |
| T3a 검색·상세·찾아가기·박명/달 위젯 | ⬜ 대기 | | | `skyApi.flyToObject`, 툴팁 "자세히" 자리, `Site.visibleAz` 필터 |
| T3b 날씨·추천·오늘 밤·천문 현상 | ⬜ 대기 | | task-3-done | |
| T4 관측 기록·북마크·통계 | ⬜ 대기 | | | |
| T5 망원경/쌍안경 가이드 | ⬜ 대기 | | | `solveYawOffset`·`applyOffset`·`deviceAxisInScene` 재사용 |
| T6 콘텐츠 팩(AI 요약 스토리) | ⬜ 대기 | | | G3 배치 1 도착(20개) |
| T7 학습 시스템 | ⬜ 대기 | | | G5 퀴즈·미션 먼저 |
| T8 마감·품질·릴리스 | ⬜ 대기 | | | |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ✅ 반영(D-018) | `plan/research/G1-sensors-ux.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ✅ 병합 완료(D-016) | `plan/research/G2-korean-names.md`, `*.csv`, `28-mansions-ko.md` |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | 🟡 배치 1(20개) 도착 · 배치 2~ 사용자 실행 중(10개씩 권장) | `data-src/content-raw/batch-1.json`, `plan/research/G3-content-batch-1/` |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | ⬜ T5 후 한 번에 | 대상: `src/sensors/orientation/{math,filter,calibration}.ts` |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | 🟡 사전 작업팩 도착(경로 6·미션 24·배지 16·퀴즈 100 — 퀴즈 150·skyPick 30 목표 미달, 4번째 튜토리얼 보류). T7이 검증·병합 | `plan/research/G5-learn-{paths,missions,badges,quiz}.json`, 전체 팩 `plan/research/G5-prep-package/` |

## 다음 세션이 알아야 할 것

- **T2 실기기 통과**(2026-09-07, 사용자 보고 "문제 없이 잘 돼"). 덤프·기기 정보는 받지 못했으므로 D-018의 기본값(compassAxis='top', iOS 편각 적용, 필터 상수)을 그대로 둔다. 문제가 보고되면 센서 디버그 "덤프 복사" 텍스트로 원인을 특정한 뒤 테스트 벡터부터 고친다.
- 센서 관련 진입점: `sensors/orientation/manager.ts`(`sensorManager` 싱글턴: start/stop/nudge/setCalibration/currentAltAz), `state/sensorStore.ts`, `features/sky/ArToggle.tsx`·`CalibrationWizard.tsx`, 시뮬레이터 `features/sky/SensorSimPanel.tsx`(설정 → 개발자 → 센서 디버그에서 켬). 테스트 훅 `window.__skylogSensor`(스토어 상태).
- 부호 규약·파이프라인은 `docs/ARCHITECTURE.md` "센서 파이프라인"과 D-018. **"대충 맞을 때까지" 부호를 바꾸지 말 것** — 실기기 덤프로 원인을 특정한 뒤 테스트 벡터를 먼저 고친다.
- T3가 쓸 것: `Site.visibleAz`(단일 구간 `[[start,end]]`, 시계 방향)·`Site.minAltDeg`는 추천의 하드 필터. `useLocationStore.siteId`로 현재 관측지 레코드 조회. 상세 시트는 `SelectionTooltip`의 "자세히" 버튼에 연결. 검색 결과 → `flyToObject(id)`.
- 검증 명령 전부 통과: `pnpm typecheck && pnpm lint && pnpm test`(80개) `&& pnpm build`, `pnpm test:e2e`(13개), `pnpm data:validate`. 초기 JS gzip ≈ 305KB.
- 데이터 원본(`data-src/raw/`)은 gitignore. 새 PC에서는 OneDrive 동기화로 `node_modules`·`data-src/raw`까지 같이 왔다(이 세션은 연구실 데스크톱에서 그대로 이어서 진행). 명령은 PowerShell + PATH 접두(`C:\Program Files\nodejs;C:\Program Files\GitHub CLI;%APPDATA%\npm`).
- 사용자 장비: 쌍안경 보유(모델 미확인 → T5에서 질문), SVBONY SV48P(90mm f/5.5, FL 500mm) 구매 검토 중, 마운트 미정. 기본 관측지: 대전(KAIST) 프리셋. 사용자가 관측지 화면에서 실제 장소·보이는 범위를 입력하면 T3 추천이 그것을 쓴다.

## 최근 완료 보고

### Task 2 구현 보고 (2026-09-07) — 실기기 검증 대기
- 구현 요약: 위치(GPS getCurrentPosition→watchPosition, 거부/미지원/타임아웃 구분, 마지막 위치 재사용), 관측지 관리(CRUD·기본 지정·십진수/DMS 붙여넣기 파서·**보이는 하늘 범위 링 선택기**·최소 고도), 방향 센서 Provider 4종 + 우선순위 자동 선택, 기기→씬 변환(테스트 벡터 8×4 통과), 융합 필터(적응 이득·데드밴드·yaw 평활·간섭 감지), WMM2025 편각(대전 −8.70°), iOS 상단축 나침반 동기화, 1-별 정렬 마법사(3단계·실시간 오차·드래그 미세 조정·저장 보정 재사용), AR 토글·상태 배지·수동 5초 복귀, 센서 디버그 패널(덤프 복사)·시뮬레이터, 피드백(진동/플래시/소리), 상태 바에 관측지·정확도·시야 중심 방위·소스.
- 산출물: 커밋(`feat: T2 …`), 배포 URL 동일, 스크린샷 `tests/e2e/__screenshots__/sensor-ar.png`·`sensor-wizard.png`·`sites-editor.png`.
- 수용 기준(§6): ✅ 7 / ⏳ 2(실기기 체크리스트 전달 후 결과 대기, 태그). 세부: toCamera 벡터 ✅, 시뮬레이터 Playwright(AR→α→방위→정렬→δ→드래그→5초 복귀) ✅, 위치 3경로 ✅(거부 e2e, 나머지 코드 경로), 필터 목표 ✅(정지 < 0.2°, 스텝 ≤ 150ms), 편각 −8.70° 부호 ✅, 범위 선택기 ✅, 덤프 복사 ✅.
- 자동 테스트: typecheck·lint 통과, Vitest 80, Playwright 13.
- 결정: D-018(Provider 우선순위, 편각 iOS 적용, 필터 상수, iOS 동기화 방식, 위치·범위 규칙).
- 알려진 이슈: Generic Sensor Provider·iOS 경로는 실기기에서만 검증 가능. 하늘 화면의 범위 밖 어둡게 표시(선택)는 보류. 저장된 보정은 관측지 이름 기준 재사용(기기별 구분은 T5).

### Task 1 완료 보고 (2026-09-07)
- Three.js 천구 렌더러 전부(별·행성·달 위상·별자리·격자·지평선·은하수·DSO·라벨·선택·카메라·시간 바·레이어·야간). 기준 표 ≤0.1°, 별 ≤0.05°. D-017. 실기기 통과.

### Task 0 완료 보고 (2026-09-07)
- 앱 셸·PWA·배포·테스트 하네스; 데이터 팩 v1(별 8,920/83,476, 별자리 88, DSO 661); `src/astro`; JPL Horizons 기준 표. D-007~D-015, 이후 G2 병합 D-016.

## 결정 기록 요약 (`DECISIONS.md` 전체 참조)

- 2026-09-06: PWA / 로컬 우선 저장 / Claude 세션 실행 / 데이터 라이선스 정책 — 마스터 플랜 §2
- 2026-09-06 (T0): D-007 환경, D-008 라이선스, D-011 해시 라우터, D-012 i18next, D-013 툴체인, D-014 데이터 팩 v1, D-015 astro 래퍼
- 2026-09-07: D-016 G2 병합 규칙, D-017 T1 렌더러, D-018 T2 센서 계층
