# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-08 · 갱신자: Codex 로컬 · build5 AAB/개인 APK·iOS 시작 오류 수정
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- 모바일 빌드: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/mobile.yml
- 스토어 준비/서명/테스트: `docs/MOBILE-RELEASE.md`, `docs/STORE-LISTING.md`

## 이번 작업 보고 (2026-09-08 · build5 재빌드 및 직접 설치)

- 시작/종료 시 확인한 원격 main 최신은 `dce4a7dc50980bec5dc93f0af2b9003788205e63`. `108e99a` 이후 문서·서명 스크립트만 바뀌었으며 Android 앱 기능 소스는 build4와 같다. 로컬 브랜치는 `codex/android-release-20260908`.
- 현재 폴더는 `C:\Users\박준형\Documents\ChatGPT\별관찰앱개발`. 이전 build4/업로드 키가 기록된 `C:\Users\JunhyoungPark\...`와 다른 PC/사용자다. 원 AAB/업로드 키를 찾지 못했고, 기존 키·Play 등록 여부 질문은 응답 대기다. GitHub 인증도 없어 로컬 변경을 push하거나 새 iOS CI를 실행하지 않았다.
- **AAB 생성·구조 검증 완료, Play 업로드 서명 대기**: `C:\Users\박준형\Downloads\skylog-release-0.1.0-beta.1-build5\skylog-0.1.0-beta.1-build5-unsigned.aab`, 6,903,462 bytes. SHA256 `7f37e7bedd7be09365ecdd9a05b94694ec8ab57018211247a5a47cbdc9df2fa3`. versionCode5/API36/min24/release/non-debuggable/backup=false 확인. unsigned 파일은 Play 제출용 최종본이 아니다.
- **직접 설치 APK 완료**: 같은 폴더 `skylog-0.1.0-beta.1-build5-local-test.apk`, 7,192,735 bytes, SHA256 `880ab41f9cc2c0ac7404fc5d5b96896b8b1c1c3a95d0054c3fb1850e95cc603e`. release 앱을 별도 RSA4096 개인 테스트 키로 서명, APK v2/v3·zipalign 통과. 키는 `%LOCALAPPDATA%/skylog-local-test-signing/`, 암호는 현재 사용자 DPAPI. 원 업로드 키는 생성/교체하지 않았다. 개인 키·암호는 전달 폴더/저장소에 없다.
- Node24.19/pnpm12.3.4 고정 lock 설치, typecheck/lint/단위366/data/native 웹 build 통과. Android bundleRelease/assembleRelease/lintRelease 성공(오류0/경고33). 한글 경로의 AGP 검사는 명령에만 `-Pandroid.overridePathCheck=true` 적용. AAB/APK 오프라인 웹 자료 **158개 SHA256 전부 일치**, .so 없음. JDK21/SDK36/bundletool1.18.3은 `%LOCALAPPDATA%/skylog-tools`.
- 브라우저 **35/35 통과**(`--workers=2`). 기본10 workers는 과부하로 시간 초과해 중단 후 전체 재검사했다. 하늘·별길·배우기 최신 화면 직접 확인, 결과는 `artifacts/qa-build5`. Android 연결 기기 0개로 설치/센서 실기기 검증 미완료.
- iOS SceneDelegate의 기본 컨트롤러가 SkylogMotion 등록을 생략하던 오류 수정. Geolocation 필수 목적 설명 보완, Tailwind4 지원에 맞춰 최소 iOS16.4로 변경. **이번 Swift 컴파일/실행은 Windows에서 미검증**. 이전 CI 성공을 이번 수정의 검증으로 사용하지 않는다. 새 소스 ZIP을 Mac에서 빌드하고 Team/Bundle ID/Archive/TestFlight 필요.
- CI는 필수 version_code를 검증해 Android/iOS에 함께 사용한다. build5 다음 기본값6, 이후 Console 최대 번호보다 크게 지정. AAB 서명은 기존 키 누락 시 자동 생성 금지, AAB/APK 검증 완료 후에만 최종 출력 생성. 결정 D-032.
- Android는 APK를 폰에 전송해 설치. iPhone은 기존 Pages를 Safari→공유→홈 화면에 추가로 사용 가능. 웹앱의 깊은 별/이야기/학습은 온라인 선열람 후 캐시된다. `docs/INSTALL-ON-PHONE.md`에 설치·백업·TestFlight 안내.
- **Play/App Store 공개 출시 미완료**. 키·계정·정책·연락처/실제 스크린샷·실기기·심사 필요. T5/T7/T8 잔여 유지, 완료 태그 없음. 다음 작업: 사용자 키/계정 답변→AAB 최종 서명/내부 테스트, 새 iOS 컴파일/TestFlight/실기기 검증.

## 이전 작업 완료 보고 (2026-09-08 · 방향 안내·코스·AAB 출시 준비)

- 별길 진입의 센서→밝은 별 정렬→이동 CTA, 큰 좌우/위아래 화살표·각도, 시야 진입 후 자동 차트 전환 제거. 정렬 완료 버튼을 위로 이동. 화면 전환 시 본문 스크롤 초기화.
- 배우기→코스에 M42/M31/M13/M57/M27/M11 대표 호핑 6개. 고정 이정표와 자체 차트, 실제 완료→새 관측 기록 2단계. 코스 ID가 같은 실제 이벤트만 진도 반영. 원 G3/G5 팩·DB v2 유지.
- 사용자 수정 요청으로 Android 배포 산출물은 APK가 아닌 **AAB**. Capacitor 8.5.1/Android API36·Java21/iOS15+ 프로젝트, native base=/ 및 데이터 전체 포함, 센서·위치·화면 유지·백업 공유 브리지. 키는 로컬 외부 폴더에서 생성/재사용, CI에는 서명 자료 없음.
- 자동 검증: typecheck/lint/build·단위 366개 통과. 브라우저 전체 34개 이후 최종 망원경 회귀 4개(새 쌍안경 전환 사례 포함) 통과, 현재 총 35개. 방향·코스/영어/야간 스크린샷 확인. 기존 하늘 테스트의 초기 마운트 대기 경쟁 조건과 쌍안경에 남는 GoTo 설정을 수정했다.
- 최종 앱 소스 **108e99a**, Android AAB/lint/인터넷을 끈 API36 실제 WebView 계측 및 iOS arm64 무서명 컴파일 **모두 통과**: [mobile run 34174587920](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34174587920). [웹 배포 run 34174588139](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34174588139) 성공, 앱/개인정보/지원 URL HTTP 200.
- 전달 파일: `C:\Users\JunhyoungPark\Downloads\skylog-0.1.0-beta.1-build4.aab` (6,964,176 bytes, versionCode **4**, API36/min24). 기존 RSA4096 업로드 키로 서명, jarsigner strict 및 bundletool 1.18.3 validate 통과. SHA256 `80bc82531b4f39149b2825400e109bdec7347a99d25320c86588de05a27d7229`. 스토어 문안·아이콘·한/영 피처 그래픽·공개 인증서·검증 메타데이터는 Downloads의 `skylog-release-0.1.0-beta.1-build4/`. 이전 build3 대신 **build4**를 사용한다.
- 개인정보/지원 한·영 페이지와 스토어 문안 추가. Play/App Store 계정·등록·심사·배포는 아직 수행하지 않았다. 기존 PWA 기록은 앱에서 별도 저장되므로 JSON 가져오기 필요.
- T5의 실제 홀더/10분 드리프트, T7/T8 잔여 및 iPhone 네이티브 센서 검증은 계속 대기. 이번 변경으로 완료 태그를 붙이지 않는다.
- 알려진 잔여: Android lint 오류0/경고33(템플릿·아이콘/스플래시·리소스 등)은 `docs/MOBILE-RELEASE.md`에 기록하고 T8로 넘긴다. 빌드 통과를 경고/실기기 오류가 전혀 없다는 뜻으로 해석하지 않는다.
- 결정: D-030(단계별 방향 안내·대표 호핑·실제 진도), D-031(Capacitor·AAB·외부 업로드 키). 사용자 액션: Play 내부 테스트 설치, 폰 윗변 정렬/화살표/드리프트, 코스→관측 기록, 오프라인 및 PWA JSON 이관 검증. 키 별도 백업과 Apple 서명/TestFlight는 `docs/MOBILE-RELEASE.md` 참고. 새 G3/G5 생성은 필요 없으며 G4 독립 수학 리뷰는 선택적으로 요청 가능하다.

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
| T5 망원경/쌍안경 가이드 | 🟡 구현·자동 검증 완료, 실기기 대기 | | | 별길 가이드(+Y 상대 센서), 장비/FOV/정렬/차트/스타호핑/업적. D-029. 실기기 반영 후 태그 |
| T6 콘텐츠 팩(AI 요약 스토리) | ✅ 구현 완료 | 2026-09-07 | task-6-done | 121개 게시, needsReview 112개 유지 |
| T7 학습 시스템 | 🟡 진행 중 | | | 하늘28+관측12스테이지. 6코스·미션30/30·배지 규칙18/18·퀴즈204/240 활성. skyPick36·하루 복습 상한·배지 이력 후속 |
| T8 마감·품질·릴리스 | ⬜ 대기 | | | |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ✅ 반영(D-018) | `plan/research/G1-sensors-ux.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ✅ 병합 완료(D-016) | `plan/research/G2-korean-names.md`, `*.csv`, `28-mansions-ko.md` |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | ✅ **121개 앱 반영(2026-09-07)** — G3+G5 통합팩. 정본은 `G3/G3-content-cumulative-121.json`(이전 배치·누적80과 중복 병합 금지). needsReview 112개(거리·등급 대역 보류 등)는 표시 정책으로 처리 | `plan/research/G3-G5-integrated/`(전체 팩, archive zip 제외), 항목별 분할 원본 `data-src/content-raw/G3-original/`, 자연어 재작성본 `data-src/content-raw/G3-natural/`(T6) |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | 🟡 지금 요청 가능 | `astro/pointing.ts`, `astro/finder.ts`, `sensors/telescopeOrientation.ts`, `sensors/orientation/{math,filter,calibration}.ts`, 관련 단위 테스트. docs/TESTING.md에 첨부 목록 |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | ✅ 앱 반영. G5 180문항 중 skyPick36만 잠금. 2026-09-08 T5 연결로 미션30·배지18 활성, 독자 작성 한·영 관측60문항 추가로 총240/활성204. 별자리 배지는 실제 별자리 관측 기록만 인정 | `plan/research/G3-G5-integrated/G5/`(정본 유지), 추가 `data-src/learn-raw/observing-quiz.json`. 옛 준비팩은 참고용 |

## 다음 세션이 알아야 할 것

- **학습 탐색/스테이지(D-026)**: features/learn의 LearnScreen → QuizJourney/CoursesScreen/StoriesScreen/AchievementsScreen. 해시 section/path/mission/chapter로 복원하며 하단 탭 복귀 시 마지막 배우기 경로 유지. stageCatalog는 144문항을 중복 없이 고정한 28단계, 정답률 80% 해제·60/80/100% 별, 개인 합계는 단계별 최고점만. stage/question 버전을 함께 검증하며 마지막 응답과 완료 기록은 원자 저장. 기존 미션/응답/복습/관측 유지, 새 도장은 새 여정을 완주해야 획득한다. 리더보드는 아직 로컬 점수 기반만 준비됨.
- **지평선(D-027)**: showBelowHorizon 기본 true, 지면 opacity 0.28. groundOpaque가 켜져 있으면 투시를 막는다. stars/lines/DSO/bodies/labels/markers/picking이 같은 설정을 따르며 실제 가시성·추천·미션 고도 판정은 바꾸지 않는다.

- **다음 작업**: T5 실기기 정렬/드리프트 결과와 G4 반영 → T7 잔여(skyPick 36, 하루 복습 누적 상한·배지 이력/연출) → T8. G3/G5 추가 생성은 불필요. 사용자 장비를 미리 확정하지 않았으며 설정의 예시 수치는 실제 장비로 바꿀 수 있다.
- **학습/콘텐츠**: 한국어 재서술본은 data-src/*-raw/*-natural, 게시본은 public/data/{content,learn}/v1. `pnpm data:content` 다음 `pnpm data:learn`; CI는 이야기121/G5원본180+추가60 참조와 근거를 검증한다. 새 관측12단계는 별도 observingStages.json이며 기존 stageCatalog 28단계를 변경하지 않는다. 수치 검토112·G2 이름42는 docs/CONTENT-REVIEW.md. 새60문항은 전부 영어 제공, 기존 장문 전체 번역은 후속이다.
- **환경**: 이 실행은 Codex 데스크톱 로컬. Node 24.19.0·로컬 pnpm 11.19.0(프로젝트 packageManager 12.3.4 유지), gh JunhyoungPark-NOBEL. 새 PC Chromium 1243은 설치 완료. 이번 실행은 파일/네트워크 접근 가능(이전 세션의 읽기 전용 제한은 현재 해당 없음).

- **T2 실기기 통과**(2026-09-07, 사용자 보고 "문제 없이 잘 돼"). 덤프·기기 정보는 받지 못했으므로 D-018의 기본값(compassAxis='top', iOS 편각 적용, 필터 상수)을 그대로 둔다. 문제가 보고되면 센서 디버그 "덤프 복사" 텍스트로 원인을 특정한 뒤 테스트 벡터부터 고친다.
- 센서 관련 진입점: `sensors/orientation/manager.ts`(`sensorManager` 싱글턴: start/stop/nudge/setCalibration/currentAltAz), `state/sensorStore.ts`, `features/sky/ArToggle.tsx`·`CalibrationWizard.tsx`, 시뮬레이터 `features/sky/SensorSimPanel.tsx`(설정 → 개발자 → 센서 디버그에서 켬). 테스트 훅 `window.__skylogSensor`(스토어 상태).
- 부호 규약·파이프라인은 `docs/ARCHITECTURE.md` "센서 파이프라인"과 D-018. **"대충 맞을 때까지" 부호를 바꾸지 말 것** — 실기기 덤프로 원인을 특정한 뒤 테스트 벡터를 먼저 고친다.
- **기록·학습 진입점**: db/repos/observations.ts, state/logStore.ts, features/log/ObservationFormHost.tsx, learn/runtime.ts. ObjectSheet의 기록·이야기 액션은 실제 화면에 연결됐다. T5 장비 CRUD API는 db/repos/equipment.ts.
- **T5 진입점**: 하늘 ◎/ObjectSheet `sheet-telescope`/학습 미션→`#/telescope`; 설정→`#/equipment`. `telescopeStore`의 장비 프로필이 추천/시트에도 적용된다. 상대 센서 재시작 뒤 저장된 정렬을 자동 재사용하면 안 된다(D-029). 윗변 +Y 기준이며 영상 plate solving은 없다.
- **UI 규칙(D-021)**: 새 화면은 `docs/ARCHITECTURE.md` "UI 디자인 시스템 v2"와 토큰(`theme.css`)만 쓴다. 검색/오늘 밤/기록은 App의 `pt-status pb-tab` 래퍼를 쓴다. 배우기는 D-026: 자체 고정 제목·상단 4개 메뉴 + ScrollArea(pb-tab), 위치/센서 상태바는 생략한다. 카피는 D-021 용어집(해요체·평이한 용어)을 따른다.
- **스크롤 규칙(D-022)**: 세로 스크롤 영역은 `ui/ScrollArea.tsx`(마우스 드래그 스크롤·관성·페이드 오버레이)로 만든다. 스크롤러에 `mask-image`를 걸지 않는다. 드래그 스크롤이 닿으면 안 되는 컨트롤은 `touch-action: none` 또는 `data-drag-scroll="off"`. 사용자 보고("스크롤이 뻑뻑하고 스크롤 바를 정확히 눌러야 함")에 대한 수정이며, 실기기 확인은 T3b 체크리스트의 스크롤 항목으로 받는다.
- **주의(이 세션에서 겪은 것)**: 워크플로 에이전트가 "코드 스케치를 써 달라"는 프롬프트를 실제 경로에 파일을 만들었다가 지우는 바람에 `src/astro/phenomena.ts`가 사라진 적이 있다. 리서치용 에이전트 프롬프트에는 **"파일을 만들거나 고치지 말 것"**을 명시한다.
- 최신 검증: Vitest 356/356, Playwright 전체 33/33, typecheck/lint/build/data:validate 통과. 마무리 문구·UI 축소 후 관련 7/7 재검증. 장비/가이드 화면은 지연 로드, 초기 JS gzip 433.3KiB — T8에서 기존 대형 청크 분할.
- 데이터 원본(`data-src/raw/`)은 gitignore. 새 PC에서는 OneDrive 동기화로 `node_modules`·`data-src/raw`까지 같이 왔다(이 세션은 연구실 데스크톱에서 그대로 이어서 진행). 명령은 PowerShell + PATH 접두(`C:\Program Files\nodejs;C:\Program Files\GitHub CLI;%APPDATA%\npm`).
- 사용자 장비: 쌍안경 보유(모델 미확인), SVBONY SV48P(90mm f/5.5, FL 500mm) 구매 검토 중, 마운트 미정. 별길 장비 설정에서 직접 입력/선택한다. 기본 관측지 대전(KAIST); 관측지 화면의 실제 장소·보이는 범위를 추천에 사용한다.

## 최근 완료 보고

### T5 구현·관측 퀴즈·오늘 밤 개선 보고 (2026-09-08)

- 구현 요약: 한·영 관측/망원경 60문항·독립 12스테이지, 오늘 밤 3패널/접기·펼치기, 별길(+Y 상대 센서 1/2별/검증/방향 안내), 장비 CRUD·실제 FOV·차트/드래그·스타호핑, 정렬/스타호핑 미션·업적 연결.
- 산출물: 이번 main 변경 커밋, 위 Pages URL. learn/v1 240문항(204 활성), 기존 DB v2와 하늘28단계 계약 유지. T5 완료 태그는 실기기 검증 후, T7은 미완료.
- 수용 기준: ✅ 단위 수학/장비→2별→차트→호핑/실제 FOV 픽셀/태양 차단/영어·야간/기존 회귀. ⚠️ 실제 홀더 오차·10분 드리프트·상 방향 비교는 사용자 확인 대기. 계획의 도립/양축반전 ‘서로 다른 이미지’ 요구는 수학적으로 동일하므로 D-029에 정정. 쌍안경도 사용자 요청의 윗변 기준 사용.
- 자동 테스트: typecheck/lint/test/build/data:validate, Vitest 356개·Playwright 전체33개 통과. 권한 거부·데이터 중단·대기 중 종료·잘못된 두 별 거부, M13/M57/M31/M27/M11 경로, 코스별 최고점 보존, FOV 오차±2%, ko/en 360px 및 스크린샷 검토. 마지막 문구/정보밀도 보완 후 관련 7개 재검증.
- 결정: D-028 코스별 진도와 오늘 밤 분리, D-029 물리 +Y/상대 센서·정렬 유효성·실제 시야·학습 증거. 자료/문항 검토는 docs/OBSERVING-CONTENT.md.
- 알려진 한계: 카메라 별 무늬 자동 인식/GoTo 모터 제어/온라인 리더보드 없음. 실기기 정확도는 합성 테스트로 보장하지 않는다. 기존 skyPick36·장문 전체 영어 번역·T7/T8 잔여는 유지한다.
- 사용자 액션: 아래 docs/TESTING.md의 새 체크리스트(첫 스테이지/오늘 밤 메뉴/폰 윗변 홀더/1·2·3별/10분 드리프트/차트/실제 호핑 업적)를 확인하고 G4 수학 리뷰 요청. G3/G5 재생성·추가 의사결정 불필요.

### 배우기 UX·퀴즈 여정·반투명 지평선 완료 보고 (2026-09-07)
- 구현 요약: 하단 5개 탭 유지, 배우기 안을 퀴즈/코스/이야기/업적으로 분리. 퀴즈 첫 화면의 다음 도전, 3챕터·28스테이지·144문항, 별/도장/최고점·재도전·복습. 이야기 121편 검색/필터, 업적 조건 간결화. 지평선 아래 천체를 기본 표시하고 반투명 지면으로 구분. 읽기 화면 브라우저 확대 제한도 제거.
- 산출물: main 변경 커밋과 동일 Pages URL. 새 stageCatalog.json의 stage version=1; 기존 content/learn 팩 v1과 DB v2 계약 유지. T7 전체 완료 태그는 붙이지 않는다.
- 수용 기준: ✅ 화면 분리·주제/난이도·해제/재도전·진도 보존·반투명 렌더·조작/키보드/언어 UI. 실기기 신규 화면 체감은 사용자 확인 대기.
- 자동 테스트: typecheck/lint/build 통과, Vitest 333/333. Playwright 29개 시나리오 검증(전체 28 통과 후 새 테스트의 닫기 선택자 수정; 관련 학습/기록/지평선 재실행, 최종 여정 2개 통과). 사진/백업/오프라인·센서·하늘·스크롤 회귀 유지. 완료·재도전·다음 단계·새 브라우저 복원·360px·키보드 포커스·지평선 픽셀/선택 확인. 한/영·야간·업적·천체 스크린샷 직접 확인.
- 결정: D-026 탐색 분리·점수/스테이지 계약, D-027 반투명 지면과 관측 가능성 분리. Apple HIG(탭 복잡성), Duolingo 학습 경로, W3C WCAG 2.2 지침 참고.
- 알려진 이슈/후속: 온라인 리더보드(계정·서버 검증·동기화)는 아직 없다. 현재 점수는 기기 내 개인 기록이다. T5 및 T7 잔여 skyPick 36·T5 연계 미션/배지·하루 복습 상한은 유지. 영어 조작부와 새 스테이지 문구는 제공, 기존 이야기/미션/문항 장문 전체 영어 번역은 후속. 초기 JS gzip 약 437KB, T8 코드 분할.
- 사용자 액션: 폰에서 네 메뉴 이동/스크롤, 첫 스테이지 완주→도장/해제→재도전, 앱 재실행 후 진도, 지평선 위아래와 불투명 전환, 야간/English 가독성 확인. G3/G5 추가 생성 불필요. G4는 T5 후.


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

## 결정 기록 요약 (`DECISIONS.md` 전체 참조)

- 2026-09-06: PWA / 로컬 우선 저장 / Claude 세션 실행 / 데이터 라이선스 정책 — 마스터 플랜 §2
- 2026-09-06 (T0): D-007 환경, D-008 라이선스, D-011 해시 라우터, D-012 i18next, D-013 툴체인, D-014 데이터 팩 v1, D-015 astro 래퍼
- 2026-09-07: D-016 G2 병합 규칙, D-017 T1 렌더러, D-018 T2 센서 계층, D-019 T3a 검색·상세·찾아가기·관측 밤

- 2026-09-07 통합: D-023 관측 DB/백업, D-024 자연어 이야기, D-025 학습 연결/잠금 정책. T0~T2 보고는 plan/reports/2026-09-07-t0-t2.md.

- D-026(2026-09-07): 배우기 탐색 분리·퀴즈 여정·버전/점수/보존 규칙.
- D-027(2026-09-07): 기본 반투명 지면·지평선 아래 천체 표시, 관측 판정 분리.
- D-028(2026-09-08): 독립 관측 퀴즈 코스와 오늘 밤 정보 분리.
- D-029(2026-09-08): 별길 가이드의 물리 윗변·상대 센서·정렬/장비/시야·실제 업적 이벤트.
