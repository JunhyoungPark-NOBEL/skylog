# Task 7 — 학습 시스템: 학습 경로 · 미션/퀘스트 · 배지 · 관측 직후 퀴즈(간격 반복) · 진행률

> 실행 전 읽기: `plan/00-master-plan.md` §3(R6, A3, A5), `plan/STATUS.md`(T4·T6 보고), `plan/gpt-pro-requests.md` **G5** 산출물(있으면)
> 선행: T4(기록·progress 테이블), T6(콘텐츠). 예상 분량: 세션 1~2개.

## 0. 세션 시작 절차

1. STATUS 확인, 저장소 최신화, 테스트 통과. `progress` 테이블과 `getObservedSet()`·콘텐츠 index를 읽는다.
2. 순서: 학습 데이터 스키마(미션·배지·퀴즈·경로) → 진행 엔진(순수 함수) → 배우기 탭 UI → 관측 직후 퀴즈 훅 → 미션 판정 훅(기록 저장 시) → 진행률 대시보드 → 튜토리얼형 미션(스타 호핑·정렬).

## 1. 목표 (그리고 "어떤 학습 시스템이 좋은가"에 대한 답)

앱을 쓰는 행위 자체가 공부가 되게 한다. 추천하는 구조는 네 층이다.

1. **학습 경로(코스)**: "맨눈 → 쌍안경 → 망원경" 3단계 × 계절. 각 코스는 미션 묶음. 예: *맨눈 1: 북쪽 하늘의 길잡이*(북두칠성→북극성→카시오페이아), *맨눈 2: 여름 대삼각형*, *쌍안경 1: 플레이아데스와 히아데스*, *망원경 1: 달의 터미네이터*, *망원경 2: 첫 성단 M13*.
2. **미션/퀘스트**: 작은 단위 과제(찾기·관측 기록·스토리 읽기·퀴즈·기술 연습). 판정은 앱 데이터(기록·읽음·정렬 성공)로 자동. 계절·오늘 밤 조건에 맞는 미션을 "지금 할 수 있는 미션"으로 제안.
3. **관측 직후 퀴즈 + 간격 반복**: 기록을 저장하면 그 대상·별자리에 대한 짧은 퀴즈 1~3문항. 틀린 문항은 SM-2 방식(간격 1→3→7→14→30일)으로 다시 나온다. 기억은 "본 직후"에 가장 잘 붙는다.
4. **진행률·배지**: 별자리 88, 메시에 110, 행성 7, 달 위상 8, 계절 시그니처 등 체크리스트형 진행률 + 배지(첫 관측, 첫 스케치, 첫 스타 호핑 성공, 3밤 연속, 메시에 10/25/50/110 등). 자랑보다 "다음에 뭘 볼지"로 연결.

## 2. 범위

- In: `public/data/learn/v1/{paths,missions,badges,quiz}.json`, `src/learn/*`(엔진: 미션 판정·SR 스케줄러·배지 규칙, 순수 함수), `features/learn/*`(배우기 탭, 미션 상세, 퀴즈 UI, 대시보드), 기록 저장 훅, 오늘 밤 탭에 "지금 가능한 미션" 카드.
- Out: 소셜 랭킹(D11), 실시간 AI 튜터(D2).

## 3. 요구사항

### MUST

1. **학습 데이터 스키마** (`src/learn/schema.ts`, zod 검증, 빌드 시 검증)

```ts
// 이 스키마는 G5 프롬프트에 그대로 들어간다(자기완결적이어야 함). ObjectId 형식: star:HIP91262 / dso:M31 / planet:saturn / moon / sun / const:Ori
type Season = 'spring'|'summer'|'autumn'|'winter'|'any';          // T6 콘텐츠 스키마와 동일한 enum
type Level = 'naked'|'binoculars'|'telescope';
type Text = { ko: string; en?: string };

interface LearningPath { id: string; title: Text; description: Text; level: Level; season?: Season; missionIds: string[] }

interface Mission { id: string; title: Text; description: Text; level: Level; season?: Season; estimatedMinutes: number;
  requires?: { equipment?: Level[]; darkSky?: boolean; prerequisiteMissionIds?: string[] };
  steps: MissionStep[]; rewardBadgeId?: string; contentIds?: string[] }

type MissionStep =
  | { type:'find'; objectId: string; hint: Text }                       // 하늘에서 찾아가기 완료(TargetGuide 중앙 진입 또는 수동 확인)
  | { type:'observe'; objectId: string; minRating?: 1|2|3|4|5 }         // outcome:'seen' 기록 존재
  | { type:'observeAny'; category: 'planet'|'moon'|'star'|'doubleStar'|'openCluster'|'globularCluster'|'nebula'|'planetaryNebula'|'galaxy'|'constellation'; count: number }
  | { type:'read'; contentId: string }                                  // 스토리 읽음
  | { type:'quiz'; quizIds: string[]; passRatio: number }               // 0..1
  | { type:'skill'; skill: 'arMode'|'align1'|'align2'|'starhop'|'sketch'|'fovSetup'|'backup' }   // 앱 기능 사용 이벤트
  | { type:'checklist'; items: Text[] };                                // 수동 체크(예: 눈 암순응 20분)

type BadgeRule =
  | { key:'firstObservation' } | { key:'firstSketch' } | { key:'firstStarHop' } | { key:'align2Success' }
  | { key:'messierCount'; n: number } | { key:'constellationCount'; n: number } | { key:'caldwellCount'; n: number }
  | { key:'planetsAll' }               // 행성 7종(수·금·화·목·토·천·해) 모두 관측
  | { key:'moonPhasesAll' }            // 달 위상 8단계 모두 기록(moonPhaseDeg 기준)
  | { key:'streakNights'; n: number }  // 연속 관측 밤(nightKey 기준)
  | { key:'seasonSignature'; id: 'summerTriangle'|'winterDiamond'|'springTriangle'|'autumnSquare' }
  | { key:'missionsCompleted'; n: number } | { key:'quizStreak'; n: number };

interface Badge { id: string; title: Text; description: Text; icon: string; rule: BadgeRule }

interface QuizItem { id: string; objectId?: string; constellation?: string;
  type: 'mc'|'trueFalse'|'skyPick';
  question: Text; choices?: Text[];                                     // mc: 3~4개
  answer: number | boolean | string;                                    // mc: choices 인덱스(0부터) / trueFalse: boolean / skyPick: ObjectId
  explanation: Text; difficulty: 1|2|3; tags: string[] }
```

   - `skyPick` 퀴즈: "화면에서 베가를 탭하세요"처럼 하늘 화면에서 대상을 고르는 인터랙티브 문항(정답 반경 3°).

2. **초기 콘텐츠** (G5 산출물이 있으면 검증 후 사용, 없으면 세션이 작성)
   - 학습 경로 6개(맨눈 2·쌍안경 2·망원경 2), 미션 ≥ 24개(계절 균형), 배지 ≥ 15개, 퀴즈 ≥ 150문항(콘텐츠 팩 대상 위주, skyPick ≥ 30). 모두 ko, 사실 검증(콘텐츠 팩·카탈로그 기준).
   - 튜토리얼 미션(기술): "AR 모드 켜고 1-별 정렬", "FOV 원 설정", "첫 스케치", "스타 호핑으로 M13(또는 계절 대상) 찾기".

3. **진행 엔진** (`src/learn/engine.ts`, 순수 함수 + 테스트)
   - 입력: 미션 정의 + 앱 상태 스냅샷(observedSet·기록 목록·읽음 집합·스킬 이벤트 로그·퀴즈 결과). 출력: 단계별 완료 여부·미션 완료·새 배지.
   - 스킬 이벤트 로그(`progress` 테이블 `events` 키): `{type, at, meta}` — T2 정렬 성공, T5 2-별 정렬, 스타 호핑 완료, 스케치 저장, FOV 설정 등에서 발행(작은 `learnEvents.emit()` 유틸).
   - **간격 반복**(`src/learn/sr.ts`): SM-2 단순화(ease 1.3~2.5, 간격 1/3/7/14/30/60일, 틀리면 1일로), 하루 복습 상한 10문항, "오늘 복습 n개" 카드.
   - "지금 할 수 있는 미션": 계절·장비·오늘 밤 가시성(미션 대상이 어두운 창에 고도 ≥ 25°)·선행 미션 완료로 필터 → 상위 3개.

4. **배우기 탭** (`features/learn/LearnTab.tsx`)
   - 상단: 오늘의 천체(T6) · 오늘 복습 · 지금 가능한 미션. 중단: 학습 경로 카드(진행률 바) → 경로 상세(미션 목록, 잠금/진행/완료) → 미션 상세(단계 체크리스트, 각 단계에 "하늘에서 찾기/기록하기/읽기/퀴즈 시작" 버튼). 하단: 진행률 대시보드(별자리 88/메시에 110/행성/달 위상/배지 진열장).
   - 진행률 항목 탭 → 남은 대상 목록 → 검색/하늘로 연결.

5. **관측 직후 퀴즈 훅**: 기록 저장 완료 토스트에 "퀴즈 1분" 버튼(기본 켬, 설정에서 끔) → 그 대상/별자리 문항 1~3개(미풀이 우선) → 결과가 SR 스케줄에 반영. 야외라 **한 손·큰 버튼·짧게**.

6. **배지 규칙 엔진**: `BadgeRule`의 각 키를 구현(위 스키마의 union 전부). 새 배지 획득 시 축하 시트(야간 모드에서는 은은하게).

### SHOULD

- 스케치 비교 학습: 내 스케치 옆에 접안렌즈 시뮬레이션 뷰(T5)를 나란히 → "무엇을 놓쳤나" 셀프 체크 항목.
- 미션에 "관측 조건 메모"(달 없음 필요 등)와 "예상 소요"를 오늘 밤 계획과 연결(미션 대상을 ☆ 예정에 일괄 추가).
- 주간 요약 카드(이번 주 본 것·배운 것·다음 주 추천).

### COULD

- 퀴즈 유형 확장: 별자리 선 그리기(점 잇기), 달 위상 순서 맞추기.
- 학습 통계 내보내기(T4 export에 progress 포함 — 이미 포함 여부 확인).

## 4. 기술 사양 메모

- 엔진은 앱 상태 스냅샷을 받는 순수 함수로 두고, 스냅샷 생성만 DB에 의존(테스트 용이).
- 계절 판정은 날짜가 아니라 **관측 창의 항성시**(남중하는 적경 범위)로 하면 정확하지만, 단순히 월 기준(3~5 봄, 6~8 여름, 9~11 가을, 12~2 겨울)으로 시작하고 DECISIONS에 기록.
- 퀴즈 데이터의 정답은 콘텐츠·카탈로그에서 자동 대조 가능한 것(별자리 소속, 종류, 밝기 순서)을 우선 생성 규칙으로 삼아 오류를 줄인다(G5 프롬프트에 반영됨).

## 5. UI/UX 지침

- 게임화는 절제: 배지는 작게, 진행률은 "다음에 볼 것"과 연결. 실패 문구 없음("아직"으로).
- 미션 단계는 앱의 실제 기능으로 즉시 이동하는 버튼이 핵심(설명만 있는 미션 금지).

## 6. 수용 기준

- [ ] 학습 데이터 검증 통과(경로 6, 미션 ≥ 24, 배지 ≥ 15, 퀴즈 ≥ 150, skyPick ≥ 30, 대상 id가 카탈로그에 존재).
- [ ] 엔진 테스트: 단계 판정 8종, 미션 완료·배지 획득, SR 스케줄(정답/오답 시나리오), "지금 가능한 미션" 필터(계절·가시성·장비).
- [ ] Playwright: 기록 저장 → 퀴즈 3문항 → 결과 반영 → 배우기 탭에서 미션 진행률 갱신 → skyPick 문항에서 하늘 탭 정답 판정.
- [ ] 진행률 대시보드 수치가 기록 데이터와 일치(테스트 데이터).
- [ ] 야간 모드 준수, typecheck/lint/test/build 통과, 스크린샷(배우기 탭·미션·퀴즈·대시보드), 태그 `task-7-done`.

## 7. 테스트

- 자동: 위 항목. 사용자: 미션 1개를 실제 밤에 수행(예: 여름/가을 대상), 퀴즈 체감 난이도·문항 오류 보고.

## 8. 산출물 & 인수인계

- 완료 보고 + STATUS + DECISIONS(계절 판정 방식, SR 파라미터, 퀴즈 기본 켬/끔).
- T8에 넘길 것: 온보딩에서 첫 학습 경로 제안 흐름.

## 9. 주의/금지

- 퀴즈 정답 오류는 학습 앱의 신뢰를 무너뜨린다: G5 산출물도 세션이 카탈로그와 대조하고, 대조 불가능한 문항은 `difficulty`와 무관하게 제외.
