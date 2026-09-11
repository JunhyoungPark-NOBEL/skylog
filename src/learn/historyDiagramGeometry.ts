export const HISTORY_DIAGRAM_KEYS: Record<string, string> = {
  'eratosthenes-earth': 'earth-angle',
  'kepler-orbits': 'orbit',
  'romer-light': 'light-delay',
  'leavitt-distance': 'cepheid',
  'payne-stellar-atmospheres': 'spectrum',
  'einstein-eclipse': 'deflection',
  'chandrasekhar-limit': 'degeneracy',
  'hubble-expansion': 'expansion',
  'zwicky-cluster': 'cluster',
  'rubin-rotation': 'rotation',
};

/**
 * 도해용 순수 계산. 수치는 historyQuests의 교육 모형이며 역사 원자료가 아니다.
 * 근거: NASA Kepler laws, NRAO Myers Lecture 9, Princeton Burrows White Dwarfs.
 * https://science.nasa.gov/solar-system/orbits-and-keplers-laws/
 * https://www.aoc.nrao.edu/~smyers/courses/astro12/L9.html
 * https://www.astro.princeton.edu/~burrows/classes/403/white.dwarfs.pdf
 */
export type DiagramPoint = { x: number; y: number };

export function ellipseAt(a: number, eccentricity: number, eccentricAnomaly: number) {
  if (
    !(a > 0) ||
    !Number.isFinite(a) ||
    !Number.isFinite(eccentricAnomaly) ||
    !(eccentricity >= 0 && eccentricity < 1)
  )
    throw new RangeError('Invalid ellipse');
  const b = a * Math.sqrt(1 - eccentricity ** 2);
  return {
    x: a * Math.cos(eccentricAnomaly),
    y: b * Math.sin(eccentricAnomaly),
    b,
    focusX: a * eccentricity,
    auxiliaryX: a * Math.cos(eccentricAnomaly),
    auxiliaryY: a * Math.sin(eccentricAnomaly),
  };
}

export function linearScale(value: number, lo: number, hi: number, start: number, end: number) {
  if (![value, lo, hi, start, end].every(Number.isFinite) || hi === lo)
    throw new RangeError('Invalid plot scale');
  return start + ((value - lo) / (hi - lo)) * (end - start);
}

/** 세페이드 V대역 문제에 주어진 계수. 주기 입력 단위는 일. */
export function cepheidMagnitude(periodDays: number) {
  if (!(periodDays > 0) || !Number.isFinite(periodDays)) throw new RangeError('Invalid period');
  return -2.76 * Math.log10(periodDays) - 1.4;
}

/** 밀도·분배함수 고정. 로그 공간에서 계산해 작은 지수항의 언더플로를 피한다. */
export function sahaLogRatio(temperature: number, reference = 6000) {
  if (!(temperature > 0 && reference > 0) || ![temperature, reference].every(Number.isFinite))
    throw new RangeError('Invalid temperature');
  return (
    1.5 * Math.log(temperature / reference) +
    (13.6 / 8.617333262e-5) * (1 / reference - 1 / temperature)
  );
}

/** 같은 조성의 비상대론적 정적 모형. 질량 한계 근처에는 적용하지 않는다. */
export function whiteDwarfRadiusRatio(mass: number, referenceMass = 0.4) {
  if (!(mass > 0 && referenceMass > 0) || ![mass, referenceMass].every(Number.isFinite))
    throw new RangeError('Invalid mass');
  return Math.cbrt(referenceMass / mass);
}

/** 회귀선/정답은 계산하지 않고 문제에 주어진 점만 반환한다. */
export function hubbleTeachingPoints(distanceFactor = 1): DiagramPoint[] {
  if (!(distanceFactor > 0) || !Number.isFinite(distanceFactor))
    throw new RangeError('Invalid distance factor');
  return (
    [
      [10, 800],
      [20, 1300],
      [40, 2900],
    ] as const
  ).map(([x, y]) => ({ x: x * distanceFactor, y }));
}

export function sampledPath(points: DiagramPoint[]) {
  if (!points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)))
    throw new RangeError('Invalid plot point');
  return points.map(({ x, y }, i) => `${i ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
}

export function sampleRange(lo: number, hi: number, steps = 40): number[] {
  if (![lo, hi].every(Number.isFinite) || !Number.isInteger(steps) || steps < 1)
    throw new RangeError('Invalid samples');
  return Array.from({ length: steps + 1 }, (_, i) => lo + ((hi - lo) * i) / steps);
}
