# Android AAB / iOS 출시 준비

2026-09-08 기준. 앱 ID 기본값은 `io.github.junhyoungparknobel.skylog`, 현재 소스 버전은 `0.1.0-beta.3`(iOS marketing 0.1.0), 이번 빌드 후보 번호는 **8**이다. build8 산출물·배포·최종 검증은 아래 확인 대기 상태를 따른다. 이 ID는 저장소 소유자에서 정했으며 **스토어 등록·최종 앱 ID·기존 업로드 키는 계정 소유자의 확인이 필요하다**. T5 실기기 승인과 T7/T8 전체 완료를 의미하지 않는다.

## 2026-09-08 최신 beta.3 / build8 후보: 자동 위치·센서·흰 별자리·작은 반투명 UI

> **현재 상태: 소스 반영 후 최종 확인 대기.** build8 APK/AAB 빌드·서명/내용 검증·다운로드 게시, beta.3 PWA 배포·공개 버전 확인, 새 Android/iOS CI와 최종 단위·브라우저 검증 수치는 아직 확정하지 않았다. 아래 build7의 성공 기록과 해시는 이전 산출물의 결과이며 build8 검증 결과가 아니다.

- **자동 GPS**: 첫 실행과 앱 복귀 때 현재 위치를 한 번 요청한다. 자동 사용이 기본이고 최초 OS/브라우저 권한 요청이 필요할 수 있다. 권한 거부 이력을 기억해 자동 재요청을 막으며, 명시적 위치 버튼으로 재시도한다. 자동 사용을 끄거나 저장 관측지를 선택하면 그 선택을 유지하고 늦은 GPS 응답이 덮어쓰지 않게 했다. 이전에 직접 지정한 기본 관측지도 보존한다. 백그라운드 위치 추적을 추가하지 않았다.
- **자동 방향 센서**: 하늘 화면에 들어오면 자동 연결을 시도한다. iPhone 최초 권한은 사용자가 센서 버튼을 눌러 허용하며, 승인 뒤 재진입/복귀 때 연결을 다시 확인한다. 사용자가 직접 끈 선택은 다음 실행에도 유지한다. 나침반 방향이 아직 없으면 화면을 잘못 돌리지 않고 필요한 안내를 표시한다. 공유 차트와 원형 하늘의 명시적인 수동 탐색도 유지한다.
- **별자리·은하수**: 연결선과 경계선을 더 선명한 흰색으로 표시한다. 이 두 선은 야간 모드에서도 흰색이며 다른 야간 레이어는 적색을 유지한다. 은하수의 밝기 감쇠를 바로잡고 청보라·청록·밝은 먼지 결을 보강했다. 대기 효과가 켜지면 태양 고도에 따라 흐려지고, 끈 지도 보기에서는 낮에도 표시한다. 원형 180° 반구 보기와 선택적인 정밀 별 정렬은 유지한다.
- **작은 반투명 UI**: 상단 중복 시각/센서 표시를 정리하고 하늘의 시간 제어를 기본 접힘 상태로 바꿨다. 시간 이동 중 표시와 지금 복귀는 접어도 남는다. 하단 5개 탭과 상태 캡슐은 작은 반투명 표면을 사용하고 글자 확대에 맞춰 높이·콘텐츠 여백을 함께 늘린다. 주요 터치 영역은 최소 44px을 유지한다. 원형 하늘·별길·실제 하늘 설정은 하늘 설정 패널로 모았다. 목표 pill은 센서 도움말의 실제 아래 끝을 따라 배치한다.
- **설치 경로와 iPhone 갱신**: [휴대폰 설치 안내](INSTALL-ON-PHONE.md)에 전달 경로와 새 조작을 정리했다. 공개 PWA 주소는 그대로이며 beta.3 배포 확인 후 기존 Safari/홈 화면 앱을 갱신한다. 업데이트를 위해 웹사이트 데이터나 기존 앱을 먼저 삭제하지 않는다. 개인 APK는 기존 체험판과 같은 키로 업데이트하도록 준비하지만 실제 서명 일치 확인은 아직 대기다.
- **과금 상태**: 전 기능 무료이며 결제 기능·상품 등록·로그인·무료 이용권 발급은 아직 없다. 공개 유료 플랜과 두 사람 무료 이용 설계는 [유료화 계획](MONETIZATION-PLAN.md)에 있다. 기존 Play 업로드 키·Apple 팀·실기기·심사·상업용 날씨 이용 조건은 계속 별도 출시 항목이다.

| build8 확인 항목             | 현재 기록                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| 소스 커밋·최종 단위/e2e 수치 | 확인 대기 — 작업 중 수치를 최종 결과로 사용하지 않음                                                    |
| PC 전달 폴더                 | `Downloads/skylog-release-0.1.0-beta.3-build8/` 예정 — 생성·내용 확인 대기                              |
| 개인 APK                     | `skylog-0.1.0-beta.3-build8-local-test.apk` 예정 — 크기·SHA256·서명 일치·공개 링크 확인 대기            |
| unsigned AAB                 | `skylog-0.1.0-beta.3-build8-unsigned.aab` 예정 — 구조/versionCode8·크기·SHA256·내장 자료 일치 확인 대기 |
| PWA·모바일 CI                | beta.3 공개 버전/SW·Android release/오프라인 WebView·iOS 무서명 컴파일 확인 대기                        |
| 스토어·실기기                | Play 최종 서명/내부 테스트, Apple 서명 Archive/TestFlight, Android/iPhone 실기기와 심사 대기            |

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

## 이전 build6 기록: 상세 창 스크롤 개선

- 별 → 자세히에서 본문·제목·버튼 행을 위아래로 쓸어 창을 펼치거나 내용을 스크롤한다. 내용 맨 위에서 새 아래 동작으로 접기/닫기, 버튼 탭·가로 행·취소/두 손가락 동작을 구분한다. D-033.
- 전달 폴더: 현재 PC Downloads의 `skylog-release-0.1.0-beta.1-build6/`. 개인 APK `skylog-0.1.0-beta.1-build6-local-test.apk`, 7,192,735 bytes, SHA256 `f132c61c72cf9f21d4123e46fbc70472c173ab20629307ca2f7700660ba6e3a8`. build5와 동일한 인증서를 두 APK에서 검증했고 versionCode6으로 올렸다. 기존 build5를 삭제하지 않고 업데이트한다.
- AAB `skylog-0.1.0-beta.1-build6-unsigned.aab`, 6,904,666 bytes, SHA256 `64d972cd49848f26e01edfa066d9b366f03f99b9917224cae146e7ff3f96d05d`. 빌드·구조 검증 완료, 기존 업로드 키 복원과 최종 서명은 대기다. 다음 CI 기본 version_code는7.
- typecheck/lint/단위366/브라우저40/data/native sync 통과. Android bundleRelease/assembleRelease/lintRelease 성공(오류0/경고33). APK 서명·정렬 및 bundletool 통과, AAB/APK/현재 native public의 160개 파일(빈 파일2개 포함) SHA256 일치. 실제 기기 설치·iPhone 실행은 미검증.
- 원격 HEAD `dce4a7d`를 다시 확인했다. **GitHub 인증이 없어 새 코드의 공개 웹 배포는 미완료**이며 iPhone PWA에는 아직 이번 제스처 수정이 없다. Apple 팀/Mac의 iOS 빌드·서명·TestFlight 및 Play/App Store 공개 출시는 계속 남는다.

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
- [ ] 공개 배포 완료 후 iPhone Safari/홈 화면 PWA의 설정 버전이 beta.3인지 확인하고 자동 위치·방향, 작은 반투명 UI·흰 별자리·은하수·원형 하늘·상세 창 스와이프와 기존 기록 보존을 확인한다. PWA 테스트와 TestFlight 네이티브 테스트를 구분한다.

## 확인한 공식 문서

- [Android App Bundle](https://developer.android.com/guide/app-bundle): Play가 기기별 설치 파일 생성.
- [Target API](https://developer.android.com/google/play/requirements/target-sdk): 2026-08-31부터 새 앱/업데이트 API 36 이상.
- [Play 개인 계정 테스트](https://support.google.com/googleplay/android-developer/answer/14151465): 계정 조건별 12명/14일.
- [Apple SDK 요구](https://developer.apple.com/news/upcoming-requirements/): 2026-04-28부터 iOS 26 SDK 이상.
- [Capacitor 환경](https://capacitorjs.com/docs/getting-started/environment-setup), [Android 자체 플러그인](https://capacitorjs.com/docs/android/custom-code), [iOS 자체 플러그인](https://capacitorjs.com/docs/ios/custom-code), [Privacy manifest](https://capacitorjs.com/docs/ios/privacy-manifest).
