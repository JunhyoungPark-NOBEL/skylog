# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-07 · 갱신자: Codex 로컬 · T4/T6 및 G3/G5 학습 통합
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
| T3a 검색·상세·찾아가기·박명/달 위젯 | ✅ 완료 | 2026-09-07 | (task-3-done은 T3b 후) | D-019. e2e 16개·Vitest 141개 통과. 실기기 체크리스트 전달 |
| T3b 날씨·추천·오늘 밤·천문 현상·실제 하늘처럼 + UI 리프레시·카피 | ✅ 완료 | 2026-09-07 | task-3-done | D-020·D-021. 7Timer는 CORS 불가로 생략. 실기기 체크리스트 전달 |
| T4 관측 기록·북마크·통계 | ✅ 구현 완료 | 2026-09-07 | task-4-done | 자동 검증 통과, 새 실기기 체크리스트 전달 |
| T5 망원경/쌍안경 가이드 | ⬜ 대기 | | | `solveYawOffset`·`applyOffset`·`deviceAxisInScene` 재사용 |
| T6 콘텐츠 팩(AI 요약 스토리) | ✅ 구현 완료 | 2026-09-07 | task-6-done | 121개 게시, needsReview 112개 유지 |
| T7 학습 시스템 | 🟡 진행 중 | | | 6코스·미션 27/30·배지 규칙 16/18·퀴즈 144/180 활성. skyPick·T5 연동 등 후속 |
| T8 마감·품질·릴리스 | ⬜ 대기 | | | |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ✅ 반영(D-018) | `plan/research/G1-sensors-ux.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ✅ 병합 완료(D-016) | `plan/research/G2-korean-names.md`, `*.csv`, `28-mansions-ko.md` |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | ✅ **121개 앱 반영(2026-09-07)** — G3+G5 통합팩. 정본은 `G3/G3-content-cumulative-121.json`(이전 배치·누적80과 중복 병합 금지). needsReview 112개(거리·등급 대역 보류 등)는 표시 정책으로 처리 | `plan/research/G3-G5-integrated/`(전체 팩, archive zip 제외), 항목별 분할 원본 `data-src/content-raw/G3-original/`, 자연어 재작성본 `data-src/content-raw/G3-natural/`(T6) |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | ⬜ T5 후 한 번에 | 대상: `src/sensors/orientation/{math,filter,calibration}.ts` |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | ✅ **앱 반영(2026-09-07, 일부 기능 잠금)** — 경로 6·미션 30·배지 18·퀴즈 180(객관식 108·참거짓 36·하늘 선택 36). 튜토리얼 4종 포함. 하늘 선택 36문항은 앱 검증 전 기본 비활성(팩 계약), 별자리 개수 배지 3개·2별 정렬 배지는 보류 조건 있음 | `plan/research/G3-G5-integrated/G5/`(정본 4 JSON + schemas·contracts·evidence·qa). 옛 준비팩 `plan/research/G5-prep-package/`는 참고용 |

## 다음 세션이 알아야 할 것

- **다음 작업**: T5 망원경 가이드 → T7 잔여(skyPick 36·전용 미션 3·배지 2, 하루 복습 누적 상한·배지 이력/연출) → T8. 사용자가 우선순위를 바꾸면 따른다. G3/G5는 모두 수령했으며 다시 생성할 필요 없다.
- **학습/콘텐츠**: 한국어 재서술본은 data-src/*-raw/*-natural, 게시본은 public/data/{content,learn}/v1. `pnpm data:content` 다음 `pnpm data:learn`; CI의 단위 검사도 121개/180문항 참조와 근거를 확인한다. 수치 검토 112개·G2 이름 검토 42개는 docs/CONTENT-REVIEW.md. 영어 장문 번역은 아직 없다.
- **환경**: 이 실행은 Codex 데스크톱 로컬. Node 24.19.0·로컬 pnpm 11.19.0(프로젝트 packageManager 12.3.4 유지), gh JunhyoungPark-NOBEL. 새 PC Chromium 1243은 설치 완료. 읽기 전용 샌드박스 때문에 파일 수정/검증 명령에 별도 실행 승인이 필요했다.

- **T2 실기기 통과**(2026-09-07, 사용자 보고 "문제 없이 잘 돼"). 덤프·기기 정보는 받지 못했으므로 D-018의 기본값(compassAxis='top', iOS 편각 적용, 필터 상수)을 그대로 둔다. 문제가 보고되면 센서 디버그 "덤프 복사" 텍스트로 원인을 특정한 뒤 테스트 벡터부터 고친다.
- 센서 관련 진입점: `sensors/orientation/manager.ts`(`sensorManager` 싱글턴: start/stop/nudge/setCalibration/currentAltAz), `state/sensorStore.ts`, `features/sky/ArToggle.tsx`·`CalibrationWizard.tsx`, 시뮬레이터 `features/sky/SensorSimPanel.tsx`(설정 → 개발자 → 센서 디버그에서 켬). 테스트 훅 `window.__skylogSensor`(스토어 상태).
- 부호 규약·파이프라인은 `docs/ARCHITECTURE.md` "센서 파이프라인"과 D-018. **"대충 맞을 때까지" 부호를 바꾸지 말 것** — 실기기 덤프로 원인을 특정한 뒤 테스트 벡터를 먼저 고친다.
- **기록·학습 진입점**: db/repos/observations.ts, state/logStore.ts, features/log/ObservationFormHost.tsx, learn/runtime.ts. ObjectSheet의 기록·이야기 액션은 실제 화면에 연결됐다. T5 장비 CRUD API는 db/repos/equipment.ts.
- **T5가 쓸 것**: `ObjectSheet`의 `망원경으로 찾기` 버튼 자리(`sheet-telescope`), `DEFAULT_EQUIPMENT`(`astro/equipment.ts`)를 장비 프로필로 대체하면 추천·시트 판정이 함께 바뀐다. 이중성 표 `DOUBLE_STARS`(분리각·분해 장비).
- **UI 규칙(D-021)**: 새 화면은 `docs/ARCHITECTURE.md` "UI 디자인 시스템 v2"와 토큰(`theme.css`)만 쓴다. 탭 화면은 App이 `pt-status pb-tab`을 감싸므로 자체 상하 여백을 두지 않는다. 카피는 D-021 용어집(해요체·평이한 용어)을 따른다.
- **스크롤 규칙(D-022)**: 세로 스크롤 영역은 `ui/ScrollArea.tsx`(마우스 드래그 스크롤·관성·페이드 오버레이)로 만든다. 스크롤러에 `mask-image`를 걸지 않는다. 드래그 스크롤이 닿으면 안 되는 컨트롤은 `touch-action: none` 또는 `data-drag-scroll="off"`. 사용자 보고("스크롤이 뻑뻑하고 스크롤 바를 정확히 눌러야 함")에 대한 수정이며, 실기기 확인은 T3b 체크리스트의 스크롤 항목으로 받는다.
- **주의(이 세션에서 겪은 것)**: 워크플로 에이전트가 "코드 스케치를 써 달라"는 프롬프트를 실제 경로에 파일을 만들었다가 지우는 바람에 `src/astro/phenomena.ts`가 사라진 적이 있다. 리서치용 에이전트 프롬프트에는 **"파일을 만들거나 고치지 말 것"**을 명시한다.
- 최신 검증: Vitest 328개, Playwright 26개 시나리오(수정 후 관련 4개 재검증), typecheck/lint/build 및 두 콘텐츠 빌드 통과. 초기 JS gzip 약 424KB — T8에서 코드 분할.
- 데이터 원본(`data-src/raw/`)은 gitignore. 새 PC에서는 OneDrive 동기화로 `node_modules`·`data-src/raw`까지 같이 왔다(이 세션은 연구실 데스크톱에서 그대로 이어서 진행). 명령은 PowerShell + PATH 접두(`C:\Program Files\nodejs;C:\Program Files\GitHub CLI;%APPDATA%\npm`).
- 사용자 장비: 쌍안경 보유(모델 미확인 → T5에서 질문), SVBONY SV48P(90mm f/5.5, FL 500mm) 구매 검토 중, 마운트 미정. 기본 관측지: 대전(KAIST) 프리셋. 사용자가 관측지 화면에서 실제 장소·보이는 범위를 입력하면 T3 추천이 그것을 쓴다.

## 최근 완료 보고

### Task 4·6 구현 및 G3/G5 학습 통합 보고 (2026-09-07)
- 구현 요약: 기록(목록·달력·천체별·예정), 사진·스케치·통계·백업; 이야기 121개와 오늘의 천체; 6코스·30미션·18배지·180문항 데이터와 144문항 퀴즈 실행, 기록 후 퀴즈·읽음·복습 연결.
- 산출물: DB v2, content/v1, learn/v1, task-4-done·task-6-done 태그. T7은 진행 중(완료 태그 없음). 배포 URL은 위 링크.
- 수용 기준: T4·T6 구현/자동 검사 통과. T6 G2 검토 잔여 42개는 docs/CONTENT-REVIEW.md에 목록 보고. T7 스키마·엔진·기록/퀴즈/진도는 통과, skyPick·T5 미션은 보류. 새 기능의 실기기 검증은 사용자 확인 대기.
- 자동 테스트: typecheck/lint/build 통과, Vitest **328/328**. Playwright 26개 시나리오 검증(전체 실행 25개 통과, 검색 디바운스 대기를 빠뜨린 새 테스트 1개 수정 후 해당 통합 4개 모두 통과). 스케치·사진 1600px 축소·퀴즈 3응답·JSON 다운로드·새 브라우저 복원·삭제 취소·오프라인 새로고침·글자 확대·이야기 길잡이 링크 확인. 퀴즈/배우기/기록/이야기 스크린샷 직접 확인.
- 결정: D-023 기록/DB/백업, D-024 자연어 이야기/표시 정책, D-025 학습 실행 조건. 스크롤 수정(b2b86b1)은 ff7e16b 배포에 이미 포함됐으며 회귀 테스트도 통과.
- 알려진 이슈: needsReview 112개·메모 418개 유지(미확정 사실표 값 제외). 영어 조작부 제공, 장문 이야기·문항은 한국어. skyPick 36·망원경 미션 3·배지 2 잠금. T7 하루 누적 복습 상한·획득 이력/축하 연출, T8 코드 분할(초기 JS gzip 약 424KB) 후속.
- 사용자 액션: 폰에서 콘텐츠 드래그 스크롤 → 사진/스케치 기록 1건 → 퀴즈/해설 → 백업을 다른 브라우저에서 복원. 이야기 5개 읽고 어색한 표현/오류 메모 남기기. G3/G5 추가 생성 불필요, G4는 T5 뒤.


### Task 3b + UI 리프레시 + 카피 완료 보고 (2026-09-07) — `task-3-done`
- 구현 요약: **날씨**(Open-Meteo 시간별, Dexie 1시간 캐시, 오프라인·실패 시 카드 숨김, 구름 저/중/고 막대·습도·이슬 경고·바람·강수, 관측 창 요약 한 줄, 하늘 상태 타임라인에 구름 겹침; 7Timer는 CORS 불가로 생략), **추천 엔진**(`astro/recommend.ts` 순수 함수: 10분 샘플 × 회전행렬 1개, 종류별 가시 조건·어둠 게이트, 관측지 범위·최소 고도 하드 필터, 구름 ≥ 70% 제외, 최적 시각 = 고도−달, 가중합 점수, 6그룹, 시간순 계획 ≤ 12, 구조화된 이유 → 문장), **오늘 밤 탭**(시간대 프리셋 5종·장비 3종 → 하늘 상태 → 날씨 → 하이라이트 → 추천(그룹 칩) → 계획(☆ Dexie) → 이달·다음 달 천문 현상 → 유성우), **천문 현상**(충·합·최대이각(시민박명 고도로 가시 판정)·금성 최대 밝기·달 위상·월식/일식 지역 가시·슈퍼문(Espenak)·유성우 극대 등급), **실제 하늘처럼**(Bortle·달 → 한계등급, 하늘 뷰 토글 + 레이어 패널 광해 슬라이더), 관측지 광해 단계 입력. **UI 디자인 시스템 v2**(D-021: 토큰·둥근 표면·헤어라인·유리 내비게이션 층·떠 있는 상태 캡슐/pill 탭 바·유리 바텀 시트·스프링 이징·한글 타이포; 전 화면 재스타일). **카피**: 한국어 92+28개 문구 해요체·평이한 용어로 교체(용어집 D-021), 영어 130개 정비.
- 산출물: 커밋 `feat: T3b …` + 태그 `task-3-done`, 배포 URL 동일. 스크린샷 `tests/e2e/__screenshots__/tonight-full.png`·`real-sky.png`·`shell-dark.png`·`search-results.png`·`object-sheet.png`·`sky-night.png`·`sites-editor.png`(모두 새 UI).
- 수용 기준(§6 T3b 해당분): ✅ 날씨 온라인 표시/오프라인 숨김/캐시 / ✅ 추천 단위 테스트(지평선 아래 제외·달 근접 감점·Bortle 8 은하 하위·행성 상위·visibleAz 하드 필터·구름 제외·그룹·신선도·이중성·계절 체감 달·결정성) / ✅ 2026-09~10 대전 저녁에 토성 최상위·"이달의 현상"에 토성 충(10/4) / ✅ 실제 하늘 토글 시 별 픽셀 ≥ 20% 감소·Bortle 즉시 반영 / ✅ 달 위상 항상 존재·유성우 카드 / ✅ typecheck·lint·test·build·e2e·data:validate.
- 자동 테스트: Vitest 172(신규 38: 날씨·현상·추천·규칙), Playwright 19(신규 3). 리서치·판정·재스타일에 워크플로 에이전트 14개(약 2.4M 토큰).
- 결정: D-020(T3b), D-021(UI·카피). 이 세션에서 발견한 버그: 레이어 밖 `button{background:none;padding:0}` 리셋이 Tailwind 유틸리티를 이겨 캡슐 버튼·칩이 투명하게 렌더 → `@layer base`로 이동(D-021 추기).
- 알려진 이슈·보류: 검색 결과·시트에서 ⓘ 툴팁은 `title` 속성(터치에서 안 보임 → 팝오버는 후속). 추천 Worker 이동·Krisciunas & Schaefer 달 모델·파인더 차트 보류. 실기기에서 유리 위 대비(달이 캡슐 뒤)·야간 모드×유리·떠 있는 탭 바 손가락 가림 확인 필요.

### Task 3a 완료 보고 (2026-09-07)
- 구현 요약: 검색(자체 엔진: 정규화·접두·부분·퍼지 1글자·초성·한국어 음역 확장, 카테고리 칩 8종, "지금 보이는 것만", 최근 검색 10개(Dexie), 빈 검색어 유명 천체 제안, 결과 행에 종류·이름 ko/en·별자리·등급·지금 고도, 300ms 디바운스·≤50·응답 시간 표시), 상세 바텀 시트(`openObject(id)`; 지금: 고도·16방위·상태 배지·등급·거리·크기/각지름·조도·달/태양 각거리 / 오늘: 출·남중·몰·최고 고도·최적 시간대·가장 좋은 달 / 좌표: J2000·JNow·Alt/Az 복사 / 장비: 맨눈·쌍안경 10×50·망원경 90mm 판정 + 근사 표기 / 별자리: 주요 별·DSO·계절; 반쯤/전체·스와이프; ☆ 관측 예정 북마크; 나머지 버튼은 T4·T5·T6 자리), 찾아가기(가장자리 화살표 + 남은 각거리, 화면 안 링, 중앙 3° 색·피드백, 지평선 아래면 출 시각 + "그 시각으로", 목표 해제), 관측 밤 계산(정오→정오, 박명 구간, 월출몰 복수, 위상·조도·달 나이, 어두운 창)과 "오늘 밤" 하늘 상태 카드(SVG 타임라인 + 시각 표 + 어두운 창 목록), 포맷 유틸.
- 산출물: 커밋(`feat: T3a …`), 배포 URL 동일, 스크린샷 `tests/e2e/__screenshots__/search-results.png`·`object-sheet.png`·`target-arrow.png`·`tonight.png`.
- 수용 기준(§6, T3a 해당분): ✅ 검색 10개 질의 전부 1위·오타·< 50ms(0.5~3ms) / ✅ 상세 시트 출몰(엔진 검색값, 별은 해석식 ±2분 기존 테스트) / ✅ 찾아가기 수동 flyTo·화살표 방향(±90° 오프셋 기하 대조)·중앙 피드백 / ✅ 박명·월출몰 USNO ±2분(일몰 18:52·시민박명 19:18·월몰 15:40·월출 01:12·일출 06:06)·어두운 창·위젯 렌더 / ⏳ `visibleAz` 반영은 추천(T3b)에서 / ✅ typecheck·lint·test·build·e2e.
- 자동 테스트: Vitest 141(신규 61: 검색·포맷·관측 밤·상세·장비·화살표·북마크), Playwright 16(신규 3).
- 결정: D-019. 독립 기준: USNO rstt API(timeanddate는 403).
- 알려진 이슈·보류: 파인더 차트(SHOULD) 미구현. 검색 인덱스 로드 실패(오프라인 첫 실행) 시 결과 없음으로 조용히 처리. 장비 판정은 근사(UI 표기). 시트 스와이프는 핸들에서만(본문은 스크롤).

## 결정 기록 요약 (`DECISIONS.md` 전체 참조)

- 2026-09-06: PWA / 로컬 우선 저장 / Claude 세션 실행 / 데이터 라이선스 정책 — 마스터 플랜 §2
- 2026-09-06 (T0): D-007 환경, D-008 라이선스, D-011 해시 라우터, D-012 i18next, D-013 툴체인, D-014 데이터 팩 v1, D-015 astro 래퍼
- 2026-09-07: D-016 G2 병합 규칙, D-017 T1 렌더러, D-018 T2 센서 계층, D-019 T3a 검색·상세·찾아가기·관측 밤

- 2026-09-07 통합: D-023 관측 DB/백업, D-024 자연어 이야기, D-025 학습 연결/잠금 정책. T0~T2 보고는 plan/reports/2026-09-07-t0-t2.md.
