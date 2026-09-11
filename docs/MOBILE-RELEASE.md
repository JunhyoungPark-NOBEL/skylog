# Android AAB / iOS 출시 준비

## beta.16 / build22 — AAB 재생성 (로컬 배포 준비본)

- **구현**: 기능 변경 없음. 최신 지평선·프로필 확장 상태를 유지한 상태에서 Play 제출용 산출물을 다시 생성함.
- **소스**: `f4a584442126a855c3a85565201e3e8c610fb984`, `0.1.0-beta.16`/versionCode22, 앱ID `io.github.junhyoungparknobel.skylog`, min24/target36.
- **산출물**: `0.1.0-beta.16-build22-play-signed.aab`, **20,836,061bytes**, SHA256 `18ADAE63BB34A736F4C0B8BE90A8ECB3CB44A0E8FCBF3E10F761E005B3324E5D`. jarsigner strict 및 bundletool 유효성 검증 통과(로컬).
- **무서명 원본**: `0.1.0-beta.16-build22-unsigned.aab`, **20,737,113bytes**, SHA256 `1DDE39EDF9627CC131541E5606A63B69596F501123444F376DB69C7CF8799A0A`.
- **비고**: 업로드 인증키는 기존 키(`C:\\Users\\박준형\\AppData\\Local\\skylog-signing`)를 재사용했으며, 현재 경로의 비ASCII 경고 대응으로 `android/gradle.properties`에 `android.overridePathCheck=true`를 반영해 빌드 재현성을 확보했다. 산출물은 로컬 `C:\\Users\\박준형\\Downloads\\skylog-release-0.1.0-beta.16-build22\\`에 보관.

## beta.16 / build21 — 하늘과 연결되는 지평선 꾸미기 (최종 제출 준비본)

- **구현**: 기존 장식 21종·지면 4종·아바타 보상 28개를 유지하면서 build20에서 발생한 잠긴 장식 SVG 좌표 누락 콘솔 오류를 수정한 최종본. 장식은 고도 0° 이하에서만 보이며, 해상도/기기 회전/야간 모드/지면 투명도(기본 0)·은하수 밝기(기본 0.33) 상태를 일관되게 적용한다. 프로필은 공개/비공개 모두에서 지평선과 아바타를 함께 보여주며, 댓글은 아바타만 표시한다. 기존 코디·기록·획득 보상은 보존한다. [설계·보존 기준](HORIZON-PROFILES.md), [설명서](HORIZON-ART.md).
- **소스**: `f4a584442126a855c3a85565201e3e8c610fb984`, `0.1.0-beta.16`/versionCode21, 앱ID `io.github.junhyoungparknobel.skylog`, min24/target36.
- **검사**: [모바일 CI 34555542455](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34555542455), [Pages CI 34555541150](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34555541150) 모두 성공. 모바일 CI는 typecheck/lint/test·형상 점검·오프라인 계측·무서명/서명 APK 산출 확인을 모두 통과했고, Pages CI는 `pnpm data:content`, `data:learn`, typecheck/lint/test 및 빌드/배포까지 통과했다.
- **APK**: [다운로드](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.16-build21/skylog-0.1.0-beta.16-build21-local-test.apk), **21,446,107bytes**, SHA256 `5ff52bb0179bf8757dd3fb9a5786079941ce327dcfa44e270bbc1d201a9a2576`. 개인 테스트 서명은 build20와 동일 체인을 유지했고 공개 재다운로드도 로컬 APK와 SHA256 일치로 재검증했다.
- **Play 제출 AAB**: `skylog-0.1.0-beta.16-build21-play-signed.aab`, **20,836,059bytes**, SHA256 `0e2ce28856e1c0f5384a34c5cbaaf7c29b31283f0a6d5a844b4ba5c44a26dbb1`. RSA4096/SHA256withRSA·jarsigner strict·bundletool 검증이 통과했고, 업로드키 지문은 기존 키(`f5ad3a778d18b33973938b40f5b93f604c0cb099095a9875b09aa4f0c57a98bd`)와 동일하다. 이 파일은 `Downloads/skylog-release-0.1.0-beta.16-build21/`와 [Play 제출 가이드](SIGNING-ON-THIS-PC.md)에 준비되어 있다.
- **내장 자료**: 무서명 원본 `skylog-0.1.0-beta.16-build21-unsigned.aab`는 **20,737,114bytes**, SHA256 `db4e0348b4dd6583a5271f53d1c7475d609cf3fe47f7dc4a18340c6c72f482ef`로 보존한다. native572개·source public480개·사진164개/파생328개가 APK/서명·무서명 AAB/로컬 Android·iOS와 일치한다. Android lint 오류 0·경고 32. 키·암호는 산출물 폴더에 포함하지 않았다.
- **서버/보존 이력**: migration202609110001과 사용자 기여/프로필 enum 정책은 검증되었고, 기존 회원1·사진0·댓글0 데이터 지문은 보존됐다. 고급 장식/지형은 이전 build에서 보존하던 항목을 해치지 않도록 확인했다.
- **실기기 전환점**: 기존 앱 삭제 없이 업데이트하면, 내 프로필의 지평선 장식 이동/숨김 설정이 보존되는지, 하늘로 복귀 후 센서 이동성·야간 표시가 자연스러운지, 재실행 후 기록과 성과 보존이 유지되는지 확인한다. 실제 휴대폰 센서/터치감, iPhone 비행기 모드 재실행, Apple 서명/TestFlight·Play 심사·실결제는 별도 단계다.

## beta.15 / build20 — 하늘과 연결되는 지평선 꾸미기 (수정 전 검증 이력)

- **구현**: 장식21종·지면4종·아바타 보상28개. 벤치·식탁·정자와 굴절/반사/돕소니안/SCT 등 서로 다른 장비를 남쪽 다섯 자리에 놓는다. 장식은 고도0° 아래에만 보이며 크기·숨김·지면 투명도·야간 적색을 반영한다. 프로필은 지평선과 아바타를 함께, 댓글은 아바타만 표시한다. 이전 무료 코디·장식과 획득한 보상은 보존하며 신규 기본 무료 선택을 줄였다. [설계·보존 기준](HORIZON-PROFILES.md).
- **소스**: `b320642293d86b4e1e16a8f9c968d893ebc8b1b7`, `0.1.0-beta.15`/versionCode20, 앱ID `io.github.junhyoungparknobel.skylog`, min24/target36. 새 외형을 구매 상품으로 만들거나 실제 결제·광고·SMTP를 변경하지 않았다.
- **검사**: 타입·전체 lint·포맷·전체99파일/733단위 통과. 정적 PWA 관련 Chromium26개(오프라인1개 포함), 실제 WebGL7개, PostgreSQL/RLS78개(기존46+지평선32) 통과. 360px·영어125%·야간 색·기존 소유권·계정 전환·공개 프로필·오프라인 저장/재실행을 확인했다. 모달 그림 클릭 후 Escape와 야간 글자색 문제를 발견해 수정하고 회귀 검증했다.
- **서버**: migration202609110001 적용, 함수3개 본문이 로컬 SQL과 일치. 기존 회원1·사진0·댓글0와 기존 회원 데이터 지문을 보존했고 실제 사용자 프로필을 게시하지 않았다. 익명 RPC 차단·회원 자체 변경·enum 검증과 한영 공개 안내를 확인했다.
- **APK**: [다운로드](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.15-build20/skylog-0.1.0-beta.15-build20-local-test.apk), **21,446,107bytes**, SHA256 `4056a741abc1d3b1732f6152c1e9bad543704f9c0747d7d171412e3aeff87837`. build19와 같은 개인 인증서·16KB 정렬·메타데이터를 검증했고 공개 재다운로드가 로컬 파일과 완전히 일치한다.
- **Play 제출 AAB**: `skylog-0.1.0-beta.15-build20-play-signed.aab`, **20,836,038bytes**, SHA256 `4ef9fe1f9bf3644bcd68f32836cf9d465fe61ae2290a589d28c98df90ebf9bf0`. 기존 업로드 키·RSA4096/SHA256withRSA·jarsigner strict·bundletool 통과. payload1077개 전체 서명/무서명 원본 일치, 미서명payload0. 로컬 `Downloads/skylog-release-0.1.0-beta.15-build20/`에 제공하며 Console 업로드는 수행하지 않았다.
- **내장 자료**: 무서명 원본 **20,737,126bytes**, SHA256 `31e4666dc6a0e6cda82885f6866a46971172f7c9c9ad1143e98646be998b1ee4` 보존. native572개·소스public480개·사진164개/파생328개의 AAB/APK/로컬 Android/iOS 일치를 확인했다. Android lint 오류0·경고32. 키·암호는 배포 폴더에 포함하지 않았다.
- **공개 검수 후 수정**: Pages34555024724 배포와 다섯 기능 검사는 통과했지만 모든 잠긴 장식 미리보기에서 고사리 SVG 좌표 구분자 누락에 따른 console 오류4개를 발견했다. 이 빌드는 보존하고 수정된 beta.16/build21을 최종 제공한다. 오류 로그·그림은 artifacts/qa-build20/public-first-attempt-b320/에 보존한다.
- **실기기 확인**: 기존 앱 삭제 없이 업데이트 → 프로필에서 장식을 옮기고 하늘로 돌아오기 → 센서 이동 중 크기·야간 표시 → 앱 재실행 후 코디·기록 보존. 실제 휴대폰 센서/터치감, iPhone 비행기 모드 재실행, Apple 서명/TestFlight·Play 심사·실결제는 별도다.

## beta.14 / build19 — 선행 문제·문맥 용어 설명·이야기 이미지

- **소스**: `c31c615e89dafeb64af48ee1095d571265d178e9`, `0.1.0-beta.14`/versionCode19, 기존 앱ID·min24/target36 유지. 기존 30문제 앞의 준비 문제60개, 용어 홀딩·탭·키보드 설명, 주제별 도해와 로컬 수식 조판, 이야기 사진/좌표 도해를 추가했다. 아래첨자는 직립체다. 기존 원답·정답·허용오차·메모·진도와 광고 없는 Plus 베타 미리보기를 유지한다.
- **검사**: 전체93파일/701단위·타입·lint·포맷, Chromium 관련9개(실제 PWA offline 포함), 좁은폭/125% 한영60도해 검수 통과. 오프라인 새로고침·준비 진도·본 문제 입력/힌트/메모·미방문 도해와 로컬 글꼴을 확인했다. 외부 서버 쓰기는 하지 않았다.
- **APK**: [다운로드](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.14-build19/skylog-0.1.0-beta.14-build19-local-test.apk), **21,433,369bytes**, SHA256 `848166e5601427eb5b1fef6901d5bb0a04ddd7349194a225ad7534744f230ade`. 기존 build18 APK와 동일 인증서·version19·16KB 정렬, 공개 재다운로드 해시 일치까지 확인했다.
- **Play 제출 AAB**: `skylog-0.1.0-beta.14-build19-play-signed.aab`, **20,820,473bytes**, SHA256 `37aa667b96cd87c5a43294abd6d2e49df2a09bd01ae57271a66b7b48af992887`. 기존 Play 업로드 인증서·RSA4096/SHA256withRSA·jarsigner strict·bundletool 통과. payload1072개 전체 서명/원본 일치, 미서명payload0. AAB는 로컬 Downloads/skylog-release-0.1.0-beta.14-build19/에 제공하며 Console 업로드는 수행하지 않았다.
- **내장 자료**: 무서명 AAB20,722,069bytes·SHA256 `bd4f2cd251358dfd6e7ae72a1db1bc51cebe34ef594d14e92993968d71d35025`도 보존. Android/APK/AAB/iOS 로컬 public의 native567개·원본public480개와 사진164개/파생328개를 비교했다. 글꼴 추가도 native 에셋 비교에 포함한다. Android lint 오류0/경고32. 개인 키는 산출물에 넣지 않았다.
- **배포/CI**: [Pages34549739499](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34549739499), [모바일34549764863](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34549764863)의 모든 작업 단계가 성공했다. Android API36 오프라인 계측·release/lint, iOS Xcode26 무서명 Release 컴파일 단계 포함. API의 job/step 상태를 검증했으며 CI 아티팩트 XML을 별도로 재분석하지 않았다.
- **공개 웹**: 새 Chromium context에서 beta.14와 선행2단계·용어 홀딩 후 설명 유지·로컬 KaTeX 글꼴·토성 이야기 사진/출처를 확인했다. JS/CSS/woff2 응답17개 지문과 PNG3장 검수, 외부 요청·서버 쓰기·실패 요청·JS오류0. `artifacts/qa-build19/public-web-verification.json`에 근거가 있다.
- **한계**: 실제 휴대폰 설치·센서·터치감·iPhone 비행기 모드 재실행과 Play 거래·Apple 서명/TestFlight/스토어 심사는 별도다.

> 아래 beta.13 이하의 내용은 당시 배포 기록이다. [출시 준비표](STORE-LAUNCH-CHECKLIST.md) · [현재 PC 서명 안내](SIGNING-ON-THIS-PC.md)

## beta.13 / build18 — 역사 학습·공개 아바타·Plus 베타 미리보기

- **구현**: 역사·천체물리 10이야기/30문제/90단계별 힌트, 숫자·선택 답과 문제 메모·재도전, 사진·댓글의 공개 아바타/닉네임, 별 모자2개·천체 배경4개 보상을 추가했다. 학습 저장·로딩 오류의 안내와 재시도 경로를 보완하고 기존 기록·학습 성취·꾸미기를 유지한다.
- **유료화 경계**: **₩9,900 1회 구매**로 난이도2·3 퀴즈·역사 문제/힌트·망원경 학습 코스를 제공하기로 확정했다. 계정별 서버 권한과 Play Billing 9.1.0 브리지를 구현했지만 현재는 **무료 베타 미리보기**다. `preview`에서는 구매 API·네이티브 구매/복원을 호출하지 않고 `hasPlus=false`를 유지한다. 실제 상품 등록·`purchases` 서버/자격 증명·환불 재검증 운영·일반 SMTP는 미완료이며 본인/여자친구의 만료일 없는 무상 grant도 미발급이다. [결제 연결](BILLING-SETUP.md) · [일반 테스트와 라이선스 테스트](PLAY-TEST-AND-PAID-LAUNCH.md).
- **소스/Android**: `870747c964f81cdec60da06764c70949aad29357`, `0.1.0-beta.13`/versionCode18, 앱ID `io.github.junhyoungparknobel.skylog`, 표시 ‘스카이야드’, min24/target36. 로컬 release/lint 성공(오류0·경고32), APK 서명·16KB 정렬·bundletool·앱 메타데이터 검증 통과. 기존 build17 APK와 동일 인증서 `2dce38b758c9091f919465d32453b64e0835ff8b541bdeaa7c6f3231313fc110`를 직접 대조했다.
- **APK**: `skylog-0.1.0-beta.13-build18-local-test.apk`, **20,407,416bytes**, SHA256 `30527c6d96ecacf950674f121c02aaf922a5042107d4cdb5a1eff4e727e64a03`. [APK 다운로드](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.13-build18/skylog-0.1.0-beta.13-build18-local-test.apk) · [공개 사전 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.13-build18). 공개 재다운로드가 로컬 검증 APK와 크기·SHA256까지 일치한다(`artifacts/qa-build18/public-apk-verification.json`).
- **Play 제출 AAB**: `skylog-0.1.0-beta.13-build18-play-signed.aab`, **19,792,810bytes**, SHA256 `c03c9e60dae1ce5efc3aab6991a1a0364994f44a3f57f3cf23c58b437a5cdd26`. build17에 마련한 동일 업로드 인증서 `f5ad3a778d18b33973938b40f5b93f604c0cb099095a9875b09aa4f0c57a98bd`, RSA4096/SHA256withRSA·jarsigner strict·bundletool 검증 통과. payload **1,012개 전부 서명/원본 일치**, 미서명 payload0. 서명 AAB는 로컬 제공하며 공개 릴리스에는 개인 APK만 올린다. Console 업로드/등록 성공은 아직 확인하지 않았다.
- **보존 원본/자료**: 무서명 AAB **19,700,736bytes**, SHA256 `0608acb530a0b1f8a142c1c4c877063b4716cf022e253f39677289f6629e441a`도 별도 보존한다. 내장 native507개와 소스 public480개, 실제 천체 사진164개/파생328개가 APK·서명/무서명 AAB·로컬 Android/iOS 자료와 해시 일치한다. 로컬 iOS 자료 일치는 기기용 iOS 컴파일과 별도다.
- **배포/CI**: [Pages34461832598](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34461832598) 성공. 공개 HTTP와 읽기 전용 브라우저에서 beta.13·10이야기/30문제 진도·Payne 숫자 문제/3힌트/메모·₩9,900 일회성 Plus 미리보기/구매 버튼 없음·개인정보 페이지 원본 일치를 확인했다(`public-web-verification.json`). 글·학습 답·실결제는 전송하지 않았다. [모바일34461881585](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34461881585)도 전체 성공했다. Android release/lint·내장 자료 검사와 API36 에뮬레이터의 기존 오프라인 계측 단계, iOS Xcode26 무서명 컴파일·사진328개 해시 검사를 통과했다. 이 단계 성공은 실제 휴대폰이나 결제 검증을 대신하지 않는다.
- **검증 문서**: `Downloads/skylog-release-0.1.0-beta.13-build18/`의 `release-info.json`과 `play-signing-verification.json`을 기준으로 기록했다. 이전 버전 비교 보고의 고정 숫자 오류를 바로잡고 `verification-corrected/`에서 재검증해 실제 build17 비교를 확인했다. 최초 보고는 `release-info-before-report-correction.json`으로 보존하며 앱 바이너리 수정과 구분한다. 개인키·암호는 배포 폴더에 포함하지 않는다.
- **사용자/출시 잔여**: Android 실폰 설치·센서·기록 보존, iPhone 홈 화면의 로그인/오프라인·센서, 일반 SMTP·심사 접근·운영/삭제 절차, 실제 라이선스 구매/복원·환불, 12명14일 비공개 테스트·스토어 심사, Apple 서명/TestFlight가 남아 있다. 기존 앱을 삭제하지 않고 업데이트한 뒤 아래 [설치 안내](INSTALL-ON-PHONE.md)의 점검표를 따른다.

## beta.12 / build17 — 스카이야드와 최초 Play 업로드 준비

- **구현**: 확정 이름 ‘스카이야드 Skyard - 천체 관측 가이드’를 웹/PWA·한영 UI·Android/iOS 표시·스토어 그래픽에 반영했다. 앱ID·로그인URI·DB/백업 식별자를 유지한다. 사용자 제공 지원 이메일/운영자와 웹 계정·비로그인 이메일 삭제 안내를 공개 정책에 반영했다. 현행 선택계정/UGC/백업에 맞춰 Apple privacy manifest를 계정 연결7종으로 보완했다(D-060).
- **서명 해결**: 사용자가 첫 Play 업로드 전임과 현재 PC에서 계속 작업할 것을 확인해 새 Play 업로드 전용키를 마련했다(D-061). DPAPI·사용자 ACL로 보관하며 개인 APK 키는 유지한다. **서명 AAB 완성**: 19474322bytes · SHA256 888b5acf93b879f33f3f6ed9e8f57771a3be1dcc4a9a8d9b1fb5e98eb52d0d6d. jarsigner strict/bundletool·RSA4096/SHA256withRSA·payload997개 전체 서명/원본 일치, 미서명 payload0. 공개 인증서 SHA256 f5ad3a778d18b33973938b40f5b93f604c0cb099095a9875b09aa4f0c57a98bd. 실제 Console 첫 등록과 별도 암호의 휴대용 키 백업은 미실행이다.
- **빌드**: 소스 830c974bebeab0e873925ba58b0bd8a01798de6e, Android beta.12/build17/min24/target36·스카이야드 label·기존 APK 인증서·16KB 정렬 검증. public480/native502/photo328이 서명/무서명 AAB·APK·로컬 Android/iOS와 일치한다. Gradle release/lint 오류0·경고32. APK 20094988bytes · SHA256 ba0504adcaf6016cd54fee594a692bdb4724935840275c364d2f9fd94edd3a67. 무서명 원본 AAB SHA256 cc4abb02b4810fab2ec99941f645d85ea70b7bf8a28c7b4169eff3bf3ad72097도 보존한다. 최초 e2d9015 산출물은 최종 index 포맷 변경 후 별도로 보존하고 830c974를 다시 빌드했다.
- **검증/배포**: 타입/lint·변경 파일 포맷 통과. 초기 단위551개 및 worker 시작 timeout4파일의 후속29개 통과(총580개 고유 검사, 제품 조건 변경 없음). 로컬 Chromium16+Windows WebKit16, 공개 Chromium9개 통과·JS/콘솔 오류0. 영문 도움말 누락은 수정 후 재검했다. [Pages 34423116491](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34423116491) 성공, [APK 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.12-build17) 공개 및 재다운로드 SHA 일치. 폰/설치PWA/오프라인/실제 메일/삭제 성공과 구분한다.
- **자료**: Downloads/skylog-release-0.1.0-beta.12-build17/. Play 제출 파일은 skylog-0.1.0-beta.12-build17-play-signed.aab. docs/STORE-LAUNCH-CHECKLIST.md·STORE-LISTING.md·SIGNING-ON-THIS-PC.md에 등록값/한영 문안/정책/연락처/자산/서명 재사용과 백업 절차를 정리했다. 다음 수동 CI 기본18. 새 iOS CI 컴파일·Apple 서명/TestFlight는 수행하지 않았고 최근 실제 컴파일 증거는 build15이다.
- **남은 일/사용자 확인**: 신규 개인 계정의 12명14일 비공개 테스트·일반 회원 SMTP·실제 운영자/심사 접근·삭제 실제 운영·보관 정책·출시국/연령·Apple 서명/TestFlight·실폰 확인. 현재 전 기능 무료, 향후 퀴즈2·3/망원경 코스 상품·두 사람 무료 권한은 계획이다. 앱 등록/법적 선언/스토어 공개 제출은 수행하지 않았다. 폰에서는 기존 앱을 지우지 않고 업데이트해 스카이야드/beta.12·기존 기록/마당·사진/센서/로그인·오프라인을 확인한다.

## beta.11 / build16 — 오늘 밤 추천 사진 표시

- **수정**: 공용 추천 행에서 검색과 같은 사진 카탈로그와 썸네일을 사용한다. 오늘 밤의 추천 6개 그룹·관측 계획·오늘의 볼거리에 함께 적용한다. 사진이 없거나 읽기에 실패하면 종류 기호를 표시하며 관측 상태와 계획 저장의 별 버튼은 유지한다. 전체 출처는 상세 화면과 앱 정보에 둔다. 기존 사진164개/328파일과 manifest version2는 변경하지 않았다(D-059).
- **검증**: 타입·lint·포맷·단위580개, 기존 오늘 밤/사진 Chromium 시나리오9개 통과. Chromium과 Windows WebKit에서 세 카드·토성/M31/M39 사진·상세 출처·360px 영어125% 야간·계획 토글·이미지 실패 대체를 확인했고 JS예외0이었다. 초기 병렬 단위 실행의 사진 해시 검사1개가 5초 제한에 걸려 작업자4개로 전체580개를 다시 실행해 통과했다. 제품 검사 조건을 완화하지 않았다.
- **배포**: 소스 `e672ca13e98da1eab747f5c7a2762afe6625d919`, [Pages 34332721309](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34332721309) 성공. [웹앱](https://junhyoungpark-nobel.github.io/skylog/)에서 beta.11·추천/계획/볼거리·M31/M39·상세 출처·야간/작은 화면·계획 저장·JS예외0을 다시 확인했다. [새 APK](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.11-build16/skylog-0.1.0-beta.11-build16-local-test.apk) 재다운로드 해시도 일치한다.
- **APK/AAB**: Android release/lint 성공(오류0·경고32), build16/beta.11/min24/target36·서명·16KB 정렬·build15 인증서 일치. public479개 및 사진328개가 APK/AAB/로컬 Android/iOS 자료와 일치한다. APK 20,090,813bytes·SHA256 `052a849b085e3ccf6bf5785e4f015ae3af2bbba54c8fa043c5e56d77b99a8610`; 무서명 AAB 19,382,456bytes·SHA256 `5d97e6bac6aed6c15fcfc2919f9abaa21ee9818a5ea4af16228c5a4363ecb28f`. Downloads/skylog-release-0.1.0-beta.11-build16/ · [릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.11-build16). 다음 수동 CI 기본17.
- **범위**: 이번 UI 수정은 로컬 Android 빌드와 iOS 자료 동기화까지 검증했다. 새 iOS CI 컴파일·네이티브 계측은 실행하지 않았으며 이전 build15의 결과와 구분한다. 실제 폰 설치·센서·메일 왕복·iPhone 오프라인, 기존 Play 업로드 키 서명·Apple 서명/TestFlight·일반 회원 SMTP 및 스토어 심사는 남아 있다. 현재 전 기능 무료.
- **폰 확인**: 기존 앱 삭제 없이 APK 업데이트 후 beta.11 확인 → 오늘 밤 추천(토성·M31 등)·관측 계획·오늘의 볼거리 사진 확인 → 사진 탭으로 상세 출처/스크롤 확인 → 기존 기록과 계획 저장·야간 확인. iPhone은 기존 홈 화면 웹앱을 다시 연다.

## beta.10 / build15 — 사진 164개·간결한 미리보기·로그인 복구

- **구현**: 사진을 20개에서 164개 천체로 확대했다. 메시에110개 전체·추가 DSO43개·태양/달/행성9개·시리우스/베텔게우스2개를 포함한다. 선택/검색은 간결한 미리보기, 자세히와 앱 정보는 전체 출처·개별 이용 조건을 표시한다. 관측 필드 전체를 보존하는 편집 프레임/관측 패널 추출 좌표와 원본 해시를 메타데이터·XMP에 기록한다. 사진 328파일, 11,787,848bytes. [사진 기록](OBJECT-PHOTOS.md).
- **로그인**: 네이티브에서 보낸 메일은 정확히 등록한 앱 URI로 복귀한다. 웹/iPhone PWA의 별도 브라우저 복구, 요청 단계 보존·재전송·만료 안내, 격리된 원본 링크 확인을 지원한다. 서버의 Site URL·이메일 확인·RLS는 유지했고 앱 복귀 URI1개만 추가했다. 기본 SMTP이므로 숫자 인증번호 양식과 일반 가입 개통은 대기다. [로그인 기록](AUTH-LOGIN.md).
- **자동 검사**: typecheck/lint/data·단위580개·PostgreSQL/RLS46개·Chromium83개 통과. Windows WebKit의 iPhone 화면·야간 픽셀·사진 캐시·모킹 로그인 14단계 통과. 실제 메일 발송이나 물리 휴대폰 시험과 구분한다.
- **네이티브**: Android release/lint, API36에서 Wi-Fi/data 끄기 명령 뒤 WebView 계측2개(기존 내장 학습·cold/warm 로그인 복귀) 통과. iOS Xcode26 arm64 무서명 빌드와 내장 public/사진 전체 해시 대조 통과. APK 서명·16KB 정렬·앱ID·version15/min24/target36·release flags·기존 build14 인증서 일치를 검증했다. 로컬 public 479개가 APK/AAB/Android/iOS에 일치한다.
- **공개 배포**: 소스 `62df2eab0f5da518e445ca9a7d642afdfc6c595a` · [Pages 34320972447](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34320972447) · [모바일 34320977187](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34320977187) 성공. [APK](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.10-build15/skylog-0.1.0-beta.10-build15-local-test.apk)와 [웹앱](https://junhyoungpark-nobel.github.io/skylog/)을 공개하고 APK 재다운로드·사진 328파일 공개 해시·beta.10·전체 출처·Chromium의 미방문 M110 오프라인 재실행·JS예외0을 확인했다.
- **파일**: APK 20,090,813bytes, SHA256 `77921231e0e2f24d140a1715bb2f991d94b54317c43f944cdce0bbb991ca5fa0`. 무서명 AAB 19,382,425bytes, SHA256 `c72d866fb47662420235ace8b7200f9b91de70103966100a27bf665b5e5485c1`. 폴더: Downloads/skylog-release-0.1.0-beta.10-build15/. [사전 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.10-build15). 다음 수동 CI기본16.
- **남은 경계**: Play용 AAB의 집 PC 기존 업로드 키 서명, Apple 팀 서명/TestFlight, 실제 폰의 메일 앱 왕복·iPhone 오프라인·센서, 일반 가입용 SMTP/운영자 개통 및 정식 스토어 심사는 남아 있다. Windows WebKit은 온라인 캐시까지 확인했으며 실제 iPhone 오프라인 성공으로 표시하지 않는다. 현재 전 기능 무료, 향후 난이도2·3 퀴즈/망원경 코스의 유료 상품·두 사람 무료 권한은 별도 계획이다.

## beta.9 / build14 — 천체 사진·댓글 보완

- 사진20개·검색/선택/자세히·야간/오프라인과 개별 권리 기록은 [사진 출처](OBJECT-PHOTOS.md), 댓글 변경/서버 개통 경계는 [댓글 검토](COMMENTS-REVIEW.md)에 있다.
- [향후 학습 이용권 계획](MONETIZATION-PLAN.md): 난이도2·3과 망원경 코스의 미래 판매안. 현재 기능은 계속 무료이며 결제·가격·권한을 등록하지 않았다.
- **로컬 최종 검증**: 타입/lint·데이터·전체 단위541개와 이후 추가 API6개(총547개 고유 검사), PostgreSQL/RLS46개, Chromium75개 전체 통과. 사진 야간 픽셀 검사에서 둥근 모서리 밖 부모 표면을 제외했고 원래 색 토글이 기존 전역 이미지 필터에 걸리는 문제를 수정한 최종 소스를 검사했다. Android release/lint오류0·경고32, AAB/APK/native215개 에셋과 public191개 자료·사진40개/manifest 해시 일치. iOS 로컬 public과 실제 CI .app는 별도 검증한다.
- **로컬 산출물**: Downloads/skylog-release-0.1.0-beta.9-build14/. APK9,446,602bytes·SHA256 `a903017f9d6153f5245493b580561abcb487220b5b54e2c5ff9742663e5eb111`, beta.9/build14·min24/target36·release flags·16KB 정렬·기존 build13 인증서 일치. AAB9,129,298bytes·SHA256 `cc3d95769f1d2efd8e7b1130060ba7761f81494b57e1aa890abdee2ad61bcae5`는 무서명이며 집 PC의 기존 Play 업로드키로 서명해야 한다. 공개 배포/모바일 CI 검증을 완료했다.
- 공개 배포/모바일 CI 검증을 완료했다. 일반 가입·SMTP·실제 운영자·Play 업로드 서명·Apple 서명/TestFlight·실기기·스토어 심사는 별도다. 다음 CI기본15.

- **최종 배포**: 소스 `9f0047d084048d8f5831467771cead6835563a69`, [Pages34303341473](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34303341473)·[모바일34303357539](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34303357539) 전체 성공. 최종 Pages 단위547/547개·73/73파일 통과를 실제 작업 로그에서 확인했다. 공개 [beta.9/build14 APK](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.9-build14/skylog-0.1.0-beta.9-build14-local-test.apk)를 재다운로드해9,446,602bytes·SHA256 `a903017f9d6153f5245493b580561abcb487220b5b54e2c5ff9742663e5eb111` 일치를 확인했다. 웹 beta.9·사진40파일 공개 SHA·정보 화면20개 전체 크레딧/활성 링크·토성 상세·오프라인 재실행과 미방문 M42 사진·JS예외0 확인.
- **모바일 증거**: Android API36/x86_64에서 Wi-Fi/data 끄기 명령 후 debug WebView 계측1개·실패0/오류0/누락0, 12.792초. JUnit XML·HTML·소스 @Test 수를 대조했다. CI lint오류0/경고32. iOS Xcode26.3·iphoneos26.2·build14·arm64·최소16.4 무서명 컴파일과 plist/실행파일 검사. CI .app의 public191개와 사진40개/manifest도 소스와 SHA256 일치한다.
- **WebKit/실기기 경계**: Windows WebKit26.6/iPhone13 에뮬레이션에서 온라인·전체 출처·야간 픽셀·명시 원색·360px 영어125%·사진 캐시7단계 통과. 이후 오프라인 reload와 새 문서 열기는 브라우저 내부 오류로 실패했고 마지막 요약단계는 미실행이다. 캐시의 index/사진200과 온라인 복구·JS예외0을 확인해 도구 제어 제한 가능성으로 추정하지만 실제 iPhone 오프라인 성공으로 표시하지 않는다. [Playwright 서비스 워커 지원](https://playwright.dev/docs/service-workers)과 [브라우저 범위](https://playwright.dev/docs/browsers) 참조. 실제 iPhone의 비행기모드 홈 화면 재실행·사진/기존 기록·센서는 사용자 확인이 필요하다. APK 실폰 설치도 미확인이다.
- **출시 경계**: 개인 APK와 웹 배포/사진 권리 기록/댓글 회귀/미래 유료화 계획은 완료했다. Play용 AAB는 현재PC에 없는 기존 업로드키로 서명해야 하며 Apple 팀 서명/TestFlight·스토어 심사·일반 가입 SMTP/운영자 개통·실제 유료 상품/두 사람 무료 권한 발급은 대기다. 이번 버전은 계속 무료이며 실서비스에 테스트 댓글을 전송하지 않았다.

## beta.8 / build13 — 아바타 꾸미기·설치 APK

- 변경 범위와 폰 사용 방법: [아바타 확장](AVATAR-CUSTOMIZATION.md). 선택39개·업적 보상6·미리보기/적용/취소·코디3칸. 기존 모든 기능 무료, [별도 테마 팩 판매안](MONETIZATION-PLAN.md)은 미구현 제안이다.
- 기존 build9 개인 테스트 키로 APK를 서명하고 동일 인증서·높은 versionCode를 확인한다. 기존 앱을 삭제하지 않고 업데이트한다. 이 PC에서 새 Play키를 만들지 않는다. 최종 파일/해시/CI 증거는 아래에 있다.
- 공개 Supabase 설정 유지, SIGNUPS_READY/EMAIL_CODE=false. SMTP/실제 운영자/외부 이메일·실기기·정식 스토어 심사/Apple 서명/TestFlight는 별도다. iPhone은 [PWA](https://junhyoungpark-nobel.github.io/skylog/)를 이용한다. 다음 CI기본14.

- **최종 배포/수용**: 소스 `d478b9b9027f58e45c4e03e597f44b422460bcb2`, [Pages34292913299](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34292913299)·[모바일34292913317](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34292913317) 전체 성공. 로컬 타입/lint/데이터·단위528개, 브라우저66개 고유 시나리오와 공개 WebKit26.6/iPhone13 에뮬레이션8개 통과. 공개 beta.8·SW·오프라인 아바타/코디 재실행·JS오류0. 기능/자동검증/서명·배포/유료화 제안4항목 완료, 실제 폰 확인은 대기다. WebKit은 실제 iPhone 검증이 아니다.
- **산출물**: [v0.1.0-beta.8-build13](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.8-build13), Downloads/skylog-release-0.1.0-beta.8-build13/. APK8,115,552bytes·SHA256 `76974a1533c5019143b17036b30d60f8fb6d80d5db3a1aa951340163ea108980`. 공개 APK 재다운로드 일치. 기존 build9 인증서·version13/beta.8·min24/target36·release flags·16KB 정렬 검증. AAB/APK/native174개 에셋 일치, public150개는 Android/iOS 원본 해시 일치. 로컬 Android lint오류0/경고32.
- **서명/경계**: 로컬 AAB7,826,967bytes·SHA256 `07b972f25453ac7d7c60944fd47fc89b9d18412cc469d1fd8481808f295d06fe`는 무서명이다. 이 PC에 Play 업로드키/암호가 없어 새로 만들지 않았다. 집의 기존 업로드키로 서명해야 제출할 수 있다. Android 구 버전명이 남은 첫 산출물은 검증기가 차단해 별도 rejected-metadata 폴더에 보관하고 배포하지 않았다. Gradle이 package.json 버전을 읽고 CI가 일치를 검사하도록 수정한 뒤 새 APK/AAB를 검증했다. 이전 모바일 CI3622c24는 중단하고 최종 d478b9b만 릴리스했다.

- **플랫폼 증거**: 최종 Android API36/x86_64 에뮬레이터에서 Wi-Fi/data 끄기 명령 후 debug WebView 계측1개 통과(실패0·누락0, 11.892초). CI lint오류0/경고32. iOS Xcode26.3/iPhoneOS26.2에서 build13·arm64·최소16.4·무서명 컴파일 및 plist 확인. CI iOS .app의 public150개도 최종 소스와 SHA256이 모두 일치한다. 서명 APK 실폰 설치·센서 정확도나 실제 iPhone 시험을 뜻하지 않는다.

## beta.7 / build12 — 무료 마당·사진·댓글·개인 백업

- 소스 ba29935d741167236dba7d48192beb83708790bb, [v0.1.0-beta.7-build12](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.7-build12). [Pages](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34239766171)·[모바일 CI](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34239765822) 전체 성공. 다음 CI기본13.
- 단위504개·브라우저62개 고유 시나리오(기존59+신규3 재실행)·PostgreSQL 권한27개·실제 Supabase22개 통과. 공개 beta.7·실제 갤러리·SW·오프라인 마당/아바타·JS오류0. Android API36 인터넷 차단 계측1/1(실패/누락0), lint오류0/경고33. iOS Xcode26 arm64 무서명 컴파일/build12 확인.
- Play 업로드 키 서명 AAB7,882,043bytes, SHA256 `208b8f3db4e0b80bdf33af8f97ab6b9e6fbd40d7b8868f165cd10ebfb2585b5c`. jarsigner strict·bundletool validate·version12/min24/target36·debug=false/backup=false 확인. AAB/APK 웹 에셋 전체 일치, public150개 자료는 AAB/APK/iOS 모두 원본과 SHA256 일치.
- **업데이트 APK는 아직 서명 전**이다. unsigned APK8,042,881bytes, SHA256 `c62a4d61638b5ec42077bc2f5275b2329ae662e1c30d169fdd5fb3aa947cf175`. 원래 build9 개인 키가 이 PC에 없어 다른 키를 사용하지 않았다. 설치된 앱을 삭제하지 말고 같은 키가 있는 원래 PC에서 서명한다.
- `skylog-0.1.0-beta.7-build12-apk-update-kit.zip`7,591,135bytes, SHA256 `a311de87cf651a9d813b4eab25fab183dd521edcda15d26175ce6fa13e9546cf`. unsigned APK·공개 인증서·소스/해시·README·PowerShell7 서명 도구를 포함한다. 개인 키는 없다. 원래 서명 PC/JDK21/Android SDK36에서 `pwsh -File .\sign-update-package.ps1` 실행 후 설치 가능한 `skylog-build12-update.apk`가 만들어진다. ZIP 자체는 설치할 수 없다.
- 전달 폴더 `Downloads/skylog-release-0.1.0-beta.7-build12/`와 공개 릴리스에 AAB·서명 준비 ZIP·verification.json·SHA256SUMS.txt를 둔다. 실제 이메일 개통·운영자 지정·실기기 사진/백업·Play 심사·Apple 서명/TestFlight는 완료로 표시하지 않는다.

## beta.6 / build11 — 풍경 경계·APK 서명 준비 파일

- 소스 c0a81425a0a629b4149c5e220655375ef2ffd7ac, 태그 [v0.1.0-beta.6-build11](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.6-build11).
- [Pages](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34229758676) / [모바일CI](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34229758728) 성공. 단위501개/브라우저59개 전체 통과, Android API36 오프라인 계측1/1, lint오류0/경고33, iOS build11 컴파일 성공. public149개 자료의 AAB/APK/iOS 해시 일치. 공개 PWA beta.6·새 풍경·SW/오프라인·JS오류0.
- Play용 AAB는 기존 업로드 키로 서명했다. 7,798,090bytes, SHA256 b1619084e4585485eab97aaa2d89a45cd6dd8164a488c4c84057422448075767. bundletool/릴리스매니페스트(API36/min24/version11/debug=false/backup=false) 검증.
- **개인 업데이트 APK는 unsigned 상태**다. 이 PC에 기존 build9 개인 키가 없어 설치 가능한 같은 인증서 APK를 만들지 못했다. APK7,960,611bytes SHA2560365cb791b5b36c893eab72e65491053b68af1af4070f7a9461dbe2aabf49944.
- 사용자용 **apk-update-kit.zip**7,503,962bytes는 APK·공개 인증서·해시·PowerShell7 스크립트를 포함한다. 원래 서명 PC에서 `pwsh -File .\sign-update-package.ps1` 실행. 키/SDK/JDK가 있어야 하며 새 키를 자동 생성하지 않는다. SHA256/동일 인증서/16KB 정렬을 확인한 뒤 출력한다. DPAPI는 원래 Windows 사용자/PC에 묶여 있어 단순 복사를 복원으로 취급하지 않는다.
- 기대하는 개인 인증서 SHA256: 2dce38b758c9091f919465d32453b64e0835ff8b541bdeaa7c6f3231313fc110. CI가 공개 build9 APK해시/서명을 확인하고 추출했다. 키 누락·변조 입력·인증서 메타 누락 시 중단 검증. 성공한 서명 APK를 설치한 실기기 결과는 아직 없다.
- 풍경의 실제 해상도/생성 프롬프트/픽셀 합성 검사는 [풍경 개선](LANDSCAPE-REFINEMENT.md), 후속 계획은 [꾸미기·소통](COMMUNITY-AND-CUSTOMIZATION.md). 다음 CI기본12. 계정/결제/커뮤니티는 아직 미구현, iPhone 서명 IPA/TestFlight/스토어 심사도 별도다.

## beta.5 / build10 — 오늘 밤·코스·풍경

- 소스: 15e7163f1d91683205810ec6d7072e5944498812. build9 최신 main과 첨부 APK의 해시를 대조한 뒤 작업했다.
- [Pages CI](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34218281779), [모바일 CI](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34218281063). Pages 성공(단위501개 포함). 공개 beta.5·SW·오프라인 재실행·실제 날씨 HTTP200·JS 오류0 확인. Android release/lint/AAB와 API36 인터넷 차단 WebView 계측1/1(실패/누락0)이 성공했다. lint오류0/경고33. iOS build10 arm64 컴파일/내장 풍경 SHA256 일치.
- 변경/생성 에셋/폰 체크리스트: [개선 기록](TONIGHT-REFRESH.md). 패키지 버전 beta.5, 이번 공유 빌드번호10, 다음 수동 CI기본11. 기기·저장소·학습 팩 버전은 보존한다.
- 이 PC에는 기존 skylog-signing Play 업로드 키가 있다. 새 키를 생성하지 않고 AAB에 서명·jarsigner strict 검증을 마쳤다. 이 키는 개인 APK 테스트 키와 별개다. build9 개인 APK 키가 이 PC에 없어 새 테스트 키로 대체하거나 호환되지 않는 APK를 만들지 않는다.
- AAB는 Play 내부 테스트/제출용이며 파일을 휴대폰에서 직접 열어 설치할 수 없다. 새 UI는 공개 PWA로 바로 확인할 수 있다. 기존 개인 APK 업데이트는 같은 테스트 키가 있는 PC에서 만든 설치 파일이 필요하다. Apple 서명 IPA/TestFlight·실기기와 심사는 남는다.

- **서명 AAB**: Downloads/skylog-release-0.1.0-beta.5-build10/skylog-0.1.0-beta.5-build10.aab, 7,320,318 bytes, SHA256 `0ad818cd75da75f0c841f60cbefed640c333cfd3b51a1446b0f572428c66aedf`. bundletool validate·앱ID/version10·API36/min24·debug=false/backup=false 확인. 원본 public 자료149개 모두 AAB와 SHA256 일치(웹/iOS 풍경도 일치). CI unsigned SHA256은 `7ea333fa7984cad40f135603cc7d773831573f664267e006db5dca3f6a10df91`다.
- **자동/시각 검증**: 타입/lint·데이터 검증·단위501개·브라우저58개 고유 시나리오(전체+관련 재검사). 360px/영어125% 글자·야간·풍경의 점진적 감쇠와 실제 웹을 확인했다. 결과는 artifacts/qa-build10, 실패 뒤 수정 내용은 TESTING/STATUS에 구분했다. 이전의 전체 format:check 생성파일 문제와 큰 JS 청크 경고는 그대로 별도 후속이다.

- **공개 산출물**: [beta.5/build10 사전 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.5-build10), 태그는 앱 소스15e7163. 공개 AAB를 다시 다운로드해 크기/해시 일치를 확인했다. 로컬 안내·SHA256SUMS와 폰 확인 사항을 함께 제공한다. 스토어 제출/심사는 수행하지 않았다.

## 2026-09-08 beta.4 / build9: 하늘 표현·두 시야원·업적·센서 움직임

> **APK/AAB 생성·웹 배포 검증 완료.** 실제 기기 확인과 스토어 서명/출시는 별도다.

- **하늘 기본값**: 별자리 경계 끄기, 은하수 밝기 33%, 지면 투명도 0%(불투명), 별 채도 100%. 별은 기존보다 1.2배 크게 표시한다. 은하수의 밝은 띠와 어두운 먼지 결·색 대비를 조정했으며 밤 테마의 적색 은하수와 D-036의 흰 별자리 선은 유지한다. 실제 천문 좌표/별 개수는 변경하지 않는다.
- **지면·태양·달**: 겹치는 지면 토글 대신 투명도 슬라이더 하나와 하늘 기본값 복원을 제공한다. 지평선 아래 표시·선택이 같은 설정을 따른다. 태양·달은 최소 지름 24 CSS px로 알아보기 쉽게 표시하되 실제 각지름과 화면상 표시 크기를 구분한다. FOV 변경 후 선택 반경도 함께 갱신한다.
- **두 장비 시야원**: 쌍안경·망원경을 각각 켜고 끄며 파인더 세 번째 기본 원은 제거한다. 시작 예시는 8×42 쌍안경 7.50°, SV48P 102mm/663mm와 25mm·AFOV 52° 접안 조합 약 1.96°다. 예시 배지·사양 편집을 제공하며 실제 솔로몬 HQ 제품 시야 또는 보유 접안렌즈로 단정하지 않는다. 기존 커스텀/DB 저장 장비는 보존한다.
- **48개 업적**: 기존 배지 18개 ID/규칙을 보존하고 새 업적30개를 더한 `learn/v2` 팩을 게시한다. 코스·미션·퀴즈는 v1이며 기존 관측/학습 진도·백업과 호환한다. 단계·진행도·다음 업적 안내를 추가한다.
- **움직임·저장 부하**: 센서 목표 사이를 렌더 프레임에서 최대50ms로 보간한다. 첫 입력/긴 공백/중단은 초기화하고 상대 yaw·정밀 정렬 무효화·수동 드래그·수평 유지 규칙은 유지한다. React 알림과 동일 설정의 Dexie 반복 쓰기를 줄이며 저장 순서·실패 재시도·복원은 보존한다.
- **검증 범위**: 합성 입력에서 프레임 각속도 RMS 오차가 기존 즉시 교체의 절반 미만, 평균 추가 지연25ms 미만, 기존 필터 포함90° 스텝150ms 이내다. 이는 물리 Android/iPhone의 FPS·센서 정확도 측정 결과가 아니다. 실제 기기에서는 같은 시야/레이어로 정지→일정 회전→정지를 기록해 frame time p50/p95, 33ms 초과 비율, Long Task/IndexedDB 작업, 센서 Hz와 정착 시간을 비교한다.

| build9 확인 항목  | 결과                                                                                                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 앱 소스·태그      | `377a665c0118b05f91192f231caba360a26e4388` · [v0.1.0-beta.4-build9](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.4-build9)                                                                                     |
| 자동 검사         | 단위493·브라우저54·typecheck/lint/data/PWA/native 통과                                                                                                                                                                                   |
| 개인 APK          | [다운로드](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.4-build9/skylog-0.1.0-beta.4-build9-local-test.apk) · 7,213,385 bytes · SHA256 `efdfca31d55dfeb707d7d914b1a404bb14cb8d543b52f6f3549d4a4db75e761f` |
| unsigned AAB      | `skylog-0.1.0-beta.4-build9-unsigned.aab` · 6,922,904 bytes · SHA256 `80b8b0d4c8cbeede255957033b000d8fef5be0628f4d03e43277118b5367b7c5`                                                                                                  |
| 번들·서명         | bundletool/메타데이터·서명·정렬·이전build8 인증서 일치. 162개 내장파일 SHA256 일치                                                                                                                                                       |
| 로컬 Android lint | 오류0/경고33                                                                                                                                                                                                                             |
| PWA               | [Pages 34203144579](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34203144579) 성공 · 공개beta.4·SW·재실행·새 기본값·업적48·JS 오류0                                                                                        |
| 모바일 CI         | [34203144730](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34203144730) 성공 · API36 오프라인WebView·iOS Xcode26 arm64 무서명                                                                                              |
| 스토어·실기기     | Play 키/최종 서명, Apple 팀/서명/TestFlight, 실제 Android/iPhone·심사 대기                                                                                                                                                               |

typecheck·lint·데이터 검증·PWA/native 빌드 통과. 단위 493개, 브라우저 고유 시나리오 54개 통과(workers=1). 전체 실행 후 지면·달 픽셀 측정을 보완하고 달 가림 수정 관련 검사를 재실행했다. 변경 파일 Prettier·diff 검사 통과. 전체 format:check는 기존 Android 생성 lint HTML/생성 assets 문제로 실패했으며 앱 검증과 구분한다.

[Pages 34203144579](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34203144579)와 [모바일 34203144730](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34203144730) 전체 성공. Android API36 인터넷 차단 WebView 계측과 iOS Xcode26 arm64 무서명 컴파일 통과. 공개 웹 beta.4·새 기본값·업적48·원형 하늘·SW·재실행·JS 오류0 확인. 공개 APK를 다시 다운로드해 크기/해시 일치 확인. 실제 휴대폰 센서/FPS·iPhone 설치용 서명 IPA를 검증한 것은 아니다.

전달 폴더는 `Downloads/skylog-release-0.1.0-beta.4-build9/`다. [휴대폰 설치 안내](INSTALL-ON-PHONE.md)를 따른다. 현재 전 기능 무료이며 결제·계정·두 사람의 무료 이용권은 아직 구현하지 않았다.

## 이전 beta.3 / build8: 자동 위치·센서·흰 별자리·작은 반투명 UI

> **당시 상태: build8 개인 APK 다운로드·unsigned AAB 검증·beta.3 PWA 배포 완료.** 소스 커밋 `e17373169c2475183f424be81031fb28f7fc939c`를 main에 반영했다. typecheck·lint·데이터 검증, 단위 433개와 브라우저 고유 시나리오 48개가 통과했다. 로컬 Android release/lint와 새 모바일 CI 전체가 성공했다. CI에서 Android release/lint·API36 오프라인 실제 WebView 계측과 iOS Xcode26 arm64 무서명 컴파일을 통과했다. Play 최종 업로드 서명·Apple 팀 서명/TestFlight·실기기·스토어 공개 출시는 남아 있다.

브라우저 수치는 전체 47개 실행 뒤 픽셀 테스트의 화면 복귀 수정에 따른 20개 재검과 마지막 UI 변경의 14개 재검을 포함한 **고유 시나리오 48개**다. 같은 테스트를 여러 번 실행한 횟수를 더한 수치가 아니며, Android/iPhone 실기기 검증을 의미하지 않는다.

- **자동 GPS**: 첫 실행과 앱 복귀 때 현재 위치를 한 번 요청한다. 자동 사용이 기본이고 최초 OS/브라우저 권한 요청이 필요할 수 있다. 권한 거부 이력을 기억해 자동 재요청을 막으며, 명시적 위치 버튼으로 재시도한다. 자동 사용을 끄거나 저장 관측지를 선택하면 그 선택을 유지하고 늦은 GPS 응답이 덮어쓰지 않게 했다. 이전에 직접 지정한 기본 관측지도 보존한다. 백그라운드 위치 추적을 추가하지 않았다.
- **자동 방향 센서**: 하늘 화면에 들어오면 자동 연결을 시도한다. iPhone 최초 권한은 사용자가 센서 버튼을 눌러 허용하며, 승인 뒤 재진입/복귀 때 연결을 다시 확인한다. 사용자가 직접 끈 선택은 다음 실행에도 유지한다. 나침반 방향이 아직 없으면 화면을 잘못 돌리지 않고 필요한 안내를 표시한다. 공유 차트와 원형 하늘의 명시적인 수동 탐색도 유지한다.
- **별자리·은하수**: 연결선과 경계선을 더 선명한 흰색으로 표시한다. 이 두 선은 야간 모드에서도 흰색이며 다른 야간 레이어는 적색을 유지한다. 은하수의 밝기 감쇠를 바로잡고 청보라·청록·밝은 먼지 결을 보강했다. 대기 효과가 켜지면 태양 고도에 따라 흐려지고, 끈 지도 보기에서는 낮에도 표시한다. 원형 180° 반구 보기와 선택적인 정밀 별 정렬은 유지한다.
- **작은 반투명 UI**: 상단 중복 시각/센서 표시를 정리하고 하늘의 시간 제어를 기본 접힘 상태로 바꿨다. 시간 이동 중 표시와 지금 복귀는 접어도 남는다. 하단 5개 탭과 상태 캡슐은 작은 반투명 표면을 사용하고 글자 확대에 맞춰 높이·콘텐츠 여백을 함께 늘린다. 주요 터치 영역은 최소 44px을 유지한다. 원형 하늘·별길·실제 하늘 설정은 하늘 설정 패널로 모았다. 목표 pill은 센서 도움말의 실제 아래 끝을 따라 배치한다.
- **설치 경로와 iPhone 갱신**: [휴대폰 설치 안내](INSTALL-ON-PHONE.md)에 build8 APK 직접 링크와 새 조작을 정리했다. 기존 PWA 주소에 beta.3를 배포했으므로 Safari/홈 화면 앱을 인터넷에 연결해 다시 열고 설정 버전을 확인한다. 업데이트를 위해 웹사이트 데이터나 기존 앱을 먼저 삭제하지 않는다. build8과 build7 개인 APK의 인증서를 직접 대조해 일치를 확인했으며 build5~7의 같은 개인 키를 사용한다.
- **과금 상태**: 전 기능 무료이며 결제 기능·상품 등록·로그인·무료 이용권 발급은 아직 없다. 공개 유료 플랜과 두 사람 무료 이용 설계는 [유료화 계획](MONETIZATION-PLAN.md)에 있다. 기존 Play 업로드 키·Apple 팀·실기기·심사·상업용 날씨 이용 조건은 계속 별도 출시 항목이다.

| build8 확인 항목   | 현재 기록                                                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 소스 커밋·단위/e2e | `e17373169c2475183f424be81031fb28f7fc939c` main 반영, typecheck/lint/data·단위 433개·브라우저 고유 48개 통과                                                                                                                                              |
| PC 전달 폴더       | `Downloads/skylog-release-0.1.0-beta.3-build8/` 생성 완료                                                                                                                                                                                                 |
| 개인 APK           | [skylog-0.1.0-beta.3-build8-local-test.apk](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.3-build8/skylog-0.1.0-beta.3-build8-local-test.apk), 7,200,927 bytes, 서명·정렬·build7 인증서 일치·공개 다운로드 크기/SHA256 확인 |
| unsigned AAB       | `skylog-0.1.0-beta.3-build8-unsigned.aab`, 6,913,704 bytes, bundletool·API36/min24/versionCode8/backup=false·내장 자료 검증 완료. Play 최종 업로드 서명 대기                                                                                              |
| 로컬 Android       | release/lint 성공, lint 오류 0 / 경고 33. AAB·APK·native public 160개 자료의 SHA256 일치                                                                                                                                                                  |
| PWA 배포           | [Pages 34195531010](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34195531010) 성공. 공개 beta.3·SW·작은 UI·원형 하늘·새로고침 확인, 자동 브라우저 검사 JS 오류 0                                                                            |
| 모바일 CI          | [34195530826](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34195530826): 전체 성공 — Android release/lint·API36 오프라인 실제 WebView 계측, iOS Xcode26 arm64 무서명 컴파일 통과                                                            |
| 스토어·실기기      | Play 최종 서명/내부 테스트, Apple 서명 Archive/TestFlight, Android/iPhone 실기기와 심사 대기                                                                                                                                                              |

- APK SHA256: `8adb1e44357b3631849ce6f604e9acf7395227d39a71da8dfba5fa6089ff450f`. 공개 릴리스의 APK를 실제 다시 다운로드한 크기·해시도 일치한다.
- unsigned AAB SHA256: `d92406690d512d9e01bc4e8c94cc1615af88cc465ec7b00f40025c4e3be88698`.
- [build8 공개 체험 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.3-build8)는 직접 설치 APK 전달용이다. 이 게시와 무서명 iOS 컴파일을 Play/App Store 출시 또는 TestFlight 배포로 간주하지 않는다.

## 이전 beta.2 / build7 기록: 자동 안내·밤하늘·원형 전체 보기

> **당시 상태: beta.2 PWA 배포·개인 APK 게시·unsigned AAB 검증 완료.** 앱 소스 커밋은 `dad1c57d707e51b1159834485a44109eb36391ef`다. 아래 build6의 “인증 없음”은 당시 기록이며 현재 인증 상태가 아니다. 스토어 공개 출시는 아직 수행하지 않았다.

- 별길의 기본 시작은 **자동 나침반 방향**이다. 다른 별을 먼저 맞추지 않고 센서를 켜서 대략 방향을 찾는다. 정밀 망원경 안내가 필요할 때만 “별로 더 정밀하게 맞추기 · 선택”으로 상대 센서의 별 정렬에 들어간다. 나침반을 사용할 수 없거나 방향이 준비되지 않았으면 현재 상태와 목표 주변 미리보기를 보여주며, 정밀 보정 완료처럼 표시하지 않는다.
- 찾아가는 동안 `GuideSky`가 하늘 탭과 같은 천구 렌더러로 목표·주변 별·별자리 선을 보여준다. 유효한 방향이 있으면 **물리 폰 윗변 +Y**를 따라가고, 없으면 목표 주변을 미리 보여준다. 자동 나침반의 근사 방향과 별 보정 방향을 구분한다. 카메라 별무늬 자동 인식이나 망원경 모터 제어를 추가한 것은 아니다.
- 별과 별자리 선의 대비를 높이고 은하수에 차분한 색과 먼지 결을 더했다. 줌아웃하면 시선 쪽 반구를 원형으로 볼 수 있다. 화면 표시는 **원형 하늘 · 180°**이며, 원 둘레 여백을 만드는 추가 축소를 실제 가시 각지름 220°로 안내하지 않는다. 뒤쪽 반구는 방향을 돌려 탐색한다.
- iPhone용 [공개 웹앱](https://junhyoungpark-nobel.github.io/skylog/)에 build6의 상세 창 스와이프와 이번 beta.2 기능을 함께 배포했다. [Pages run 34191154332](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34191154332) 성공. 공개 사이트의 버전·원형 하늘·SW·새로고침과 JS 오류0 확인(Chromium 모바일 자동 검사, 실제 iPhone은 사용자 확인 필요). iPhone에서는 인터넷에 연결한 상태로 기존 웹앱을 다시 열고 설정의 `0.1.0-beta.2`를 확인한다. 이전 버전이면 앱을 완전히 닫았다 다시 열거나 Safari에서 새로고침한다. 업데이트를 위해 홈 화면 앱이나 Safari 웹사이트 데이터를 먼저 삭제하지 않는다.
- build7 전달 폴더: 현재 PC Downloads의 `skylog-release-0.1.0-beta.2-build7/`. [개인 APK 다운로드](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.2-build7/skylog-0.1.0-beta.2-build7-local-test.apk), 7,196,831 bytes, SHA256 `ff2f07b6154b85499c388c1b9a4a84076751fab32b4351a16d74dcb38bb1e143`. 공개 링크에서 다시 받은 파일도 같은 해시다. build6 APK와 같은 서명 인증서, v2/v3 서명·zipalign 통과. 기존 앱 위에 업데이트한다.
- `skylog-0.1.0-beta.2-build7-unsigned.aab`, 6,909,192 bytes, SHA256 `d979ba6b8b89ac5253a149e53fa6a7ec8134e0ccd1c688d2133483ebc492f7c9`. bundletool·manifest/versionCode7/API36/min24/release/backup=false 확인. AAB·APK·현재 native public의 **160개 파일 SHA256 일치**, .so 없음. Play 최종 업로드 서명은 기존 키 복원 후 수행한다.
- typecheck/ESLint/단위391/브라우저43/데이터/PWA 및 native sync 통과. 최종 브라우저는 `--workers=1`로 GPU 소프트웨어 렌더 병렬 부하와 기능 실패를 구분했다. Android release/lint 성공(오류0/경고33). 새로운 장면·야간·원형·선택·본문 스와이프·센서 모의 검증은 완료, Android/iPhone 실제 설치·센서 물리 정확도·성능은 미검증이다.
- 새 [모바일 CI 34191154190](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34191154190) **전체 성공**: Android release/lint·인터넷을 끈 API36 실제 WebView 계측, iOS Xcode26 arm64 무서명 컴파일. Play 업로드 키 복원/최종 AAB 서명, Apple 팀의 서명 Archive/TestFlight, Android·iPhone 실기기 확인과 스토어 심사는 계속 별도 단계다.
- 유료 출시안은 [유료화·두 사람 무료 이용 계획](MONETIZATION-PLAN.md)을 따른다. 무료 기본+Pro 1회 구매와 두 사람의 무료 이용권은 **제안/설계**이며 아직 결제·로그인·상품 등록·무료 코드 발급을 실행하지 않았다. 현재 무료·인앱 구매 없음 선언은 실제 구현과 일치한다. 유료 출시 전 Open-Meteo 상업 이용 조건도 해결해야 한다.

이전 build6 상세 창 스와이프 기록은 [보관 보고](../plan/reports/2026-09-08-build6.md)에 있다.

## 이전 build5 후속 점검 기록

- 원격 main 최신 `dce4a7d`는 `108e99a` 이후 서명 스크립트·문서 변경만 포함한다. Android 앱 기능 소스는 build4와 동일하다.
- build4 원본/키는 이전 PC `C:\Users\JunhyoungPark\...`의 기록이다. 현재 PC `C:\Users\박준형\...`에는 해당 AAB와 업로드 키가 없다. 이전 빌드의 서명 완료를 이번 PC의 서명 완료로 간주하지 않는다.
- iOS SceneDelegate가 기본 컨트롤러를 생성하여 자체 센서 등록을 생략하던 문제를 수정했다. 위치 플러그인 필수 목적 문자열을 보완하고, Tailwind 4의 Safari 지원 범위에 맞춰 앱 최소 iOS를 16.4로 올렸다. **이번 Swift 변경은 Windows에서 컴파일/실행하지 못했으며 새 Mac CI·실기기 검증이 필요하다.**
- CI는 이제 필수 `version_code` 입력을 검증해 Android/iOS에 함께 적용한다. local build5 다음 기본값은 6이다. 이후에는 Console에 사용한 최대 번호보다 크게 입력한다. workflow 실행 횟수와 빌드 번호는 독립적이다.
- 직접 설치 방법과 스토어 전환 시 백업은 [휴대폰 설치 안내](INSTALL-ON-PHONE.md)를 따른다. 개인 체험용 APK 서명 키는 Play 업로드 키와 별도다.
- 새 전달 폴더는 현재 PC Downloads의 `skylog-release-0.1.0-beta.1-build5/`. `skylog-0.1.0-beta.1-build5-local-test.apk`는 개인 체험 서명 완료(7,192,735 bytes, SHA256 `880ab41f9cc2c0ac7404fc5d5b96896b8b1c1c3a95d0054c3fb1850e95cc603e`). `skylog-0.1.0-beta.1-build5-unsigned.aab`는 빌드·구조 검증 완료이나 **업로드 서명 대기**(6,903,462 bytes, SHA256 `7f37e7bedd7be09365ecdd9a05b94694ec8ab57018211247a5a47cbdc9df2fa3`). versionCode5/API36/min24, APK v2/v3·zipalign·bundletool 통과, AAB/APK 자료158개 해시 일치. 개인 키/암호는 전달물에 없다.
- 이번 typecheck/ESLint/단위366/브라우저35/data/build 통과, Android lint 오류0/경고33. Android 실제 설치/센서 및 새 iOS 실행은 미완료. 계정 등록·정책·실기기·스토어 심사와 AAB 서명은 별도 단계다.

## 빌드·산출물

- Node 22.12 이상, pnpm은 packageManager 지정 12.3.4. Capacitor 8.5.1, Android compile/target SDK 36, min SDK 24, Java 21. iOS 16.4 이상, Xcode 26 이상.
- `pnpm mobile:sync`: 네이티브 전용 `base=/`로 웹을 빌드하고 Android/iOS에 복사한다. PWA는 기존 `/skylog/` 및 SW를 유지한다. 네이티브 앱은 SW를 등록하지 않으며 깊은 별·콘텐츠·학습 팩을 전부 포함한다.
- GitHub Actions **Build mobile bundles** 수동 실행: release AAB 및 Android lint, 인터넷을 끈 Android 36 에뮬레이터 테스트, iOS arm64 무서명 빌드. CI는 서명 비밀을 다루지 않는다. `skylog-android-aab-unsigned`는 서명 전 산출물이다.
- Play 배포 산출물은 **AAB**다. AAB는 직접 설치할 수 없으며 Play 내부 테스트에서 기기별 앱을 받는다. CI가 만드는 내부 테스트용 APK는 계측 실행용이고 사용자 배포 산출물이 아니다.
- 서명은 Windows **PowerShell 7 이상**에서 `pwsh -File scripts/sign-aab.ps1 -Bundle <unsigned.aab> -Output <new-signed.aab>`로 수행한다. JDK 21+의 JAVA_HOME을 지정하거나 이번 PC의 `%LOCALAPPDATA%/skylog-tools/jdk-*`를 쓴다. 기존 키가 없으면 중단한다. 최초 등록임을 확인했거나 업로드 키 교체 절차를 승인받은 경우에만 `-CreateNewKey`로 생성한다. 이후에는 항상 같은 키를 재사용한다.
- 직접 설치용 release APK는 `:app:assembleRelease` 후 `scripts/sign-apk.ps1 -Apk <unsigned.apk> -Output <signed.apk>`로 정렬·서명·검증한다. 기존 업로드 키를 복원하기 전 개인 체험용으로는 `scripts/sign-test-apk.ps1`을 쓰며 키는 `%LOCALAPPDATA%/skylog-local-test-signing/`에 따로 둔다.
- 키는 `%LOCALAPPDATA%/skylog-signing/skylog-upload.p12`, 암호는 같은 폴더의 `password.dpapi.xml`에 현재 Windows 사용자용 DPAPI로 보관한다. **저장소·공개 산출물에 키나 암호를 넣지 않는다.** 인증서 `upload-certificate.pem`은 공개용이다. 서명 스크립트는 기존 출력/불완전한 키를 덮어쓰지 않는다.
- 키 폴더를 별도 안전한 저장소에 백업해야 한다. DPAPI 암호 파일은 다른 PC에서 직접 복호화되지 않는다. 원래 Windows 계정에서 암호를 복원해 개인 암호 관리자에 보관한 뒤 이동한다. 키·암호를 채팅/이슈에 붙여 넣지 않는다. 후속 빌드도 같은 업로드 키와 더 큰 versionCode를 사용한다.
- iOS `skylog-ios-unsigned-build`는 컴파일 확인용 `.app`이며 iPhone에 배포할 IPA가 아니다. Apple Developer 팀, Bundle ID 등록, 배포 인증서/프로비저닝을 갖춘 Mac에서 Archive → Validate → Distribute → TestFlight가 필요하다.

## 이전 build4 전달 기록 (2026-09-08 · 다른 PC)

- 최종 전달본: `skylog-0.1.0-beta.1-build4.aab`, versionCode 4, 6,964,176 bytes. 앱 소스 커밋 `108e99ab2fce10934a38e4d131c9b7af11f6e0b5`. Downloads 폴더에 있으며 이전 build3 대신 이 파일을 사용한다.
- SHA256: `80bc82531b4f39149b2825400e109bdec7347a99d25320c86588de05a27d7229`.
- [모바일 CI](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34174587920): Android release/lint/오프라인 API36 계측 및 iOS Xcode26 arm64 무서명 컴파일 성공. `jarsigner -verify -strict`(자체 업로드 키 신뢰)와 `bundletool 1.18.3 validate` 성공. 앱 서명용 자체 인증서는 공인 TLS 인증서와 용도가 다르다.
- [웹 CI/배포](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34174588139): 타입/린트/단위366/데이터 검증/빌드 통과. 브라우저 전체34 이후 최종 망원경 회귀4를 별도 통과했다(새 쌍안경 전환 사례 포함).
- 같은 Downloads의 `skylog-release-0.1.0-beta.1-build4/`에 스토어 초안·아이콘/피처 이미지·공개 인증서·manifest·release-info.json을 둔다. **개인 키/암호는 포함하지 않는다.**
- 빌드와 출시 준비를 완료한 상태이며 Play 등록/내부 테스트 배포, iOS 서명/TestFlight, 실기기 검증과 정식 스토어 심사는 아직 수행하지 않았다.
- Android lint는 오류 0, 경고 33이다. Capacitor 템플릿의 리소스/manifest 순서, 아이콘·스플래시 밀도/중복/단색 아이콘, 의존성 업데이트 제안, 구형 Android 백업 설정 관련 경고다. 현재 `allowBackup=false`로 자동 백업은 끈 상태다. 경고를 숨기지 않았으며 스토어 실기기 캡처와 함께 T8에서 정리한다.

## 앱 기능과 데이터

- 별길은 자동 나침반 안내와 선택적인 정밀 별 정렬을 구분한다. 기본 자동 안내는 나침반이 있는 절대 방향을 사용하며 **물리 폰 윗변 +Y**가 향하는 하늘을 보여준다. 하늘 AR은 카메라 −Z다. 화면 회전을 별길에 이중 적용하지 않는다.
- **정밀 별 정렬을 선택한 상대 모드에서만** Android SensorManager 상대 회전 벡터 / iOS Core Motion 상대 자세 → 기기 ENU quaternion → 기존 씬 변환을 사용하고, 매 센서 세션에 새 별 정렬을 요구한다. 백그라운드·센서 중단 뒤에는 그 정밀 정렬을 다시 한다. 이 상대 모드를 자력계로 조용히 대체하지 않는다. 자동 모드는 별 정렬을 필수로 요구하지 않으며, 복귀 후 방향 준비 상태를 다시 확인한다.
- 자동 나침반은 주변 금속·기기 상태의 영향을 받는 근사 안내다. 카메라 plate solving·망원경 모터 제어는 없다. Android/iOS 실기기의 폰 윗변 축·자북/진북·권한·자동 방향과 정밀 정렬 후 10분 드리프트를 각각 확인한다.
- Geolocation은 자동 위치가 켜져 있을 때 앱 실행/복귀의 단발 갱신과 명시적 현재 위치 버튼에서 사용한다. 최초 권한을 요청할 수 있고 거부·자동 끄기·수동 관측지 선택을 존중한다. 방향 센서는 하늘 화면 자동 연결과 별길 가이드에서 사용하며 iPhone 최초 승인은 버튼 탭이 필요하다. 사진은 시스템 선택/촬영 경로, 백업은 앱 캐시→OS 공유 시트. 기기 전체 파일 접근·백그라운드 위치·광고 ID·추적 권한은 요구하지 않는다.
- PWA의 IndexedDB와 앱의 IndexedDB는 별개다. 기존 자료는 PWA JSON 내보내기→앱 가져오기→기록 수/사진/학습 진도 대조로 옮긴다. 확인 전 원본을 삭제하지 않는다. 네이티브 DB 스키마는 기존 v2다.
- Android 자동 백업을 끄고 수동 JSON 백업을 사용한다. iOS 기기 백업 설정은 별도다. 공유 대상이 늦게 파일을 읽을 수 있어 공유 직후 임시 파일을 지우지 않는다.
- 개인정보 안내: https://junhyoungpark-nobel.github.io/skylog/privacy.html
- 지원: https://junhyoungpark-nobel.github.io/skylog/support.html

## Google Play Console 제출 순서

1. 본인 개발자 계정 등록/인증, 앱 ID 확정 후 새 앱 생성. 기본 언어 한국어, 영어 번역 추가. 카테고리 교육. 무료·광고 없음·인앱 구매 없음이 현재 구현에 맞는 기본값이다.
2. Play App Signing을 사용하고 이번 업로드 인증서로 서명한 AAB를 **내부 테스트** 트랙에 업로드한다. 패키지 ID·versionCode·targetSdk·서명 인증서를 확인한다. 계정 등록/요금 결제는 자동 수행하지 않는다.
3. 개인정보 URL, 연락처, 콘텐츠 등급·대상 연령·앱 액세스(로그인 없음)·광고 선언·Data safety를 채운다. 실제 개발자 연락 이메일은 계정 소유자가 입력해야 하며 임의로 만들지 않는다. `STORE-LISTING.md`는 제출 초안이다.
4. 내부 테스트 링크로 사용자 기기에 설치하고 아래 체크리스트를 완료한다. Play 사전 출시 보고서의 크래시·접근성·권한 문제를 수정한다.
5. 해당되는 신규 개인 계정은 12명 이상이 연속 14일 참여하는 비공개 테스트 및 프로덕션 액세스 신청이 필요하다. 계정별 Console 안내를 확인한다.
6. 실제 모바일 스크린샷/아이콘/피처 그래픽을 최종 등록하고 배포 국가, 등급, 정책 선언을 검토한 후 출시한다. 브라우저 캡처를 실기기 검증 완료의 증거로 표시하지 않는다.

## App Store Connect 제출 순서

1. Apple Developer 계정/팀, Bundle ID 등록. Xcode의 Signing & Capabilities에서 팀을 지정한다.
2. 이름·설명·개인정보·지원 URL·스크린샷·연락처·새 연령 등급 문항을 입력한다. 현재 로그인/계정 삭제/결제 기능은 없다.
3. `PrivacyInfo.xcprivacy`는 Filesystem의 FileTimestamp 이유 C617.1 및 날씨 좌표 전송(추적/사용자 연결 없음)을 명시한다. 플러그인 privacy manifest까지 Xcode archive privacy report에서 최종 대조한다. 정밀 위치를 날씨에 전달하므로 “아무 정보도 외부에 전달하지 않음”으로 선언하지 않는다.
4. 표준 HTTPS 외 자체 암호 구현이 없는 현재 빌드의 수출 규정 답변을 소유자가 확인한다. `ITSAppUsesNonExemptEncryption=false`는 현재 구현 기준이다.
5. Xcode 26+/iOS 26+ SDK로 서명 Archive·Validate·TestFlight 업로드. iPhone/iPad에서 센서, 안전 영역, 사진, 백업, 오프라인 동작을 확인한 후 심사 제출한다.

## 실기기 체크리스트

- [ ] AAB를 Play 내부 테스트로 배포하고 설치·재실행, 한국어/English, 큰 글꼴/가로 화면, Android 뒤로 버튼.
- [ ] 첫 실행을 오프라인으로 해도 하늘·깊은 별·6개 스타호핑 코스·이야기·퀴즈가 열린다.
- [ ] 자동 GPS 최초 허용/거부/대략 위치와 앱 복귀 시 갱신. 거부 뒤 반복 요청 없음, 자동 끄기·수동 관측지 선택·이전 기본 관측지와 재실행 후 선택 보존. 늦게 도착한 GPS가 선택한 관측지를 덮지 않는다.
- [ ] 하늘 진입·복귀 시 센서 자동 연결, iPhone 최초 권한 버튼, 직접 끄기 선택의 재실행 후 유지. 나침반 방향이 준비되기 전 잘못된 방향으로 화면이 회전하지 않는다.
- [ ] 좁은 화면·200% 글자·안전 영역에서 작은 반투명 탭/시간 조절/상태 바와 콘텐츠 여백이 맞는다. 센서 도움말이 펼쳐져도 목표 이름·시간 이동·해제를 누를 수 있다.
- [ ] 하늘 설정의 원형 하늘·별길·실제 하늘처럼, 접힌 시간 바의 펼치기·날짜·배속·시간 이동 중/지금 복귀를 확인한다.
- [ ] 흰 별자리 연결선/경계선과 야간 모드, 밤의 은하수 색·밝기, 대기 효과 켜짐의 낮/박명 감쇠와 꺼짐의 낮 지도 표시를 확인한다.
- [ ] 자동 안내: 다른 별 정렬 없이 “밤하늘에서 바로 찾기”→센서 허용→폰 윗변을 목표로 향하기. 밤하늘·목표·방향 화살표가 실제 움직임과 일치한다.
- [ ] 나침반 미지원/방향 준비 중/권한 거부 상태를 구분하고, 미리보기를 현재 센서 방향이나 정밀 정렬로 오해하게 표시하지 않는다.
- [ ] 선택 정밀 모드: 폰 윗변을 경통과 평행하게 고정→별 보정 선택→1별 정렬→왼쪽/오른쪽·위/아래 화살표. 자동 모드로 돌아가면 상태 표시도 바뀐다.
- [ ] 목표 근처에도 방향 카드·실제 천구 유지, 수동 차트 전환, 선택 정밀 모드의 2별/3번째 별 확인과 10분 드리프트.
- [ ] 잠금/전화/백그라운드/홀더 재장착 뒤 오래된 정밀 정렬로 안내하지 않는다. 자동 모드도 복귀 후 유효한 방향이 준비될 때 안내한다.
- [ ] 하늘을 원형 전체 보기까지 줌아웃하고 다시 확대. 별·별자리 선·달·선택/FOV 표시가 함께 움직이며 원 밖 빈 영역을 누르면 천체가 선택되지 않는다.
- [ ] 별 → 자세히에서 손잡이 대신 본문 위로 펼치기·내용 스크롤·맨 위 아래로 접기, 버튼 탭과 가로 행을 확인한다.
- [ ] 대표 코스 이정표 확인→완료→관측 기록→코스 2/2. 다른 코스와 연습 모드에 진도 전파 없음.
- [ ] 기존 PWA JSON의 기록·사진·스케치·장비·학습 진도 가져오기 및 앱에서 재내보내기. 공유 취소/저장 실패 시 원본 유지.
- [ ] 스토어 앱 사진 촬영·선택·크기 조절. 기기별 파일 선택 UI, 키보드와 하단 버튼 겹침 없음.
- [ ] iOS는 동일 항목을 TestFlight에서 별도 확인. 에뮬레이터로 방향 센서의 물리 정확도를 보장하지 않는다.
- [ ] 공개 배포 완료 후 iPhone Safari/홈 화면 PWA의 설정 버전이 beta.4인지 확인하고 자동 위치·방향, 하늘 기본값·지면 슬라이더·두 장비 시야원·48개 업적·태양/달 크기·센서 움직임과 기존 기록 보존을 확인한다. PWA 테스트와 TestFlight 네이티브 테스트를 구분한다.

## 확인한 공식 문서

- [Android App Bundle](https://developer.android.com/guide/app-bundle): Play가 기기별 설치 파일 생성.
- [Target API](https://developer.android.com/google/play/requirements/target-sdk): 2026-08-31부터 새 앱/업데이트 API 36 이상.
- [Play 개인 계정 테스트](https://support.google.com/googleplay/android-developer/answer/14151465): 계정 조건별 12명/14일.
- [Apple SDK 요구](https://developer.apple.com/news/upcoming-requirements/): 2026-04-28부터 iOS 26 SDK 이상.
- [Capacitor 환경](https://capacitorjs.com/docs/getting-started/environment-setup), [Android 자체 플러그인](https://capacitorjs.com/docs/android/custom-code), [iOS 자체 플러그인](https://capacitorjs.com/docs/ios/custom-code), [Privacy manifest](https://capacitorjs.com/docs/ios/privacy-manifest).
