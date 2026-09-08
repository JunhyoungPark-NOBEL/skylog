# 휴대폰에서 별관찰 앱 사용하기

현재 버전은 0.1.0-beta.1이다. Google Play/App Store 공개 출시는 아직 완료되지 않았다.

## 안드로이드: 직접 설치용 APK

1. 전달 폴더의 `skylog-0.1.0-beta.1-build5-local-test.apk`를 휴대폰의 Download 폴더로 옮긴다. USB 파일 전송이나 본인이 사용하는 파일 전송 방법을 사용할 수 있다. PC에서는 APK를 실행하지 않는다.
2. 휴대폰의 내 파일/Files에서 APK를 열고 설치한다. 설치 출처 허용을 요청하면 이 APK를 연 앱에 대해서만 허용하고, 설치 후 다시 해제할 수 있다.
3. 앱 목록에서 **별관찰해쌀뚜**를 연다. Android 7 이상과 최신 Android System WebView/Chrome을 권장한다. 하늘·학습 자료는 설치 파일에 들어 있다. 날씨 갱신에는 인터넷이 필요하다.
4. 설치 후 아래 실기기 확인을 진행한다.

이 APK는 release 모드 앱을 이 PC의 개인 체험용 키로 서명한 것이다. 계측 테스트 실행용 APK가 아니다. 같은 키를 사용한 다음 체험판은 더 큰 versionCode로 업데이트할 수 있다.

**이미 같은 앱이 다른 서명으로 설치돼 있거나, 나중에 Play 설치판으로 옮길 때:** 기존 앱의 설정에서 JSON 백업을 내보내고 파일이 저장됐는지 확인한다. 서명이 다르면 덮어쓰기 설치가 되지 않는다. 백업 후에만 기존 앱 삭제 → 새 앱 설치 → JSON 가져오기 → 기록 수·사진·학습 진도 대조를 한다. 삭제 전 원본 기록을 꼭 보관한다.

`.aab`는 Play 제출용이고 휴대폰에서 직접 열어 설치할 수 없다. 현재 PC의 기존 업로드 키 복원이 끝나지 않았다면 `unsigned.aab`를 Play에 제출하지 않는다.

## 아이폰: 지금 홈 화면에 설치

1. 최신 iOS의 **Safari**에서 [별관찰 앱](https://junhyoungpark-nobel.github.io/skylog/)을 연다. 현재 UI는 iOS 16.4 이상을 권장한다.
2. **공유 → 홈 화면에 추가**를 선택한다. ‘웹 앱으로 열기’ 항목이 보이면 켜고 **추가**한다.
3. 홈 화면의 **별관찰** 아이콘으로 실행한다. 폰 방향 기능을 켤 때 동작·방향 권한을 허용한다. 위치는 관측지 설정에서 직접 요청하거나 수동으로 입력할 수 있다.
4. 오프라인에서 쓸 이야기·배우기·별길 화면은 온라인 상태에서 한 번씩 연다. 기본 하늘 자료는 자동 저장되고, 깊은 별·이야기·학습은 사용한 자료가 저장된다. 네이티브 앱의 ‘첫 실행부터 모든 팩 포함’과 다르다.

Safari 웹앱과 TestFlight 네이티브 앱은 데이터 저장소가 별개다. 나중에 옮길 때 JSON 백업·가져오기를 사용한다.

## 아이폰: TestFlight 네이티브 앱

이번 Windows PC에서 설치 가능한 IPA를 만들지는 못했다. 필요한 것은 Apple Developer 팀, 확정된 Bundle ID, App Store Connect 앱 등록, 배포 인증서/프로비저닝, Xcode 26 이상이 설치된 Mac이다.

1. 최신 코드에서 `pnpm install --frozen-lockfile`, `pnpm mobile:sync`를 실행한다.
2. `ios/App/App.xcodeproj`를 Xcode로 열고 **Signing & Capabilities → Team**을 설정한다. Bundle ID는 현재 `io.github.junhyoungparknobel.skylog`이며 최초 등록 전에 소유자가 확정한다.
3. 배포 최소 iOS **16.4**, marketing **0.1.0**, 기존 업로드보다 큰 Build 번호를 확인한다.
4. iOS 기기용 **Archive → Validate App → Distribute App → App Store Connect**로 업로드한다.
5. App Store Connect에서 본인을 내부 테스터로 추가하고, 아이폰의 TestFlight 앱에서 초대를 받아 설치한다. 외부 테스터는 베타 심사 조건이 추가된다.
6. 이번에 고친 센서 플러그인 등록을 반드시 새 빌드에서 확인한다. 이전 무서명 컴파일 성공은 이번 수정의 실행 검증이 아니다.

## 먼저 해볼 실기기 확인

- [ ] 앱 종료 후 재실행, 한국어/English, 큰 글씨, 가로 화면.
- [ ] 위치 허용/거부와 수동 관측지 모두 사용 가능.
- [ ] 폰 방향으로 하늘 보기, 화면 켜짐 유지.
- [ ] 별길에서 폰 윗변을 장비와 나란히 놓고 밝은 별 정렬. 좌우/위아래 방향과 10분 뒤 오차 확인.
- [ ] 화면 잠금/다른 앱 전환 뒤 다시 정렬하도록 안내.
- [ ] 관측 기록에 사진·메모 저장 → 퀴즈 → 앱 재실행 후 보존.
- [ ] JSON 내보내기 → 별도 환경에서 가져오기 후 기록·사진·학습 진도 일치.
- [ ] Android APK는 비행기 모드 첫 실행에서 하늘·깊은 별·코스·이야기·퀴즈 확인. iPhone 웹앱은 먼저 온라인에서 자료를 연 다음 오프라인 확인.

## 정식 스토어 공개 출시 전 남은 일

| 플랫폼 | 남은 필수 작업 |
|---|---|
| Google Play | 기존 업로드 키 복원 또는 최초 등록용 새 키 확정, 개발자 계정/앱 ID 등록, 서명 AAB 내부 테스트 업로드, 연락처·정책·Data safety·연령 등급·실제 스크린샷, 기기 테스트·심사. 조건에 해당하는 신규 개인 계정은 12명/14일 비공개 테스트 후 프로덕션 액세스 신청 |
| Apple | 새 iOS 수정 컴파일/실행, 개발자 팀/서명/Archive, TestFlight 설치, privacy report·정책·연락처·연령 등급·실제 스크린샷, 실기기 테스트·심사 |

날씨 기능은 관측 좌표를 Open-Meteo로 보내므로 스토어 개인정보 양식에서 외부 전송이 전혀 없다고 선언하면 안 된다. 전체 제출 초안은 [스토어 문안](STORE-LISTING.md), 상세 기술 기록은 [모바일 출시 준비](MOBILE-RELEASE.md)를 참고한다.

공식 근거: [Google target API](https://developer.android.com/google/play/requirements/target-sdk), [개인 계정 테스트](https://support.google.com/googleplay/android-developer/answer/14151465), [Android 서명](https://developer.android.com/studio/publish/app-signing), [Apple SDK 요건](https://developer.apple.com/news/upcoming-requirements/), [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [iPhone 홈 화면 웹앱](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios), [Tailwind 지원 범위](https://tailwindcss.com/docs/compatibility).
