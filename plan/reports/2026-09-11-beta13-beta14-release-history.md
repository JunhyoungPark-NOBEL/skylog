# beta.13–beta.14 출시 작업 보관 기록

## 이전 작업 보고 (2026-09-11 · 선행 문제로 배우는 역사 천체물리)

- 사용자의 최신 정정: 짧은 정의를 먼저 읽게 하는 방식 대신, 본 문제 앞의 선행 문제로 개념을 익힌다. 전문 용어는 길게 눌러 뜻을 확인한다(D-066).
- 30개 본 문제 앞에 60개 준비 문제를 연결하고, 관측 상황 → 개념 질문 → 관계 연습 → 본 문제로 이어지는 한영 흐름을 구성한다. 한 번에 한 문제만 표시하고 오답 피드백·재시도·건너뛰기·준비 복습을 지원한다. 준비 진도는 별도 `learn.preparation:` 키에 저장하며 원래 채점·ID·메모·30개 본 문제의 수치 답을 보존한다.
- 10개 역사 주제의 도해를 30개 문항 상황에 맞춰 제공한다. 수식은 로컬 KaTeX/글꼴로 렌더링하고 변수 이탤릭·아래첨자 직립체와 MathML을 적용한다. 용어 홀딩은 스크롤 이동 시 취소되며 탭·키보드도 지원한다. `docs/HISTORY-LEARNING-UX.md` 참고.
- 이야기 121개 중 정확 일치 사진 58개·대상을 함께 담은 이중성단 사진 2개·카탈로그 도해 61개를 목록/오늘 카드/상세에 연결했다. 다른 대상 사진으로 대체하지 않으며 도해는 사진과 구분한다. 출처는 상세에서 확인한다. `docs/STORY-IMAGES.md` 참고.
- 현재 공개 버전은 beta.14/build19다. 광고 없음·9,900원 1회 구매 계획과 preview 모드를 유지하며 실제 구매 서버/상품/SMTP를 변경하지 않는다.
- 통합 검증: 타입·전체 lint·변경 파일 포맷·전체 93파일/701개 단위 통과. 360px·영어125%·야간·용어 실제 CDP 홀딩·오답 재시도·진도·초안·이야기 이미지/출처의 정적 번들 Chromium 8개 통과. 독립 검토에서 찾은 홀딩 해제 후 모달 즉시 닫힘, 조회 재시도 때 선택이 다른 준비 문제로 옮겨 붙음, 이전 제목 초점 안내를 수정하고 회귀 검사했다. 60개 한영 도해의 작은 폭 검수·원래 문제 데이터 구조 동일성·수식 전체 렌더링 검증을 완료했다. 관련 로그와 최초 실패 증거는 `artifacts/qa-build19/` 등에 보존했다.
- 실제 PWA 서비스워커를 사용하는 오프라인 E2E 1개도 통과했다. 첫 선행 문제 정답 후 오프라인 새로고침 → 두 번째 완료 → 본 문제 입력/힌트/메모 저장 → 다시 새로고침해 보존 → 미방문 Kepler 도해·수식과 캐시된 로컬 글꼴 열기를 확인했다. 외부 요청·서버 쓰기·글꼴 실패·JS 오류 0. Node JSON import·worker activating 대기·라디오 선택자의 초기 하네스 실패를 수정하고 로그를 보존했다. 전체 관련 Chromium 검사는 9개이며 실제 아이폰 검증과 구분한다.
- **최종 소스/산출물**: `c31c615e89dafeb64af48ee1095d571265d178e9`, beta.14/code19/min24/target36. 로컬 Downloads/skylog-release-0.1.0-beta.14-build19/의 Play 서명 AAB **20,820,473bytes** · SHA256 `37aa667b96cd87c5a43294abd6d2e49df2a09bd01ae57271a66b7b48af992887`. 기존 업로드 인증서·jarsigner strict·bundletool·payload1072개 전체 서명과 원본 일치. 개인 APK **21,433,369bytes** · SHA256 `848166e5601427eb5b1fef6901d5bb0a04ddd7349194a225ad7534744f230ade`. 이전 build18 인증서·16KB 정렬·native567/public480/사진328개 비교, 공개 APK 재다운로드 일치. Android lint 오류0/경고32. 키/암호는 배포 폴더에 포함하지 않았다.
- **배포/CI**: [Pages34549739499](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34549739499) build/deploy, [모바일34549764863](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34549764863) validate-version/android/ios 모든 step 성공. Android API36 오프라인 계측·릴리스/lint, iOS Xcode26 무서명 Release 컴파일 단계를 확인했다. API 응답의 job/step 성공을 검증했으며 CI 아티팩트 XML 원본을 별도로 내려받아 재분석하지 않았다. 실제 휴대폰·Apple 서명·실제 거래/심사는 별도다.
- **공개 웹 검사**: 새 Chromium context에서 실제 beta.14·선행2단계·길게 누른 뒤 손을 떼어도 설명 유지·KaTeX Main/Math 로컬 글꼴·토성 이야기 사진과 출처를 확인했다. 공개 JS/CSS/woff2 실제 응답17개 해시를 기록하고 PNG3장을 검수했다. 외부 요청·쓰기·실패 요청·JS오류0. `artifacts/qa-build19/public-web-verification.json`, `pages-ci.json`, `mobile-ci.json`과 다운로드 폴더의 READ-ME-KO.txt에 설치/검증 범위를 보관했다.

## 이전 작업 보고 (2026-09-10 · Plus 콘텐츠와 첫 판매 준비)

- 사용자 확정: **9,900원 1회 구매**, 광고·구독 없음. 정식 상품은 `skyard_plus_lifetime` / `buy`. 현재 앱은 명시적인 **베타 미리보기**이며 실결제 활성화와 구분한다(D-064). `docs/MONETIZATION-PLAN.md` 최신 절이 이전 계획을 대체한다.
- ‘배우기 → 퀴즈 → 천체물리’에 역사 이야기 10개·30문제(수치 21/선택 9)·힌트 90개와 한영 풀이·출처를 추가했다. 메모 저장·단계별 힌트·원답 재채점·재도전·복습 필터를 지원한다. `learn.history:*`를 기존 progress에 보관하며 DB 버전·미션 키·기존 점수를 바꾸지 않는다. `docs/HISTORY-QUESTS-SOURCES.md`에 문제의 가정과 수치 답 21개의 독립 검산을 기록했다.
- 심화 퀴즈·망원경 코스의 선택·저장·딥링크에 권한 검사를 연결했다. 무료 맨눈·쌍안경 미션에 지정된 심화 확인 문제 20개는 해당 활성 미션 안에서 무료로 풀 수 있다. 자동 정답 처리나 미션 키 이관은 없다. 기본 망원경 관측 도구·내 기록·획득 보상은 계속 무료다.
- Android Billing 9.1.0 브리지·계정 귀속·Google 검증·서버 승인·환불 재검증·서버 무료 권한 코드를 작성했다. **실제 상품·Google 서비스 계정·purchases 서버 배포·환불 스케줄러·SMTP·심사 접근·두 사람의 무료 권한 부여·장기 오프라인 권한은 미완료**다. `docs/BILLING-SETUP.md`의 외부 설정과 라이선스 테스트 후 live로 전환한다. preview에서는 로그인 여부와 관계없이 구매 API를 호출하지 않는다.
- 사진·댓글의 공통 아바타와 닉네임, 명시적인 공개 프로필 동기화·계정 변경 방어, 별 모자 2개·천체 배경 4개를 추가했다(D-065). 기존 보상 6개를 보존하고 공개 아바타 선택값을 개인정보처리방침에 한영으로 고지했다. 프로필 migration 202609100001을 실제 Supabase에 적용해 아바타 열·RPC·RLS와 회원 1명·댓글 0개 보존을 확인했다. 익명 수정·일반 회원의 정지 상태 수정은 차단된다. 증거: `artifacts/qa-build18/community-server-verification.json`.
- 검증: 전체 83파일·652개 단위 테스트와 lint 통과. 관련 Chromium 15개(공개 프로필·아바타·댓글)와 4개(역사/Plus·업적) 통과. 초기 dev 테스트는 기록용 HTML의 Vite 갱신과 느린 모듈 로드로 실패했고, 증거를 보존한 뒤 watch 제외·정적 preview로 재검증했다. Windows WebKit은 12개 통과·오프라인 문서 새로고침 1개 내부 오류로 미확인이다. 열린 앱의 오프라인 답 저장은 통과했으며 동일한 Chromium 대조 5개는 서비스워커 새로고침까지 통과했다. 실제 아이폰 검증과 구분한다. 최종 Android·공개 웹·서명 검증 결과는 아래에 기록했다.
- 출시 안내: `docs/PLAY-TEST-AND-PAID-LAUNCH.md`. 새 개인 계정은 내부 테스트 → 최소 12명이 14일 연속 참여하는 비공개 테스트 → 프로덕션 접근 신청 순서다. 공개 테스트는 접근 승인 후 선택한다. 실제 Console 제출·테스터 초대·거래·정식 출시는 수행하지 않았다. 일반 가입용 SMTP·상업용 날씨 API 계약·운영/심사·Apple 서명/TestFlight는 후속 준비 항목이다.
- 최종 독립 검토의 오류 복구 2건을 수정했다. 기록 읽기 실패 때 미저장 답·메모를 보존하고 오래된 응답은 무시한다. 퀴즈 제출 중 이용권 오류는 같은 runId·현재 문항·선택을 유지한 채 재확인할 수 있다. 전용 회귀 테스트 6개를 추가했다. 최초 `2a77a29` 빌드는 서명 전에 중단하고 로그를 별도 보존했으며 최종 소스로 다시 생성했다.
- **최종 빌드 완료**: 소스 `870747c964f81cdec60da06764c70949aad29357`, beta.13/build18/min24/target36. Downloads/skylog-release-0.1.0-beta.13-build18/의 **play-signed.aab**가 Play 내부 테스트 제출 파일이다. AAB 19,792,810bytes · SHA256 `c03c9e60dae1ce5efc3aab6991a1a0364994f44a3f57f3cf23c58b437a5cdd26`. 기존 업로드키·jarsigner strict·bundletool 검증, payload 1,012개 전체 서명·원본 일치. 개인 APK 20,407,416bytes · SHA256 `30527c6d96ecacf950674f121c02aaf922a5042107d4cdb5a1eff4e727e64a03`. 기존 build17 APK 인증서·16KB 정렬·앱 이름·native 507/public 480/사진 328개 일치. 로컬 Android lint 오류 0·경고 32. 검증 보고서의 이전 버전 숫자 오기를 실제 aapt 값으로 읽도록 고치고 별도 폴더에서 재검증했으며 정정 전 보고서를 보존했다. 산출물 바이트 변경은 없다.
- **공개 배포 완료**: [Pages 34461832598](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34461832598) 전체 성공, [APK 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.13-build18) 공개·인증 없는 재다운로드 SHA 일치. 공개 웹의 beta.13·10개 이야기·전문가 수치 문제·9,900원 베타 미리보기와 개인정보 페이지 원본 일치를 확인했다. [모바일 CI 34461881585](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34461881585) 전체 성공: Android release/lint·API36 에뮬레이터 오프라인 계측, iOS Xcode26 무서명 컴파일과 사진 해시 검증. 실제 휴대폰·Play 거래·Apple 서명 성공으로 간주하지 않는다. `artifacts/qa-build18/`과 다운로드 폴더의 검증 자료·`READ-ME-KO.txt`에 증거와 설치 방법을 보관했다.
- **최종 UI 회귀**: 같은 소스의 PWA 번들에서 역사/Plus·여정·관측 코스·스타호핑·학습 기록·망원경 관련 18개 E2E가 모두 통과했다(57.2초). 대표 화면 4장을 직접 확인했고 PNG 18장을 별도 보존했다. 테스트가 바꾼 추적 스크린샷 15장은 사전 해시로 복구했다. 증거: `artifacts/qa-build18/final-learning-e2e/`.

- beta.10/build15–beta.12/build17의 사진·로그인·서명·출시 준비 보고는 [릴리스 보관 기록](reports/2026-09-11-beta10-beta12-release-history.md)을 참고한다.

