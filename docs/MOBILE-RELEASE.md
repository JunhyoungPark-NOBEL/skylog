# Android AAB / iOS 출시 준비

2026-09-08 기준. 앱 ID 기본값은 `io.github.junhyoungparknobel.skylog`, 버전은 `0.1.0-beta.1`(iOS marketing 0.1.0). 이 ID는 저장소 소유자에서 정했으며 아직 스토어에 등록되지 않았다. **첫 등록 전** 개발자 계정 소유자와 최종 앱 ID를 확인한다. T5 실기기 승인과 T7/T8 전체 완료를 의미하지 않는다.

## 빌드·산출물

- Node 22 이상, pnpm은 packageManager 지정 버전. Capacitor 8.5.1, Android compile/target SDK 36, min SDK 24, Java 21. iOS 15 이상, Xcode 26 이상.
- `pnpm mobile:sync`: 네이티브 전용 `base=/`로 웹을 빌드하고 Android/iOS에 복사한다. PWA는 기존 `/skylog/` 및 SW를 유지한다. 네이티브 앱은 SW를 등록하지 않으며 깊은 별·콘텐츠·학습 팩을 전부 포함한다.
- GitHub Actions **Build mobile bundles** 수동 실행: release AAB 및 Android lint, 인터넷을 끈 Android 36 에뮬레이터 테스트, iOS arm64 무서명 빌드. CI는 서명 비밀을 다루지 않는다. `skylog-android-aab-unsigned`는 서명 전 산출물이다.
- Play 배포 산출물은 **AAB**다. AAB는 직접 설치할 수 없으며 Play 내부 테스트에서 기기별 앱을 받는다. CI가 만드는 내부 테스트용 APK는 계측 실행용이고 사용자 배포 산출물이 아니다.
- 서명은 Windows에서 `scripts/sign-aab.ps1 -Bundle <unsigned.aab> -Output <new-signed.aab>`로 수행한다. JDK 21+의 JAVA_HOME을 지정하거나 이번 PC의 `%LOCALAPPDATA%/skylog-tools/jdk-*`를 쓴다. 처음 한 번 업로드 키를 만들고 이후 재사용한다.
- 키는 `%LOCALAPPDATA%/skylog-signing/skylog-upload.p12`, 암호는 같은 폴더의 `password.dpapi.xml`에 현재 Windows 사용자용 DPAPI로 보관한다. **저장소·공개 산출물에 키나 암호를 넣지 않는다.** 인증서 `upload-certificate.pem`은 공개용이다. 서명 스크립트는 기존 출력/불완전한 키를 덮어쓰지 않는다.
- 키 폴더를 별도 안전한 저장소에 백업해야 한다. DPAPI 암호 파일은 다른 PC에서 직접 복호화되지 않는다. 원래 Windows 계정에서 암호를 복원해 개인 암호 관리자에 보관한 뒤 이동한다. 키·암호를 채팅/이슈에 붙여 넣지 않는다. 후속 빌드도 같은 업로드 키와 더 큰 versionCode를 사용한다.
- iOS `skylog-ios-unsigned-build`는 컴파일 확인용 `.app`이며 iPhone에 배포할 IPA가 아니다. Apple Developer 팀, Bundle ID 등록, 배포 인증서/프로비저닝을 갖춘 Mac에서 Archive → Validate → Distribute → TestFlight가 필요하다.

## 앱 기능과 데이터

- Android SensorManager 상대 회전 벡터 / iOS Core Motion 상대 자세 → 기기 ENU quaternion → 기존 씬 변환. 별길은 **물리 폰 윗변 +Y**, 하늘 AR은 카메라 −Z. 화면 회전을 별길에 이중 적용하지 않는다. 상대 모드를 자력계로 조용히 대체하지 않는다.
- 정렬은 매 센서 세션에 다시 한다. 백그라운드·센서 중단 뒤에는 새 정렬을 요구한다. 카메라 plate solving·망원경 모터 제어는 없다. Android/iOS 실기기 축·자북·진북·권한/10분 드리프트는 반드시 확인한다.
- Geolocation은 사용자가 요청할 때, Core Motion은 가이드를 켤 때 사용한다. 사진은 시스템 선택/촬영 경로, 백업은 앱 캐시→OS 공유 시트. 기기 전체 파일 접근·백그라운드 위치·광고 ID·추적 권한은 요구하지 않는다.
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
- [ ] 위치 허용/거부/대략 위치, 수동 관측지. 권한 거부가 다른 화면을 막지 않는다.
- [ ] 폰 윗변을 경통과 평행하게 고정→센서 켜기→1별 정렬→왼쪽/오른쪽·위/아래 화살표. 실제 움직임과 일치한다.
- [ ] 목표 근처에도 방향 카드 유지, 수동 차트 전환, 2별/3번째 별 확인, 10분 드리프트.
- [ ] 잠금/전화/백그라운드/홀더 재장착 뒤 오래된 정렬로 안내하지 않는다.
- [ ] 대표 코스 이정표 확인→완료→관측 기록→코스 2/2. 다른 코스와 연습 모드에 진도 전파 없음.
- [ ] 기존 PWA JSON의 기록·사진·스케치·장비·학습 진도 가져오기 및 앱에서 재내보내기. 공유 취소/저장 실패 시 원본 유지.
- [ ] 스토어 앱 사진 촬영·선택·크기 조절. 기기별 파일 선택 UI, 키보드와 하단 버튼 겹침 없음.
- [ ] iOS는 동일 항목을 TestFlight에서 별도 확인. 에뮬레이터로 방향 센서의 물리 정확도를 보장하지 않는다.

## 확인한 공식 문서

- [Android App Bundle](https://developer.android.com/guide/app-bundle): Play가 기기별 설치 파일 생성.
- [Target API](https://developer.android.com/google/play/requirements/target-sdk): 2026-08-31부터 새 앱/업데이트 API 36 이상.
- [Play 개인 계정 테스트](https://support.google.com/googleplay/android-developer/answer/14151465): 계정 조건별 12명/14일.
- [Apple SDK 요구](https://developer.apple.com/news/upcoming-requirements/): 2026-04-28부터 iOS 26 SDK 이상.
- [Capacitor 환경](https://capacitorjs.com/docs/getting-started/environment-setup), [Android 자체 플러그인](https://capacitorjs.com/docs/android/custom-code), [iOS 자체 플러그인](https://capacitorjs.com/docs/ios/custom-code), [Privacy manifest](https://capacitorjs.com/docs/ios/privacy-manifest).
