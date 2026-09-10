# 스카이야드 Skyard (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-10 · beta.13/build18 Plus 콘텐츠·공개 아바타 구현, 최종 배포 검증 진행
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- 앱: https://junhyoungpark-nobel.github.io/skylog/ · 내 마당: https://junhyoungpark-nobel.github.io/skylog/#/profile
- 최신 산출물: https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.12-build17
- 모바일 빌드: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/mobile.yml
- 스토어 준비/서명/테스트: `docs/MOBILE-RELEASE.md`, `docs/STORE-LISTING.md`

## 이번 작업 보고 (2026-09-10 · Plus 콘텐츠와 첫 판매 준비)

- 사용자 확정: **9,900원 1회 구매**, 광고·구독 없음. 정식 상품은 `skyard_plus_lifetime` / `buy`. 현재 앱은 명시적인 **베타 미리보기**이며 실결제 활성화와 구분한다(D-064). `docs/MONETIZATION-PLAN.md` 최신 절이 이전 계획을 대체한다.
- ‘배우기 → 퀴즈 → 천체물리’에 역사 이야기 10개·30문제(수치 21/선택 9)·힌트 90개와 한영 풀이·출처를 추가했다. 메모 저장·단계별 힌트·원답 재채점·재도전·복습 필터를 지원한다. `learn.history:*`를 기존 progress에 보관하며 DB 버전·미션 키·기존 점수를 바꾸지 않는다. `docs/HISTORY-QUESTS-SOURCES.md`에 문제의 가정과 수치 답 21개의 독립 검산을 기록했다.
- 심화 퀴즈·망원경 코스의 선택·저장·딥링크에 권한 검사를 연결했다. 무료 맨눈·쌍안경 미션에 지정된 심화 확인 문제 20개는 해당 활성 미션 안에서 무료로 풀 수 있다. 자동 정답 처리나 미션 키 이관은 없다. 기본 망원경 관측 도구·내 기록·획득 보상은 계속 무료다.
- Android Billing 9.1.0 브리지·계정 귀속·Google 검증·서버 승인·환불 재검증·서버 무료 권한 코드를 작성했다. **실제 상품·Google 서비스 계정·purchases 서버 배포·환불 스케줄러·SMTP·심사 접근·두 사람의 무료 권한 부여·장기 오프라인 권한은 미완료**다. `docs/BILLING-SETUP.md`의 외부 설정과 라이선스 테스트 후 live로 전환한다. preview에서는 로그인 여부와 관계없이 구매 API를 호출하지 않는다.
- 사진·댓글의 공통 아바타와 닉네임, 명시적인 공개 프로필 동기화·계정 변경 방어, 별 모자 2개·천체 배경 4개를 추가했다(D-065). 기존 보상 6개를 보존하고 공개 아바타 선택값을 개인정보처리방침에 한영으로 고지했다. 프로필 migration 202609100001을 실제 Supabase에 적용해 아바타 열·RPC·RLS와 회원 1명·댓글 0개 보존을 확인했다. 익명 수정·일반 회원의 정지 상태 수정은 차단된다. 증거: `artifacts/qa-build18/community-server-verification.json`.
- 검증: 전체 83파일·652개 단위 테스트와 lint 통과. 관련 Chromium 15개(공개 프로필·아바타·댓글)와 4개(역사/Plus·업적) 통과. 초기 dev 테스트는 기록용 HTML의 Vite 갱신과 느린 모듈 로드로 실패했고, 증거를 보존한 뒤 watch 제외·정적 preview로 재검증했다. Windows WebKit은 12개 통과·오프라인 문서 새로고침 1개 내부 오류로 미확인이다. 열린 앱의 오프라인 답 저장은 통과했으며 동일한 Chromium 대조 5개는 서비스워커 새로고침까지 통과했다. 실제 아이폰 검증과 구분한다. Android 최종 빌드·공개 웹·서명 검증은 진행 중이다.
- 출시 안내: `docs/PLAY-TEST-AND-PAID-LAUNCH.md`. 새 개인 계정은 내부 테스트 → 최소 12명이 14일 연속 참여하는 비공개 테스트 → 프로덕션 접근 신청 순서다. 공개 테스트는 접근 승인 후 선택한다. 실제 Console 제출·테스터 초대·거래·정식 출시는 수행하지 않았다. 일반 가입용 SMTP·상업용 날씨 API 계약·운영/심사·Apple 서명/TestFlight는 후속 준비 항목이다.

## 이번 작업 보고 (2026-09-10 · 스카이야드 beta.12/build17)

- **스토어 문안·이미지**: 사용자 요청에 맞춰 간단한 설명35자·상세965자, 망원경 숙련자용 스타호핑 소개, 고운바탕/고운돋움 홍보 이미지와 실제 build17 UI를 묶었다(D-063). `docs/store-assets/launch-20260910/README.md`에 입력란별 값·업로드 순서·대체 텍스트·유료 안내 조건을 정리했다. 앱 아이콘512·피처1024×500·휴대전화1080×1920 7장·7인치/10인치1920×1080 각4장을 준비했다. Play용 아이콘은 기존 도안의 배경을 정사각형으로 내보냈다. 캡처는 격리 브라우저이며 물리 기기 촬영과 구분한다. 공개 대전 예시·표시된 샘플 기록만 사용하고 사진 출처와 OFL을 보존했다. 폰/태블릿/스타호핑 캡처의 콘솔·페이지 오류0·가로 넘침0, 최종 이미지 시각 QA와 용량·형식·문자수 검증을 실시했다. 파일 수정 범위는 문안·이미지·재현 스크립트이며 앱 코드/AAB/APK를 변경하지 않았다. 현재 결제가 없어 유료 표시는 제외했고 실제 상품 적용 때만 짧게 안내한다. Downloads/Skyard-GooglePlay-20260910-v2.zip(5,441,502bytes)에 입력용 TXT·PNG·안내·출처를 묶고 ZIP 내부 각 파일의 SHA를 원본과 대조했다. 새 스크립트4개의 ESLint·구문·Prettier 검사도 통과했다. 후속 요청에 따라 대표 문구를 “하늘 지도와 천체 관측 가이드”로, 휴대전화7장의 큰 제목과 학습 부제를 담백한 기능 소개로 수정했다. v2 이미지의 글자 잘림·17개 업로드 파일 규격·ZIP30파일 SHA를 확인했다. Console 저장/제출은 하지 않았다.

- **Play 데이터 삭제 URL 보완**: `delete-account.html#delete-data`에 계정을 유지한 공유 사진·개인 백업 삭제의 실제 UI 경로, 웹/이메일 요청, 삭제·유지 범위를 한영으로 추가했다(D-062). 사용자는 광고를 넣지 않기로 확정했다. 소스 `03db83e533417f1341aa9f64c068ddb5662c150e`, [Pages 34438892203](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34438892203) 전체 성공. 공개 HTTP200·로컬 HTML 완전 일치·부분 삭제 앵커·390px 화면/이메일 링크를 확인했다(`artifacts/qa-data-deletion/`). 정적 안내 변경이며 build17 AAB/APK는 재생성하지 않았다. 실제 삭제/메일 처리는 실행하지 않았다. 서버 로그/검토 이력 보관 기간은 기존 미확정 사항으로 남기고 임의 기간을 약속하지 않는다.
- **구현**: 확정 이름 ‘스카이야드 Skyard - 천체 관측 가이드’를 웹/PWA·한영 UI·Android/iOS 표시·스토어 그래픽에 반영했다. 앱ID·로그인URI·DB/백업 식별자를 유지한다. 사용자 제공 지원 이메일/운영자와 웹 계정·비로그인 이메일 삭제 안내를 공개 정책에 반영했다. 현행 선택계정/UGC/백업에 맞춰 Apple privacy manifest를 계정 연결7종으로 보완했다(D-060).
- **서명 해결**: 사용자가 첫 Play 업로드 전임과 현재 PC에서 계속 작업할 것을 확인해 새 Play 업로드 전용키를 마련했다(D-061). DPAPI·사용자 ACL로 보관하며 개인 APK 키는 유지한다. **서명 AAB 완성**: 19474322bytes · SHA256 888b5acf93b879f33f3f6ed9e8f57771a3be1dcc4a9a8d9b1fb5e98eb52d0d6d. jarsigner strict/bundletool·RSA4096/SHA256withRSA·payload997개 전체 서명/원본 일치, 미서명 payload0. 공개 인증서 SHA256 f5ad3a778d18b33973938b40f5b93f604c0cb099095a9875b09aa4f0c57a98bd. 실제 Console 첫 등록과 별도 암호의 휴대용 키 백업은 미실행이다.
- **빌드**: 소스 830c974bebeab0e873925ba58b0bd8a01798de6e, Android beta.12/build17/min24/target36·스카이야드 label·기존 APK 인증서·16KB 정렬 검증. public480/native502/photo328이 서명/무서명 AAB·APK·로컬 Android/iOS와 일치한다. Gradle release/lint 오류0·경고32. APK 20094988bytes · SHA256 ba0504adcaf6016cd54fee594a692bdb4724935840275c364d2f9fd94edd3a67. 무서명 원본 AAB SHA256 cc4abb02b4810fab2ec99941f645d85ea70b7bf8a28c7b4169eff3bf3ad72097도 보존한다. 최초 e2d9015 산출물은 최종 index 포맷 변경 후 별도로 보존하고 830c974를 다시 빌드했다.
- **검증/배포**: 타입/lint·변경 파일 포맷 통과. 초기 단위551개 및 worker 시작 timeout4파일의 후속29개 통과(총580개 고유 검사, 제품 조건 변경 없음). 로컬 Chromium16+Windows WebKit16, 공개 Chromium9개 통과·JS/콘솔 오류0. 영문 도움말 누락은 수정 후 재검했다. [Pages 34423116491](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34423116491) 성공, [APK 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.12-build17) 공개 및 재다운로드 SHA 일치. 폰/설치PWA/오프라인/실제 메일/삭제 성공과 구분한다.
- **자료**: Downloads/skylog-release-0.1.0-beta.12-build17/. Play 제출 파일은 skylog-0.1.0-beta.12-build17-play-signed.aab. docs/STORE-LAUNCH-CHECKLIST.md·STORE-LISTING.md·SIGNING-ON-THIS-PC.md에 등록값/한영 문안/정책/연락처/자산/서명 재사용과 백업 절차를 정리했다. 다음 수동 CI 기본18. 새 iOS CI 컴파일·Apple 서명/TestFlight는 수행하지 않았고 최근 실제 컴파일 증거는 build15이다.
- **남은 일/사용자 확인**: 신규 개인 계정의 12명14일 비공개 테스트·일반 회원 SMTP·실제 운영자/심사 접근·삭제 실제 운영·보관 정책·출시국/연령·Apple 서명/TestFlight·실폰 확인. 현재 전 기능 무료, 향후 퀴즈2·3/망원경 코스 상품·두 사람 무료 권한은 계획이다. 앱 등록/법적 선언/스토어 공개 제출은 수행하지 않았다. 폰에서는 기존 앱을 지우지 않고 업데이트해 스카이야드/beta.12·기존 기록/마당·사진/센서/로그인·오프라인을 확인한다.

## 이전 작업 보고 (2026-09-09 · beta.11/build16 오늘 밤 추천 사진)

- **수정**: 공용 추천 행에서 검색과 같은 사진 카탈로그와 썸네일을 사용한다. 오늘 밤의 추천 6개 그룹·관측 계획·오늘의 볼거리에 함께 적용한다. 사진이 없거나 읽기에 실패하면 종류 기호를 표시하며 관측 상태와 계획 저장의 별 버튼은 유지한다. 전체 출처는 상세 화면과 앱 정보에 둔다. 기존 사진164개/328파일과 manifest version2는 변경하지 않았다(D-059).
- **검증**: 타입·lint·포맷·단위580개, 기존 오늘 밤/사진 Chromium 시나리오9개 통과. Chromium과 Windows WebKit에서 세 카드·토성/M31/M39 사진·상세 출처·360px 영어125% 야간·계획 토글·이미지 실패 대체를 확인했고 JS예외0이었다. 초기 병렬 단위 실행의 사진 해시 검사1개가 5초 제한에 걸려 작업자4개로 전체580개를 다시 실행해 통과했다. 제품 검사 조건을 완화하지 않았다.
- **배포**: 소스 `e672ca13e98da1eab747f5c7a2762afe6625d919`, [Pages 34332721309](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34332721309) 성공. [웹앱](https://junhyoungpark-nobel.github.io/skylog/)에서 beta.11·추천/계획/볼거리·M31/M39·상세 출처·야간/작은 화면·계획 저장·JS예외0을 다시 확인했다. [새 APK](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.11-build16/skylog-0.1.0-beta.11-build16-local-test.apk) 재다운로드 해시도 일치한다.
- **APK/AAB**: Android release/lint 성공(오류0·경고32), build16/beta.11/min24/target36·서명·16KB 정렬·build15 인증서 일치. public479개 및 사진328개가 APK/AAB/로컬 Android/iOS 자료와 일치한다. APK 20,090,813bytes·SHA256 `052a849b085e3ccf6bf5785e4f015ae3af2bbba54c8fa043c5e56d77b99a8610`; 무서명 AAB 19,382,456bytes·SHA256 `5d97e6bac6aed6c15fcfc2919f9abaa21ee9818a5ea4af16228c5a4363ecb28f`. Downloads/skylog-release-0.1.0-beta.11-build16/ · [릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.11-build16). 다음 수동 CI 기본17.
- **범위**: 이번 UI 수정은 로컬 Android 빌드와 iOS 자료 동기화까지 검증했다. 새 iOS CI 컴파일·네이티브 계측은 실행하지 않았으며 이전 build15의 결과와 구분한다. 실제 폰 설치·센서·메일 왕복·iPhone 오프라인, 기존 Play 업로드 키 서명·Apple 서명/TestFlight·일반 회원 SMTP 및 스토어 심사는 남아 있다. 현재 전 기능 무료.
- **폰 확인**: 기존 앱 삭제 없이 APK 업데이트 후 beta.11 확인 → 오늘 밤 추천(토성·M31 등)·관측 계획·오늘의 볼거리 사진 확인 → 사진 탭으로 상세 출처/스크롤 확인 → 기존 기록과 계획 저장·야간 확인. iPhone은 기존 홈 화면 웹앱을 다시 연다.

## 이전 작업 보고 (2026-09-09 · beta.10/build15 사진 확대·로그인 복구)

- **구현**: 사진을 20개에서 164개 천체로 확대했다. 메시에110개 전체·추가 DSO43개·태양/달/행성9개·시리우스/베텔게우스2개를 포함한다. 선택/검색은 간결한 미리보기, 자세히와 앱 정보는 전체 출처·개별 이용 조건을 표시한다. 관측 필드 전체를 보존하는 편집 프레임/관측 패널 추출 좌표와 원본 해시를 메타데이터·XMP에 기록한다. 사진 328파일, 11,787,848bytes. [사진 기록](../docs/OBJECT-PHOTOS.md).
- **로그인**: 네이티브에서 보낸 메일은 정확히 등록한 앱 URI로 복귀한다. 웹/iPhone PWA의 별도 브라우저 복구, 요청 단계 보존·재전송·만료 안내, 격리된 원본 링크 확인을 지원한다. 서버의 Site URL·이메일 확인·RLS는 유지했고 앱 복귀 URI1개만 추가했다. 기본 SMTP이므로 숫자 인증번호 양식과 일반 가입 개통은 대기다. [로그인 기록](../docs/AUTH-LOGIN.md).
- **자동 검사**: typecheck/lint/data·단위580개·PostgreSQL/RLS46개·Chromium83개 통과. Windows WebKit의 iPhone 화면·야간 픽셀·사진 캐시·모킹 로그인 14단계 통과. 실제 메일 발송이나 물리 휴대폰 시험과 구분한다.
- **네이티브**: Android release/lint, API36에서 Wi-Fi/data 끄기 명령 뒤 WebView 계측2개(기존 내장 학습·cold/warm 로그인 복귀) 통과. iOS Xcode26 arm64 무서명 빌드와 내장 public/사진 전체 해시 대조 통과. APK 서명·16KB 정렬·앱ID·version15/min24/target36·release flags·기존 build14 인증서 일치를 검증했다. 로컬 public 479개가 APK/AAB/Android/iOS에 일치한다.
- **공개 배포**: 소스 `62df2eab0f5da518e445ca9a7d642afdfc6c595a` · [Pages 34320972447](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34320972447) · [모바일 34320977187](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34320977187) 성공. [APK](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.10-build15/skylog-0.1.0-beta.10-build15-local-test.apk)와 [웹앱](https://junhyoungpark-nobel.github.io/skylog/)을 공개하고 APK 재다운로드·사진 328파일 공개 해시·beta.10·전체 출처·Chromium의 미방문 M110 오프라인 재실행·JS예외0을 확인했다.
- **파일**: APK 20,090,813bytes, SHA256 `77921231e0e2f24d140a1715bb2f991d94b54317c43f944cdce0bbb991ca5fa0`. 무서명 AAB 19,382,425bytes, SHA256 `c72d866fb47662420235ace8b7200f9b91de70103966100a27bf665b5e5485c1`. 폴더: Downloads/skylog-release-0.1.0-beta.10-build15/. [사전 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.10-build15). 다음 수동 CI기본16.
- **남은 경계**: Play용 AAB의 집 PC 기존 업로드 키 서명, Apple 팀 서명/TestFlight, 실제 폰의 메일 앱 왕복·iPhone 오프라인·센서, 일반 가입용 SMTP/운영자 개통 및 정식 스토어 심사는 남아 있다. Windows WebKit은 온라인 캐시까지 확인했으며 실제 iPhone 오프라인 성공으로 표시하지 않는다. 현재 전 기능 무료, 향후 난이도2·3 퀴즈/망원경 코스의 유료 상품·두 사람 무료 권한은 별도 계획이다.

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

- **현재 작업**: 스카이야드 beta.12/build17 서명 AAB·개인 APK·PWA 준비 완료. 앱 소스 830c974bebeab0e873925ba58b0bd8a01798de6e. Play 최초 업로드용 현재 PC 키를 재사용한다. 다음은 docs/STORE-LAUNCH-CHECKLIST.md의 SMTP/운영·심사·12명14일 테스트·Apple 서명·실폰 검증.

- **우선 사항**: 현재 모든 기능과 이번 아바타 확장은 무료(D-048/D-052). 최신 유료화 계획은 D-054와 MONETIZATION-PLAN의 향후 난이도2·3/망원경 코스이며 현재 잠금·결제는 미구현이다. D-053 외형 팩/가격은 이전 제안이다. 서버/코드는 실제 구현됨. Supabase 프로젝트 ijxuwtbcwifttiuwvqrh/서울. 현재 PC의 대시보드 로그인과 정확한 앱 복귀 주소 저장을 확인했다. CLI 인증은 현재 PC에서 확인되지 않았으므로 대시보드 인증과 구분한다. 일반 가입용 SMTP와 운영자 실제 앱 계정 지정이 남았다. 준비 전 VITE_COMMUNITY_SIGNUPS_READY/EMAIL_CODE를 켜지 않는다. GitHub 변수는 공개 URL/키만 포함. 백업은 수동 스냅샷으로 자동 동기화가 아니다. 자세한 절차는 docs/FREE-COMMUNITY.md.

- 최신 풍경은 D-045와 docs/LANDSCAPE-REFINEMENT.md, 실제 무료 서비스는 D-048~051과 docs/FREE-COMMUNITY.md. COMMUNITY-AND-CUSTOMIZATION.md의 가격 후보는 이전 설계 이력이다. 개인 APK 키는 보존한다. Play는 최초 업로드라는 사용자 확인과 이 PC 작업 요청으로 새 전용키를 준비했다(D-061). 과거 집 PC 키 대기 기록보다 이 결정을 우선하며 등록 후 업로드키를 임의 변경하지 않는다.

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
- **최신 검증**: 문서 맨 위 beta.12/build17 보고를 따른다. 이전 build9 수치는 당시 검증 이력이다. T8 청크 분할·실기기 센서/성능은 잔여다.
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
