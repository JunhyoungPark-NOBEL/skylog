# 역사 천체물리 선행 문제와 개념 사전

검토일: 2026-09-11. 데이터: `src/learn/historyLessons.ts`, `HISTORY_LESSONS_VERSION = 1`.

기존 역사 문제 30개 각각에 **선행 선택 문제 2개, 총 60개**를 연결한다. 단순한 개념 설명을 먼저 읽게 하는 방식에서 벗어나, 먼저 상황을 판단하고 그다음 비례·단위·핵심 관계를 직접 선택해 본다. 각 선행 문제는 한국어·영어 질문, 선택지 3개, 정답 1개, 선택 뒤 읽는 해설을 갖는다. 본 문제의 ID·정답·허용오차·힌트·기존 진도는 이 데이터에서 수정하지 않는다.

각 lesson의 `scene`은 상황 도입, `concepts`는 길게 누르기/키보드로 여는 용어 사전, `relations`는 일반 관계식, `steps` 2개는 본 문제로 이어지는 사고 방향이다. `diagramKey`는 기존 이야기 ID 10개를 사용한다. 도해는 다른 모듈의 실제 문제 ID와 연결하며 이 문서에서 모든 이미지의 검증을 대신하지 않는다.

관측 질문의 교육용 숫자(예: 장반경 3배, 수소 입자를 세는 간단한 모형의 1/2과 1/4)는 채점 문항 정답을 대신 대입한 것이 아니다. 결과를 미리 완성하지 않고 비례와 조건을 배운다. 관측 질문 답과 채점 문항 성취는 저장 계층에서 구별한다. 이 파일에는 저장·결제·완료 판정 코드가 없다. beta.17부터 화면에서는 이를 준비/본문제로 나누지 않고, `historyStory.ts`의 연결 문장과 함께 이야기당 9개 연속 단계로 제공한다. 실제 학습 흐름은 [HISTORY-LEARNING-UX.md](HISTORY-LEARNING-UX.md)를 따른다.

## 30개 연결과 선행 사고

| 본 문제 ID                 | 첫 선행 문제              | 둘째 선행 문제                |
| -------------------------- | ------------------------- | ----------------------------- |
| eratosthenes-circumference | 천정에서 잰 각도          | 원의 부분/전체 비율           |
| eratosthenes-uncertainty   | 1σ의 의미                 | 독립 상대 분산의 합           |
| eratosthenes-baseline      | 거리의 방향 성분          | 코사인 투영                   |
| kepler-binary-mass         | 상대 궤도와 두 별의 궤도  | 크기의 세제곱 법칙            |
| kepler-apsis-speed         | 이심률 0의 원             | 일정한 곱의 역비례            |
| kepler-flight-time         | 보조 원의 각도            | 시간에 비례하는 평균 각도     |
| romer-path-speed           | 출발 사건과 도착 지연     | 길이/시간 단위                |
| romer-period-bias          | 사건 수와 간격 수         | 다음 신호의 추가 여행 시간    |
| romer-model-test           | 가설을 가르는 관측        | 일정한 주기 오류의 누적       |
| leavitt-modulus            | 고유 밝기와 받은 빛       | 로그의 역연산                 |
| leavitt-extinction-bias    | 소광 보정 부호            | 로그 차와 비율                |
| leavitt-zero-point         | 기울기와 공통 이동        | 독립적인 거리 기준점          |
| payne-saha-ratio           | 이온화와 여기             | 음의 지수의 온도 의존성       |
| payne-level-population     | 부분 집합 비율의 곱       | 이온/중성 비에서 전체 수      |
| payne-abundance-inference  | 광학 깊이와 통과 빛       | 여러 선으로 역문제 검증       |
| einstein-deflection        | 중심 기준 충돌 매개변수   | 거리와 편향의 역비례          |
| einstein-weighted-fit      | 측정 정밀도와 영향력      | 표준편차가 아닌 역분산 가중치 |
| einstein-systematics       | 반복에도 남는 공통 오차   | 독립 평균 오차의 제곱근 법칙  |
| chandra-composition        | 축퇴압과 파울리 배타 원리 | 전자당 질량과 전자 공급량     |
| chandra-radius             | 음의 지수의 방향          | 세제곱근의 역수               |
| chandra-scaling            | 중력을 지지하는 압력      | 거듭제곱의 지수 곱            |
| hubble-slope               | 관측−예측 잔차            | 잔차를 제곱하는 이유          |
| hubble-time                | 속도/거리의 차원          | 초에서 년으로 환산            |
| hubble-calibration         | 가로축 거리만 변환        | 분자·분모의 거리 인자 수      |
| zwicky-virial-mass         | 평균 운동과 내부 퍼짐     | 등방적인 세 방향의 제곱합     |
| zwicky-noise-correction    | 분산과 표준편차           | 독립 잡음 분산 빼기           |
| zwicky-evidence            | 별 외의 보통 물질         | 중력렌즈의 독립 질량 근거     |
| rubin-inclined-mass        | 정면 원반의 시선 성분     | 속력 보정과 질량 제곱 관계    |
| rubin-density-slope        | 누적 질량과 국소 밀도     | 얇은 구껍질 면적과 부피       |
| rubin-missing-fraction     | 속력비에서 질량비         | 전체 중 남은 몫               |

## 용어와 수식 원칙

- 같은 용어는 공통 정의 상수를 재사용한다. 묶음 제목에는 본문의 실제 말(`중심각`, `자오선`, `소광`, `분산`, `LTE`, `구껍질` 등)을 `aliases`로 함께 둔다. `호` 같은 한 글자나 일상어로 오매칭하기 쉬운 독립된 `여기`는 alias로 사용하지 않는다.
- 설명과 선행 선택지의 식은 명시적인 `\(...\)` 수식 구간이다. 변수와 설명 단어를 런타임 추정으로 바꾸지 않는다. 도·분수·지수·그리스 문자·아래첨자는 KaTeX 구문으로 저장하고, 실제 렌더러의 아래첨자 직립체 변환까지 검사한다. 용어 검색용 제목·alias는 일반 텍스트다.
- 1σ는 최대 오차가 아니다. 정규분포의 약 68% 구간이라는 조건을 붙이고, 독립 오차와 공통 영점 오차를 구별한다. 천문학의 ‘속도 분산 σ’는 통계적으로 표준편차이며 분산은 σ²라는 관행도 설명한다.
- 고급 문제의 가정을 생략하지 않는다. 상대 궤도 장반경·보조 원에서 잰 이심근점이각·라디안·고정 전자 밀도와 다른 층의 구별·약한 중력장·정적 비상대론적 백색왜성·원점 고정 최소제곱·등방적인 1차원 속도 분산·구대칭과 유한한 반경 구간을 명시한다.
- 역사적 장면은 가상의 동행 상황으로 독자적으로 썼다. 학자가 실제로 했다는 대화·생각·새 측정값을 만들어 인용하지 않는다. 역사 귀속과 기존 문제 수치의 교육용 가정은 [기존 검증 기록](HISTORY-QUESTS-SOURCES.md)을 유지한다.

## 출처와 이번 개념 검증

역사 10개 사건·원논문·기존 수식의 근거는 [HISTORY-QUESTS-SOURCES.md](HISTORY-QUESTS-SOURCES.md)에 이미 문항별로 정리되어 있다. 아래는 이번 선행 설명을 위해 추가로 확인하거나 다시 대조한 기관 자료다. 원문 문장이나 그림을 전재하지 않고 정의와 수학 관계를 독자적으로 설명했다.

| 영역                | 확인한 근거                                                                                                                                                                                                                                                                | 적용한 경계                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 궤도                | [NASA, Orbits and Kepler’s Laws](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/) 및 기존 NASA Space Mathematics                                                                                                                                            | 면적과 주기 법칙, 상대 궤도에 대한 뉴턴 확장 구별, 이심근점이각은 진근점이각이 아님                                           |
| 오차 전파           | [NIST TN1297, 부록 A](https://emtoolbox.nist.gov/publications/nisttechnicalnote1297s.pdf), [NIST 불확도 전파](https://www.itl.nist.gov/div898/handbook/mpc/section5/mpc55.htm), [NIST 민감도 계수](https://www.itl.nist.gov/div898/handbook/mpc/section5/mpc56.htm)        | 작은 오차의 1차 근사, 독립이면 공분산 항이 사라짐, 공통 오차는 반복으로 자동 소거되지 않음                                    |
| 가중 평균·직선 적합 | [NIST, Weighted Least Squares](https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd143.htm), [일반 가중 최소제곱 기준](https://itl.nist.gov/div898/handbook/pmd/section4/pmd432.htm)                                                                                  | 독립 오차의 역분산 가중, 원점 고정과 같은 속도 오차라는 문제 조건을 유지                                                      |
| 등급·거리           | [Swinburne University COSMOS, Distance Modulus](https://astronomy.swin.edu.au/cosmos/D/Distance%2BModulus)                                                                                                                                                                 | 절대등급의 10 pc 기준, 등급의 로그·빛의 역제곱·거리 지수, 소광은 같은 대역에서 보정                                           |
| 별 대기             | [NRAO, Statistical Mechanics](https://www.aoc.nrao.edu/~smyers/courses/astro12/L9.html), [Radiative Transfer](https://www.aoc.nrao.edu/~smyers/courses/astro12/L10.html)                                                                                                   | 이온화와 여기의 구별, 전체 분율은 두 조건의 곱, 순수 흡수식과 실제 복사 전달의 범위 구별                                      |
| 빛의 편향           | [Max Planck Institute의 Einstein Online, Gravitational deflection of light](https://www.einstein-online.info/en/spotlight/light_deflection/)                                                                                                                               | 태양 중심과 표면 기준 구별, 충돌 매개변수와 최근접 거리의 약한 장 관계                                                        |
| 백색왜성            | [NASA Imagine the Universe, White Dwarfs](https://imagine.gsfc.nasa.gov/science/objects/dwarfs2.html), 기존 찬드라세카르 노벨 강연·별 구조 강의                                                                                                                            | 파울리 배타에 의한 축퇴압, 전자당 물질 질량과 전자 자체 질량 구별, 정확한 수치 계수와 차원 분석의 한계                        |
| 팽창 시간           | [UCLA Ned Wright, Cosmology Tutorial](https://www.astro.ucla.edu/~wright/cosmoall.htm)                                                                                                                                                                                     | 현재 H의 역수는 시간 척도이고 나이는 팽창 이력에 의존함. 오래된 페이지의 당시 최신 H·우주 나이 수치는 새 문제에 가져오지 않음 |
| 은하단              | [NASA/IPAC NED, Zwicky 1933 원논문 번역 §5](https://ned.ipac.caltech.edu/level5/March17/Zwicky/Zwicky5.html) 및 기존 문항 검산                                                                                                                                             | 평형 가정, 속도 퍼짐으로 얻는 질량과 특정 입자 정체의 증거 구별                                                               |
| 회전 곡선           | 기존 [Rubin & Ford 1970 원논문](https://web.physics.rutgers.edu/grad/690/Rubin-Ford-1970.pdf)·[Carnegie 장비/공동 연구 기록](https://carnegiescience.edu/news/kent-ford-vera-rubins-image-tube-spectrograph-named-smithsonians-101-objects-made-america) 및 기존 독립 검산 | 정면 i=0, 장축 시선 성분, 구대칭 내부 질량식, 얇은 구껍질과 채워진 구 부피의 차이                                             |

## 자동 검증 범위

`tests/unit/learn/historyLessons.test.ts`는 기존 30개 ID의 일대일 연결·10개 도해 키·60개 고유 선행 문제·각 선택지 3개와 정답 참조·한영 완전성·2~4개 용어·실제 용어 alias·공통 정의 일관성을 검사한다. 본 문제의 대표 수치 정답이 선행 문제에 복제되지 않았는지, 학습자가 혼동하기 쉬운 핵심 물리 가정이 빠지지 않았는지도 검사한다.

수식 전체는 실제 `renderHistoryMath`의 엄격한 KaTeX·직립 아래첨자 경로로 렌더링한다. 별도의 입력으로 크기 세제곱, 가중치, 구껍질 면적, 사건 사이 간격, 부분 분율 곱을 계산하여 선행 정답과 대조한다. 2026-09-11 전용 **7개 단위 테스트·담당 파일 ESLint/Prettier·전체 typecheck 통과**를 확인했다. 최종 데이터는 30개 lesson·60개 선행 문제·114개 용어 참조·46개 관계식이다. 이는 콘텐츠·수식 단위 검증이며 화면 배치, 터치 조작, 오프라인 저장, 실제 휴대폰 검증을 대신하지 않는다.
