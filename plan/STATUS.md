# 스카이야드 Skyard (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-11 · beta.16/build22 AAB 재생성 완료(로컬 제출 준비)
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- 앱: https://junhyoungpark-nobel.github.io/skylog/ · 내 프로필: https://junhyoungpark-nobel.github.io/skylog/#/profile
- 최신 산출물: 로컬 `Downloads/skylog-release-0.1.0-beta.16-build22/` (`0.1.0-beta.16-build22-play-signed.aab`)
- 모바일 빌드: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/mobile.yml
- 스토어 준비/서명/테스트: `docs/MOBILE-RELEASE.md`, `docs/STORE-LISTING.md`

## 이번 작업 보고 (2026-09-11 · 플레이 제출용 AAB 재생성)

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

## 이전 작업 보고 (2026-09-11 · 선행 문제로 배우는 역사 천체물리)

- 사용자의 최신 정정: 짧은 정의를 먼저 읽게 하는 방식 대신, 본 문제 앞의 선행 문제로 개념을 익힌다. 전문 용어는 길게 눌러 뜻을 확인한다(D-066).
- 30개 본 문제 앞에 60개 준비 문제를 연결하고, 관측 상황 → 개념 질문 → 관계 연습 → 본 문제로 이어지는 한영 흐름을 구성한다. 한 번에 한 문제만 표시하고 오답 피드백·재시도·건너뛰기·준비 복습을 지원한다. 준비 진도는 별도 `learn.preparation:` 키에 저장하며 원래 채점·ID·메모·30개 본 문제의 수치 답을 보존한다.
- 10개 역사 주제의 도해를 30개 문항 상황에 맞춰 제공한다. 수식은 로컬 KaTeX/글꼴로 렌더링하고 변수 이탤릭·아래첨자 직립체와 MathML을 적용한다. 용어 홀딩은 스크롤 이동 시 취소되며 탭·키보드도 지원한다. `docs/HISTORY-LEARNING-UX.md` 참고.
- 이야기 121개 중 정확 일치 사진 58개·대상을 함께 담은 이중성단 사진 2개·카탈로그 도해 61개를 목록/오늘 카드/상세에 연결했다. 다른 대상 사진으로 대체하지 않으며 도해는 사진과 구분한다. 출처는 상세에서 확인한다. `docs/STORY-IMAGES.md` 참고.
- 현재 공개 버전은 beta.14/build19다. 광고 없음·9,900원 1회 구매 계획과 preview 모드를 유지하며 실제 구매 서버/상품/SMTP를 변경하지 않는다.
- 통합 검증: 타입·전체 lint·변경 파일 포맷·전체 93파일/701개 단위 통과. 360px·영어125%·야간·용어 실제 CDP 홀딩·오답 재시도·진도·초안·이야기 이미지/출처의 정적 번들 Chromium 8개 통과. 독립 검토에서 찾은 홀딩 해제 후 모달 즉시 닫힘, 조회 재시도 때 선택이 다른 준비 문제로 옮겨 붙음, 이전 제목 초점 안내를 수정하고 회귀 검사했다. 60개 한영 도해의 작은 폭 검수·원래 문제 데이터 구조 동일성·수식 전체 렌더링 검증을 완료했다. 관련 로그와 최초 실패 증거는 `artifacts/qa-build19/` 등에 보존했다.
- 실제 PWA 서비스워커를 사용하는 오프라인 E2E 1개도 통과했다. 첫 선행 문제 정답 후 오프라인 새로고침 → 두 번째 완료 → 본 문제 입력/힌트/메모 저장 → 다시 새로고침해 보존 → 미방문 Kepler 도해·수식과 캐시된 로컬 글꼴 열기를 확인했다. 외부 요청·서버 쓰기·글꼴 실패·JS 오류 0. Node JSON import·worker activating 대기·라디오 선택자의 초기 하네스 실패를 수정하고 로그를 보존했다. 전체 관련 Chromium 검사는 9개이며 실제 아이폰 검증과 구분한다.
- **최종 소스/산출물**: `c31c615e89dafeb64af48ee1095d571265d178e9`, beta.14/code19/min24/target36. 로컬 Downloads/skylog-release-0.1.0-beta.14-build19/의 Play 서명 AAB **20,820,473bytes** · SHA256 `37aa667b96cd87c5a43294abd6d2e49df2a09bd01ae57271a66b7b48af992887`. 기존 업로드 인증서·jarsigner strict·bundletool·payload1072개 전체 서명과 원본 일치. 개인 APK **21,433,369bytes** · SHA256 `848166e5601427eb5b1fef6901d5bb0a04ddd7349194a225ad7534744f230ade`. 이전 build18 인증서·16KB 정렬·native567/public480/사진328개 비교, 공개 APK 재다운로드 일치. Android lint 오류0/경고32. 키/암호는 배포 폴더에 포함하지 않았다.
- **배포/CI**: [Pages34549739499](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34549739499) build/deploy, [모바일34549764863](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34549764863) validate-version/android/ios 모든 step 성공. Android API36 오프라인 계측·릴리스/lint, iOS Xcode26 무서명 Release 컴파일 단계를 확인했다. API 응답의 job/step 성공을 검증했으며 CI 아티팩트 XML 원본을 별도로 내려받아 재분석하지 않았다. 실제 휴대폰·Apple 서명·실제 거래/심사는 별도다.
- **공개 웹 검사**: 새 Chromium context에서 실제 beta.14·선행2단계·길게 누른 뒤 손을 떼어도 설명 유지·KaTeX Main/Math 로컬 글꼴·토성 이야기 사진과 출처를 확인했다. 공개 JS/CSS/woff2 실제 응답17개 해시를 기록하고 PNG3장을 검수했다. 외부 요청·쓰기·실패 요청·JS오류0. `artifacts/qa-build19/public-web-verification.json`, `pages-ci.json`, `mobile-ci.json`과 다운로드 폴더의 READ-ME-KO.txt에 설치/검증 범위를 보관했다.

## 이전 작업 보고 (2026-09-10 · Plus 콘텐츠와 첫 판매 준비)

- 사용자 확정: **9,900원 1회 구매**, 광고·구독 없음. 정식 상품은 `skyard_plus_lifetime` / `buy`. 현재 앱은 명시적인 **베타 미리보기**이며 실결제 활성화와 구분한다(D-064). `docs/MONETIZATION-PLAN.md` 최신 절이 이전 계획을 대체한다.
- ‘배우기 → 퀴즈 → 천체물리’에 역사 이야기 10개·30문제(수치 21/선택 9)·힌트 90개와 한영 풀이·출처를 추가했다. 메모 저장·단계별 힌트·원답 재채점·재도전·복습 필터를 지원한다. `learn.history:*`를 기존 progress에 보관하며 DB 버전·미션 키·기존 점수를 바꾸지 않는다. `docs/HISTORY-QUESTS-SOURCES.md`에 문제의 가정과 수치 답 21개의 독립 검산을 기록했다.
- 심화 퀴즈·망원경 코스의 선택·저장·딥링크에 권한 검사를 연결했다. 무료 맨눈·쌍안경 미션에 지정된 심화 확인 문제 20개는 해당 활성 미션 안에서 무료로 풀 수 있다. 자동 정답 처리나 미션 키 이관은 없다. 기본 망원경 관측 도구·내 기록·획득 보상은 계속 무료다.
- Android Billing 9.1.0 브리지·계정 귀속·Google 검증·서버 승인·환불 재검증·서버 무료 권한 코드를 작성했다. **실제 상품·Google 서비스 계정·purchases 서버 배포·환불 스케줄러·SMTP·심사 접근·두 사람의 무료 권한 부여·장기 오프라인 권한은 미완료**다. `docs/BILLING-SETUP.md`의 외부 설정과 라이선스 테스트 후 live로 전환한다. preview에서는 로그인 여부와 관계없이 구매 API를 호출하지 않는다.
- 사진·댓글의 공통 아바타와 닉네임, 명시적인 공개 프로필 동기화·계정 변경 방어, 별 모자 2개·천체 배경 4개를 추가했다(D-065). 기존 보상 6개를 보존하고 공개 아바타 선택값을 개인정보처리방침에 한영으로 고지했다. 프로필 migration 202609100001을 실제 Supabase에 적용해 아바타 열·RPC·RLS와 회원 1명·댓글 0개 보존을 확인했다. 익명 수정·일반 회원의 정지 상태 수정은 차단된다. 증거: `artifacts/qa-build18/community-server-verification.json`.
- 검증: 전체 83파일·652개 단위 테스트와 lint 통과. 관련 Chromium 15개(공개 프로필·아바타·댓글)와 4개(역사/Plus·업적) 통과. 초기 dev 테스트는 기록용 HTML의 Vite 갱신과 느린 모듈 로드로 실패했고, 증거를 보존한 뒤 watch 제외·정적 preview로 재검증했다. Windows WebKit은 12개 통과·오프라인 문서 새로고침 1개 내부 오류로 미확인이다. 열린 앱의 오프라인 답 저장은 통과했으며 동일한 Chromium 대조 5개는 서비스워커 새로고침까지 통과했다. 실제 아이폰 검증과 구분한다. 최종 Android·공개 웹·서명 검증 결과는 아래에 기록했다.
- 출시 안내: `docs/PLAY-TEST-AND-PAID-LAUNCH.md`. 새 개인 계정은 내부 테스트 → 최소 12명이 14일 연속 참여하는 비공개 테스트 → 프로덕션 접근 신청 순서다. 공개 테스트는 접근 승인 후 선택한다. 실제 Console 제출·테스터 초대·거래·정식 출시는 수행하지 않았다. 일반 가입용 SMTP·상업용 날씨 API 계약·운영/심사·Apple 서명/TestFlight는 후속 준비 항목이다.
- 최종 독립 검토의 오류 복구 2건을 수정했다. 기록 읽기 실패 때 미저장 답·메모를 보존하고 오래된 응답은 무시한다. 퀴즈 제출 중 이용권 오류는 같은 runId·현재 문항·선택을 유지한 채 재확인할 수 있다. 전용 회귀 테스트 6개를 추가했다. 최초 `2a77a29` 빌드는 서명 전에 중단하고 로그를 별도 보존했으며 최종 소스로 다시 생성했다.
- **최종 빌드 완료**: 소스 `870747c964f81cdec60da06764c70949aad29357`, beta.13/build18/min24/target36. Downloads/skylog-release-0.1.0-beta.13-build18/의 **play-signed.aab**가 Play 내부 테스트 제출 파일이다. AAB 19,792,810bytes · SHA256 `c03c9e60dae1ce5efc3aab6991a1a0364994f44a3f57f3cf23c58b437a5cdd26`. 기존 업로드키·jarsigner strict·bundletool 검증, payload 1,012개 전체 서명·원본 일치. 개인 APK 20,407,416bytes · SHA256 `30527c6d96ecacf950674f121c02aaf922a5042107d4cdb5a1eff4e727e64a03`. 기존 build17 APK 인증서·16KB 정렬·앱 이름·native 507/public 480/사진 328개 일치. 로컬 Android lint 오류 0·경고 32. 검증 보고서의 이전 버전 숫자 오기를 실제 aapt 값으로 읽도록 고치고 별도 폴더에서 재검증했으며 정정 전 보고서를 보존했다. 산출물 바이트 변경은 없다.
- **공개 배포 완료**: [Pages 34461832598](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34461832598) 전체 성공, [APK 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.13-build18) 공개·인증 없는 재다운로드 SHA 일치. 공개 웹의 beta.13·10개 이야기·전문가 수치 문제·9,900원 베타 미리보기와 개인정보 페이지 원본 일치를 확인했다. [모바일 CI 34461881585](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34461881585) 전체 성공: Android release/lint·API36 에뮬레이터 오프라인 계측, iOS Xcode26 무서명 컴파일과 사진 해시 검증. 실제 휴대폰·Play 거래·Apple 서명 성공으로 간주하지 않는다. `artifacts/qa-build18/`과 다운로드 폴더의 검증 자료·`READ-ME-KO.txt`에 증거와 설치 방법을 보관했다.
- **최종 UI 회귀**: 같은 소스의 PWA 번들에서 역사/Plus·여정·관측 코스·스타호핑·학습 기록·망원경 관련 18개 E2E가 모두 통과했다(57.2초). 대표 화면 4장을 직접 확인했고 PNG 18장을 별도 보존했다. 테스트가 바꾼 추적 스크린샷 15장은 사전 해시로 복구했다. 증거: `artifacts/qa-build18/final-learning-e2e/`.

- beta.10/build15–beta.12/build17의 사진·로그인·서명·출시 준비 보고는 [릴리스 보관 기록](reports/2026-09-11-beta10-beta12-release-history.md)을 참고한다.

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

- **현재 작업**: 스카이야드 beta.16/build22 지평선 개편·공개 프로필·보상 확장 반영. 소스 `f4a584442126a855c3a85565201e3e8c610fb984`. 앱 첫 하늘/개인·공개 프로필이 같은 장식을 사용하며 댓글은 아바타만 표시한다(D-067). Play 업로드 키와 개인 APK 키를 각각 그대로 재사용한다. 최신 검사/배포 결과는 이 문서 맨 위와 docs/MOBILE-RELEASE.md를 따른다.

- **우선 사항**: 최신 유료화는 D-064, ₩9,900 1회 구매 계획이다. 현재 무료 베타 미리보기이며 구매 브리지/권한 검사는 구현했지만 실제 상품·purchases 서버·환불 재검증·일반 SMTP·두 사람의 무상 grant는 미완료다. D-053~054는 이전 설계 이력이다. docs/BILLING-SETUP.md·MONETIZATION-PLAN.md를 따른다. Supabase ijxuwtbcwifttiuwvqrh/서울 대시보드 인증으로 지평선 migration202609110001까지 적용했다. 대시보드 인증은 CLI 인증과 구분하며 일반 가입·숫자 메일 준비 전 VITE_COMMUNITY_SIGNUPS_READY/EMAIL_CODE를 켜지 않는다. 공개 프로필만 사용자가 명시적으로 동기화하며 개인 백업은 수동 스냅샷이다.

- 최신 지평선은 D-067과 docs/HORIZON-ART.md·HORIZON-PROFILES.md가 정본이다. D-045의 실제 잔디 이미지와 독립 마당 설계는 이전 이력이다. 개인 APK 키는 보존한다. Play는 최초 업로드 전이라는 확인에 따라 현재 PC에서 마련한 전용키를 재사용한다(D-061). Console 등록 뒤에도 키를 임의 변경하지 않는다.

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

