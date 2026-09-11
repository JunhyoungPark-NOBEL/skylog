# 이 PC에서 Skyard AAB 서명하기

2026-09-10. 사용자가 이 패키지로 Play에 업로드한 적이 없다고 확인했고, 앞으로 현재 PC에서 작업하도록 요청했다. **이 PC의 새 Play 업로드 전용키를 최초 등록용으로 준비했다.** 집 PC의 이전 키를 복구한 것은 아니다.

## 현재 키

| 항목               | 값                                                                 |
| ------------------ | ------------------------------------------------------------------ |
| 앱 ID              | `io.github.junhyoungparknobel.skylog`                              |
| 보관 폴더          | `%LOCALAPPDATA%\skylog-signing`                                    |
| 암호화 키 저장소   | `skylog-upload.p12`                                                |
| 암호 보호 파일     | `password.dpapi.xml` — 현재 Windows 사용자 DPAPI                   |
| 공개 인증서        | `upload-certificate.pem`                                           |
| Alias / 형식       | `skylog-upload` / PKCS12, RSA 4096                                 |
| 공개 인증서 SHA256 | `f5ad3a778d18b33973938b40f5b93f604c0cb099095a9875b09aa4f0c57a98bd` |

현재 사용자만 접근할 수 있는 폴더 권한을 적용했다. DPAPI 암호를 복원해 private-key alias를 열고 공개 인증서 지문이 일치하는 것을 확인했다. 개인 설치용 APK 키는 `%LOCALAPPDATA%\skylog-local-test-signing`에 별도로 유지한다.

## 이번 Play 업로드

최종 파일은 `Downloads/skylog-release-0.1.0-beta.18-build24/skylog-0.1.0-beta.18-build24-play-signed.aab`입니다. 소스 `a0225d33708fb725c7770831ad3fa6aa0402605f`, beta.18/code24/min24/target36. Play AAB **20,872,938bytes**·SHA256 `b4a83bf074d6bd4dee68ed4d4406f279751dcf33a5d2941dd4ae2582388874b1`. 개인 APK **21,482,971bytes**·SHA256 `de33422f0bee82362d95c5f28f9c3560cae6519356223d7b8465f5f8e4e35658`. 기존 Play 업로드키·개인 APK키를 유지하고 build23 개인 APK와 인증서 일치를 확인했다. jarsigner strict·bundletool·16KB APK 정렬, payload1077개 전체 서명/원본 일치, native572/public480/사진328개 Android·로컬 iOS 자산 일치를 검증했다.

1. Google Play 내부 테스트 릴리스의 App Bundle에 **play-signed.aab**를 올립니다.
2. 패키지 `io.github.junhyoungparknobel.skylog`, 버전 코드24, API36 및 위 업로드 인증서를 대조합니다.
3. Console 등록/업로드 자체는 이번 작업에서 수행하지 않았습니다. 이 업로드 키를 다음 버전에도 유지합니다.

개인 설치용 APK는 Play 앱 서명키와 다를 수 있습니다. 이번 APK는 기존 build23 개인 APK 위에 업데이트할 수 있는 인증서입니다. 실제폰 설치는 확인해 주세요. [전체검증](MOBILE-RELEASE.md)·[설치안내](INSTALL-ON-PHONE.md).

## 다음 버전

소스 버전과 `SKYLOG_VERSION_CODE`를 올리고 새 AAB를 빌드한 뒤 기존 [sign-aab.ps1](../scripts/sign-aab.ps1)을 사용한다. PowerShell7에서 저장소 루트를 작업 폴더로 둔다.

```powershell
$env:JAVA_HOME = Join-Path $env:LOCALAPPDATA 'skylog-tools/jdk-21.0.12.1+1'
# Bundle에는 검증한 새 무서명 AAB, Output에는 아직 존재하지 않는 새 출력 파일을 지정한다.
.\scripts\sign-aab.ps1 -Bundle '새-AAB-절대경로' -Output '새-서명-AAB-절대경로'
```

현재 키를 자동으로 읽으므로 매번 새 키를 만들거나 암호를 채팅에 입력할 필요가 없다. `-CreateNewKey`는 다시 사용하지 않는다. 스크립트는 기존 출력 파일을 덮어쓰지 않으며 SHA256withRSA/SHA-256 서명 후 현재 키 저장소를 기준으로 strict 검증한다.

## PC 교체에 대비한 백업

현재 DPAPI 암호 파일은 **같은 Windows 사용자·PC**에 묶인다. 두 파일을 복사하는 것만으로 다른 PC/재설치 후 복구가 보장되지 않는다. [Microsoft DPAPI 설명](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml)

휴대용 복구 백업은 아직 만들지 않았다. 다음 조건으로 같은 개인키를 별도의 암호화 PKCS12에 내보내고 보관해야 한다.

1. 본인이 로컬의 가려진 암호 입력창에서 별도 복구 암호를 입력한다. 암호를 채팅·명령 인수·로그에 쓰지 않는다.
2. 원래 키를 새로 생성하지 않고 `keytool -importkeystore`로 같은 alias/private key를 내보낸다. 암호는 프로세스 환경으로 전달하고 작업 후 지운다.
3. 내보낸 파일을 다시 열어 위 공개 인증서 SHA256과 일치하는지 확인한다.
4. 암호화 키 백업은 별도 보관 장치/암호화 저장소에, 복구 암호는 암호 관리자에 분리 보관한다.

공개 `upload-certificate.pem`과 서명된 AAB는 제출 자료에 포함할 수 있다. `.p12`와 `password.dpapi.xml`은 Git 저장소·공개 릴리스·제출용 ZIP에 포함하지 않는다. Play 등록 후 키를 잃은 경우에는 임의 교체 대신 업로드키 재설정 절차를 사용한다.
