/** 역사적 발견에서 출발한 독자 제작 문제. 계산 수치는 별도 표시한 교육용 모형이다. */
export type LocalizedText = { ko: string; en: string };

type HistoryQuestionCommon = {
  id: string;
  prompt: LocalizedText;
  context: LocalizedText;
  hints: LocalizedText[];
  explanation: LocalizedText;
  workedSteps: LocalizedText[];
};

export type HistoryQuestion = HistoryQuestionCommon &
  (
    | { type: 'choice'; options: { id: string; label: LocalizedText }[]; answerId: string }
    | {
        type: 'numeric';
        answer: number;
        tolerance: number;
        unit: string;
        inputHelp: LocalizedText;
      }
  );

export type HistoryQuest = {
  id: string;
  title: LocalizedText;
  scientist: LocalizedText;
  era: string;
  story: LocalizedText;
  concepts: LocalizedText[];
  difficulty: 'advanced' | 'expert';
  minutes: number;
  sources: { title: string; url: string }[];
  questions: HistoryQuestion[];
};

export const HISTORY_QUESTS_VERSION = 1;
const text = (ko: string, en: string): LocalizedText => ({ ko, en });
const numberHelp = text(
  '단위 없이 숫자로 입력하세요. 계산기 사용을 권장해요.',
  'Enter a number without the unit. A calculator is recommended.',
);

export const HISTORY_QUESTS: HistoryQuest[] = [
  {
    id: 'eratosthenes-earth',
    title: text('그림자에서 지구의 크기까지', 'From shadows to the size of Earth'),
    scientist: text('에라토스테네스', 'Eratosthenes'),
    era: 'c. 240 BCE',
    story: text(
      '두 도시의 그림자는 지구 전체를 재는 자가 되었다. 에라토스테네스의 원저는 남아 있지 않으며 측정법은 후대 기록으로 전해진다. 고대 길이 단위 스타디온의 환산에도 불확실성이 있다. 여기서는 구형 지구와 평행한 태양광이라는 모형을 먼저 세운 뒤, 오차와 가정을 직접 따져 본다.',
      'Shadows in two cities became a ruler for an entire planet. Eratosthenes’s original account is lost; later writers preserve the method, and the conversion of the ancient stadion remains uncertain. Begin with a spherical Earth and parallel sunlight, then examine what errors and assumptions do to the result.',
    ),
    concepts: [
      text('구면 기하', 'Spherical geometry'),
      text('오차 전파', 'Uncertainty propagation'),
      text('모형의 가정', 'Model assumptions'),
    ],
    difficulty: 'advanced',
    minutes: 25,
    sources: [
      {
        title: 'American Physical Society — Eratosthenes Measures Earth',
        url: 'https://www.aps.org/apsnews/2006/06/eratosthenes-measures-earth',
      },
    ],
    questions: [
      {
        id: 'eratosthenes-circumference',
        type: 'numeric',
        prompt: text(
          '같은 자오선 위 두 지점의 거리가 800.0 km이고 태양의 천정각 차가 7.200°다. 이 모형에서 지구 둘레는 몇 km인가?',
          'Two sites on one meridian are 800.0 km apart and their solar zenith angles differ by 7.200°. What circumference, in km, does this model imply?',
        ),
        context: text(
          '교육용 재구성이다. 두 지점에서 각자의 태양 남중 때 측정하며, 구형 지구·평행광을 가정한다. 800 km를 고대 원자료의 정확한 환산값으로 보지 않는다.',
          'This is an educational reconstruction. Measure each site at local solar noon and assume a sphere and parallel rays. The 800 km baseline is not an exact conversion of an ancient measurement.',
        ),
        hints: [
          text(
            '두 지점의 중심각은 천정각의 차와 같다.',
            'The central angle equals the difference in zenith angles.',
          ),
          text(
            '호의 길이/둘레 = 중심각/360°를 쓴다.',
            'Use arc length/circumference = central angle/360°.',
          ),
          text('C = 800.0 × 360 / 7.200을 계산한다.', 'Evaluate C = 800.0 × 360 / 7.200.'),
        ],
        answer: 40000,
        tolerance: 5,
        unit: 'km',
        inputHelp: numberHelp,
        workedSteps: [
          text('7.200°는 한 바퀴의 1/50이다.', '7.200° is 1/50 of a full turn.'),
          text('따라서 C = 50 × 800.0 = 40,000 km다.', 'Therefore C = 50 × 800.0 = 40,000 km.'),
          text(
            '이 값의 정밀도는 입력 거리·각도와 구형 가정의 정밀도를 넘을 수 없다.',
            'Its precision cannot exceed that of the baseline, angles, and spherical approximation.',
          ),
        ],
        explanation: text(
          '둘레와 반지름을 혼동하지 않는다. 반지름을 원한다면 이 결과를 2π로 나눠야 한다. 지구가 구형이라는 가정을 쓴 계산이지, 이 두 숫자만으로 모든 가능한 지구 모형을 배제한 증명은 아니다.',
          'Do not confuse circumference with radius: divide this result by 2π for the radius. The calculation assumes a spherical Earth; these two numbers alone do not rule out every alternative geometric model.',
        ),
      },
      {
        id: 'eratosthenes-uncertainty',
        type: 'numeric',
        prompt: text(
          's = 800 ± 8 km, θ = 7.20 ± 0.12°가 서로 독립인 1σ 측정값이다. 1차 오차 전파로 구한 C = 360s/θ의 상대 표준불확도는 몇 %인가?',
          'Independent 1σ measurements give s = 800 ± 8 km and θ = 7.20 ± 0.12°. Using first-order propagation, what is the relative standard uncertainty of C = 360s/θ, in percent?',
        ),
        context: text(
          '교육용 통계 모형. 작은 독립 무작위 오차만 고려하며, 도시의 경도 차나 구형 근사 같은 계통오차는 제외한다.',
          'Educational statistical model: include only small independent random errors, excluding systematic effects such as longitude differences or the spherical approximation.',
        ),
        hints: [
          text(
            '곱과 나눗셈의 독립 오차는 상대오차의 제곱을 합친다.',
            'For products and ratios, independent fractional variances add.',
          ),
          text('(σC/C)² = (σs/s)² + (σθ/θ)²다.', '(σC/C)² = (σs/s)² + (σθ/θ)².'),
          text(
            '100 × √[(8/800)² + (0.12/7.20)²]를 계산한다.',
            'Evaluate 100 × √[(8/800)² + (0.12/7.20)²].',
          ),
        ],
        answer: 1.9436506316,
        tolerance: 0.005,
        unit: '%',
        inputHelp: numberHelp,
        workedSteps: [
          text(
            '거리의 상대오차는 0.010, 각도의 상대오차는 0.016667이다.',
            'The fractional errors are 0.010 for distance and 0.016667 for angle.',
          ),
          text(
            '분산 합의 제곱근은 0.0194365이므로 약 1.944%다.',
            'The square root of the variance sum is 0.0194365, or about 1.944%.',
          ),
          text(
            '둘레 40,000 km의 표준불확도는 약 777 km다.',
            'For a 40,000 km circumference, the standard uncertainty is about 777 km.',
          ),
        ],
        explanation: text(
          '독립 표준불확도는 단순 덧셈으로 2.667%를 만드는 방식과 다르다. 또 같은 방향의 계통오차가 있으면 독립 오차 공식만으로 전체 정확도를 평가할 수 없다.',
          'Adding the percentages to obtain 2.667% is not the rule for independent standard uncertainties. Shared systematic errors also cannot be captured by this independent-error formula alone.',
        ),
      },
      {
        id: 'eratosthenes-baseline',
        type: 'choice',
        prompt: text(
          '작은 구역의 평면 근사에서 두 도시를 잇는 길 s가 남북 방향과 30°를 이룬다. 천정각 차는 남북 성분에 해당하는데, 계산에 전체 s를 넣었다. 둘레에는 어떤 편향이 생기는가?',
          'In a local flat approximation, a baseline s makes 30° with north–south. The zenith-angle difference measures only the north–south component, but the calculation uses the full s. What bias results?',
        ),
        context: text(
          '실제 알렉산드리아–시에네의 좌표를 재현한 문제가 아니다. 수평 성분과 관측량을 일치시켜야 한다는 교육용 반례다.',
          'This does not reconstruct the actual coordinates of Alexandria and Syene. It is a model counterexample about matching a baseline component to the measured quantity.',
        ),
        options: [
          { id: 'over', label: text('약 15.5% 크게 나온다.', 'It is about 15.5% too large.') },
          { id: 'under', label: text('약 13.4% 작게 나온다.', 'It is about 13.4% too small.') },
          {
            id: 'none',
            label: text(
              '거리는 거리이므로 편향이 없다.',
              'There is no bias because distance is distance.',
            ),
          },
          {
            id: 'half',
            label: text(
              '30°/360°이므로 약 8.3% 크게 나온다.',
              'It is about 8.3% too large, from 30°/360°.',
            ),
          },
        ],
        answerId: 'over',
        hints: [
          text(
            '남북 성분은 전체 길이보다 짧다.',
            'The north–south component is shorter than the full baseline.',
          ),
          text(
            '올바른 성분은 s cos30°. 잘못된 값/올바른 값 = 1/cos30°다.',
            'The correct component is s cos30°. Wrong/correct = 1/cos30°.',
          ),
          text('(1/0.866025 − 1) × 100 ≈ 15.47%다.', '(1/0.866025 − 1) × 100 ≈ 15.47%.'),
        ],
        workedSteps: [
          text(
            '올바른 둘레는 C = 360s cos30°/θ다.',
            'The correct circumference is C = 360s cos30°/θ.',
          ),
          text(
            '계산에 전체 s를 쓰면 비율이 1/cos30° ≈ 1.1547이 된다.',
            'Using the full s gives a ratio of 1/cos30° ≈ 1.1547.',
          ),
          text(
            '무작위 오차를 줄여도 이 기하학적 편향은 남는다.',
            'Reducing random noise does not remove this geometric bias.',
          ),
        ],
        explanation: text(
          '더 많은 소수 자릿수가 잘못된 가정을 고쳐 주지는 않는다. 여기서 cos 투영은 작은 구역의 근사이며, 실제 장거리 지구 측량은 구면 기하와 두 도시의 좌표를 써야 한다.',
          'More decimal places do not repair a wrong assumption. The cosine projection is a local approximation; an actual long terrestrial baseline requires spherical geometry and both sites’ coordinates.',
        ),
      },
    ],
  },
];

HISTORY_QUESTS.push({
  id: 'kepler-orbits',
  title: text('원 대신 타원을 믿는 용기', 'Trusting ellipses instead of circles'),
  scientist: text('요하네스 케플러 · 튀코 브라헤', 'Johannes Kepler · Tycho Brahe'),
  era: '1609–1619',
  story: text(
    '케플러는 브라헤가 남긴 정밀한 행성 관측을 설명하며 원운동의 틀을 바꿨다. 1609년의 타원·면적 법칙과 1619년의 주기 법칙은 서로 다른 질문에 답한다. 여기서는 그 법칙을 뉴턴의 두 물체 모형으로 확장하여, 눈에 보이지 않는 질량과 궤도 위에서 흐르는 시간을 계산한다.',
    'Kepler used Brahe’s precise planetary observations to move beyond circular motion. The ellipse and area laws of 1609 and period law of 1619 answer different questions. Extend them here with Newton’s two-body model to infer unseen mass and the time spent along an orbit.',
  ),
  concepts: [
    text('두 물체 문제', 'Two-body motion'),
    text('면적 속도', 'Areal velocity'),
    text('케플러 방정식', 'Kepler’s equation'),
  ],
  difficulty: 'expert',
  minutes: 35,
  sources: [
    {
      title: 'NASA — Orbits and Kepler’s Laws',
      url: 'https://science.nasa.gov/solar-system/orbits-and-keplers-laws/',
    },
    {
      title: 'NASA — Space Mathematics, Chapter 9',
      url: 'https://science.nasa.gov/wp-content/uploads/2023/10/Space_Mathematics.pdf',
    },
  ],
  questions: [
    {
      id: 'kepler-binary-mass',
      type: 'numeric',
      prompt: text(
        '쌍성의 두 별 사이 상대 궤도 장반경은 4.00 AU, 주기는 2.00년이다. 총질량은 태양질량의 몇 배인가?',
        'A binary’s relative orbit has semimajor axis 4.00 AU and period 2.00 years. What is its total mass in solar masses?',
      ),
      context: text(
        '가상의 고립된 뉴턴 두 물체계다. AU·년·태양질량 단위에서 M₁+M₂ = a³/P²를 사용한다. a는 한 별의 질량중심 궤도가 아니라 두 별 사이 거리의 궤도다.',
        'Use an ideal isolated Newtonian binary and M₁+M₂ = a³/P² in AU, years, and solar masses. Here a describes their separation, not one star’s orbit about the barycenter.',
      ),
      hints: [
        text(
          '케플러의 태양계 식에는 중심 질량이 숨어 있다.',
          'The familiar Solar System law hides a mass scale.',
        ),
        text(
          '쌍성에서는 중심 질량 대신 두 질량의 합이 들어간다.',
          'For a binary, the relevant mass is the sum of both masses.',
        ),
        text('4.00³/2.00²를 계산한다.', 'Evaluate 4.00³/2.00².'),
      ],
      answer: 16,
      tolerance: 0.02,
      unit: 'M☉',
      inputHelp: numberHelp,
      workedSteps: [
        text('상대 궤도의 a³ = 64 AU³다.', 'The relative orbit gives a³ = 64 AU³.'),
        text('P² = 4년²이므로 총질량은 16 M☉다.', 'P² = 4 yr², so the total mass is 16 M☉.'),
        text(
          '질량비 정보가 없으므로 각 별의 질량은 아직 정할 수 없다.',
          'Without a mass ratio, neither individual stellar mass is determined.',
        ),
      ],
      explanation: text(
        '한 별의 질량중심 궤도 반경을 4 AU로 잘못 넣으면 다른 문제가 된다. 관측에서 투영된 궤도를 실제 궤도로 복원하는 과정도 이 문제에서는 이미 끝났다고 가정한다.',
        'Using one star’s barycentric semimajor axis would describe a different problem. We also assume that projection effects have already been removed from the measured orbit.',
      ),
    },
    {
      id: 'kepler-apsis-speed',
      type: 'numeric',
      prompt: text(
        '이심률 e = 0.600인 타원 궤도에서 근일점 속력/원일점 속력의 비는 얼마인가?',
        'For an ellipse with eccentricity e = 0.600, what is the ratio of periapsis speed to apoapsis speed?',
      ),
      context: text(
        '가상의 케플러 궤도다. 두 끝점에서 속도는 반지름 방향과 수직이다. 에너지 손실과 다른 천체의 섭동은 없다.',
        'Use an ideal Kepler orbit without dissipation or external perturbations. At both apsides the velocity is perpendicular to the radius.',
      ),
      hints: [
        text('같은 시간 동안 쓸고 가는 면적이 같아야 한다.', 'Equal times sweep equal areas.'),
        text(
          '끝점에서는 rₚvₚ = rₐvₐ, rₚ = a(1−e), rₐ = a(1+e)다.',
          'At the apsides, rₚvₚ = rₐvₐ, with rₚ = a(1−e) and rₐ = a(1+e).',
        ),
        text('vₚ/vₐ = (1+0.600)/(1−0.600)이다.', 'vₚ/vₐ = (1+0.600)/(1−0.600).'),
      ],
      answer: 4,
      tolerance: 0.005,
      unit: 'ratio',
      inputHelp: numberHelp,
      workedSteps: [
        text(
          '각운동량 보존으로 속력비는 거리비의 역수다.',
          'Conservation of angular momentum makes the speed ratio the inverse radius ratio.',
        ),
        text('1.6/0.4 = 4다.', '1.6/0.4 = 4.'),
        text(
          '중력 가속도비 16과 속력비 4를 구별한다.',
          'Distinguish the acceleration ratio, 16, from the speed ratio, 4.',
        ),
      ],
      explanation: text(
        '서로 다른 반지름의 원궤도 속력 √(GM/r)를 한 타원의 두 끝점에 그대로 적용하면 안 된다. 두 지점은 같은 궤도 에너지를 공유한다.',
        'Do not apply the circular-orbit speed √(GM/r) independently at the ends of one ellipse. Both points share the same orbital energy.',
      ),
    },
    {
      id: 'kepler-flight-time',
      type: 'numeric',
      prompt: text(
        'P = 400일, e = 0.600인 궤도에서 근일점 출발 후 이심근점이각 E = π/2에 처음 도달한다. 경과 시간은 며칠인가?',
        'An orbit has P = 400 days and e = 0.600. How many days after periapsis does it first reach eccentric anomaly E = π/2?',
      ),
      context: text(
        '교육용 궤도다. 평균근점이각 M = E − e sinE = 2πt/P이며 각도는 라디안이다. E는 태양에서 본 진근점이각과 다른 보조 각도다.',
        'Use the educational orbit with mean anomaly M = E − e sinE = 2πt/P, in radians. E is an auxiliary angle, not the true anomaly seen from the central body.',
      ),
      hints: [
        text(
          '타원에서 E가 90°라고 해서 주기의 1/4이 지난 것은 아니다.',
          'E = 90° does not imply that one quarter of the period has passed.',
        ),
        text('먼저 M을 구하고 t = PM/(2π)에 넣는다.', 'First obtain M, then use t = PM/(2π).'),
        text('t = 400(π/2 − 0.600)/(2π)다.', 't = 400(π/2 − 0.600)/(2π).'),
      ],
      answer: 61.8028136579,
      tolerance: 0.03,
      unit: 'day',
      inputHelp: numberHelp,
      workedSteps: [
        text('sin(π/2) = 1이므로 M = 0.9707963 rad다.', 'Since sin(π/2) = 1, M = 0.9707963 rad.'),
        text('시간 비율은 M/(2π) ≈ 0.154507이다.', 'The elapsed fraction is M/(2π) ≈ 0.154507.'),
        text('400일의 약 15.45%인 61.803일이 지난다.', 'About 15.45% of 400 days is 61.803 days.'),
      ],
      explanation: text(
        '일정하게 증가하는 것은 M이다. E나 진근점이각이 아니다. 100일이라는 답은 이심률을 무시한 원궤도 직관에서 나온다.',
        'M increases uniformly; E and true anomaly do not. The answer 100 days comes from treating an eccentric orbit as a circle.',
      ),
    },
  ],
});

HISTORY_QUESTS.push({
  id: 'romer-light',
  title: text('이오의 시계가 늦어진 까닭', 'Why Io’s clock appeared to run late'),
  scientist: text('올레 뢰머 · 파리 천문대', 'Ole Rømer · Paris Observatory'),
  era: '1676',
  story: text(
    '파리 천문대의 목성 위성 관측에서 카시니와 뢰머는 예측 시각과 관측 시각의 차이를 살폈다. 뢰머는 빛이 도착하는 데 시간이 걸린다는 해석을 발전시켰다. 이를 현대 단위의 정확한 광속 측정과 혼동하지 말자. 경로 길이와 사건의 시계를 구별하는 것이 이번 탐구의 핵심이다.',
    'Cassini and Rømer studied discrepancies between predicted and observed times of Jupiter’s satellite events at Paris Observatory. Rømer developed the finite-light-time interpretation. This was not a precise modern-unit measurement of c. The challenge is to separate the event’s clock from its changing light path.',
  ),
  concepts: [
    text('빛의 이동 시간', 'Light-travel time'),
    text('관측 주기 편향', 'Apparent-period bias'),
    text('모형 판별', 'Model discrimination'),
  ],
  difficulty: 'advanced',
  minutes: 25,
  sources: [
    {
      title: 'Observatoire de Paris — Rømer démontre que la lumière a une vitesse finie',
      url: 'https://observatoiredeparis.psl.eu/il-y-a-340-ans-romer-demontre.html',
    },
    {
      title: 'Philosophical Transactions (1677) — A demonstration concerning the motion of light',
      url: 'https://doi.org/10.1098/rstl.1677.0024',
    },
  ],
  questions: [
    {
      id: 'romer-path-speed',
      type: 'numeric',
      prompt: text(
        '같은 종류의 이오 식 사건을 보정해 비교했더니 빛의 경로가 1.80 AU 길어질 때 잔차가 1200초 증가했다. 이 자료가 주는 광속은 몇 km/s인가?',
        'After correcting comparable Io eclipse events, a 1.80 AU increase in light path produces a 1200 s increase in timing residual. What speed of light, in km/s, follows?',
      ),
      context: text(
        '교육용 가상 관측이며 뢰머의 원자료가 아니다. 1 AU = 1.496×10⁸ km로 두고, 잔차 변화가 전부 경로 변화 때문이라고 가정한다.',
        'These are invented teaching data, not Rømer’s original measurements. Use 1 AU = 1.496×10⁸ km and attribute the residual change entirely to the path change.',
      ),
      hints: [
        text(
          '출발 사건의 차이가 아니라 빛의 추가 이동 거리를 쓴다.',
          'Use the additional light path, not a change in the underlying event.',
        ),
        text('Δt = ΔD/c를 c에 대해 푼다.', 'Solve Δt = ΔD/c for c.'),
        text('c = 1.80 × 1.496×10⁸ / 1200이다.', 'c = 1.80 × 1.496×10⁸ / 1200.'),
      ],
      answer: 224400,
      tolerance: 100,
      unit: 'km/s',
      inputHelp: numberHelp,
      workedSteps: [
        text('추가 경로는 2.6928×10⁸ km다.', 'The extra path is 2.6928×10⁸ km.'),
        text('이를 1200초로 나누면 224,400 km/s다.', 'Dividing by 1200 s gives 224,400 km/s.'),
        text(
          '현대 광속과 차이가 있어도 주어진 자료로부터의 추론과 자료의 정확성은 별개다.',
          'The inference from these data is separate from how accurately the data recover modern c.',
        ),
      ],
      explanation: text(
        '목성까지의 전체 거리를 1200초로 나누는 것이 아니다. 이미 공통인 이동 시간은 잔차의 차이를 낼 때 사라진다.',
        'Do not divide the total distance to Jupiter by 1200 s. The common travel time cancels when residual differences are taken.',
      ),
    },
    {
      id: 'romer-period-bias',
      type: 'numeric',
      prompt: text(
        '빛의 경로가 거의 선형으로 늘어나는 동안 이오의 40주기 사이에 잔차가 총 60초 증가했다. 관측한 평균 주기는 고유 주기보다 몇 초 긴가?',
        'During nearly linear path growth, the timing residual increases by 60 s across 40 Io orbital intervals. By how many seconds does the mean observed period exceed the intrinsic period?',
      ),
      context: text(
        '교육용 가상 시계다. 처음과 마지막 사이의 간격 수가 정확히 40이며, 궤도 자체의 주기는 일정하다.',
        'This is an invented clock model with exactly 40 intervals between the first and last event; the intrinsic orbital period is constant.',
      ),
      hints: [
        text(
          '전체 지연을 한 주기에 모두 배정하지 않는다.',
          'Do not assign the whole accumulated delay to a single orbit.',
        ),
        text('P관측 − P고유 = Δ잔차/N이다.', 'Pobserved − Pintrinsic = Δresidual/N.'),
        text('60초/40을 계산한다.', 'Compute 60 s/40.'),
      ],
      answer: 1.5,
      tolerance: 0.005,
      unit: 's',
      inputHelp: numberHelp,
      workedSteps: [
        text(
          '관측한 총 시간은 고유한 40P보다 60초 길다.',
          'The observed total interval exceeds 40P by 60 s.',
        ),
        text('(40P+60)/40 = P+1.5초다.', '(40P+60)/40 = P+1.5 s.'),
        text(
          '지구가 접근하여 경로가 줄어들면 편향의 부호가 바뀐다.',
          'The sign reverses when the observer approaches and the path shrinks.',
        ),
      ],
      explanation: text(
        '41개의 사건을 세었더라도 그 사이 간격은 40개다. 사건 수와 간격 수를 혼동하면 누적 시각 분석이 틀어진다.',
        'Even if there are 41 events, there are only 40 intervals. Confusing the two corrupts an accumulated-timing analysis.',
      ),
    },
    {
      id: 'romer-model-test',
      type: 'choice',
      prompt: text(
        '한 계절의 늦어짐만 보면 주기 추정 오류도 가능하다. 유한한 광속 해석을 더 강하게 시험하는 관측은 무엇인가?',
        'A delay over one season could also be a period-estimation error. Which observation tests finite light-travel time more strongly?',
      ),
      context: text(
        '이상적인 두 가설을 비교한다: 일정한 고유 주기의 오차, 또는 지구–목성 경로에 비례하는 도달 지연. 실제 분석에서는 이오의 섭동도 보정한다.',
        'Compare two ideal hypotheses: a constant intrinsic-period error or a delay proportional to the Earth–Jupiter light path. Real analyses must also account for Io’s perturbations.',
      ),
      options: [
        {
          id: 'reverse',
          label: text(
            '접근·후퇴 시기를 모두 관측해 잔차가 계산한 경로 길이를 따라 되돌아가는지 본다.',
            'Observe approach and recession and test whether residuals reverse with the calculated light path.',
          ),
        },
        {
          id: 'one',
          label: text(
            '한 번의 식을 더 정밀하게 재면 모든 가설이 구별된다.',
            'One more precise eclipse automatically distinguishes all models.',
          ),
        },
        {
          id: 'brightness',
          label: text(
            '이오의 평균 밝기만 재면 이동 시간을 알 수 있다.',
            'Mean brightness alone determines the travel time.',
          ),
        },
        {
          id: 'constant',
          label: text(
            '항상 같은 상수만 잔차에 더한다.',
            'Add the same constant to every residual.',
          ),
        },
      ],
      answerId: 'reverse',
      hints: [
        text(
          '주기 오차와 경로 변화는 시간에 따라 다른 모양을 만든다.',
          'A period error and a changing path produce different time patterns.',
        ),
        text(
          '일정 주기 오차의 누적은 선형, 경로에 의한 지연은 ΔD(t)/c다.',
          'A constant period error accumulates linearly; a path delay follows ΔD(t)/c.',
        ),
        text(
          '접근과 후퇴를 함께 보아 기울기의 반전과 기하학적 상관을 시험한다.',
          'Test the reversal of slope and its geometric correlation across approach and recession.',
        ),
      ],
      workedSteps: [
        text(
          '한 구간의 기울기만으로 두 원인을 분리하기 어렵다.',
          'One segment’s slope may not separate the causes.',
        ),
        text(
          '지구의 위치가 바뀌는 긴 시간축에서 잔차 모양을 예측한다.',
          'Predict the residual pattern over a baseline long enough for Earth’s geometry to change.',
        ),
        text(
          '예측한 반전이 반복되는지가 독립적인 판별 정보다.',
          'A repeatable predicted reversal provides discriminating information.',
        ),
      ],
      explanation: text(
        '발견은 단순히 “시계가 늦었다”에서 끝나지 않는다. 경쟁 모형이 서로 다르게 예측하는 상황을 찾아야 한다. 유한 광속과 이오의 실제 궤도 변화는 동시에 있을 수도 있다.',
        'The argument goes beyond noticing a late clock: seek conditions where competing models predict different outcomes. Finite light time and real orbital perturbations can both be present.',
      ),
    },
  ],
});

HISTORY_QUESTS.push({
  id: 'leavitt-distance',
  title: text('깜빡이는 별로 놓은 거리 사다리', 'A distance ladder built from pulsing stars'),
  scientist: text('헨리에타 스완 리비트', 'Henrietta Swan Leavitt'),
  era: '1908–1912',
  story: text(
    '리비트는 마젤란운 변광성의 주기와 밝기를 비교하여 긴 주기의 별이 더 밝다는 관계를 찾아냈다. 비슷한 거리에 모인 별들을 비교했기에 밝기 차이를 해석할 수 있었다. 그러나 상대적인 관계만으로 절대 거리가 저절로 생기지는 않는다. 영점 보정과 별빛을 가리는 먼지까지 살펴 거리 사다리를 완성해 보자.',
    'Leavitt found that longer-period variables in the Magellanic Clouds were brighter. Comparing stars at approximately a common distance made the pattern interpretable. A relative relation still needs an absolute calibration. Add the zero point and account for dimming by dust to build a usable distance ladder.',
  ),
  concepts: [
    text('주기–광도 관계', 'Period–luminosity relation'),
    text('거리 지수', 'Distance modulus'),
    text('성간 소광', 'Interstellar extinction'),
  ],
  difficulty: 'expert',
  minutes: 30,
  sources: [
    {
      title: 'Leavitt & Pickering (1912), Harvard Circular 173',
      url: 'https://articles.adsabs.harvard.edu/pdf/1912HarCi.173....1L',
    },
    {
      title: 'Harvard Plate Stacks — Variable Stars',
      url: 'https://platestacks.cfa.harvard.edu/henrietta-swan-leavitt/variable-stars',
    },
  ],
  questions: [
    {
      id: 'leavitt-modulus',
      type: 'numeric',
      prompt: text(
        '세페이드의 P = 10.0일, 평균 mV = 15.20, AV = 0.30등급이다. 주어진 보정식 MV = −2.76 log₁₀(P/일) − 1.40으로 거리를 kpc 단위로 구하라.',
        'A Cepheid has P = 10.0 days, mean mV = 15.20, and AV = 0.30 mag. Using the supplied calibration MV = −2.76 log₁₀(P/day) − 1.40, find its distance in kpc.',
      ),
      context: text(
        '교육용 단일 V대역 보정식이며 리비트 원논문의 계수가 아니다. 금속함량·변광 종류에 따른 차이는 무시하고 mV−AV−MV = 5 log₁₀(d/pc)−5를 사용한다.',
        'This teaching calibration is not Leavitt’s original fit. Ignore metallicity and population differences; use mV−AV−MV = 5 log₁₀(d/pc)−5.',
      ),
      hints: [
        text(
          '먼지가 어둡게 만든 양은 관측 등급에서 뺀다.',
          'Subtract the dimming by dust from the apparent magnitude.',
        ),
        text(
          'P로 MV를 구한 다음 소광 보정 거리 지수를 만든다.',
          'Use P to obtain MV, then form the extinction-corrected distance modulus.',
        ),
        text(
          'MV = −4.16, μ = 15.20−0.30+4.16 = 19.06이다.',
          'MV = −4.16 and μ = 15.20−0.30+4.16 = 19.06.',
        ),
      ],
      answer: 64.8634433548,
      tolerance: 0.04,
      unit: 'kpc',
      inputHelp: numberHelp,
      workedSteps: [
        text('d/pc = 10^[(19.06+5)/5] = 10^4.812다.', 'd/pc = 10^[(19.06+5)/5] = 10^4.812.'),
        text('d ≈ 64,863 pc = 64.863 kpc다.', 'd ≈ 64,863 pc = 64.863 kpc.'),
        text(
          '계수나 별의 종류가 달라지면 같은 주기에도 거리가 달라진다.',
          'Different calibrations or stellar populations change the inferred distance even at the same period.',
        ),
      ],
      explanation: text(
        '소광을 더하거나 절대등급의 음수를 놓치면 지수적으로 큰 거리 오차가 난다. 세페이드는 모두 똑같은 광도의 별이 아니라 주기에 따라 보정하는 표준 촛불이다.',
        'Adding extinction or losing the sign of the negative absolute magnitude causes a large exponential error. Cepheids are standardized through their periods, not assumed to have identical luminosities.',
      ),
    },
    {
      id: 'leavitt-extinction-bias',
      type: 'numeric',
      prompt: text(
        '실제로 AV = 0.30등급인데 소광을 0으로 놓고 같은 별의 거리를 구했다. 추정 거리/올바른 거리의 비는 얼마인가?',
        'The true extinction is AV = 0.30 mag, but the distance calculation assumes zero extinction. What is estimated distance/correct distance?',
      ),
      context: text(
        '앞 문제와 같은 교육용 관계를 쓴다. 주기·절대등급 보정에는 오차가 없고 소광만 누락했다.',
        'Use the preceding teaching relation. Only extinction is omitted; the period and absolute-magnitude calibration are otherwise exact.',
      ),
      hints: [
        text(
          '소광을 무시하면 어두워진 이유를 더 먼 거리로 해석한다.',
          'Ignoring dust attributes its dimming to extra distance.',
        ),
        text(
          '거리 지수 차는 5 log₁₀(d잘못/d정답)이다.',
          'The modulus difference is 5 log₁₀(dwrong/dcorrect).',
        ),
        text('비는 10^(0.30/5)이다.', 'The ratio is 10^(0.30/5).'),
      ],
      answer: 1.1481536215,
      tolerance: 0.001,
      unit: 'ratio',
      inputHelp: numberHelp,
      workedSteps: [
        text(
          '소광 누락은 거리 지수를 0.30만큼 크게 만든다.',
          'Omitting extinction increases the modulus by 0.30 mag.',
        ),
        text(
          '10^0.06 = 1.14815이므로 약 14.8% 멀게 추정한다.',
          '10^0.06 = 1.14815, an overestimate of about 14.8%.',
        ),
        text(
          '0.30등급을 거리의 30%로 바꾸면 안 된다.',
          'A 0.30 mag difference is not a 30% distance difference.',
        ),
      ],
      explanation: text(
        '등급은 로그 척도다. 별이 더 희미해지는 원인을 거리와 먼지로 분리하려면 다중 대역 관측이나 독립적인 소광 정보가 필요하다.',
        'Magnitude is logarithmic. Separating distance from dust requires multiband observations or independent extinction information.',
      ),
    },
    {
      id: 'leavitt-zero-point',
      type: 'choice',
      prompt: text(
        '소마젤란운의 세페이드가 사실상 같은 거리에 있다고만 알고, 그 거리는 모른다. 주기와 겉보기 등급을 아무리 정확히 재도 직접 정할 수 없는 것은?',
        'Suppose the Small Magellanic Cloud Cepheids share approximately one unknown distance. What remains undetermined even with arbitrarily precise periods and apparent magnitudes?',
      ),
      context: text(
        '소광과 집단 차이를 무시한 선형 모형 m = a logP + b다. 공통 거리라는 조건이 무엇을 없애고 무엇을 남기는지 따진다.',
        'Use m = a logP + b, ignoring extinction and population differences. Ask what the common-distance assumption removes and what it leaves.',
      ),
      options: [
        {
          id: 'zero',
          label: text(
            '절대등급 관계의 영점과 절대 거리',
            'The absolute-magnitude zero point and absolute distance',
          ),
        },
        {
          id: 'slope',
          label: text('주기–겉보기 등급 관계의 기울기', 'The period–apparent-magnitude slope'),
        },
        {
          id: 'order',
          label: text('어느 별의 주기가 더 긴지', 'Which star has the longer period'),
        },
        {
          id: 'relative',
          label: text('두 별의 광도 비에 대한 정보', 'Information about their luminosity ratio'),
        },
      ],
      answerId: 'zero',
      hints: [
        text(
          '공통 거리 지수는 모든 별의 등급에 같은 값을 더한다.',
          'A shared distance modulus adds the same constant to every magnitude.',
        ),
        text(
          'm = a logP + (절대 영점 + 거리 지수)다.',
          'm = a logP + (absolute zero point + distance modulus).',
        ),
        text(
          '상수 두 개의 합만 알면 두 상수를 각각 분리할 수 없다.',
          'Knowing the sum of two constants does not determine each one.',
        ),
      ],
      workedSteps: [
        text(
          '별끼리 등급을 빼면 공통 거리 항이 사라진다.',
          'Subtracting stellar magnitudes removes the shared distance term.',
        ),
        text(
          '따라서 기울기와 상대 광도는 구할 수 있다.',
          'The slope and relative luminosities can therefore be inferred.',
        ),
        text(
          '절대 영점에는 시차 등 별도의 거리 보정이 필요하다.',
          'The absolute zero point needs an independent distance calibration, such as parallax.',
        ),
      ],
      explanation: text(
        '리비트의 관계가 거리 사다리의 토대를 놓았다는 사실과, 외부 보정 없이 우주의 모든 거리를 재었다는 주장은 다르다. 발견과 보정을 구별해야 한다.',
        'Founding the distance ladder is not the same as measuring every absolute distance without calibration. Distinguish the discovered relation from the later calibration.',
      ),
    },
  ],
});

HISTORY_QUESTS.push({
  id: 'payne-stellar-atmospheres',
  title: text('약한 선 뒤에 숨어 있던 수소', 'Hydrogen hidden behind a weak spectral line'),
  scientist: text('세실리아 페인 · 메그나드 사하', 'Cecilia Payne · Meghnad Saha'),
  era: '1925',
  story: text(
    '페인은 사하의 이온화 이론 등을 별 스펙트럼에 적용하여 온도와 원소 존재량을 연결했다. 1925년 학위논문은 수소·헬륨의 큰 존재량을 드러냈지만 그 해석에는 당시의 유보와 논쟁도 있었다. 선이 강하다는 이유만으로 그 원소가 많다고 결론 내릴 수 있을까? 들뜸과 이온화가 서로 겨루는 모형을 계산해 본다.',
    'Payne connected stellar temperature and chemical abundance using Saha’s ionization theory and related work. Her 1925 thesis revealed high hydrogen and helium abundances, while its interpretation faced contemporary reservations and debate. Does a stronger line necessarily mean more of an element? Calculate competing excitation and ionization effects.',
  ),
  concepts: [
    text('사하 이온화', 'Saha ionization'),
    text('볼츠만 들뜸', 'Boltzmann excitation'),
    text('국소 열역학 평형', 'Local thermodynamic equilibrium'),
  ],
  difficulty: 'expert',
  minutes: 45,
  sources: [
    {
      title: 'Harvard Wolbach Library — Education and Doctoral Thesis',
      url: 'https://library.cfa.harvard.edu/cecilia-payne-gaposchkin/education-and-doctoral-thesis',
    },
    {
      title: 'Payne (1925) — Stellar Atmospheres',
      url: 'https://articles.adsabs.harvard.edu/pdf/1925HarMo...1.....P',
    },
    {
      title: 'NRAO, S. Myers — Statistical Mechanics: Boltzmann and Saha',
      url: 'https://www.aoc.nrao.edu/~smyers/courses/astro12/L9.html',
    },
  ],
  questions: [
    {
      id: 'payne-saha-ratio',
      type: 'numeric',
      prompt: text(
        '전자 밀도와 분배함수가 일정할 때 수소의 이온/중성 비 R은 T^(3/2) exp(−χ/kT)에 비례한다. 6000 K에서 10000 K로 올리면 R은 몇 배가 되는가?',
        'At fixed electron density and partition functions, the hydrogen ion/neutral ratio R is proportional to T^(3/2) exp(−χ/kT). By what factor does R rise from 6000 K to 10000 K?',
      ),
      context: text(
        '페인 원자료가 아닌 LTE 교육 모형이다. χ = 13.6 eV, k = 8.617333262×10⁻⁵ eV/K. 외부 전자 공급원이 밀도를 일정하게 유지한다고 가정한다.',
        'This LTE teaching model is not Payne’s original dataset. Use χ = 13.6 eV and k = 8.617333262×10⁻⁵ eV/K. Assume an external electron reservoir keeps the density fixed.',
      ),
      hints: [
        text(
          '온도 인자와 지수 인자를 모두 비교해야 한다.',
          'Compare both the temperature factor and the exponential factor.',
        ),
        text(
          'R₂/R₁ = (T₂/T₁)^(3/2) exp[(χ/k)(1/T₁−1/T₂)]다.',
          'R₂/R₁ = (T₂/T₁)^(3/2) exp[(χ/k)(1/T₁−1/T₂)].',
        ),
        text(
          '(10000/6000)^1.5 × exp[(13.6/k)(1/6000−1/10000)]를 계산한다.',
          'Evaluate (10000/6000)^1.5 × exp[(13.6/k)(1/6000−1/10000)].',
        ),
      ],
      answer: 79831.0814424,
      tolerance: 40,
      unit: 'ratio',
      inputHelp: numberHelp,
      workedSteps: [
        text('거듭제곱 인자는 약 2.15166이다.', 'The power-law factor is about 2.15166.'),
        text(
          '양의 지수는 약 10.52143이므로 이온화가 크게 늘어난다.',
          'The positive exponent is about 10.52143, producing a large increase in ionization.',
        ),
        text('곱은 약 79,831배다.', 'The product is about 79,831.'),
      ],
      explanation: text(
        '온도가 높을수록 지수의 음수 크기가 작아진다. 전자 밀도가 함께 변하는 순수 수소 기체라면 이 식만으로 끝내지 않고 전하 보존도 동시에 풀어야 한다.',
        'Rising temperature makes the negative exponent less negative. In pure hydrogen with changing electron density, charge conservation must be solved together with the Saha relation.',
      ),
    },
    {
      id: 'payne-level-population',
      type: 'numeric',
      prompt: text(
        '서로 다른 두 LTE 층에서 T₁=6000 K, T₂=10000 K, 이온/중성 비는 각각 0.01, 10이다. n₂/n중성 ≈ 4 exp(−10.2 eV/kT)일 때, 전체 수소 중 n=2 준위 비율은 2번 층에서 몇 배인가?',
        'Two LTE layers have T₁=6000 K, T₂=10000 K and ion/neutral ratios 0.01 and 10. With n₂/nneutral ≈ 4 exp(−10.2 eV/kT), by what factor is the fraction of all hydrogen in n=2 larger in layer 2?',
      ),
      context: text(
        '독립된 교육 문제다. 두 층의 전자 밀도는 같지 않으며 앞 문제의 고정 밀도 조건을 적용하지 않는다. k = 8.617333262×10⁻⁵ eV/K, 중성 수소는 대부분 바닥 상태라고 근사한다.',
        'This is an independent teaching problem: electron densities differ, so the preceding fixed-density condition does not apply. Use k = 8.617333262×10⁻⁵ eV/K and approximate neutral hydrogen as mostly in its ground state.',
      ),
      hints: [
        text(
          '들뜸의 증가만 계산하지 말고 중성으로 남은 분율을 곱한다.',
          'Multiply the excitation increase by the fraction remaining neutral.',
        ),
        text('n₂/n전체 ≈ 4 exp(−10.2/kT)/(1+R)다.', 'n₂/ntotal ≈ 4 exp(−10.2/kT)/(1+R).'),
        text(
          'exp[(10.2/k)(1/6000−1/10000)] × 1.01/11을 계산한다.',
          'Evaluate exp[(10.2/k)(1/6000−1/10000)] × 1.01/11.',
        ),
      ],
      answer: 245.45837498,
      tolerance: 0.2,
      unit: 'ratio',
      inputHelp: numberHelp,
      workedSteps: [
        text('들뜸 인자의 비는 약 2673.31이다.', 'The excitation-factor ratio is about 2673.31.'),
        text(
          '중성 분율의 비는 1.01/11 ≈ 0.091818이다.',
          'The neutral-fraction ratio is 1.01/11 ≈ 0.091818.',
        ),
        text(
          '곱은 약 245.46이다. 전체 수소 존재량은 같아도 준위 인구는 크게 달라진다.',
          'The product is about 245.46. Level populations can change greatly without an abundance change.',
        ),
      ],
      explanation: text(
        '이 수치는 선 세기 그 자체가 아니다. 실제 선 세기에는 광학 깊이·복사 전달도 들어간다. 특히 첫 문제의 R 비와 이 문제의 R 비를 동시에 고정 밀도 조건으로 강제하면 모순이다.',
        'This is not itself a line-strength ratio: optical depth and radiative transfer also matter. Imposing the first problem’s fixed-density condition on these different prescribed R values would be inconsistent.',
      ),
    },
    {
      id: 'payne-abundance-inference',
      type: 'choice',
      prompt: text(
        '두 별의 수소 흡수선 세기가 다르다. 수소 존재량 차이라고 결론 내리기 전에 가장 적절한 분석은?',
        'Two stars show different hydrogen absorption strengths. What is the best analysis before attributing this to different hydrogen abundances?',
      ),
      context: text(
        '스펙트럼을 설명하는 물리적 역문제다. 알려지지 않은 온도·전자 밀도·광학 깊이가 여러 원소의 선에 함께 영향을 준다.',
        'This is a physical inverse problem: unknown temperature, electron density, and optical depth affect lines of multiple elements.',
      ),
      options: [
        {
          id: 'joint',
          label: text(
            '여러 이온화·들뜸 상태의 선을 함께 맞춰 온도·밀도·복사 전달과 존재량을 분리한다.',
            'Fit lines from multiple ionization and excitation states to separate temperature, density, radiative transfer, and abundance.',
          ),
        },
        {
          id: 'linear',
          label: text(
            '선 깊이가 두 배면 수소가 반드시 두 배다.',
            'Twice the line depth always means twice the hydrogen.',
          ),
        },
        {
          id: 'absent',
          label: text('선이 없으면 수소가 전혀 없다.', 'No line means no hydrogen at all.'),
        },
        {
          id: 'color',
          label: text(
            '겉보기 색 하나만 같으면 다른 물리 조건도 모두 같다.',
            'One matching apparent color guarantees all other physical conditions match.',
          ),
        },
      ],
      answerId: 'joint',
      hints: [
        text(
          '흡수하려면 원자가 해당 전이의 아래 준위에 있어야 한다.',
          'Absorption requires atoms in the transition’s lower level.',
        ),
        text(
          '그 수는 총 존재량 × 이온화 분율 × 들뜸 분율에 의존한다.',
          'That number depends on total abundance × ionization fraction × excitation fraction.',
        ),
        text(
          '추가 선을 관측하여 같은 세기를 만드는 서로 다른 모형의 가능성을 줄인다.',
          'Use additional lines to reduce degeneracies between models that produce the same strength.',
        ),
      ],
      workedSteps: [
        text(
          '온도와 밀도를 바꾸면 원소 양을 바꾸지 않아도 선이 변한다.',
          'Temperature and density can change a line without changing abundance.',
        ),
        text(
          '여러 전이는 서로 다른 물리 조건에 반응한다.',
          'Different transitions respond differently to physical conditions.',
        ),
        text(
          '일관된 대기 모형을 통해 존재량을 추론한다.',
          'Infer abundance through a consistent atmosphere model.',
        ),
      ],
      explanation: text(
        '페인의 통찰은 원소 지문 찾기를 정량적인 별 대기 물리로 바꾼 데 있다. 한 선만으로 존재량을 단정하는 퀴즈가 아니라, 모형의 여러 원인을 분리하는 문제다.',
        'Payne’s insight helped turn element identification into quantitative stellar-atmosphere physics. The task is to disentangle several causes, not assign an abundance from one line alone.',
      ),
    },
  ],
});

HISTORY_QUESTS.push({
  id: 'einstein-eclipse',
  title: text('일식 사진에 남은 시공간의 휨', 'Curved spacetime on an eclipse plate'),
  scientist: text(
    '아인슈타인 · 다이슨 · 에딩턴 · 데이비드슨',
    'Einstein · Dyson · Eddington · Davidson',
  ),
  era: '1915–1919',
  story: text(
    '일반상대성이론은 태양 가까이를 지나는 별빛의 경로가 휠 것을 예측했다. 1919년 소브랄과 프린시페의 관측은 다이슨·에딩턴·데이비드슨 등이 참여한 공동 작업이었다. 날씨와 기기의 계통오차가 중요했으며 한 장의 사진으로 모든 검증이 끝난 것은 아니다. 작은 각도와 통계적 증거의 무게를 직접 계산한다.',
    'General relativity predicted the deflection of starlight passing near the Sun. The 1919 Sobral and Príncipe observations were a collaboration involving Dyson, Eddington, Davidson, and others. Weather and instrumental systematics mattered; one photograph did not finish all testing. Calculate a tiny angle and weigh statistical evidence.',
  ),
  concepts: [
    text('약한 중력장의 빛 편향', 'Weak-field light deflection'),
    text('가중 평균', 'Weighted mean'),
    text('공통 계통오차', 'Shared systematic error'),
  ],
  difficulty: 'expert',
  minutes: 35,
  sources: [
    {
      title: 'Dyson, Eddington & Davidson (1920) — A Determination of the Deflection of Light',
      url: 'https://doi.org/10.1098/rsta.1920.0009',
    },
    {
      title: 'MIT OpenCourseWare — scan of the 1920 paper',
      url: 'https://ocw.mit.edu/courses/sts-003-the-rise-of-modern-science-fall-2010/799c06c530ca21f42b6738fd4b6bd3c5_MITSTS_003F10_assn4a_dys.pdf',
    },
  ],
  questions: [
    {
      id: 'einstein-deflection',
      type: 'numeric',
      prompt: text(
        '태양 중심에서 충돌 매개변수 b = 2R☉인 빛의 편향 α = 4GM☉/(bc²)를 초각으로 구하라.',
        'Find the light deflection α = 4GM☉/(bc²), in arcseconds, for impact parameter b = 2R☉ measured from the Sun’s center.',
      ),
      context: text(
        '현대 약한 중력장 교육 계산이다. G=6.67430×10⁻¹¹ m³ kg⁻¹ s⁻², M☉=1.98847×10³⁰ kg, R☉=6.957×10⁸ m, c=299792458 m/s, 1 rad=206264.806247초각. 태양 관측 실습 지시가 아니다.',
        'Modern weak-field teaching calculation: G=6.67430×10⁻¹¹ m³ kg⁻¹ s⁻², M☉=1.98847×10³⁰ kg, R☉=6.957×10⁸ m, c=299792458 m/s, and 1 rad=206264.806247 arcsec. This is not a solar-observing exercise.',
      ),
      hints: [
        text(
          'b는 태양 표면에서의 높이가 아니라 중심으로부터의 거리다.',
          'b is measured from the center, not from the solar surface.',
        ),
        text(
          '먼저 SI 단위로 라디안을 계산한 뒤 초각으로 바꾼다.',
          'First calculate radians in SI units, then convert to arcseconds.',
        ),
        text('4GM☉/[2R☉c²] × 206264.806247이다.', 'Evaluate 4GM☉/[2R☉c²] × 206264.806247.'),
      ],
      answer: 0.8756216407,
      tolerance: 0.001,
      unit: 'arcsec',
      inputHelp: numberHelp,
      workedSteps: [
        text('b=1.3914×10⁹ m를 사용한다.', 'Use b=1.3914×10⁹ m.'),
        text('편향은 약 4.24513×10⁻⁶ rad다.', 'The deflection is about 4.24513×10⁻⁶ rad.'),
        text('초각으로 변환하면 약 0.87562″다.', 'Converting gives about 0.87562 arcsec.'),
      ],
      explanation: text(
        '태양 가장자리 b=R☉의 약 1.75″를 그대로 답하면 거리 의존성을 놓친다. 여기서는 b가 두 배이므로 편향은 절반이다. 도와 초각도 구별해야 한다.',
        'Using the approximately 1.75 arcsec limb value at b=R☉ misses the distance dependence: twice b gives half the deflection. Also distinguish degrees from arcseconds.',
      ),
    },
    {
      id: 'einstein-weighted-fit',
      type: 'numeric',
      prompt: text(
        '같은 충돌 매개변수로 보정한 가상의 독립 측정 두 개가 1.70±0.20″, 1.90±0.30″다. ±가 가우스 1σ일 때 역분산 가중 평균은 몇 초각인가?',
        'Two invented independent measurements, reduced to the same impact parameter, give 1.70±0.20 and 1.90±0.30 arcsec. The errors are Gaussian 1σ. What is their inverse-variance weighted mean, in arcseconds?',
      ),
      context: text(
        '1919년 측정값을 옮긴 것이 아니다. 당시 문헌의 probable error를 현대 1σ와 혼동하지 않도록 새로운 가상 값을 사용한다. 공통 계통오차는 이 문제에서 0이다.',
        'These are not the 1919 measurements. Invented values avoid confusing historical probable errors with modern 1σ uncertainties. Assume no shared systematic error here.',
      ),
      hints: [
        text(
          '더 정확한 측정에 더 큰 무게를 준다.',
          'Give the more precise measurement greater weight.',
        ),
        text('wᵢ=1/σᵢ², 평균=Σwᵢxᵢ/Σwᵢ다.', 'Use wᵢ=1/σᵢ² and mean=Σwᵢxᵢ/Σwᵢ.'),
        text(
          '(1.70/0.20²+1.90/0.30²)/(1/0.20²+1/0.30²)를 계산한다.',
          'Evaluate (1.70/0.20²+1.90/0.30²)/(1/0.20²+1/0.30²).',
        ),
      ],
      answer: 1.7615384615,
      tolerance: 0.002,
      unit: 'arcsec',
      inputHelp: numberHelp,
      workedSteps: [
        text('가중치는 25와 11.1111이다.', 'The weights are 25 and 11.1111.'),
        text('가중 평균은 1.76154″다.', 'The weighted mean is 1.76154 arcsec.'),
        text(
          '독립 오차 가정에서 평균의 1σ는 1/√(25+11.1111)=0.16641″다.',
          'Under independence, the mean’s 1σ error is 1/√(25+11.1111)=0.16641 arcsec.',
        ),
      ],
      explanation: text(
        '단순 평균 1.80″와 다르다. 또한 한 점이 이론값과 가깝다는 이유만으로 그 점에 더 큰 가중치를 주면 결과를 편향시킨다.',
        'This differs from the unweighted mean of 1.80 arcsec. Giving extra weight merely because a point is closer to the theory would bias the inference.',
      ),
    },
    {
      id: 'einstein-systematics',
      type: 'choice',
      prompt: text(
        '별 100개의 변위를 같은 사진판에서 측정했다. 각 별의 독립 오차 σ=0.20″와 사진판 전체에 공통인 영점 오차 τ=0.10″가 있다. 평균 오차에 대한 올바른 판단은?',
        'Displacements of 100 stars are measured on one plate. Each has independent error σ=0.20 arcsec, plus a shared plate zero-point error τ=0.10 arcsec. Which statement about the mean’s error is correct?',
      ),
      context: text(
        '평균 오차의 분산은 σ²/N+τ²인 가상 모형이다. 영점은 평균 0의 불확실한 공통 이동이고, 별마다 새로 추출되는 독립 잡음이 아니다.',
        'Use the teaching model Var(mean)=σ²/N+τ². The uncertain zero point is a common shift with mean zero, not independent noise redrawn for each star.',
      ),
      options: [
        {
          id: 'floor',
          label: text(
            '약 0.102″이며 별 수를 늘려도 0.10″ 바닥은 남는다.',
            'About 0.102 arcsec; adding stars does not remove the 0.10 arcsec floor.',
          ),
        },
        {
          id: 'shrink',
          label: text(
            '모든 오차가 √100으로 줄어 약 0.022″다.',
            'All errors shrink by √100 to about 0.022 arcsec.',
          ),
        },
        {
          id: 'zero',
          label: text(
            '별이 충분히 많으므로 오차는 정확히 0이다.',
            'Enough stars make the error exactly zero.',
          ),
        },
        { id: 'add', label: text('100×0.20+0.10=20.10″다.', 'It is 100×0.20+0.10=20.10 arcsec.') },
      ],
      answerId: 'floor',
      hints: [
        text(
          '같은 사진판의 공통 이동은 별끼리 평균내도 사라지지 않는다.',
          'A common plate shift survives averaging over stars.',
        ),
        text(
          '독립 부분에만 N으로 나누는 분산 감소를 적용한다.',
          'Divide only the independent variance by N.',
        ),
        text('√(0.20²/100+0.10²)=√0.0104다.', '√(0.20²/100+0.10²)=√0.0104.'),
      ],
      workedSteps: [
        text(
          '독립 오차 분산은 0.0004 arcsec²다.',
          'The independent contribution is 0.0004 arcsec².',
        ),
        text(
          '공통 분산 0.0100을 더하면 0.0104다.',
          'Adding the common variance 0.0100 gives 0.0104.',
        ),
        text(
          '제곱근은 0.10198″다. 별 수보다 별도 보정 관측이 중요할 수 있다.',
          'The square root is 0.10198 arcsec. Independent calibration can matter more than star count.',
        ),
      ],
      explanation: text(
        '역사 관측의 신뢰도를 평가할 때는 표본 수뿐 아니라 기기의 초점·척도·공통 오차도 살펴야 한다. 이 교육 모형을 1919년 자료의 완전한 재분석이라고 부르지는 않는다.',
        'Evaluating historic evidence requires attention to focus, plate scale, and shared errors, not just sample size. This teaching model is not a complete reanalysis of the 1919 data.',
      ),
    },
  ],
});

HISTORY_QUESTS.push({
  id: 'chandrasekhar-limit',
  title: text('더 무거운 별이 버틸 수 없는 이유', 'Why a heavier remnant cannot always hold up'),
  scientist: text(
    '수브라마니안 찬드라세카르 · 랠프 파울러',
    'Subrahmanyan Chandrasekhar · Ralph Fowler',
  ),
  era: '1930–1935',
  story: text(
    '파울러의 전자 축퇴 모형에 상대론을 더한 찬드라세카르의 연구는 차가운 백색왜성에 질량 한계가 있음을 보여 주었다. 이는 태어날 때 별의 질량 한계가 아니라 전자 축퇴압으로 지지되는 잔해의 한계다. 압력과 중력이 반지름에 의존하는 방식을 비교하면 왜 한계가 등장하는지 보인다.',
    'Building on Fowler’s electron-degeneracy model, Chandrasekhar incorporated relativity and found a mass limit for cold white dwarfs. It limits the electron-supported remnant, not the mass of a star at birth. Compare how pressure and gravity depend on radius to see why a limit appears.',
  ),
  concepts: [
    text('전자 축퇴압', 'Electron degeneracy pressure'),
    text('질량–반지름 관계', 'Mass–radius relation'),
    text('상대론적 지지 한계', 'Relativistic support limit'),
  ],
  difficulty: 'expert',
  minutes: 40,
  sources: [
    {
      title: 'Chandrasekhar — Nobel Lecture (1983)',
      url: 'https://www.nobelprize.org/uploads/2018/06/chandrasekhar-lecture.pdf',
    },
    {
      title: 'Woosley — Massive Stars, Supernovae, and Nucleosynthesis, §1.4',
      url: 'https://people.math.harvard.edu/~knill/various/chamonix/les_houches_supernovae.pdf',
    },
  ],
  questions: [
    {
      id: 'chandra-composition',
      type: 'numeric',
      prompt: text(
        '차갑고 회전하지 않는 이상적인 백색왜성에 M한계/M☉=5.83/μₑ²를 쓴다. 전자 하나당 평균 질량이 μₑ=2.15 원자질량단위이면 한계는 몇 M☉인가?',
        'For a cold nonrotating ideal white dwarf, use Mlimit/M☉=5.83/μₑ². If the mean mass per electron is μₑ=2.15 atomic mass units, what is the limit in solar masses?',
      ),
      context: text(
        '교육용 이상 기체 모형이다. 유한 온도·일반상대론·쿨롱 보정은 제외한다. μₑ는 전자 분율 Yₑ의 역수다.',
        'Use an ideal teaching model without finite-temperature, general-relativistic, or Coulomb corrections. μₑ is the inverse of electron fraction Yₑ.',
      ),
      hints: [
        text(
          '같은 질량에 전자가 적으면 축퇴압의 지지가 줄어든다.',
          'Fewer electrons per unit mass reduce electron pressure support.',
        ),
        text('μₑ 자체가 아니라 그 제곱으로 나눈다.', 'Divide by the square of μₑ, not μₑ itself.'),
        text('5.83/(2.15×2.15)를 계산한다.', 'Evaluate 5.83/(2.15×2.15).'),
      ],
      answer: 1.2612222823,
      tolerance: 0.002,
      unit: 'M☉',
      inputHelp: numberHelp,
      workedSteps: [
        text('μₑ²=4.6225다.', 'μₑ²=4.6225.'),
        text('5.83/4.6225=1.26122 M☉다.', '5.83/4.6225=1.26122 M☉.'),
        text(
          'μₑ=2 모형의 1.4575 M☉보다 작다.',
          'This is below the 1.4575 M☉ limit of the μₑ=2 model.',
        ),
      ],
      explanation: text(
        '흔히 쓰는 약 1.4 M☉는 모든 조성과 조건에 적용되는 정확한 상수가 아니다. 또 이 식으로 붕괴 후 잔해가 반드시 블랙홀이 된다고 결정할 수는 없다.',
        'The familiar approximate 1.4 M☉ is not an exact constant for every composition and condition. This equation alone also does not determine that collapse must produce a black hole.',
      ),
    },
    {
      id: 'chandra-radius',
      type: 'numeric',
      prompt: text(
        '상대론 효과가 작은 축퇴 백색왜성 모형에서 같은 조성이면 R∝M^(−1/3)이다. 질량이 0.40 M☉에서 0.80 M☉로 바뀔 때 새 반지름/원래 반지름은?',
        'In a nonrelativistic degenerate white-dwarf model of fixed composition, R∝M^(−1/3). What is new radius/original radius when mass changes from 0.40 to 0.80 M☉?',
      ),
      context: text(
        '한 별에 실제로 질량을 옮기는 과정 대신 두 정적 모형을 비교한다. 이 근사를 질량 한계 가까이까지 외삽하지 않는다.',
        'Compare two static models rather than a real mass-transfer history. Do not extrapolate the approximation close to the mass limit.',
      ),
      hints: [
        text(
          '같은 조성이므로 비례상수는 비를 낼 때 사라진다.',
          'The same composition makes the proportionality constant cancel.',
        ),
        text('R₂/R₁=(M₂/M₁)^(−1/3)이다.', 'R₂/R₁=(M₂/M₁)^(−1/3).'),
        text(
          '2^(−1/3), 즉 2의 세제곱근의 역수다.',
          'Compute 2^(−1/3), the reciprocal cube root of 2.',
        ),
      ],
      answer: 0.793700526,
      tolerance: 0.001,
      unit: 'ratio',
      inputHelp: numberHelp,
      workedSteps: [
        text('질량비는 2다.', 'The mass ratio is 2.'),
        text('반지름비는 약 0.79370이다.', 'The radius ratio is about 0.79370.'),
        text(
          '더 무거운 모형의 반지름이 약 20.6% 작다.',
          'The heavier model is about 20.6% smaller in radius.',
        ),
      ],
      explanation: text(
        '일반적인 기체별의 직관과 달리 축퇴 잔해는 무거워질수록 작아질 수 있다. 상대론이 중요해지면 지수 −1/3의 단순 법칙 자체가 달라진다.',
        'Unlike a simple intuition about ordinary gas stars, a degenerate remnant can get smaller as it gets heavier. Relativistic effects eventually change the simple −1/3 scaling itself.',
      ),
    },
    {
      id: 'chandra-scaling',
      type: 'choice',
      prompt: text(
        '초상대론적 축퇴압은 P축퇴∝(M/R³)^(4/3), 중력 지지에 필요한 압력은 P중력∝GM²/R⁴다. 두 식을 맞출 때 질량 한계가 등장하는 핵심은?',
        'Ultrarelativistic degeneracy gives Pdeg∝(M/R³)^(4/3), while support against gravity requires Pgrav∝GM²/R⁴. What is the key reason balancing them yields a mass limit?',
      ),
      context: text(
        '차갑고 회전하지 않는 같은 조성의 별을 한 길이 척도 R로 표현한 교육용 차원 분석이다. 수치 계수는 정밀한 별 구조 해가 정한다.',
        'Use a one-radius scaling model for cold nonrotating stars of fixed composition. A detailed stellar-structure solution supplies the numerical coefficients.',
      ),
      options: [
        {
          id: 'cancel',
          label: text(
            '두 압력이 모두 R⁻⁴여서 수축만으로 비율을 바꿀 수 없고, 질량 의존성은 서로 다르다.',
            'Both scale as R⁻⁴, so contraction alone cannot change their ratio; their mass dependences differ.',
          ),
        },
        {
          id: 'heat',
          label: text(
            '온도를 조금 올리면 무한한 질량을 지탱한다.',
            'A small temperature increase supports unlimited mass.',
          ),
        },
        {
          id: 'gravity',
          label: text('질량이 커지면 중력이 약해진다.', 'Gravity weakens as mass increases.'),
        },
        {
          id: 'zero',
          label: text(
            '전자 압력이 갑자기 정확히 0이 된다.',
            'Electron pressure abruptly becomes exactly zero.',
          ),
        },
      ],
      answerId: 'cancel',
      hints: [
        text('(R³)^(4/3)을 먼저 정리한다.', 'First simplify (R³)^(4/3).'),
        text(
          'P축퇴/P중력은 고정 조성에서 M^(−2/3)에 비례하고 R은 약분된다.',
          'At fixed composition Pdeg/Pgrav∝M^(−2/3), with R cancelling.',
        ),
        text(
          'M이 증가해 지지가 모자라지면 R만 줄여서는 회복하지 못한다.',
          'If increasing M makes support insufficient, reducing R alone cannot restore it.',
        ),
      ],
      workedSteps: [
        text(
          '축퇴압은 M^(4/3)/R⁴, 중력 항은 M²/R⁴다.',
          'Degeneracy scales as M^(4/3)/R⁴, versus M²/R⁴ for gravity.',
        ),
        text(
          '평형에서 R⁴가 사라지고 허용 질량을 정하는 식이 남는다.',
          'Balancing cancels R⁴ and leaves a condition on mass.',
        ),
        text(
          '정밀한 구조 해가 조성에 따른 한계 질량을 준다.',
          'The detailed structure solution gives the composition-dependent limiting mass.',
        ),
      ],
      explanation: text(
        '한계는 “전자가 사라졌다”가 아니라 상대론적 상태방정식이 중력의 질량 증가를 따라가지 못한다는 뜻이다. 실제 폭발·붕괴 경로는 핵반응과 조성 변화도 포함한다.',
        'The limit does not mean electrons vanish. The relativistic equation of state cannot keep up with the mass dependence of gravity. Real explosion or collapse pathways also involve nuclear reactions and composition changes.',
      ),
    },
  ],
});

HISTORY_QUESTS.push({
  id: 'hubble-expansion',
  title: text('거리 사다리로 읽는 팽창', 'Reading expansion with a distance ladder'),
  scientist: text('허블 · 르메트르 · 슬라이퍼', 'Hubble · Lemaître · Slipher'),
  era: '1927–1929',
  story: text(
    '우주 팽창의 역사는 한 사람의 한 그래프로 끝나지 않는다. 슬라이퍼의 속도 자료, 리비트에서 이어진 거리 사다리, 르메트르의 1927년 이론·관측 결합, 허블의 1929년 거리–속도 분석이 연결된다. 여기서는 현대의 가상 저적색편이 자료로 기울기를 맞추고 그 역수가 뜻하는 바를 따진다.',
    'Cosmic expansion was not established by one person’s graph alone. Slipher’s velocities, the distance ladder building on Leavitt, Lemaître’s 1927 theory–observation synthesis, and Hubble’s 1929 distance–velocity analysis connect. Fit a slope to invented modern low-redshift data, then ask what its inverse means.',
  ),
  concepts: [
    text('최소제곱 기울기', 'Least-squares slope'),
    text('거리 척도 편향', 'Distance-scale bias'),
    text('허블 시간', 'Hubble time'),
  ],
  difficulty: 'expert',
  minutes: 35,
  sources: [
    {
      title: 'Hubble (1929) — A relation between distance and radial velocity',
      url: 'https://doi.org/10.1073/pnas.15.3.168',
    },
    {
      title: 'International Astronomical Union — Resolution B4, Hubble–Lemaître law',
      url: 'https://www.iau.org/static/archives/announcements/pdf/ann18048a.pdf',
    },
  ],
  questions: [
    {
      id: 'hubble-slope',
      type: 'numeric',
      prompt: text(
        '(거리 Mpc, 속도 km/s)가 (10,800), (20,1300), (40,2900)이다. 거리 오차가 없고 세 속도의 오차가 같을 때, 원점을 지나는 v=Hd의 최소제곱 H는?',
        'Data (distance in Mpc, velocity in km/s) are (10,800), (20,1300), (40,2900). Distances are exact and velocity errors equal. What is the least-squares H for v=Hd constrained through the origin?',
      ),
      context: text(
        '가상의 저적색편이 자료이며 허블의 원자료도 최신 H₀ 측정도 아니다. 태양 운동은 이미 보정했고 절편은 0으로 고정한다.',
        'These invented low-redshift data are neither Hubble’s originals nor a current H₀ measurement. Observer motion is already corrected and the intercept is fixed at zero.',
      ),
      hints: [
        text(
          '각각의 v/d를 단순 평균하는 것과는 다른 최적화다.',
          'This optimization differs from simply averaging each v/d.',
        ),
        text(
          'Σ(vᵢ−Hdᵢ)²를 H로 미분하면 H=Σdᵢvᵢ/Σdᵢ²다.',
          'Differentiating Σ(vᵢ−Hdᵢ)² gives H=Σdᵢvᵢ/Σdᵢ².',
        ),
        text('분자는 150000, 분모는 2100이다.', 'The numerator is 150000 and denominator 2100.'),
      ],
      answer: 71.4285714286,
      tolerance: 0.03,
      unit: 'km/s/Mpc',
      inputHelp: numberHelp,
      workedSteps: [
        text('Σdv=8000+26000+116000=150000이다.', 'Σdv=8000+26000+116000=150000.'),
        text('Σd²=100+400+1600=2100이다.', 'Σd²=100+400+1600=2100.'),
        text('H=71.4286 km/s/Mpc다.', 'H=71.4286 km/s/Mpc.'),
      ],
      explanation: text(
        '거리 오차·선택 효과·고유 속도가 있는 실제 우주론 분석에는 더 정교한 모형이 필요하다. 여기서 얻은 기울기는 이 세 점과 명시한 오차 모형에 대한 답이다.',
        'Real cosmological inference needs richer treatment of distance errors, selection effects, and peculiar velocities. This slope answers only the stated three-point model.',
      ),
    },
    {
      id: 'hubble-time',
      type: 'numeric',
      prompt: text(
        '별도의 모형에서 H=70.0 km/s/Mpc다. 1/H인 허블 시간을 Gyr 단위로 구하라. 1 Mpc=3.0856775814913673×10¹⁹ km, 1년=365.25일이다.',
        'In a separate model H=70.0 km/s/Mpc. Find the Hubble time 1/H in Gyr. Use 1 Mpc=3.0856775814913673×10¹⁹ km and 1 year=365.25 days.',
      ),
      context: text(
        '허블 시간을 구하는 문제이지 특정 우주론의 나이를 계산하는 문제가 아니다. 1일=86400초이며 앞 문항에서 맞춘 H와 구분한다.',
        'Calculate a Hubble time, not the age of a specified cosmology. Use 86400 seconds per day and distinguish this H from the preceding fitted value.',
      ),
      hints: [
        text('km/s/Mpc는 먼저 s⁻¹로 바꿔야 한다.', 'First convert km/s/Mpc to s⁻¹.'),
        text(
          '1/H = (1 Mpc를 km로 나타낸 값)/70.0초다.',
          '1/H is (one Mpc expressed in km)/70.0 seconds.',
        ),
        text(
          '3.0856775814913673×10¹⁹/70/86400/365.25/10⁹를 계산한다.',
          'Evaluate 3.0856775814913673×10¹⁹/70/86400/365.25/10⁹.',
        ),
      ],
      answer: 13.9684603097,
      tolerance: 0.01,
      unit: 'Gyr',
      inputHelp: numberHelp,
      workedSteps: [
        text('1/H ≈ 4.40811×10¹⁷초다.', '1/H ≈ 4.40811×10¹⁷ s.'),
        text(
          '년으로 바꾸고 10⁹으로 나누면 13.96846 Gyr다.',
          'Convert to years and divide by 10⁹ to obtain 13.96846 Gyr.',
        ),
        text(
          '실제 나이는 과거의 팽창률 H(a)을 적분해야 구한다.',
          'An actual cosmic age requires integrating the expansion history H(a).',
        ),
      ],
      explanation: text(
        '1/H는 현재 팽창률의 역수라는 시간 척도다. 팽창률이 역사 내내 일정한 속도로 이어졌다고 단정하지 않으므로 언제나 우주 나이와 같지는 않다.',
        '1/H is a timescale built from the current expansion rate. It does not encode the full expansion history and is not universally equal to the age of the Universe.',
      ),
    },
    {
      id: 'hubble-calibration',
      type: 'choice',
      prompt: text(
        '같은 은하들의 거리를 모두 2배로 보정하고 속도는 그대로 둔다. 원점 고정 최소제곱의 H와 허블 시간은 어떻게 바뀌는가?',
        'All galaxy distances are recalibrated upward by a factor of 2 while velocities stay fixed. How do the origin-constrained fitted H and Hubble time change?',
      ),
      context: text(
        '동일 표본·동일 속도 오차 모형에서 거리 영점만 바꾼다. 다른 선택 효과는 없다.',
        'Only the distance zero point changes; the sample and velocity-error model remain the same, with no additional selection effects.',
      ),
      options: [
        { id: 'half-double', label: text('H는 절반, 1/H는 2배', 'H halves and 1/H doubles') },
        { id: 'double-half', label: text('H는 2배, 1/H는 절반', 'H doubles and 1/H halves') },
        { id: 'both-double', label: text('둘 다 2배', 'Both double') },
        { id: 'same', label: text('둘 다 그대로', 'Both stay unchanged') },
      ],
      answerId: 'half-double',
      hints: [
        text(
          '같은 속도로 더 멀리 있는 은하의 v/d는 작아진다.',
          'At unchanged velocity, a larger distance lowers v/d.',
        ),
        text('Σ(2d)v/Σ(2d)² = (2/4)H다.', 'Σ(2d)v/Σ(2d)² = (2/4)H.'),
        text('H가 절반이면 그 역수는 두 배다.', 'Halving H doubles its reciprocal.'),
      ],
      workedSteps: [
        text(
          '최소제곱 분자는 2배, 분모는 4배가 된다.',
          'The least-squares numerator doubles and denominator quadruples.',
        ),
        text('새 기울기는 H/2다.', 'The new slope is H/2.'),
        text('새 허블 시간은 2/H다.', 'The new Hubble time is 2/H.'),
      ],
      explanation: text(
        '속도가 정밀해도 거리 영점이 틀리면 팽창률이 편향된다. 역사적 큰 H 값과 현대 값의 차이를 단순히 측정자의 계산 실수로 설명해서는 안 된다.',
        'Precise velocities do not protect against a biased distance zero point. Differences between historically large H values and modern ones are not explained merely by arithmetic mistakes.',
      ),
    },
  ],
});

HISTORY_QUESTS.push({
  id: 'zwicky-cluster',
  title: text('은하단에서 사라진 질량 장부', 'The missing mass ledger of a galaxy cluster'),
  scientist: text('프리츠 츠비키', 'Fritz Zwicky'),
  era: '1933',
  story: text(
    '츠비키는 머리털자리 은하단의 큰 속도 분산에 비리얼 정리를 적용하여 빛으로 예상한 것보다 많은 질량이 필요하다고 추론했다. 그의 당시 수치에는 거리 척도와 모형의 한계가 있었다. 현대적인 가상 은하단으로 추론을 다시 해 보되, 은하의 평균 후퇴 속도와 은하단 내부의 무작위 운동을 구별한다.',
    'Zwicky applied the virial theorem to the large velocity dispersion of the Coma cluster and inferred more mass than its light suggested. His historical numbers depended on the distance scale and model assumptions. Repeat the reasoning for an invented cluster, separating its mean recession from internal random motions.',
  ),
  concepts: [
    text('비리얼 정리', 'Virial theorem'),
    text('시선 속도 분산', 'Line-of-sight velocity dispersion'),
    text('잡음 분산 보정', 'Measurement-variance correction'),
  ],
  difficulty: 'expert',
  minutes: 40,
  sources: [
    {
      title: 'Zwicky (1933), English translation — The Redshift of Extragalactic Nebulae, §5',
      url: 'https://ned.ipac.caltech.edu/level5/March17/Zwicky/Zwicky5.html',
    },
    {
      title: 'Bertone & Hooper — A History of Dark Matter, Galaxy Clusters',
      url: 'https://ned.ipac.caltech.edu/level5/Sept16/Bertone/Bertone3.html',
    },
  ],
  questions: [
    {
      id: 'zwicky-virial-mass',
      type: 'numeric',
      prompt: text(
        '반지름 R=1.00 Mpc인 균일한 구형 은하단의 1차원 속도 분산은 σ=900 km/s다. U=−3GM²/(5R), T=(3/2)Mσ²와 2T+U=0으로 총질량을 10¹⁴ M☉ 단위로 구하라.',
        'A uniform spherical cluster has R=1.00 Mpc and one-dimensional velocity dispersion σ=900 km/s. Use U=−3GM²/(5R), T=(3/2)Mσ², and 2T+U=0 to find its mass in units of 10¹⁴ M☉.',
      ),
      context: text(
        '실제 머리털자리 은하단의 밀도 모형이 아닌 가상의 평형계다. 속도는 등방적, σ는 평균 속도를 뺀 시선 분산이다. G=4.30091×10⁻⁶ kpc (km/s)²/M☉, 1 Mpc=1000 kpc다.',
        'This is an invented equilibrium system, not a realistic Coma density profile. Velocities are isotropic; σ is the line-of-sight dispersion after subtracting the mean. Use G=4.30091×10⁻⁶ kpc (km/s)²/M☉ and 1 Mpc=1000 kpc.',
      ),
      hints: [
        text(
          '시선 분산이므로 세 방향의 운동 에너지를 합친다.',
          'Combine three velocity components because σ is one-dimensional.',
        ),
        text('3Mσ²=3GM²/(5R), 따라서 M=5Rσ²/G다.', '3Mσ²=3GM²/(5R), hence M=5Rσ²/G.'),
        text(
          '5×1000×900²/(4.30091×10⁻⁶)을 구하고 10¹⁴으로 나눈다.',
          'Evaluate 5×1000×900²/(4.30091×10⁻⁶), then divide by 10¹⁴.',
        ),
      ],
      answer: 9.4166118333,
      tolerance: 0.006,
      unit: '10¹⁴ M☉',
      inputHelp: text(
        '예: 질량이 2×10¹⁴ M☉라면 2를 입력해요.',
        'For example, enter 2 for a mass of 2×10¹⁴ M☉.',
      ),
      workedSteps: [
        text(
          '비리얼 평형과 균일 구의 위치 에너지를 결합한다.',
          'Combine virial equilibrium with the potential energy of a uniform sphere.',
        ),
        text('M≈9.41661×10¹⁴ M☉다.', 'M≈9.41661×10¹⁴ M☉.'),
        text(
          '요구한 10¹⁴ M☉ 단위 답은 9.41661이다.',
          'In the requested units of 10¹⁴ M☉, the answer is 9.41661.',
        ),
      ],
      explanation: text(
        '계수 5는 모든 은하단에 보편적인 상수가 아니라 균일 구·등방 속도라는 모형에서 나온다. 은하단 전체의 큰 후퇴 속도를 σ로 쓰면 내부 질량을 심하게 잘못 추정한다.',
        'The factor 5 follows from the uniform-sphere and isotropy assumptions, not a universal cluster constant. Substituting the cluster’s bulk recession for σ would badly misestimate its internal mass.',
      ),
    },
    {
      id: 'zwicky-noise-correction',
      type: 'numeric',
      prompt: text(
        '관측 분산 σ관측=900 km/s에는 독립 측정오차 σ측정=300 km/s가 포함됐다. 반지름과 모형을 유지할 때 오차 보정 질량/보정 전 질량은 얼마인가?',
        'The observed dispersion σobs=900 km/s includes independent measurement noise σerr=300 km/s. Holding radius and model fixed, what is corrected mass/uncorrected mass?',
      ),
      context: text(
        '가상의 큰 표본에서 모든 측정의 오차 분산이 같다고 가정한다. σ관측²=σ진짜²+σ측정²이며 M∝σ진짜²다.',
        'Assume a large invented sample with equal error variance for all measurements. Use σobs²=σtrue²+σerr² and M∝σtrue².',
      ),
      hints: [
        text(
          '속도 표준편차를 직접 빼지 않고 분산을 뺀다.',
          'Subtract variances, not standard deviations.',
        ),
        text('질량비=(σ관측²−σ측정²)/σ관측²다.', 'The mass ratio is (σobs²−σerr²)/σobs².'),
        text('(900²−300²)/900²=1−1/9다.', '(900²−300²)/900²=1−1/9.'),
      ],
      answer: 0.8888888889,
      tolerance: 0.001,
      unit: 'ratio',
      inputHelp: numberHelp,
      workedSteps: [
        text(
          '진짜 분산은 810000−90000=720000 (km/s)²다.',
          'The true variance is 810000−90000=720000 (km/s)².',
        ),
        text(
          '진짜 표준편차는 약 848.53 km/s다.',
          'The true standard deviation is about 848.53 km/s.',
        ),
        text(
          '질량비는 720000/810000=8/9≈0.88889다.',
          'The mass ratio is 720000/810000=8/9≈0.88889.',
        ),
      ],
      explanation: text(
        '900−300=600 km/s를 쓰면 잡음을 지나치게 빼게 된다. 이 보정은 서로 독립인 측정오차에만 해당하며 은하단 병합이나 비구성원 오염을 없애 주지는 않는다.',
        'Using 900−300=600 km/s subtracts too much noise. This correction addresses independent measurement errors, not mergers or contaminating nonmembers.',
      ),
    },
    {
      id: 'zwicky-evidence',
      type: 'choice',
      prompt: text(
        '비리얼 질량이 별빛에서 추정한 질량보다 훨씬 크다. 가장 타당한 다음 결론은?',
        'The virial mass greatly exceeds the mass inferred from starlight. What is the most justified next conclusion?',
      ),
      context: text(
        '은하단에는 별뿐 아니라 뜨거운 기체도 있다. 관측과 모형으로부터 질량 불일치를 해석하는 문제다.',
        'Clusters contain hot gas as well as stars. Interpret the mass discrepancy in light of the observations and model.',
      ),
      options: [
        {
          id: 'cross-check',
          label: text(
            '평형·구성원·기체 질량을 점검하고 렌즈 효과 등 독립 질량 추정과 대조한다.',
            'Check equilibrium, membership, and gas mass, then compare with independent mass probes such as lensing.',
          ),
        },
        {
          id: 'particle',
          label: text(
            '암흑물질 입자의 종류와 질량까지 유일하게 정해졌다.',
            'The dark-matter particle species and mass are uniquely determined.',
          ),
        },
        {
          id: 'all-stars',
          label: text(
            '차이는 모두 관측하지 못한 보통 별이라는 증명이다.',
            'The discrepancy proves all missing mass is ordinary unseen stars.',
          ),
        },
        {
          id: 'expansion',
          label: text(
            '우주 팽창 속도를 더하면 비리얼 정리가 항상 성립한다.',
            'Adding the cosmic expansion speed always ensures virial equilibrium.',
          ),
        },
      ],
      answerId: 'cross-check',
      hints: [
        text(
          '질량을 추정한 공식에는 평형이라는 가정이 있다.',
          'The mass estimator assumes equilibrium.',
        ),
        text(
          '빛의 양과 총 바리온 질량은 같지 않다.',
          'Starlight does not measure all baryonic mass.',
        ),
        text(
          '독립적인 중력 관측과 대조해야 같은 가정을 반복하는 함정을 줄인다.',
          'Independent gravitational probes reduce the risk of repeating the same assumption.',
        ),
      ],
      workedSteps: [
        text(
          '속도 분산에서 얻은 것은 특정 중력·평형 모형의 질량이다.',
          'Velocity dispersion yields a mass within a specified gravity and equilibrium model.',
        ),
        text(
          '별·기체와 관측 오염을 함께 평가한다.',
          'Evaluate stars, gas, and observational contamination together.',
        ),
        text(
          '여러 관측의 일관성이 불일치 해석을 강화한다.',
          'Agreement across several probes strengthens the interpretation of a discrepancy.',
        ),
      ],
      explanation: text(
        '츠비키의 추론은 중요한 중력적 단서이지 암흑물질 입자의 직접 검출이 아니다. 모형 점검을 요구하는 것은 단서를 무시하는 것과도 다르다.',
        'Zwicky’s inference was an important gravitational clue, not a direct particle detection. Checking assumptions is also different from dismissing the evidence.',
      ),
    },
  ],
});

HISTORY_QUESTS.push({
  id: 'rubin-rotation',
  title: text('은하 외곽에서 멈추지 않은 회전', 'Rotation that did not fade at a galaxy’s edge'),
  scientist: text('베라 루빈 · 켄트 포드 · 동료들', 'Vera Rubin · Kent Ford · collaborators'),
  era: '1970–1980',
  story: text(
    '루빈과 포드는 1970년 안드로메다의 방출 영역 분광 관측으로 회전을 연구했고, 이후 여러 은하의 관측이 질량 분포에 대한 강한 증거를 쌓았다. 전파 회전곡선을 연구한 다른 연구자들의 공헌도 함께 있었다. 이제 기울어진 은하의 시선 속도를 실제 회전으로 바꾸고, 평평한 회전곡선이 요구하는 질량 분포를 추론한다.',
    'Rubin and Ford studied Andromeda’s rotation through emission-region spectroscopy in 1970; later observations of many galaxies strengthened the evidence on mass distributions. Researchers using radio rotation curves also contributed. Convert an inclined galaxy’s line-of-sight speed into rotation, then infer what a flat curve requires.',
  ),
  concepts: [
    text('경사각 보정', 'Inclination correction'),
    text('회전곡선', 'Rotation curves'),
    text('질량·밀도 분포', 'Mass and density profiles'),
  ],
  difficulty: 'expert',
  minutes: 40,
  sources: [
    {
      title: 'Rubin & Ford (1970) — Rotation of the Andromeda Nebula',
      url: 'https://web.physics.rutgers.edu/grad/690/Rubin-Ford-1970.pdf',
    },
    {
      title: 'Carnegie Science — Kent Ford & Vera Rubin’s Image Tube Spectrograph',
      url: 'https://carnegiescience.edu/news/kent-ford-vera-rubins-image-tube-spectrograph-named-smithsonians-101-objects-made-america',
    },
  ],
  questions: [
    {
      id: 'rubin-inclined-mass',
      type: 'numeric',
      prompt: text(
        '은하 장축 위 r=20.0 kpc에서 계통 속도를 뺀 시선 속력은 180 km/s다. 원반 경사각 i=60.0°(정면은 0°)일 때, 구대칭 근사의 내부 질량 M=rv²/G를 10¹¹ M☉ 단위로 구하라.',
        'At r=20.0 kpc on a galaxy’s projected major axis, the line-of-sight speed relative to systemic velocity is 180 km/s. With disk inclination i=60.0° (face-on is 0°), find enclosed mass M=rv²/G in units of 10¹¹ M☉ using a spherical approximation.',
      ),
      context: text(
        '가상의 원궤도·얇은 원반 자료다. v시선=v sin i, G=4.30091×10⁻⁶ kpc (km/s)²/M☉. 구대칭 질량 추정은 교육용 근사이지 원반의 정확한 중력장이 아니다.',
        'Invented circular-orbit data in a thin disk: vlos=v sin i and G=4.30091×10⁻⁶ kpc (km/s)²/M☉. The spherical mass estimator is a teaching approximation, not the exact gravity of a disk.',
      ),
      hints: [
        text(
          '은하가 정면일수록 회전의 시선 성분은 작아진다.',
          'A more face-on disk has a smaller line-of-sight rotation component.',
        ),
        text(
          'v=180/sin60°를 구한 뒤 제곱해서 질량식에 넣는다.',
          'Find v=180/sin60°, then square it in the mass estimator.',
        ),
        text(
          '20×(180/sin60°)²/(4.30091×10⁻⁶)/10¹¹이다.',
          'Evaluate 20×(180/sin60°)²/(4.30091×10⁻⁶)/10¹¹.',
        ),
      ],
      answer: 2.0088771888,
      tolerance: 0.002,
      unit: '10¹¹ M☉',
      inputHelp: text(
        '예: 질량이 3×10¹¹ M☉라면 3을 입력해요.',
        'For example, enter 3 for a mass of 3×10¹¹ M☉.',
      ),
      workedSteps: [
        text('v≈207.846 km/s, v²=43200 (km/s)²다.', 'v≈207.846 km/s and v²=43200 (km/s)².'),
        text('M=864000/(4.30091×10⁻⁶) M☉다.', 'M=864000/(4.30091×10⁻⁶) M☉.'),
        text(
          '약 2.009×10¹¹ M☉이므로 입력값은 약 2.009다.',
          'This is about 2.009×10¹¹ M☉, so enter about 2.009.',
        ),
      ],
      explanation: text(
        '180 km/s를 그대로 쓰면 질량을 sin²60°=0.75배로 과소평가한다. i가 0°에 가까우면 작은 경사각 오차가 큰 회전 속도 오차를 만든다.',
        'Using 180 km/s directly underestimates mass by sin²60°=0.75. Near face-on, a small inclination error produces a large rotation-speed error.',
      ),
    },
    {
      id: 'rubin-density-slope',
      type: 'choice',
      prompt: text(
        '구대칭·원궤도 모형에서 어느 반지름 구간의 v(r)=v₀가 일정하다. 그 구간에서 요구되는 밀도 ρ(r)의 반지름 의존성은?',
        'In a spherical circular-orbit model, v(r)=v₀ is constant over a radial interval. What radial density dependence ρ(r) is required in that interval?',
      ),
      context: text(
        'M(<r)=rv₀²/G와 dM/dr=4πr²ρ를 사용한다. 유한 구간의 모형이며 은하 중심 r=0이나 무한대까지 그대로 확장하지 않는다.',
        'Use M(<r)=rv₀²/G and dM/dr=4πr²ρ. This is a finite-interval model, not an extrapolation to r=0 or infinity.',
      ),
      options: [
        { id: 'inverse-square', label: text('ρ∝r⁻²', 'ρ∝r⁻²') },
        { id: 'constant', label: text('ρ는 일정', 'ρ is constant') },
        { id: 'inverse', label: text('ρ∝r⁻¹', 'ρ∝r⁻¹') },
        { id: 'cube', label: text('ρ∝r⁻³', 'ρ∝r⁻³') },
      ],
      answerId: 'inverse-square',
      hints: [
        text(
          '평평한 속도는 내부 질량이 일정하다는 뜻이 아니다.',
          'Constant speed does not mean constant enclosed mass.',
        ),
        text('M이 r에 비례하므로 dM/dr는 상수다.', 'M is proportional to r, so dM/dr is constant.'),
        text('ρ=(dM/dr)/(4πr²)=v₀²/(4πGr²)다.', 'ρ=(dM/dr)/(4πr²)=v₀²/(4πGr²).'),
      ],
      workedSteps: [
        text('원운동 식에서 M(<r)∝r를 얻는다.', 'Circular balance gives M(<r)∝r.'),
        text(
          '구각 껍질의 질량을 미분하여 밀도로 바꾼다.',
          'Differentiate shell mass to obtain density.',
        ),
        text('ρ(r)=v₀²/(4πGr²)이므로 지수는 −2다.', 'ρ(r)=v₀²/(4πGr²), giving exponent −2.'),
      ],
      explanation: text(
        'ρ가 일정하면 M∝r³이어서 v∝r인 강체형 회전이 된다. 또한 r⁻² 모형을 무한대까지 늘리면 총질량이 발산하므로 실제 헤일로의 전체 모형은 더 복잡하다.',
        'Constant density gives M∝r³ and v∝r, a solid-body-like curve. Extending r⁻² to infinity makes the mass diverge, so real halo models need additional structure.',
      ),
    },
    {
      id: 'rubin-missing-fraction',
      type: 'numeric',
      prompt: text(
        '다른 가상 은하의 같은 반지름에서 바리온만으로 예측한 원운동 속력은 120 km/s, 관측한 실제 원운동 속력은 200 km/s다. 구대칭 근사에서 전체 내부 질량 중 바리온 모형에 없는 비율은 몇 %인가?',
        'At the same radius in another invented galaxy, baryons alone predict circular speed 120 km/s, while the measured circular speed is 200 km/s. In a spherical approximation, what percentage of total enclosed mass is absent from the baryonic model?',
      ),
      context: text(
        '두 속도는 이미 경사각 보정을 끝냈다. 바리온 모형에는 별과 기체를 모두 포함하며 같은 r과 같은 G를 사용한다.',
        'Both speeds are already inclination-corrected. The baryonic model includes both stars and gas; use the same r and G.',
      ),
      hints: [
        text(
          '같은 반지름에서 질량은 속력에 정비례하지 않고 속력의 제곱에 비례한다.',
          'At the same radius, mass scales with speed squared, not speed.',
        ),
        text(
          '누락 비율=1−M바리온/M전체=1−(v바리온/v관측)²다.',
          'Missing fraction=1−Mbaryon/Mtotal=1−(vbaryon/vobserved)².',
        ),
        text('100×[1−(120/200)²]를 계산한다.', 'Evaluate 100×[1−(120/200)²].'),
      ],
      answer: 64,
      tolerance: 0.05,
      unit: '%',
      inputHelp: numberHelp,
      workedSteps: [
        text('속력비는 0.6이다.', 'The speed ratio is 0.6.'),
        text(
          '내부 바리온 질량 비율은 0.6²=0.36이다.',
          'The enclosed baryonic mass fraction is 0.6²=0.36.',
        ),
        text(
          '모형에 없는 비율은 1−0.36=0.64, 즉 64%다.',
          'The missing fraction is 1−0.36=0.64, or 64%.',
        ),
      ],
      explanation: text(
        '40%라는 답은 속력 차이를 질량 차이로 곧바로 바꾼 것이다. 64%는 이 가정하에서의 질량 불일치이며 암흑물질 입자 종류를 알아낸 값은 아니다.',
        'An answer of 40% confuses a speed difference with a mass difference. The 64% describes the discrepancy under this model, not the identity of a dark-matter particle.',
      ),
    },
  ],
});
