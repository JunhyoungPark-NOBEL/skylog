# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-08 · 갱신자: Codex 로컬 · beta.3/build8 가독성·간결한 화면·센서 자동 시작
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- 모바일 빌드: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/mobile.yml
- 스토어 준비/서명/테스트: `docs/MOBILE-RELEASE.md`, `docs/STORE-LISTING.md`

## 이번 작업 보고 (2026-09-08 · beta.3/build8 가독성·자동 센서)

- 원격 main 최신 bfa7109를 fetch로 확인하고 build7 위에서 갱신했다. 앱 버전 0.1.0-beta.3, Android build8, 다음 CI 기본 번호9. 천문 좌표·별 개수·데이터 팩·DB v2는 유지한다.
- 별자리 연결선·경계를 두 테마 모두 흰색으로 고정하고 기존 투명도 설정에서도 대비를 높였다. 밝은 별 중심과 최소 표시 크기를 키웠다. 은하수 색/밀도/투명도의 중복 감쇠를 제거해 밤에 띠와 먼지 결이 보이게 했다. 실제 낮에는 대기 효과가 은하수를 가리며 하늘 설정에 설명한다. D-036은 D-034의 야간 전부 적색 원칙 중 별자리 선/경계만 수정한다.
- 첫 하늘 화면은 작은 접힌 시간 버튼과 반투명 52px 탭을 사용한다. 원형 하늘·별길·실제 하늘·선택 정렬은 하늘 설정으로 모았다. 글자 확대 시 탭/상태 높이가 늘며 AR 안내와 목표·좌표 HUD는 실제 높이로 배치한다.
- 방향 센서는 기본 자동 시작하며 끄기 선택을 저장한다. iPhone의 최초 동작 권한은 사용자 탭에서 요청한다. 북 기준이 없는 상대 yaw는 화면을 회전시키지 않으며 잠시 평평하게 들도록 안내한다. 고정 링크·원형 하늘에서는 센서가 차트를 덮어쓰지 않는다. 위치는 자동 사용 설정과 권한에 따라 앱 시작/복귀 시 한 번 갱신하고 저장 관측지 선택/꺼짐을 유지한다. 같은 GPS 이름이어도 먼 좌표의 예전 별 보정은 복원하지 않는다. D-037.
- typecheck/lint/단위433/데이터 검증/PWA 빌드 통과. 브라우저48개 항목 통과: 전체47 중 픽셀 검사용 preserve 캔버스 복귀 오류를 고친 후 관련20개와 마지막 UI 변경 관련14개를 다시 통과했다. 흰 선·은하수·큰 별·360px/글자200%·자동 센서/GPS 확인. 캡처와 로그는 artifacts/qa-build8. 같은 목표의 중복 정보 카드를 숨기고 센서 거부 안내를 줄여 큰 글자에서도 목표 HUD가 화면 안에 보인다.
- 앱 소스 `e17373169c2475183f424be81031fb28f7fc939c`를 main에 반영했다. [Pages 34195531010](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34195531010) 성공. 공개 웹 beta.3·작은 기본 UI·원형 하늘·SW·재실행/JS 오류0 확인. [APK 사전 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.3-build8)의 태그는 같은 앱 소스이며 실제 공개 APK를 다시 내려받아 해시를 대조했다.
- **개인 APK 완료**: `Downloads/skylog-release-0.1.0-beta.3-build8/skylog-0.1.0-beta.3-build8-local-test.apk`, 7,200,927 bytes, SHA256 `8adb1e44357b3631849ce6f604e9acf7395227d39a71da8dfba5fa6089ff450f`. build7 APK와 실제 인증서 대조 통과. 기존 개인 체험판을 삭제하지 않고 업데이트한다.
- **unsigned AAB 완료**: 같은 폴더 `skylog-0.1.0-beta.3-build8-unsigned.aab`, 6,913,704 bytes, SHA256 `d92406690d512d9e01bc4e8c94cc1615af88cc465ec7b00f40025c4e3be88698`. bundletool·API36/min24/version8·release/backup=false 확인, APK 서명/정렬 성공. AAB·APK·native public 160개 파일 SHA256 일치. 로컬 Android release/lint 성공(오류0/경고33).
- [모바일 CI 34195530826](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34195530826) **전체 성공**: Android release/lint·인터넷을 끈 API36 실제 WebView 계측, iOS Xcode26 arm64 무서명 컴파일. iPhone 설치용 서명 IPA는 아니다.
- Play 업로드 키 복원/최종 서명, Apple 팀 서명/TestFlight, 실제 Android/iPhone의 센서·그래픽 확인과 스토어 심사는 남는다. 현재 기능은 모두 무료이며 유료 상품/서버 권한은 구현하지 않았다. T5/T7/T8 전체 완료 태그 없음.

## 이전 작업 보고 (2026-09-08 · beta.2/build7 자동 안내·원형 천구)

- 별길은 나침반으로 바로 시작한다. 다른 별 정렬은 정밀 망원경 안내의 선택 기능이며, 상대 yaw를 실제 방위로 사용하지 않는다. 실제 별·선·은하수·목표가 안내 화면에 보인다. iOS 나침반 동기화/자북 편각/기기 +Y 규약과 자동·정밀 세션을 분리했다. 센서 중단 뒤 첫 샘플이 watchdog보다 먼저 도착해도 오래된 별 정렬을 무효화한다.
- 공통 입체 투영으로 최대180° 반구를 원형 표시하고 핀치/원형 하늘 버튼으로 축소한다. 별 중심·별자리 선 대비와 은하수의 차분한 색·먼지 결을 개선했다. 천문 좌표·데이터 팩·DB v2는 유지한다. CPU/GPU 별 위치·선택·원 밖 차단·야간 적색 렌더를 검증한다.
- 현재 버전 `0.1.0-beta.2`, Android build7. 기존 상세 창 전체 스와이프 개선도 포함한다. typecheck/lint/단위391/데이터 검증/PWA 빌드·브라우저43/43 통과. 최종 브라우저는 `--workers=1`: 병렬 SwiftShader 부하에 따른 시간 초과·관성 관찰 지연을 분리했다. 캡처와 검사 로그는 `artifacts/qa-build7`. 다음 CI 기본 번호8, 이번 CI는 명시적7로 실행했다.
- GitHub 인증 연결 완료. 원격 main 시작점은 `dce4a7d`, 로컬 직전 HEAD는 `f8893df`, 새 앱 소스는 `dad1c57`로 main에 반영했다. [Pages 34191154332](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34191154332) 성공, 공개 PWA에서 beta.2·원형 하늘·SW·재실행/JS 오류0 확인. 과거 build5/6의 인증 부재 기록은 현재 상태가 아니다.
- 유료화는 무료 기본+Pro 1회 구매와 두 사람의 무료 이용권을 제안했다. 가격/상품/결제/서버 권한은 아직 설정하지 않았으며 현재 베타와 PWA는 모두 무료다. `docs/MONETIZATION-PLAN.md`, 결정 D-034/D-035. 상업 날씨 API 조건 해결도 유료 출시 전 필요하다.
- Play 업로드 키 복원/최종 서명, Apple 팀의 서명/TestFlight, 실제 Android/iPhone 센서·그래픽·스크롤 확인과 스토어 심사는 남는다. T5/T7/T8 전체 완료나 실기기 통과로 표시하지 않는다. 설치·업데이트·실기기 체크는 `docs/INSTALL-ON-PHONE.md`.
- **개인 APK 완료**: `C:\Users\박준형\Downloads\skylog-release-0.1.0-beta.2-build7\skylog-0.1.0-beta.2-build7-local-test.apk`, 7,196,831 bytes, SHA256 `ff2f07b6154b85499c388c1b9a4a84076751fab32b4351a16d74dcb38bb1e143`. build6 APK와 같은 인증서를 대조했다. 기존 앱을 삭제하지 않고 업데이트한다.
- **unsigned AAB 완료**: 같은 폴더의 `skylog-0.1.0-beta.2-build7-unsigned.aab`, 6,909,192 bytes, SHA256 `d979ba6b8b89ac5253a149e53fa6a7ec8134e0ccd1c688d2133483ebc492f7c9`. bundletool·API36/min24/version7·release/backup=false 확인, APK 서명/정렬 성공. AAB·APK·native public 160개 파일 SHA256 일치. Android release/lint 성공(오류0/경고33).
- [APK 공개 사전 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.2-build7)를 만들고 실제 다운로드 파일의 크기/해시를 대조했다. 릴리스 태그는 앱 소스 `dad1c57`을 가리킨다. [모바일 CI 34191154190](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34191154190) **전체 성공**: Android release/lint·인터넷을 끈 API36 실제 WebView 계측, iOS Xcode26 arm64 무서명 컴파일. iPhone 설치용 서명 IPA는 아니다.

## 이전 작업 보고 (2026-09-08 · build6 상세 창 스와이프)

- 사용자 요청: iPhone의 APK 실행 가능 여부 설명, 별 → 자세히 화면에서 작은 손잡이 대신 본문 어디서든 위아래로 쓸어 조작. `useSheetGesture`로 본문·제목·버튼 행을 연결했다. 반쯤 열린 창 위로 펼치기 → 전체에서 내용 스크롤 → 맨 위에서 새 아래 동작으로 접기/닫기. 드래그 중 높이도 손가락을 따라간다.
- 버튼의 짧은 탭·키보드·가로 행을 유지하고, 드래그 뒤 합성 클릭과 취소/두 손가락 추가에 의한 의도치 않은 단계 변경을 막았다. 마우스 첫 이동이 창 밖으로 나가는 경우와 본문 관성 중 제목을 잡을 때도 처리한다. 결정 D-033, 좌표계·센서·DB·데이터 팩 변경 없음.
- **새 개인 APK**: `C:\Users\박준형\Downloads\skylog-release-0.1.0-beta.1-build6\skylog-0.1.0-beta.1-build6-local-test.apk`, 7,192,735 bytes, SHA256 `f132c61c72cf9f21d4123e46fbc70472c173ab20629307ca2f7700660ba6e3a8`. versionCode6, build5와 동일한 테스트 인증서를 두 APK에서 직접 대조했다. 기존 build5를 삭제하지 않고 업데이트 설치한다.
- **새 unsigned AAB**: 같은 폴더의 `skylog-0.1.0-beta.1-build6-unsigned.aab`, 6,904,666 bytes, SHA256 `64d972cd49848f26e01edfa066d9b366f03f99b9917224cae146e7ff3f96d05d`. Play 업로드 키 복원/최종 서명은 계속 대기다. CI 다음 기본 번호7.
- 검증: typecheck/lint/단위366/브라우저 **40/40**/data/native sync 통과. 새 터치·마우스·버튼·취소·관성 회귀 포함. Android release AAB/APK/lint 성공(오류0/경고33), APK 서명/정렬·bundletool 성공. AAB·APK·현재 native public **160개 파일(빈 파일2개 포함)의 SHA256 전부 일치**. 상세 화면 캡처 확인, `artifacts/qa-build6`에 로그/화면 보관. 실제 Android 설치·iPhone Safari/Core Motion 실행은 미검증.
- 원격 HEAD는 재확인한 `dce4a7d` 그대로이며 로컬 변경은 push하지 못했다. 현재 GitHub 인증이 없어 **이번 스와이프 수정은 공개 Pages에 아직 없다**. iPhone은 APK를 실행할 수 없으며 기존 Safari 홈 화면 PWA 또는 별도 서명 iOS 앱을 사용한다. 공개 웹 반영은 GitHub 인증 후 배포, TestFlight는 Apple 팀·Mac 서명/Archive가 필요하다.
- 사용자 확인: 새 APK 업데이트 → 별/자세히 → 본문 위로 펼치기/스크롤/맨 위 아래로 접기 → 즐겨찾기 탭과 가로 행. 설치 안내 `docs/INSTALL-ON-PHONE.md`. 스토어 공개 출시·T5/T7/T8 잔여 유지, 완료 태그 없음.

이전 build5 완료 기록은 [보관 보고](reports/2026-09-08-build5.md)를 참고한다.

이전 build4 완료 기록은 [보관 보고](reports/2026-09-08-build4.md)를 참고한다.

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
- **환경**: 이 실행은 Codex 데스크톱 로컬. Node 24.19.0·portable pnpm 12.3.4(`%LOCALAPPDATA%/skylog-tools/pnpm-12.3.4/package`를 PATH 앞에 둠), Git Credential Manager JunhyoungPark-NOBEL 인증 완료(gh CLI 없음). 새 PC Chromium 1243은 설치 완료. 이번 실행은 파일/네트워크 접근 가능(이전 세션의 읽기 전용 제한은 현재 해당 없음).

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

이전 T3b/T4/T5/T6·학습 UX 보고는 [기능 개발 보관 기록](reports/2026-09-08-pre-mobile-history.md)을 참고한다.

## 결정 기록 요약 (`DECISIONS.md` 전체 참조)

- 2026-09-06: PWA / 로컬 우선 저장 / Claude 세션 실행 / 데이터 라이선스 정책 — 마스터 플랜 §2
- 2026-09-06 (T0): D-007 환경, D-008 라이선스, D-011 해시 라우터, D-012 i18next, D-013 툴체인, D-014 데이터 팩 v1, D-015 astro 래퍼
- 2026-09-07: D-016 G2 병합 규칙, D-017 T1 렌더러, D-018 T2 센서 계층, D-019 T3a 검색·상세·찾아가기·관측 밤

- 2026-09-07 통합: D-023 관측 DB/백업, D-024 자연어 이야기, D-025 학습 연결/잠금 정책. T0~T2 보고는 plan/reports/2026-09-07-t0-t2.md.

- D-026(2026-09-07): 배우기 탐색 분리·퀴즈 여정·버전/점수/보존 규칙.
- D-027(2026-09-07): 기본 반투명 지면·지평선 아래 천체 표시, 관측 판정 분리.
- D-028(2026-09-08): 독립 관측 퀴즈 코스와 오늘 밤 정보 분리.
- D-029(2026-09-08): 별길 가이드의 물리 윗변·상대 센서·정렬/장비/시야·실제 업적 이벤트.
