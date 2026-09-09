# 심화 퀴즈·망원경 코스 판매 범위 매핑

2026-09-09 · 기준 `9d39492`(beta.8/build13). 사용자의 새 선호를 [유료화 계획](../../docs/MONETIZATION-PLAN.md)에 반영하기 위한 읽기 전용 조사다. **현재 접근은 모두 무료이며 이 문서 작성으로 상품·잠금·DB·코드를 바꾸지 않는다.** 같은 날짜의 [정책 조사](2026-09-09-monetization.md)는 스토어/날씨 근거로 재사용한다. 그 문서의 외형 팩 우선 판매안은 이전 제안 이력이다.

## 퀴즈의 난이도와 활성 범위

정의는 [schema.ts](../../src/learn/schema.ts)의 `QuizItem.difficulty: 1 | 2 | 3`, 게시 데이터는 [quiz.json](../../public/data/learn/v1/quiz.json)이다. `enabled !== false && type !== 'skyPick'`를 활성 기준으로 집계했다.

| 난이도 | 전체 문항 | 현재 활성 | 향후 제안 |
| --- | --- | --- | --- |
| 1 | 92 | 78 | 무료 |
| 2 | 92 | 78 | 심화 학습 이용권 |
| 3 | 56 | 48 | 심화 학습 이용권 |
| 합계 | 240 | 204 | 비활성 `skyPick` 36개는 판매 가능 문항에 포함하지 않음 |

[stageCatalog.json](../../src/learn/stageCatalog.json)과 [observingStages.json](../../src/learn/observingStages.json)의 모든 문항 ID를 게시 팩과 대조했다. **현재 장/스테이지 내부의 난이도 혼합은 없다.** 하늘·관측 트랙 모두 1/2/3장이 각각 난이도 1/2/3으로 구성된다.

| 트랙 | 장 | 스테이지 | 문항·난이도 |
| --- | --- | --- | --- |
| 하늘 `sky` | 1 | 11 | 58문항, 모두 1 |
| 하늘 `sky` | 2 | 11 | 58문항, 모두 2 |
| 하늘 `sky` | 3 | 6 | 28문항, 모두 3 |
| 관측 `observing` | 1 | 4 | 20문항, 모두 1 |
| 관측 `observing` | 2 | 4 | 20문항, 모두 2 |
| 관측 `observing` | 3 | 4 | 20문항, 모두 3 |

따라서 현재 무료 후보는 15스테이지·78문항, 유료 후보는 25스테이지·126문항이다. 이는 버전별 확인 결과이며 미래에도 장 번호와 난이도가 같다고 보장하지 않는다. [stages.ts](../../src/learn/stages.ts)는 장 번호로 결제 여부를 판정하지 않으며 지금의 `unlocked`는 트랙별 선행 스테이지 통과 상태다. 결제하면 선행 학습을 자동 완료시키는 것으로 바꾸지 않는다.

실제 혼합 출제는 [runtime.ts](../../src/learn/runtime.ts)의 `selectQuiz()`다. 자유 연습·복습·천체별·명시적 ID 선택은 현재 난이도순 정렬만 하며 난이도 접근 권한을 검사하지 않는다. [QuizHost](../../src/features/learn/QuizHost.tsx)는 스테이지와 이 출제기를 각각 호출하고, [MissionCard](../../src/features/learn/MissionCard.tsx)는 `quizIds`로 직접 출제한다. 미래 구현에서 시작·다음 단계·복습·미션·답안 저장에 같은 정책을 적용하되 기술상 비활성 여부와 유료 여부를 분리해야 한다.

## 망원경 학습 범위

실제 URL은 `#/learn?section=courses&theme=telescope`이며 [learnNavigation](../../src/features/learn/learnNavigation.ts)은 이를 `courseTheme`으로 읽는다. [CoursesScreen](../../src/features/learn/CoursesScreen.tsx)은 [paths.json](../../public/data/learn/v1/paths.json)의 `level`과 `missionIds`로 코스를 연결한다.

| 망원경 경로 | 포함 미션 |
| --- | --- |
| `telescope-first-record` — 정렬과 기록 | `summer-vega-align-one`, `any-moon-first-sketch`, `any-jupiter-visit`, `autumn-polaris-backup`, `spring-m3-globular` |
| `telescope-honest-view` — 눈으로 본 범위 | `spring-polaris-center`, `autumn-m31-core`, `winter-rigel-scale`, `winter-betelgeuse-record`, `summer-albireo-double` |

또한 `group=starhop`의 [HOP_COURSES](../../src/learn/hopCourses.ts) 6개를 망원경 학습 묶음에 포함하는 안이다: `orion-sword`, `andromeda-chain`, `hercules-keystone`, `lyra-ring`, `sagitta-dumbbell`, `aquila-wild-duck`. 여기의 `level: 1 | 2 | 3`은 코스 수준이므로 퀴즈 난이도와 같은 과금 필드로 취급하지 않는다.

무료 경로는 `naked-first-directions`, `naked-season-bridges`, `binocular-first-field`, `binocular-pattern-depth`의 20미션이다. 망원경을 사용한다는 이유만으로 `#/equipment`와 일반 `#/telescope` 기능을 함께 잠그지 않는다. [openTelescope](../../src/features/telescope/navigation.ts)의 `course=<id>`로 코스 설명·고정 경로·완주 진도를 불러오는 경우와 일반 목표 찾기·정렬·FOV·별길을 구분한다.

직접 `mission`이나 `hopCourse`를 지정하면 주제 카드 없이 상세가 열리므로 상위 카드 잠금만으로는 충분하지 않다. 미래에는 실제 ID·버전에 따른 대응표를 쓰고 `theme`를 바꾸거나 생략했다고 권한이 바뀌지 않게 한다. 현재는 어느 경로에도 결제 검사를 추가하지 않는다.

## 무료 미션 15개의 혼합 문항 문제

[missions.json](../../public/data/learn/v1/missions.json)을 대조하면 무료로 남길 20미션 중 15개가 난이도 2·3의 고유 문항 20개를 사용한다. 해당 미션은 다음과 같다.

- `spring-arcturus-first`, `spring-polaris-direction`, `spring-orion-color-pair`, `spring-m44-binocular`
- `summer-antares-window`, `summer-vega-fov`, `summer-deneb-starfield`, `summer-m13-binocular`
- `autumn-aldebaran-arrival`, `winter-sirius-beacon`, `winter-aldebaran-depth`, `winter-m45-starhop`, `winter-m42-binocular`
- `any-moon-phase`, `any-moon-binocular`

예를 들어 맨눈 북극성 미션은 `q-polaris-brightest`(2)와 `q-polaris-exact-pole`(3)을, 쌍안경 M45 미션은 어려운 확인문항을 포함한다. 전역 난이도 잠금을 바로 넣으면 무료 코스가 유료 문항 때문에 끝나지 않는다.

추천 후속은 해당 미션의 확인문항을 목적에 맞는 새 난이도 1 문항으로 구성하고 기존 어려운 문항은 심화 학습에 남기는 것이다. 기존 문항의 난이도만 낮추거나 미응답을 정답/미션 완료로 처리하지 않는다. 망원경 미션 안의 어려운 퀴즈는 같은 심화 이용권에 포함해 이중 결제를 만들지 않는다.

`missionKey()`가 단계 내용의 해시를 포함하므로 문항 참조를 바꾸면 시작/체크 기록 키도 달라진다. 새 미션 버전과 이전 완료 이력을 함께 보존하는 이관이 선행돼야 한다. 이전 응답을 새 문항 답안으로 바꾸지 않고, 이전 완료와 새 버전 재학습을 구분한다. `stageVersion`·문항 ID/버전·최고점 보존도 동일하게 확인한다.

## 보상과 남는 무료 범위

현재 [아바타 보상 6개](../../src/personal/avatar.ts)는 5스테이지·이야기 10개·첫 관측·첫 스케치·관측 3밤·서로 다른 천체 25개 조건이다. 무료 난이도 1과 관측/이야기로 계속 획득할 수 있도록 검증한다. [마당 장식](../../src/personal/catalog.ts)의 첫 별길·두 별 보정 보상은 무료 관측 도구에서, 3미션 보상은 조정된 무료 코스에서 얻을 수 있어야 한다. 기존 `personal.reward:*`와 아바타 보상·코디·배치는 회수하지 않는다.

업적 화면·보상 지급 자체는 무료지만, 난이도/코스 유료화 후에는 100문항 숙련, 20/40스테이지, 24/30미션, 스타호핑 3/6코스 완주 같은 일부 도전에 유료 학습이 포함될 수 있다. 해당 조건을 숨기거나 ‘모든 업적 완주 무료’라고 표시하지 않는다. 구매만으로 업적을 지급하지 않으며 현재 목표 수치나 판정 규칙도 바꾸지 않는다.

사진 이미지·댓글·반응·신고·차단, 관측/사진/장비/진도 열람과 기존 로컬·수동 계정 백업은 무료로 유지한다. 기존 학습 결과도 결제 여부 때문에 스냅샷·백업에서 빼지 않는다. 본인과 여자친구는 서로 다른 검증 계정에 서버가 무료 심화 이용권을 부여하는 후속 설계를 따른다. 실제 상품·권한·가격은 미등록이다.

이번 확인은 JSON/소스 대조와 문서 변경이며 앱 실행·결제 테스트·잠금 구현을 완료했다는 의미가 아니다.
