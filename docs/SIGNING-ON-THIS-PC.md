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

최종 제출 파일은 `Downloads/skylog-release-0.1.0-beta.14-build19/`의 **`skylog-0.1.0-beta.14-build19-play-signed.aab`**다. 소스 `c31c615e89dafeb64af48ee1095d571265d178e9`, beta.14/build19, **20,820,473bytes**, SHA256 `37aa667b96cd87c5a43294abd6d2e49df2a09bd01ae57271a66b7b48af992887`. build17에서 마련한 위 업로드 키를 그대로 사용했다.

`play-signing-verification.json`에서 RSA4096/SHA256withRSA·jarsigner strict·bundletool 검증, payload **1,072개 전부 서명/무서명 원본 일치**·미서명 payload0을 확인했다. 내장 native567개·소스 public480개·사진328개도 APK/서명·무서명 AAB/로컬 Android/iOS와 일치한다. 이 자료 비교는 iOS 앱 서명·실기기 설치 검증이 아니다. 무서명 원본은 **20,722,069bytes**, SHA256 `bd4f2cd251358dfd6e7ae72a1db1bc51cebe34ef594d14e92993968d71d35025`로 보존한다.

개인 APK는 **21,433,369bytes**, SHA256 `848166e5601427eb5b1fef6901d5bb0a04ddd7349194a225ad7534744f230ade`이며 build18의 개인 인증서 `2dce38b758c9091f919465d32453b64e0835ff8b541bdeaa7c6f3231313fc110`와 직접 일치 확인했다. 제출 AAB와 설치 APK의 키를 서로 바꾸지 않는다. [전체 검증/배포 상태](MOBILE-RELEASE.md).

1. Console 앱 패키지에 `io.github.junhyoungparknobel.skylog`를 입력한다.
2. 첫 릴리스에서 Play App Signing을 설정한다. Google이 앱 서명키를 관리하는 기본 방식을 사용하는 경우 이 AAB의 인증서는 업로드키로 등록된다.
3. 서명된 AAB를 내부 테스트 릴리스에 올리고 버전 코드19·API36·업로드 인증서 SHA256을 대조한다.
4. 등록이 끝나면 이후 AAB도 이 업로드키를 유지한다. Console 등록 성공은 현재 로컬 서명 성공과 별도이며 이번 build19의 업로드·등록 성공은 아직 확인하지 않았다.

Google이 최종 설치본에 쓰는 **앱 서명키**와 개발자가 업로드할 때 쓰는 **업로드키**는 역할이 다르다. 개인 APK의 서명과 Play 설치본 서명이 달라지면 덮어쓰기가 불가능할 수 있으므로 먼저 관측 JSON 백업을 내보내고 테스트 트랙에서 이전을 확인한다. [Android 앱 서명 설명](https://developer.android.com/studio/publish/app-signing)

이전 beta.12/build17 서명 AAB는 `Downloads/skylog-release-0.1.0-beta.12-build17/`에 보존한다. SHA256 `888b5acf93b879f33f3f6ed9e8f57771a3be1dcc4a9a8d9b1fb5e98eb52d0d6d`, payload997개로 검증한 이력이며 이번 제출 안내의 build19과 구분한다. 서명 성공은 실제 판매 개통도 아니다. build19은 구매 API를 호출하지 않는 무료 미리보기이며, ₩9,900 일회성 Plus의 상품·구매 서버·SMTP·라이선스 구매 검증과 두 사람의 무상 권한 발급은 별도 미완료다.

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
