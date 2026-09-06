# 별관찰해쌀뚜 (코드명 `skylog`) — 마스터 플랜 v1.0

> 작성일: 2026-09-06 · 대상: 이 프로젝트에서 실행되는 모든 Claude 세션 (그리고 GPT Pro에 넘길 리서치/콘텐츠 작업)
> 이 문서는 **모든 태스크의 공통 헌법**이다. 각 태스크 프롬프트(`task-0N-*.md`)는 이 문서를 전제로 쓰였다.

---

## 0. 이 문서를 읽는 세션이 가장 먼저 할 일

1. 저장소의 `plan/STATUS.md`를 읽고 **현재 어느 태스크까지 끝났는지** 확인한다.
2. 사용자가 지목한 `plan/task-0N-*.md`를 읽는다. (이전 태스크의 "완료 보고"가 STATUS에 있으면 함께 읽는다.)
3. 개발 환경을 확인한다 (§7.1). 코드 저장소에 접근할 수 없으면 **작업을 시작하기 전에** 사용자에게 알린다.
4. 태스크 프롬프트의 "0. 세션 시작 절차"를 따른다. 실행 계획을 5~10줄로 먼저 제시하고 바로 진행한다 (사용자가 자리에 없을 수 있으므로, 결정이 꼭 필요한 항목이 아니면 기본값으로 진행하고 가정을 명시한다).
5. 끝나면 §9의 **완료 보고 템플릿**으로 보고하고, `plan/STATUS.md`와 `plan/DECISIONS.md`를 갱신한다.

**문서의 정본(canonical) 위치 (D-009, 2026-09-06 개정)**: 실행 도구는 **Claude Code(데스크톱 앱 Code 탭, 로컬)** 이다. 따라서 계획 문서 `plan/*.md`는 **코드 저장소의 `plan/` 폴더**가 정본이며, 저장소 루트의 `CLAUDE.md`가 세션에게 "먼저 `plan/STATUS.md` → `plan/00-master-plan.md` → 해당 태스크 파일을 읽어라"라고 지시한다. STATUS·DECISIONS는 저장소에서 갱신하고 **커밋**한다(문서 변경도 커밋 대상). 이 Claude 프로젝트의 문서 사본은 초기 배포본·백업이며, 태스크가 끝날 때 STATUS만 프로젝트에도 복사해 두면(선택) Cowork/채팅에서도 진행 상황을 볼 수 있다. 저장소의 `docs/`는 코드 수준 문서(ARCHITECTURE, DATA-LICENSES, TESTING, RELEASE)를 담는다.

---

## 1. 제품 비전

**"밤하늘을 들어 올린 폰 화면 그대로 보고 → 찾고 → 망원경으로 도입하고 → 기록하고 → 배우는" 개인용 관측 노트 앱.**

핵심 사용자는 관측을 막 시작한 본인(쌍안경 보유, 90mm 굴절망원경 SVBONY SV48P 구매 검토 중, 대전 거주). 처음엔 개인용이지만, 구조는 나중에 다른 사람도 쓸 수 있게 열어 둔다.

대표 시나리오:

- **S1 하늘 보기**: 밖에 나가 폰을 하늘로 들면, 폰 뒷면이 향한 하늘의 별·행성·달·별자리(반투명 오버레이)가 방위(동서남북)와 함께 보인다. 손가락으로 끌어 다른 곳도 볼 수 있다.
- **S2 찾기·추천**: "토성", "안드로메다", "M13", "직녀성"으로 검색하면 화면 밖에 있어도 화살표가 그쪽을 가리킨다. "오늘 밤" 탭은 지금 위치·시각·날씨·달·계절을 고려해 맨눈/쌍안경/망원경별로 볼만한 천체를 추천한다.
- **S3 망원경 도입**: 폰을 경통(또는 쌍안경 삼각대)에 붙이고 밝은 별 하나로 정렬하면, 목표 천체까지 "위로 12°, 오른쪽으로 5°" 식으로 실시간 화살표 안내를 받는다. 접안렌즈 시야원과 스타 호핑 경로도 보여준다.
- **S4 기록**: 본 천체를 별표(★)로 표시하고, 특징 태그·메모·스케치·사진을 남긴다. 하늘 위에서 내가 본 별들이 ★로 빛난다.
- **S5 배우기**: 천체를 누르면 AI가 요약한 정보·신화·관측 팁을 읽고, 미션/퀴즈로 공부한다.

---

## 2. 확정된 결정 사항 (2026-09-06, 사용자 확인)

| 항목 | 결정 | 근거/비고 |
|---|---|---|
| 플랫폼 | **PWA 웹앱** (모바일 우선, 데스크톱에서도 동작) | GPS·나침반·자이로 사용 가능, URL 배포, 반복 개발 속도. 나중에 Capacitor 포장 가능(보류 D9) |
| 저장 | **로컬 우선** (IndexedDB) + JSON 내보내기/가져오기 | 로그인/서버 없음. 단, 모든 레코드에 `updatedAt/deletedAt`을 둬 나중에 동기화 가능 |
| 실행 | **Claude Code(데스크톱 앱 Code 탭, 로컬 세션)** 가 저장소에서 태스크를 순차 실행(D-007). 콘텐츠·리서치·2차 검토는 GPT Pro 활용 | `plan/gpt-pro-requests.md` 참고 |
| 장비 | 현재 쌍안경. 망원경은 **SVBONY SV48P**(90mm f/5.5, 초점거리 500mm, 아크로마트 2매, 2" 포커서, OTA만 판매·마운트 별매) 검토 중 | 마운트 미정 → 가이드는 **수동 경위대식 기본**, 적도의/GoTo는 선택 가능하게 설계 |
| 기본 관측지 | 대전 (예: KAIST 부근, 36.37°N 127.36°E, 고도 약 70m) — 앱 첫 실행 시 GPS로 대체 | 프리셋으로 제공, 언제든 변경 |
| 언어 | UI 한국어 기본, 영어 전환 가능. 천체 이름은 한글(있으면) + 영문/기호 병기 | i18n 키 체계는 Task 0부터 적용 |
| 라이선스 정책 | 데이터: CC BY-SA·BSD·퍼블릭 도메인만 사용. Stellarium 본체 코드(GPL)는 **참고만** 하고 복사하지 않음 | §5 |

---

## 3. 기능 매트릭스

범례 — 출처: **R** 사용자 요청 / **C** 편의 기능 / **A** Claude 추천 / **D** 보류. 우선순위: MUST / SHOULD / COULD.

### 3.1 요청 기능 (R)

| ID | 기능 | 우선 | 태스크 |
|---|---|---|---|
| R1 | 폰이 가리키는 하늘을 GPS·센서로 실시간 표시, 동서남북 방위, Stellarium 같은 하늘 뷰 | MUST | T1, T2 |
| R2 | 이름 검색 + 찾아가기(방향 안내) + 지금·날씨·계절·방위 기반 추천 | MUST | T3 |
| R3 | 관측한 천체 ★ 북마크, 특징 태그·메모 기록, 하늘 위 표시 | MUST | T4 |
| R4 | 망원경(쌍안경) 도입 실시간 방향 가이드 | MUST | T5 |
| R5 | 유명 천체부터 AI 요약 정보·신화·스토리, 점진 업데이트 | MUST | T6 (+GPT Pro) |
| R6 | 관측하면서 공부하는 인터랙티브 학습 시스템 (추천안 포함) | SHOULD | T7 |
| R7 | 행성·달·항성·은하·성단·성운 대상 + 별자리 반투명 오버레이 | MUST | T0, T1 |

### 3.2 편의 기능 (C)

| ID | 기능 | 우선 | 태스크 |
|---|---|---|---|
| C1 | 적색 야간 모드(전체 UI·렌더러 포함), 화면 켜짐 유지(Wake Lock), 밝기 안내 | MUST | T1, T8 |
| C2 | 시간 여행: 시각 슬라이더(±12h), 날짜 선택, 배속, "지금"으로 복귀 | MUST | T1 |
| C3 | 관측지 프리셋(집/천문대 등), 수동 좌표 입력, GPS 갱신 | MUST | T2 |
| C4 | 일출·일몰·박명(시민/항해/천문)·월출·월몰·달 위상·달 밝기 위젯 | MUST | T3 |
| C5 | 날씨·구름(저/중/고층)·시상·투명도 예보 (Open-Meteo, 7Timer) | SHOULD | T3 |
| C6 | 시야(FOV) 원: 쌍안경/파인더/접안렌즈별 실제 시야를 하늘에 표시 | MUST | T5 |
| C7 | 오프라인 완전 동작 (날씨 제외), 홈 화면 설치 | MUST | T0, T8 |
| C8 | 화면 밖 목표를 가리키는 가장자리 화살표 + 남은 각도 | MUST | T3 |
| C9 | 기록 내보내기/가져오기(JSON, CSV), 사진 첨부 | MUST | T4 |
| C10 | 한/영 UI 전환 | SHOULD | T0, T8 |
| C11 | 방향 보정 마법사 (별 정렬로 나침반 오차 제거) | MUST | T2 |
| C12 | 유성우 달력, 이달의 천문 현상(충·합·최대이각·식) | SHOULD | T3 |
| C13 | 기록 시 관측 조건(날씨·달·고도·장비) 자동 채움 | SHOULD | T4 |
| C14 | 온보딩 튜토리얼, 설정 화면, 권한 안내(iOS 센서 권한 등) | MUST | T2, T8 |
| C15 | **관측지별 "보이는 하늘 범위"**(베란다·마당에서 실제로 보이는 방위 구간과 최소 고도) → 추천·오늘의 천체가 그 범위만 고려 | MUST | T2(입력), T3(필터) |

### 3.3 Claude 추천 기능 (A)

| ID | 기능 | 왜 추천하는가 | 우선 | 태스크 |
|---|---|---|---|---|
| A1 | **스타 호핑 경로 생성 + 파인더/접안렌즈 시뮬레이션 뷰(정립/도립/좌우반전 선택)** | 수동 마운트로 어두운 DSO를 찾는 실전 기술. 센서 정밀도 한계(±2~3°)를 사람이 보완하게 해 줌 | MUST | T5 |
| A2 | **"오늘 밤 관측 계획"**: 관측 가능 시간대(박명~새벽)에 천체별 최고 고도 시각·볼 수 있는 시간·달 간섭·구름 예보를 점수화해 정렬 | 단순 추천보다 실제 관측 흐름에 맞음 | MUST | T3 |
| A3 | 미션/퀘스트(계절별), 배지, 관측 직후 퀴즈(간격 반복), 학습 경로(맨눈→쌍안경→망원경) | R6의 구체안 | SHOULD | T7 |
| A4 | 관측 스케치 캔버스(접안렌즈 시야원 안에 그리기) | 관측 기록의 핵심 관행. 기억·학습 효과 큼 | SHOULD | T4 |
| A5 | 진행률 대시보드(별자리 88개 중 n개, 메시에 110개 중 n개, 행성 등) | 동기 부여 | SHOULD | T4, T7 |
| A6 | 은하수 레이어, 박명·낮 하늘색 변화, 대기 소광(지평선 근처 별 흐려짐) | 현실감·방향감 | SHOULD | T1 |
| A7 | 동아시아 전통 별자리(28수, 천상열차분야지도) 오버레이 + 한국 전통 별 이름(직녀성·견우성·북극성·삼태성 등) | 한국 사용자에게 차별화된 스토리 자산 | COULD | T6 (데이터 준비되면) |
| A8 | "실제 하늘처럼" 모드: Bortle·달·박명으로 한계등급을 계산해 안 보일 별은 숨김 | 기대치 관리, 도시 관측에서 특히 유용 | SHOULD | T3 |
| A9 | 태양 안전 경고(낮에 태양 근처를 망원경으로 겨누면 경고·차단) | 안전 | MUST | T5, T6 |
| A10 | 장비별 한계등급·분해능 계산, 대상별 "이 장비로 보일까?" 판정 | 추천의 정확도 | SHOULD | T3, T5 |

### 3.4 보류 (D) — 지금은 하지 않음, 구조만 열어 둠

| ID | 기능 | 보류 이유 | 재개 조건 |
|---|---|---|---|
| D1 | 로그인·클라우드 동기화 | 서버 운영 부담. 로컬로 충분 | 여러 기기/사용자 필요 시 (T9 후보, Supabase) |
| D2 | 실시간 AI 대화(BYO API 키) | API 키 관리·비용. 정적 콘텐츠 팩으로 먼저 | T6 완료 후 필요하면 (T10 후보) |
| D3 | 인공위성/ISS 통과 예보 | TLE 갱신 필요(네트워크) | satellite.js로 추가 가능 |
| D4 | 혜성·소행성 | 궤도 요소 갱신 필요 | MPC 데이터 파이프라인 |
| D5 | 마운트 전동 연동(ASCOM Alpaca/INDI/BT) | 마운트 미정 | GoTo 마운트 구매 시 |
| D6 | 카메라 플레이트 솔빙 | 난이도 높음 | — |
| D7 | 달 표면 지도(크레이터 라벨) | 별도 데이터·UI | 망원경 구매 후 |
| D8 | 광해 지도 타일 | 대용량·라이선스 | Bortle 수동 입력으로 대체 |
| D9 | 네이티브 앱 포장(Capacitor) | PWA로 충분한지 먼저 확인 | iOS 센서 제약이 크면 |
| D10 | 별자리 그림(art) 오버레이 | 라이선스·용량 | — |
| D11 | 소셜/공유 | 개인용 | — |

---

## 4. 아키텍처 & 기술 스택

```
[브라우저(PWA)] ── Service Worker(오프라인 캐시: 앱 셸 + 데이터 팩)
   ├─ UI: React 19 + TypeScript(strict) + Vite + Tailwind CSS
   ├─ 상태: Zustand (clock / location / view / selection / sensor / settings / log / telescope / learn)
   │         settings는 Dexie `settings` 테이블이 단일 진실 원천(zustand persist의 storage 어댑터를 Dexie로 구현)
   ├─ 렌더: Three.js (WebGL) — 별=포인트 스프라이트(커스텀 셰이더), 선=LineSegments, 라벨=HTML 오버레이
   ├─ 천문 계산: astronomy-engine (MIT) — 행성/달/태양 위치, 출몰, 회전행렬(EQJ→HOR), 위상, 별자리 판정
   ├─ 센서: Geolocation, DeviceOrientation(+absolute), Generic Sensor API(가능 시), Wake Lock, Vibration(Android)
   ├─ 저장: Dexie (IndexedDB) — 관측기록/북마크/장비/관측지/블롭(스케치·사진)/학습진행/설정
   ├─ 데이터 팩(정적, 버전 표기): 별 카탈로그(binary) / 별자리 / DSO / 검색 인덱스 / 콘텐츠 / 퀴즈·미션
   └─ 외부 API(선택적, 온라인일 때만): Open-Meteo(구름·습도·바람), 7Timer(시상·투명도)
```

선택 이유 요약: LLM이 가장 잘 아는 스택(React/Three.js/TS) → 세션 간 완성도가 높다. astronomy-engine은 정확도(행성 ±1′ 수준)와 기능(출몰, 회전행렬, `DefineStar`, `Constellation`) 대비 가볍다(≈ 100KB). WebGL 포인트 렌더링은 별 4만 개도 60fps.

버전은 각 태스크 실행 시점의 **최신 안정 버전**을 확인해 쓴다 (예: `npm view <pkg> version`). 이 문서 작성 시점 참고값: astronomy-engine 2.1.19, Node 22, React 19, Three.js r17x, Vite 6~7, Dexie 4.

### 4.1 화면 구조 (공통)

하단 탭 5개 + 우상단 설정: **하늘(Sky)** · **검색(Search)** · **오늘 밤(Tonight)** · **기록(Log)** · **배우기(Learn)**.
천체 상세는 어느 화면에서든 **바텀 시트**로 열리고, 시트 안의 버튼으로 "하늘에서 보기 / 망원경으로 찾기 / ★ 관측 기록 / 관측 예정 북마크 / 스토리"로 이동한다. 망원경 모드는 전체 화면 전용 UI.

### 4.2 디자인 원칙

- 다크 UI 기본(배경 `#05070d`). **모든 색은 CSS 변수(토큰)** 로만 지정 → 적색 야간 모드는 토큰 교체 + 렌더러 팔레트 교체로 구현(필터 hack 금지).
- 터치 타깃 44px 이상, 망원경 모드는 64px 이상(장갑·어둠). 한 손 조작. 텍스트는 하늘 위에 최소한만.
- 모션은 짧고(≤200ms) 목적이 분명하게. 센서 모드에서는 지터를 필터로 잡되 지연은 100ms 이내.

---

## 5. 데이터 소스 & 라이선스 (Task 0에서 `docs/DATA-LICENSES.md`로 정리)

| 데이터 | 소스 | 라이선스 | 용도 |
|---|---|---|---|
| 별 카탈로그 | **HYG v4.x** (`codeberg.org/astronexus/hyg`, `data/hyg/CURRENT/` 안의 `hyg_v4*.csv.gz` — 실행 시 디렉터리를 나열해 실제 파일명·행 수를 확인하고 매니페스트에 기록; 약 12만 개) | CC BY-SA 4.0 | 기본 팩 mag ≤ 6.5 (~9천 개), 망원경 팩 mag ≤ 9 (~10만 개) |
| 별자리 선·경계·이름 위치 | **d3-celestial** `data/constellations.lines.json`, `constellations.bounds.json`, `constellations.json` (GeoJSON, [ra −180..180, dec]) | 코드 BSD-3; **데이터 파일은 파일별 출처·조건을 확인**(IAU/Davenhall & Leggett 등) 후 `DATA-LICENSES.md`에 파일 단위로 기록 | 오버레이 |
| 은하수 | NASA SVS "Deep Star Maps 2020"(퍼블릭 도메인) 중 **별을 제거한 은하수 전용(milkyway_*) 등적색 이미지**(정확한 파일명은 SVS 페이지에서 확인; 별이 포함된 starmap_* 변형은 우리 별과 이중으로 그려지므로 사용 금지) 2k 텍스처, 또는 d3-celestial `mw.json` | PD / (파일별 확인) | 은하수 레이어 |
| 성운·성단·은하 | **OpenNGC** (`NGC.csv` + `addendum.csv`, **세미콜론 구분**, 이름은 0 채움 `NGC0224`·`IC0434`, `M` 컬럼도 0 채움 `031`; M40·M45는 addendum에만 존재; `Dup`·`NonEx` 타입 행은 제외) | CC BY-SA 4.0 | DSO 카탈로그(메시에 110 + 콜드웰 109 + 밝은 NGC/IC) |
| 행성·달·태양 | astronomy-engine 계산 | MIT | 실시간 |
| 날씨 | Open-Meteo(비상업 무료, **CC BY 4.0 — 앱 내 출처 표기 필요**), 7Timer(출처 표기 요청) | CC BY 4.0 / 크레딧 | 구름·시상 |
| 별 고유명 | IAU WGSN 공식 이름 목록 + 한글 표기(GPT Pro G2로 표 작성 → Claude 검증) | 공개 | 검색·라벨 |
| 별자리 한글 이름 | 한국천문학회 표준(예: 큰곰자리, 오리온자리) 88개 | 공개 | 라벨 |
| 유성우 | IMO 연간 달력 기반 정적 표 | 공개 사실 | 달력 |
| 전통 별자리(선택) | Stellarium skycultures `korean` (천상열차분야지도) — 개별 라이선스 확인 필수 | CC BY-SA(확인) | A7 |

주의: Stellarium 앱 소스코드(GPL)는 알고리즘 참고만. Stellarium Web Engine(AGPL)도 임베드 금지.

**프로젝트 자체 라이선스(T0에서 D-008로 확정)**: 코드는 MIT, `public/data/`의 파생 데이터 팩은 원본을 따라 **CC BY-SA 4.0**(HYG·OpenNGC 파생). 저장소 루트에 `LICENSE`(MIT)와 `public/data/LICENSE`(CC BY-SA 4.0 + 출처 목록)를 둔다.

---

## 6. 공통 규약 (모든 태스크가 따른다)

### 6.1 식별자 (ObjectId)

```
star:HIP91262        // 히파르코스 번호. HIP 없으면 star:HYG<id>
dso:M31 | dso:NGC7000 | dso:IC434     // 우선순위 M > NGC > IC. 콜드웰(C14)은 alias
planet:mercury|venus|mars|jupiter|saturn|uranus|neptune
moon | sun
const:Ori            // IAU 3글자 약어 (별자리 자체를 대상으로 삼을 때)
```

### 6.2 좌표계·단위·시간

- 카탈로그 좌표: **J2000 적경/적위, 단위 도(deg)** (HYG의 RA 시간 단위는 빌드 시 ×15). 표시할 때 "J2000"과 "of date(JNow)" 둘 다 제공(GoTo 입력용).
- 지평 좌표: 고도 Alt −90..90°, 방위 Az **북=0°, 동=90°, 남=180°, 서=270°**. 표시용 고도는 대기 굴절 포함(apparent).
- 렌더 씬 프레임(Three.js, 오른손 좌표계): **+X=동, +Y=천정, +Z=남 (−Z=북)**. `(alt, az) → (x,y,z) = (cos alt·sin az, sin alt, −cos alt·cos az)`.
- astronomy-engine HOR 프레임은 `x=북, y=서, z=천정` → 씬 변환: `scene = (−hor.y, hor.z, −hor.x)`.
- 시간: 내부 UTC(`Date`/`AstroTime`), 표시는 기기 시간대(기본 Asia/Seoul). 위치: WGS84 도, 고도 m.
- 등급 V, 크기 arcmin, 거리 표시는 광년(카탈로그 pc × 3.2616), 각도 표시 소수 1자리.
- 데이터 파일의 각도는 항상 **도(deg)**. 라디안은 수식/셰이더 내부에서만.
- **astronomy-engine 호출 규칙**: `Horizon()`, `DefineStar()`, `Constellation()` 등은 **적경을 항성시 '시간(hours)' 단위**로 받고, `Horizon()`은 **equator-of-date(EQD) 좌표**를 기대하며 굴절 인자는 `'normal' | 'jplhor' | null`이다(`'none'` 없음). J2000 카탈로그 값을 그대로 넣지 말 것(2026년 기준 세차 오차 ≈ 0.35°). 이런 함수는 반드시 `src/astro`의 래퍼(도 단위, J2000 입력을 내부에서 EQD로 변환)를 통해서만 호출한다. `DefineStar`는 슬롯이 8개(`Body.Star1`~`Star8`)뿐이므로 카탈로그 객체마다 정의하지 말고 **질의 때마다 `Body.Star1`을 재사용**하며, 거리(광년)는 미상일 때 1000 ly로 둔다. 박명은 `SearchAltitude(Body.Sun, observer, direction, date, limitDays, -6|-12|-18)`로 구한다.

### 6.3 저장 스키마 (Dexie) — **DB(v1, 모든 테이블)와 타입은 Task 0에서 생성**, 리포지토리·마이그레이션·UI는 Task 4

테이블: `observations, bookmarks, sites, telescopes, eyepieces, binoculars, blobs, progress, settings, cache`. 모든 레코드 공통: `id(uuid v4)`, `createdAt`, `updatedAt`(ISO 문자열), `deletedAt?`(소프트 삭제), `schemaVersion`. `settings`는 key-value(단일 진실 원천), `cache`는 만료 시각이 있는 key-value(날씨 등).

```ts
interface Observation { objectId: ObjectId; observedAt: string; nightKey: string /* 관측 '밤' = 현지 정오→정오, 'YYYY-MM-DD'(시작일) */;
  outcome: 'seen'|'notSeen';                                                  // notSeen = 시도했으나 못 봄(회색 ★)
  siteId?: string; site: {lat:number; lon:number; elevation?:number; name?:string};
  equipment?: { kind:'naked'|'binoculars'|'telescope'; telescopeId?:string; eyepieceId?:string; binocularsId?:string; magnification?:number };
  conditions?: { seeing?:1|2|3|4|5; transparency?:1|2|3|4|5; bortle?:1|2|3|4|5|6|7|8|9; cloudCover?:number; moonIllum?:number; moonPhaseDeg?:number /* MoonPhase() 0..360, 위상 이름 유도 */; moonSepDeg?:number; altDeg?:number; azDeg?:number; tempC?:number; humidity?:number };
  rating?: 1|2|3|4|5; notes: string; tags: string[]; sketchBlobId?: string; photoBlobIds?: string[]; sessionId?: string }
interface Bookmark { objectId: ObjectId; note?: string; }                       // "관측 예정" 목록(☆). 관측 완료 = outcome:'seen'인 Observation 존재(★)
interface Site { name:string; lat:number; lon:number; elevation?:number; bortle?:number; isDefault?:boolean;
  visibleAz?: [number, number][] /* 실제로 보이는 방위 구간(도, 북=0). 예: 베란다 [[100,250]] */; minAltDeg?: number /* 건물 등에 가리는 최소 고도 */ }
interface Telescope { name:string; apertureMm:number; focalLengthMm:number; mountType:'altaz'|'eq'|'goto'; finder?:{kind:'rdf'|'optical'; magnification?:number; fovDeg?:number} }
interface Eyepiece { name:string; focalLengthMm:number; afovDeg:number }
interface Binoculars { name:string; magnification:number; apertureMm:number; fovDeg:number }
interface Progress { key:string; value:unknown }                                 // 학습 진행(미션·배지·퀴즈 SR 상태)
```

내보내기 형식: `{ app:'skylog', schemaVersion, exportedAt, data:{observations, bookmarks, sites, equipment, progress, settings}, blobs:{[id]: base64} }`.

### 6.4 저장소 디렉터리 구조

```
skylog/
  README.md · LICENSE(MIT) · CHANGELOG.md · CLAUDE.md(세션 진입 지침: plan/ 읽기 순서·규약 요약)
  plan/                   # 계획 문서 정본: README, 00-master-plan, STATUS, DECISIONS, task-00~08, 99-deferred, gpt-pro-requests, research/(G1~G5 산출물), reports/(완료 보고 보관)
  docs/ ARCHITECTURE.md · DATA-LICENSES.md · TESTING.md · RELEASE-v1.md
  scripts/data/           # 데이터 빌드(ts, node로 실행): fetch.ts, build-stars.ts, build-constellations.ts, build-dso.ts, build-search-index.ts, build-misc.ts(meteors/bodies), export-catalog-values.ts(G3용), build-content.ts, validate-content.ts, build-learn.ts, validate.ts
  data-src/               # raw/(다운로드, .gitignore) + curated/(큐레이션 표 csv, 커밋) + content-raw/(G3 원본, 커밋)
  public/data/            # 빌드된 데이터 팩(커밋) + LICENSE(CC BY-SA 4.0):
                          #   manifest.v1.json, stars-bright.v1.bin, stars-bright.v1.json(이름/메타), stars-deep.v1.bin,
                          #   constellations.v1.json, dso.v1.json, search-index.v1.json, bodies.v1.json, meteors.v1.json,
                          #   content/v1/index.json + *.json, learn/v1/{paths,missions,badges,quiz}.json
  src/
    app/        # 셸, 탭 라우팅, 테마 토큰, i18n 부트스트랩, ErrorBoundary
    astro/      # 좌표·시간·회전행렬·출몰·굴절·한계등급·광학·추천·포인팅·스타호핑·천문현상 (순수 함수 + Vitest)
    catalog/    # 데이터 팩 로더, 인메모리 카탈로그, 검색 인덱스
    render/     # Three.js 씬, 셰이더(공용 GLSL 청크 포함), 카메라, 라벨, 레이어(Star/Body/Constellation/Grid/MilkyWay/Dso/Marker/Fov/EyepieceView)
    sensors/    # geolocation, orientation/(providers, filter, calibration, toCamera, sim), wakeLock, feedback
    services/   # weather.ts(Open-Meteo, 7Timer) 등 외부 API
    db/         # Dexie 스키마(v1은 T0), 리포지토리, 마이그레이션, export/import
    state/      # zustand 스토어: clock, location, view, selection, sensor, settings, log, telescope, learn
    content/    # 콘텐츠 스키마·로더
    learn/      # 학습 스키마·엔진·간격반복
    features/   # sky/ search/ object/ tonight/ log/ telescope/ content/ learn/ settings/
    ui/         # 공통 컴포넌트(BottomSheet, Button, Chip, Slider...), 아이콘, format.ts
    i18n/       # ko.json, en.json
  tests/        # unit/(vitest), e2e/(playwright, 모바일 뷰포트·Asia/Seoul·ko-KR·SwiftShader)
```

### 6.5 코드 규칙

- TypeScript `strict`, `any` 금지, ESLint + Prettier. 식별자는 영어, 주석·문서는 한국어 가능.
- `src/astro`, `src/sensors`의 순수 함수는 **Vitest 테스트 필수**(경계값·회귀 포함). 천문 수식은 출처(예: Meeus 장·절, astronomy-engine 문서)를 주석에 남긴다.
- 커밋: Conventional Commits(`feat:`, `fix:`, `data:`, `docs:`, `test:`). 태스크 종료 시 `git tag task-N-done`.
- 성능 예산: 초기 JS(gzip) ≤ 500KB(데이터 팩 제외), 기본 별 팩 ≤ 400KB, 망원경 팩은 지연 로드. 중급 안드로이드에서 하늘 뷰 ≥ 45fps.
- 비밀값(API 키 등)은 코드·문서에 넣지 않는다. 현재 계획상 필요한 키는 없다.

### 6.6 i18n

모든 UI 문자열은 `src/i18n/ko.json`/`en.json` 키로. 천체 이름은 카탈로그 데이터의 `names.ko/en`을 사용하고, 없으면 영문/기호로 폴백.

---

## 7. 태스크 로드맵

| 태스크 | 제목 | 핵심 산출물 | 선행 | GPT Pro |
|---|---|---|---|---|
| **T0** (2세션: T0a 셸·배포 / T0b 데이터·astro) | 프로젝트 셋업 · 데이터 파이프라인 · 배포 | 실행되는 PWA 셸, 데이터 팩 v1, GitHub Pages 배포 URL, 테스트 기반, G3용 대상 표 | — | G2(한글 이름 표) 병행 |
| **T1** | 천구 렌더러 | Stellarium식 하늘 뷰(수동 조작·시간 제어·오버레이·야간 모드) | T0 | — |
| **T2** | 센서 연동 (AR 모드) | GPS·방향 센서·보정 마법사·관측지 관리(보이는 하늘 범위 포함) | T1 | G1(센서 리서치)은 T2 **전에** |
| **T3** (2세션: T3a 검색·상세·찾아가기·박명 / T3b 날씨·추천·오늘 밤·현상) | 검색 · 상세 · 찾아가기 · 오늘 밤 추천 · 날씨 | 검색, 상세 시트, 방향 화살표, 추천 엔진, 날씨/박명/달 위젯 | T1(T2 권장) | — |
| **T4** | 관측 기록 · 북마크 · 통계 | Dexie 저장, ★ 오버레이, 기록 폼, 스케치, 내보내기 | T3 | — |
| **T5** | 망원경/쌍안경 가이드 | 장비 프로필, FOV 원, push-to 정렬·안내, 스타 호핑, 접안렌즈 뷰 | T2, T3 | G4(수학 리뷰)는 T5 **후** |
| **T6** | 콘텐츠 팩 (AI 요약 스토리) | 콘텐츠 스키마·생성/검증 파이프라인·뷰어·오늘의 천체 | T3 | G3(콘텐츠 생성)은 T6 **전** |
| **T7** | 학습 시스템 | 미션·배지·퀴즈(간격 반복)·학습 경로·진행률 | T4, T6 | G5(퀴즈·미션 콘텐츠) T7 **전** |
| **T8** | 마감 · 품질 · 릴리스 | 온보딩, 설정, i18n 완성, 성능·접근성·오프라인 감사, 실기기 QA, v1.0 | T1~T7 | — |
| 확장 | T9 클라우드 동기화 · T10 AI 대화 · T11 Capacitor · T12 위성 · T13 마운트 연동 | `plan/99-deferred-tasks.md` | T8 | — |

한 태스크는 **한 세션(길면 두 세션)** 분량이다. 세션 중간에 끊기면 STATUS에 "진행 중 + 다음 할 일"을 남기고, 다음 세션이 이어서 한다.

### 7.1 개발 환경 (Task 0 시작 시 확정, DECISIONS에 기록)

코드는 **GitHub 저장소**에 축적한다. 실행 경로는 **A(Claude Code 로컬)로 확정**(D-007). 경로 B는 로컬을 쓸 수 없을 때의 대안으로만 남긴다.

- **경로 A (확정)**: Claude 데스크톱 앱의 **Claude Code**(로컬)에서 이 프로젝트에 붙여 실행. 저장소는 사용자 PC에 clone. git push, `vite --host`로 폰 테스트, 모두 로컬에서 자연스럽다.
- **경로 B**: Cowork 클라우드 세션에서 실행. 세션 시작 시 저장소를 clone/push할 수 있어야 한다 → 사용자가 해당 저장소 한정 fine-grained PAT를 세션에 제공하거나 GitHub 커넥터를 연결. 클라우드 샌드박스에는 Node 22·pnpm·Chromium(Playwright)이 있어 빌드·스크린샷 검증이 가능하다. 단, 외부 다운로드(codeberg 등)가 프록시에 막힐 수 있으므로 원본 데이터는 사용자가 업로드하는 대체 경로를 항상 둔다.

**사용자 사전 준비(경로 B, T0 시작 전)**: ① 빈 GitHub 저장소 생성 ② fine-grained PAT 발급 — 권한 **Contents: Read/Write + Workflows: Read/Write**(워크플로 파일 push에 필요), 만료 30일 이내, 해당 저장소 한정 ③ 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정(세션은 관리자 권한이 없어 대신 할 수 없다). Pages를 켤 수 없으면 T0는 `pnpm preview --host`(같은 Wi-Fi) 또는 로컬 HTTPS(mkcert) 안내로 마무리한다.

어느 경로든 **실기기(폰) 테스트는 사용자가** 한다. 그래서 Task 0에서 GitHub Pages(HTTPS) 자동 배포를 먼저 만든다 — 센서 API는 HTTPS에서만 동작한다.

---

## 8. 품질 기준 (Definition of Done) & 테스트 전략

태스크는 아래를 모두 만족해야 "완료"다.

1. 태스크 프롬프트의 **수용 기준 체크리스트 전부 ✅** (불가능한 항목은 사유와 함께 ⚠️로 보고).
2. `pnpm typecheck && pnpm lint && pnpm test` 통과, 빌드 성공, 콘솔 에러 0.
3. 데스크톱 Chromium(Playwright)으로 핵심 화면 **스크린샷을 찍어 직접 확인**(세션이 이미지를 Read로 봄). 잘못 그려진 것(예: 별자리가 뒤집힘)을 눈으로 검증한다. Playwright 설정은 `timezoneId:'Asia/Seoul'`, `locale:'ko-KR'`, Chromium 인자 `--use-angle=swiftshader --enable-unsafe-swiftshader`(헤드리스 WebGL), 모바일 뷰포트.
4. 배포 URL 갱신, `plan/STATUS.md`·`plan/DECISIONS.md` 갱신·커밋, 태그 `task-N-done`.
5. **실기기 테스트 체크리스트**를 사용자에게 전달(§9 템플릿). 사용자가 결과를 알려주면 다음 세션 시작 시 반영.

천문 계산의 정확도 검증 방법(공통): (a) 불변량 — 북극성 고도 ≈ 위도(±1°), **태양 남중 시각**(`SearchHourAngle(Body.Sun, observer, 0, date)`)에 방위 180°(±0.5°; 대전은 시계 정오가 아니라 ≈12:30 KST에 남중), 천구 적도가 동점·서점을 지남; (b) **독립 소스 교차 검증** — 세션이 JPL Horizons API(`https://ssd.jpl.nasa.gov/api/horizons.api`, 관측자 표 `OBSERVER`, 대전 좌표, 수량 `4`=방위/고도)로 행성·달 alt/az를 받아 비교(≤ 0.1°). 네트워크가 막히면 사용자가 Stellarium(데스크톱/모바일)에서 읽은 **기준 표**(대전, 2026-09-06 21:00 KST: 토성·목성·달·베가·알타이르의 alt/az)를 한 번 제공하고 이후 세션은 그 표를 테스트 픽스처로 쓴다; (c) 빠른 경로(회전행렬) vs 느린 경로(`Rotation_EQJ_EQD` → `Horizon(…, raHours, dec, null)`) 랜덤 50개 별 비교 ≤ 0.01°. 성능은 DevTools 대신 **앱 내 fps 카운터(디버그 HUD)** 로 측정한다.

---

## 9. 세션 인수인계 프로토콜

### 9.1 시작 문구 (사용자가 새 세션에서 입력)

> "별관찰 프로젝트 **Task N** 진행해줘." (+ 실기기 테스트 결과나 GPT Pro 산출물이 있으면 함께 첨부)

### 9.2 완료 보고 템플릿 (세션 마지막 메시지 + `plan/STATUS.md`에 요약 반영)

```
## Task N 완료 보고 (YYYY-MM-DD)
- 구현 요약: (5줄 이내)
- 산출물: 커밋/태그, 배포 URL, 새로 생긴 파일·데이터 팩 버전
- 수용 기준 결과: ✅ n / ⚠️ n(사유) / ❌ n(사유)
- 자동 테스트: typecheck/lint/test/build 결과, 스크린샷 확인 내용
- 결정 사항: DECISIONS.md에 추가한 항목 제목
- 알려진 이슈 / 다음 태스크로 넘기는 것
- 사용자 액션 필요: ① 실기기 테스트 체크리스트(아래) ② GPT Pro 요청 G? 실행 ③ 결정 필요 질문
### 실기기 테스트 체크리스트
- [ ] (기기/브라우저) …
```

### 9.3 STATUS.md 규칙

- 태스크별 상태 ⬜ 대기 / 🟡 진행 중 / ✅ 완료 / ⏸ 보류. 최근 완료 보고 3개까지 유지, 나머지는 `plan/reports/` 문서로 이동.
- "다음 세션이 알아야 할 것" 섹션을 항상 최신으로.
- 정본은 저장소 `plan/`(§0). 갱신은 항상 커밋한다(`docs: STATUS T1 완료`).

---

## 10. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| iOS Safari 센서 제약(권한 요청 필수, absolute 이벤트 없음, 진동 API 없음) | 사용자 제스처로 권한 요청, 자이로 상대 방향 + 나침반 heading 동기화 + **별 정렬 보정**을 1급 기능으로. 진동 대신 소리/시각 피드백 |
| 금속 경통·마운트 근처 자기장 간섭으로 나침반 오차 | 망원경 모드는 정렬 후 **자이로 상대 회전만** 사용, 주기적 재정렬 안내 |
| 센서 정밀도(±2~5°)로 망원경 도입 한계 | 접안렌즈/파인더 시뮬레이션 뷰 + 스타 호핑으로 마지막 1°는 사람이 |
| 데이터 라이선스(CC BY-SA) 표기 누락 | 앱 내 "정보/라이선스" 화면 + `DATA-LICENSES.md` (Task 0) |
| 세션 간 컨텍스트 유실 | STATUS/DECISIONS/완료 보고 규약 준수, 태그·배포 URL 고정 |
| AI 생성 콘텐츠의 사실 오류 | 스키마 강제 + 카탈로그 수치 자동 대조 + 출처 필드 + Claude 검증 패스(T6) |
| 브라우저 방향 API 향후 변경 | 센서 계층을 어댑터 패턴으로 격리(`sensors/orientation/*Provider`) |
| Android 절대 방향은 **자북** 기준(대전 편각 ≈ 8~9° W) → 미보정 시 AR이 ~9° 틀어짐 | WMM 편각 보정을 절대 소스에 기본 적용(T2 MUST), 디버그 패널에 적용값 표시, 별 정렬이 최종 보정 |
| 클라우드 세션에서 codeberg/GitHub 원본 다운로드가 프록시에 막힘 | `data:fetch` 실패 시 사용자가 원본 파일을 업로드해 `data-src/raw/`에 두는 대체 경로 문서화 |
| 세션 한 번에 못 끝내는 큰 태스크(T0, T3) | 프롬프트에 명시된 절단선(T0a/T0b, T3a/T3b)에서 멈추고 STATUS에 기록 |
