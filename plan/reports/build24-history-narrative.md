## 이전 작업 보고 (2026-09-11 · 발견을 따라가는 천체물리 이야기 / build24)

- 열 편에 도입·90개 장면·30개 발견 기록·10개 결말을 한영으로 추가했다. 관측 상황에서 출발해 마지막에 처음의 의문으로 돌아온다. 결말은 간결한 본문과 펼쳐 읽는 세 장 기록으로 구성한다.
- 세 계산·판단을 각각 제출하면 결말을 읽을 수 있으며 정답 수·복습할 장은 별도로 표시한다. 마지막 장만 제출했을 때는 첫 미제출 장으로 이어 준다. 결말·장 이동은 점수나 보상을 쓰지 않는다.
- 기존 30개 계산·판단과60개 개념 문항의 수치·답·가정·ID·저장 형식, 힌트·메모·아바타/지평선은 유지했다. 역사 원문과 교육용 재구성을 구별하고 모형 전환을 장면 안에도 표시한다.
- 전체102파일/747단위 검사와 관련 Chromium8개(실제 PWA 오프라인1개 포함) 통과. 초기 사진 해시 검사는 전체 동시 실행에서5초 시간 초과했으나 단독 및4worker 전체 검사에서 통과했다. 최종 beta.18의 타입·전체 lint·변경 파일 포맷·PWA 빌드, 관련 단위11개와 Chromium8개 재검증도 통과했다. 초기 JS gzip479.21kB, PWA405항목 프리캐시. 서명·배포도 완료했으며 다음 항목에 근거를 기록한다.
- 결정 D-070; 상세 docs/HISTORY-NARRATIVE.md·HISTORY-QUESTS-SOURCES.md. 물리 휴대폰 확인: 안드로이드 기존 APK 위 업데이트, 아이폰 홈 화면 웹앱 새 버전, 이야기9장면·결말·뒤로가기·용어 홀드·오프라인 재실행.

- **최종 산출물**: 소스 `a0225d33708fb725c7770831ad3fa6aa0402605f`, beta.18/code24/min24/target36. Play AAB **20,872,938bytes**·SHA256 `b4a83bf074d6bd4dee68ed4d4406f279751dcf33a5d2941dd4ae2582388874b1`. 개인 APK **21,482,971bytes**·SHA256 `de33422f0bee82362d95c5f28f9c3560cae6519356223d7b8465f5f8e4e35658`. 기존 Play 업로드키·개인 APK키를 유지하고 build23 개인 APK와 인증서 일치를 확인했다. jarsigner strict·bundletool·16KB APK 정렬, payload1077개 전체 서명/원본 일치, native572/public480/사진328개 Android·로컬 iOS 자산 일치를 검증했다.
- **배포/CI**: [Pages 34590649099](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34590649099)·[모바일 34590650742](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34590650742) 성공. Android release/lint·에뮬레이터 계측 및 iOS 무서명 Release 컴파일의 job/step 성공을 확인했다. 공개 웹앱4개 시나리오(열 편 도입·9단계 완주·결말 재실행·영어 야간125%)와 배포 자산 해시를 기록했고 서버 쓰기·JS/콘솔 오류0이다. 공개 APK도 재다운로드해 로컬 서명본과 일치했다. 물리 휴대폰·Apple 배포 서명·Play 업로드/심사는 별도다. 보고서 artifacts/qa-build24/public-release-verification.json 및 다운로드 폴더 READ-ME-KO.txt.

