# 별관찰해쌀뚜 (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-08 · 갱신자: Codex 로컬 · beta.5/build10 오늘 밤·달력·코스·풍경 검증 중
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- 모바일 빌드: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/mobile.yml
- 스토어 준비/서명/테스트: `docs/MOBILE-RELEASE.md`, `docs/STORE-LISTING.md`

## 이번 작업 보고 (2026-09-08 · beta.5/build10 오늘 밤·코스·풍경)

- **최신 기준**: 작업 전 깨끗한 main을 원격 `74b764f`까지 fast-forward했다. 첨부 build9 ZIP은 단일 APK이며 공개 build9와 SHA256이 일치한다. build9의 자동 센서·원형 하늘·태양/달 크기·업적48·장비/진도 기능을 보존했다.
- **구현 요약**: ‘날씨’ 탭에 기온/구름/비/바람·시간별 예보를 먼저 표시하고, 밤하늘과 상세는 요약/펼치기로 정리했다. 9월/10월 버튼 오류와 선택 구간보다 길게 보이던 맑은 시간의 끝을 수정했다. 목록 기본 + 월간/연간 달력, 월말 자동 전환, 연간 ICS 내보내기를 추가했다. 코스는 맨눈/쌍안경/망원경→세부 코스이며 망원경 안에 스타호핑 입문6개를 둔다. ‘시야0.2개’는 ‘보이는 원 너비의 약20%’로 풀었다.
- **풍경**: 새로 생성한 낮은 잔디/꽃 이미지가 기본으로 켜진다. 아래를 바라보면 중심고도0°→−28°에 지면과 함께 투명해진다. 사용자 투명도·관측 가능 판정·태양 차단·천체 좌표·기존 데이터 팩/DB v2는 유지한다. WebP 331,322bytes를 PWA/native에 포함한다.
- **결정/자료**: D-042(날씨·달력), D-043(장비별 코스·자연어), D-044(장식 풍경과 자동 투명화). 공식 디자인 참고·생성 프롬프트·시나리오는 `docs/TONIGHT-REFRESH.md`에 있다. 새 패키지 없음.
- **자동 검사**: 단위500개 전체와 추가 날씨 경계 회귀 검사가 통과했다(현재501개). 전체 브라우저는56통과/1실패였고, 센서 끄기 테스트가 Dexie 저장 완료 전 새로고침하던 문제를 실제 저장값 확인으로 수정했다. 타입/lint·관련 브라우저11개 재검사 통과. 고유 브라우저58개를 전체 실행+관련 재검사로 확인했다. native CI는 진행 예정이며 최종 결과를 아래에 기록한다. 고정 sleep이나 실패 숨기기 재시도는 추가하지 않았다.
- **버전/배포**: 앱beta.5, 이번 Android/iOS번호10, 다음 CI기본11. 웹·모바일 CI와 AAB 서명 확인 후 산출물 링크를 추가한다. 이 PC에는 기존 Play 업로드 키가 있으나 build9 개인 APK 테스트 키는 없어 새 키로 대체하지 않는다.
- **사용자 액션/남은 범위**: 휴대폰에서 날씨/달력/코스 진도/잔디 투명화를 확인한다. ICS는 가져오기 시점의 일정이며 자동 동기화되지 않는다. 서명된 iPhone IPA·Play 내부 테스트/스토어 심사·실기기 성능은 별도다. 추가 GPT Pro 요청은 없고 T5/T7/T8 완료 태그는 만들지 않는다.

## 이전 작업 보고 (2026-09-08 · beta.4/build9 하늘·업적·센서 개선)

- 원격 main 최신 `9e386818adc5cf2fccc685f7aa8306e501daef37`를 fetch로 확인한 뒤 갱신했다. 앱 소스 `377a665c0118b05f91192f231caba360a26e4388`, 태그 `v0.1.0-beta.4-build9`, Android/iOS build9, 다음 CI 기본값10.
- 새 하늘 기본값: 별자리 경계 끄기, 은하수 0.33, 지면 불투명도 1, 별 채도 1. 별 표시 1.2배와 은하수의 밝은 띠·어두운 먼지 결·색을 개선한다. 겹치는 지면 설정은 단일 슬라이더로 정리하고 기본값 복원을 추가했다. 별 좌표·실제 관측 판정은 유지한다. D-038.
- 태양·달은 넓은 시야에서도 최소 지름 24 CSS px로 표시하며 확대/축소 후 선택 반경을 함께 갱신한다. 실제 각지름·태양 안전 차단과 화면상 표시 크기를 구분한다.
- 시야원은 쌍안경과 망원경 두 개를 각각 켜고 끈다. 사용자가 알린 장비는 솔로몬 HQ 8×42 ED와 SV48P 102mm다. 시작 시야 7.50°와 102mm/663mm+25mm/52° 접안 조합의 약 1.96°는 사용자가 허용한 **기본 예시**이며 실제 사양을 입력해 바꾼다. 커스텀/DB 저장 장비는 유지하고 저장 ID 없는 정확한 구형 기본 프로필만 갱신한다. D-039.
- 업적 48개를 `learn/v2` 팩으로 확장했다(기존 18개 ID/규칙 보존). 코스·미션·퀴즈는 v1 유지, 기존 학습 진도·백업과 호환한다. 단계·진행도·다음 업적 안내를 추가했으며 T7 전체 완료는 아니다. D-040.
- 센서 이벤트 사이를 렌더 프레임에서 보간하고 React 상태 알림과 Dexie 동일 설정 반복 쓰기를 줄였다. 순수 합성 검증에서 각속도 RMS 오차는 기존의 절반 미만, 평균 추가 지연 25ms 미만, 기존 필터 포함 90° 스텝은 150ms 이내다. 실제 휴대폰 FPS 수치는 아직 측정하지 않았다. 중단/상대 yaw/수동 드래그 규칙 유지. D-041.
- **포맷 검사 참고**: 전체 `pnpm format:check`는 Android 생성 lint HTML의 parser/생성 assets 때문에 실패했다. 변경 파일의 Prettier 검사는 통과했다. 생성 파일 검사 문제를 앱 기능 실패나 전체 검사 통과로 바꾸어 기록하지 않는다.
- **자동 검사**: typecheck·lint·데이터 검증·PWA/native 빌드 통과. 단위 493개, 브라우저 고유 시나리오 54개 통과(workers=1). 전체 실행 후 지면·달 픽셀 측정을 보완하고 달 가림 수정 관련 검사를 재실행했다. 변경 파일 Prettier·diff 검사 통과. 전체 format:check는 기존 Android 생성 lint HTML/생성 assets 문제로 실패했으며 앱 검증과 구분한다. QA: artifacts/qa-build9. 은하수33%/최대·큰 별·달/태양·지면·장비·업적 화면 확인.
- **산출물·공개**: `Downloads/skylog-release-0.1.0-beta.4-build9/`. [APK 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.4-build9). 개인 APK 7,213,385 bytes, SHA256 `efdfca31d55dfeb707d7d914b1a404bb14cb8d543b52f6f3549d4a4db75e761f`. unsigned AAB 6,922,904 bytes, SHA256 `80b8b0d4c8cbeede255957033b000d8fef5be0628f4d03e43277118b5367b7c5`. bundletool·API36/min24/version9·release/backup=false·APK 서명/16KB 정렬·build8 인증서 일치 확인. AAB/APK/native public 162개 SHA256 일치. Android lint 오류0/경고33.
- **CI/PWA**: [Pages 34203144579](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34203144579)와 [모바일 34203144730](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34203144730) 전체 성공. Android API36 인터넷 차단 WebView 계측과 iOS Xcode26 arm64 무서명 컴파일 통과. 공개 웹 beta.4·새 기본값·업적48·원형 하늘·SW·재실행·JS 오류0 확인. 공개 APK를 다시 다운로드해 크기/해시 일치 확인. 실제 휴대폰 센서/FPS·iPhone 설치용 서명 IPA를 검증한 것은 아니다.
- Play 업로드 키 복원/최종 AAB 서명, Apple 팀/서명 Archive/TestFlight, 실제 Android/iPhone 설치·센서·그래픽과 스토어 심사는 남는다. 현재 전 기능 무료, 결제/무료 이용권은 설계 단계. T5/T7/T8 전체 완료 태그 없음. 설치·실기기 확인은 `docs/INSTALL-ON-PHONE.md`, 릴리스 상세는 `docs/MOBILE-RELEASE.md`.

## 이전 작업 보고 (2026-09-08 · beta.3/build8 가독성·자동 센서)

- 원격 main 최신 bfa7109를 fetch로 확인하고 build7 위에서 갱신했다. 앱 버전 0.1.0-beta.3, Android build8, 다음 CI 기본 번호9. 천문 좌표·별 개수·데이터 팩·DB v2는 유지한다.
- 별자리 연결선·경계를 두 테마 모두 흰색으로 고정하고 기존 투명도 설정에서도 대비를 높였다. 밝은 별 중심과 최소 표시 크기를 키웠다. 은하수 색/밀도/투명도의 중복 감쇠를 제거해 밤에 띠와 먼지 결이 보이게 했다. 실제 낮에는 대기 효과가 은하수를 가리며 하늘 설정에 설명한다. D-036은 D-034의 야간 전부 적색 원칙 중 별자리 선/경계만 수정한다.
- 첫 하늘 화면은 작은 접힌 시간 버튼과 반투명 52px 탭을 사용한다. 원형 하늘·별길·실제 하늘·선택 정렬은 하늘 설정으로 모았다. 글자 확대 시 탭/상태 높이가 늘며 AR 안내와 목표·좌표 HUD는 실제 높이로 배치한다.
- 방향 센서는 기본 자동 시작하며 끄기 선택을 저장한다. iPhone의 최초 동작 권한은 사용자 탭에서 요청한다. 북 기준이 없는 상대 yaw는 화면을 회전시키지 않으며 잠시 평평하게 들도록 안내한다. 고정 링크·원형 하늘에서는 센서가 차트를 덮어쓰지 않는다. 위치는 자동 사용 설정과 권한에 따라 앱 시작/복귀 시 한 번 갱신하고 저장 관측지 선택/꺼짐을 유지한다. 같은 GPS 이름이어도 먼 좌표의 예전 별 보정은 복원하지 않는다. D-037.
- typecheck/lint/단위433/데이터 검증/PWA 빌드 통과. 브라우저48개 항목 통과: 전체47 중 픽셀 검사용 preserve 캔버스 복귀 오류를 고친 후 관련20개와 마지막 UI 변경 관련14개를 다시 통과했다. 흰 선·은하수·큰 별·360px/글자200%·자동 센서/GPS 확인. 캡처와 로그는 artifacts/qa-build8. 같은 목표의 중복 정보 카드를 숨기고 센서 거부 안내를 줄여 큰 글자에서도 목표 HUD가 화면 안에 보인다.
- 앱 소스 `e17373169c2475183f424be81031fb28f7fc939c`를 main에 반영했다. [Pages 34195531010](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34195531010) 성공. 공개 웹 beta.3·작은 기본 UI·원형 하늘·SW·재실행/JS 오류0 확인. [APK 사전 릴리스](https://github.com/JunhyoungPark-NOBEL/skylog/releases/tag/v0.1.0-beta.3-build8)의 태그는 같은 앱 소스이며 실제 공개 APK를 다시 내려받아 해시를 대조했다.
- **개인 APK 완료**: `Downloads/skylog-release-0.1.0-beta.3-build8/skylog-0.1.0-beta.3-build8-local-test.apk`, 7,200,927 bytes, SHA256 `8adb1e44357b3631849ce6f604e9acf7395227d39a71da8dfba5fa6089ff450f`. build7 APK와 실제 인증서 대조 통과. 기존 개인 체험판을 삭제하지 않고 업데이트한다.
- **unsigned AAB 완료**: 같은 폴더 `skylog-0.1.0-beta.3-build8-unsigned.aab`, 6,913,704 bytes, SHA256 `d92406690d512d9e01bc4e8c94cc1615af88cc465ec7b00f40025c4e3be88698`. bundletool·API36/min24/version8·release/backup=false 확인, APK 서명/정렬 성공. AAB·APK·native public 160개 파일 SHA256 일치. 로컬 Android release/lint 성공(오류0/경고33).
- [모바일 CI 34195530826](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34195530826) **전체 성공**: Android release/lint·인터넷을 끈 API36 실제 WebView 계측, iOS Xcode26 arm64 무서명 컴파일. iPhone 설치용 서명 IPA는 아니다.
- Play 업로드 키 복원/최종 서명, Apple 팀 서명/TestFlight, 실제 Android/iPhone의 센서·그래픽 확인과 스토어 심사는 남는다. 현재 기능은 모두 무료이며 유료 상품/서버 권한은 구현하지 않았다. T5/T7/T8 전체 완료 태그 없음.

이전 build7 보고는 [보관 보고](reports/2026-09-08-build7.md)를 참고한다.

이전 build6 상세 창 스와이프 기록은 [보관 보고](reports/2026-09-08-build6.md)를 참고한다.

이전 build5 완료 기록은 [보관 보고](reports/2026-09-08-build5.md)를 참고한다.

이전 build4 완료 기록은 [보관 보고](reports/2026-09-08-build4.md)를 참고한다.

- GitHub 저장소: https://github.com/JunhyoungPark-NOBEL/skylog (public, main)
- 배포 URL (GitHub Pages): **https://junhyoungpark-nobel.github.io/skylog/** (Actions 소스, `main` push마다 자동 배포)
- Actions: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/deploy.yml
- 개발 환경 경로: **A(Claude Code 로컬) 확정** — D-007. 로컬 폴더 `C:\Users\JunhyoungPark\OneDrive\Desktop\별관찰해쌀뚜`(OneDrive로 두 PC에 동기화됨; 두 PC 모두 Node 24·pnpm 12·gh 로그인·Playwright 준비).

## 태스크 현황

| 태스크 | 상태 | 완료일 | 태그 | 비고 |
|---|---|---|---|---|
| T0a 저장소·셸·테마·i18n·DB v1·PWA·배포·테스트 하네스 | ✅ 완료 | 2026-09-06 | | 실기기 통과 |
| T0b 데이터 파이프라인·데이터 팩 v1·`src/astro`·G3 입력 | ✅ 완료 | 2026-09-07 | task-0-done | G2 병합(D-016) |
| T1 천구 렌더러 | ✅ 완료 | 2026-09-07 | task-1-done | 실기기 통과(방위·별자리 Stellarium과 일치) |
| T2 센서 연동(AR 모드) | ✅ 완료 | 2026-09-07 | task-2-done | 실기기 통과("문제 없이 잘 돼", 덤프 없음 → D-018 기본값 유지) |
| T3a 검색·상세·찾아가기·박명/달 위젯 | ✅ 완료 | 2026-09-07 | (task-3-done은 T3b 후) | D-019. e2e 16개·Vitest 141개 통과. 실기기 체크리스트 전달 |
| T3b 날씨·추천·오늘 밤·천문 현상·실제 하늘처럼 + UI 리프레시·카피 | ✅ 완료 | 2026-09-07 | task-3-done | D-020·D-021. 7Timer는 CORS 불가로 생략. 실기기 체크리스트 전달 |
| T4 관측 기록·북마크·통계 | ✅ 구현 완료 | 2026-09-07 | task-4-done | 자동 검증 통과, 새 실기기 체크리스트 전달 |
| T5 망원경/쌍안경 가이드 | 🟡 구현·자동 검증 완료, 실기기 대기 | | | 별길 가이드(+Y 상대 센서), 장비/FOV/정렬/차트/스타호핑/업적. D-029. 실기기 반영 후 태그 |
| T6 콘텐츠 팩(AI 요약 스토리) | ✅ 구현 완료 | 2026-09-07 | task-6-done | 121개 게시, needsReview 112개 유지 |
| T7 학습 시스템 | 🟡 진행 중 | | | 하늘28+관측12스테이지. 6코스·미션30/30·배지48(기존18+확장30)·퀴즈204/240 활성. skyPick36·하루 복습 상한·배지 이력 후속 |
| T8 마감·품질·릴리스 | ⬜ 대기 | | | |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ✅ 반영(D-018) | `plan/research/G1-sensors-ux.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ✅ 병합 완료(D-016) | `plan/research/G2-korean-names.md`, `*.csv`, `28-mansions-ko.md` |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | ✅ **121개 앱 반영(2026-09-07)** — G3+G5 통합팩. 정본은 `G3/G3-content-cumulative-121.json`(이전 배치·누적80과 중복 병합 금지). needsReview 112개(거리·등급 대역 보류 등)는 표시 정책으로 처리 | `plan/research/G3-G5-integrated/`(전체 팩, archive zip 제외), 항목별 분할 원본 `data-src/content-raw/G3-original/`, 자연어 재작성본 `data-src/content-raw/G3-natural/`(T6) |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | 🟡 지금 요청 가능 | `astro/pointing.ts`, `astro/finder.ts`, `sensors/telescopeOrientation.ts`, `sensors/orientation/{math,filter,calibration}.ts`, 관련 단위 테스트. docs/TESTING.md에 첨부 목록 |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | ✅ 앱 반영. G5 180문항 중 skyPick36만 잠금. 2026-09-08 T5 연결로 미션30·배지18 활성, 독자 작성 한·영 관측60문항 추가로 총240/활성204. 별자리 배지는 실제 별자리 관측 기록만 인정 | `plan/research/G3-G5-integrated/G5/`(정본 유지), 추가 `data-src/learn-raw/observing-quiz.json`. 옛 준비팩은 참고용 |

## 다음 세션이 알아야 할 것

- **학습 탐색/스테이지(D-026)**: features/learn의 LearnScreen → QuizJourney/CoursesScreen/StoriesScreen/AchievementsScreen. 해시 section/path/mission/chapter로 복원하며 하단 탭 복귀 시 마지막 배우기 경로 유지. stageCatalog는 144문항을 중복 없이 고정한 28단계, 정답률 80% 해제·60/80/100% 별, 개인 합계는 단계별 최고점만. stage/question 버전을 함께 검증하며 마지막 응답과 완료 기록은 원자 저장. 기존 미션/응답/복습/관측 유지, 새 도장은 새 여정을 완주해야 획득한다. 리더보드는 아직 로컬 점수 기반만 준비됨.
- **하늘 설정(D-038)**: `groundOpacity` 기본1, 단일 슬라이더와 기본값 복원. 불투명도1이면 지평선 아래 표시·선택을 함께 막고1 미만이면 함께 허용한다. layers persist v2로 이전 옵션을 이관한다. 기본 경계 false·은하수0.33·별 채도1, 저장된 커스텀 설정은 보존한다. 실제 관측 가능 판정은 그대로다.

- **다음 작업**: T5 실기기 정렬/드리프트 결과와 G4 반영 → T7 잔여(skyPick 36, 하루 복습 누적 상한·배지 이력/연출) → T8. G3/G5 추가 생성은 불필요. 사용자는 솔로몬 HQ 8×42 ED와 SV48P 102mm를 사용한다. FOV/접안 사양은 시작 예시로 두고 직접 입력하도록 요청했다. 7.50°·25mm/52°를 실제 장비 사양으로 단정하지 않는다(D-039).
- **학습/콘텐츠**: 한국어 재서술본은 data-src/*-raw/*-natural, 게시본은 public/data/{content,learn}/v1이며 확장 업적48개는 public/data/learn/v2다. 기존18개 ID/규칙과 코스·퀴즈 v1을 보존한다(D-040). `pnpm data:content` 다음 `pnpm data:learn`; CI는 이야기121/G5원본180+추가60 참조와 근거를 검증한다. 새 관측12단계는 별도 observingStages.json이며 기존 stageCatalog 28단계를 변경하지 않는다. 수치 검토112·G2 이름42는 docs/CONTENT-REVIEW.md. 새60문항은 전부 영어 제공, 기존 장문 전체 번역은 후속이다.
- **환경**: 이 실행은 Codex 데스크톱 로컬. Node 24.19.0·portable pnpm 12.3.4(`%LOCALAPPDATA%/skylog-tools/pnpm-12.3.4/package`를 PATH 앞에 둠), Git Credential Manager JunhyoungPark-NOBEL 인증 완료(gh CLI 없음). 새 PC Chromium 1243은 설치 완료. 이번 실행은 파일/네트워크 접근 가능(이전 세션의 읽기 전용 제한은 현재 해당 없음).

- **T2 실기기 통과**(2026-09-07, 사용자 보고 "문제 없이 잘 돼"). 덤프·기기 정보는 받지 못했으므로 D-018의 기본값(compassAxis='top', iOS 편각 적용, 필터 상수)을 그대로 둔다. 문제가 보고되면 센서 디버그 "덤프 복사" 텍스트로 원인을 특정한 뒤 테스트 벡터부터 고친다.
- 센서 관련 진입점: `sensors/orientation/manager.ts`(`sensorManager` 싱글턴: start/stop/nudge/setCalibration/currentAltAz), `state/sensorStore.ts`, `features/sky/ArToggle.tsx`·`CalibrationWizard.tsx`, 시뮬레이터 `features/sky/SensorSimPanel.tsx`(설정 → 개발자 → 센서 디버그에서 켬). 테스트 훅 `window.__skylogSensor`(스토어 상태).
- 부호 규약·파이프라인은 `docs/ARCHITECTURE.md` "센서 파이프라인"과 D-018. **"대충 맞을 때까지" 부호를 바꾸지 말 것** — 실기기 덤프로 원인을 특정한 뒤 테스트 벡터를 먼저 고친다.
- **기록·학습 진입점**: db/repos/observations.ts, state/logStore.ts, features/log/ObservationFormHost.tsx, learn/runtime.ts. ObjectSheet의 기록·이야기 액션은 실제 화면에 연결됐다. T5 장비 CRUD API는 db/repos/equipment.ts.
- **T5 진입점**: 하늘 ◎/ObjectSheet `sheet-telescope`/학습 미션→`#/telescope`; 설정→`#/equipment`. `telescopeStore`의 장비 프로필이 추천/시트에도 적용된다. 상대 센서 재시작 뒤 저장된 정렬을 자동 재사용하면 안 된다(D-029). 윗변 +Y 기준이며 영상 plate solving은 없다.
- **UI 규칙(D-021)**: 새 화면은 `docs/ARCHITECTURE.md` "UI 디자인 시스템 v2"와 토큰(`theme.css`)만 쓴다. 검색/오늘 밤/기록은 App의 `pt-status pb-tab` 래퍼를 쓴다. 배우기는 D-026: 자체 고정 제목·상단 4개 메뉴 + ScrollArea(pb-tab), 위치/센서 상태바는 생략한다. 카피는 D-021 용어집(해요체·평이한 용어)을 따른다.
- **스크롤 규칙(D-022)**: 세로 스크롤 영역은 `ui/ScrollArea.tsx`(마우스 드래그 스크롤·관성·페이드 오버레이)로 만든다. 스크롤러에 `mask-image`를 걸지 않는다. 드래그 스크롤이 닿으면 안 되는 컨트롤은 `touch-action: none` 또는 `data-drag-scroll="off"`. 사용자 보고("스크롤이 뻑뻑하고 스크롤 바를 정확히 눌러야 함")에 대한 수정이며, 실기기 확인은 T3b 체크리스트의 스크롤 항목으로 받는다.
- **주의(이 세션에서 겪은 것)**: 워크플로 에이전트가 "코드 스케치를 써 달라"는 프롬프트를 실제 경로에 파일을 만들었다가 지우는 바람에 `src/astro/phenomena.ts`가 사라진 적이 있다. 리서치용 에이전트 프롬프트에는 **"파일을 만들거나 고치지 말 것"**을 명시한다.
- **최신 검증**: 위 beta.4/build9 보고와 앱 소스 `377a665c0118b05f91192f231caba360a26e4388`를 따른다. 단위493·브라우저54·APK/AAB·Pages·모바일 CI 통과. T8 청크 분할·실기기 센서/성능은 잔여다.
- 데이터 원본(`data-src/raw/`)은 gitignore이며 새 환경에서 재생성할 때 원본 확보가 필요하다. 현재 실행 경로와 pnpm PATH는 위 **환경** 항목을 따른다. 과거 OneDrive PC 경로를 현재 작업 경로로 사용하지 않는다.
- **사용자 장비**: 솔로몬 HQ 8×42 ED, SVBONY SV48P 102mm(제조사 초점거리663mm). 사용자 요청으로 쌍안경 시야7.50°·접안25mm/52°는 시작 예시이며 직접 입력하도록 한다. 마운트/실제 접안 사양은 확정하지 않았다. 관측지는 자동 GPS 또는 사용자가 고른 저장 장소·보이는 범위를 따른다.

이전 T3b/T4/T5/T6·학습 UX 보고는 [기능 개발 보관 기록](reports/2026-09-08-pre-mobile-history.md)을 참고한다.

## 결정 기록 요약 (`DECISIONS.md` 전체 참조)

- 2026-09-06: PWA / 로컬 우선 저장 / Claude 세션 실행 / 데이터 라이선스 정책 — 마스터 플랜 §2
- 2026-09-06 (T0): D-007 환경, D-008 라이선스, D-011 해시 라우터, D-012 i18next, D-013 툴체인, D-014 데이터 팩 v1, D-015 astro 래퍼
- 2026-09-07: D-016 G2 병합 규칙, D-017 T1 렌더러, D-018 T2 센서 계층, D-019 T3a 검색·상세·찾아가기·관측 밤

- 2026-09-07 통합: D-023 관측 DB/백업, D-024 자연어 이야기, D-025 학습 연결/잠금 정책. T0~T2 보고는 plan/reports/2026-09-07-t0-t2.md.

- D-026(2026-09-07): 배우기 탐색 분리·퀴즈 여정·버전/점수/보존 규칙.
- D-027(2026-09-07): 기본 반투명 지면·지평선 아래 천체 표시, 관측 판정 분리.
- D-028(2026-09-08): 독립 관측 퀴즈 코스와 오늘 밤 정보 분리.
- D-029(2026-09-08): 별길 가이드의 물리 윗변·상대 센서·정렬/장비/시야·실제 업적 이벤트.

- D-038~D-041(2026-09-08): 하늘 기본값·단일 지면/천체 표시, 두 장비 시야 예시, 업적 v2/기존 진도 호환, 센서 프레임 보간·Dexie 중복 쓰기 제거.
