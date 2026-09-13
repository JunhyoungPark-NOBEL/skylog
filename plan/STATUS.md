# 스카이야드 Skyard (skylog) — 진행 상황 (STATUS)

> 마지막 갱신: 2026-09-13 · beta.21/build27 하늘 조작 최소화·통합 설정 · 최종 검증/배포 진행 중
> 새 세션은 이 문서 → `00-master-plan.md` → 해당 `task-0N-*.md` 순서로 읽는다.

## 링크

- 이전 AAB(build26): 로컬 `Downloads/skylog-release-0.1.0-beta.20-build26/app-release.aab`(**서명 전**) · 서명 인계 `Downloads/skylog-0.1.0-beta.20-build26-signing-kit.zip` · [개선/확인 보고](../docs/SKY-REFINEMENT-BUILD26.md).

- 이전 AAB(build25): 로컬 `Downloads/skylog-release-0.1.0-beta.19-build25/app-release.aab`(**서명 전**) · 서명 인계 ZIP `Downloads/skylog-0.1.0-beta.19-build25-signing-kit.zip`. 연구실 기존 키로 마무리한다.

- 앱: https://junhyoungpark-nobel.github.io/skylog/ · 내 프로필: https://junhyoungpark-nobel.github.io/skylog/#/profile
- 이전 서명 산출물(build24): 로컬 `Downloads/skylog-release-0.1.0-beta.18-build24/skylog-0.1.0-beta.18-build24-play-signed.aab` · [APK 다운로드](https://github.com/JunhyoungPark-NOBEL/skylog/releases/download/v0.1.0-beta.18-build24/skylog-0.1.0-beta.18-build24-local-test.apk)
- 모바일 빌드: https://github.com/JunhyoungPark-NOBEL/skylog/actions/workflows/mobile.yml
- 스토어 준비/서명/테스트: `docs/MOBILE-RELEASE.md`, `docs/STORE-LISTING.md`

## 이번 작업 보고 (2026-09-13 · 간결한 하늘 조작 / build27)

- 최신 main/origin 3268f9d(build26 후속 기록)에서 시작했다. 하늘 화면은 좌상단 설정 하나와 그 아래 아래꺾쇠 메뉴, 우상단 시계 아이콘, 하단 중앙 GPS, 오른쪽 아래 카메라 아이콘으로 배치했다. 하늘에서는 하단 5탭을 접이식 메뉴로 대체하고 콘텐츠 화면의 하단 탭은 유지한다.
- 설정 하나 안에서 하늘·GPS·앱으로 구분한다. 기존 하늘 레이어·테마·언어·장비·관측지 설정을 보존한다. 연결 실패·정렬 도움말은 설정/망원경 더보기 안에서 확인한다.
- GPS 끄기는 현재 실행 동안만 유지하고 앱 새 실행에서는 자동 연결을 시도한다. 이전 버전의 저장된 autoStart=false를 무시하되 권한 거부는 존중한다. 지면 투명도는 신규 설치/기본값 복원 시0%(groundOpacity=1)이며 기존 사용자 조절값을 보존한다.
- 360px/200% 글자, 키보드 메뉴 이동/닫기, 카메라·시간·통합 설정과 기존 센서/망원경 경로를 검사한다. typecheck·전체 lint·단위772개·PWA 빌드 통과. 전체 브라우저113개 중112개 통과 후, 통합 설정의 이전 테스트 절차와 하늘을 유지한 채 야간 전환 시 CSS/렌더 팔레트 갱신 순서 문제를 수정했다. 최종 하늘·메뉴·설정16개 재검사 모두 통과, 별/지면의 적색 픽셀도 확인했다. 360px·200% 글자에서44px 터치 영역과 메뉴·GPS·카메라 간격을 확인했다. 배포 결과는 아래에 추가한다. 상세 docs/COMPACT-SKY-BUILD27.md, 결정 D-073.

## 이전 작업 보고 (2026-09-13 · 확대 안정화·메인 하늘 안내 / build26)

- 최신 origin/main 6bf4e5e와 일치하는 상태에서 시작했다. 확대 시 강한 평활과 움직임의 일관성을 함께 판단하는 quaternion 필터를 적용했다. 30/60/90Hz 합성 3° 시야 시험에서 잔여 RMS 15% 미만, 일정 이동 추종 및 줌/재연결 연속성을 검사한다. 실기기 측정으로 해석하지 않는다.
- 설정·하늘 설정·시간을 상단에 모으고 카메라는 설정 안으로 옮겼다. 별도 수동 복귀 패널 없이 하단 GPS 센서 버튼을 사용한다. GPS는 위치, 나침반/자이로는 방향이라는 설명을 설정에 둔다.
- 망원경 찾기는 메인 하늘과 파인더·접안 원으로 통합했다. 물리 +Y 추적·한 별/두 별 정렬·GoTo 좌표·보조 차트는 유지한다. 실제 안내의 시간 이동은 막고 보조 화면은 하단 탭 위에 둔다.
- 스타호핑은 배우기 코스에서만 안내한다. 6개 코스의 밝은 기준별과 이름, 단계별 맥락도/파인더 원·복귀 팁·체크포인트를 제공한다. 코스 ID·기존 진도·업적·관측 저장 규칙은 유지한다.
- **자동 검증**: typecheck·전체 lint·772개 단위 검사·PWA 빌드 통과. 전체 Chromium111개 중110개 통과 후 열린 패널을 닫지 않은 테스트 절차1개를 수정했고, 그 항목을 포함한 하늘·망원경·코스19개를 최종 재검증해 모두 통과했다. 360px 영어/야간, 메인 시야 원·+Y 추적, 코스 지도 왕복/복원을 확인했다. 스크린샷에서 겹치는 길잡이별 이름을 배치/연결선으로 분리하고 고밀도 캔버스 글자를 개선했다.
- 상세 docs/SKY-REFINEMENT-BUILD26.md, 결정 D-072. 자동 검증/웹 배포/모바일 CI의 최종 결과는 아래와 같다. S24+ 실제 손떨림·광학 정렬은 사용자 확인 대상이다. 연구실 기존 키가 없어 Android는 무서명 AAB와 동일 키 확인 도구로 인계한다.

- **최종 배포/산출물**: 실행 소스 `7730a5cc3b38886275d2163b29e0fd8e5b391f4b`, 태그 `v0.1.0-beta.20-build26`. [Pages34708595022](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34708595022)·[모바일34708594801](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34708594801) 성공. Android release/lint(오류0, 기존 경고32)·API36 오프라인 계측2개 및 iOS 무서명 Release 컴파일을 확인했다. CI 원본 XML의 failures/errors=0을 재확인했다. 공개 웹200·beta.20 JS·상단 설정/메인 시야 원/코스 왕복·새로고침, JS오류0·서버쓰기0이다. AAB **20,785,236bytes**, SHA256 `ffb79695a018737cf5acb2a148e46f8174ade62ecc073b8d4a3c426ae60e3b06`. bundletool validate·앱ID/버전26·CAMERA/마이크 없음·정적 파일480개 원본 비교를 통과했다. ZIP8항목의 AAB 해시도 동일하다. 파일은 **무서명**이며 연구실의 기존 Play 업로드키로 마무리한다. 물리 S24+ 감각/접안 정렬·Play 제출/심사·Apple 배포 서명은 별도다.

## 이전 작업 보고 (2026-09-13 · S24+ 센서·카메라·기록 / build25)

- 연구실 최신 main b481144(beta.18/build24)을 먼저 반영하고 시작했다. 탭/핀치는 센서 유지, 실제 드래그만 수동 전환, 5초 자동 복귀 제거, 천정에서 quaternion 평활, 화면 픽셀 기준 필터와 네이티브60Hz 입력을 적용했다. 밝은 별 정렬을 사용하는 비자기식 자이로 선택을 추가했다.
- 하단 센서/보정과 후면 카메라 겹치기(영상 밝기·시야 조절)를 제공한다. 안내 패널이 시간 버튼을 가리지 않도록 독 안에서 배치하며 상단 목표는 하늘 도구 아래에 둔다. 영상은 저장/전송하지 않고 종료·백그라운드·늦은 권한 응답을 정리한다.
- 평점·시상·투명도 UI를 제거하되 과거 저장 값은 편집/백업에 보존한다. 종류별 기록 태그,8색 스케치, PNG 내보내기·커뮤니티 초안 공유를 추가했다. 공유 초안에는 위치/메모가 없고 게시 동의 전 전송하지 않는다.
- 별 색을 등급·거리 옆에 표시하며 별 크기/색 대비·확대 표시 행성 크기(약2배)를 높였다. 탭 시점 대상을 고르고 화면 거리 우선/주변 원뿔 선별/소광 판정으로 선택 정확도와 계산 비용을 개선했다. 이야기·퀴즈·지평선·커뮤니티의 연구실 변경은 유지한다.
- 자동 검증: 타입/lint,108파일766단위 검사 통과. 전체 Chromium109개 통과(2.5분), 최종 공유 권한/카메라/기록·댓글 관련12개도 추가 통과했다. 360px/200% 하늘 안내·목표·버튼 비겹침과 스케치 PNG 내보내기·로그인 전 공유 차단·개인 메모 미전송을 확인했다. 초기 전체검사에서 하단 안내의 시간 버튼 가림/목표 위치 의존성을 찾아 수정했고, 연구실에서 바뀐 업적 카드의 오래된 테스트 선택자를 실제 버튼/획득 상태로 갱신했다. 상세 docs/FIELD-USE-BUILD25.md, 결정 D-071.
- **서명 경계**: 연구실 build24 Play 키 f5ad…98bd와 이 PC의37e1…6443은 다르다. 키 교체/생성 없이 AAB 원본을 만들고 기존 키가 있는 연구실에서 동일 인증서 검증 후 서명하는 도구를 준비했다. 무서명 AAB는 Play 제출 완료본이 아니다. S24+ 물리 센서·카메라 느낌은 사용자 확인이 필요하다.

- **최종 검증/배포**: 실행 소스80eb31730890feff8e100c1224c533c36e2c3c6d, beta.19/build25. [Pages34704907732](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34704907732)·[모바일34704907215](https://github.com/JunhyoungPark-NOBEL/skylog/actions/runs/34704907215) 성공(Android release/lint/오프라인 에뮬레이터·iOS Release 컴파일). 공개 페이지200·beta.19 JS·별 색/카메라/자이로 UI·JS 오류0·서버 쓰기0 확인. AAB20,779,731bytes, SHA256 1f472c9fdf7151ae55e54a030ca19e7a782412e275d435e15ba669e89a6ebfb5. bundletool validate·정적 파일480개 원본 비교·버전/앱ID/CAMERA 권한·마이크 권한 없음 검증. 기존 집 키의 오서명 차단도 실행 검증했다. 이 AAB는 **무서명**이며 연구실의 기존 Play 키로 서명해야 한다.

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
| T9 무료 마당·커뮤니티 | 🟡 구현·서버 검증, 개통 준비 | 2026-09-08 | | SMTP·운영자 앱 계정·실기기 대기. docs/FREE-COMMUNITY.md |

## GPT Pro 요청 현황 (`gpt-pro-requests.md`)

| 요청 | 시점 | 상태 | 산출물 위치 |
|---|---|---|---|
| G1 모바일 브라우저 센서 API·앱 UX 벤치마크 딥리서치 | T2 전 | ✅ 반영(D-018) | `plan/research/G1-sensors-ux.md` |
| G2 한국어 천체 이름·별자리 이름·전통 별자리 표 | T0 중 / T6 전 | ✅ 병합 완료(D-016) | `plan/research/G2-korean-names.md`, `*.csv`, `28-mansions-ko.md` |
| G3 콘텐츠 팩 생성(유명 천체 ~120개) | T6 전 | ✅ **121개 앱 반영(2026-09-07)** — G3+G5 통합팩. 정본은 `G3/G3-content-cumulative-121.json`(이전 배치·누적80과 중복 병합 금지). needsReview 112개(거리·등급 대역 보류 등)는 표시 정책으로 처리 | `plan/research/G3-G5-integrated/`(전체 팩, archive zip 제외), 항목별 분할 원본 `data-src/content-raw/G3-original/`, 자연어 재작성본 `data-src/content-raw/G3-natural/`(T6) |
| G4 센서·정렬 수학 코드 2차 리뷰 | T2·T5 후 | 🟡 지금 요청 가능 | `astro/pointing.ts`, `astro/finder.ts`, `sensors/telescopeOrientation.ts`, `sensors/orientation/{math,filter,calibration}.ts`, 관련 단위 테스트. docs/TESTING.md에 첨부 목록 |
| G5 퀴즈·미션 콘텐츠 생성 | T7 전 | ✅ 앱 반영. G5 180문항 중 skyPick36만 잠금. 2026-09-08 T5 연결로 미션30·배지18 활성, 독자 작성 한·영 관측60문항 추가로 총240/활성204. 별자리 배지는 실제 별자리 관측 기록만 인정 | `plan/research/G3-G5-integrated/G5/`(정본 유지), 추가 `data-src/learn-raw/observing-quiz.json`. 옛 준비팩은 참고용 |

## 다음 세션이 알아야 할 것

- **build27 UI(D-073)**: 하늘에서만 하단 탭을 좌상단 아래꺾쇠 메뉴로 접었다. 설정 하나 → 하늘/GPS/앱, 시계 우상단, GPS 하단 중앙, 카메라 우하단. main 센서 연결 오류 패널은 없다. autoStart는 실행 중 상태로만 유지하고 새 실행 시 true; OS 권한을 우회하지 않는다. 지면 투명도 기본0%=불투명도1, 저장한 사용자 값 보존. 메뉴 전환 E2E는 navigation.selectTab을 사용한다.

- **최우선 build26**: docs/SKY-REFINEMENT-BUILD26.md의 확대/메인 하늘/스타호핑 체크리스트 결과를 받는다. 하늘 진입은 #/sky?scope=ObjectId, 스타호핑은 #/telescope?view=hop&course=기존ID. 필터의 setViewport는 실제 FOV/화면 픽셀을 전달하며 줌 변경 때 reset하지 않는다. 센서 trackingMode는 compass/gyro, manualPauseUntil은 호환 이름을 남긴 런타임 플래그(1=사용자 버튼 대기)이며 타이머가 아니다. 자이로 상대 보정은 재시작 시 재사용하지 않는다.
- **집 PC와 연구실 키 구별**: 기존 문서의 “이 PC”는 당시 연구실을 뜻한다. 현재 PC에는 이전 업로드 키만 있다. build26의 기존 Play 서명은 별도 인계가 필요하며 scripts/sign-play-update.ps1이 AAB 해시와 build24 인증서를 검증한다.

- **현재 작업**: beta.20/build26 확대 안정화·메인 하늘 안내(D-072), beta.18/build24 천체물리 서사 개편(D-070), 이전 풍경·업적(D-069)은 보존한다. 새 선택적 backdrop은 migration202609110002와 함께 사용한다. 기존 Play/개인 APK 키를 재사용하며 최종 검사·산출물·배포 상태는 문서 맨 위와 docs/MOBILE-RELEASE.md를 따른다.

- **우선 사항**: 최신 유료화는 D-064, ₩9,900 1회 구매 계획이다. 현재 무료 베타 미리보기이며 구매 브리지/권한 검사는 구현했지만 실제 상품·purchases 서버·환불 재검증·일반 SMTP·두 사람의 무상 grant는 미완료다. D-053~054는 이전 설계 이력이다. docs/BILLING-SETUP.md·MONETIZATION-PLAN.md를 따른다. Supabase ijxuwtbcwifttiuwvqrh/서울 대시보드 인증으로 지평선 migration202609110002까지 적용했다. 대시보드 인증은 CLI 인증과 구분하며 일반 가입·숫자 메일 준비 전 VITE_COMMUNITY_SIGNUPS_READY/EMAIL_CODE를 켜지 않는다. 공개 프로필만 사용자가 명시적으로 동기화하며 개인 백업은 수동 스냅샷이다.

- 최신 지평선은 D-069(이전 D-067)와 docs/HORIZON-ART.md·HORIZON-PROFILES.md가 정본이다. D-045의 실제 잔디 이미지와 독립 마당 설계는 이전 이력이다. 개인 APK 키는 보존한다. Play는 최초 업로드 전이라는 확인에 따라 현재 PC에서 마련한 전용키를 재사용한다(D-061). Console 등록 뒤에도 키를 임의 변경하지 않는다.

- **학습 탐색/스테이지(D-026)**: features/learn의 LearnScreen → QuizJourney/CoursesScreen/StoriesScreen/AchievementsScreen. 해시 section/path/mission/chapter로 복원하며 하단 탭 복귀 시 마지막 배우기 경로 유지. stageCatalog는 144문항을 중복 없이 고정한 28단계, 정답률 80% 해제·60/80/100% 별, 개인 합계는 단계별 최고점만. stage/question 버전을 함께 검증하며 마지막 응답과 완료 기록은 원자 저장. 기존 미션/응답/복습/관측 유지, 새 도장은 새 여정을 완주해야 획득한다. 리더보드는 아직 로컬 점수 기반만 준비됨.
- **하늘 설정(D-038)**: `groundOpacity` 기본1, 단일 슬라이더와 기본값 복원. 불투명도1이면 지평선 아래 표시·선택을 함께 막고1 미만이면 함께 허용한다. layers persist v2로 이전 옵션을 이관한다. 기본 경계 false·은하수0.33·별 채도1, 저장된 커스텀 설정은 보존한다. 실제 관측 가능 판정은 그대로다.

- **다음 작업**: T5 실기기 정렬/드리프트 결과와 G4 반영 → T7 잔여(skyPick 36, 하루 복습 누적 상한·배지 이력/연출) → T8. G3/G5 추가 생성은 불필요. 사용자는 솔로몬 HQ 8×42 ED와 SV48P 102mm를 사용한다. FOV/접안 사양은 시작 예시로 두고 직접 입력하도록 요청했다. 7.50°·25mm/52°를 실제 장비 사양으로 단정하지 않는다(D-039).
- **학습/콘텐츠**: 한국어 재서술본은 data-src/*-raw/*-natural, 게시본은 public/data/{content,learn}/v1이며 확장 업적48개는 public/data/learn/v2다. 기존18개 ID/규칙과 코스·퀴즈 v1을 보존한다(D-040). `pnpm data:content` 다음 `pnpm data:learn`; CI는 이야기121/G5원본180+추가60 참조와 근거를 검증한다. 새 관측12단계는 별도 observingStages.json이며 기존 stageCatalog 28단계를 변경하지 않는다. 수치 검토112·G2 이름42는 docs/CONTENT-REVIEW.md. 새60문항은 전부 영어 제공, 기존 장문 전체 번역은 후속이다.
- **환경(build27)**: Codex 데스크톱 로컬, Windows PowerShell7. Node24.19.0, 도구 PATH의 pnpm11.19.0(프로젝트/CI는12.3.4 고정), gh2.100.0·JunhyoungPark-NOBEL 로그인. 명령 앞에 `C:\Program Files\nodejs;C:\Program Files\GitHub CLI;%APPDATA%\npm`을 PATH에 더한다. 현재 작업 폴더는 `C:\Users\JunhyoungPark\OneDrive\Desktop\별관찰해쌀뚜`. 이 PC에는 연구실 최신 Play 키가 없고 예전 집 키만 있다.

- **T2 실기기 통과**(2026-09-07, 사용자 보고 "문제 없이 잘 돼"). 덤프·기기 정보는 받지 못했으므로 D-018의 기본값(compassAxis='top', iOS 편각 적용, 필터 상수)을 그대로 둔다. 문제가 보고되면 센서 디버그 "덤프 복사" 텍스트로 원인을 특정한 뒤 테스트 벡터부터 고친다.
- 센서 관련 진입점: `sensors/orientation/manager.ts`(`sensorManager` 싱글턴: start/stop/nudge/setCalibration/currentAltAz), `state/sensorStore.ts`, `features/sky/ArToggle.tsx`·`CalibrationWizard.tsx`, 시뮬레이터 `features/sky/SensorSimPanel.tsx`(설정 → 개발자 → 센서 디버그에서 켬). 테스트 훅 `window.__skylogSensor`(스토어 상태).
- 부호 규약·파이프라인은 `docs/ARCHITECTURE.md` "센서 파이프라인"과 D-018. **"대충 맞을 때까지" 부호를 바꾸지 말 것** — 실기기 덤프로 원인을 특정한 뒤 테스트 벡터를 먼저 고친다.
- **기록·학습 진입점**: db/repos/observations.ts, state/logStore.ts, features/log/ObservationFormHost.tsx, learn/runtime.ts. ObjectSheet의 기록·이야기 액션은 실제 화면에 연결됐다. T5 장비 CRUD API는 db/repos/equipment.ts.
- **T5 진입점**: 하늘 설정/ObjectSheet `sheet-telescope`/학습 미션→`#/sky?scope=…`, 스타호핑 코스만 `#/telescope?view=hop&course=…`; 설정→`#/equipment`. `telescopeStore`의 장비 프로필이 추천/시트에도 적용된다. 상대 센서 재시작 뒤 저장된 정렬을 자동 재사용하면 안 된다(D-029). 윗변 +Y 기준이며 영상 plate solving은 없다.
- **UI 규칙(D-021)**: 새 화면은 `docs/ARCHITECTURE.md` "UI 디자인 시스템 v2"와 토큰(`theme.css`)만 쓴다. 검색/오늘 밤/기록은 App의 `pt-status pb-tab` 래퍼를 쓴다. 배우기는 D-026: 자체 고정 제목·상단 4개 메뉴 + ScrollArea(pb-tab), 위치/센서 상태바는 생략한다. 카피는 D-021 용어집(해요체·평이한 용어)을 따른다.
- **스크롤 규칙(D-022)**: 세로 스크롤 영역은 `ui/ScrollArea.tsx`(마우스 드래그 스크롤·관성·페이드 오버레이)로 만든다. 스크롤러에 `mask-image`를 걸지 않는다. 드래그 스크롤이 닿으면 안 되는 컨트롤은 `touch-action: none` 또는 `data-drag-scroll="off"`. 사용자 보고("스크롤이 뻑뻑하고 스크롤 바를 정확히 눌러야 함")에 대한 수정이며, 실기기 확인은 T3b 체크리스트의 스크롤 항목으로 받는다.
- **주의(이 세션에서 겪은 것)**: 워크플로 에이전트가 "코드 스케치를 써 달라"는 프롬프트를 실제 경로에 파일을 만들었다가 지우는 바람에 `src/astro/phenomena.ts`가 사라진 적이 있다. 리서치용 에이전트 프롬프트에는 **"파일을 만들거나 고치지 말 것"**을 명시한다.
- **최신 검증**: 문서 맨 위 build26 보고를 따른다. 이전 버전 수치는 당시 이력이며 실제 휴대폰 센서/성능·일반 SMTP·스토어 심사·Apple 서명은 별도다.
- 데이터 원본(`data-src/raw/`)은 gitignore이며 새 환경에서 재생성할 때 원본 확보가 필요하다. 현재 실행 경로와 pnpm PATH는 위 **환경** 항목을 따른다. 과거 OneDrive PC 경로를 현재 작업 경로로 사용하지 않는다.
- **사용자 장비**: 솔로몬 HQ 8×42 ED, SVBONY SV48P 102mm(제조사 초점거리663mm). 사용자 요청으로 쌍안경 시야7.50°·접안25mm/52°는 시작 예시이며 직접 입력하도록 한다. 마운트/실제 접안 사양은 확정하지 않았다. 관측지는 자동 GPS 또는 사용자가 고른 저장 장소·보이는 범위를 따른다.

build23 보고는 [보관 기록](reports/2026-09-11-build23.md)을 참고한다. 이전 T3b/T4/T5/T6·학습 UX 보고는 [기능 개발 보관 기록](reports/2026-09-08-pre-mobile-history.md)을 참고한다.

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
