# 스카이야드 Skyard (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-11 · beta.17/build23 풍경·업적·역사 학습 개편, 서명 AAB/APK·공개 배포 완료
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- 앱: https://junhyoungpark-nobel.github.io/skylog/ · 내 프로필: https://junhyoungpark-nobel.github.io/skylog/#/profile
- 최신 산출물: 로컬 `Downloads/skylog-release-0.1.0-beta.17-build23/skylog-0.1.0-beta.17-build23-play-signed.aab` · [APK 다운로드](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.17-build23/skylog-0.1.0-beta.17-build23-local-test.apk)
- 모바일 빌드: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/mobile.yml
- 스토어 준비/서명/테스트: `docs/MOBILE-RELEASE.md`, `docs/STORE-LISTING.md`

## 이번 작업 보고 (2026-09-11 · 풍경과 단계별 천체물리 / build23)

- 설산·돌산·바다·들판 원경과 지면4개를 조합한다. 작은 꽃·돌·풀 장식4개는 주택·관측 데크·강아지로 대체해 장식20개를 제공하고, 이전 배치/보상은 이름 이관으로 보존한다. 첫 하늘·프로필은 같은 그림을 쓰고 댓글에는 아바타만 보인다. 원경은 고도0° 아래, 강아지는 장식 기본 크기의0.6배다.
- 기존 업적48개를 5분류(11·8·9·11·9개)와 가로3칸 카드로 묶었다. 전체·분류별 달성수, 개별 상세조건·진도를 표시하며 ID·획득 조건은 보존한다. 이야기 하늘 도해는 같은 좌표에 더 진한 연결선을 사용한다.
- 역사 이야기10개는 각각9단계로 이어진다. 60개 개념 질문과30개 채점 문항의 정답/오차는 보존한다. 용어는450ms 홀드로 열고 짧은 탭/스크롤에서는 열리지 않으며 키보드 접근을 지원한다. 장 경계에서도 미저장 답·메모 보존을 검증한다.
- migration202609110002를 운영 Supabase에 적용했다. 기존 회원1·사진0·댓글0와 회원 데이터 지문, RLS·익명 쓰기 차단을 보존했다. 공개 프로필의 선택적 backdrop만 확장하며 실제 사용자 프로필 게시를 수행하지 않았다. 로컬 PostgreSQL/RLS 관련150개 검사 통과.
- 버전은0.1.0-beta.17/code23. 타입·전체 lint·변경 파일 포맷·PWA 빌드, 전체102파일/745개 단위 검사와 정적 Chromium33개(실제 PWA 오프라인2개 포함), 실제 WebGL7개를 통과했다. 서명 AAB/APK 생성·공개 배포를 완료했고 아래에 최종 근거를 기록했다. 실제 결제·광고·일반 SMTP·Apple 배포 서명은 변경하지 않는다. 결정 D-069; 설명 docs/HORIZON-ART.md·HORIZON-PROFILES.md·ACHIEVEMENT-COLLECTION.md·HISTORY-LEARNING-UX.md.

- **최종 산출물**: 소스 `0287a2b8a5a49275fdb9f7e627a9008f7485962b`, beta.17/code23/min24/target36. 제출 AAB **20,849,753bytes** · SHA256 `b732d47a80ffd1af91b729423fb2e940c560d2f7afd6bbb843349c8716b0f50b`. 기존 업로드키·jarsigner strict·bundletool 검증과 payload1077개 전체 서명/원본 일치. 개인 APK **21,462,491bytes** · SHA256 `63c003206fa60c9ad39f1592cdd383a399393e6dcc0165972ec6144b477afa58`, build21 인증서와 동일하며 16KB 정렬·공개 재다운로드 일치를 확인했다. native572/public480/사진328개의 APK·AAB·로컬 Android/iOS 일치, Android lint 오류0·경고32. 키·암호는 배포 폴더에 포함하지 않았다.
- **배포/CI**: [Pages 34568725207](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34568725207)·[모바일 34568743773](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34568743773) 전체 성공. Android API36 오프라인 계측·release/lint와 iOS Xcode26 무서명 Release 컴파일의 job/step 성공을 확인했다. 공개 앱의 풍경·업적·역사·도해9개 시나리오와 자산 해시·PNG를 확인했고 서버 쓰기·콘솔/JS오류0이다. CI XML 원본을 별도로 내려받아 재분석하지 않았으며 Apple 배포 서명이나 실제 휴대폰 검증으로 간주하지 않는다. 공개 브라우저 검수는 artifacts/qa-build23/public-release-verification.json에 보관한다.
- **사용자 확인**: 기존 개인 APK 위에 업데이트 후 지평선 선택/보존·센서 이동·용어 홀드·단계 왕복을 확인한다. 아이폰은 기존 홈 화면 웹앱을 다시 열어 beta.17을 확인하고 오프라인 재실행한다. 실제 Play 업로드/심사·Apple 서명·실결제·일반 SMTP는 별도다.

## 이전 작업 보고 (2026-09-11 · 플레이 제출용 AAB 재생성)

- Android AAB `0.1.0-beta.16-build22-play-signed.aab` 생성 완료. 소스는 `f4a584442126a855c3a85565201e3e8c610fb984`, 버전은 `0.1.0-beta.16` / `versionCode22`, 패키지 `io.github.junhyoungparknobel.skylog`.
- 산출물 해시: Play 제출 AAB `18ADAE63BB34A736F4C0B8BE90A8ECB3CB44A0E8FCBF3E10F761E005B3324E5D`, 무서명 `1DDE39EDF9627CC131541E5606A63B69596F501123444F376DB69C7CF8799A0A`.
- 기능은 기존 build21 상태 유지(별자리/배경/사진/커뮤니티/유료 예시 구조 변경 없음). jarsigner strict 및 `bundletool validate`는 로컬에서 통과.
- 현재 작업 폴더 경로가 비ASCII 경로라 `android/gradle.properties`에 `android.overridePathCheck=true`를 적용해 재현 가능한 빌드 환경을 고정함(D-068).

## 이전 작업 보고 (2026-09-11 · 첫 하늘과 연결되는 지평선 꾸미기 / build21 검증 반영)

- 사용자의 마당 개편 요청에 따라 같은 장식 도안을 첫 하늘 화면·개인/공개 프로필에서 사용한다. 댓글에는 아바타 초상만 보이고, 작성자 프로필을 열면 공개한 지평선과 함께 보인다(D-067).
- 장식21개(벤치·식탁·정자·서로 다른 망원경 등), 지면4개, 아바타 보상28개. 신규 기본 지평선은 남쪽 벤치1개·잔디이며 나머지 장식20개·지면3개는 기존 활성 업적으로 해금한다. 예전 무료 코디·장식과 획득 보상은 ownership-v2 이관으로 보존하고 신규 저장을 기존 사용자로 오인하지 않는다.
- 장식은 고도0° 아래에서 기존 지면에 한 번만 합성하며 카메라·센서 갱신마다 이미지를 만들지 않는다. 단일 불투명도, 야간 적색, 아래 보기 페이드, 원형 줌아웃, DB 갱신 경합·WebGL 복구를 검증했다. 360px 초기 화면에서 벤치가 하단 UI 위에 보이며 기존 카메라 기본값을 유지했다.
- 공개 동기화는 enum만 보낸다. SQL migration202609110001을 운영 서버에 적용하고 회원1·사진0·댓글0 및 기존 회원 지문을 보존했다. RLS·익명 RPC 차단·계정 경합과 한영 개인정보 안내를 갱신했다. 함수3개 본문이 로컬 SQL과 일치하며 실제 사용자 프로필은 게시하지 않았다.
- 타입·전체 lint·포맷·PWA 빌드·전체99파일/733단위, 관련 Chromium26개(오프라인1 포함), PostgreSQL/RLS78개, 실제 WebGL7개 통과. 모달 그림 클릭 후 Escape와 야간 글자색을 실제 브라우저에서 수정·회귀 검증했다. 꾸미기 구매·광고·실결제·SMTP 설정은 변경하지 않았다. 설명/보존 기준: docs/HORIZON-PROFILES.md.
- 실제 서비스워커를 사용한 오프라인 지평선 E2E 1개 통과(9.9초). 온라인 벤치 배치 저장 → 오프라인 재실행 → 다른 자리로 이동·크기 변경 → 하늘 첫 렌더 → 다시 실행해 보존을 확인했다. 오프라인 문서 2회 모두 HTTP 200·서비스워커 응답이며 WebGL 컨텍스트 정상, 외부 요청·서버 쓰기·JavaScript 오류 0이다. 저장한 남동쪽 144°의 벤치가 실제 하늘 지면에 보이는 캡처를 직접 검수했다. `artifacts/qa-build20/horizon-offline.log`, `horizon-offline-results/` 참고. 물리 휴대폰 검증과 구분한다.

- beta.13/build18·beta.14/build19의 유료 콘텐츠·학습·출시 보고는 [보관 기록](reports/2026-09-11-beta13-beta14-release-history.md)을 참고한다.

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
| T7 학습 시스템 | 🟡 진행 중 | | | 하늘28+관측12스테이지. 6코스·미션30/30·배지48(기존18+확장30)·퀴즈204/240 활성. skyPick36·하루 복습 상한·배지 이력 후속 |
| T8 마감·품질·릴리스 | ⬜ 대기 | | | |
| T9 무료 마당·커뮤니티 | 🟡 구현·서버 검증, 개통 준비 | 2026-09-08 | | SMTP·운영자 앱 계정·실기기 대기. docs/FREE-COMMUNITY.md |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ✅ 반영(D-018) | `plan/research/G1-sensors-ux.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ✅ 병합 완료(D-016) | `plan/research/G2-korean-names.md`, `*.csv`, `28-mansions-ko.md` |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | ✅ **121개 앱 반영(2026-09-07)** — G3+G5 통합팩. 정본은 `G3/G3-content-cumulative-121.json`(이전 배치·누적80과 중복 병합 금지). needsReview 112개(거리·등급 대역 보류 등)는 표시 정책으로 처리 | `plan/research/G3-G5-integrated/`(전체 팩, archive zip 제외), 항목별 분할 원본 `data-src/content-raw/G3-original/`, 자연어 재작성본 `data-src/content-raw/G3-natural/`(T6) |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | 🟡 지금 요청 가능 | `astro/pointing.ts`, `astro/finder.ts`, `sensors/telescopeOrientation.ts`, `sensors/orientation/{math,filter,calibration}.ts`, 관련 단위 테스트. docs/TESTING.md에 첨부 목록 |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | ✅ 앱 반영. G5 180문항 중 skyPick36만 잠금. 2026-09-08 T5 연결로 미션30·배지18 활성, 독자 작성 한·영 관측60문항 추가로 총240/활성204. 별자리 배지는 실제 별자리 관측 기록만 인정 | `plan/research/G3-G5-integrated/G5/`(정본 유지), 추가 `data-src/learn-raw/observing-quiz.json`. 옛 준비팩은 참고용 |

## 다음 세션이 알아야 할 것

- **현재 작업**: beta.17/build23 풍경·업적·단계별 역사 학습 개편(D-069). 새 선택적 backdrop은 migration202609110002와 함께 사용한다. 기존 Play/개인 APK 키를 재사용하며 최종 검사·산출물·배포 상태는 문서 맨 위와 docs/MOBILE-RELEASE.md를 따른다.

- **우선 사항**: 최신 유료화는 D-064, ₩9,900 1회 구매 계획이다. 현재 무료 베타 미리보기이며 구매 브리지/권한 검사는 구현했지만 실제 상품·purchases 서버·환불 재검증·일반 SMTP·두 사람의 무상 grant는 미완료다. D-053~054는 이전 설계 이력이다. docs/BILLING-SETUP.md·MONETIZATION-PLAN.md를 따른다. Supabase ijxuwtbcwifttiuwvqrh/서울 대시보드 인증으로 지평선 migration202609110002까지 적용했다. 대시보드 인증은 CLI 인증과 구분하며 일반 가입·숫자 메일 준비 전 VITE_COMMUNITY_SIGNUPS_READY/EMAIL_CODE를 켜지 않는다. 공개 프로필만 사용자가 명시적으로 동기화하며 개인 백업은 수동 스냅샷이다.

- 최신 지평선은 D-069(이전 D-067)와 docs/HORIZON-ART.md·HORIZON-PROFILES.md가 정본이다. D-045의 실제 잔디 이미지와 독립 마당 설계는 이전 이력이다. 개인 APK 키는 보존한다. Play는 최초 업로드 전이라는 확인에 따라 현재 PC에서 마련한 전용키를 재사용한다(D-061). Console 등록 뒤에도 키를 임의 변경하지 않는다.

- **학습 탐색/스테이지(D-026)**: features/learn의 LearnScreen → QuizJourney/CoursesScreen/StoriesScreen/AchievementsScreen. 해시 section/path/mission/chapter로 복원하며 하단 탭 복귀 시 마지막 배우기 경로 유지. stageCatalog는 144문항을 중복 없이 고정한 28단계, 정답률 80% 해제·60/80/100% 별, 개인 합계는 단계별 최고점만. stage/question 버전을 함께 검증하며 마지막 응답과 완료 기록은 원자 저장. 기존 미션/응답/복습/관측 유지, 새 도장은 새 여정을 완주해야 획득한다. 리더보드는 아직 로컬 점수 기반만 준비됨.
- **하늘 설정(D-038)**: `groundOpacity` 기본1, 단일 슬라이더와 기본값 복원. 불투명도1이면 지평선 아래 표시·선택을 함께 막고1 미만이면 함께 허용한다. layers persist v2로 이전 옵션을 이관한다. 기본 경계 false·은하수0.33·별 채도1, 저장된 커스텀 설정은 보존한다. 실제 관측 가능 판정은 그대로다.

- **다음 작업**: T5 실기기 정렬/드리프트 결과와 G4 반영 → T7 잔여(skyPick 36, 하루 복습 누적 상한·배지 이력/연출) → T8. G3/G5 추가 생성은 불필요. 사용자는 솔로몬 HQ 8×42 ED와 SV48P 102mm를 사용한다. FOV/접안 사양은 시작 예시로 두고 직접 입력하도록 요청했다. 7.50°·25mm/52°를 실제 장비 사양으로 단정하지 않는다(D-039).
- **학습/콘텐츠**: 한국어 재서술본은 data-src/*-raw/*-natural, 게시본은 public/data/{content,learn}/v1이며 확장 업적48개는 public/data/learn/v2다. 기존18개 ID/규칙과 코스·퀴즈 v1을 보존한다(D-040). `pnpm data:content` 다음 `pnpm data:learn`; CI는 이야기121/G5원본180+추가60 참조와 근거를 검증한다. 새 관측12단계는 별도 observingStages.json이며 기존 stageCatalog 28단계를 변경하지 않는다. 수치 검토112·G2 이름42는 docs/CONTENT-REVIEW.md. 새60문항은 전부 영어 제공, 기존 장문 전체 번역은 후속이다.
- **환경**: 이 실행은 Codex 데스크톱 로컬. Node 24.19.0·portable pnpm 12.3.4(`%LOCALAPPDATA%/skylog-tools/pnpm-12.3.4/package`를 PATH 앞에 둠), Git Credential Manager JunhyoungPark-NOBEL 인증 완료(GCM 인증 확인, 이 PC에는 gh CLI 없음). 새 PC Chromium 1243은 설치 완료. 이번 실행은 파일/네트워크 접근 가능(이전 세션의 읽기 전용 제한은 현재 해당 없음).

- **T2 실기기 통과**(2026-09-07, 사용자 보고 "문제 없이 잘 돼"). 덤프·기기 정보는 받지 못했으므로 D-018의 기본값(compassAxis='top', iOS 편각 적용, 필터 상수)을 그대로 둔다. 문제가 보고되면 센서 디버그 "덤프 복사" 텍스트로 원인을 특정한 뒤 테스트 벡터부터 고친다.
- 센서 관련 진입점: `sensors/orientation/manager.ts`(`sensorManager` 싱글턴: start/stop/nudge/setCalibration/currentAltAz), `state/sensorStore.ts`, `features/sky/ArToggle.tsx`·`CalibrationWizard.tsx`, 시뮬레이터 `features/sky/SensorSimPanel.tsx`(설정 → 개발자 → 센서 디버그에서 켬). 테스트 훅 `window.__skylogSensor`(스토어 상태).
- 부호 규약·파이프라인은 `docs/ARCHITECTURE.md` "센서 파이프라인"과 D-018. **"대충 맞을 때까지" 부호를 바꾸지 말 것** — 실기기 덤프로 원인을 특정한 뒤 테스트 벡터를 먼저 고친다.
- **기록·학습 진입점**: db/repos/observations.ts, state/logStore.ts, features/log/ObservationFormHost.tsx, learn/runtime.ts. ObjectSheet의 기록·이야기 액션은 실제 화면에 연결됐다. T5 장비 CRUD API는 db/repos/equipment.ts.
- **T5 진입점**: 하늘 ◎/ObjectSheet `sheet-telescope`/학습 미션→`#/telescope`; 설정→`#/equipment`. `telescopeStore`의 장비 프로필이 추천/시트에도 적용된다. 상대 센서 재시작 뒤 저장된 정렬을 자동 재사용하면 안 된다(D-029). 윗변 +Y 기준이며 영상 plate solving은 없다.
- **UI 규칙(D-021)**: 새 화면은 `docs/ARCHITECTURE.md` "UI 디자인 시스템 v2"와 토큰(`theme.css`)만 쓴다. 검색/오늘 밤/기록은 App의 `pt-status pb-tab` 래퍼를 쓴다. 배우기는 D-026: 자체 고정 제목·상단 4개 메뉴 + ScrollArea(pb-tab), 위치/센서 상태바는 생략한다. 카피는 D-021 용어집(해요체·평이한 용어)을 따른다.
- **스크롤 규칙(D-022)**: 세로 스크롤 영역은 `ui/ScrollArea.tsx`(마우스 드래그 스크롤·관성·페이드 오버레이)로 만든다. 스크롤러에 `mask-image`를 걸지 않는다. 드래그 스크롤이 닿으면 안 되는 컨트롤은 `touch-action: none` 또는 `data-drag-scroll="off"`. 사용자 보고("스크롤이 뻑뻑하고 스크롤 바를 정확히 눌러야 함")에 대한 수정이며, 실기기 확인은 T3b 체크리스트의 스크롤 항목으로 받는다.
- **주의(이 세션에서 겪은 것)**: 워크플로 에이전트가 "코드 스케치를 써 달라"는 프롬프트를 실제 경로에 파일을 만들었다가 지우는 바람에 `src/astro/phenomena.ts`가 사라진 적이 있다. 리서치용 에이전트 프롬프트에는 **"파일을 만들거나 고치지 말 것"**을 명시한다.
- **최신 검증**: 문서 맨 위 beta.16/build22 보고를 따른다. 이전 버전 수치는 당시 이력이며 실제 휴대폰 센서/성능·일반 SMTP·스토어 심사·Apple 서명은 별도다.
- 데이터 원본(`data-src/raw/`)은 gitignore이며 새 환경에서 재생성할 때 원본 확보가 필요하다. 현재 실행 경로와 pnpm PATH는 위 **환경** 항목을 따른다. 과거 OneDrive PC 경로를 현재 작업 경로로 사용하지 않는다.
- **사용자 장비**: 솔로몬 HQ 8×42 ED, SVBONY SV48P 102mm(제조사 초점거리663mm). 사용자 요청으로 쌍안경 시야7.50°·접안25mm/52°는 시작 예시이며 직접 입력하도록 한다. 마운트/실제 접안 사양은 확정하지 않았다. 관측지는 자동 GPS 또는 사용자가 고른 저장 장소·보이는 범위를 따른다.

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

- D-038~D-041(2026-09-08): 하늘 기본값·단일 지면/천체 표시, 두 장비 시야 예시, 업적 v2/기존 진도 호환, 센서 프레임 보간·Dexie 중복 쓰기 제거.

