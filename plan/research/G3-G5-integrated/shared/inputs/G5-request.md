## G5 — 퀴즈 · 미션 · 배지 · 학습 경로 생성

**준비물**: `content/v1/index.json`(콘텐츠가 있는 대상 목록)과 `content-targets.v1.csv`, 별자리 표(constellations_ko.csv). Task 7 스키마(아래에 포함).
**결과 저장**: `plan/research/G5-learn-{paths,missions,badges,quiz}.json` → Claude T7 세션이 검증·병합.

```
당신은 천문 교육 커리큘럼 설계자입니다. 관측 입문자용 앱(맨눈 → 10×50 쌍안경 → 90mm 굴절망원경, 관측지 한국 대전 근교, 도시 광해 Bortle 7~8 기준·가끔 어두운 곳)에 넣을 학습 데이터를 아래 스키마의 JSON으로 만들어 주세요. 결과는 4개의 코드 블록(paths.json, missions.json, badges.json, quiz.json)으로만 출력하세요. 모든 텍스트는 한국어.

### 원칙
1. 미션은 **앱의 실제 기능으로 즉시 실행 가능한 단계**로만 구성합니다(단계 타입: find/observe/observeAny/read/quiz/skill/checklist). "책을 읽으세요" 같은 앱 밖 과제 금지.
2. 계절 균형: 봄·여름·가을·겨울 각 5개 이상 + 연중(달·행성) 4개 이상. 대상은 한국(북위 36°)에서 그 계절 저녁 21~24시에 고도 25° 이상인 것만.
3. 퀴즈는 **카탈로그로 검증 가능한 사실** 위주(별자리 소속, 종류(성단/성운/은하), 밝기 비교, 계절, 색, 거리 순서, 위상 순서, 찾는 기준 별)와 콘텐츠 팩에 있는 이야기(신화 인물·명명 유래) 위주로 만드세요. 논쟁적이거나 최신 연구에 따라 달라지는 수치는 피하세요. 각 문항에 정답 근거를 `explanation`에 1~2문장.
4. skyPick 문항(하늘 화면에서 대상을 탭하는 유형)은 정답 반경 3°를 고려해 밝고 고립된 대상만.
5. 난이도: 1(입문) 40%, 2(중급) 40%, 3(심화) 20%. 오답 선택지는 그럴듯하되 명백히 틀린 것.
6. 배지는 자랑보다 "다음 목표"를 제시하는 문구로. 15~20개.

### 수량
- paths: 6개(맨눈 2, 쌍안경 2, 망원경 2), 각 4~6 미션.
- missions: 24~30개. 각 3~6 단계. 튜토리얼 미션 4개 포함(AR 모드+1-별 정렬, FOV 원 설정, 첫 스케치, 스타 호핑으로 성단 찾기).
- badges: 15~20개.
- quiz: 150~200문항(skyPick ≥ 30).

### 스키마 (TypeScript 표기 — 키 이름·값 형식을 정확히 지킬 것. 천체 id 형식: star:HIP91262 / dso:M31 / planet:saturn / moon / sun / const:Ori. 미션·배지·퀴즈·경로 id는 kebab-case 영문)
type Season = 'spring'|'summer'|'autumn'|'winter'|'any';
type Level = 'naked'|'binoculars'|'telescope';
type Text = { ko: string; en?: string };

interface LearningPath { id: string; title: Text; description: Text; level: Level; season?: Season; missionIds: string[] }

interface Mission { id: string; title: Text; description: Text; level: Level; season?: Season; estimatedMinutes: number;
  requires?: { equipment?: Level[]; darkSky?: boolean; prerequisiteMissionIds?: string[] };
  steps: MissionStep[]; rewardBadgeId?: string; contentIds?: string[] }

type MissionStep =
  | { type:'find'; objectId: string; hint: Text }
  | { type:'observe'; objectId: string; minRating?: 1|2|3|4|5 }
  | { type:'observeAny'; category: 'planet'|'moon'|'star'|'doubleStar'|'openCluster'|'globularCluster'|'nebula'|'planetaryNebula'|'galaxy'|'constellation'; count: number }
  | { type:'read'; contentId: string }
  | { type:'quiz'; quizIds: string[]; passRatio: number }
  | { type:'skill'; skill: 'arMode'|'align1'|'align2'|'starhop'|'sketch'|'fovSetup'|'backup' }
  | { type:'checklist'; items: Text[] };

type BadgeRule =
  | { key:'firstObservation' } | { key:'firstSketch' } | { key:'firstStarHop' } | { key:'align2Success' }
  | { key:'messierCount'; n: number } | { key:'constellationCount'; n: number } | { key:'caldwellCount'; n: number }
  | { key:'planetsAll' } | { key:'moonPhasesAll' } | { key:'streakNights'; n: number }
  | { key:'seasonSignature'; id: 'summerTriangle'|'winterDiamond'|'springTriangle'|'autumnSquare' }
  | { key:'missionsCompleted'; n: number } | { key:'quizStreak'; n: number };

interface Badge { id: string; title: Text; description: Text; icon: string /* 이모지 1개 */; rule: BadgeRule }

interface QuizItem { id: string; objectId?: string; constellation?: string /* IAU 3글자 */;
  type: 'mc'|'trueFalse'|'skyPick';
  question: Text; choices?: Text[] /* mc만, 3~4개 */;
  answer: number | boolean | string /* mc: choices 인덱스(0부터) / trueFalse: boolean / skyPick: 천체 id */;
  explanation: Text; difficulty: 1|2|3; tags: string[] }

### 예시 (형식 참고용 — 내용은 새로 작성)
missions.json 항목 예:
{ "id": "summer-triangle", "title": {"ko": "여름 대삼각형 찾기"}, "description": {"ko": "베가·데네브·알타이르로 여름 하늘의 길잡이를 익힙니다."},
  "level": "naked", "season": "summer", "estimatedMinutes": 20,
  "steps": [
    { "type": "find", "objectId": "star:HIP91262", "hint": {"ko": "머리 위 가까이 가장 밝은 흰 별이 베가(직녀성)입니다."} },
    { "type": "find", "objectId": "star:HIP97649", "hint": {"ko": "베가에서 남쪽으로 내려오면 양옆에 작은 별을 거느린 알타이르(견우성)."} },
    { "type": "find", "objectId": "star:HIP102098", "hint": {"ko": "베가 동쪽, 은하수 안의 데네브."} },
    { "type": "observe", "objectId": "star:HIP91262" },
    { "type": "quiz", "quizIds": ["q-summer-triangle-1", "q-summer-triangle-2"], "passRatio": 0.5 }
  ], "rewardBadgeId": "badge-summer-triangle", "contentIds": ["star:HIP91262", "star:HIP97649", "star:HIP102098"] }
quiz.json 항목 예:
{ "id": "q-summer-triangle-1", "objectId": "star:HIP91262", "type": "mc", "question": {"ko": "베가가 속한 별자리는?"},
  "choices": [{"ko": "거문고자리"}, {"ko": "백조자리"}, {"ko": "독수리자리"}, {"ko": "헤르쿨레스자리"}], "answer": 0,
  "explanation": {"ko": "베가는 거문고자리(Lyra)의 으뜸별입니다."}, "difficulty": 1, "tags": ["constellation", "summer"] }
badges.json 항목 예:
{ "id": "badge-summer-triangle", "title": {"ko": "여름의 길잡이"}, "description": {"ko": "여름 대삼각형 세 별을 모두 찾았습니다. 다음은 은하수를 따라 백조자리로."}, "icon": "🔺", "rule": { "key": "seasonSignature", "id": "summerTriangle" } }

### 대상 목록(콘텐츠 있는 것)
(content/v1/index.json의 id·이름 붙여넣기 — 여기 없는 천체는 미션·퀴즈의 대상으로 쓰지 말 것)
```

---
