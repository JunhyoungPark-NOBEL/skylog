# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-09 · Codex 원래 APK 서명 PC · beta.9/build14 천체 사진·댓글 보완 검증 중, 실기기/스토어/가입 개통 대기
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- 앱: https://junhyoungpark-nobel.github.io/skylog/ · 내 마당: https://junhyoungpark-nobel.github.io/skylog/#/profile
- 최신 산출물: https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.9-build14
- 모바일 빌드: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/mobile.yml
- 스토어 준비/서명/테스트: `docs/MOBILE-RELEASE.md`, `docs/STORE-LISTING.md`

## 이번 작업 보고 (2026-09-09 · beta.9/build14 천체 사진·댓글 보완)

- **최신 기준**: origin/main `9d39492a06a3d8e79ee96fe45853315ce228e052`를 fetch 후 `codex/object-photos-comments-20260909`에서 작업했다. 기준 타입·단위528개 통과. 집의 마당·잔디밭과 build13 아바타·기존 관측/장비/학습/센서를 유지한다.
- **천체 사진**: 실제 관측 사진20개를 선택 카드·검색 미리보기·자세히 화면에 넣었다. ESA/Hubble·ESO 개별 CC BY 4.0 출처/전체 크레딧·활성 링크/확인일/가공·파장·촬영 범위를 기록했다. WebP40개 총1,295,446bytes. 크롭 없이 축소하며 XMP에도 출처를 포함한다. 사진/manifest는 PWA 프리캐시와 APK/iOS에 포함하고 야간 적색·명시 원래 색 보기·오류 대체를 제공한다. docs/OBJECT-PHOTOS.md.
- **댓글**: 신고 사유/댓글 초안 분리, 전송 중 초안 보호, 사진·로그인 계정에 늦은 응답 분리, 최신50개와 이전 페이지, 새로고침·작성 성공/조회 실패 분리, 운영 검토 목록 전환을 보완했다. 공개 서비스 GET 확인과 로컬 DB/RLS/모킹 검증은 docs/COMMENTS-REVIEW.md에 구분한다. DB migration·실서버 쓰기·가입 플래그 변경은 없다.
- **유료화**: D-054로 향후 난이도2·3과 망원경 학습 코스를 1회 이용권 후보로 정리했다. 가격/시행일/결제는 미정, 현재 접근은 모두 무료. 무료 맨눈/쌍안경 미션의 어려운 확인문항 교체와 기존 진도·보상 보존을 먼저 설계한다. 본인/GF 무료 권한도 후속 계정별 서버 권한 계획이다. docs/MONETIZATION-PLAN.md.
- **로컬 최종 검증**: 타입/lint·데이터·전체 단위541개와 이후 추가 API6개(총547개 고유 검사), PostgreSQL/RLS46개, Chromium75개 전체 통과. 사진 야간 픽셀 검사에서 둥근 모서리 밖 부모 표면을 제외했고 원래 색 토글이 기존 전역 이미지 필터에 걸리는 문제를 수정한 최종 소스를 검사했다. Android release/lint오류0·경고32, AAB/APK/native215개 에셋과 public191개 자료·사진40개/manifest 해시 일치. iOS 로컬 public과 실제 CI .app는 별도 검증한다.
- **로컬 산출물**: Downloads/skylog-release-0.1.0-beta.9-build14/. APK9,446,602bytes·SHA256 `a903017f9d6153f5245493b580561abcb487220b5b54e2c5ff9742663e5eb111`, beta.9/build14·min24/target36·release flags·16KB 정렬·기존 build13 인증서 일치. AAB9,129,298bytes·SHA256 `cc3d95769f1d2efd8e7b1130060ba7761f81494b57e1aa890abdee2ad61bcae5`는 무서명이며 집 PC의 기존 Play 업로드키로 서명해야 한다. 공개 배포/모바일 CI 검증은 이어서 기록한다.
- **검증/배포**: 웹·모바일 CI와 공개 다운로드는 후속 검증한다. 다음 CI기본15. 기존 개인 APK와 동일 인증서로 build14를 만들며 이 PC에 없는 Play 업로드키를 새로 생성하지 않는다. SMTP·실제 운영자·일반 가입·Apple 서명/TestFlight·실기기·스토어 심사는 대기다.
- **폰 확인**: 앱 삭제 없이 APK 업데이트 후 토성/M31/M42 검색·사진/출처·야간 원래 색·스크롤·오프라인을 확인한다. iPhone은 같은 PWA 주소와 기존 홈 화면 앱에서 새 버전을 확인한다. 이전 기록/장비/마당/아바타/퀴즈가 유지되는지 확인한다.

## 이전 작업 보고 (2026-09-09 · beta.8/build13 아바타 꾸미기 확장)

- **최신 기준**: 원격 main `f5cf178`까지 fetch 후 `codex/avatar-customization-20260909`에서 작업했다. 집의 beta.7/build12 마당·커뮤니티·잔디밭·달력과 기존 관측/학습/센서를 보존한다. 기준 타입·단위504개 통과 후 시작했고 배포 전 원격이 같은 상태인지 다시 확인했다.
- **구현**: 아바타 선택39개(즉시 무료33+영구 업적 보상6), 얼굴/머리/옷/소품의 큰 미리보기와 그림 선택, 적용/취소·추천·되돌리기·이름 있는 코디3칸 보관. 기존 모습/마당12장식/이름·진도 유지. 한영·야간과 로컬/계정 수동 백업 호환. docs/AVATAR-CUSTOMIZATION.md.
- **데이터/검증**: 기존 조합/보상/정규화·동시 저장·백업 검증을 추가했다. 저장 후 최신 화면 읽기까지 기다리고 실패 시 재로딩 전 재편집을 막는다. 브라우저66개 고유 시나리오 확인: 전체64통과/2실패 후 잠금 설명 선택자와 오늘 날짜에 의존하던 스모크 시계를 수정해 관련13개 통과. 저장·읽기 지연/실패 React 회귀9개를 추가해 최종 단위528개·타입/lint·데이터 검증 통과, 최종 아바타/마당 관련7개도 통과했다. Android release·패키지/서명·최종 CI/공개 배포 검증도 완료했다. 360px·영어125%·야간 SVG 적색 확인. 실제 폰 설치·센서 체감은 미확인.
- **유료화 판단**: 이번 개선 포함 기존 기능은 무료. 앞으로 별도 제작 테마 팩1종의 1회 구매를 추천하며 3,900원은 검토 후보다. 추가 원본/자동 동기화 구독은 구현과 비용 검증 후. 본인/GF 계정별 무료 이용권은 향후 서버 권한으로 설계하고 현재 발급/결제는 하지 않았다. 공식 정책/날씨 상업 조건은 docs/MONETIZATION-PLAN.md와 plan/research/2026-09-09-monetization.md.
- **모바일/후속**: beta.8/build13·다음 CI기본14. 이 PC는 기존 개인 APK키를 보유하므로 build9 인증서와 일치하는 설치 APK를 만든다. 집 PC에 있던 Play 업로드 키는 여기서 새로 만들지 않는다. 공개 Supabase 클라이언트 설정을 현재 GitHub 변수에서 읽어 빌드에 반영하고 가입/메일코드는 false를 유지한다. 정식 스토어 심사·Apple 서명/TestFlight·SMTP/실계정 운영 개통은 별도다. T5/T7/T8/T9 전체 완료 태그나 새 GPT Pro 요청은 없다.
- **폰 확인**: 앱 삭제 없이 업데이트·기존 기록/장비/퀴즈 진도, 아바타 적용/취소·코디 재실행 보존·업적 보상·야간/스크롤을 확인한다. iPhone은 업데이트된 PWA를 홈 화면에 추가한다.

- **최종 배포/수용**: 소스 `d478b9b9027f58e45c4e03e597f44b422460bcb2`, [Pages34292913299](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34292913299)·[모바일34292913317](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34292913317) 전체 성공. 로컬 타입/lint/데이터·단위528개, 브라우저66개 고유 시나리오와 공개 WebKit26.6/iPhone13 에뮬레이션8개 통과. 공개 beta.8·SW·오프라인 아바타/코디 재실행·JS오류0. 기능/자동검증/서명·배포/유료화 제안4항목 완료, 실제 폰 확인은 대기다. WebKit은 실제 iPhone 검증이 아니다.
- **산출물**: [v0.1.0-beta.8-build13](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.8-build13), Downloads/skylog-release-0.1.0-beta.8-build13/. APK8,115,552bytes·SHA256 `76974a1533c5019143b17036b30d60f8fb6d80d5db3a1aa951340163ea108980`. 공개 APK 재다운로드 일치. 기존 build9 인증서·version13/beta.8·min24/target36·release flags·16KB 정렬 검증. AAB/APK/native174개 에셋 일치, public150개는 Android/iOS 원본 해시 일치. 로컬 Android lint오류0/경고32.
- **서명/경계**: 로컬 AAB7,826,967bytes·SHA256 `07b972f25453ac7d7c60944fd47fc89b9d18412cc469d1fd8481808f295d06fe`는 무서명이다. 이 PC에 Play 업로드키/암호가 없어 새로 만들지 않았다. 집의 기존 업로드키로 서명해야 제출할 수 있다. Android 구 버전명이 남은 첫 산출물은 검증기가 차단해 별도 rejected-metadata 폴더에 보관하고 배포하지 않았다. Gradle이 package.json 버전을 읽고 CI가 일치를 검사하도록 수정한 뒤 새 APK/AAB를 검증했다. 이전 모바일 CI3622c24는 중단하고 최종 d478b9b만 릴리스했다.

- **플랫폼 증거**: 최종 Android API36/x86_64 에뮬레이터에서 Wi-Fi/data 끄기 명령 후 debug WebView 계측1개 통과(실패0·누락0, 11.892초). CI lint오류0/경고32. iOS Xcode26.3/iPhoneOS26.2에서 build13·arm64·최소16.4·무서명 컴파일 및 plist 확인. CI iOS .app의 public150개도 최종 소스와 SHA256이 모두 일치한다. 서명 APK 실폰 설치·센서 정확도나 실제 iPhone 시험을 뜻하지 않는다.

## 이전 작업 보고 (2026-09-08 · beta.7/build12 무료 마당·사진·댓글)

- **범위**: main8dcb55f의 최신 beta.6에서 시작. 전 기능 무료 요청을 D-048로 확정하고 T9 정식 태스크를 작성했다. 기존 관측/배우기/날씨/센서/스크롤을 유지한다.
- **구현**: 무료 장식12종(기본4+업적8), 다섯 자리 마당·아바타·오프라인 보존. 사진 목록/상세·공유/수정/나만 보기, 검토 대기 댓글·축하 반응, 신고·차단·이의 신청·운영자 조치/감사 이력. 선택형 개인 클라우드 백업/복원·온라인 계정 삭제. 화면은 독립 경로로 분리하고 한영 제공.
- **서버**: 사용자가 Supabase 가입·비밀번호 설정. 무료 skylog 조직/서울 프로젝트 ijxuwtbcwifttiuwvqrh 생성, RLS·private 저장소·Edge 함수 실제 배포. 일반 가입 메일·운영자 앱 계정 지정은 대기. 기본 SMTP는 운영자 주소만 허용하고 템플릿 변경400을 반환하므로 유료 업그레이드를 자동 진행하지 않았다. 사이트 URL/PKCE 메일 링크는 연결했고 OTP 템플릿은 준비했다.
- **검증**: 단위504개, 타입/lint, PostgreSQL 권한27개, 실제 Supabase22개 통과. 기존59개 통과, 신규3개 최종 재실행 통과(영어 선택자 역할을 radio로 수정). 영어125%/야간 픽셀/360px 화면 확인. 임시 서버 테스트 계정/사진은 모두 정리했다. 모바일 실기기/외부 이메일은 미확인.
- **결정/후속**: D-048 무료 범위, D-049 로컬 꾸미기/영구 보상, D-050 Supabase 검토와 개인정보, D-051 수동 백업/메일 개통. docs/FREE-COMMUNITY.md에 설치·운영·화면 참고·제약. T9는 외부 메일/운영자/실기기 확인 전 진행 중으로 둔다. 추가 GPT Pro 작업은 없다.
- **배포**: 앱 소스 ba29935d741167236dba7d48192beb83708790bb, [Pages34239766171](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34239766171)·[모바일34239765822](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34239765822) 전체 성공. 공개 beta.7·실제 갤러리·SW·오프라인 마당/아바타·JS오류0 확인. Android API36 오프라인 계측1/1(실패/누락0), lint오류0/경고33. iOS build12 arm64 무서명 컴파일 성공. AAB/APK의 웹 에셋 전체 일치, public150개는 AAB/APK/iOS 모두 원본 SHA256 일치.
- **산출물**: [v0.1.0-beta.7-build12](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.7-build12), Downloads/skylog-release-0.1.0-beta.7-build12/. 기존 Play키 서명 AAB7,882,043bytes, SHA256208b8f3db4e0b80bdf33af8f97ab6b9e6fbd40d7b8868f165cd10ebfb2585b5c. jarsigner strict·bundletool validate·version12/min24/target36·debug=false/backup=false 통과. APK 서명 준비 ZIP7,591,135bytes, SHA256a311de87cf651a9d813b4eab25fab183dd521edcda15d26175ce6fa13e9546cf. **설치 가능한 업데이트 APK는 기존 개인 키가 없어 미서명**이며 원래 서명 PC에서 완성한다. 다른 키로 대체하지 않는다. 다음 CI기본13.
- **수용/사용자 액션**: T9 인수 기준 자동 확인6/7, 일반 가입·실계정 운영 개통1항목 대기. 폰에서 마당/아바타 재실행 보존, 기존 관측·코스 진도, 한영·야간·스크롤을 확인한다. SMTP 연결 후 외부 메일/운영자/두 계정 공유와 다른 기기 백업을 확인한다. AAB는 Play용이며 ZIP은 직접 설치 파일이 아니다. 새 GPT Pro 요청 없음.

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

- **우선 사항**: 현재 모든 기능과 이번 아바타 확장은 무료(D-048/D-052). 최신 유료화 계획은 D-054와 MONETIZATION-PLAN의 향후 난이도2·3/망원경 코스이며 현재 잠금·결제는 미구현이다. D-053 외형 팩/가격은 이전 제안이다. 서버/코드는 실제 구현됨. Supabase 프로젝트 ijxuwtbcwifttiuwvqrh/서울, CLI 인증 완료. 일반 가입용 SMTP와 운영자 실제 앱 계정 지정이 남았다. 준비 전 VITE_COMMUNITY_SIGNUPS_READY/EMAIL_CODE를 켜지 않는다. GitHub 변수는 공개 URL/키만 포함. 백업은 수동 스냅샷으로 자동 동기화가 아니다. 자세한 절차는 docs/FREE-COMMUNITY.md.

- 최신 풍경은 D-045와 docs/LANDSCAPE-REFINEMENT.md, 실제 무료 서비스는 D-048~051과 docs/FREE-COMMUNITY.md. COMMUNITY-AND-CUSTOMIZATION.md의 가격 후보는 이전 설계 이력이다. 개인 APK 서명 키는 Play 업로드 키와 다르며 자동 새 키 생성 금지.

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
- **최신 검증**: 문서 맨 위 beta.9/build14 보고를 따른다. 이전 build9 수치는 당시 검증 이력이다. T8 청크 분할·실기기 센서/성능은 잔여다.
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
