# GPT Pro 요청 프롬프트 모음 (G1~G5)

> 용도: 코드 작업은 Claude 세션이 하고, **대량 콘텐츠 생성·심층 리서치·2차 검토**는 GPT Pro에 맡긴다.
> 사용법: 각 항목의 "프롬프트" 블록을 그대로 GPT Pro에 붙여넣는다(첨부물이 있으면 함께). 결과는 항목마다 지정한 형식으로 받아서, 다음 Claude 세션에 파일로 첨부하며 "Task N 진행해줘, G? 산출물 첨부"라고 말하면 된다.
> 공통 원칙: 사실 확인이 필요한 작업은 **브라우징/딥리서치 모드**를 켜고, 출처 URL을 요구한다. 결과는 반드시 **하나의 코드 블록(JSON/CSV/Markdown)** 으로 받아 복사 오류를 줄인다.

| 요청 | 목적 | 실행 시점 | 결과 형식 | 소요(대략) |
|---|---|---|---|---|
| G1 | 모바일 브라우저 센서 API 현황 + 하늘 앱 UX 벤치마크 | **T2 전** | Markdown 보고서 | 딥리서치 1회 |
| G2 | 한국어 천체 이름·별자리 이름·전통 별자리·콜드웰 표 | **T0 중 ~ T6 전** | CSV 4개 | 1~2회 |
| G3 | 콘텐츠 팩 항목 생성(약 120개, 20개씩 배치) | **T6 전**(T0 완료 후) | JSON 배치 6개 | 6회 |
| G4 | 센서·정렬 수학 코드 2차 리뷰 | **T2·T5 후** | Markdown 리뷰 + diff | 1~2회 |
| G5 | 퀴즈·미션·배지·학습 경로 생성 | **T7 전** | JSON 4개 | 2~3회 |

---

## G1 — 딥리서치: 모바일 브라우저 방향 센서 API 현황(2026) + 하늘 앱 UX 벤치마크

**준비물**: 없음. 딥리서치(브라우징) 모드 사용.
**결과 저장**: 저장소 `plan/research/G1-sensors-ux.md`로 커밋 — Claude 세션이 T2·T5 설계에 반영.

```
당신은 웹 센서 API와 모바일 UX에 정통한 시니어 엔지니어입니다. 아래 두 가지를 조사해 하나의 Markdown 보고서로 작성해 주세요. 모든 주장에는 출처 URL(공식 문서·WebKit/Chromium 이슈·릴리스 노트 우선)을 붙이고, 확실하지 않은 것은 "미확인"으로 표시하세요. 2026년 현재 기준으로 최신 상태를 확인해 주세요.

## Part A. 모바일 브라우저에서 "폰이 가리키는 하늘"을 구현하기 위한 센서 API 현황
대상: iOS Safari(최신 iOS), iOS의 홈 화면 PWA(standalone), Android Chrome(최신), Samsung Internet, Firefox Android.
각 플랫폼에 대해 표로 정리:
1. DeviceOrientationEvent: `deviceorientation`의 alpha가 절대(북 기준)인지 상대인지, `deviceorientationabsolute` 지원 여부, `webkitCompassHeading`/`webkitCompassAccuracy`의 정확한 의미 — **자북/진북 기준인지(위치 서비스 설정과의 관계), 기기의 어느 물리 축(화면 상단 +Y축의 수평 투영인지, 후면 카메라 −Z축인지)을 기준으로 한 방위인지, 폰을 세우거나(beta≈90°) 하늘 쪽으로 젖혔을 때(beta>90°) 값이 어떻게 변하는지(180° 반전이 생기는 자세)** — 그리고 `requestPermission()` 요구 조건과 거부 후 재요청 가능 여부(iOS 13 이후 설정 앱 토글이 없다는 점 포함), PWA standalone 모드에서의 차이.
2. Generic Sensor API: `AbsoluteOrientationSensor`/`RelativeOrientationSensor` 지원 여부, 필요한 Permissions-Policy, 쿼터니언 좌표계 규약(어느 축이 북/동/상인지), 주파수 상한.
3. 정확도: 나침반 heading의 일반적 오차 범위, 자기장 간섭(금속·자석 케이스·삼각대) 사례, 자이로 드리프트(°/분) 실측 보고가 있으면 인용.
4. 화면 회전(`screen.orientation`)과 센서 축의 관계, `screen.orientation.lock()` 지원 현황(PWA/전체 화면 조건).
5. 보조 API: Wake Lock, Vibration(iOS 미지원 여부), Geolocation 고도 정확도, `navigator.storage.persist()`와 iOS IndexedDB 7일 삭제 정책(현재도 유효한지).
6. 권장 구현 전략: 위 사실을 바탕으로 (a) 플랫폼별 최선의 Provider 우선순위, (b) iOS에서 상대 alpha + compassHeading으로 절대 방향을 복원하는 안전한 방법 — **"같은 물리 축의 방위끼리 비교"한다는 전제에서, 어느 축을 어떤 자세 범위(beta 구간)에서 비교해야 하는지 수식·의사코드**, (c) 자기 편각(WMM) 적용 여부 — Android 절대 방향이 자북 기준이라는 점, iOS가 이미 진북 보정을 하는 경우 이중 보정을 피하는 판정 방법, (d) 알려진 함정 목록. 또한 사용자가 실기기에서 축 의미를 확정할 수 있는 **3-자세 실험 절차**(랜드마크를 향해 45°/90°/120° 기울여 덤프 비교)를 제안하세요.
7. Three.js `DeviceOrientationControls`(구 예제) 변환식의 정확한 형태와, 씬 프레임을 "+X=동, +Y=천정, +Z=남"으로 둘 때의 수정 방법(수식). 테스트 벡터(alpha,beta,gamma → 기대 방위/고도) 8개를 제안하세요.

## Part B. 하늘 앱 UX 벤치마크
Stellarium Mobile(Plus), SkySafari 7, Star Walk 2, Sky Guide, Night Sky, PhotoPills(야간 모드 UX 참고)에 대해:
1. AR/센서 모드 진입 방식, 보정(캘리브레이션) UX, 수동↔센서 전환 방식.
2. 검색·상세 화면의 정보 구성, "찾아가기" 화살표 UI.
3. 관측 기록/리스트 기능(있다면 데이터 필드), 망원경 push-to/GoTo 연동 방식(SkySafari의 push-to 인코더, Stellarium의 망원경 제어 등).
4. 야간 모드 구현의 좋은 점/나쁜 점, 접안렌즈 시야원·상 반전 옵션의 표현 방식.
5. 초보자 학습 기능(투어, 오늘 밤 추천, 스토리)이 어떻게 제공되는지.
6. 우리 앱(개인용 PWA: 하늘 뷰 + 검색/추천 + 관측 기록 + 망원경 push-to 가이드 + AI 스토리 + 학습)에 대해 "반드시 따라야 할 관행 10개"와 "피해야 할 실수 10개"를 근거와 함께 제시.

보고서는 한국어로, 표를 적극 사용하고, 마지막에 "Claude 구현 세션에 전달할 핵심 결정 사항" 요약 15줄을 넣어 주세요.
```

---

## G2 — 한국어 천체 이름 · 별자리 이름 · 전통 별자리(28수) · 콜드웰 목록 표

**준비물**: (선택) Claude T0 세션이 만든 `data-src/curated/star-names-ko.csv`, `constellations-ko.csv`, `dso-names-ko.csv`, `caldwell.csv`를 첨부하면 "검증·보완" 모드로, 없으면 "신규 작성" 모드로. 아래 CSV 컬럼은 T0의 큐레이션 파일과 **동일한 순서·이름**이므로(마지막 `needs_review` 컬럼만 Claude가 붙임) 결과를 그대로 병합할 수 있다.
**결과 저장**: `plan/research/G2-korean-names.md`(CSV 4개 포함) → Claude T0/T6 세션이 `data-src/curated/`에 병합.

```
당신은 한국 천문학 용어와 동아시아 전통 천문학에 정통한 편집자입니다. 아래 4개의 표를 CSV 코드 블록으로 작성해 주세요. 각 행에 출처(URL 또는 문헌)와 확신도(high/medium/low)를 넣고, 확신이 없으면 비워 두고 low로 표시하세요(추측으로 채우지 마세요). 한국천문학회 천문학용어집, 한국천문연구원 자료, 국립중앙과학관, 위키백과(ko/en), IAU WGSN 목록을 우선 참고하세요.

표 1: star_names_ko.csv — 컬럼: hip, iau_name_en, name_ko, traditional_ko, note, source, confidence
- IAU 공식 고유명(WGSN)이 있는 별 중 겉보기등급 3.5 이하 전부 + 유명한 별(북극성, 알비레오, 미자르·알코르, 알골, 미라 등) 포함, 최소 150행.
- name_ko는 통용 표기(예: 베가), traditional_ko는 한국 전통/동아시아 이름(예: 직녀성, 견우성, 북극성, 삼태성, 남두육성 관련 별 등)이 있을 때만.
- hip 번호는 반드시 정확해야 합니다(히파르코스 번호). 확인 불가면 비우고 low.

표 2: constellations_ko.csv — 컬럼: iau_abbr, name_en, name_ko, genitive_en, season_kr(봄/여름/가을/겨울/북극/남천), note, source, confidence
- 88개 전부. name_ko는 한국천문학회 표준 표기(예: 큰곰자리, 오리온자리, 물뱀자리 vs 바다뱀자리 등 표준을 확인).

표 3: dso_names_ko.csv — 컬럼: id(M31 / NGC7000 형식), name_en, name_ko, alt_names_ko, note, source, confidence
- 메시에 110개 중 통용 한국어 이름이 있는 것 전부 + 유명 NGC/IC(이중성단, 북아메리카 성운, ET 성단, 베일 성운, 말머리 성운, 헬릭스 성운, 장미 성운 등) 최소 60행. 전통 이름(좀생이별=플레이아데스 등)은 alt_names_ko에.

표 4: caldwell.csv — 컬럼: caldwell, ngc_ic(NGC/IC 번호, 없으면 다른 식별자), name_en, name_ko, type, source, confidence — 109개 전부.

추가 표 5(별도 코드 블록, Markdown): 28수(二十八宿)와 현대 별자리 대응표 — 컬럼: 수(한자/한글), 사신(청룡·백호·주작·현무), 대표 별(현대 명칭, HIP), 대응 현대 별자리, 간단 설명, 출처. 그리고 천상열차분야지도의 데이터가 공개 라이선스(CC BY-SA 등)로 제공되는 곳(예: Stellarium skycultures 'korean', 논문·공공 데이터)이 있는지 라이선스 조건과 함께 조사해 주세요.

마지막에 "검토가 필요한 항목" 목록을 별도로 정리해 주세요.
```

---

## G3 — 콘텐츠 팩 생성 (유명 천체 약 120개, 20개씩 배치)

**준비물**: **T0b 산출물** 두 파일 — `data-src/curated/content-targets.v1.csv`(id·우선순위·이유)와 `data-src/content-raw/catalog-values.v1.csv`(대상별 카탈로그 값: id, 이름, RA/Dec, 등급, 거리, 분광형, 크기, 별자리, 종류). T0b 완료 보고에서 사용자에게 전달된다. 카탈로그 값을 첨부하면 GPT가 수치를 맞추므로 검증 실패가 줄어든다. 없으면 GPT가 스스로 조사(위키백과·SIMBAD)하되 출처를 남기게 한다.
**결과 저장**: 배치마다 `plan/research/G3-content-batch-N.json` → Claude T6 세션이 검증 후 팩에 포함.

```
당신은 천문학 교육 콘텐츠 작가이자 팩트체커입니다. 아래 JSON 스키마에 정확히 맞는 항목을, 첨부한 대상 목록의 [배치 N: id 20개]에 대해 작성해 주세요. 결과는 **JSON 배열 하나를 담은 코드 블록 하나**로만 출력하세요(설명문 금지). 한국어로 쓰되, 어려운 용어에는 괄호로 짧은 풀이를 넣으세요. 독자는 관측을 막 시작한 성인입니다.

### 절대 규칙
1. 사실은 반드시 출처(위키백과 ko/en, NASA, ESA, IAU, SIMBAD, 신화는 오비디우스·히기누스·에라토스테네스 요약을 다룬 신뢰 가능한 자료)에 근거하고 `sources`에 제목+URL을 넣으세요. 출처를 못 찾으면 그 문장을 쓰지 마세요.
2. 수치(거리·등급·분광형·크기·나이)는 첨부한 카탈로그 값이 있으면 그 값을 우선 사용하고, 없으면 출처의 값을 쓰며 `source`를 각 fact에 붙이세요. 단위는 광년/AU, 등급은 V등급, 크기는 각분(′) 또는 각도(°).
3. 문장을 출처에서 그대로 복사하지 말고 요약·재서술하세요. 과장 표현("정확히", "확실히", "가장 아름다운")과 추측을 금지합니다.
4. 신화/이야기는 문화권을 명시하고(그리스·로마/동아시아/한국/아랍/이집트/기타), 여러 전승이 있으면 "~라는 전승도 있다"로 구분하세요. 한국 전통 이름·이야기(직녀·견우, 북극성, 삼태성 등)가 있으면 `koreanTradition`에 넣으세요.
5. `howToFind`는 계절과 기준 별/별자리를 들어 "실제 밤하늘에서 눈으로 찾는 순서"로 쓰고, `hopFrom`에는 기준 천체 id를 넣으세요(id 형식: star:HIP번호, dso:M31, planet:jupiter, const:Ori).
6. `observing`은 맨눈/쌍안경(10×50 기준)/소형 굴절망원경(90mm, 20~80배 기준)에서 실제로 무엇이 보이는지 현실적으로 쓰세요(도시 하늘에서의 한계도 언급). `difficulty`는 1(맨눈으로 쉬움)~5(90mm로 어려움).
7. 태양(sun) 항목은 `safety`에 "필터 없이 절대 보지 말 것" 경고를 넣고 summary 첫 문장에도 안전을 언급하세요.
8. 길이: oneLiner ≤ 60자, summary 200~400자, story 300~600자, funFacts ≤ 3개(각 ≤ 80자).
9. 확신이 낮은 문장은 `meta.needsReview`에 이유를 적고 `confidence`를 medium/low로 두세요. 모르면 비워 두는 것이 지어내는 것보다 낫습니다.

### 스키마 (TypeScript 표기; 모든 필드 키는 그대로)
{
  id: string; version: 1;
  title: { ko: string; en: string; alt?: string[] };
  oneLiner: { ko: string };
  summary: { ko: string; en?: string };
  facts: { label: string; value: string; source?: string }[];   // 5~8개: 거리, 겉보기등급, 분광형/종류, 크기/지름, 나이, 별자리, 최적 관측 시기 등
  story: { ko: string; cultures: string[]; sources: string[] };
  koreanTradition?: { name?: string; asterism?: string; note: string; sources: string[] };
  howToFind: { ko: string; season?: 'spring'|'summer'|'autumn'|'winter'|'any'; hopFrom?: string[] };   // season 값은 영문 enum 그대로(본문은 한국어)
  observing: { nakedEye?: string; binoculars?: string; telescope?: string; bestMonths?: number[]; difficulty: 1|2|3|4|5 };
  funFacts?: string[];
  safety?: string;
  sources: string[];
  meta: { generatedBy: 'gpt-5-pro'; generatedAt: string; confidence: 'high'|'medium'|'low'; needsReview?: string[] }
}

### 배치 N 대상 (id — 이름)
(여기에 20개를 붙여넣기)
```

배치 나누기(총 120 = 행성·달·태양 9 + 별 31 + 별자리 30 + DSO 50, `content-targets.v1.csv`의 priority 순): 1) 행성·달·태양 9 + 최상위 별 11, 2) 별 20, 3) 별자리 20(황도 12 + 8), 4) 별자리 10 + DSO 10, 5) DSO 20, 6) DSO 20. 배치가 끝날 때마다 Claude 세션에 넘겨 검증하고, GPT에게 "검증에서 걸린 항목 n개를 수정해 달라"고 되돌려 보내면 된다(검증 리포트를 그대로 붙여넣기).

---

## G4 — 센서·정렬 수학 코드 2차 리뷰

**준비물**: 저장소의 `src/sensors/orientation/*.ts`, `src/astro/pointing.ts`, `src/astro/frames.ts`, `src/astro/coords.ts`, 관련 테스트 파일, `docs/ARCHITECTURE.md`의 좌표계 절. (파일을 통째로 첨부하거나 zip)
**결과 저장**: `plan/research/G4-math-review.md` → Claude 세션이 항목별로 반영/기각을 DECISIONS에 기록.

```
당신은 관성 센서 융합과 천문 좌표계에 밝은 리뷰어입니다. 첨부한 TypeScript 코드를 "적대적으로" 검토해 주세요. 목표는 (1) 폰의 DeviceOrientation/Generic Sensor 값으로 "폰 뒷면이 향한 하늘"을 카메라로 재현하는 변환, (2) 폰을 망원경 경통에 붙이고 별 1~2개로 정렬해 목표까지 방위/고도 차이를 안내하는 계산이 **정확한지**입니다.

좌표 규약(설계 문서): 씬 프레임 +X=동, +Y=천정, +Z=남. 방위 북=0°, 동=90°. astronomy-engine HOR 프레임(x=북, y=서, z=천정) → 씬 = (−y, z, −x). 정렬 모델 p = R_yaw(δ)·q_s·t_b.

검토 항목:
1. 오일러(alpha, beta, gamma, 화면 회전) → 쿼터니언 변환의 순서·부호·축 규약이 W3C 명세와 일치하는가. 거울상/방위 반전이 생기는 조건이 있는가. 테스트 벡터(북/동/서/천정/천저, 화면 회전 0/90/180/270, 롤)를 **기대값과 함께** 제시하고, 현재 코드가 통과하는지 손으로 계산해 판정하세요.
2. 짐벌락·천정 통과·wrap-around(방위 359↔0) 처리. 저역통과 slerp의 시간 상수·데드밴드 로직의 결함(예: 큰 회전 시 지연, 정지 시 드리프트).
3. iOS 상대 alpha + webkitCompassHeading 동기화 로직의 타당성(어느 자세에서만 동기화해야 안전한지, 부호).
4. 자기 편각 적용의 이중 보정 위험.
5. 2-별 정렬(1차원 δ 탐색 + 축 평균)이 편향 없이 수렴하는지, 두 별의 각거리가 작을 때 조건수 문제, 더 나은 폐형식(예: Wahba 문제/Kabsch로 δ와 t_b 동시 추정)이 있으면 제안과 코드.
6. 안내 Δaz·cos(alt), Δalt 계산과 적도의 ΔHA/ΔDec 변환의 부호(서쪽=HA 증가).
7. 수치 안정성(float32 버퍼, 정규화 누락), 성능(프레임당 할당).
출력: 심각도(치명/높음/중간/낮음)별 발견 목록, 각 항목에 근거·재현 방법·**수정 diff(unified)**·추가 테스트 코드. 마지막에 "동의하지 않는 설계 결정과 이유"를 별도로.
```

---

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

## 결과를 Claude 세션에 넘길 때

1. 결과 코드 블록을 파일로 저장(확장자 .md/.csv/.json)해 저장소 `plan/research/`에 넣고 커밋한 뒤 세션에서 파일 경로를 언급한다(Claude Code는 저장소 파일을 직접 읽는다).
2. 새 세션에서: "별관찰 프로젝트 Task 6 진행해줘. G3 배치 1·2 첨부" — 세션은 검증 스크립트를 돌리고, 실패 항목 목록을 돌려준다.
3. 실패 항목은 GPT Pro에 "다음 항목을 검증 리포트에 따라 수정해 주세요(같은 스키마, 해당 항목만 출력)"로 되돌려 보낸다.
