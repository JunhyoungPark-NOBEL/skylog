# 천문학 역사 심화 탐구 — 출처와 계산 검증

검토일: 2026-09-10. 콘텐츠 버전: `HISTORY_QUESTS_VERSION = 1`.

`src/learn/historyQuests.ts`에는 역사적 발견 10개를 출발점으로 만든 한국어·영어 문제 30개가 있다. 수치 입력 21개, 선택형 9개이며, 각 문제에 관찰 → 핵심 관계식 → 대입의 힌트 3개와 풀이 3단계, 오개념 설명을 제공한다. 총 힌트는 90개다. 이야기와 문제 문장은 독자적으로 작성했으며 원문 문제나 긴 원문 문장을 전재하지 않았다.

## 역사 기록과 교육용 계산의 경계

이 콘텐츠는 역사 자료의 관측값을 그대로 복원하는 실습이 아니다. 문제의 수치는 계산 원리를 비교할 수 있도록 정한 **현대 교육용 모형**이며, 각 문제의 `context`에 그 조건을 표시한다. 특히 세페이드 주기–광도 관계의 계수, 식 관측의 두 측정값, 은하의 거리–속도 표, 성단과 회전 곡선 수치를 해당 학자의 원자료로 제시하지 않는다. 역사적 사건의 연대와 공헌은 아래 기관 자료·원논문에서 확인했다.

상수와 필요한 식은 문제나 힌트에 제공한다. 계산기 사용을 허용하며, 수치 입력의 `tolerance`는 **답의 표시 단위에 적용하는 절대 허용 오차**다. 이 값은 측정 장비의 관측 오차나 통계적 신뢰구간을 뜻하지 않는다. 예를 들어 `10¹⁴ M☉` 단위의 답 `9.4166`은 `9.4166 × 10¹⁴ M☉`이며, kg나 태양 질량을 그대로 입력하는 문제가 아니다. 학습 시간 `minutes`는 난이도 안내용 추정치다.

## 코스별 근거와 유의점

### 1. 에라토스테네스 — 그림자에서 지구의 크기까지

- [American Physical Society, Eratosthenes Measures Earth](https://www.aps.org/apsnews/2006/06/eratosthenes-measures-earth): 후대 기록으로 전해진 측정법, 약 7.2°의 기하 관계, 고대 스타디온 환산의 불확실성을 확인했다.
- 원저가 남아 있지 않으므로 800 km와 40,000 km를 정확한 고대 측정 원자료로 표현하지 않는다. 구형 지구와 평행한 태양광은 문제의 가정이다. 지구가 둥글다는 사실을 처음 증명한 인물이라고 서술하지 않는다.
- 둘레는 `C = 360s/θ`, 독립적인 작은 표준불확도는 `(σC/C)² = (σs/s)² + (σθ/θ)²`로 전파한다. 기준선이 남북 방향과 30° 어긋난 문제는 **국소 평면 근사**에서 남북 성분을 잘못 사용하는 편향을 묻는다. 실제 두 고대 도시의 정밀 지오데식 계산이 아니다.

### 2. 케플러 — 궤도를 시간으로 읽기

- [NASA, Orbits and Kepler’s Laws](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/): 브라헤의 정밀 관측을 활용한 케플러의 타원 궤도·면적·주기 법칙과 1609/1619년의 구분을 확인했다.
- [NASA, Space Mathematics, Chapter 9](https://science.nasa.gov/wp-content/uploads/2023/10/Space_Mathematics.pdf): 평균근점이각과 이심근점이각의 관계 `M = E − e sin E`를 대조했다.
- 쌍성 총질량 문제는 케플러의 경험 법칙에 **뉴턴 역학을 적용한 현대적 확장**이다. `a`는 한 별의 질량중심 궤도가 아닌 두 별의 상대 궤도 긴반지름이다. 이 단위계에서 `Mtotal/M☉ = (a/AU)³/(P/yr)²`를 사용한다.
- 근일점·원일점에서는 반지름과 속도가 수직이므로 각운동량 보존이 속력비를 정한다. 시간은 진근점이각을 단순 비례 환산하지 않고 케플러 방정식으로 구한다.

### 3. 뢰머 — 늦게 도착하는 이오의 식

- [Observatoire de Paris, Rømer démontre que la vitesse de la lumière est finie](https://observatoiredeparis.psl.eu/il-y-a-340-ans-romer-demontre.html): 카시니와 뢰머가 연구한 이오의 식 시각과 지구–목성 거리 변화, 1676년 유한한 빛의 전달 시간 논의를 확인했다.
- [1676년 보고의 Philosophical Transactions 영문판](https://doi.org/10.1098/rstl.1677.0024): 역사 보고의 출판 기록이다.
- 뢰머가 현대의 정확한 km/s 값을 측정했다고 서술하지 않는다. 당시 유한한 전달 시간의 논증과 이후 호이겐스의 속력 환산은 구별한다. 문제의 `1.8 AU`, `1,200 s`, 40개 간격의 60초 변화는 교육용 수치다.
- `c = ΔD/Δt`; 일정한 주기 오차와 관측자 거리 변화의 차이는 접근·후퇴 구간에서 도착 시각 추세가 반전되는지 비교한다. 한 번의 식만으로 두 모형을 판별하지 않는다.

### 4. 리비트 — 변광성의 주기에서 거리까지

- [Leavitt & Pickering, Harvard Circular 173 (1912)](https://articles.adsabs.harvard.edu/pdf/1912HarCi.173....1L): 소마젤란은하 세페이드의 주기와 밝기 관계를 보고한 원논문이다.
- [Harvard Plate Stacks, Variable Stars](https://platestacks.cfa.harvard.edu/henrietta-swan-leavitt/variable-stars): 1908/1912년 발견 과정과 같은 계의 별들을 비교한 관측 조건을 확인했다.
- 같은 거리에 있다는 조건은 상대적인 관계를 드러내지만 **절대 영점**을 스스로 결정하지 못한다. 모형의 `M = −2.76 log₁₀P − 1.40`은 문제에서 제공하는 교정식이지 리비트가 절대 거리까지 확정한 역사 원식이라는 뜻이 아니다.
- `μ = m − A − M = 5log₁₀(d/10 pc)`. 소광을 무시하면 거리가 `10^(A/5)`배 커진다. 밝기 관계에 대한 발견의 공헌과 이후의 절대 거리 교정을 구분한다.

### 5. 페인 — 스펙트럼의 세기와 별의 조성

- [Harvard Wolbach Library, Education and Doctoral Thesis](https://library.cfa.harvard.edu/cecilia-payne-gaposchkin/education-and-doctoral-thesis): 페인의 1925년 학위논문, 사하 이온화 이론을 이용한 해석, 수소·헬륨의 풍부함에 관한 결론의 역사적 맥락을 확인했다.
- [Payne, Stellar Atmospheres (1925)](https://articles.adsabs.harvard.edu/pdf/1925HarMo...1.....P): 원논문의 공개 기록이다.
- [NRAO, Saha Equation and Boltzmann Law](https://www.aoc.nrao.edu/~smyers/courses/astro12/L9.html): 온도·전자 밀도에 따른 이온화비와 볼츠만 점유비, 전체 원자 수를 분모로 삼을 때 중성 분율을 곱하는 관계를 대조했다.
- 첫 문제는 전자 저장고가 전자 밀도를 고정하는 이상화 모형에서 `R ∝ T^(3/2) exp(−χ/kT)`를 비교한다. 다음 문제의 주어진 이온화비 0.01과 10은 **서로 다른 전자 밀도도 허용하는 별도 모형**이다. 이를 앞 문제와 같은 전자 밀도 조건이라고 해석하면 일관되지 않으므로 본문에서 분명히 분리했다.
- 두 번째 문제의 중성 수소 점유식은 바닥 상태가 중성 분배함수를 지배하는 근사다. 실제 선의 세기가 곧 원소 함량이 되지 않으며, 이온화·여기·밀도·복사 전달을 함께 고려해야 한다.

### 6. 아인슈타인과 일식 원정대 — 휘어진 빛과 측정 오차

- [Dyson, Eddington & Davidson (1920), A Determination of the Deflection of Light…](https://doi.org/10.1098/rsta.1920.0009): 1919년 두 원정의 관측을 다룬 원논문과 공동 저자를 확인했다.
- [MIT OpenCourseWare가 제공하는 해당 원논문 사본](https://ocw.mit.edu/courses/sts-003-the-rise-of-modern-science-fall-2010/799c06c530ca21f42b6738fd4b6bd3c5_MITSTS_003F10_assn4a_dys.pdf): 관측·자료 분석의 역사적 맥락을 확인하는 공개 원문이다.
- 일반상대론 약한 장의 편향식 `α = 4GM/(bc²)`를 사용하며 `b = 2R☉`다. 비교 대상이 되는 뉴턴식 계수 2와 혼동하지 않는다. 에딩턴 한 명이 모든 관측을 수행한 것으로 서술하지 않는다.
- 가중평균에 쓰는 `1.70 ± 0.20″`, `1.90 ± 0.30″`는 **만든 자료**이며, 오차는 서로 독립인 가우스 표준편차다. 역사 논문에서 쓰인 probable error를 현대의 1σ와 같다고 간주하지 않는다.
- 같은 사진판의 공통 계통오차는 별을 많이 측정해도 독립 오차처럼 `1/√N`로 줄지 않는다. 문제의 `σmean² = σ²/N + τ²`는 그 차이를 분리하는 모형이다.

### 7. 찬드라세카르 — 수축으로도 버틸 수 없는 질량

- [Chandrasekhar, Nobel Lecture (1983)](https://www.nobelprize.org/uploads/2018/06/chandrasekhar-lecture.pdf): 본인이 설명한 백색왜성 구조·축퇴압 연구의 역사적 맥락을 확인했다.
- [Woosley, The Deaths of Massive Stars, §1.4](https://people.math.harvard.edu/~knill/various/chamonix/les_houches_supernovae.pdf): 학술 강의 자료의 `MCh = 5.83 Ye² M☉`와 이상적 한계에 대한 보정을 대조했다. `Ye = 1/μe`다.
- 문제의 차갑고 비회전인 이상 모형은 일반상대론·쿨롱·열 보정을 생략한다. 한계 질량은 백색왜성 잔해에 대한 것이며, 별의 출생 질량과 같은 뜻이 아니다.
- `R ∝ M^(−1/3)`은 비상대론적 정적 모형 사이의 비교다. 한 별이 질량을 얻는 실제 진화 경로 전체로 단정하지 않는다. 극상대론적 축퇴압과 중력 압력의 `R⁻⁴` 의존성이 같아지는 것이 질량 한계의 핵심이다.

### 8. 허블과 르메트르 — 은하의 거리 눈금이 바뀔 때

- [Hubble (1929), A Relation between Distance and Radial Velocity among Extra-Galactic Nebulae](https://doi.org/10.1073/pnas.15.3.168): 거리–시선속도 관계를 발표한 원논문이다.
- [IAU Resolution B4, Hubble–Lemaître Law](https://www.iau.org/static/archives/announcements/pdf/ann18048a.pdf): 르메트르의 1927년 공헌, 허블의 1929년 결과, 슬라이퍼의 속도 관측을 함께 다루는 귀속을 확인했다.
- 세 점의 거리–속도 표는 만든 자료다. 거리는 정확하고 속도 오차가 같으며 절편을 0으로 고정한다는 조건에서 `H = Σdv/Σd²`를 구한다. 이를 개별 `v/d`의 산술평균과 혼동하지 않는다.
- 다음 문제는 별도로 지정한 `H = 70 km/s/Mpc`의 역수를 환산한다. **허블 시간은 우주 나이와 자동으로 같지 않다.** 실제 나이는 팽창 이력에 대한 적분과 우주론적 모형이 필요하다.

### 9. 츠비키 — 은하단에서 보이지 않는 질량 찾기

- [Zwicky (1933), The Redshift of Extragalactic Nebulae, §5 — 영어 번역](https://ned.ipac.caltech.edu/level5/March17/Zwicky/Zwicky5.html): NASA/IPAC NED가 제공하는 원논문 번역이다. 은하단 속도 분산·중력적 결합과 평형 가정에 대한 논의를 확인했다.
- [Bertone & Hooper, History of Dark Matter, §III](https://ned.ipac.caltech.edu/level5/Sept16/Bertone/Bertone3.html): 학술 검토 문헌으로서 당시 거리 눈금과 표본, 이후 해석의 경계를 확인했다.
- 1933년 자료의 질량비를 현재 값으로 그대로 옮기지 않는다. 문제는 균일한 구형 성단의 `U = −3GM²/(5R)`, 등방적인 **1차원** 속도 분산의 `T = 3Mσ²/2`에서 `M = 5Rσ²/G`를 도출하는 교육용 모형이다.
- 계수 5는 이 모형의 밀도 분포에 따른 값이지 모든 은하단에 통용되는 상수가 아니다. 독립 측정 오차는 분산에서 뺀다. 동역학적 질량 불일치는 특정 암흑물질 입자의 직접 검출을 뜻하지 않는다.

### 10. 루빈과 포드 — 평평한 회전 곡선의 함정

- [Rubin & Ford (1970), Rotation of the Andromeda Nebula from a Spectroscopic Survey of Emission Regions](https://web.physics.rutgers.edu/grad/690/Rubin-Ford-1970.pdf): 실제 방출 영역의 분광 측정과 회전 곡선을 다룬 원논문이다. 논문은 기존 21 cm 전파 관측과도 비교한다.
- [Carnegie Science, Kent Ford & Vera Rubin’s Image Tube Spectrograph](https://carnegiescience.edu/news/kent-ford-vera-rubins-image-tube-spectrograph-named-smithsonians-101-objects-made-america): 포드의 장비와 루빈·포드 및 동료들의 관측 공헌을 확인했다.
- 회전 곡선 연구의 모든 공헌을 한 사람에게 돌리지 않는다. 본문은 광학·전파 관측의 여러 연구가 쌓였다는 맥락을 함께 둔다.
- 장축 방향에서 `v = vlos/sin i`, 정면 원반의 `i = 0°`라는 약속을 명시한다. 질량과 밀도 문제는 **구대칭 근사**다. `M(<r) = v²r/G`를 원반 중력장의 정확한 식으로 제시하지 않는다.
- 평평한 회전 곡선에서 `ρ ∝ r⁻²`는 그 곡선이 성립하는 유한한 구간의 결론이다. 중심이나 무한히 먼 곳까지 적용하지 않는다. 바리온으로 설명되지 않는 질량 비율은 같은 반지름에서 `1 − (vb/vobs)²`로 계산하며 속도 차이의 비율과 다르다.

## 독립 수치 검산

아래 답은 문제에 명시한 모형과 상수 안에서의 값이다. 표시 자릿수는 검산용이며 학습자가 이 자릿수를 모두 입력할 필요는 없다.

| 문항 ID                      |   독립 계산값 | 입력 단위 | 절대 허용 오차 |
| ---------------------------- | ------------: | --------- | -------------: |
| `eratosthenes-circumference` |         40000 | km        |              5 |
| `eratosthenes-uncertainty`   |  1.9436506316 | %         |          0.005 |
| `kepler-binary-mass`         |            16 | M☉        |           0.02 |
| `kepler-apsis-speed`         |             4 | 비율      |          0.005 |
| `kepler-flight-time`         | 61.8028136579 | day       |           0.03 |
| `romer-path-speed`           |        224400 | km/s      |            100 |
| `romer-period-bias`          |           1.5 | s         |          0.005 |
| `leavitt-modulus`            | 64.8634433548 | kpc       |           0.04 |
| `leavitt-extinction-bias`    |  1.1481536215 | 비율      |          0.001 |
| `payne-saha-ratio`           | 79831.0814424 | 비율      |             40 |
| `payne-level-population`     |  245.45837498 | 비율      |            0.2 |
| `einstein-deflection`        |  0.8756216407 | arcsec    |          0.001 |
| `einstein-weighted-fit`      |  1.7615384615 | arcsec    |          0.002 |
| `chandra-composition`        |  1.2612222823 | M☉        |          0.002 |
| `chandra-radius`             |  0.7937005260 | 비율      |          0.001 |
| `hubble-slope`               | 71.4285714286 | km/s/Mpc  |           0.03 |
| `hubble-time`                | 13.9684603097 | Gyr       |           0.01 |
| `zwicky-virial-mass`         |  9.4166118333 | 10¹⁴ M☉   |          0.006 |
| `zwicky-noise-correction`    |  0.8888888889 | 비율      |          0.001 |
| `rubin-inclined-mass`        |  2.0088771911 | 10¹¹ M☉   |          0.002 |
| `rubin-missing-fraction`     |            64 | %         |           0.05 |

검산은 콘텐츠의 `answer`를 입력으로 쓰지 않고 문제의 자료와 상수에서 다시 시작한다. 궤도 시간은 `dM/dE = 1 − e cos E`를 10,000개 구간에서 수치 적분하고, 근점 속력비는 본문 각운동량 풀이와 다른 vis-viva 식으로 비교한다. 세페이드 거리는 광도비의 제곱근, 사하 비는 로그의 차이, 기울기 보정은 `1 − cos²i`를 이용한다. 최소제곱 기울기에서 잔차제곱합의 도함수가 0인지, 사진판의 공통 오차가 표본 수를 늘려도 남는지도 검사한다.

검증 파일: `tests/unit/learn/historyQuests.test.ts`. 2026-09-10 로컬 실행에서 **25개 통과**했다. 21개 수치 문항을 빠짐없이 검산하고, 흔한 단위·관계식 오해로 생기는 오답이 허용 범위에 들어오지 않는지 검사한다. 코스·문항 ID의 유일성, 10×3 구성, 두 언어의 필수 필드, 힌트 3개, 풀이 단계, 선택지·정답 참조, HTTPS 출처, 교육용 가정의 핵심 경계도 검사한다. 이는 콘텐츠와 수치 검증 결과이며 실제 기기 UI 또는 결제 동작의 검증을 대신하지 않는다.
