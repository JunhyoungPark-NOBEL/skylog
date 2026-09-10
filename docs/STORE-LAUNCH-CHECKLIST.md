# 스카이야드 출시 준비표

2026-09-10. **등록 정보·새 브랜드·배포 파일을 준비했지만, 일반 공개 출시는 아래 서비스 운영과 심사 절차를 마쳐야 한다.** Play/App Store Connect에 등록·제출하거나 약관에 동의한 작업은 없다.

## 지금 입력할 값

| 항목                    | 값                                   |
| ----------------------- | ------------------------------------ |
| 앱 이름                 | 스카이야드 Skyard - 천체 관측 가이드 |
| 패키지                  | io.github.junhyoungparknobel.skylog  |
| 기본 언어 / 유형 / 가격 | 한국어 ko-KR / 앱 / 무료             |
| 고객지원 / 운영자       | tony030214@gmail.com / 박준형        |

전체 이름은 24자. 실제 APK/AAB/iOS에서 확인한 기존 ID를 유지한다. 패키지는 영구 식별자이며 Console 사용 가능 여부는 소유자 화면에서 확인한다. [Google 등록](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)

## 사용자 확인과 서명 방침

- 사용자가 **2023-11-13 이후 만든 개인 계정**, **이 패키지의 Play AAB 업로드 이력 없음**, **집 PC 접근 불가·이 PC에서 계속 작업**이라고 확인했다.
- 따라서 기존 집 PC 키를 복구하는 방식 대신 **이 PC의 새 Play 업로드 전용키로 최초 등록을 준비**한다. 첫 Play 업로드이므로 기존 등록 키 재설정 절차는 필요하지 않다. 실제 첫 업로드에서 Console 인증서를 확인한다.
- 기존 개인 설치 APK 인증서는 보존한다. Play 업로드키·Play의 최종 앱 서명키·개인 APK 키는 구분한다. 키/암호는 Git·공개 릴리스·채팅에 올리지 않는다.
- 키와 암호 보호 파일은 현재 Windows 사용자에 묶인다. PC 교체/Windows 재설치에 대비한 별도 암호화 백업은 필요하며 공개 배포 ZIP에 넣지 않는다. 자세한 서명 결과/인증서/안전한 백업 경로는 [모바일 릴리스 기록](MOBILE-RELEASE.md)을 따른다.

## 출시 전 남은 항목

| 항목                  | 확인 상태와 완료 조건                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Play 서명·등록        | 새 업로드 전용키와 서명 AAB 준비 후 첫 업로드/Play App Signing 설정·버전·인증서 대조. 로컬 서명 성공이 Console 업로드 성공은 아님                                            |
| 비공개 테스트         | 최소 **12명·14일 연속 참여** 후 프로덕션 액세스 신청. 실제 모집/시작/참여 이력은 미확인. 두 사람의 APK 사용이나 내부 테스트로 대체 불가                                      |
| 일반 회원 로그인      | 9/10 Supabase 관리 화면에서 Custom SMTP 꺼짐 직접 확인. SIGNUPS_READY=false / EMAIL_CODE=false 유지. 일반 외부 이메일 수신·만료·재전송·Android 복귀·iPhone 복구 확인 후 개통 |
| 지원·보관 정책        | 공개 연락처를 정책/지원/삭제/약관에 반영. 실제 수신 시험·담당/응답·서버 로그 보관 기간은 미확인                                                                              |
| 댓글·사진 운영        | 약관 동의·검토·신고·차단·삭제/재검토 코드 있음. 실제 운영 계정 지정·담당/주기·접수부터 처리까지 시험 필요                                                                    |
| 심사 접근             | 계정 기능 접근을 반복 사용 가능하고 만료되지 않는 심사 계정/전체 기능 데모로 마련. 개인 메일함이나 운영자 비밀을 심사 자료로 제공하지 않기                                   |
| 외부 계정 삭제        | 웹 계정 링크와 비로그인 이메일 요청 페이지 준비. 실제 외부 회원 로그인→삭제/재시도, 이메일 요청 처리·완료 안내 시험은 남음                                                   |
| 개인정보              | 구형 무수집 표 교체·Apple manifest 7종 반영. 실제 처리/보관과 Play Data safety·Apple privacy report/라벨 최종 대조 필요                                                      |
| 국가·연령·개발자 계정 | 소유자가 공개 국가·대상 연령/아동 포함·연락처/기기 인증·계약을 Console에서 확정. UGC 포함 실제 질문지에 답변                                                                 |
| 실기기·스크린샷       | Android 실제 업데이트/자료 보존·메일·센서·오프라인, iPhone/iPad 설치·안전영역/스크린샷 필요. 자동 브라우저는 실제 폰 결과가 아님                                             |
| Apple 배포            | Apple 팀·배포 서명·App Store Connect 앱·Archive/Validate/TestFlight 필요. 기존 실제 CI는 build15 무서명, 새 브랜드의 서명 설치 검증은 아님                                   |
| 상업 운영 서비스      | Open-Meteo 무료 API·GitHub Pages 조건을 실제 사업 목적과 대조해 날씨 계약/운영 웹 호스팅 확정. 무료 다운로드만으로 상업 사용 허용으로 판단하지 않기                          |

비공개 테스트 14일 경과가 자동 출시 승인은 아니다. 테스트/피드백에 관한 답변과 프로덕션 액세스 검토를 거친다. [Google 신규 개인 계정](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

기본 SMTP를 프런트엔드 수정만으로 일반 메일 서비스로 바꿀 수 없다. 현재 사이트 URL과 기존 앱 로그인 URI만 확인했으며 서버 설정·메일 발송·이메일 확인/RLS는 변경하지 않았다. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## 빌드·설치와 제출 자료

- 이번 준비 버전 **0.1.0-beta.12 / build17**. 실제 파일·서명·해시·배포 결과는 [MOBILE-RELEASE](MOBILE-RELEASE.md)에 기록한다. Android min24/target36, iOS min16.4. 현재 Play target36 요건에 맞는다. Apple에는 Xcode26+/iOS26+ SDK로 만든 최종 서명 Archive가 필요하다. [Android 요건](https://developer.android.com/google/play/requirements/target-sdk), [Apple 요건](https://developer.apple.com/news/upcoming-requirements/)
- 개인 APK→Play 설치본은 최종 앱 서명 인증서가 다를 수 있다. 먼저 JSON 백업을 내보내고 실제 테스트 트랙에서 전환/복원을 확인한다. 앱을 먼저 삭제하지 않는다.
- **iPhone은 APK를 실행할 수 없다.** 현재 [홈 화면 웹앱](https://junhyoungpark-nobel.github.io/skylog/)을 이용한다. TestFlight/App Store 설치는 별도 Apple 서명이 필요하다.
- [한영 등록 문안·개인정보 답변·정책 URL](STORE-LISTING.md)
- [Play 아이콘512](store-assets/play-icon-512.png) / [한국어 그래픽1024×500](store-assets/feature-ko-1024x500.png) / [영어 그래픽](store-assets/feature-en-1024x500.png). 자체 벡터에서 SKYARD로 재생성
- 최종 실제 앱 스크린샷: 하늘 / 오늘 밤 / 기록 / 마당 / 퀴즈 / 별길. Play 최소2장, 6장 후보. 현재 iPad도 지원하므로 iPad 자료 필요
- [사진164개 권리·출처·가공](OBJECT-PHOTOS.md), [데이터 라이선스](DATA-LICENSES.md). 홍보물에도 개별 사진 조건 확인

## 개인정보·계정 삭제·심사

**수집 없음·모든 기능 로그인 불필요·사용자 게시물 없음으로 제출하지 않는다.** 기본 자료는 로컬이지만 선택 계정의 이메일/ID/별칭과 사진·댓글·요청 백업은 서버에 저장한다. 백업에는 정밀 위치·사진·학습·꾸미기가 포함된다. 신고/재검토와 실제 접속 로그 처리도 대조한다. 사용자 요청 업로드와 제3자 공유 예외는 별도 판단한다. [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [Apple Privacy](https://developer.apple.com/app-store/app-privacy-details/)

삭제 URL: https://junhyoungpark-nobel.github.io/skylog/delete-account.html . 앱 재설치 없이 웹 계정 관리 또는 이메일 요청으로 진행한다. 공개 페이지/메일 링크를 마련한 것과 실제 삭제 요청 처리 성공은 구분한다. 비공개 이메일로 계정 소유 확인과 완료를 안내하고 비밀번호·인증 링크/코드는 받지 않는다. [Google 계정 삭제](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)

심사자는 기본 관측을 수동 장소·하늘 드래그로 이용할 수 있다. 계정 기능에는 지속적인 심사 접근을 별도 제공한다. 신고/차단 UI가 있어도 실제 운영자가 필요하다. [Google 심사 접근](https://support.google.com/googleplay/android-developer/answer/15748846), [Apple UGC](https://developer.apple.com/app-store/review/guidelines/#user-generated-content)

## 유료화와 두 사람의 무료 이용

현재 다운로드·전 기능은 무료이며 광고·결제·잠금이 없다. 향후 사용자 요청 범위인 **퀴즈 난이도2·3 + 망원경 학습 코스**의 1회 구매 이용권을 검토한다. 가격/상품/시행일은 미정. 기본 관측·장비 시야·기록·마당/댓글을 유료 대상으로 넓히지 않는다. [기존 유료화 계획](MONETIZATION-PLAN.md)

Play에 무료로 공개한 앱은 같은 패키지의 유료 다운로드로 바꿀 수 없지만 앱 내 상품은 추가할 수 있다. Play Billing/Apple IAP·구매 검증/복원·환불/철회·기존 학습 진도 보존을 구현한 뒤 판매한다. [Google 가격](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en)

본인/여자친구는 현재 모두 무료로 사용한다. 향후 검증된 각 앱 계정에 공식 프로모션/무상 권한을 연결할 계획이며, 아직 코드나 권한을 발급하지 않았다. 이메일 하드코딩이나 운영자 권한으로 구매 권한을 대신하지 않는다.

사업 목적 출시와 미래 유료 서비스에 맞는 날씨/호스팅을 정한다. 기존 개인 PWA가 이미 위반이라 단정하지 않으며 무료 다운로드만으로 상업 서비스 적합성을 보장하지 않는다. 고객 API 비밀 키를 앱에 넣지 않는다. [Open-Meteo 약관](https://open-meteo.com/en/terms), [GitHub Pages 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## 실행 순서·폰 확인

1. 위 입력값으로 앱 초안을 만들고 서명 AAB로 Play 내부 테스트를 시작한다. 계정·약관·최초 App Signing은 소유자 Console에서 확인한다.
2. SMTP·지원/운영자·심사 접근·개인정보/삭제 실제 처리를 마감하고 출시국/연령을 확정한다.
3. 12명/14일 비공개 테스트와 피드백을 기록한 뒤 프로덕션 액세스를 신청한다.
4. Apple 팀 서명·TestFlight와 iPhone/iPad 이미지를 준비한다. 최종 심사 제출·출시 시점은 준비 결과를 보고 확정한다.

- [ ] Android: 기존 앱 삭제 없이 APK 업데이트 → beta.12/스카이야드 확인 → 기록·장비·학습·아바타 보존
- [ ] Android: 위치 거부/수동 장소·센서 복귀·오늘 밤 사진/출처·기록 사진 선택·비행기모드 재시작
- [ ] iPhone: Safari/홈 화면 새 버전·기존 기록·사진·센서 권한·메일 복구·비행기모드
- [ ] 온라인 개통 후: 일반 이메일 가입/재로그인·공유 승인/신고/차단·백업 복원·앱 밖 삭제/재시도
- [ ] Store: Play 인증서 전환 전 백업/복원, TestFlight와 iPad 배치 확인

이번 조사와 과거 검증은 [공식 자료·점검 당시 상태](../plan/research/2026-09-10-store-launch-audit.md)에 구분해 보존한다. 앱 이름/상표의 사용 권리, Console 이름 예약, 실제 심사 승인까지 확인한 것은 아니다.
