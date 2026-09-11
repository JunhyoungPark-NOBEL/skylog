import type { LocalizedText } from './historyQuests';

export type HistoryDiagramKey =
  | 'eratosthenes-earth'
  | 'kepler-orbits'
  | 'romer-light'
  | 'leavitt-distance'
  | 'payne-stellar-atmospheres'
  | 'einstein-eclipse'
  | 'chandrasekhar-limit'
  | 'hubble-expansion'
  | 'zwicky-cluster'
  | 'rubin-rotation';

export type HistoryWarmup = {
  id: string;
  prompt: LocalizedText;
  choices: { id: string; label: LocalizedText }[];
  answerId: string;
  explanation: LocalizedText;
};
export type HistoryLesson = {
  scene: LocalizedText;
  concepts: { term: LocalizedText; meaning: LocalizedText; aliases?: LocalizedText[] }[];
  relations: { formula: string; explanation: LocalizedText }[];
  steps: LocalizedText[];
  warmups: HistoryWarmup[];
  diagramKey: HistoryDiagramKey;
};

export const HISTORY_LESSONS_VERSION = 1;
const t = (ko: string, en: string): LocalizedText => ({ ko, en });
// 묶음 제목 대신 실제 본문에 쓰인 말로도 사전 설명을 찾는다. 한 글자 기호는 매칭하지 않는다.
const termAliases: Record<string, [string, string][]> = {
  '호와 중심각': [
    ['중심각', 'central angle'],
    ['호의 길이', 'arc length'],
  ],
  '표준편차와 불확도': [
    ['표준편차', 'standard deviation'],
    ['1σ', '1σ'],
    ['표준불확도', 'standard uncertainty'],
  ],
  자오선: [['같은 자오선', 'one meridian']],
  천정각: [['천정', 'zenith']],
  남중: [['태양 정오', 'solar noon']],
  '1차 오차 전파': [
    ['오차 전파', 'uncertainty propagation'],
    ['상대 표준불확도', 'relative standard uncertainty'],
  ],
  '남북 투영': [
    ['남북 성분', 'north–south component'],
    ['투영', 'projection'],
  ],
  코사인: [['cos', 'cosine']],
  '상대 궤도와 질량중심': [
    ['상대 궤도', 'relative orbit'],
    ['질량중심', 'center of mass'],
    ['쌍성', 'binary'],
  ],
  장반경: [['긴반지름', 'semimajor axis']],
  '근일점과 원일점': [
    ['근일점', 'perihelion'],
    ['원일점', 'aphelion'],
  ],
  이심근점이각: [
    ['이심근점이각', 'eccentric anomaly'],
    ['진근점이각', 'true anomaly'],
  ],
  평균근점이각: [
    ['평균근점이각', 'mean anomaly'],
    ['면적 법칙', 'area law'],
  ],
  '고유 주기와 관측 주기': [
    ['고유 주기', 'intrinsic period'],
    ['관측 주기', 'observed period'],
  ],
  '시각 잔차': [['잔차', 'residual']],
  '접근과 후퇴': [
    ['접근', 'approach'],
    ['후퇴', 'recession'],
  ],
  '세페이드 변광성': [['세페이드', 'Cepheid']],
  '겉보기 등급과 절대등급': [
    ['겉보기 등급', 'apparent magnitude'],
    ['절대등급', 'absolute magnitude'],
    ['등급', 'magnitude'],
  ],
  상용로그: [
    ['로그', 'logarithm'],
    ['log₁₀', 'base-10 logarithm'],
  ],
  '기울기와 영점': [
    ['기울기', 'slope'],
    ['영점', 'zero point'],
  ],
  '파섹과 거리 단위': [
    ['파섹', 'parsec'],
    ['kpc', 'kpc'],
    ['Mpc', 'Mpc'],
  ],
  '이온화와 여기': [
    ['이온화', 'ionization'],
    ['이온', 'ion'],
    ['중성', 'neutral'],
    ['여기 에너지', 'excitation energy'],
  ],
  '국소 열역학 평형 LTE': [
    ['LTE', 'LTE'],
    ['국소 열역학 평형', 'local thermodynamic equilibrium'],
  ],
  '지수함수와 열에너지': [
    ['지수함수', 'exponential'],
    ['열에너지', 'thermal energy'],
    ['볼츠만 상수', 'Boltzmann constant'],
  ],
  '전자 밀도와 분배함수': [
    ['전자 밀도', 'electron density'],
    ['분배함수', 'partition function'],
  ],
  '중성 분율과 준위 점유율': [
    ['중성 분율', 'neutral fraction'],
    ['준위', 'level'],
    ['준위 점유', 'level population'],
  ],
  '흡수선과 존재량': [
    ['흡수선', 'absorption line'],
    ['존재량', 'abundance'],
  ],
  '광학 깊이와 복사 전달': [
    ['광학 깊이', 'optical depth'],
    ['복사 전달', 'radiative transfer'],
  ],
  '충돌 매개변수': [['충돌 매개변수', 'impact parameter']],
  '라디안과 초각': [
    ['라디안', 'radian'],
    ['초각', 'arcsecond'],
  ],
  '차원과 단위': [
    ['차원', 'dimension'],
    ['SI 단위', 'SI units'],
  ],
  '역분산 가중 평균': [
    ['역분산', 'inverse variance'],
    ['가중치', 'weight'],
    ['가중 평균', 'weighted mean'],
    ['가중합', 'weighted sum'],
  ],
  '전자당 평균 질량': [
    ['전자당 평균 질량', 'mean mass per electron'],
    ['조성', 'composition'],
  ],
  '전자 분율': [['전자 분율', 'electron fraction']],
  '백색왜성과 태양질량': [
    ['백색왜성', 'white dwarf'],
    ['태양질량', 'solar mass'],
  ],
  '비례와 거듭제곱': [
    ['비례', 'proportionality'],
    ['거듭제곱', 'power'],
    ['지수', 'exponent'],
  ],
  '허블 계수와 허블 시간': [
    ['허블 시간', 'Hubble time'],
    ['허블 계수', 'Hubble parameter'],
  ],
  '절편과 잔차': [
    ['절편', 'intercept'],
    ['잔차', 'residual'],
  ],
  'Gyr와 팽창 이력': [
    ['Gyr', 'Gyr'],
    ['팽창 이력', 'expansion history'],
  ],
  '1차원 속도 분산': [
    ['속도 분산', 'velocity dispersion'],
    ['시선 분산', 'line-of-sight dispersion'],
  ],
  '등방성과 에너지': [
    ['등방성', 'isotropy'],
    ['등방적', 'isotropic'],
    ['운동에너지', 'kinetic energy'],
    ['위치에너지', 'potential energy'],
  ],
  '비리얼 평형': [
    ['비리얼', 'virial'],
    ['평형', 'equilibrium'],
  ],
  '바리온 물질': [
    ['바리온', 'baryonic matter'],
    ['보통 물질', 'ordinary matter'],
  ],
  '독립 검증과 중력렌즈': [
    ['중력렌즈', 'gravitational lensing'],
    ['독립 검증', 'independent tests'],
  ],
  '경사각과 시선 속도': [
    ['경사각', 'inclination'],
    ['시선 속도', 'line-of-sight velocity'],
    ['시선 속력', 'line-of-sight speed'],
  ],
  '원운동과 구심 가속도': [
    ['원운동', 'circular motion'],
    ['구심 가속도', 'centripetal acceleration'],
  ],
  '밀도와 얇은 구껍질': [
    ['밀도', 'density'],
    ['구껍질', 'spherical shell'],
  ],
  미분: [
    ['미분', 'derivative'],
    ['추가 질량', 'added mass'],
  ],
};
const concept = (ko: string, en: string, meaningKo: string, meaningEn: string) => ({
  term: t(ko, en),
  meaning: t(meaningKo, meaningEn),
  aliases: (termAliases[ko] ?? []).map(([aliasKo, aliasEn]) => t(aliasKo, aliasEn)),
});
const relation = (formula: string, ko: string, en: string) => ({ formula, explanation: t(ko, en) });
// 선택지 순서는 문항마다 직접 정한다. 정답 위치를 고정하거나 본 문제를 자동 완료하지 않는다.
const warmup = (
  id: string,
  prompt: LocalizedText,
  choices: [LocalizedText, LocalizedText, LocalizedText],
  answerIndex: 0 | 1 | 2,
  explanation: LocalizedText,
): HistoryWarmup => ({
  id,
  prompt,
  choices: choices.map((label, index) => ({ id: `choice-${index + 1}`, label })),
  answerId: `choice-${answerIndex + 1}`,
  explanation,
});

const terms = {
  sigma: concept(
    '표준편차와 불확도',
    'Standard deviation and uncertainty',
    '\\(\\sigma\\)는 값의 퍼짐을 나타내는 표준편차다. \\(\\pm1\\sigma\\)는 정규분포에서 약 68% 구간이며 최대 오차나 정답 허용오차가 아니다.',
    '\\(\\sigma\\) is a standard deviation describing spread. For a Gaussian distribution, \\(\\pm1\\sigma\\) spans about 68%; it is neither a maximum error nor a grading tolerance.',
  ),
  variance: concept(
    '분산',
    'Variance',
    '퍼짐을 제곱 단위로 나타낸 값이며 표준편차의 제곱 \\(\\sigma^{2}\\)이다. 독립인 잡음은 표준편차가 아니라 분산을 더한다.',
    'Spread expressed in squared units, equal to standard deviation squared, \\(\\sigma^{2}\\). Independent noise contributions add as variances, not standard deviations.',
  ),
  independent: concept(
    '독립 오차',
    'Independent errors',
    '한 측정의 흔들림이 다른 측정의 흔들림을 알려 주지 않는 모형이다. 함께 움직이는 공통 오차에는 이 가정을 쓰지 않는다.',
    'A model in which one measurement’s random error gives no information about another’s. A shared shift does not satisfy this assumption.',
  ),
  log: concept(
    '상용로그',
    'Base-10 logarithm',
    '\\(\\log_{10}x\\)는 10을 몇 제곱하면 \\(x\\)가 되는지 묻는다. \\(\\log_{10}100=2\\)이며 곱셈을 덧셈으로 바꿔 큰 범위를 다룬다.',
    '\\(\\log_{10}x\\) asks what power of 10 equals \\(x\\). For example \\(\\log_{10}100=2\\). It turns multiplication into addition and handles wide ranges.',
  ),
  magnitude: concept(
    '겉보기 등급과 절대등급',
    'Apparent and absolute magnitude',
    '겉보기 등급 \\(m\\)은 받은 빛, 절대등급 \\(M\\)은 소광 없이 10 pc에서 볼 밝기를 나타낸다. 등급은 작을수록 밝고 5등급 차는 빛의 양 100배다.',
    'Apparent magnitude \\(m\\) measures received light; absolute magnitude \\(M\\) is the magnitude at 10 pc without extinction. Smaller is brighter; five magnitudes means a factor of 100 in flux.',
  ),
  extinction: concept(
    '소광',
    'Extinction',
    '먼지 등이 빛을 흡수·산란해 별을 어둡게 보이게 한다. 같은 대역의 소광 \\(A\\)를 겉보기 등급에서 빼면 먼지 영향을 보정한다.',
    'Dust absorbs and scatters light, making a star appear dimmer. Subtract extinction \\(A\\) in the same band from apparent magnitude to correct it.',
  ),
  parsec: concept(
    '파섹과 거리 단위',
    'Parsec and distance units',
    'pc는 약 3.26광년인 거리 단위다. kpc는 1,000 pc, Mpc는 1,000 kpc다. 식에 넣기 전에 단위를 맞춘다.',
    'A parsec (pc) is about 3.26 light-years. A kpc is 1,000 pc and a Mpc is 1,000 kpc. Match units before substitution.',
  ),
  eccentricity: concept(
    '이심률',
    'Eccentricity',
    '\\(e\\)는 타원이 원에서 얼마나 벗어났는지 나타낸다. 원은 \\(e=0\\)이고 닫힌 타원은 \\(0\\le e<1\\)이다.',
    '\\(e\\) describes departure from a circle. A circle has \\(e=0\\); a bound ellipse has \\(0\\le e<1\\).',
  ),
  axis: concept(
    '장반경',
    'Semimajor axis',
    '타원의 가장 긴 지름의 절반 \\(a\\)다. 중심에서 잰 길이이며, 초점에서 별까지의 순간 거리와는 다르다.',
    '\\(a\\) is half the longest diameter of an ellipse. It is measured from its center and differs from the instantaneous distance to a focus.',
  ),
  period: concept(
    '주기',
    'Period',
    '같은 상태로 한 번 돌아오는 데 걸린 시간 \\(P\\)다. 사건 수와 사건 사이의 시간 간격 수를 구별한다.',
    '\\(P\\) is the time for one complete repeat. Distinguish the number of events from the number of intervals between them.',
  ),
  residual: concept(
    '시각 잔차',
    'Timing residual',
    '실제로 받은 시각에서 모형이 예측한 시각을 뺀 값이다. 양수는 예상보다 늦은 도착을 뜻한다.',
    'Observed arrival time minus predicted arrival time. A positive residual means a later arrival than predicted.',
  ),
  au: concept(
    '천문단위 AU',
    'Astronomical unit (AU)',
    '지구–태양 거리 규모를 나타내는 길이 단위다. 시간을 뜻하지 않으며 이 문제에서는 제시한 km 환산값을 쓴다.',
    'A length unit on the scale of the Earth–Sun distance, not a time. Use the km conversion supplied in the problem.',
  ),
  lte: concept(
    '국소 열역학 평형 LTE',
    'Local thermodynamic equilibrium (LTE)',
    '작은 기체 영역의 입자 상태를 그곳의 온도로 평형 분포처럼 계산하는 근사다. 별 전체의 온도가 같다는 뜻은 아니다.',
    'An approximation treating particle populations in a small gas region as equilibrium populations at its local temperature. It does not make the whole star isothermal.',
  ),
  ion: concept(
    '이온화와 여기',
    'Ionization and excitation',
    '이온화는 원자에서 전자가 빠져나가는 일, 여기는 묶인 전자가 더 높은 에너지 준위로 옮겨가는 일이다.',
    'Ionization removes an electron from an atom. Excitation moves a bound electron to a higher energy level.',
  ),
  exp: concept(
    '지수함수와 열에너지',
    'Exponential and thermal energy',
    '\\(\\exp(x)\\)는 자연상수 \\(e\\approx2.718\\)의 \\(x\\)제곱이다. \\(kT\\)는 온도를 에너지로 바꾸며, 에너지/\\(kT\\)는 단위 없는 수다.',
    '\\(\\exp(x)\\) means \\(e\\) to the power \\(x\\), with \\(e\\approx2.718\\). \\(kT\\) converts temperature to an energy scale, so energy/\\(kT\\) is dimensionless.',
  ),
  degeneracy: concept(
    '전자 축퇴압',
    'Electron degeneracy pressure',
    '전자는 같은 양자상태를 함께 차지할 수 없어 압축되면 더 높은 운동량 상태를 채운다. 이 양자적 압력은 핵융합 열이 없어도 남는다.',
    'Electrons cannot share an identical quantum state. Compression fills higher-momentum states, producing quantum pressure even without fusion heating.',
  ),
  composition: concept(
    '전자당 평균 질량',
    'Mean mass per electron',
    '전자 하나를 제공하는 물질의 평균 질량을 원자질량단위로 나눈 수다. 전자 자체의 질량이 아니며 조성이 정한다.',
    'The average mass of matter per available electron, divided by the atomic mass unit. It is set by composition, not the electron’s own mass.',
  ),
  scaling: concept(
    '비례와 거듭제곱',
    'Proportionality and powers',
    '\\(y\\propto x^p\\)는 다른 조건이 같을 때 \\(x\\)를 \\(q\\)배 하면 \\(y\\)가 \\(q^p\\)배가 된다는 뜻이다. 비율을 구하면 공통 상수가 없어진다.',
    '\\(y\\propto x^p\\) means multiplying \\(x\\) by \\(q\\) multiplies \\(y\\) by \\(q^p\\) when other conditions stay fixed. Ratios cancel the common constant.',
  ),
  hubble: concept(
    '허블 계수와 허블 시간',
    'Hubble parameter and Hubble time',
    '\\(H\\)는 거리당 후퇴 속도로 단위를 맞추면 1/시간이다. 그 역수 \\(\\frac{1}{H}\\)는 팽창의 시간 척도이며 우주 나이와 항상 같지는 않다.',
    '\\(H\\) is recession speed per distance, with units of inverse time after conversion. Its reciprocal is an expansion timescale, not always the age of the Universe.',
  ),
  leastSquares: concept(
    '최소제곱',
    'Least squares',
    '관측값과 모형 예측의 차이를 제곱해 모두 더한 값이 가장 작게 되도록 모형을 정한다. 여기서는 거리를 고정하고 속도 차이를 줄인다.',
    'Choose a model minimizing the sum of squared residuals. Here distances are fixed and the residuals are differences in velocity.',
  ),
  dispersion: concept(
    '1차원 속도 분산',
    'One-dimensional velocity dispersion',
    '평균 운동을 뺀 시선 속도의 표준편차다. 천문학 관행상 \\(\\sigma\\)를 속도 분산이라 부르지만 통계적 분산은 \\(\\sigma^{2}\\)이다.',
    'The standard deviation of line-of-sight velocities after subtracting mean motion. Astronomers call \\(\\sigma\\) velocity dispersion, while statistical variance is \\(\\sigma^{2}\\).',
  ),
  virial: concept(
    '비리얼 평형',
    'Virial equilibrium',
    '고립되어 안정된 중력계에서 시간 평균 운동에너지 \\(T\\)와 위치에너지 \\(U\\)가 \\(2T+U=0\\)을 만족하는 근사다. 충돌 중인 계에는 확인이 필요하다.',
    'For an isolated, steady gravitational system, time-averaged kinetic and potential energies approximately satisfy \\(2T+U=0\\). A merging system needs additional scrutiny.',
  ),
  baryon: concept(
    '바리온 물질',
    'Baryonic matter',
    '천문학에서는 원자로 된 보통 물질을 뜻하며 별과 기체를 포함한다. 눈에 보이는 별빛만 합친 질량과 같지 않다.',
    'In astronomy, ordinary atomic matter, including stars and gas. It is not limited to the mass inferred from visible starlight.',
  ),
  spherical: concept(
    '구대칭 근사',
    'Spherical approximation',
    '질량 분포가 방향에 따라 같다고 보는 모형이다. 원궤도 속력으로 내부 질량을 구할 수 있지만 납작한 원반의 정확한 중력장은 아니다.',
    'A model with no directional dependence in mass distribution. It relates circular speed to enclosed mass but is not the exact field of a flattened disk.',
  ),
  inclination: concept(
    '경사각과 시선 속도',
    'Inclination and line-of-sight velocity',
    '\\(i=0^\\circ\\)는 원반을 정면에서 보는 경우다. 시선 속도는 운동 중 우리 쪽 성분이며 장축에서 원운동 속력의 \\(\\sin i\\)배다.',
    '\\(i=0^\\circ\\) means a face-on disk. Line-of-sight velocity is motion toward or away from us; on the major axis it is circular speed times \\(\\sin i\\).',
  ),
};

/** 문항 ID로 연결하는 선행 학습. 기존 정답·진도·힌트 사용 기록과 독립적이다. */
export const HISTORY_LESSONS: Record<string, HistoryLesson> = {
  'eratosthenes-circumference': {
    diagramKey: 'eratosthenes-earth',
    scene: t(
      '두 도시의 막대 그림자를 들여다보자. 발밑의 둥근 땅이 서로 다른 수직 방향을 만든다.',
      'Look at a stick’s shadow in two cities. Curved ground gives each city a different vertical direction.',
    ),
    concepts: [
      concept(
        '자오선',
        'Meridian',
        '지구의 북극과 남극을 잇는 선이다. 같은 자오선의 두 지점은 경도가 같고 남북으로 떨어져 있다.',
        'A line on Earth joining the poles. Two sites on one meridian share a longitude and differ north to south.',
      ),
      concept(
        '천정각',
        'Zenith angle',
        '머리 바로 위인 천정과 천체 방향 사이의 각도다. 태양이 머리 위에 있으면 \\(0^\\circ\\)다.',
        'The angle between the point directly overhead, the zenith, and an object. An overhead Sun has zenith angle zero.',
      ),
      concept(
        '남중',
        'Upper meridian transit',
        '태양이 그날 하늘에서 가장 높은 쪽 자오선을 지나는 때다. 태양 남중은 지역의 태양 정오이며 시계 12시와 다를 수 있다.',
        'The Sun crosses the upper local meridian near its daily highest position. This is local solar noon, not necessarily 12:00 on a clock.',
      ),
      concept(
        '호와 중심각',
        'Arc and central angle',
        '호는 원둘레의 일부, 중심각은 원 중심에서 그 양 끝을 본 각도다. 평행한 태양광과 구형 지구를 가정해 각도 차를 중심각과 연결한다.',
        'An arc is part of a circumference. Its central angle is seen from the circle’s center. A spherical Earth and parallel rays connect it to the measured angle difference.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(\frac{s}{C}=\frac{\theta}{360}\)`,
        '\\(s\\)는 남북 호의 길이, \\(C\\)는 둘레, \\(\\theta\\)는 도 단위 중심각이다. 부분/전체 비율은 길이와 각도에서 같다.',
        '\\(s\\) is the meridian arc, \\(C\\) the circumference, and \\(\\theta\\) the central angle in degrees. Arc and angle have the same fraction of a full circle.',
      ),
    ],
    steps: [
      t(
        '그림자 각도가 지구 중심각과 어떻게 연결되는지 도해에서 따라간다.',
        'Trace how the shadow angle connects to the central angle.',
      ),
      t(
        '측정한 호가 전체 원의 어느 비율인지 먼저 구한 뒤 둘레로 넓힌다.',
        'Find the measured arc’s fraction of a circle before scaling to the circumference.',
      ),
    ],
    warmups: [
      warmup(
        'eratosthenes-circumference-vertical',
        t(
          '태양이 머리 바로 위에 있다. 이때 천정각은?',
          'The Sun is directly overhead. What is its zenith angle?',
        ),
        [
          t('\\(90^\\circ\\)', '\\(90^\\circ\\)'),
          t('\\(0^\\circ\\)', '\\(0^\\circ\\)'),
          t('그림자 길이만큼 km', 'The shadow length in km'),
        ],
        1,
        t(
          '천정각은 수직 위쪽과 태양 사이의 각도다. 두 방향이 같으면 각도는 \\(0^\\circ\\)이고, 거리 단위가 아니다.',
          'Zenith angle measures separation from the overhead direction. Coincident directions have angle zero; this is not a distance.',
        ),
      ),
      warmup(
        'eratosthenes-circumference-fraction',
        t(
          '별도의 연습: 두 지점의 중심각이 한 바퀴의 1/12이다. 두 지점 사이 호와 전체 둘레의 관계는?',
          'Separate practice: a central angle is 1/12 of a full turn. How does its arc relate to the circumference?',
        ),
        [
          t('호 길이 = 둘레의 1/12', 'Arc length = circumference/12'),
          t('호 길이 = 둘레의 12배', 'Arc length = 12 × circumference'),
          t('호 길이 = 반지름', 'Arc length = radius'),
        ],
        0,
        t(
          '원 위에서 같은 비율을 차지하므로 각도가 한 바퀴의 1/12이면 호도 둘레의 1/12이다. 반지름은 다른 길이다.',
          'The same fraction applies around the circle: 1/12 of a turn spans 1/12 of the circumference. Radius is a different length.',
        ),
      ),
    ],
  },
  'kepler-binary-mass': {
    diagramKey: 'kepler-orbits',
    scene: t(
      '두 별이 보이지 않는 균형점을 함께 돈다. 궤도의 크기와 걸리는 시간을 재면 두 별을 저울에 올릴 수 있다.',
      'Two stars orbit an unseen balance point. Their orbital size and timing let us weigh the pair.',
    ),
    concepts: [
      terms.axis,
      terms.period,
      concept(
        '상대 궤도와 질량중심',
        'Relative orbit and center of mass',
        '질량중심은 두 별의 질량을 고려한 균형점이다. 상대 궤도는 한 별에서 다른 별을 본 위치 변화로, 장반경은 각 별 궤도의 장반경 합이다.',
        'The center of mass is the pair’s mass-weighted balance point. A relative orbit tracks one star from the other; its semimajor axis is the sum of their individual semimajor axes.',
      ),
      terms.au,
    ],
    relations: [
      relation(
        String.raw`\(\frac{M_1+M_2}{M_\odot}=\frac{(a/\mathrm{AU})^3}{(P/\mathrm{yr})^2}\)`,
        '뉴턴의 두 물체 모형에서 \\(a\\)는 상대 궤도 장반경, \\(P\\)는 주기다. 질량은 태양질량 \\(M_\\odot\\) 단위로 얻는다.',
        'In the Newtonian two-body model, \\(a\\) is the relative semimajor axis and \\(P\\) the period. The resulting mass is in solar masses \\(M_\\odot\\).',
      ),
    ],
    steps: [
      t(
        '주어진 크기가 한 별의 궤도인지 상대 궤도인지 구별한다.',
        'Check whether the size describes one star’s orbit or the relative orbit.',
      ),
      t(
        'AU와 년 단위를 맞추고 크기 세제곱/주기 제곱을 만든다.',
        'Use AU and years, then form size cubed divided by period squared.',
      ),
    ],
    warmups: [
      warmup(
        'kepler-binary-mass-orbit',
        t(
          '질량이 같은 두 별이 균형점에서 각각 같은 크기로 돈다. 상대 궤도의 장반경은?',
          'Equal-mass stars have equal-sized orbits around their balance point. What is the relative semimajor axis?',
        ),
        [
          t('한 별 궤도 크기의 절반', 'Half either star’s orbital size'),
          t('두 장반경을 더한 값', 'The sum of both semimajor axes'),
          t('별 자체의 반지름', 'The radius of a star'),
        ],
        1,
        t(
          '상대 위치는 두 별 사이의 간격을 따른다. 질량중심 주위 한 별의 궤도만 쓰면 간격의 크기를 잘못 읽는다.',
          'The relative position tracks separation between the stars. Using only one star’s barycentric orbit misreads that scale.',
        ),
      ),
      warmup(
        'kepler-binary-mass-scale',
        t(
          '같은 주기인데 상대 장반경이 3배인 다른 쌍성은 총질량이 몇 배인가?',
          'Another binary has the same period but three times the relative semimajor axis. How does total mass scale?',
        ),
        [t('3배', '3 times'), t('9배', '9 times'), t('27배', '27 times')],
        2,
        t(
          '주기가 같으면 질량은 \\(a^{3}\\)에 비례한다. 크기의 배율을 세제곱하고, 주기도 달라지면 그 제곱으로 나눈다.',
          'At fixed period, mass is proportional to \\(a^{3}\\). Cube the size factor; if the period changes too, divide by its squared factor.',
        ),
      ),
    ],
  },
  'kepler-apsis-speed': {
    diagramKey: 'kepler-orbits',
    scene: t(
      '타원을 도는 천체가 별 가까이에서 빨라진다. 멀어질 때 잃는 속력과 거리가 어떻게 짝을 이루는지 보자.',
      'An orbiting body speeds up near its star. Compare the changing speed with its changing distance.',
    ),
    concepts: [
      terms.eccentricity,
      terms.axis,
      concept(
        '근일점과 원일점',
        'Perihelion and aphelion',
        '태양에 가장 가까운 점과 가장 먼 점이다. 그 거리들은 \\(a(1-e)\\), \\(a(1+e)\\)이며 이 두 점에서 속도는 반지름과 수직이다.',
        'The nearest and farthest points from the Sun. Their distances are \\(a(1-e)\\) and \\(a(1+e)\\); velocity is perpendicular to radius at both.',
      ),
      concept(
        '각운동량',
        'Angular momentum',
        '회전 운동의 양이다. 중심으로 향하는 중력만 작용하면 보존되며, 두 끝점에서는 단위질량당 값이 거리×속력 \\(rv\\)다.',
        'A measure of rotational motion. A central gravitational force conserves it; at either apsis its value per unit mass is distance times speed, \\(rv\\).',
      ),
    ],
    relations: [
      relation(
        String.raw`\(r_p=a(1-e),\quad r_a=a(1+e)\)`,
        '아래첨자 \\(\\mathrm{p}\\)는 가까운 끝점, \\(\\mathrm{a}\\)는 먼 끝점이다. 장반경 변수 \\(a\\)와 구별한다.',
        'Subscript \\(\\mathrm{p}\\) labels the near apsis and \\(\\mathrm{a}\\) the far apsis; the variable \\(a\\) is the semimajor axis.',
      ),
      relation(
        String.raw`\(r_pv_p=r_av_a\)`,
        '두 끝점의 거리×속력이 같다. 궤도 전체에서 일반적인 속력×거리 보존을 주장하는 식은 아니다.',
        'Distance times speed is equal at the two apsides. This is not a claim that distance times total speed is constant everywhere.',
      ),
    ],
    steps: [
      t(
        '가까운 거리와 먼 거리를 장반경과 이심률로 표현한다.',
        'Express the near and far distances using \\(a\\) and \\(e\\).',
      ),
      t(
        '끝점의 각운동량을 같게 놓고 원하는 속력비를 분리한다.',
        'Equate angular momentum at the apsides and isolate the requested speed ratio.',
      ),
    ],
    warmups: [
      warmup(
        'kepler-apsis-speed-round',
        t(
          '이심률이 0인 궤도에서는 가장 가까운 거리와 가장 먼 거리가?',
          'For eccentricity zero, how do the nearest and farthest distances compare?',
        ),
        [
          t('같다', 'They are equal'),
          t('항상 2배 차이다', 'They differ by a factor of two'),
          t('한쪽은 0이다', 'One is zero'),
        ],
        0,
        t(
          '\\(e=0\\)은 원이다. 타원의 찌그러짐이 없어지면 두 끝점 거리도 같아진다.',
          '\\(e=0\\) describes a circle. With no elongation, both apsidal distances are equal.',
        ),
      ),
      warmup(
        'kepler-apsis-speed-conserve',
        t(
          '반지름에 수직인 운동에서 \\(rv\\)가 일정하다. 거리 \\(r\\)이 줄면 속력 \\(v\\)는?',
          'For perpendicular motion with fixed \\(rv\\), what happens to \\(v\\) when \\(r\\) decreases?',
        ),
        [
          t('함께 줄어든다', 'It also decreases'),
          t('커진다', 'It increases'),
          t('반드시 그대로다', 'It must stay fixed'),
        ],
        1,
        t(
          '곱이 일정하면 한 항이 작아질 때 다른 항이 커져야 한다. 이 관계를 두 끝점에 적용한다.',
          'If a product stays fixed, decreasing one factor increases the other. Apply this specifically at the apsides.',
        ),
      ),
    ],
  },
  'kepler-flight-time': {
    diagramKey: 'kepler-orbits',
    scene: t(
      '궤도를 네 조각으로 나눠도 여행 시간이 같지는 않다. 케플러의 면적 법칙을 시계로 바꾸는 보조 각도를 만나 보자.',
      'Four equal-looking pieces of an orbit need not take equal times. Use an auxiliary angle to turn Kepler’s area law into a clock.',
    ),
    concepts: [
      terms.eccentricity,
      concept(
        '이심근점이각',
        'Eccentric anomaly',
        '타원을 보조 원에 대응시켜 원 중심에서 재는 각도다. 태양이 있는 초점에서 직접 재는 진근점이각과 다르다.',
        'An angle measured at the center of an auxiliary circle associated with the ellipse. It differs from true anomaly measured at the focus occupied by the Sun.',
      ),
      concept(
        '평균근점이각',
        'Mean anomaly',
        '근일점부터 지난 시간을 한 바퀴 \\(2\\pi\\)로 환산한 각도다. 실제 위치각과 달리 시간에 따라 일정하게 증가한다.',
        'Elapsed time since perihelion scaled to \\(2\\pi\\) per orbit. Unlike the actual position angle, it grows uniformly with time.',
      ),
      concept(
        '라디안',
        'Radian',
        '호 길이/반지름으로 정의하는 각도 단위다. 한 바퀴는 \\(2\\pi\\) 라디안이며 케플러 방정식의 각도와 계산기 모드를 여기에 맞춘다.',
        'Angle defined as arc length divided by radius. A full turn is \\(2\\pi\\) radians. Use radians both in Kepler’s equation and in the calculator.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(M=E-e\sin E\)`,
        '타원에서는 보조 각도 \\(E\\) 자체가 시간 비율이 아니다. \\(e\\sin E\\)만큼 보정해 균일한 시계 \\(M\\)을 얻는다.',
        'For an ellipse, auxiliary angle \\(E\\) is not itself a time fraction. Subtract \\(e\\sin E\\) to obtain the uniform clock \\(M\\).',
      ),
      relation(
        String.raw`\(\frac{t}{P}=\frac{M}{2\pi}\)`,
        't는 근일점 출발 후 시간, \\(P\\)는 한 바퀴 주기다. \\(M\\)을 한 바퀴 각도로 나눈 값이 경과 시간 비율이다.',
        't is elapsed time since perihelion and \\(P\\) the orbital period. Dividing \\(M\\) by a full turn gives the time fraction.',
      ),
    ],
    steps: [
      t(
        '\\(E\\)와 \\(e\\)로 시간에 비례하는 각도 \\(M\\)을 먼저 구한다.',
        'First convert \\(E\\) and \\(e\\) to the time-proportional angle \\(M\\).',
      ),
      t(
        '\\(M\\)이 한 바퀴에서 차지하는 비율을 주기에 곱한다.',
        'Multiply the fraction of a full turn in \\(M\\) by the period.',
      ),
    ],
    warmups: [
      warmup(
        'kepler-flight-time-angle',
        t(
          '이심근점이각 \\(E\\)는 어디에서 정의하는 보조 각도인가?',
          'Where is the auxiliary eccentric anomaly \\(E\\) defined?',
        ),
        [
          t('항상 지구에서', 'Always at Earth'),
          t('태양 표면에서', 'At the Sun’s surface'),
          t('타원에 대응하는 보조 원의 중심에서', 'At the center of an auxiliary circle'),
        ],
        2,
        t(
          '\\(E\\)는 보조 원 중심의 각도다. 초점에서 보는 진근점이각과 같은 것으로 넣으면 시간 계산이 달라진다.',
          '\\(E\\) is an auxiliary-circle central angle. Substituting the focus-based true anomaly instead changes the timing calculation.',
        ),
      ),
      warmup(
        'kepler-flight-time-clock',
        t(
          '평균근점이각 \\(M\\)이 한 바퀴의 1/6만큼 증가했다. 경과 시간은?',
          'Mean anomaly \\(M\\) advances through one sixth of a turn. What time elapses?',
        ),
        [
          t('주기의 1/6', 'One sixth of the period'),
          t('주기의 6배', 'Six periods'),
          t(
            '이심률과 관계없이 \\(\\frac{E}{6}\\)일',
            '\\(\\frac{E}{6}\\) days regardless of eccentricity',
          ),
        ],
        0,
        t(
          '\\(M\\)은 시간에 균일하게 비례하도록 만든 각도다. 그 비율은 바로 \\(\\frac{t}{P}\\)이며, \\(E\\)는 먼저 \\(M\\)으로 바꿔야 한다.',
          '\\(M\\) was defined to grow uniformly with time. Its turn fraction equals \\(\\frac{t}{P}\\); \\(E\\) must first be converted into \\(M\\).',
        ),
      ),
    ],
  },
  'romer-path-speed': {
    diagramKey: 'romer-light',
    scene: t(
      '목성 뒤로 사라지는 이오를 먼 우주의 시계로 삼아 보자. 시계가 늦은 것인지 빛의 여행이 길어진 것인지 구별해야 한다.',
      'Use Io disappearing behind Jupiter as a distant clock. Separate a slow clock from a longer journey for its light.',
    ),
    concepts: [
      concept(
        '이오의 식',
        'Eclipse of Io',
        '목성의 위성 이오가 목성 그림자에 들어가 어두워지는 사건이다. 관측된 사건 시각에는 빛이 오는 시간도 포함된다.',
        'Io, a moon of Jupiter, dims when entering Jupiter’s shadow. The observed event time includes light’s travel time.',
      ),
      terms.residual,
      terms.au,
    ],
    relations: [
      relation(
        String.raw`\(\Delta t=\frac{\Delta D}{c}\)`,
        'Δ는 두 관측 사이 변화량, \\(D\\)는 빛의 경로, \\(c\\)는 광속이다. 두 관측에 공통인 고정 시간은 차에서 사라진다.',
        'Δ denotes the change between observations, \\(D\\) is path length, and \\(c\\) the speed of light. A constant offset shared by both observations cancels.',
      ),
    ],
    steps: [
      t(
        '달라진 빛의 경로를 시간과 맞는 길이 단위로 바꾼다.',
        'Convert the change in path length into the required distance unit.',
      ),
      t(
        '경로 변화/도착 지연 변화로 속력을 구한다.',
        'Divide path change by arrival-delay change to obtain speed.',
      ),
    ],
    warmups: [
      warmup(
        'romer-path-speed-delay',
        t(
          '같은 순간 켠 두 전등 중 하나가 훨씬 멀다. 진공에서 먼저 보이는 빛은?',
          'Two lights turn on simultaneously, one much farther away. In vacuum, which is seen first?',
        ),
        [
          t('먼 전등', 'The farther light'),
          t('가까운 전등', 'The nearer light'),
          t('거리와 상관없이 항상 동시에', 'Always simultaneously regardless of distance'),
        ],
        1,
        t(
          '빛도 유한한 속력으로 이동한다. 도착 시각을 비교할 때 출발 사건과 전달 시간을 분리해야 한다.',
          'Light travels at a finite speed. Comparing arrival times requires separating the event from propagation time.',
        ),
      ),
      warmup(
        'romer-path-speed-units',
        t(
          '광속을 \\(\\mathrm{km}/\\mathrm{s}\\)로 구하려 한다. 같은 관계식에 필요한 변화량 단위는?',
          'To calculate a speed in \\(\\mathrm{km}/\\mathrm{s}\\), which units should the changes use?',
        ),
        [
          t('경로 km, 지연 \\(s\\)', 'Path in km, delay in \\(s\\)'),
          t('경로 \\(s\\), 지연 km', 'Path in \\(s\\), delay in km'),
          t('경로 AU, 지연 \\(s\\)를 환산 없이', 'Path in AU, delay in \\(s\\) without conversion'),
        ],
        0,
        t(
          '길이/시간이 속력이다. AU로 주어진 길이는 먼저 km로 바꿔야 \\(\\mathrm{km}/\\mathrm{s}\\)라는 출력 단위와 맞는다.',
          'Speed is length/time. Convert AU to km before division if the requested output is \\(\\mathrm{km}/\\mathrm{s}\\).',
        ),
      ),
    ],
  },
  'romer-period-bias': {
    diagramKey: 'romer-light',
    scene: t(
      '이오의 시계는 일정한데 매번 빛이 조금 더 먼 길을 온다. 작은 추가 지연이 여러 바퀴 동안 쌓인다.',
      'Io’s clock is steady, but each signal travels a little farther. Small extra delays accumulate over many cycles.',
    ),
    concepts: [
      terms.period,
      terms.residual,
      concept(
        '고유 주기와 관측 주기',
        'Intrinsic and observed period',
        '고유 주기는 사건 자체의 반복 간격이다. 관측 주기는 도착 간격이라서 다음 신호의 여행 시간이 늘면 더 길게 보인다.',
        'The intrinsic period is the repetition interval at the source. The observed period is an arrival interval and grows if successive signals take longer to travel.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(P_{obs}-P_{int}=\frac{\Delta t_{res}}{N}\)`,
        '\\(N\\)은 사건 사이의 완전한 주기 간격 수다. 잔차가 거의 선형으로 변할 때 전체 지연 변화를 간격 수로 나눈다.',
        '\\(N\\) counts full intervals between events. For an approximately linear residual trend, divide total residual change by the number of intervals.',
      ),
    ],
    steps: [
      t(
        '시작과 끝 사이에 몇 번의 시간 간격이 있는지 센다.',
        'Count intervals between the starting and ending events.',
      ),
      t(
        '누적된 지연을 간격마다 나누고 길어짐의 부호를 확인한다.',
        'Spread the accumulated delay over those intervals and check its sign.',
      ),
    ],
    warmups: [
      warmup(
        'romer-period-bias-interval',
        t(
          '연속된 식 사건을 6번 적었다. 첫 사건과 마지막 사건 사이 간격은 몇 개인가?',
          'You record six consecutive eclipses. How many intervals lie between the first and last?',
        ),
        [t('6개', '6'), t('7개', '7'), t('5개', '5')],
        2,
        t(
          '사건은 점, 주기는 점 사이 간격이다. 양 끝 사건을 함께 세면 간격보다 사건이 하나 많다.',
          'Events are points; periods are gaps between them. Counting both endpoints gives one more event than intervals.',
        ),
      ),
      warmup(
        'romer-period-bias-trend',
        t(
          '다음 신호가 앞 신호보다 여행 시간이 더 길다. 관측한 두 도착 사이 간격은 고유 간격보다?',
          'The next signal takes longer to travel than the previous one. How does the arrival interval compare with the intrinsic interval?',
        ),
        [t('짧다', 'Shorter'), t('길다', 'Longer'), t('항상 같다', 'Always equal')],
        1,
        t(
          '출발 간격에 추가 여행 시간의 차가 더해진다. 출발 주기가 변하지 않아도 도착 주기는 길어질 수 있다.',
          'The difference in travel times adds to the departure interval. A constant source period can therefore appear longer.',
        ),
      ),
    ],
  },
  'romer-model-test': {
    diagramKey: 'romer-light',
    scene: t(
      '한 계절의 늦어짐만으로는 두 설명이 맞서 있다. 다른 계절에도 같은 설명이 예측을 지키는지 살펴보자.',
      'Two explanations fit a season of delayed events. Test what each predicts in a different season.',
    ),
    concepts: [
      terms.residual,
      concept(
        '가설의 예측',
        'Predictions of hypotheses',
        '설명이 맞다면 아직 비교하지 않은 상황에서 무엇이 보여야 하는지 정한다. 이미 본 자료만 맞추는 것보다 새로운 예측을 시험하는 편이 강하다.',
        'Specify what should happen in a situation not yet used to fit the explanation. Testing new predictions is stronger than matching only existing data.',
      ),
      concept(
        '접근과 후퇴',
        'Approach and recession',
        '관측자와 사건 사이의 빛 경로가 줄거나 늘어나는 변화다. 경로 변화는 도착 시각 잔차에 영향을 준다.',
        'Changes that shorten or lengthen the signal path between observer and event. Path changes affect arrival-time residuals.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(\Delta t_{res}=\frac{\Delta D}{c}\)`,
        '전달 시간 모형은 경로 변화의 부호와 크기를 함께 예측한다. 일정한 주기 오차 모형은 주기마다 같은 방향의 잔차를 누적시킨다.',
        'The propagation model predicts both sign and size from path change. A constant period error accumulates the same-sign residual increment every cycle.',
      ),
    ],
    steps: [
      t(
        '두 가설이 같은 결과를 내는 구간과 다른 결과를 내는 구간을 찾는다.',
        'Find regimes where the hypotheses agree and where they differ.',
      ),
      t(
        '예측이 갈리는 새 관측을 골라 누적 추세를 비교한다.',
        'Choose new observations that separate the predictions and compare trends.',
      ),
    ],
    warmups: [
      warmup(
        'romer-model-test-evidence',
        t(
          '두 설명이 지금 자료에 똑같이 잘 맞는다. 어느 검사가 더 유용한가?',
          'Two explanations fit the current data equally well. Which test is more useful?',
        ),
        [
          t(
            '서로 다른 결과를 예측하는 새 조건을 관측',
            'Observe a new condition with different predictions',
          ),
          t('이미 맞은 자료를 그대로 다시 인용', 'Only repeat the same fitted data'),
          t('설명을 고른 뒤 반대 자료를 제외', 'Choose a story and discard contrary data'),
        ],
        0,
        t(
          '판별력은 설명들이 다르게 예측하는 상황에서 생긴다. 반례 가능성을 열어 둔 관측이 필요하다.',
          'A test discriminates where predictions differ. It must allow evidence that could contradict a hypothesis.',
        ),
      ),
      warmup(
        'romer-model-test-clock',
        t(
          '주기를 매번 일정하게 너무 짧게 예측했다. 누적 잔차는 어떤 경향인가?',
          'A predicted period is consistently too short. What happens to the accumulated timing residual?',
        ),
        [
          t('아무 이유 없이 매번 부호 반전', 'Its sign reverses each time without cause'),
          t('항상 0', 'It always stays zero'),
          t(
            '주기마다 같은 방향의 차이가 쌓임',
            'A same-direction discrepancy accumulates each cycle',
          ),
        ],
        2,
        t(
          '일정한 주기 오차는 간격마다 같은 차이를 더한다. 이 예측을 빛 경로가 바뀌는 모형의 예측과 비교할 수 있다.',
          'A constant period error adds the same discrepancy each interval. Compare that with a model whose signal path changes.',
        ),
      ),
    ],
  },
  'leavitt-modulus': {
    diagramKey: 'leavitt-distance',
    scene: t(
      '별의 밝기가 규칙적으로 오르내린다. 리비트가 찾은 주기의 단서를, 거리 눈금을 만드는 과정으로 이어 보자.',
      'A star brightens and dims rhythmically. Turn the period clue Leavitt found into a calibrated distance scale.',
    ),
    concepts: [
      concept(
        '세페이드 변광성',
        'Cepheid variable',
        '팽창과 수축으로 밝기가 주기적으로 변하는 별이다. 같은 종류의 세페이드에는 주기와 고유 밝기의 관계가 있어 별도 보정 후 거리 측정에 쓴다.',
        'A pulsating star whose brightness varies periodically. Cepheids of a given type relate period to intrinsic luminosity; a separate calibration makes them distance indicators.',
      ),
      terms.magnitude,
      terms.log,
      terms.extinction,
    ],
    relations: [
      relation(
        String.raw`\(\mu=m-A-M=5\log_{10}(\frac{d}{\mathrm{pc}})-5\)`,
        '\\(\\mu\\)는 소광 보정 거리 지수다. 같은 관측 대역의 \\(m\\)·\\(A\\)·\\(M\\)을 쓰며, \\(d/\\mathrm{pc}\\)는 거리를 pc로 쓴 수다. 1 kpc=1,000 pc다.',
        '\\(\\mu\\) is the extinction-corrected distance modulus. Use \\(m\\), \\(A\\), and \\(M\\) in the same band; \\(d/\\mathrm{pc}\\) is distance expressed in parsecs. One kpc is 1,000 pc.',
      ),
      relation(
        String.raw`\(\frac{d}{\mathrm{pc}}=10^{(\mu+5)/5}\)`,
        '로그의 역연산은 10의 거듭제곱이다. 먼저 문제의 주기 보정식에서 절대등급 \\(M\\)을 얻는다.',
        'The inverse of a base-10 logarithm is a power of ten. First obtain absolute magnitude \\(M\\) from the supplied period calibration.',
      ),
    ],
    steps: [
      t(
        '밝기 변화의 주기에서 고유 밝기 \\(M\\)을 찾고 먼지 영향 \\(A\\)를 뺀다.',
        'Use the period to obtain \\(M\\), then remove extinction \\(A\\).',
      ),
      t(
        '등급 차를 로그 거리로 연결한 뒤 요구하는 거리 단위로 바꾼다.',
        'Translate the magnitude difference into distance, then convert to the requested unit.',
      ),
    ],
    warmups: [
      warmup(
        'leavitt-modulus-brightness',
        t(
          '같은 별을 소광 없이 더 멀리 옮겼다. 바뀌는 것은?',
          'Move the same star farther away without extinction. What changes?',
        ),
        [
          t('절대등급만', 'Only absolute magnitude'),
          t('겉보기 등급이 커져 더 어둡게 보임', 'Apparent magnitude increases; it looks dimmer'),
          t('별의 주기가 반드시 두 배', 'Its period must double'),
        ],
        1,
        t(
          '받는 빛은 줄지만 별 자체의 고유 밝기는 그대로다. 절대등급은 모두 10 pc라는 같은 거리에서 비교하는 약속이다.',
          'Received light decreases while intrinsic luminosity stays fixed. Absolute magnitude compares stars at the common reference distance of 10 pc.',
        ),
      ),
      warmup(
        'leavitt-modulus-log',
        t(
          '별도의 연습에서 \\(\\log_{10}x=3\\)이다. \\(x\\)를 되찾는 방법은?',
          'In separate practice, \\(\\log_{10}x=3\\). How do you recover \\(x\\)?',
        ),
        [
          t('\\(x=10^3\\)', '\\(x=10^3\\)'),
          t('\\(x=3\\times10\\)', '\\(x=3\\times10\\)'),
          t('\\(x=\\frac{3}{10}\\)', '\\(x=\\frac{3}{10}\\)'),
        ],
        0,
        t(
          '로그는 지수를 묻는다. 10을 세 제곱해야 \\(x\\)가 되므로 10의 거듭제곱으로 되돌린다.',
          'A logarithm asks for an exponent. Ten must be raised to the third power to recover \\(x\\).',
        ),
      ),
    ],
  },
  'leavitt-extinction-bias': {
    diagramKey: 'leavitt-distance',
    scene: t(
      '별과 우리 사이에 먼지가 끼었다. 별이 어두워진 이유를 모두 거리 탓으로 돌리면 어떻게 될까?',
      'Dust lies between a star and us. What happens if all its dimming is attributed to distance?',
    ),
    concepts: [terms.extinction, terms.magnitude, terms.log],
    relations: [
      relation(
        String.raw`\(m-A-M=5\log_{10}(\frac{d}{\mathrm{pc}})-5\)`,
        '같은 별의 \\(M\\)은 고정한다. 올바른 계산과 \\(A\\)를 빼먹은 계산을 나란히 쓰면 어떤 등급 차를 거리에 떠넘겼는지 보인다.',
        'Keep \\(M\\) fixed for the same star. Compare the correct expression with one omitting \\(A\\) to identify the magnitude difference falsely attributed to distance.',
      ),
      relation(
        String.raw`\(\log_{10}x-\log_{10}y=\log_{10}(\frac{x}{y})\)`,
        '거리식 둘을 빼면 로그의 차를 거리 비의 로그로 묶을 수 있다. 두 거리 자체를 따로 끝까지 계산할 필요가 없다.',
        'Subtracting the distance equations turns a difference of logarithms into the logarithm of a ratio. You need not calculate both absolute distances separately.',
      ),
    ],
    steps: [
      t(
        '소광을 보정한 등급 차와 누락한 등급 차를 비교한다.',
        'Compare the corrected magnitude difference with the uncorrected one.',
      ),
      t(
        '두 거리식의 차를 비율로 바꿔 편향의 방향과 크기를 찾는다.',
        'Turn the difference of distance equations into a ratio to find the bias.',
      ),
    ],
    warmups: [
      warmup(
        'leavitt-extinction-bias-dust',
        t(
          '양의 소광 \\(A\\)를 보정하려면 관측한 겉보기 등급 \\(m\\)에 무엇을 하는가?',
          'How do you correct apparent magnitude \\(m\\) for positive extinction \\(A\\)?',
        ),
        [
          t('\\(A\\)를 더한다', 'Add \\(A\\)'),
          t('\\(A\\)를 곱한다', 'Multiply by \\(A\\)'),
          t('\\(A\\)를 뺀다', 'Subtract \\(A\\)'),
        ],
        2,
        t(
          '먼지는 별을 어둡게 만들어 등급 숫자를 키운다. 영향을 되돌리려면 \\(A\\)를 빼서 더 밝은 쪽 등급을 얻는다.',
          'Dust dims a star and increases its magnitude number. Subtracting \\(A\\) recovers the brighter extinction-free magnitude.',
        ),
      ),
      warmup(
        'leavitt-extinction-bias-ratio',
        t(
          '로그 두 개를 뺀 \\(\\log_{10}x-\\log_{10}y\\)는?',
          'What is \\(\\log_{10}x-\\log_{10}y\\) equal to?',
        ),
        [
          t('\\(\\log_{10}(x-y)\\)', '\\(\\log_{10}(x-y)\\)'),
          t('\\(\\log_{10}(\\frac{x}{y})\\)', '\\(\\log_{10}(\\frac{x}{y})\\)'),
          t('\\(\\frac{x}{y}\\)', '\\(\\frac{x}{y}\\)'),
        ],
        1,
        t(
          '로그에서는 나눗셈이 뺄셈으로 바뀐다. 거리 차이가 아니라 거리 비율의 로그가 남는다.',
          'Division becomes subtraction under logarithms. The result is the logarithm of a distance ratio, not of a distance difference.',
        ),
      ),
    ],
  },
  'leavitt-zero-point': {
    diagramKey: 'leavitt-distance',
    scene: t(
      '같은 작은 은하 속 별들은 비슷한 거리에 있다. 그 덕분에 패턴이 드러나지만 거리 눈금 전체가 완성되는 것은 아니다.',
      'Stars in one small galaxy lie at roughly the same distance. That reveals a pattern, but does not finish the absolute distance scale.',
    ),
    concepts: [
      terms.magnitude,
      terms.log,
      concept(
        '기울기와 영점',
        'Slope and zero point',
        '기울기는 가로값이 바뀔 때 세로값이 얼마나 변하는지, 영점은 관계 전체의 높이를 정한다. 거리 미지수는 겉보기 관계의 높이에 섞인다.',
        'Slope sets the change in the vertical quantity per horizontal change; the zero point shifts the entire relation. Unknown distance enters the apparent relation’s offset.',
      ),
      concept(
        '절대 거리 보정',
        'Absolute distance calibration',
        '독립적으로 거리를 아는 별 등을 기준으로 고유 밝기의 눈금을 정하는 일이다. 같은 거리에 있다는 정보만으로 실제 거리를 정할 수는 없다.',
        'Use an independent distance reference to set intrinsic luminosity. Knowing stars share a distance does not determine that distance.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(m=M+\mu\)`,
        '소광을 무시하면 겉보기 등급에는 절대등급과 공통 거리 지수 \\(\\mu\\)가 더해진다. 같은 은하에서 \\(\\mu\\)는 모두 같은 이동량이다.',
        'Ignoring extinction, apparent magnitude equals absolute magnitude plus common distance modulus \\(\\mu\\). Within one galaxy \\(\\mu\\) shifts every point equally.',
      ),
      relation(
        String.raw`\(m=a\log_{10}P+b\)`,
        '\\(P\\)는 같은 단위로 적은 주기다. 이 겉보기 관계의 \\(b\\)와, 고유 밝기 관계 자체의 절대 영점을 구별한다.',
        '\\(P\\) denotes periods in a fixed unit. Distinguish the fitted apparent intercept \\(b\\) from the zero point of the intrinsic luminosity relation.',
      ),
    ],
    steps: [
      t(
        '별 사이 비교에서 공통 거리가 지워 주는 항을 찾는다.',
        'Identify which common distance term cancels when stars are compared.',
      ),
      t(
        '남은 관계의 모양과 절대 밝기 눈금을 구별한다.',
        'Separate the relation’s shape from its absolute luminosity scale.',
      ),
    ],
    warmups: [
      warmup(
        'leavitt-zero-point-common',
        t(
          '그래프의 모든 세로값에 같은 상수를 더했다. 직선의 기울기는?',
          'Add the same constant to every vertical coordinate. What happens to a straight line’s slope?',
        ),
        [
          t('변하지 않는다', 'It is unchanged'),
          t('항상 0이 된다', 'It always becomes zero'),
          t('상수만큼 곱해진다', 'It is multiplied by that constant'),
        ],
        0,
        t(
          '점들이 함께 위아래로 이동하면 서로의 높이 차이는 그대로다. 기울기와 전체 높이는 다른 정보다.',
          'A shared vertical shift preserves height differences. Slope and overall vertical position are different pieces of information.',
        ),
      ),
      warmup(
        'leavitt-zero-point-anchor',
        t(
          '“모두 같은 거리”인 전구 무리가 있다. 실제 거리 눈금을 정하려면 어떤 추가 정보가 유용한가?',
          'A group of lamps is at a common but unknown distance. What extra information can set an absolute scale?',
        ),
        [
          t('전구 이름을 바꾸기', 'Renaming the lamps'),
          t('같은 사진을 확대하기', 'Enlarging the same image'),
          t(
            '전구 하나의 독립적인 거리 또는 고유 밝기',
            'An independent distance or intrinsic brightness for a lamp',
          ),
        ],
        2,
        t(
          '공통 거리 조건은 비교를 돕지만 절대 눈금을 주지 않는다. 바깥에서 얻은 기준점이 있어야 밝기와 거리를 분리할 수 있다.',
          'A common distance helps relative comparisons but supplies no absolute scale. An independent anchor separates intrinsic brightness from distance.',
        ),
      ),
    ],
  },
  'payne-saha-ratio': {
    diagramKey: 'payne-stellar-atmospheres',
    scene: t(
      '같은 수소라도 뜨거운 층에서는 전자를 잃은 원자가 늘어난다. 페인이 읽었던 스펙트럼 뒤의 입자 분포를 살펴보자.',
      'The same hydrogen becomes more ionized in a hotter layer. Explore the particle populations behind the spectra Payne interpreted.',
    ),
    concepts: [
      terms.ion,
      terms.lte,
      terms.exp,
      concept(
        '전자 밀도와 분배함수',
        'Electron density and partition function',
        '전자 밀도는 부피당 자유전자 수다. 분배함수는 원자의 여러 에너지 상태 점유를 합한 값이다. 이 연습에서는 두 값을 일정하게 고정한다.',
        'Electron density counts free electrons per volume. A partition function sums contributions from available energy states. Both are held fixed in this exercise.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(R(T)\propto T^{3/2}\exp(-\frac{\chi}{kT})\)`,
        '\\(R\\)은 이온/중성 수의 비, \\(\\chi\\)는 전자를 떼는 데 필요한 이온화 에너지, \\(k\\)는 볼츠만 상수다. 전자 밀도와 분배함수를 고정한 모형이다.',
        '\\(R\\) is the ion/neutral ratio, \\(\\chi\\) the ionization energy, and \\(k\\) Boltzmann’s constant. Electron density and partition functions are fixed here.',
      ),
      relation(
        String.raw`\(\frac{\exp(x)}{\exp(y)}=\exp(x-y)\)`,
        '두 온도의 비를 구하면 공통 계수가 사라진다. 지수함수의 몫은 지수의 차로 계산할 수 있다.',
        'A ratio at two temperatures cancels the common coefficient. Divide exponentials by subtracting their exponents.',
      ),
    ],
    steps: [
      t(
        '두 온도에서 같은 조건이 무엇인지 먼저 고정한다.',
        'Identify and hold fixed the conditions shared by both temperatures.',
      ),
      t(
        '온도의 거듭제곱 비와 지수함수 비를 각각 계산해 곱한다.',
        'Compute the temperature power ratio and exponential ratio separately, then multiply.',
      ),
    ],
    warmups: [
      warmup(
        'payne-saha-ratio-ionize',
        t(
          '수소에서 전자가 완전히 빠져나왔다. 이는?',
          'An electron is completely removed from hydrogen. This is:',
        ),
        [
          t('여기만 일어난 것', 'Excitation only'),
          t('이온화', 'Ionization'),
          t('원자 수가 반드시 늘어난 것', 'Necessarily an increase in atom count'),
        ],
        1,
        t(
          '여기는 전자가 묶인 채 높은 준위로 가는 일이고, 이온화는 원자에서 전자가 벗어나는 일이다.',
          'Excitation moves a still-bound electron to a higher level; ionization removes it from the atom.',
        ),
      ),
      warmup(
        'payne-saha-ratio-exponent',
        t(
          '\\(\\chi\\)와 \\(k\\)가 양수다. \\(T\\)가 커지면 \\(\\exp(-\\frac{\\chi}{kT})\\)의 지수는?',
          'For positive \\(\\chi\\) and \\(k\\), what happens to the exponent of \\(\\exp(-\\frac{\\chi}{kT})\\) as \\(T\\) increases?',
        ),
        [
          t('더 큰 음수가 된다', 'It becomes more negative'),
          t('항상 0이다', 'It is always zero'),
          t('덜 음수가 되어 0에 가까워진다', 'It becomes less negative, approaching zero'),
        ],
        2,
        t(
          '분모가 커지면 \\(\\frac{\\chi}{kT}\\)가 작아진다. 음의 부호 때문에 지수는 0 쪽으로 올라가며 지수 인자도 커진다.',
          'A larger denominator reduces \\(\\frac{\\chi}{kT}\\). The negative exponent rises toward zero, increasing the exponential factor.',
        ),
      ),
    ],
  },
  'payne-level-population': {
    diagramKey: 'payne-stellar-atmospheres',
    scene: t(
      '흡수선을 만들려면 수소가 남아 있을 뿐 아니라 맞는 에너지 상태에 있어야 한다. 두 번의 조건을 차례로 통과하는 입자 수를 세자.',
      'Producing an absorption line requires hydrogen in the right ionization state and energy level. Count the atoms satisfying both conditions.',
    ),
    concepts: [
      terms.ion,
      terms.lte,
      terms.exp,
      concept(
        '중성 분율과 준위 점유율',
        'Neutral fraction and level population',
        '전체 수소 중 중성인 비율과, 그 중 특정 에너지 준위에 있는 비율은 다르다. 두 비율을 곱해야 전체 중 그 준위의 비율이 된다.',
        'The fraction of all hydrogen that is neutral differs from the fraction of neutral hydrogen in a particular energy level. Multiply them for the fraction of all hydrogen in that level.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(f_0=\frac{1}{1+R}\)`,
        '\\(R\\)은 이온/중성 수의 비이고 \\(f_0\\)는 전체 중 중성 분율이다. 이번 두 층은 서로 다른 전자 밀도를 허용하므로 앞 문제의 고정 밀도를 가져오지 않는다.',
        '\\(R\\) is ion/neutral and \\(f_0\\) the neutral fraction of all hydrogen. These layers allow different electron densities; do not import the preceding fixed-density assumption.',
      ),
      relation(
        String.raw`\(f_2=f_0\,4\exp(-\frac{\Delta E}{kT})\)`,
        '\\(f_2\\)는 전체 수소 중 \\(n=2\\) 준위의 비율이다. Δ\\(E\\)는 여기 에너지이며, 중성 원자의 바닥 상태가 우세하다는 근사다.',
        '\\(f_2\\) is the fraction of all hydrogen in level \\(n=2\\). Δ\\(E\\) is the excitation energy; the approximation assumes neutral atoms predominantly occupy their ground state.',
      ),
    ],
    steps: [
      t(
        '각 층에서 전체 중 중성 원자가 남은 비율을 구한다.',
        'Find the fraction remaining neutral in each layer.',
      ),
      t(
        '중성 내부의 준위 점유를 곱한 뒤 두 층의 전체 분율을 비교한다.',
        'Multiply by level occupancy within neutrals, then compare the total fractions.',
      ),
    ],
    warmups: [
      warmup(
        'payne-level-population-subset',
        t(
          '전체 구슬의 절반이 빨갛고, 빨간 구슬의 1/4이 크다. 전체 중 크고 빨간 구슬은?',
          'Half the marbles are red; one quarter of the red marbles are large. What fraction of all marbles is both?',
        ),
        [t('1/8', '1/8'), t('3/4', '3/4'), t('1/4', '1/4')],
        0,
        t(
          '부분 집합 안의 비율을 전체 비율로 옮길 때는 곱한다. 원자의 중성 분율과 준위 점유율도 이 구조다.',
          'Multiply a subgroup fraction by the group’s share of the whole. Neutral fraction and level population have the same structure.',
        ),
      ),
      warmup(
        'payne-level-population-neutral',
        t(
          '이온 수/중성 수=\\(R\\)이라면 전체 수소 수는 중성 수의 몇 배인가?',
          'If ion count/neutral count=\\(R\\), total hydrogen count is how many times the neutral count?',
        ),
        [
          t('\\(R\\)배', '\\(R\\) times'),
          t('\\(1+R\\)배', '\\(1+R\\) times'),
          t('\\(\\frac{1}{R}\\)배', '\\(\\frac{1}{R}\\) times'),
        ],
        1,
        t(
          '전체=중성+이온이므로 중성을 1로 세면 전체는 \\(1+R\\)이다. 따라서 중성이 전체에서 차지하는 비율은 \\(\\frac{1}{1+R}\\)이다.',
          'Total=neutral+ion. Taking neutral count as one makes the total \\(1+R\\), so the neutral share is \\(\\frac{1}{1+R}\\).',
        ),
      ),
    ],
  },
  'payne-abundance-inference': {
    diagramKey: 'payne-stellar-atmospheres',
    scene: t(
      '사진 속 수소 선이 진하다고 곧바로 수소가 많다고 말할 수 있을까? 빛이 원자를 통과해 우리에게 오는 전 과정을 생각해 보자.',
      'Does a deeper hydrogen line automatically mean more hydrogen? Follow light through the gas before drawing that conclusion.',
    ),
    concepts: [
      terms.ion,
      concept(
        '흡수선과 존재량',
        'Absorption line and abundance',
        '흡수선은 특정 파장의 빛이 주변보다 약해진 흔적이다. 원소 존재량은 전체 원자 중 그 원소가 차지하는 비율로, 선 깊이와 바로 같지 않다.',
        'An absorption line is reduced light at a particular wavelength. Abundance is an element’s share of the atoms, not simply a line’s depth.',
      ),
      concept(
        '광학 깊이와 복사 전달',
        'Optical depth and radiative transfer',
        '광학 깊이 \\(\\tau\\)는 빛이 물질을 지나며 얼마나 잘 가려지는지 나타낸다. 흡수·방출·산란을 함께 추적하는 계산이 복사 전달이다.',
        'Optical depth \\(\\tau\\) measures how strongly material obscures light. Radiative transfer follows absorption, emission, and scattering together.',
      ),
      concept(
        '역문제',
        'Inverse problem',
        '관측된 빛에서 온도·밀도·조성을 거꾸로 추정하는 문제다. 서로 다른 조건이 비슷한 선을 만들 수 있어 여러 관측을 함께 비교한다.',
        'Infer temperature, density, and composition from observed light. Different conditions can produce similar lines, so compare multiple observables.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(I=I_0\exp(-\tau)\)`,
        '방출·산란을 제외한 단순 흡수층에서는 입사 빛 \\(I_0\\)가 이만큼 줄어든다. 실제 별에는 더 많은 과정이 있어 이 한 식만으로 존재량을 정하지 않는다.',
        'For a purely absorbing layer without emission or scattering, incident intensity \\(I_0\\) is attenuated this way. A real stellar atmosphere requires more than this formula to determine abundance.',
      ),
    ],
    steps: [
      t(
        '같은 선을 바꿀 수 있는 온도·밀도·전달 효과를 나열한다.',
        'Identify temperature, density, and transfer effects that can alter a line.',
      ),
      t(
        '여러 선과 관측 조건으로 이 설명들을 함께 검증한다.',
        'Test these effects jointly using multiple lines and observing constraints.',
      ),
    ],
    warmups: [
      warmup(
        'payne-abundance-inference-depth',
        t(
          '순수 흡수층의 광학 깊이 \\(\\tau\\)가 커지면 통과 빛 \\(I\\)는?',
          'As optical depth \\(\\tau\\) increases in a purely absorbing layer, transmitted intensity \\(I\\):',
        ),
        [t('커진다', 'Increases'), t('반드시 같다', 'Must stay fixed'), t('작아진다', 'Decreases')],
        2,
        t(
          '더 잘 가려질수록 \\(\\exp(-\\tau)\\)가 작아져 통과 빛이 줄어든다. 광학 깊이는 원자 수 외의 상태와도 연결된다.',
          'Greater obscuration lowers \\(\\exp(-\\tau)\\) and transmitted light. Optical depth also depends on atomic state, not only atom count.',
        ),
      ),
      warmup(
        'payne-abundance-inference-degeneracy',
        t(
          '서로 다른 온도와 조성이 같은 선 깊이를 만들 수 있다. 구별에 도움이 되는 것은?',
          'Different temperatures and abundances can produce the same line depth. What helps distinguish them?',
        ),
        [
          t('여러 원소·준위의 선을 함께 분석', 'Analyze lines from multiple elements and levels'),
          t('선 하나만 더 진하게 표시', 'Display the same line more darkly'),
          t('온도를 확인 없이 같다고 고정', 'Assume equal temperature without checking'),
        ],
        0,
        t(
          '서로 다른 선은 조건에 다르게 반응한다. 함께 설명되는지 확인하면 단일 선의 모호함을 줄일 수 있다.',
          'Different lines respond differently to physical conditions. A joint explanation helps reduce the ambiguity of a single line.',
        ),
      ),
    ],
  },
  'einstein-deflection': {
    diagramKey: 'einstein-eclipse',
    scene: t(
      '일식 사진의 별 위치가 평소 사진과 조금 달라 보인다. 빛이 태양 옆을 지나는 길의 작은 굽음을 계산으로 읽어 보자.',
      'Stars on an eclipse plate appear slightly displaced from a comparison plate. Read that small bend in the light path with a calculation.',
    ),
    concepts: [
      concept(
        '충돌 매개변수',
        'Impact parameter',
        '멀리서 들어오는 빛의 원래 직선 경로와 천체 중심 사이의 수직 거리다. 표면에서 잰 높이가 아니며 약한 장에서 최근접 거리와 가깝다.',
        'The perpendicular offset between the incoming asymptotic straight path and the mass center. It is not height above the surface; in a weak field it approximates closest approach.',
      ),
      concept(
        '약한 중력장',
        'Weak gravitational field',
        '\\(\\frac{GM}{bc^2}\\)가 매우 작아 빛의 굽음도 작은 조건이다. 여기서는 일반상대론의 첫 근사식만 쓴다.',
        'The regime where \\(\\frac{GM}{bc^2}\\) is very small and deflection is small. Here only the leading general-relativistic approximation is used.',
      ),
      concept(
        '라디안과 초각',
        'Radians and arcseconds',
        '라디안은 호 길이/반지름인 각도다. 초각은 1도의 \\(\\frac{1}{3}\\),600이며, 라디안 결과에 문제의 환산계수를 곱해 바꾼다.',
        'A radian is arc length/radius. An arcsecond is \\(\\frac{1}{3}\\),600 of a degree; multiply a radian result by the supplied conversion factor.',
      ),
      concept(
        '차원과 단위',
        'Dimensions and units',
        '질량·길이·시간 같은 양의 종류가 차원이다. \\(G\\), 질량, 거리, 광속을 같은 단위계로 넣어야 식의 단위가 일관된다.',
        'Dimensions describe kinds of quantities such as mass, length, and time. Put \\(G\\), mass, distance, and light speed in a consistent unit system.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(\alpha=\frac{4GM}{bc^2}\)`,
        '\\(\\alpha\\)는 라디안 편향각이다. \\(G\\)는 중력상수, \\(M\\)은 굽히는 천체 질량, \\(c\\)는 광속이다. 계수 4는 일반상대론의 약한 장 결과다.',
        '\\(\\alpha\\) is deflection in radians, \\(G\\) the gravitational constant, \\(M\\) the deflecting mass, and \\(c\\) light speed. The factor four is the weak-field general-relativistic result.',
      ),
    ],
    steps: [
      t(
        '\\(b\\)가 중심 기준 거리임을 확인하고 SI 단위를 맞춘다.',
        'Check that \\(b\\) is measured from the center and use consistent SI units.',
      ),
      t(
        '라디안 결과를 얻은 후에만 초각으로 환산한다.',
        'Obtain radians first, then convert to arcseconds.',
      ),
    ],
    warmups: [
      warmup(
        'einstein-deflection-offset',
        t(
          '빛의 \\(b\\)를 태양 반지름으로 표현했다. 기준점은 어디인가?',
          'A light ray’s \\(b\\) is expressed in solar radii. Where is it measured from?',
        ),
        [
          t('태양 표면', 'The solar surface'),
          t('태양 중심', 'The solar center'),
          t('관측자의 눈', 'The observer’s eye'),
        ],
        1,
        t(
          '\\(b\\)는 들어오는 경로와 중심 사이의 수직 간격이다. 표면 위 높이와 혼동하면 반지름 하나가 잘못 더해지거나 빠진다.',
          '\\(b\\) is the perpendicular offset from the center to the incoming path. Confusing it with surface height adds or removes a radius incorrectly.',
        ),
      ),
      warmup(
        'einstein-deflection-scale',
        t(
          '같은 질량에서 빛이 지나가는 \\(b\\)를 3배로 하면 약한 장 편향각은?',
          'For the same mass, triple \\(b\\). What happens to weak-field deflection?',
        ),
        [t('\\(\\frac{1}{3}\\)배', 'One third'), t('3배', 'Three times'), t('9배', 'Nine times')],
        0,
        t(
          '편향은 \\(\\frac{1}{b}\\)에 비례한다. 단위 변환 전후 어느 쪽에서도 이 비율은 같다.',
          'Deflection is proportional to \\(\\frac{1}{b}\\). This ratio is unchanged by converting angular units.',
        ),
      ),
    ],
  },
  'einstein-weighted-fit': {
    diagramKey: 'einstein-eclipse',
    scene: t(
      '두 관측팀의 숫자가 조금 다르고 정밀도도 다르다. 더 불확실한 숫자에 얼마나 목소리를 줄지 정해 보자.',
      'Two teams report slightly different values with different precision. Decide how much influence each measurement deserves.',
    ),
    concepts: [
      terms.sigma,
      terms.variance,
      terms.independent,
      concept(
        '역분산 가중 평균',
        'Inverse-variance weighted mean',
        '독립 측정의 분산이 작을수록 큰 가중치 \\(\\frac{1}{\\sigma^2}\\)를 준 평균이다. 불확도가 서로 같을 때만 단순 평균과 같다.',
        'An average giving independent measurements weights \\(\\frac{1}{\\sigma^2}\\), larger for smaller variance. It equals an ordinary mean when uncertainties are equal.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(w_i=\frac{1}{\sigma_i^2}\)`,
        '\\(i\\)는 각 측정을 구별하는 번호다. \\(\\sigma\\)를 제곱한 분산의 역수를 가중치로 쓴다.',
        '\\(i\\) labels a measurement. Its weight is the reciprocal of variance, which is \\(\\sigma\\) squared.',
      ),
      relation(
        String.raw`\(\bar\alpha=\frac{\sum_i w_i\alpha_i}{\sum_i w_i}\)`,
        '\\(\\sum\\)는 모든 측정의 합이다. \\(\\alpha_i\\)는 편향각, 가로줄은 평균이다. 가중치를 곱해 합친 뒤 전체 가중치로 나눠 정규화한다.',
        '\\(\\sum\\) means summing over measurements, \\(\\alpha_i\\) is a deflection, and the bar denotes a mean. Sum weighted values, then divide by total weight.',
      ),
    ],
    steps: [
      t(
        '같은 물리량과 같은 단위로 보정된 측정인지 확인한다.',
        'Check that measurements refer to the same quantity in the same unit.',
      ),
      t(
        '가중합과 가중치 합을 따로 만든 뒤 나눈다.',
        'Form the weighted sum and total weight separately, then divide.',
      ),
    ],
    warmups: [
      warmup(
        'einstein-weighted-fit-precision',
        t(
          '같은 양을 독립 측정했다. 표준편차가 더 작은 측정은 이 모형에서?',
          'For independent measurements of the same quantity, the one with smaller standard deviation gets:',
        ),
        [
          t('더 작은 가중치', 'Less weight'),
          t('항상 0의 가중치', 'Always zero weight'),
          t('더 큰 가중치', 'More weight'),
        ],
        2,
        t(
          '작은 \\(\\sigma\\)는 더 좁은 퍼짐을 뜻한다. 독립 가우스 오차 모형에서 정밀한 측정에 더 큰 영향을 준다.',
          'Smaller \\(\\sigma\\) indicates tighter spread. In the independent Gaussian model the more precise measurement gets more influence.',
        ),
      ),
      warmup(
        'einstein-weighted-fit-square',
        t(
          '어떤 측정의 \\(\\sigma\\)가 다른 측정의 \\(\\frac{1}{3}\\)이다. 역분산 가중치는 몇 배인가?',
          'One measurement has one third the \\(\\sigma\\) of another. How many times its inverse-variance weight does it receive?',
        ),
        [t('3배', '3 times'), t('9배', '9 times'), t('1/9배', '1/9 times')],
        1,
        t(
          '분산은 \\(\\sigma^{2}\\)이므로 1/9이 되고, 그 역수인 가중치는 9배다. \\(\\sigma\\) 자체의 역수를 쓰지 않는다.',
          'Variance falls by a factor of nine, so inverse-variance weight rises by nine. Do not use the reciprocal of \\(\\sigma\\) alone.',
        ),
      ),
    ],
  },
  'einstein-systematics': {
    diagramKey: 'einstein-eclipse',
    scene: t(
      '한 사진판의 별을 더 많이 재면 모든 불확실성이 사라질까? 사진판 전체가 살짝 움직였을 가능성은 별마다 새로 뽑히지 않는다.',
      'Will measuring more stars on one plate eliminate all uncertainty? A possible shift of the whole plate is shared by every star.',
    ),
    concepts: [
      terms.independent,
      terms.variance,
      concept(
        '공통 영점 오차',
        'Shared zero-point error',
        '같은 사진판의 모든 위치가 함께 옮겨지는 불확실한 이동이다. 여러 별을 평균해도 별마다 독립인 잡음처럼 상쇄되지 않는다.',
        'An uncertain displacement shared by all positions on one plate. Averaging stars does not cancel it as though it were independent noise.',
      ),
      concept(
        '평균의 표준오차',
        'Standard error of a mean',
        '같은 측정 절차를 반복할 때 평균이 얼마나 흔들리는지다. 같은 크기의 독립 오차 \\(N\\)개만 있다면 개별 표준편차/\\(\\sqrt{N}\\)이다.',
        'The spread of a mean under repeated measurement. With only \\(N\\) independent equal-variance errors, it is individual standard deviation divided by \\(\\sqrt{N}\\).',
      ),
    ],
    relations: [
      relation(
        String.raw`\(\sigma_{mean}=\sqrt{\frac{\sigma^2}{N}+\tau^2}\)`,
        '\\(\\sigma\\)는 별마다 독립인 표준편차, \\(\\tau\\)는 사진판 전체의 공통 이동 표준편차다. 평균의 분산에는 서로 다른 두 항이 남는다.',
        '\\(\\sigma\\) is per-star independent spread and \\(\\tau\\) the standard deviation of the shared plate offset. The mean’s variance retains two distinct terms.',
      ),
    ],
    steps: [
      t(
        '별마다 다시 생기는 잡음과 함께 움직이는 오차를 나눈다.',
        'Separate fresh per-star noise from the shared shift.',
      ),
      t(
        '별 수를 늘릴 때 각 분산 항이 어떻게 변하는지 살핀다.',
        'Inspect how each variance term changes as the number of stars grows.',
      ),
    ],
    warmups: [
      warmup(
        'einstein-systematics-shared',
        t(
          '자가 실제보다 길게 인쇄되었다. 같은 자로 100번 재는 것만으로 이 문제는?',
          'A ruler was printed with the wrong scale. Does measuring 100 times with that ruler alone remove the problem?',
        ),
        [
          t('자동으로 고쳐지지 않는다', 'It is not automatically corrected'),
          t('반드시 완전히 사라진다', 'It must vanish completely'),
          t('측정 횟수만큼 부호가 바뀐다', 'Its sign changes with the count'),
        ],
        0,
        t(
          '같은 잘못된 눈금은 반복에도 공유된다. 이런 공통 효과는 독립 흔들림과 따로 다루어야 한다.',
          'The same scale error is shared across repetitions. Treat such common effects separately from independent fluctuations.',
        ),
      ),
      warmup(
        'einstein-systematics-root',
        t(
          '공통 오차 없이 독립 오차만 있다. 측정 수를 4배 하면 평균의 표준오차는?',
          'With independent errors only, quadruple the number of measurements. The standard error becomes:',
        ),
        [t('1/4배', 'One quarter'), t('4배', 'Four times'), t('1/2배', 'One half')],
        2,
        t(
          '분산은 \\(N\\)으로 나누고 표준오차는 그 제곱근이다. 따라서 \\(\\sqrt{4}=2\\)로 나누며, 공통 오차에는 이 감소를 적용하지 않는다.',
          'Variance divides by \\(N\\) and standard error is its square root. Divide by \\(\\sqrt{4}=2\\); do not apply this reduction to a shared error.',
        ),
      ),
    ],
  },
  'chandra-composition': {
    diagramKey: 'chandrasekhar-limit',
    scene: t(
      '핵융합이 끝난 작은 별의 잔해도 중력에 맞선다. 그 지지력을 정하는 전자 수를 물질 조성과 연결해 보자.',
      'A compact stellar remnant resists gravity after fusion stops. Connect its electron supply to the composition that supports it.',
    ),
    concepts: [
      terms.degeneracy,
      terms.composition,
      concept(
        '백색왜성과 태양질량',
        'White dwarf and solar mass',
        '백색왜성은 전자 축퇴압이 주로 지지하는 별의 잔해다. \\(M_\\odot\\)는 태양 한 개의 질량 단위이며 잔해 질량과 처음 별의 질량은 다르다.',
        'A white dwarf is a stellar remnant supported mainly by electron degeneracy pressure. \\(M_\\odot\\) is one solar mass; remnant mass differs from the star’s birth mass.',
      ),
      concept(
        '전자 분율',
        'Electron fraction',
        '바리온 수에 대한 전자 수의 비로, 여기서는 \\(\\mu_e\\)의 역수다. 같은 질량에서 전자를 얼마나 제공하는지 나타낸다.',
        'The number of electrons per baryon, here equal to \\(\\frac{1}{\\mu_e}\\). It measures the available electrons for a given mass.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(Y_e=\frac{1}{\mu_e},\quad \frac{M_{Ch}}{M_\odot}=5.83Y_e^2\)`,
        '\\(M_{Ch}\\)는 차갑고 비회전인 이상 모형의 한계 질량이다. 열·회전·쿨롱·일반상대론 보정은 포함하지 않는다.',
        '\\(M_{Ch}\\) is the limiting mass in a cold, nonrotating ideal model. Thermal, rotation, Coulomb, and general-relativistic corrections are excluded.',
      ),
    ],
    steps: [
      t(
        '\\(\\mu_e\\)가 전자 자체 질량이 아니라 조성의 지표임을 확인한다.',
        'Interpret \\(\\mu_e\\) as a composition parameter, not electron rest mass.',
      ),
      t(
        '같은 모형의 전자 공급량을 식에 연결해 태양질량 단위로 읽는다.',
        'Use its electron supply in the stated model and read the result in solar masses.',
      ),
    ],
    warmups: [
      warmup(
        'chandra-composition-support',
        t(
          '차가운 백색왜성을 지지하는 전자 축퇴압의 핵심은?',
          'What is central to electron degeneracy pressure supporting a cold white dwarf?',
        ),
        [
          t('반드시 계속되는 수소 핵융합', 'Necessarily ongoing hydrogen fusion'),
          t(
            '전자들이 동일한 양자상태를 함께 차지할 수 없음',
            'Electrons cannot share an identical quantum state',
          ),
          t('전자들이 모두 정지함', 'All electrons stop moving'),
        ],
        1,
        t(
          '파울리 배타 원리에 따라 높은 운동량 상태까지 채워진다. 축퇴압을 핵융합에서 나온 열압력과 혼동하지 않는다.',
          'Pauli exclusion requires occupation of higher-momentum states. Do not confuse degeneracy pressure with pressure from fusion heating.',
        ),
      ),
      warmup(
        'chandra-composition-electrons',
        t(
          '같은 물질 질량에서 \\(\\mu_e\\)가 커지면 제공되는 전자 수는?',
          'For the same mass of matter, increasing \\(\\mu_e\\) gives:',
        ),
        [
          t('더 적다', 'Fewer electrons'),
          t('더 많다', 'More electrons'),
          t('항상 같다', 'Always the same number'),
        ],
        0,
        t(
          '전자 하나당 필요한 물질 질량이 커졌으므로 같은 총질량에서 전자가 줄어든다. 그 역수가 전자 분율이다.',
          'More matter is needed per electron, so a fixed total mass contains fewer electrons. Electron fraction is the reciprocal parameter.',
        ),
      ),
    ],
  },
  'chandra-radius': {
    diagramKey: 'chandrasekhar-limit',
    scene: t(
      '더 무거운 백색왜성이 오히려 더 작을 수 있다. 같은 조성의 두 정적 모형을 비교해 이 낯선 관계를 읽어 보자.',
      'A more massive white dwarf can be smaller. Read this unfamiliar relation by comparing two static models of the same composition.',
    ),
    concepts: [
      terms.degeneracy,
      terms.scaling,
      concept(
        '비상대론적 전자',
        'Nonrelativistic electrons',
        '전자 운동 에너지가 정지 에너지보다 충분히 작아 고전적인 운동 관계가 좋은 근사인 상태다. 질량 한계 근처의 전자에는 그대로 적용하지 않는다.',
        'Electrons whose kinetic energies are small compared with their rest energies, allowing a nonrelativistic approximation. Do not extend it unchanged near the limiting mass.',
      ),
      concept(
        '정적 모형 비교',
        'Comparison of static models',
        '두 별이 각각 평형을 이룬 결과를 비교한다. 한 별이 실제로 질량을 얻거나 잃는 모든 과정을 계산한다는 뜻은 아니다.',
        'Compare two separately equilibrated stellar models. This does not calculate the complete process of adding or removing mass from a real star.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(\frac{R_2}{R_1}=(\frac{M_2}{M_1})^{-1/3}\)`,
        '같은 조성·비상대론적 모형에서 공통 비례상수를 없앤 비다. −\\(\\frac{1}{3}\\)제곱은 세제곱근의 역수다.',
        'A ratio canceling the shared constant for equal-composition nonrelativistic models. A power of −\\(\\frac{1}{3}\\) is the reciprocal cube root.',
      ),
    ],
    steps: [
      t('두 질량의 비를 만들어 단위를 없앤다.', 'Form a dimensionless mass ratio.'),
      t(
        '음의 분수 지수를 적용하고 질량이 늘 때 반지름 방향을 점검한다.',
        'Apply the negative fractional power and check the direction of the radius change.',
      ),
    ],
    warmups: [
      warmup(
        'chandra-radius-negative',
        t(
          '어떤 모형에서 \\(y\\propto x^{-1}\\)이다. \\(x\\)가 커지면 \\(y\\)는?',
          'In a model with \\(y\\propto x^{-1}\\), what happens to \\(y\\) as \\(x\\) grows?',
        ),
        [
          t('함께 커진다', 'It also grows'),
          t('무조건 0이 된다', 'It must become zero'),
          t('작아진다', 'It decreases'),
        ],
        2,
        t(
          '음의 지수는 역수 관계다. 값이 음수가 된다는 뜻이 아니라 입력 증가에 출력이 줄어든다는 뜻이다.',
          'A negative exponent describes an inverse relation. It does not make the value negative; the output falls as the input rises.',
        ),
      ),
      warmup(
        'chandra-radius-root',
        t(
          '별도의 수학 연습: \\(27^{-1/3}\\)을 계산하는 순서는?',
          'Separate mathematical practice: how do you evaluate \\(27^{-1/3}\\)?',
        ),
        [
          t('27에서 \\(\\frac{1}{3}\\)을 뺀다', 'Subtract \\(\\frac{1}{3}\\) from 27'),
          t('세제곱근을 구한 뒤 역수를 취한다', 'Take the cube root, then its reciprocal'),
          t('27에 −\\(\\frac{1}{3}\\)을 곱한다', 'Multiply 27 by −\\(\\frac{1}{3}\\)'),
        ],
        1,
        t(
          '\\(\\frac{1}{3}\\)제곱은 세제곱근이고 음의 부호는 역수다. 두 의미를 나누면 계산기 입력도 쉬워진다.',
          'A power of \\(\\frac{1}{3}\\) means cube root; the minus sign takes the reciprocal. Separating them makes calculator entry easier.',
        ),
      ),
    ],
  },
  'chandra-scaling': {
    diagramKey: 'chandrasekhar-limit',
    scene: t(
      '별이 줄어들면 압력도 강해진다. 하지만 중력이 요구하는 압력과 정확히 같은 비율로 강해진다면 수축만으로 이길 수 있을까?',
      'Shrinking a star raises its supporting pressure. What if gravity’s pressure requirement rises with exactly the same size dependence?',
    ),
    concepts: [
      terms.degeneracy,
      terms.scaling,
      concept(
        '초상대론적 전자',
        'Ultrarelativistic electrons',
        '전자 운동 에너지가 정지 에너지보다 매우 커 운동량과 에너지의 관계가 달라진 상태다. 이때 축퇴압은 밀도의 4/3제곱에 비례한다.',
        'Electrons with kinetic energies far above rest energy, changing their energy–momentum relation. Degeneracy pressure then scales as density to the 4/3 power.',
      ),
      concept(
        '차원 분석의 한계',
        'Limits of scaling analysis',
        '질량 \\(M\\)과 크기 \\(R\\)의 거듭제곱을 비교해 지배적인 관계를 찾는다. 정확한 한계 질량의 수치 계수는 별의 내부 구조를 풀어야 정해진다.',
        'Compare powers of mass \\(M\\) and size \\(R\\) to identify dominant relations. A precise limiting-mass coefficient requires solving the star’s internal structure.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(P_{deg}\propto(\frac{M}{R^3})^{4/3}\)`,
        '\\(\\frac{M}{R^3}\\)은 밀도의 규모다. 조성을 고정한 극상대론적 축퇴압의 크기 의존성을 먼저 풀어 쓴다.',
        '\\(\\frac{M}{R^3}\\) is a density scale. Expand the size dependence of ultrarelativistic degeneracy pressure at fixed composition.',
      ),
      relation(
        String.raw`\(P_{grav}\propto\frac{GM^2}{R^4}\)`,
        '이것은 중력 자체가 밖으로 미는 압력이 아니라, 중력을 지지하기 위해 필요한 압력의 규모다.',
        'This is the pressure scale required to support gravity, not an outward pressure exerted by gravity.',
      ),
    ],
    steps: [
      t(
        '두 압력식의 \\(M\\)과 \\(R\\) 지수를 각각 정리한다.',
        'Expand the separate powers of \\(M\\) and \\(R\\) in both pressure scales.',
      ),
      t(
        '압력을 맞출 때 반지름 조절이 어디까지 가능한지 비교한다.',
        'Compare what changing radius can accomplish when the pressures must balance.',
      ),
    ],
    warmups: [
      warmup(
        'chandra-scaling-pressure',
        t(
          '“중력 지지에 필요한 압력”이란?',
          'What is meant by “pressure required to support gravity”?',
        ),
        [
          t(
            '안으로 끌어당기는 중력에 맞설 내부 압력',
            'Internal pressure needed to balance inward gravity',
          ),
          t('중력이 별을 밖으로 미는 힘', 'An outward push from gravity'),
          t('우주 바깥의 공기압', 'Air pressure outside the Universe'),
        ],
        0,
        t(
          '중력은 안으로 끌어당긴다. 내부 압력의 공간적 차이가 그 무게를 지지해야 한다는 요구량을 비교한다.',
          'Gravity pulls inward. The pressure gradient must support that weight; the expression estimates how much support is needed.',
        ),
      ),
      warmup(
        'chandra-scaling-exponent',
        t(
          '다른 수학 연습: \\((x^3)^2\\)의 지수는?',
          'Separate mathematical practice: what is \\((x^3)^2\\)?',
        ),
        [
          t('\\(x^{5}\\)', '\\(x^{5}\\)'),
          t('\\(2x^{3}\\)', '\\(2x^{3}\\)'),
          t('\\(x^{6}\\)', '\\(x^{6}\\)'),
        ],
        2,
        t(
          '거듭제곱을 다시 거듭제곱하면 지수를 곱한다. 압력식 괄호의 질량과 반지름에도 같은 규칙을 적용한다.',
          'A power raised to a power multiplies exponents. Apply this rule to mass and radius inside the pressure expression.',
        ),
      ),
    ],
  },
  'hubble-slope': {
    diagramKey: 'hubble-expansion',
    scene: t(
      '은하의 거리와 속도를 종이에 점으로 찍는다. 점들이 완벽한 직선이 아니어도, 어떤 기울기가 전체를 가장 잘 설명할지 정할 수 있다.',
      'Plot galaxy distances against speeds. Even without a perfect line, choose the slope that best explains the collection.',
    ),
    concepts: [
      terms.hubble,
      terms.leastSquares,
      terms.parsec,
      concept(
        '절편과 잔차',
        'Intercept and residual',
        '절편은 가로값 0에서 직선의 높이다. 원점 고정은 절편을 0으로 두는 조건이며 잔차는 관측 속도−직선 예측 속도다.',
        'The intercept is the line’s height at horizontal coordinate zero. Fixing the origin sets it to zero; a residual is observed minus predicted velocity.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(S(H)=\sum_i(v_i-Hd_i)^2\)`,
        '\\(\\sum\\)는 각 은하 \\(i\\)의 합이다. 거리 \\(d_i\\)는 정확하고 속도 \\(v_i\\) 오차가 같다는 조건에서 이 잔차제곱합을 최소화한다.',
        '\\(\\sum\\) sums over galaxies \\(i\\). Minimize these squared residuals assuming exact distances \\(d_i\\) and equal velocity errors.',
      ),
      relation(
        String.raw`\(H=\frac{\sum_i d_iv_i}{\sum_i d_i^2}\)`,
        '원점 고정·동일 속도 오차 조건의 해다. 은하별 \\(v_i/d_i\\)를 단순 평균하는 것과는 다르다.',
        'The solution for a fixed origin and equal velocity errors. It is not the ordinary average of individual \\(v_i/d_i\\) ratios.',
      ),
    ],
    steps: [
      t(
        '가로축 거리와 세로축 속도, 원점 고정 조건을 확인한다.',
        'Identify distance on the horizontal axis, speed on the vertical, and the fixed origin.',
      ),
      t(
        '거리×속도 합과 거리 제곱 합을 따로 계산해 기울기로 연결한다.',
        'Sum distance times speed and squared distances separately to form the slope.',
      ),
    ],
    warmups: [
      warmup(
        'hubble-slope-residual',
        t(
          '직선이 속도를 너무 작게 예측했다. 관측−예측 잔차는?',
          'A line predicts too small a velocity. The observed-minus-predicted residual is:',
        ),
        [t('음수', 'Negative'), t('양수', 'Positive'), t('항상 0', 'Always zero')],
        1,
        t(
          '관측값이 예측값보다 크므로 뺀 값은 양수다. 제곱합에서는 양·음 잔차가 서로 지워지지 않는다.',
          'Observed exceeds predicted, giving a positive residual. Squaring prevents positive and negative residuals from canceling.',
        ),
      ),
      warmup(
        'hubble-slope-objective',
        t(
          '직선을 고를 때 잔차 대신 잔차 제곱을 더하는 이유는?',
          'Why sum squared residuals rather than residuals when fitting a line?',
        ),
        [
          t(
            '양수와 음수가 상쇄되는 일을 막기 위해',
            'To prevent positive and negative errors canceling',
          ),
          t('모든 관측값을 0으로 만들기 위해', 'To force all observations to zero'),
          t('거리 단위를 없애기 위해서만', 'Only to remove distance units'),
        ],
        0,
        t(
          '반대쪽 오차가 같은 크기로 있어도 각각의 어긋남은 남아야 한다. 제곱합은 큰 잔차에 더 큰 벌점을 주는 선택이다.',
          'Opposite errors should still count as discrepancies. Squared residuals also penalize larger deviations more strongly.',
        ),
      ),
    ],
  },
  'hubble-time': {
    diagramKey: 'hubble-expansion',
    scene: t(
      '거리당 속도로 적힌 숫자를 시계로 바꿔 보자. 지금의 팽창 속도에서 얻은 시간 척도와 실제 우주 나이는 같은 질문이 아니다.',
      'Turn a speed-per-distance into a clock. A timescale from present expansion and the Universe’s actual age are different questions.',
    ),
    concepts: [
      terms.hubble,
      terms.parsec,
      concept(
        '차원 환산',
        'Dimensional conversion',
        '\\(\\mathrm{km}\\,\\mathrm{s}^{-1}\\,\\mathrm{Mpc}^{-1}\\)의 Mpc도 길이이므로 km로 바꾸면 길이끼리 약분되어 \\(\\mathrm{s}^{-1}\\)이 남는다. 역수를 취한 뒤 초를 년으로 바꾼다.',
        'Mpc is a length. Converting it to km in \\(\\mathrm{km}\\,\\mathrm{s}^{-1}\\,\\mathrm{Mpc}^{-1}\\) cancels the length units, leaving \\(\\mathrm{s}^{-1}\\). Take the reciprocal, then convert seconds to years.',
      ),
      concept(
        'Gyr와 팽창 이력',
        'Gyr and expansion history',
        'Gyr는 10억 년이다. 우주 나이는 과거의 팽창 속도가 어떻게 변했는지에 달려 있어 현재 \\(H\\)의 역수만으로 정해지지 않는다.',
        'Gyr means one billion years. Cosmic age depends on how expansion changed in the past, so the present inverse \\(H\\) alone does not determine it.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(t_H=\frac{1}{H}\)`,
        '\\(H\\)를 \\(\\mathrm{s}^{-1}\\)로 바꾸면 \\(t_H\\)는 초다. 문제에서 준 Mpc→km와 초→년 환산값을 사용한다.',
        'With \\(H\\) expressed in \\(\\mathrm{s}^{-1}\\), \\(t_H\\) is in seconds. Use the Mpc-to-km and seconds-to-years conversions supplied in the problem.',
      ),
    ],
    steps: [
      t(
        '길이 단위를 약분해 \\(H\\)를 초의 역수로 만든다.',
        'Cancel length units to express \\(H\\) in inverse seconds.',
      ),
      t(
        '역수의 초를 년, 다시 10억 년 단위로 바꾼다.',
        'Convert reciprocal seconds to years and then billions of years.',
      ),
    ],
    warmups: [
      warmup(
        'hubble-time-dimension',
        t('속도/거리의 차원은?', 'What are the dimensions of speed divided by distance?'),
        [
          t('거리의 제곱을 시간으로 나눈 양', 'Squared distance divided by time'),
          t('시간', 'Time'),
          t('시간의 역수', 'Inverse time'),
        ],
        2,
        t(
          '속도는 거리/시간이다. 다시 거리로 나누면 거리가 약분되어 시간의 역수만 남는다.',
          'Speed is distance/time. Dividing again by distance cancels length, leaving inverse time.',
        ),
      ),
      warmup(
        'hubble-time-clock',
        t(
          '초로 얻은 시간을 년으로 바꾸려 한다. 필요한 연산은?',
          'To convert a time in seconds into years, what operation is needed?',
        ),
        [
          t('1년의 초 수를 곱한다', 'Multiply by seconds per year'),
          t('1년의 초 수로 나눈다', 'Divide by seconds per year'),
          t('km를 곱한다', 'Multiply by km'),
        ],
        1,
        t(
          '초/(초/년)=년이다. 단위가 약분되는지 보면 곱셈과 나눗셈을 뒤집는 실수를 줄일 수 있다.',
          'Seconds divided by seconds/year gives years. Checking cancellation helps avoid reversing multiplication and division.',
        ),
      ),
    ],
  },
  'hubble-calibration': {
    diagramKey: 'hubble-expansion',
    scene: t(
      '속도 표는 그대로인데 거리 자의 눈금이 바뀌었다. 그래프가 가로로 늘어날 때 기울기와 시간 척도를 함께 추적하자.',
      'The velocities are unchanged, but the distance ruler is recalibrated. Track the slope and timescale as the plot stretches horizontally.',
    ),
    concepts: [
      terms.hubble,
      terms.leastSquares,
      concept(
        '거리 영점 보정',
        'Distance-scale calibration',
        '모든 거리를 같은 배율 \\(q\\)로 바꾸는 공통 눈금 수정이다. 이번 문제에서는 개별 속도와 표본, 속도 오차를 바꾸지 않는다.',
        'A common scale correction multiplying every distance by \\(q\\). Individual velocities, sample membership, and velocity uncertainties remain unchanged here.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(H=\frac{\sum_i d_iv_i}{\sum_i d_i^2}\)`,
        '각 거리 \\(d_i\\)를 \\(qd_i\\)로 바꿔 분자와 분모에 \\(q\\)가 몇 번 들어가는지 센다.',
        'Replace each \\(d_i\\) by \\(qd_i\\) and count the factors of \\(q\\) in numerator and denominator.',
      ),
      relation(
        String.raw`\(t_H=\frac{1}{H}\)`,
        '같은 변환에서 기울기와 그 역수인 시간은 반대로 움직인다. 크기를 더하는 보정과 배율 보정을 구별한다.',
        'Under the same change, slope and its reciprocal timescale move inversely. Distinguish multiplicative recalibration from an additive offset.',
      ),
    ],
    steps: [
      t(
        '변하지 않는 속도와 바뀌는 거리 항을 분리한다.',
        'Separate unchanged velocities from rescaled distances.',
      ),
      t(
        '기울기의 배율을 먼저 구하고 시간에는 역수 관계를 적용한다.',
        'Find the slope factor, then use the reciprocal relation for time.',
      ),
    ],
    warmups: [
      warmup(
        'hubble-calibration-axes',
        t(
          '가로축은 거리, 세로축은 속도다. 거리 눈금만 늘리면 점은 주로 어느 방향으로 이동하는가?',
          'Distance is horizontal and speed vertical. Rescaling only distances moves points in which direction?',
        ),
        [
          t('가로 방향', 'Horizontally'),
          t('세로 방향', 'Vertically'),
          t('두 값이 반드시 0으로', 'Both values must go to zero'),
        ],
        0,
        t(
          '속도를 바꾸지 않으므로 높이는 같다. 변환한 축이 무엇인지 먼저 알아야 기울기 변화를 읽을 수 있다.',
          'Unchanged speeds preserve the heights. Identify the rescaled axis before reading the slope change.',
        ),
      ),
      warmup(
        'hubble-calibration-powers',
        t(
          '\\(H\\) 식의 분자는 거리 1번, 분모는 거리 2번이 곱해진다. 거리를 \\(q\\)배 하면 분자와 분모는 각각?',
          '\\(H\\) has one distance factor in its numerator and two in its denominator. Multiplying distances by \\(q\\) scales them by:',
        ),
        [
          t('\\(q^{2}\\)와 \\(q\\)', '\\(q^{2}\\) and \\(q\\)'),
          t('둘 다 \\(q\\)', '\\(q\\) and \\(q\\)'),
          t('\\(q\\)와 \\(q^{2}\\)', '\\(q\\) and \\(q^{2}\\)'),
        ],
        2,
        t(
          '곱해진 거리 인자의 수만큼 배율이 붙는다. 두 배율을 나누면 새 기울기의 변화를 찾을 수 있다.',
          'Each distance factor contributes a factor of \\(q\\). Dividing the two factors gives the change in slope.',
        ),
      ),
    ],
  },
  'zwicky-virial-mass': {
    diagramKey: 'zwicky-cluster',
    scene: t(
      '은하단의 은하들은 제각기 빠르게 움직인다. 흩어지지 않게 붙잡는 중력이 얼마나 필요한지 속도의 퍼짐으로 재 보자.',
      'Galaxies in a cluster move rapidly in different directions. Use their velocity spread to estimate the gravity needed to keep the cluster together.',
    ),
    concepts: [
      terms.dispersion,
      terms.virial,
      concept(
        '등방성과 에너지',
        'Isotropy and energy',
        '등방성은 세 방향의 속도 퍼짐이 같다는 뜻이다. 운동에너지 \\(T\\)에는 세 방향을 모두 넣고, 결합된 계의 중력 위치에너지 \\(U\\)는 음수다.',
        'Isotropy means equal velocity spread in three directions. Kinetic energy \\(T\\) includes all three, while gravitational potential energy \\(U\\) is negative for a bound system.',
      ),
      terms.parsec,
    ],
    relations: [
      relation(
        String.raw`\(T=\frac{3}{2}M\sigma^2,\quad U=-\frac{3GM^2}{5R}\)`,
        '\\(M\\)은 총질량, \\(R\\)은 균일 구의 반지름이다. 계수 3은 등방적 세 방향, 3/5는 균일 구형 분포에서 나온다.',
        '\\(M\\) is total mass and \\(R\\) the uniform sphere’s radius. Three comes from isotropic dimensions; 3/5 comes from the uniform spherical density profile.',
      ),
      relation(
        String.raw`\(2T+U=0\)`,
        '이 교육 모형에서는 평형을 가정한다. \\(G\\)의 길이 단위가 kpc이므로 \\(R\\)도 kpc로 맞춰야 한다.',
        'Equilibrium is assumed in this teaching model. \\(G\\) uses kpc as its length unit, so express \\(R\\) in kpc too.',
      ),
    ],
    steps: [
      t(
        '1차원 속도와 세 방향 에너지, 모형의 밀도 분포를 확인한다.',
        'Check the one-dimensional speed statistic, three-dimensional energy, and density model.',
      ),
      t(
        '두 에너지식을 평형 조건에 넣고 질량을 분리한다.',
        'Substitute both energies into the equilibrium condition and isolate mass.',
      ),
    ],
    warmups: [
      warmup(
        'zwicky-virial-mass-spread',
        t(
          '모든 은하가 우리에게서 똑같은 속도로 멀어진다. 평균을 뺀 속도 퍼짐은?',
          'Every galaxy recedes at exactly the same velocity. What is the velocity spread after subtracting the mean?',
        ),
        [
          t('그 후퇴 속도와 같다', 'Equal to that recession speed'),
          t('0이다', 'Zero'),
          t('항상 광속이다', 'Always light speed'),
        ],
        1,
        t(
          '공통 후퇴는 은하단 전체의 운동이다. 내부 운동의 퍼짐을 재려면 평균 운동을 먼저 빼야 한다.',
          'Common recession is bulk motion of the cluster. Subtract it before measuring internal velocity spread.',
        ),
      ),
      warmup(
        'zwicky-virial-mass-dimensions',
        t(
          '세 방향의 분산이 각각 \\(\\sigma^{2}\\)로 같다. 세 방향 속력 제곱의 평균은?',
          'Each of three directions has variance \\(\\sigma^{2}\\). What is the mean squared three-dimensional speed?',
        ),
        [
          t('\\(3\\sigma^{2}\\)', '\\(3\\sigma^{2}\\)'),
          t('\\(\\frac{\\sigma^2}{3}\\)', '\\(\\frac{\\sigma^2}{3}\\)'),
          t('\\(9\\sigma^{2}\\)', '\\(9\\sigma^{2}\\)'),
        ],
        0,
        t(
          '속력 제곱은 세 성분 제곱의 합이다. 등방성에서는 같은 \\(\\sigma^{2}\\) 세 개를 더하며 \\(\\sigma\\) 자체를 세 배한 뒤 제곱하지 않는다.',
          'Squared speed is the sum of three squared components. Isotropy adds three \\(\\sigma^{2}\\) terms; it does not square three times \\(\\sigma\\).',
        ),
      ),
    ],
  },
  'zwicky-noise-correction': {
    diagramKey: 'zwicky-cluster',
    scene: t(
      '망원경의 측정 흔들림도 은하단의 움직임처럼 보일 수 있다. 관측된 퍼짐에서 장비가 보탠 부분을 분리해 보자.',
      'Measurement noise can masquerade as motion inside a cluster. Separate the instrument’s contribution from the observed spread.',
    ),
    concepts: [terms.dispersion, terms.variance, terms.independent, terms.scaling],
    relations: [
      relation(
        String.raw`\(\sigma_{obs}^2=\sigma_{true}^2+\sigma_{err}^2\)`,
        'obs는 관측, true는 실제 내부 운동, err는 측정 잡음이다. 독립 오차이며 각 측정의 잡음 분산이 같다는 모형이다.',
        'obs denotes observed spread, true the intrinsic motion, and err measurement noise. Errors are independent and have equal variance per measurement.',
      ),
      relation(
        String.raw`\(M\propto\sigma_{true}^2\)`,
        '반지름과 질량 분포 모형이 같을 때 질량은 실제 속도 분산의 제곱에 비례한다. 표준편차끼리 빼지 않는다.',
        'For a fixed radius and density model, mass scales with intrinsic velocity dispersion squared. Do not subtract standard deviations directly.',
      ),
    ],
    steps: [
      t(
        '관측과 잡음의 표준편차를 먼저 제곱한다.',
        'Square the observed and noise standard deviations first.',
      ),
      t(
        '분산을 뺀 뒤 같은 모형에서 질량 비율로 옮긴다.',
        'Subtract variances, then convert to a mass ratio in the same model.',
      ),
    ],
    warmups: [
      warmup(
        'zwicky-noise-correction-statistic',
        t(
          '표준편차 \\(\\sigma\\)와 통계적 분산의 관계는?',
          'How is statistical variance related to standard deviation \\(\\sigma\\)?',
        ),
        [
          t('분산=\\(\\sqrt{\\sigma}\\)', 'Variance=\\(\\sqrt{\\sigma}\\)'),
          t('분산=\\(2\\sigma\\)', 'Variance=\\(2\\sigma\\)'),
          t('분산=\\(\\sigma^{2}\\)', 'Variance=\\(\\sigma^{2}\\)'),
        ],
        2,
        t(
          '분산은 제곱 단위의 퍼짐이다. 예를 들어 \\(\\sigma\\)가 \\(\\mathrm{km}/\\mathrm{s}\\)라면 분산 단위는 \\((\\mathrm{km}/\\mathrm{s})^2\\)다.',
          'Variance expresses spread in squared units. If \\(\\sigma\\) uses \\(\\mathrm{km}/\\mathrm{s}\\), variance uses \\((\\mathrm{km}/\\mathrm{s})^2\\).',
        ),
      ),
      warmup(
        'zwicky-noise-correction-subtract',
        t(
          '실제 운동에 독립 잡음이 더해졌다. 실제 분산을 찾는 연산은?',
          'Independent noise has been added to intrinsic motion. How do you recover intrinsic variance?',
        ),
        [
          t(
            '관측 표준편차−잡음 표준편차',
            'Observed standard deviation minus noise standard deviation',
          ),
          t('관측 분산−잡음 분산', 'Observed variance minus noise variance'),
          t('관측 분산+잡음 분산', 'Observed variance plus noise variance'),
        ],
        1,
        t(
          '더해지는 양은 분산이다. 잡음을 제거할 때도 같은 제곱 단위에서 빼야 한다.',
          'Variances are the quantities that add. Remove noise by subtracting in those same squared units.',
        ),
      ),
    ],
  },
  'zwicky-evidence': {
    diagramKey: 'zwicky-cluster',
    scene: t(
      '움직임으로 잰 질량과 별빛으로 센 질량이 다르다. 놀라운 발견 앞에서 무엇을 점검하고 어디까지 말할 수 있을지 따져 보자.',
      'Mass inferred from motion differs from mass counted in starlight. Decide what to check and how far the evidence supports a conclusion.',
    ),
    concepts: [
      terms.virial,
      terms.baryon,
      concept(
        '동역학적 질량',
        'Dynamical mass',
        '운동을 만드는 중력에서 추정한 질량이다. 모형과 평형 조건에 의존하며 물질의 입자 종류를 직접 측정한 것은 아니다.',
        'Mass inferred from the gravity driving motion. It depends on the model and equilibrium assumptions; it does not directly identify a particle species.',
      ),
      concept(
        '독립 검증과 중력렌즈',
        'Independent tests and gravitational lensing',
        '중력렌즈는 질량이 빛 경로를 굽히는 현상이다. 속도 분석과 다른 관측으로 질량을 확인하면 한 모형의 오류에만 기대는 위험을 줄인다.',
        'Gravitational lensing is the bending of light by mass. Checking mass with a different observable reduces reliance on errors in a single model.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(M_{dyn}\quad\hbox{vs.}\quad M_{stars}+M_{gas}\)`,
        '중력에서 추정한 질량을 별과 기체 등 알려진 보통 물질 질량과 비교한다. 두 값의 차는 가정 검토와 독립 관측의 출발점이다.',
        'Compare gravitationally inferred mass with known ordinary matter, including stars and gas. A discrepancy motivates assumption checks and independent observations.',
      ),
    ],
    steps: [
      t(
        '빛나는 별 외에 빠뜨린 보통 물질과 평형 가정을 점검한다.',
        'Check omitted ordinary matter and the equilibrium assumption.',
      ),
      t(
        '독립적인 질량 근거와 입자 정체의 증거를 구별한다.',
        'Distinguish independent evidence for mass from evidence identifying a particle.',
      ),
    ],
    warmups: [
      warmup(
        'zwicky-evidence-matter',
        t(
          '은하단의 보통 물질 질량에 포함해야 하는 것은?',
          'What should be counted in a cluster’s ordinary-matter mass?',
        ),
        [
          t('별과 뜨거운 기체', 'Stars and hot gas'),
          t('맨눈으로 보이는 별만', 'Only stars visible to the naked eye'),
          t('사진의 밝은 픽셀 수만', 'Only the number of bright image pixels'),
        ],
        0,
        t(
          '뜨거운 기체도 질량을 가진 보통 물질이다. “별빛으로 센 양”과 “모든 바리온 양”을 구별해야 한다.',
          'Hot gas also carries ordinary-matter mass. Distinguish a starlight estimate from the complete baryonic inventory.',
        ),
      ),
      warmup(
        'zwicky-evidence-independence',
        t(
          '운동 모형과 다른 방법으로 질량을 점검하려 한다. 어떤 관측이 적절한가?',
          'Which observation checks mass using a method different from the velocity model?',
        ),
        [
          t('같은 속도표 글자 크기 변경', 'Changing the font size of the same velocity table'),
          t('가설 이름을 바꾸기', 'Renaming the hypothesis'),
          t('배경 빛의 중력렌즈 왜곡', 'Lensing distortion of background light'),
        ],
        2,
        t(
          '렌즈는 빛 경로로 중력을 탐지한다. 다른 계통오차를 가진 관측을 함께 쓰면 질량 불일치 해석을 더 강하게 시험할 수 있다.',
          'Lensing probes gravity through light paths. Combining observations with different systematics tests the mass discrepancy more strongly.',
        ),
      ),
    ],
  },
  'rubin-inclined-mass': {
    diagramKey: 'rubin-rotation',
    scene: t(
      '기울어진 은하의 회전은 우리 쪽 성분만 보인다. 관측 방향을 바로잡아야 그 움직임을 만드는 질량도 바르게 읽는다.',
      'An inclined galaxy reveals only part of its rotation along our line of sight. Correct the viewing geometry before inferring the mass.',
    ),
    concepts: [
      terms.inclination,
      terms.spherical,
      terms.parsec,
      concept(
        '원운동과 구심 가속도',
        'Circular motion and centripetal acceleration',
        '속력은 같아도 방향이 계속 바뀌면 중심 쪽 가속도 \\(\\frac{v^2}{r}\\)이 필요하다. 구대칭 모형에서는 내부 질량의 중력 \\(\\frac{GM}{r^2}\\)가 이를 제공한다.',
        'Constant-speed circular motion still needs inward acceleration \\(\\frac{v^2}{r}\\) as direction changes. In a spherical model, enclosed mass provides it through \\(\\frac{GM}{r^2}\\).',
      ),
    ],
    relations: [
      relation(
        String.raw`\(v_{los}=v\sin i\)`,
        '원반 장축에서의 식이다. los는 우리 시선 방향 성분이고, 먼저 은하 전체의 공통 운동을 뺀다. 정면 \\(i=0\\)에서는 회전 속력을 이 식으로 복원할 수 없다.',
        'This applies on the disk’s major axis. los is the line-of-sight component after subtracting bulk motion. At face-on \\(i=0\\) it cannot recover rotation speed.',
      ),
      relation(
        String.raw`\(M(<r)=\frac{rv^2}{G}\)`,
        '\\(M(<r)\\)는 반지름 \\(r\\) 안의 질량이다. 기울기를 보정한 실제 원운동 속력 \\(v\\)를 제곱하고, 주어진 \\(G\\)와 거리 단위를 맞춘다.',
        '\\(M(<r)\\) is mass enclosed within \\(r\\). Square the corrected circular speed \\(v\\) and match the distance unit to the supplied \\(G\\).',
      ),
    ],
    steps: [
      t(
        '장축 시선 속력을 경사각으로 보정해 원운동 속력으로 바꾼다.',
        'Correct major-axis line-of-sight speed for inclination.',
      ),
      t(
        '같은 단위의 반지름과 속력 제곱을 내부 질량식에 넣는다.',
        'Use consistent radius units and corrected speed squared in the enclosed-mass relation.',
      ),
    ],
    warmups: [
      warmup(
        'rubin-inclined-mass-faceon',
        t(
          '회전 원반을 완전히 정면에서 보면 이상적인 원운동의 시선 성분은?',
          'For an exactly face-on disk, what is the line-of-sight component of ideal circular rotation?',
        ),
        [
          t('회전 속력의 전부', 'The entire circular speed'),
          t('회전 속력의 두 배', 'Twice the circular speed'),
          t('0', 'Zero'),
        ],
        2,
        t(
          '운동이 하늘 면 안에서만 일어나므로 우리 쪽으로 다가오거나 멀어지는 성분이 없다. 이는 회전하지 않는다는 뜻은 아니다.',
          'The motion lies in the sky plane, with no toward-or-away component. This does not mean the disk is not rotating.',
        ),
      ),
      warmup(
        'rubin-inclined-mass-square',
        t(
          '같은 반지름의 구대칭 모형에서 실제 속력을 3배로 수정했다. 질량 추정은?',
          'At a fixed radius in a spherical model, the circular speed is corrected upward by a factor of three. Mass changes by:',
        ),
        [t('3배', '3 times'), t('9배', '9 times'), t('\\(\\sqrt{3}\\)배', '\\(\\sqrt{3}\\) times')],
        1,
        t(
          '내부 질량은 속력의 제곱에 비례한다. 방향 보정의 작은 오류도 질량에서는 제곱으로 영향을 준다.',
          'Enclosed mass scales with speed squared. Geometry errors in speed therefore propagate quadratically to mass.',
        ),
      ),
    ],
  },
  'rubin-density-slope': {
    diagramKey: 'rubin-rotation',
    scene: t(
      '멀리 나가도 회전 속력이 줄지 않는 구간이 있다. 안에 든 총질량과 바로 그 위치의 밀도는 어떻게 다를까?',
      'In one region, rotation stays fast at larger radii. Distinguish the mass inside a radius from the density at that location.',
    ),
    concepts: [
      terms.spherical,
      concept(
        '회전 곡선',
        'Rotation curve',
        '중심에서의 거리 \\(r\\)에 따른 원운동 속력 \\(v\\)를 그린 그래프다. 평평하다는 말은 그래프가 수평이라는 뜻이지 은하 두께가 얇다는 뜻이 아니다.',
        'A graph of circular speed \\(v\\) against radius \\(r\\). A flat curve is horizontal on the graph; it does not describe the galaxy’s thickness.',
      ),
      concept(
        '밀도와 얇은 구껍질',
        'Density and a thin spherical shell',
        '밀도 \\(\\rho\\)는 부피당 질량이다. 반지름 \\(r\\)에서 얇은 두께 \\(dr\\)의 구껍질 부피는 약 \\(4\\pi r^2\\,dr\\)이므로 그 안의 질량은 밀도×부피다.',
        'Density \\(\\rho\\) is mass per volume. A thin spherical shell of thickness \\(dr\\) has volume approximately \\(4\\pi r^2\\,dr\\), so its mass is density times that volume.',
      ),
      concept(
        '미분',
        'Derivative',
        '반지름을 아주 조금 늘릴 때 내부 질량이 얼마나 추가되는지 나타낸다. 전체 질량/반지름과 항상 같은 양은 아니다.',
        'The rate at which enclosed mass increases as radius grows slightly. It is not generally the same as total mass divided by radius.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(M(<r)=\frac{rv_0^2}{G}\)`,
        '\\(v_0\\)는 해당 유한 구간에서 일정한 속력이다. 이 가정을 중심이나 무한대까지 늘려 쓰지 않는다.',
        '\\(v_0\\) is constant over the finite interval being studied. Do not extend this assumption to the center or infinity.',
      ),
      relation(
        String.raw`\(\frac{dM}{dr}=4\pi r^2\rho(r)\)`,
        '추가 질량/추가 반지름은 구껍질 면적×국소 밀도다. 이 관계로 누적 질량과 그 자리 밀도를 연결한다.',
        'Added mass per added radius equals shell area times local density. This connects cumulative mass with density at that location.',
      ),
    ],
    steps: [
      t(
        '속력이 일정할 때 내부 질량이 반지름에 따라 어떻게 변하는지 찾는다.',
        'Find how enclosed mass changes with radius at constant speed.',
      ),
      t(
        '추가 질량을 구껍질 면적으로 나눠 밀도의 변화로 바꾼다.',
        'Divide added mass per radius by shell area to obtain the density dependence.',
      ),
    ],
    warmups: [
      warmup(
        'rubin-density-slope-local',
        t('반지름 안의 총질량과 그 자리의 밀도는?', 'Enclosed mass and density at a radius are:'),
        [
          t('누적한 양과 국소적인 양으로 서로 다르다', 'Different: one cumulative and one local'),
          t('항상 같은 수와 단위다', 'Always the same number and unit'),
          t('둘 다 속력이다', 'Both velocities'),
        ],
        0,
        t(
          '총질량은 안쪽 부피 전체를 더한 양이고 밀도는 특정 위치에서 부피당 얼마인지다. 둘을 연결하려면 껍질 부피가 필요하다.',
          'Enclosed mass sums the interior, while density measures mass per local volume. Shell volume connects them.',
        ),
      ),
      warmup(
        'rubin-density-slope-shell',
        t(
          '반지름이 3배인 얇은 구껍질을 비교한다. 두께가 같을 때 면적과 부피의 배율은?',
          'Compare thin spherical shells whose radii differ by a factor of three. At equal thickness, their areas and volumes differ by:',
        ),
        [t('3배', '3 times'), t('27배', '27 times'), t('9배', '9 times')],
        2,
        t(
          '얇은 껍질의 면적은 \\(r^{2}\\)에 비례하고 부피는 면적×같은 두께다. 채워진 구 전체의 \\(r^{3}\\) 법칙과 구별한다.',
          'Shell area scales as \\(r^{2}\\), and volume is area times the fixed thickness. Distinguish this from the \\(r^{3}\\) volume of a full sphere.',
        ),
      ),
    ],
  },
  'rubin-missing-fraction': {
    diagramKey: 'rubin-rotation',
    scene: t(
      '별과 기체로 예상한 회전보다 은하가 더 빠르다. 속도의 차이와 질량에서 빠진 몫은 같은 비율이 아니다.',
      'A galaxy rotates faster than predicted from its stars and gas. A speed shortfall is not the same fraction as a mass shortfall.',
    ),
    concepts: [
      terms.baryon,
      terms.spherical,
      terms.scaling,
      concept(
        '질량 분율',
        'Mass fraction',
        '부분 질량/전체 질량인 단위 없는 비다. %로 표현하려면 100을 곱하며, 전체에서 빠진 비율은 1−포함된 비율이다.',
        'A dimensionless ratio of partial mass to total mass. Multiply by 100 for percent; the missing fraction is one minus the included fraction.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(\frac{M_b}{M_{tot}}=\frac{rv_b^2/G}{rv_{obs}^2/G}\)`,
        '두 속력은 이미 경사각 보정을 끝냈다. 같은 반지름 \\(r\\)과 같은 구대칭 모형에서 공통 \\(\\frac{r}{G}\\)가 약분된다.',
        'Both speeds are already inclination-corrected. The common \\(\\frac{r}{G}\\) cancels at the same radius within the same spherical model.',
      ),
      relation(
        String.raw`\(f_{missing}=1-\frac{M_b}{M_{tot}}\)`,
        '\\(b\\)는 별과 기체의 바리온 모형, tot는 전체 질량이다. 속력 차이의 비를 질량 비로 바로 쓰지 않는다.',
        '\\(b\\) denotes the baryonic stars-and-gas model and tot total mass. Do not substitute a fractional speed difference directly for a mass fraction.',
      ),
    ],
    steps: [
      t(
        '같은 반지름에서 속력비를 질량비로 바꾼다.',
        'Convert the speed ratio to a mass ratio at the same radius.',
      ),
      t(
        '전체 1에서 포함된 몫을 빼고 백분율로 표현한다.',
        'Subtract the included share from one and express the result as a percentage.',
      ),
    ],
    warmups: [
      warmup(
        'rubin-missing-fraction-share',
        t(
          '같은 반지름에서 두 모형의 원운동 속력 비가 \\(q\\)다. 내부 질량 비는?',
          'Two models at the same radius have circular-speed ratio \\(q\\). Their enclosed-mass ratio is:',
        ),
        [
          t('\\(q\\)', '\\(q\\)'),
          t('\\(q^{2}\\)', '\\(q^{2}\\)'),
          t('\\(\\sqrt{q}\\)', '\\(\\sqrt{q}\\)'),
        ],
        1,
        t(
          '구대칭 원운동 모형에서 질량은 \\(v^{2}\\)에 비례한다. 공통 반지름과 \\(G\\)를 없애도 제곱은 남는다.',
          'In the spherical circular-motion model, mass scales as \\(v^{2}\\). Canceling common radius and \\(G\\) still leaves that square.',
        ),
      ),
      warmup(
        'rubin-missing-fraction-complement',
        t(
          '다른 연습: 전체 질량의 1/4을 설명했다. 아직 설명되지 않은 몫을 구하는 식은?',
          'Separate practice: one quarter of total mass is explained. Which expression gives the unexplained share?',
        ),
        [
          t('\\(1-\\frac{1}{4}\\)', '\\(1-\\frac{1}{4}\\)'),
          t('\\(1+\\frac{1}{4}\\)', '\\(1+\\frac{1}{4}\\)'),
          t('\\(1/(1/4)\\)', '\\(1/(1/4)\\)'),
        ],
        0,
        t(
          '전체를 1로 정하면 포함된 부분과 남은 부분의 합이 1이다. 먼저 질량 비를 만든 뒤 이 뺄셈을 적용한다.',
          'With total normalized to one, included and missing shares add to one. Form the mass ratio before taking the complement.',
        ),
      ),
    ],
  },
  'eratosthenes-uncertainty': {
    diagramKey: 'eratosthenes-earth',
    scene: t(
      '그림자를 다시 재니 숫자가 조금씩 흔들린다. 이제 둘레 하나보다 그 둘레를 얼마나 믿을 수 있는지가 궁금하다.',
      'Repeated shadow measurements vary slightly. Now ask how uncertain the inferred circumference is.',
    ),
    concepts: [
      terms.sigma,
      terms.independent,
      terms.variance,
      concept(
        '1차 오차 전파',
        'First-order uncertainty propagation',
        '입력의 작은 변화가 계산 결과를 얼마나 바꾸는지 선형으로 근사해 불확도를 합치는 방법이다. 큰 오차·상관 오차에는 보완이 필요하다.',
        'A linear approximation combining how small input changes affect a result. Large or correlated uncertainties require additional treatment.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(\frac{\sigma_C}{C}=\sqrt{(\frac{\sigma_s}{s})^2+(\frac{\sigma_\theta}{\theta})^2}\)`,
        '거리 \\(s\\)와 각도 \\(\\theta\\)의 독립적인 작은 표준불확도를 각각 자기 값으로 나눈다. 결과에 100을 곱해야 %다.',
        'Divide each small independent standard uncertainty by its own measured value. Multiply the resulting fraction by 100 for percent.',
      ),
    ],
    steps: [
      t(
        '각 입력의 상대적인 흔들림을 단위 없는 비율로 만든다.',
        'Express each input’s spread as a dimensionless fraction.',
      ),
      t(
        '제곱을 합치고 제곱근을 취한 뒤 %로 바꾼다.',
        'Add squares, take the square root, then convert to percent.',
      ),
    ],
    warmups: [
      warmup(
        'eratosthenes-uncertainty-sigma',
        t(
          '“\\(\\pm1\\sigma\\)”를 적은 측정에서 \\(\\sigma\\)가 뜻하는 것은?',
          'What does \\(\\sigma\\) mean in a measurement written with “\\(\\pm1\\sigma\\)”?',
        ),
        [
          t('절대로 넘지 않는 최대 오차', 'An absolute maximum error'),
          t('측정값 자체의 크기', 'The measurement’s value'),
          t('오차 모형의 표준적인 퍼짐', 'The standard spread in the error model'),
        ],
        2,
        t(
          '\\(1\\sigma\\)는 표준편차 한 개다. 정규분포라면 약 68% 범위이고, 그 바깥의 값도 가능하다.',
          '\\(1\\sigma\\) is one standard deviation. A Gaussian has about 68% within this interval, so values outside it remain possible.',
        ),
      ),
      warmup(
        'eratosthenes-uncertainty-combine',
        t(
          '독립인 작은 상대 표준불확도 두 개가 각각 \\(u\\)다. 곱이나 비의 상대 표준불확도는?',
          'Two independent small fractional standard uncertainties each equal \\(u\\). What is the fractional uncertainty of their product or ratio?',
        ),
        [
          t('\\(u\\)', '\\(u\\)'),
          t('\\(\\sqrt{2}\\,u\\)', '\\(\\sqrt{2}\\,u\\)'),
          t('\\(2\\times u\\)', '\\(2\\times u\\)'),
        ],
        1,
        t(
          '분산을 합쳐 \\(u^2+u^2\\)를 만든 뒤 제곱근을 취한다. 표준편차를 그대로 더하는 것은 다른 가정이다.',
          'Add fractional variances \\(u^2+u^2\\), then take the square root. Adding standard deviations directly uses a different assumption.',
        ),
      ),
    ],
  },
  'eratosthenes-baseline': {
    diagramKey: 'eratosthenes-earth',
    scene: t(
      '두 도시를 이은 길이 비스듬하다. 그림자가 알려 준 남북 간격과 지도에서 잰 전체 길이를 맞춰 보자.',
      'The route between two cities is diagonal. Match the north–south separation measured by shadows to the length on the map.',
    ),
    concepts: [
      concept(
        '남북 투영',
        'North–south projection',
        '비스듬한 길이를 남북 축 위에 내린 성분이다. 작은 구역의 평면 근사에서 전체 길이에 \\(\\cos\\phi\\)를 곱한다.',
        'The component of a diagonal baseline along the north–south axis. In a local plane approximation it is the full length times \\(\\cos\\phi\\).',
      ),
      concept(
        '코사인',
        'Cosine',
        '직각삼각형에서 \\(\\cos\\phi\\)는 각에 붙은 변/빗변이다. \\(\\phi\\)가 \\(0^\\circ\\)면 1, \\(90^\\circ\\)면 0이므로 방향 성분을 구할 때 쓴다.',
        'In a right triangle, \\(\\cos\\phi\\) is adjacent side/hypotenuse. It is 1 at zero degrees and 0 at \\(90^\\circ\\), making it useful for projections.',
      ),
      concept(
        '편향',
        'Bias',
        '잘못된 가정이나 보정 때문에 결과가 한쪽으로 치우치는 현상이다. 같은 방법으로 여러 번 재도 자동으로 사라지지 않는다.',
        'A systematic shift caused by an incorrect assumption or correction. Repeating the same procedure need not remove it.',
      ),
    ],
    relations: [
      relation(
        String.raw`\(s_N=s\cos\phi\)`,
        '\\(\\phi\\)는 길과 남북 축 사이 각도다. 중심각 \\(\\theta\\)와 짝지을 길이는 전체 \\(s\\)가 아니라 남북 성분 \\(s_N\\)이다.',
        '\\(\\phi\\) is the angle to north–south. Pair the central angle \\(\\theta\\) with the north–south component \\(s_N\\), not automatically with full length \\(s\\).',
      ),
    ],
    steps: [
      t(
        '각도가 실제로 측정한 방향 성분부터 확인한다.',
        'Identify which directional component the angle measures.',
      ),
      t(
        '올바른 길이와 잘못 넣은 길이의 비로 둘레 편향을 판단한다.',
        'Compare correct and substituted lengths to determine the circumference bias.',
      ),
    ],
    warmups: [
      warmup(
        'eratosthenes-baseline-direction',
        t(
          '국소 평면에서 동서로만 떨어진 두 점의 남북 간격은?',
          'In a local plane, two points differ only east to west. What is their north–south separation?',
        ),
        [
          t('0', 'Zero'),
          t('전체 거리와 같다', 'Their full distance'),
          t('전체 거리의 두 배', 'Twice their full distance'),
        ],
        0,
        t(
          '거리에는 방향 성분이 있다. 동서 이동만으로는 남북 성분이 생기지 않으므로 관측량과 방향을 맞춰야 한다.',
          'Distance has directional components. Pure east–west displacement has no north–south component; match the measured quantity to the correct direction.',
        ),
      ),
      warmup(
        'eratosthenes-baseline-projection',
        t(
          '빗변 길이가 \\(s\\)인 직각삼각형에서 각 \\(\\phi\\)에 붙은 변은?',
          'For a right triangle with hypotenuse \\(s\\), what is the side adjacent to angle \\(\\phi\\)?',
        ),
        [
          t('\\(\\frac{s}{\\cos\\phi}\\)', '\\(\\frac{s}{\\cos\\phi}\\)'),
          t('\\(s+\\cos\\phi\\)', '\\(s+\\cos\\phi\\)'),
          t('\\(s\\cos\\phi\\)', '\\(s\\cos\\phi\\)'),
        ],
        2,
        t(
          '\\(\\cos\\phi\\)=붙은 변/\\(s\\)이므로 붙은 변=\\(s\\cos\\phi\\)다. 투영 길이는 원래 길이를 넘지 않는다.',
          '\\(\\cos\\phi\\)=adjacent/\\(s\\), so adjacent=\\(s\\cos\\phi\\). A projected length cannot exceed the original length.',
        ),
      ),
    ],
  },
};
