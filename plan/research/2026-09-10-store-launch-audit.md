# 스카이야드 Skyard 스토어 출시 점검 — 2026-09-10

확정 이름은 **스카이야드 Skyard - 천체 관측 가이드**다. 현재 앱을 **무료 다운로드·광고 없음·인앱구매 없음**으로 준비하고, 난이도 2·3 퀴즈와 망원경 학습 이용권의 판매는 후속으로 분리하는 안이 현행 구현과 맞는다. 개인 APK/PWA 배포 성공을 Play/App Store 출시 완료로 표시하지 않는다.

이 문서는 2026-09-10 공식 정책과 저장소를 읽은 점검이다. 현재 서버·개발자 Console을 직접 다시 열거나 이메일을 발송하지 않았다. 상품 생성, 계정·서버 변경, 제출, 결제, 실기기 시험도 수행하지 않았다. 다른 담당자가 이후 고친 파일은 이 문서의 **점검 당시 상태**와 구분한다.

## 1. 증거와 판정 범위

| 구분 | 직접 확인한 범위 |
| --- | --- |
| 제품 기준 | `plan/STATUS.md`의 최신 공개 beta.11/build16, 앱 소스 `e672ca13e98da1eab747f5c7a2762afe6625d919`. 새 이름으로 만든 최종 스토어 빌드는 별도 검증 대상 |
| 읽은 문서 | `docs/STORE-LISTING.md`, `MONETIZATION-PLAN.md`, `FREE-COMMUNITY.md`, `AUTH-LOGIN.md`, `public/privacy.html`, `support.html`, `community-terms.html` |
| 읽은 구현 | `AccountScreen.tsx`, `supabase/functions/community/index.ts`, `src/db/exportImport.ts`, 학습 진도 저장, Android manifest, iOS Info.plist/privacy manifest/project 설정 |
| 기존 자동 검사 | build16의 단위 580·관련 Chromium 9·로컬 Chromium/WebKit 사진 화면·Android 빌드/자료 해시 결과는 기존 보고서에서 확인. 이 조사에서 재실행하지 않음 |
| 이전 네이티브 결과 | 실제 iOS 무서명 CI 컴파일·API36 계측 2개는 build15 결과. build16의 새 iOS CI/계측은 미실행이며 실폰 설치·메일 왕복·센서·iPhone 오프라인은 미확인 |
| 이번 직접 검사 | 아래 자산 PNG 헤더의 크기·컬러 타입·파일 크기, 정책 원문, 코드상 삭제·백업·선택 계정 경로. 스토어 승인/권리 등록/현 서버 운영 상태는 증명하지 않음 |

## 2. 공개 제출을 막는 항목과 구체 조치

| 항목 | 점검 당시 상태 | 마감 조건·담당 |
| --- | --- | --- |
| 일반 가입 메일 | 기본 Supabase SMTP, `SIGNUPS_READY=false`/`EMAIL_CODE=false`; 기존 서버 확인 기록만 있음 | 소유자가 발송 서비스·도메인·비공개 지원 주소를 정하고 SMTP 연결. 일반 외부 주소에서 수신·재전송·만료·Android 앱 복귀·iPhone PWA 복구를 확인한 뒤 해당 기능의 준비 플래그를 변경 |
| 실제 커뮤니티 운영자 | 신고·사전 검토 UI/RPC는 있으나 실제 운영자 앱 계정 지정 대기 | 검증한 실제 계정 UUID에만 운영 역할 부여, 검토 담당자/빈도/재검토 절차 확정, 사진·댓글 접수부터 승인/숨김/차단/삭제까지 운영 시험. 첫 가입자 자동 관리자나 전역 RLS 완화 사용 금지 |
| 심사 접근 | 메일 링크는 만료되며 심사자가 일반 메일을 받을 현재 경로도 준비되지 않음 | 상시 재사용 가능한 별도 리뷰 계정/접근 방식 또는 명시적인 전체 기능 데모를 설계·시험하고 Console 비공개 심사 입력란에 영어 안내. 사용자의 개인 메일함·운영자 비밀·고정 공개 OTP를 제공하지 않음 |
| 앱 밖 계정 삭제 요청 | 앱 내 삭제는 있으나 public 파일 목록에 전용 삭제 페이지 없음. privacy는 앱에서 삭제하라는 설명과 공개 GitHub 문의만 제공 | 재설치 없이 요청 가능한 웹 페이지를 마련. 실제 비공개 이메일/폼 또는 웹 계정 삭제 경로, 본인 확인, 삭제 범위·보관 예외·처리 안내를 표시하고 Google 삭제 URL에 등록. 주소·처리 기간을 임의로 만들지 않음 |
| 개인정보 제출 자료 | 스토어 표에 이전 ‘로그인 없이 모든 기능’ 등 잔여. iOS manifest는 정밀 위치 linked=false 한 항목 | 선택 계정·공개 사진/댓글·개인 백업까지 데이터 항목을 갱신. 소유자의 실제 로그 보관/처리자 설정과 대조하여 양쪽 Console 제출 답변을 확정 |
| Play 최종 서명·계정 | 기존 개인 APK 인증서는 확인됐지만 Play 업로드 키와 별개. 로컬 AAB 무서명 | 기존 업로드 키 확보/서명, Play App Signing·앱 ID·계정/연락처 확인, 내부 테스트, 해당 시 비공개 테스트 및 프로덕션 액세스 신청 |
| Apple 배포 | 기존 무서명 arm64 컴파일만 증거. 설치 IPA/TestFlight 없음 | Apple 팀·Bundle ID 소유 확인, 최종 소스의 서명 Archive/Validate·TestFlight·실기기·심사 접근 확인 |
| 최신 브랜드·이미지 | 기존 등록 문안/정책 페이지/피처 그래픽은 별관찰해쌀뚜·Skylog 명칭 | 확정 이름으로 표시 문안·아이콘 문맥·한영 이미지·지원/개인정보 문서를 통일. 설치 ID/백업의 `app: skylog` 등 호환 식별자는 표시 이름과 구분해 보존 |
| 서비스의 상업 이용 적합성 | 날씨는 Open-Meteo 무료 API, PWA는 GitHub Pages. 실제 사업/상업 서비스 범위는 미확정 | 무료 다운로드 여부만으로 판단하지 않고 운영 목적과 향후 유료 학습 제공을 대조. 필요한 날씨 계약 및 상업 서비스에 적합한 웹 호스팅을 확정한 뒤 전환 |

Supabase의 기본 SMTP는 프로젝트 팀의 사전 허용 주소로만 발송하고 현재 기본 제한은 시간당 2통이며 운영용 SLA가 없다. 앱 프런트엔드 수정만으로 일반 가입이 열렸다고 판단할 수 없다. SMTP 개통과 숫자 OTP 템플릿 적용은 별개이며, 링크 방식으로 정상 운영할 경우 숫자 모드를 꼭 켤 필요는 없다. [Supabase 공식 SMTP 안내](https://supabase.com/docs/guides/auth/auth-smtp)

Google 심사 자격 정보는 상시 접근·재사용 가능하고 위치에 무관해야 하며, 일회용 인증이 필요한 경우에도 리뷰에 쓸 지속적인 접근을 제공해야 한다. 리뷰 계정의 권한은 일반 기능 검토에 필요한 범위로 제한하고 개인정보가 없는 자료를 사용한다. [Google 리뷰 접근 요건](https://support.google.com/googleplay/android-developer/answer/15748846)

Apple도 계정 기능이 있으면 활성 데모 계정 또는 전체 기능 데모와 접근 가능한 백엔드를 요구한다. 검토용이라고 실제 기능을 숨기거나 일반 사용자 인증을 완화하는 방식으로 해결하지 않는다. [Apple 제출 전 확인](https://developer.apple.com/app-store/review/guidelines/#before-you-submit)

## 3. 무료 출시와 미래 학습 이용권

현재 무료 관측·기록·백업·마당/아바타·획득 장식·사진 공유·댓글·학습을 그대로 제공한다. 가입은 공유/댓글/계정 백업에 선택적으로 요구하고 기본 관측에 강요하지 않는다. 스토어에 아직 구현하지 않은 유료 상품·무제한 저장·자동 동기화·미래 콘텐츠 전체를 판매 혜택으로 적지 않는다.

Google Play의 앱 다운로드 가격을 무료로 공개하면 같은 패키지를 나중에 유료 다운로드로 바꿀 수 없다. 따라서 **앱은 무료로 유지하고 추후 디지털 학습 이용권을 인앱 상품으로 추가**하는 경로를 택한다. 이미 공개된 개인 APK/PWA와 Play의 무료/유료 등록 선택은 다른 개념이다. [Google 앱 가격 선택](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en)

향후 한 상품의 비소모성 1회 구매에 난이도 2·3 퀴즈와 `courseTheme=telescope` 학습 범위를 묶는 현재 제안을 유지한다. 일반 목표 찾기·장비 편집/FOV·기록은 계속 무료다. 혼합 문항을 쓰는 무료 코스와 이전 답안·완료/보상을 보존한 뒤 시행일·가격·상품 ID를 정한다. 정적 학습 자료에 자동 갱신 구독을 추가할 근거는 현재 부족하다. 제품 범위는 [기존 계획](../../docs/MONETIZATION-PLAN.md)을 따른다.

앱 안 디지털 콘텐츠 잠금 해제에는 Play Billing/Apple IAP를 기본으로 사용한다. 외부 웹 결제·링크·다른 플랫폼 권한 사용에는 지역/프로그램별 조건이 있으므로 한국과 모든 국가에 같은 예외가 적용된다고 가정하지 않는다. 지금 외부 결제 버튼이나 상품을 만들지 않는다. [Google 결제 정책](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), [Apple 3.1.1·3.1.3(b)](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)

본인과 여자친구의 무료 이용은 향후 각자 검증된 앱 계정에 만료 없는 무상 권한을 연결하는 계획이다. 일반 운영자 역할과 분리하고 서버만 부여/철회하며 감사 이력을 남긴다. 공식 Apple offer code·Google 비소모성 상품 프로모션과 거래 연결을 우선 검토한다. 무료 코드·권한은 아직 발급하지 않았고, iPhone/PWA로 자동 이전되는 스토어 거래를 가정하지 않는다. 구매 복원은 이용권 복구이며 관측 DB 복구와는 별개다. [Apple IAP 무료 코드](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-offer-codes-for-in-app-purchases), [Google 프로모션](https://support.google.com/googleplay/android-developer/answer/6321495?hl=en)

Open-Meteo 무료 API는 비상업 용도에 한정된다. 무료 다운로드라는 이유만으로 상업 제품·홍보 목적까지 허용되는 것은 아니다. 첫 유료 이용권 도입 전뿐 아니라 사업 목적 출시가 되는 시점에도 고객 API 라이선스/다른 공급자를 확정해야 한다. 현재 명시 한도는 일 10,000·시간 5,000·분 600회다. 데이터 CC BY 이용과 호스팅 API 계약은 구분하며 비밀 고객 키를 앱에 넣지 않는다. [Open-Meteo 현행 약관](https://open-meteo.com/en/terms)

GitHub Pages도 온라인 사업·전자상거래 또는 상업 거래/상업 SaaS 제공이 주목적인 사이트의 무료 호스팅 용도로 허용되지 않으며 비밀번호/카드 번호 같은 민감한 거래에 사용하지 말라고 명시한다. 현재 비상업 개인 프로젝트의 공개 PWA를 이번 조사만으로 위반이라 단정하지 않는다. 반대로 무료 다운로드나 결제 서버를 별도로 뒀다는 이유만으로 상업 PWA 호스팅이 허용된다고 단정하지 않는다. 향후 유료 이용권을 사용하는 웹 서비스와 인증 경로의 적합성을 실제 운영 목적과 함께 확인하고 필요하면 적합한 호스팅으로 옮긴다. 이전 시 PWA의 origin별 로컬 기록, 서비스 워커, 로그인 redirect, 정책 URL과 백업 이동을 먼저 준비한다. 정적 프로젝트 설명/문서 사이트와 운영 웹앱은 구분한다. [GitHub Pages 공식 사용 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## 4. UGC와 삭제

코드/문서상 사진·댓글 신규/수정은 검토 후 공개하며 약관 동의, 신고, 계정 간 차단, 작성자 삭제, 운영자 검토/제한, 재검토 요청을 제공한다. 서버 사진 재인코딩으로 EXIF를 제거하지만 사진에 보이는 얼굴/주소는 별도 검토 대상이다. 차단은 로그인한 두 계정의 보기 제한이며 로그아웃한 사람의 공개 열람이나 이미 받은 사본 회수까지 보장하지 않는다.

Google의 UGC 정책은 업로드 전 약관 수락, 금지 콘텐츠 정의, 앱 내 신고/차단 및 지속적인 조치를 요구한다. 현재 사전 검토 방식은 대응 수단이지만 실제 운영자와 처리 능력은 별도로 마련해야 한다. [Google UGC 정책](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en-GB)

Apple 1.2에 맞춰 게시 전 부적절한 자료 여과, 신고와 적시 대응, 가해 사용자 차단, 공개 연락처를 운영한다. 개발자용 공개 GitHub 게시판만 두고 민감한 신고·계정 소유 증빙을 거기에 올리게 하지 않는다. 현재 문서의 ‘48시간 검토 목표’는 담당자와 실제 운영이 확정되기 전 보장으로 쓰지 않는다. [Apple UGC](https://developer.apple.com/app-store/review/guidelines/#user-generated-content)

앱 내 삭제는 `AccountScreen` → 계정 관리 → 온라인 계정 삭제 → `edgeAction('deleteAccount')`이며 서버는 최근 15분 로그인과 확인값을 검사하고 비공개 파일 삭제 후 계정 삭제를 수행한다. 이는 코드 확인이지 이번 실서버 삭제 성공 증거는 아니다. 삭제 재인증·실패 후 재시도·잔여 파일/행·회원 미가입 Auth 계정도 함께 시험한다. 로컬 관측 기록/사용자 내보내기 파일, 이미 저장한 공개 사본, 익명화된 운영 이력과 서비스 로그 보관을 구분한다.

Google은 앱 안과 앱 밖의 삭제 요청을 모두 요구한다. 웹 자원은 앱/개발자 이름과 요청 경로가 명확하고 재설치를 요구하지 않아야 하며 이메일/폼도 가능하다. privacy 문서의 눈에 띄는 삭제 절로 연결할 수도 있지만 설명만 있고 요청 수단이 없으면 부족하다. [Google 계정 삭제](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)

후속으로 `delete-account.html`에서 웹/PWA 계정 화면으로 연결하는 경우에는 **웹에서 재설치 없이 로그인하고 실제 삭제를 요청할 수 있는지** 확인한다. 페이지 파일 생성만으로 일반 SMTP 미개통이나 계정 접근 실패를 해결한 것으로 표시하지 않는다. 메일을 받을 수 없을 때의 비공개 지원 경로도 실제 수신 주소가 확정된 뒤 연결한다.

Apple의 일반 앱은 앱 내 삭제를 제공해야 하므로 위 외부 이메일 경로로 앱 내 삭제를 대체하지 않는다. 보안용 재인증은 가능하지만 불필요하게 어렵게 만들면 안 된다. 실제 완료까지 시간이 필요하다면 그 시간과 완료 여부를 알린다. [Apple 계정 삭제](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

## 5. 개인정보·Data safety 제출 초안

**현재 상태를 ‘수집 없음’으로 제출하면 안 된다.** 선택 계정도 서버 수집이며 공개 사진이 앱에 번들된 164개 천문 사진인지 사용자가 업로드한 개인 사진인지 구분한다. 전자는 외부 이미지 서버 요청 없이 내장하지만 후자는 Supabase로 전송된다.

| 실제 경로 | 데이터/목적 | 제출 시 주의 |
| --- | --- | --- |
| 이메일 로그인·회원 | 이메일, 사용자 UUID, 마당 이름/표시 별칭; 인증·계정 관리 | 계정에 연결됨. 실명/전화번호를 필수 수집한다고 만들지 않음 |
| 공유 사진·설명·댓글·장비 | 사진, 직접 쓴 콘텐츠; 공개 게시 기능 | EXIF 제거가 사진 자체의 수집을 없애지 않음. 게시자 UUID와 연결 |
| 개인 클라우드 백업 | 관측 메모/시각/위치, 사진/스케치, 장비, 학습 답안/진도, 꾸미기/설정 | 명시 업로드지만 서버에 읽을 수 있는 JSON으로 저장되므로 로컬 전용·종단간 암호화로 신고하지 않음. 현재 클라우드 호출은 기본 `exportBundle()`이라 사진 포함/좌표 반올림 없음 |
| 신고·차단·재검토 | 사용자/대상 ID, 사유, 조치 기록, 사용량 | 안전·지원·남용 방지; 실제 식별자 제거와 잔여 보관 기간 확인 |
| 현재 위치·날씨 | GPS/수동 관측 좌표, Open-Meteo 요청/IP | 위치 권한은 선택/수동 대안. 날씨 좌표는 앱 밖 전송. 계정 백업에 포함된 위치는 계정 연결이며 날씨의 비연결 요청과 구분 |
| 로컬 전용 기능 | 업로드하지 않은 기록·센서 계산·설정 | 기기 안 처리 자체는 외부 수집이 아님. 사용자가 클라우드 백업하면 포함 데이터는 위 서버 수집에 해당 |
| 서버/호스팅 | Supabase·메일 제공자·GitHub Pages·Open-Meteo 접속 정보 | IP/로그 보관·처리 목적은 서비스 설정/약관을 실제 확인. 기기 ID·광고 ID·분석 SDK가 있다고 추정하지 않음 |

Google은 기기 밖 전송을 수집으로 정의하며 일시 처리도 양식 답변에 포함한다. 서비스 제공자 처리나 사용자가 명시적으로 지시한 공유는 특정 조건에서 ‘sharing’ 표기의 예외가 될 수 있으므로, **전송=무조건 제3자 공유** 또는 **선택 업로드=수집 아님**으로 단순화하지 않는다. 공개/비공개 테스트 제출에는 Data safety가 필요하며 내부 테스트만 있는 앱의 예외를 공개 출시로 확장하지 않는다. [Google Data safety 정의](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

Apple은 실시간 요청 처리보다 오래 접근 가능한 외부 보관을 수집으로 본다. 선택적 수집이라고 자동 신고 면제는 아니며 반복 사용하는 계정·사진·백업은 신고 대상으로 검토한다. 자유 메모에 사용자가 임의로 민감한 내용을 쓸 수 있다는 이유만으로 모든 민감 데이터 타입을 늘리지 않는다. [Apple 개인정보 라벨 정의](https://developer.apple.com/app-store/app-privacy-details/)

정책 URL은 로그인·지역 제한 없이 HTML로 접근되고 앱 안에도 연결되어야 한다. 운영 주체, 연락/요청 수단, 종류·목적·제공자, 보관·삭제 정책을 실제 운영과 맞춘다. 점검 당시 개인정보 안내는 내용 대부분이 현행 선택 온라인 기능을 설명하지만 이름이 이전 브랜드이며, 외부 삭제 요청·비공개 연락 수단·접속 로그의 실제 보관 기간은 미확정이다. [Google 사용자 데이터 정책](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)

### iOS privacy manifest의 코드 기반 추천

점검 당시 `ios/App/App/PrivacyInfo.xcprivacy`는 정밀 위치 한 항목에 `linked=false`다. 아래는 **현 코드와 Apple 정의를 대응한 권고**이며 최종 Xcode privacy report와 App Store Connect 답변을 별도로 검토한다. 모든 추천 항목은 `NSPrivacyCollectedDataTypeLinked=true`, `NSPrivacyCollectedDataTypeTracking=false`, 목적 배열은 **`NSPrivacyCollectedDataTypePurposeAppFunctionality`** 한 개다. 선택 백업의 UUID별 파일 경로와 회원/UGC/지원 테이블이 연결 근거다. 서버에서 이용 행태 분석·광고·맞춤 추천에 사용한다는 증거가 없으므로 Analytics/Advertising/ProductPersonalization을 임의로 추가하지 않는다.

| `NSPrivacyCollectedDataType` 값 | 현 코드의 근거 |
| --- | --- |
| `NSPrivacyCollectedDataTypeEmailAddress` | 이메일로 계정 생성/인증 |
| `NSPrivacyCollectedDataTypeUserID` | Auth UUID, 작성자/백업 소유자, 공개 마당 이름/별칭 |
| `NSPrivacyCollectedDataTypePhotosorVideos` | 서버에 공유 사진 업로드, 백업의 사진·스케치 Blob |
| `NSPrivacyCollectedDataTypePreciseLocation` | `exportBundle()` 기본 `roundCoords=false`의 관측지·관측 기록 좌표를 계정 백업에 보관. 기존 linked=false를 계속 사용할 수 없음 |
| `NSPrivacyCollectedDataTypeOtherUserContent` | 메모, 설명, 댓글, 직접 입력 장비, 마당 배치·코디 등 사용자가 만든 내용 |
| `NSPrivacyCollectedDataTypeProductInteraction` | `progress`의 `learn.attempt:*`, `learn.stage:*` 답안/완료 시각·진도 등을 백업하여 이전 상태 복원. 분석 목적이 없어도 저장된 앱 이용 정보에 해당 |
| `NSPrivacyCollectedDataTypeCustomerSupport` | 사용자가 제출한 신고/재검토 사유와 지원·처리 흐름 |

**학습/꾸미기를 하나의 OtherUsageData로 뭉치지 않는다.** 직접 만든 코디/마당 내용은 OtherUserContent, 학습 수행·진도는 더 구체적인 ProductInteraction으로 구분하는 안이다. OtherUsageData는 이미 이 구체 타입으로 설명한 데이터를 중복 표시할 이유가 없다. GameplayContent는 이 교육 앱의 저장 형식을 곧바로 게임 저장 데이터로 단정하지 않고 추가하지 않는다. 사용자 정의 관측 메모를 모두 학습 사용량으로 취급하지도 않는다.

현재 회원 입력의 실제 문구는 ‘마당 이름/Garden name’이며 실명 요청이 아니다. Apple의 UserID에 화면 이름/handle이 포함되므로 JSON 필드가 `name`이라는 이유만으로 실명 타입 `Name`을 더하지 않는다. 향후 실명을 받으면 별도 갱신한다. 인증 메일을 보내는 것만으로 사용자의 메일함을 수집하는 `EmailsOrTextMessages`가 되지는 않는다. 현재 지급/구매가 없으므로 PaymentInfo/PurchaseHistory도 추가하지 않는다. 정밀 위치와 별도로 지속 보관하는 근사 위치 경로·서버 로그의 식별자 유형은 실제 최종 데이터 흐름에서 확인하고 필요할 때만 반영한다.

공식 정의: [데이터 타입](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype?language=objc), [수집 목적](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatypepurposes), [사용자 연결 여부](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatypelinked?changes=_9), [manifest 작성 절차](https://developer.apple.com/documentation/technotes/tn3184-adding-data-collection-details-to-your-privacy-manifest).

각 SDK의 required-reason API/자체 manifest는 합쳐진 최종 앱의 privacy report에서 따로 확인한다. App Store 개인정보 라벨에는 사용하는 SDK/서비스도 포함한다. 원시 방향 센서를 광고/건강 데이터로 신고하거나, 단순 계정 인증만으로 추적을 한다고 표시하지 않는다. [Apple privacy 관리](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)

## 6. 네이티브·계정·테스트 요건

- **Google target SDK:** 2026-08-31부터 신규 앱/업데이트는 Android 16 **API36 이상**이다. 기존 target36은 맞으며 min24와 서로 다른 값이다. 최종 서명 AAB에서 다시 읽어 확인한다. [공식 API 요건](https://developer.android.com/google/play/requirements/target-sdk)
- **16KB:** Google Play의 관련 네이티브 앱 요건에 맞춰 기존 정렬/네이티브 라이브러리 검사를 최종 산출물에서 유지한다. 파일 ZIP 정렬만으로 모든 기기 실행을 보장하지 않는다. [Android 16KB 지원](https://developer.android.com/guide/practices/page-sizes)
- **Apple SDK:** 2026-04-28부터 업로드는 **Xcode26 이상 + iOS/iPadOS26 SDK 이상**이다. 앱의 최소 iOS16.4는 설치 하한이므로 SDK26과 모순되지 않는다. 새 최종 빌드에 사용한 SDK·서명·plist build 번호를 확인한다. [Apple 제출 요건](https://developer.apple.com/news/upcoming-requirements/)
- **개발자 계정:** 소유자가 Play 계정 유형/생성일·본인/연락처·실제 Android 기기 인증 상태, Apple 팀/계약·Bundle ID·App Store Connect 앱·판매자 표시/지역을 확인한다. 표시 이름 변경만을 이유로 기존 앱 ID를 바꾸지 않는다.
- **신규 개인 Play 계정:** 2023-11-13 이후 생성된 개인 계정은 최소 **12명, 직전 14일 연속 참여한 비공개 테스트** 후 프로덕션 액세스를 신청한다. 14일 경과만으로 자동 승인되지 않으며 테스트·피드백 질문에 답해야 한다. 두 사람의 개인 APK 체험·내부 테스트·자동 에뮬레이터 검사는 이를 대체하지 않는다. 해당 여부와 테스트 시작일은 Console에서 소유자 확인이 필요하다. [Google 개인 계정 테스트](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- **실기기:** Android 업데이트/자료 보존/메일 앱 복귀/카메라·선택 사진/위치 거부·수동 대안/센서 방향, iPhone 서명 앱·Safari PWA의 별도 저장소/메일 복구/비행기 모드/안전 영역을 점검한다. 브라우저의 iPhone 에뮬레이션을 실제 iPhone 확인으로 쓰지 않는다.

## 7. 등록 이름·자산·스크린샷

확정한 전체 이름은 공백·하이픈 포함 **24자**다. Google 앱 이름 30자 제한 안에 들어간다. 한영 등록 언어별 이름·짧은 설명/부제·전체 설명을 정리하고, 앱 이름 확보나 상표 권리를 이번 조사로 확정했다고 표시하지 않는다. [Google 앱 등록 정보](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)

| 자산 | 공식 규격/제출 제안 | 이번 로컬 확인 |
| --- | --- | --- |
| Play 아이콘 | 512×512, 32-bit PNG, 최대 1,024KB | `docs/store-assets/play-icon-512.png`: 512×512, RGBA, 35,155bytes. 등록 아이콘과 런처 아이콘은 별도 |
| Play 피처 그래픽 | 1024×500, JPEG 또는 알파 없는 24-bit PNG | 한영 PNG 각각 35,504/39,229bytes, RGB. 생성 SVG/스크립트에는 SKYLOG가 남아 있어 새 이름 반영 필요 |
| Play 스크린샷 | 최소 2장, JPEG/24-bit PNG·알파 없음, 각 변 320~3840, 긴 변은 짧은 변의 2배 이하. 추천 노출용은 앱 기준 1080×1920 세로 4장 이상 권장 | 최종 빌드의 하늘·오늘 밤 사진·관측 기록·마당·퀴즈·별길을 6장 후보로 준비. 기존 자동 검사 캡처의 치수/브랜드/개인정보를 그대로 승인하지 않음 |
| iOS 앱 아이콘 | iOS용 1024×1024 앱 아이콘 | 기존 `AppIcon-512@2x.png`: 실제 1024×1024 RGB, 73,688bytes. 파일 이름과 실제 크기 구분 |
| iPhone 스크린샷 | 공식 허용 크기로 1~10장. 6.9형 예: 1320×2868 또는 1290×2796, 알파 없음. 6.9형 미제공 시 공식 6.5형 필수 조건 확인 | 최종 앱 화면을 사용. Play용 1080×1920과 별도 제작 |
| iPad 스크린샷 | iPad 지원 시 13형 필수. 2064×2752 또는 2048×2732 등 공식 허용 크기 | 현 Xcode `TARGETED_DEVICE_FAMILY="1,2"`로 iPad 지원. iPhone 캡처만 준비하면 부족 |

Play 규격과 추천 노출 권장은 [공식 미리보기 자산 안내](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB), Apple 허용 해상도와 iPad 조건은 [공식 스크린샷 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)을 따른다. 실제 앱 화면을 정확히 보여 주고 개인 계정·위치·메일·테스트 비밀은 노출하지 않는다. 이미지 규격 통과와 실제 폰 검증은 서로 다르다.

사진을 쓴 홍보물에도 각 원본의 상업/표기 조건과 가공 기록을 유지한다. 164개 천문 사진의 권리 출처는 `OBJECT-PHOTOS.md`/manifest를 따르며 사용자 사진을 홍보물에 자동 전용하지 않는다. ‘모든 천체 사진’, ‘실시간 사진’, 카메라 별 자동 인식 또는 망원경 모터 제어 등 없는 기능을 문안에 넣지 않는다.

## 8. Console 제출 답변과 최종 순서

1. 새 이름·최종 버전/서명·개인정보/지원/외부 삭제 URL·한영 문안과 이미지를 맞춘다. `STORE-LISTING.md`의 이전 정책 표를 그대로 복사하지 않는다.
2. 일반 가입 SMTP, 실제 운영자, 비공개 문의 수단, 재사용 가능한 심사 접근을 완성한다. 가입/커뮤니티를 제거하거나 이메일 확인·RLS를 전역 해제하는 우회는 사용하지 않는다.
3. 실제 수집/처리/삭제와 양쪽 privacy 양식·iOS report를 대조한다. 광고는 없음, 현재 인앱구매는 없음, 계정은 일부 기능에 필요, 사용자 제작 사진/댓글과 신고/차단은 있음으로 준비한다.
4. 대상 연령과 국가를 실제 의도대로 고른다. 천문 교육이라는 이유로 아동 전용/전체연령을 자동 확정하지 않고 UGC 및 서비스 운영 조건을 새 Apple 연령 질문지·Google 질문지에 반영한다. 아동을 대상에 포함하면 Families/Kids 관련 조건을 별도로 충족해야 한다. [Google 앱 콘텐츠 질문지](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en), [Apple 새 연령 질문](https://developer.apple.com/news/upcoming-requirements/)
5. 최종 서명 Android 내부 테스트와 Apple TestFlight에서 실제 설치·로그인·기록 보존·UGC·삭제·백업을 확인하고, 해당 Play 비공개 테스트를 진행한다. 교육 핵심 기능이 센서/권한 없이도 동작하는 검토 경로와 시뮬레이션 안내를 심사 메모에 쓴다.
6. 준비된 실제 결과와 소유자 Console 확인을 기록한 다음 공개 제출한다. 미래 이용권은 상품 범위·검증/복원·두 사람 권한·날씨 상업 계약과 실제 가격/시행일을 별도로 마친 뒤 판매한다.

이번 조사 완료는 정책 대조와 제출 전 할 일의 확정이다. **일반 가입 개통, 계정/키 확보, 리뷰 계정, 외부 삭제 요청 개통, 최종 스토어 제출 및 실기기 확인을 완료했다는 뜻은 아니다.**
