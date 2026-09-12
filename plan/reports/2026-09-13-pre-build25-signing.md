# build25 이전 서명 보고

## 이전 작업 보고 (2026-09-11 · 플레이 제출용 AAB 재생성)

- Android AAB `0.1.0-beta.16-build22-play-signed.aab` 생성 완료. 소스는 `f4a584442126a855c3a85565201e3e8c610fb984`, 버전은 `0.1.0-beta.16` / `versionCode22`, 패키지 `io.github.junhyoungparknobel.skylog`.
- 산출물 해시: Play 제출 AAB `18ADAE63BB34A736F4C0B8BE90A8ECB3CB44A0E8FCBF3E10F761E005B3324E5D`, 무서명 `1DDE39EDF9627CC131541E5606A63B69596F501123444F376DB69C7CF8799A0A`.
- 기능은 기존 build21 상태 유지(별자리/배경/사진/커뮤니티/유료 예시 구조 변경 없음). jarsigner strict 및 `bundletool validate`는 로컬에서 통과.
- 현재 작업 폴더 경로가 비ASCII 경로라 `android/gradle.properties`에 `android.overridePathCheck=true`를 적용해 재현 가능한 빌드 환경을 고정함(D-068).

- build21 지평선 배포 보고는 [보관 기록](reports/2026-09-11-build21-horizon-release.md)을 참고한다.

