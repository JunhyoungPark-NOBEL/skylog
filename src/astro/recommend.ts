/**
 * 추천 엔진(task-03 §3.6, D-020). 순수 함수 — 입력(후보·관측지·창·밤·장비·구름·이벤트)만으로 결정된다.
 *
 * 샘플링: 창을 10분 간격으로 자르고 샘플마다 회전행렬 1개(`eqjToSceneMatrix`)를 만들어 모든 고정 후보의 J2000 벡터에 적용한다
 * (후보 ~450 × 샘플 ~30 = 1.4만 벡터 곱; `Horizon()`을 대상마다 부르지 않는다). 행성·달·태양은 샘플마다 `bodyState`.
 *
 * 샘플이 "보이는" 조건(모두 만족): 고도 ≥ max(관측지 최소 고도, 종류별 최소 고도) · 방위가 관측지 `visibleAz` 안(설정 시) ·
 * 구름 < 70%(예보 있을 때) · 하늘 어둠(종류별 태양 고도 상한: 성운·은하·성단 −12°, 별자리 −9°, 별 −6°, 행성 −3°, 달 0°).
 * 샘플이 안 보이는 "이유"(horizon/site/cloud/twilight)를 기록해 "곧 진다"·"올라오는 중"이 구름·박명이 아니라 지평선·범위 때문일 때만 붙게 한다.
 *
 * 최적 시각 = 가시 샘플 중 q(s) = 고도 항 − 달 항이 최대인 샘플(달이 늦게 뜨는 밤에는 "달 뜨기 전"을 고른다).
 * 점수 = 가중합(아래 WEIGHTS 표, 근거 주석). 이유 문구는 계산 값에서만 만든다(구조화된 ReasonPart → UI가 i18n으로 문장화).
 */
import { bodyState, type BodyKey } from '@/astro/bodies';
import {
  angularSeparation,
  raDecToUnitVector,
  sceneToAltAz,
  wrap360,
  type Vec3,
} from '@/astro/coords';
import {
  allVerdicts,
  DEFAULT_EQUIPMENT,
  type EquipmentKind,
  type EquipmentProfile,
  type Verdict,
} from '@/astro/equipment';
import { applyMat3, eqjToSceneMatrix, type ObserverLike } from '@/astro/frames';
import type { Interval, ObservingNight } from '@/astro/night';
import { apparentAltitude } from '@/astro/refraction';
import { moonPenaltyMag } from '@/astro/visibility';
import type { DsoCategory } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { SearchKind } from '@/catalog/searchIndex';
import type { Bortle } from '@/db/types';

export type RecGroup = 'now' | 'naked' | 'binoculars' | 'telescope' | 'settingSoon' | 'rising';

export interface Candidate {
  id: ObjectId;
  kind: SearchKind;
  bodyKey?: BodyKey;
  raJ2000Deg: number;
  decJ2000Deg: number;
  mag?: number;
  majArcmin?: number;
  minArcmin?: number;
  extended: boolean;
  category?: DsoCategory;
  con?: string;
  /** 큐레이션 태그(double·challenge·messier·caldwell) */
  tags?: string[];
  /** 이중성: 분해에 필요한 최소 장비 */
  doubleSplit?: 'binoculars' | 'telescope';
  doubleSepArcsec?: number;
}

export type SpecialEventKind =
  'opposition' | 'elongation' | 'meteorPeak' | 'closeApproach' | 'fullMoon';

export interface SpecialEvent {
  objectId: ObjectId;
  kind: SpecialEventKind;
  at: Date;
  /** 창과의 관련성을 판단할 일수(기본 7) */
  withinDays?: number;
}

export interface SeasonSignature {
  id: string;
  months: number[];
  objectIds: ObjectId[];
}

export interface SiteConstraints {
  visibleAz?: [number, number][];
  minAltDeg?: number;
  bortle?: Bortle;
}

export interface RecommendInput {
  candidates: Candidate[];
  observer: ObserverLike;
  /** 샘플링 창 */
  window: Interval;
  now: Date;
  night: ObservingNight;
  site?: SiteConstraints;
  equipment: EquipmentKind;
  equipmentProfile?: EquipmentProfile;
  /** 시각 → 전운량 0..100 (예보 없으면 undefined) */
  cloudAt?: (t: Date) => number | undefined;
  /** T4: 이미 관측한 대상(신선도 보너스 제외, `observed` 플래그) */
  observedSet?: ReadonlySet<ObjectId>;
  /** T4: 관측 예정(☆)으로 저장한 대상 — 가시 조건을 통과하면 계획(`plan`) 앞에 온다(`planned` 플래그) */
  bookmarkedSet?: ReadonlySet<ObjectId>;
  events?: SpecialEvent[];
  seasonSignatures?: SeasonSignature[];
  famous?: ReadonlySet<string>;
  sampleMin?: number;
  /** 표시 달(1..12, 계절 시그니처 판단). 기본은 창 중앙의 현지 달 */
  month?: number;
}

export type ReasonPart =
  | { type: 'position'; azDeg: number; altDeg: number; when: 'now' | 'peak'; at?: Date }
  | { type: 'peak'; at: Date; altDeg: number }
  | { type: 'moonSep'; deg: number; illumination: number }
  | { type: 'moonClose'; deg: number; illumination: number }
  | { type: 'moonDown' }
  | { type: 'above30'; minutes: number }
  | { type: 'setsAt'; at: Date; minAltDeg: number }
  | { type: 'risesAt'; at: Date; azDeg: number }
  | { type: 'event'; kind: SpecialEventKind; at: Date }
  | { type: 'season'; id: string }
  | { type: 'double'; sepArcsec: number; splitWith: 'binoculars' | 'telescope' }
  | { type: 'siteClipped' }
  | { type: 'verdict'; equipment: EquipmentKind; verdict: Verdict }
  | { type: 'fresh' };

export type InvisibleCause = 'horizon' | 'site' | 'cloud' | 'twilight' | 'window' | null;

export interface RecMetrics {
  /** 최적 샘플(고도 − 달) */
  peakAltDeg: number;
  peakAt: Date | null;
  peakAzDeg: number;
  /** 창 안 최고 고도(표시용) */
  maxAltDeg: number;
  minutesVisible: number;
  minutesAbove30: number;
  firstVisibleAt: Date | null;
  lastVisibleAt: Date | null;
  /** 처음 보이기 직전 샘플이 안 보였던 이유 / 마지막 가시 샘플 다음이 안 보이는 이유 */
  firstCause: InvisibleCause;
  lastCause: InvisibleCause;
  visibleNow: boolean;
  nowCause: InvisibleCause;
  nowAltDeg: number;
  nowAzDeg: number;
  /** 최적 샘플에서 달과의 각거리(달이 떠 있을 때; 아니면 180) */
  moonSepDeg: number;
  verdicts: Record<EquipmentKind, Verdict>;
  /** 관측지 범위 필터가 실제로 샘플을 제외했는가 */
  clippedBySite: boolean;
}

export interface Recommendation {
  id: ObjectId;
  kind: SearchKind;
  score: number;
  groups: RecGroup[];
  metrics: RecMetrics;
  reasons: ReasonPart[];
  event?: SpecialEvent;
  seasonId?: string;
  /** 망원경 그룹의 '도전' 꼬리(hard) */
  challenge?: boolean;
  /** T4: 관측 예정(☆)에 있는 대상 */
  planned: boolean;
  /** T4: 이미 관측(★)한 대상 */
  observed: boolean;
}

export interface RecommendResult {
  items: Recommendation[];
  groups: Record<RecGroup, Recommendation[]>;
  /** 계획(≤ 12): 관측 예정(☆) 대상이 먼저(각각 최적 시각순), 그 뒤 점수 상위가 최적 시각순 */
  plan: Recommendation[];
  /** 관측지 범위 필터가 적용되었는가(카드 배지) */
  siteFiltered: boolean;
  sampleCount: number;
}

/**
 * 가중치(점수 만점 ≈ 100 + 보너스). 근거(D-020):
 * - 고도: A = 30·clamp((alt−10)/50, 0, 1). 10°(소광 ≈1등급)에서 0, 60°(airmass 1.15) 이상 포화.
 * - 고도 ≥ 30° 지속: 3시간이면 20점(관측 계획을 세울 여유).
 * - 달: 달 페널티(등급, 최대 3) × 7 → 보름달 근접 확산 천체 −21(≈ 잘 보임→어려움 차이). 점광원(별·행성)은 절반.
 * - 장비 판정: 잘 보임 25 / 보임 15 / 어려움 4 / 안 보임 → 후보 제외(행성·달·별자리는 남긴다; 별자리는 항상 15).
 * - 달·고전 5행성: +30("행성은 항상 상위", §6). 천왕성·해왕성은 점 하나로만 보이므로 +8. 고른 장비로 안 보이면 30%.
 * - 이벤트(충·최대이각·유성우 극대·근지점 보름달): +20. 창 중앙과 이벤트 시각 차가 종류별 일수 안일 때.
 * - 계절 시그니처 +8 · 유명 천체 +5 · 이중성(고른 장비로 분해 가능) +6 · 신선도(T4 기록 없음) +5.
 * - 구름·박명·범위는 샘플 제외로만 반영(감점 없음). 지금 보임은 그룹 배치로만.
 */
export const WEIGHTS = {
  altitude: 30,
  altFloorDeg: 10,
  altFullDeg: 60,
  duration30: 20,
  duration30FullMin: 180,
  moon: 7,
  moonPointFactor: 0.5,
  verdict: { easy: 25, possible: 15, hard: 4, no: 0 } as Record<Verdict, number>,
  planet: 30,
  iceGiant: 8,
  planetInvisibleFactor: 0.3,
  event: 20,
  season: 8,
  famous: 5,
  double: 6,
  fresh: 5,
} as const;

/** 종류별 최소 고도(도): 확산 천체는 대기 소광 때문에 더 높이 */
export const MIN_ALT: Record<SearchKind, number> = {
  dso: 20,
  star: 10,
  const: 15,
  planet: 8,
  moon: 5,
  sun: 0,
};
/** 종류별 "어두운 하늘" 태양 고도 상한(도) */
export const DARK_SUN_ALT: Record<SearchKind, number> = {
  dso: -12,
  const: -9,
  star: -6,
  planet: -3,
  moon: 0,
  sun: 90,
};
export const CLOUD_EXCLUDE = 70;
export const SETTING_SOON_MIN = 90;
export const NOW_MIN_SCORE = 35;
export const RISING_MIN_SCORE = 50;
export const PLAN_MAX = 12;
export const NOW_MAX = 8;
export const RISING_MAX = 6;
const CLASSICAL: ReadonlySet<BodyKey> = new Set([
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
]);
const BINOCULAR_BODIES: ReadonlySet<BodyKey> = new Set(['moon', 'jupiter', 'uranus', 'neptune']);
/** "지금 당장"에 별자리는 최대 2개(별자리가 자리를 다 차지하지 않게) */
export const NOW_CONST_MAX = 2;
const EQUIPMENT_RANK: Record<EquipmentKind, number> = { naked: 0, binoculars: 1, telescope: 2 };

/** 방위가 시계 방향 구간 [start, end] 안에 있는가(구간이 360°를 넘어가도 처리) */
export function azInRanges(azDeg: number, ranges: [number, number][] | undefined): boolean {
  if (!ranges || ranges.length === 0) return true;
  const a = wrap360(azDeg);
  for (const [s0, e0] of ranges) {
    const s = wrap360(s0);
    const e = wrap360(e0);
    if (Math.abs(e - s) < 1e-9) return true; // 전체
    if (s <= e ? a >= s && a <= e : a >= s || a <= e) return true;
  }
  return false;
}

/**
 * 계절 시그니처용 "체감 달": 하늘은 한 달에 약 2시간씩 앞당겨지므로 창 중앙이 현지 21시보다 늦을수록 그만큼 뒤 달의 저녁 하늘이 된다
 * (21:00 → +0, 01:00 → +2, 04:00 → +4개월).
 */
export function seasonMonthOf(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const month = get('month');
  const hour = get('hour');
  const hoursAfterNoon = ((hour - 12 + 24) % 24) + 0.5;
  const shift = Math.round((hoursAfterNoon - 9) / 2);
  return ((((month - 1 + shift) % 12) + 12) % 12) + 1;
}

interface Sample {
  t: Date;
  m: Float32Array;
  sunAlt: number;
  moonAlt: number;
  /** 달 J2000 단위벡터(별·DSO의 J2000 벡터와 같은 좌표계) */
  moonVec: Vec3;
  moonIllum: number;
  cloud: number | undefined;
  bodies: Map<BodyKey, { altDeg: number; azDeg: number; vec: Vec3; mag: number }>;
}

function buildSamples(input: RecommendInput, stepMin: number): Sample[] {
  const out: Sample[] = [];
  const bodyKeys = new Set<BodyKey>();
  for (const c of input.candidates) if (c.bodyKey) bodyKeys.add(c.bodyKey);
  const end = input.window.to.getTime();
  for (let ms = input.window.from.getTime(); ms <= end; ms += stepMin * 60_000) {
    const t = new Date(ms);
    const sun = bodyState('sun', t, input.observer);
    const moon = bodyState('moon', t, input.observer);
    const bodies = new Map<BodyKey, { altDeg: number; azDeg: number; vec: Vec3; mag: number }>();
    for (const k of bodyKeys) {
      const s = k === 'sun' ? sun : k === 'moon' ? moon : bodyState(k, t, input.observer);
      bodies.set(k, {
        altDeg: s.altDeg,
        azDeg: s.azDeg,
        vec: raDecToUnitVector(s.raJ2000Deg, s.decJ2000Deg),
        mag: s.magnitude,
      });
    }
    out.push({
      t,
      m: eqjToSceneMatrix(t, input.observer),
      sunAlt: sun.altDeg,
      moonAlt: moon.altDeg,
      moonVec: raDecToUnitVector(moon.raJ2000Deg, moon.decJ2000Deg),
      moonIllum: moon.phaseFraction,
      cloud: input.cloudAt?.(t),
      bodies,
    });
  }
  return out;
}

function altTerm(altDeg: number): number {
  const f = (altDeg - WEIGHTS.altFloorDeg) / (WEIGHTS.altFullDeg - WEIGHTS.altFloorDeg);
  return WEIGHTS.altitude * Math.min(1, Math.max(0, f));
}

function moonTerm(c: Candidate, s: Sample, sepDeg: number): number {
  const pen = moonPenaltyMag({
    illumination: s.moonIllum,
    altDeg: s.moonAlt,
    separationDeg: sepDeg,
  });
  return WEIGHTS.moon * pen * (c.extended ? 1 : WEIGHTS.moonPointFactor);
}

function isNowInWindow(input: RecommendInput): boolean {
  const n = input.now.getTime();
  return n >= input.window.from.getTime() - 5 * 60_000 && n <= input.window.to.getTime();
}

interface Measured extends RecMetrics {
  peakMoonTerm: number;
  peakSample: Sample | null;
  /** 달을 빼고 계산한 판정(점수용) */
  scoreVerdicts: Record<EquipmentKind, Verdict>;
}

/** 후보 하나의 창 안 궤적 → 지표 */
function measure(
  c: Candidate,
  samples: Sample[],
  input: RecommendInput,
  stepMin: number,
): Measured {
  const vec = c.bodyKey ? null : raDecToUnitVector(c.raJ2000Deg, c.decJ2000Deg);
  const siteMin = input.site?.minAltDeg ?? 0;
  let bestQ = Number.NEGATIVE_INFINITY;
  let peakAlt = -90;
  let peakAt: Date | null = null;
  let peakAz = 0;
  let peakSep = 180;
  let peakMoon = 0;
  let peakSample: Sample | null = null;
  /** 행성·달의 등급(샘플마다 변함) — 최적 샘플 값, 없으면 지금 값 */
  let bodyMag: number | undefined;
  let nowBodyMag: number | undefined;
  let maxAlt = -90;
  let minutesVisible = 0;
  let minutesAbove30 = 0;
  let first: Date | null = null;
  let last: Date | null = null;
  let firstCause: InvisibleCause = null;
  let lastCause: InvisibleCause = null;
  let prevCause: InvisibleCause = 'window';
  let clipped = false;
  let visibleNow = false;
  let nowCause: InvisibleCause = 'window';
  let nowAlt = -90;
  let nowAz = 0;
  const nowMs = input.now.getTime();
  let nowDist = Number.POSITIVE_INFINITY;

  for (const s of samples) {
    let altDeg: number;
    let azDeg: number;
    let eqVec: Vec3;
    let sampleMag: number | undefined;
    if (c.bodyKey) {
      const b = s.bodies.get(c.bodyKey)!;
      altDeg = b.altDeg;
      azDeg = b.azDeg;
      eqVec = b.vec;
      sampleMag = b.mag;
    } else {
      const hor = sceneToAltAz(applyMat3(s.m, vec!));
      altDeg = apparentAltitude(hor.altDeg);
      azDeg = hor.azDeg;
      eqVec = vec!;
    }
    if (altDeg > maxAlt) maxAlt = altDeg;
    const inSite = azInRanges(azDeg, input.site?.visibleAz) && altDeg >= siteMin;
    if (!inSite && altDeg >= MIN_ALT[c.kind]) clipped = true;
    const cloudOk = s.cloud === undefined || s.cloud < CLOUD_EXCLUDE;
    const dark = s.sunAlt <= DARK_SUN_ALT[c.kind];
    let cause: InvisibleCause = null;
    if (altDeg < MIN_ALT[c.kind]) cause = 'horizon';
    else if (!inSite) cause = 'site';
    else if (!dark) cause = 'twilight';
    else if (!cloudOk) cause = 'cloud';
    const visible = cause === null;

    const d = Math.abs(s.t.getTime() - nowMs);
    if (d < nowDist) {
      nowDist = d;
      nowAlt = altDeg;
      nowAz = azDeg;
      nowBodyMag = sampleMag;
      visibleNow = visible && d <= stepMin * 60_000;
      nowCause = visible ? null : cause;
    }
    if (visible) {
      minutesVisible += stepMin;
      if (altDeg >= 30) minutesAbove30 += stepMin;
      if (!first) {
        first = s.t;
        firstCause = prevCause;
      }
      last = s.t;
      lastCause = 'window';
      const sep = s.moonAlt > 0 ? angularSeparation(eqVec, s.moonVec) : 180;
      const mt = moonTerm(c, s, sep);
      const q = altTerm(altDeg) - mt;
      if (q > bestQ) {
        bestQ = q;
        peakAlt = altDeg;
        peakAt = s.t;
        peakAz = azDeg;
        peakSep = sep;
        peakMoon = mt;
        peakSample = s;
        bodyMag = sampleMag;
      }
    } else if (prevCause === null) {
      lastCause = cause; // 직전 샘플은 보였고 이번 샘플부터 안 보임
    }
    prevCause = cause;
  }
  const bortle = input.site?.bortle ?? 7;
  const photometry = {
    mag: c.bodyKey ? (bodyMag ?? nowBodyMag) : c.mag,
    majArcmin: c.majArcmin,
    minArcmin: c.minArcmin,
    extended: c.extended,
    kind: c.kind,
    category: c.category,
  };
  const altForVerdict = peakAt ? peakAlt : Math.max(nowAlt, 1);
  // 그룹 배치용 판정은 달을 반영, 점수용 판정(scoreVerdicts)은 달 제외 — 달 영향은 M 항에서만 한 번 센다(이중 감점 방지)
  const v = allVerdicts(
    photometry,
    {
      bortle,
      altDeg: altForVerdict,
      moon: peakSample
        ? { illumination: peakSample.moonIllum, altDeg: peakSample.moonAlt, separationDeg: peakSep }
        : undefined,
    },
    input.equipmentProfile ?? DEFAULT_EQUIPMENT,
  );
  const sv = allVerdicts(
    photometry,
    { bortle, altDeg: altForVerdict },
    input.equipmentProfile ?? DEFAULT_EQUIPMENT,
  );
  return {
    peakAltDeg: peakAt ? peakAlt : nowAlt,
    peakAt,
    peakAzDeg: peakAz,
    maxAltDeg: maxAlt,
    minutesVisible,
    minutesAbove30,
    firstVisibleAt: first,
    lastVisibleAt: last,
    firstCause,
    lastCause,
    visibleNow,
    nowCause,
    nowAltDeg: nowAlt,
    nowAzDeg: nowAz,
    moonSepDeg: peakSep,
    verdicts: {
      naked: v.naked.verdict,
      binoculars: v.binoculars.verdict,
      telescope: v.telescope.verdict,
    },
    scoreVerdicts: {
      naked: sv.naked.verdict,
      binoculars: sv.binoculars.verdict,
      telescope: sv.telescope.verdict,
    },
    clippedBySite: clipped,
    peakMoonTerm: peakMoon,
    peakSample,
  };
}

function findEvent(c: Candidate, input: RecommendInput): SpecialEvent | undefined {
  if (!input.events) return undefined;
  const mid = (input.window.from.getTime() + input.window.to.getTime()) / 2;
  return input.events.find(
    (e) =>
      e.objectId === c.id && Math.abs(e.at.getTime() - mid) <= (e.withinDays ?? 7) * 86_400_000,
  );
}

const SHOWPIECE_BINO: ReadonlySet<string> = new Set(['openCluster', 'nebula', 'galaxy']);
const SHOWPIECE_TELE: ReadonlySet<string> = new Set([
  'planetaryNebula',
  'galaxy',
  'globularCluster',
  'nebula',
  'supernovaRemnant',
]);

function ok(v: Verdict): boolean {
  return v === 'easy' || v === 'possible';
}

/** 어느 장비 그룹에 넣을까 — "가장 잘 맞는 장비" 규칙 + 쇼피스 예외 */
function equipmentGroups(c: Candidate, m: RecMetrics): { groups: RecGroup[]; challenge: boolean } {
  const groups: RecGroup[] = [];
  let challenge = false;
  const isBody = c.kind === 'planet' || c.kind === 'moon';
  const isDouble = c.tags?.includes('double') ?? false;
  if (c.kind === 'const') return { groups: ['naked'], challenge };
  const vn = m.verdicts.naked;
  const vb = m.verdicts.binoculars;
  const vt = m.verdicts.telescope;
  if (ok(vn)) groups.push('naked');
  if (isBody) {
    // 쌍안경으로 볼 만한 천체: 달(크레이터)·목성(갈릴레이 위성)·천왕성·해왕성(점으로 확인). 나머지 행성은 망원경.
    if (c.bodyKey && BINOCULAR_BODIES.has(c.bodyKey) && ok(vb)) groups.push('binoculars');
    groups.push('telescope');
    return { groups, challenge };
  }
  const binoShow = c.extended && (c.majArcmin ?? 0) >= 20 && SHOWPIECE_BINO.has(c.category ?? '');
  if (ok(vb) && (vn !== 'easy' || binoShow || c.doubleSplit === 'binoculars'))
    groups.push('binoculars');
  const teleShow = SHOWPIECE_TELE.has(c.category ?? '');
  if (isDouble) groups.push('telescope');
  else if (ok(vt) && (vb !== 'easy' || teleShow)) groups.push('telescope');
  else if (vt === 'hard' && c.kind === 'dso') {
    groups.push('telescope');
    challenge = true;
  }
  return { groups, challenge };
}

export function recommend(input: RecommendInput): RecommendResult {
  const stepMin = input.sampleMin ?? 10;
  const samples = buildSamples(input, stepMin);
  const mid = new Date((input.window.from.getTime() + input.window.to.getTime()) / 2);
  const month = input.month ?? seasonMonthOf(mid, input.night.tz);
  const nowIn = isNowInWindow(input);
  const siteFiltered = !!(input.site?.visibleAz?.length || (input.site?.minAltDeg ?? 0) > 0);
  const items: Recommendation[] = [];

  for (const c of input.candidates) {
    if (c.kind === 'sun') continue;
    const m = measure(c, samples, input, stepMin);
    if (!m.peakAt || !m.peakSample) continue; // 창 안에서 한 번도 보이지 않음
    const isBody = c.kind === 'planet' || c.kind === 'moon';
    const classical = isBody && !!c.bodyKey && CLASSICAL.has(c.bodyKey);
    const v: Verdict = c.kind === 'const' ? 'possible' : m.verdicts[input.equipment];
    // 달·고전 5행성만 "안 보임"이어도 남긴다(그래도 밝은 점으로 보인다); 천왕성·해왕성은 일반 규칙
    if (v === 'no' && !classical) continue;
    const scoreV: Verdict = c.kind === 'const' ? 'possible' : m.scoreVerdicts[input.equipment];

    let score = altTerm(m.peakAltDeg);
    score += WEIGHTS.duration30 * Math.min(1, m.minutesAbove30 / WEIGHTS.duration30FullMin);
    score -= m.peakMoonTerm;
    score += WEIGHTS.verdict[scoreV];
    if (isBody) {
      const bonus = classical ? WEIGHTS.planet : WEIGHTS.iceGiant;
      score += v === 'no' ? bonus * WEIGHTS.planetInvisibleFactor : bonus;
    }
    const event = findEvent(c, input);
    if (event) score += WEIGHTS.event;
    const sig = input.seasonSignatures?.find(
      (s) => s.months.includes(month) && s.objectIds.includes(c.id),
    );
    if (sig) score += WEIGHTS.season;
    if (input.famous?.has(c.id)) score += WEIGHTS.famous;
    const doubleOk =
      c.doubleSplit !== undefined &&
      EQUIPMENT_RANK[input.equipment] >= EQUIPMENT_RANK[c.doubleSplit];
    if (doubleOk) score += WEIGHTS.double;
    const observed = input.observedSet?.has(c.id) ?? false;
    const planned = input.bookmarkedSet?.has(c.id) ?? false;
    const fresh = !!input.observedSet && !observed;
    if (fresh) score += WEIGHTS.fresh;

    // 그룹
    const eq = equipmentGroups(c, m);
    const groups: RecGroup[] = [];
    if (nowIn && m.visibleNow && score >= NOW_MIN_SCORE) groups.push('now');
    groups.push(...eq.groups);
    const lastMs = m.lastVisibleAt?.getTime() ?? 0;
    let setsAt: Date | null = null;
    let risesAt: Date | null = null;
    if (
      nowIn &&
      m.visibleNow &&
      (m.lastCause === 'horizon' || m.lastCause === 'site') &&
      lastMs + stepMin * 60_000 < input.window.to.getTime() &&
      lastMs + stepMin * 60_000 - input.now.getTime() <= SETTING_SOON_MIN * 60_000
    ) {
      groups.push('settingSoon');
      setsAt = new Date(lastMs + stepMin * 60_000);
    } else if (
      nowIn &&
      !m.visibleNow &&
      m.firstVisibleAt &&
      m.firstVisibleAt.getTime() > input.now.getTime() &&
      (m.firstCause === 'horizon' || m.firstCause === 'site') &&
      score >= RISING_MIN_SCORE
    ) {
      groups.push('rising');
      risesAt = m.firstVisibleAt;
    }

    // 이유: 위치 → (짐|뜸|최고) → 달 → 30° 이상 → (이벤트|이중성|계절) → 범위 → 판정 (UI가 최대 4개로 자른다)
    const reasons: ReasonPart[] = [];
    if (nowIn && m.visibleNow)
      reasons.push({ type: 'position', azDeg: m.nowAzDeg, altDeg: m.nowAltDeg, when: 'now' });
    else
      reasons.push({
        type: 'position',
        azDeg: m.peakAzDeg,
        altDeg: m.peakAltDeg,
        when: 'peak',
        at: m.peakAt,
      });
    if (setsAt)
      reasons.push({
        type: 'setsAt',
        at: setsAt,
        minAltDeg: Math.max(input.site?.minAltDeg ?? 0, MIN_ALT[c.kind]),
      });
    else if (risesAt) reasons.push({ type: 'risesAt', at: risesAt, azDeg: m.peakAzDeg });
    else if (nowIn && m.visibleNow && m.peakAltDeg - m.nowAltDeg >= 5)
      reasons.push({ type: 'peak', at: m.peakAt, altDeg: m.peakAltDeg });
    const ps = m.peakSample;
    if (ps.moonAlt > 0 && ps.moonIllum > 0.05) {
      if (m.moonSepDeg < 30 && ps.moonIllum >= 0.3)
        reasons.push({ type: 'moonClose', deg: m.moonSepDeg, illumination: ps.moonIllum });
      else reasons.push({ type: 'moonSep', deg: m.moonSepDeg, illumination: ps.moonIllum });
    } else reasons.push({ type: 'moonDown' });
    if (m.minutesAbove30 >= 60) reasons.push({ type: 'above30', minutes: m.minutesAbove30 });
    if (event) reasons.push({ type: 'event', kind: event.kind, at: event.at });
    else if (doubleOk && c.doubleSplit)
      reasons.push({ type: 'double', sepArcsec: c.doubleSepArcsec ?? 0, splitWith: c.doubleSplit });
    else if (sig) reasons.push({ type: 'season', id: sig.id });
    if (m.clippedBySite) reasons.push({ type: 'siteClipped' });
    reasons.push({ type: 'verdict', equipment: input.equipment, verdict: v });
    if (fresh) reasons.push({ type: 'fresh' });

    const { peakMoonTerm: _pm, peakSample: _ps, scoreVerdicts: _sv, ...metrics } = m;
    items.push({
      id: c.id,
      kind: c.kind,
      score: Math.round(score * 10) / 10,
      groups,
      metrics,
      reasons,
      event,
      seasonId: sig?.id,
      challenge: eq.challenge || undefined,
      planned,
      observed,
    });
  }

  items.sort(
    (a, b) =>
      b.score - a.score || b.metrics.peakAltDeg - a.metrics.peakAltDeg || a.id.localeCompare(b.id),
  );
  const groups: Record<RecGroup, Recommendation[]> = {
    now: [],
    naked: [],
    binoculars: [],
    telescope: [],
    settingSoon: [],
    rising: [],
  };
  for (const it of items) for (const g of it.groups) groups[g].push(it);
  let nowConst = 0;
  groups.now = groups.now
    .filter((it) => (it.kind === 'const' ? nowConst++ < NOW_CONST_MAX : true))
    .slice(0, NOW_MAX);
  groups.settingSoon.sort(
    (a, b) => (a.metrics.lastVisibleAt?.getTime() ?? 0) - (b.metrics.lastVisibleAt?.getTime() ?? 0),
  );
  groups.rising.sort(
    (a, b) =>
      (a.metrics.firstVisibleAt?.getTime() ?? 0) - (b.metrics.firstVisibleAt?.getTime() ?? 0),
  );
  groups.rising = groups.rising.slice(0, RISING_MAX);
  // 망원경 그룹: 도전(hard)은 꼬리로
  groups.telescope.sort(
    (a, b) => Number(a.challenge ?? false) - Number(b.challenge ?? false) || b.score - a.score,
  );
  const plan = buildPlan(items);
  return { items, groups, plan, siteFiltered, sampleCount: samples.length };
}

/**
 * 계획(≤ PLAN_MAX): 관측 예정(☆) 대상을 먼저 넣고(점수순으로 고른 뒤 최적 시각순), 남은 자리는 점수 상위를 최적 시각순으로.
 * 예정 대상도 창 안에서 보여야만(items에 있어야만) 들어간다 — 안 보이는 예정 대상은 기록 탭의 ☆ 목록이 담당한다.
 */
function buildPlan(items: Recommendation[]): Recommendation[] {
  const byPeak = (a: Recommendation, b: Recommendation) =>
    a.metrics.peakAt!.getTime() - b.metrics.peakAt!.getTime();
  const withPeak = items.filter((it) => it.metrics.peakAt);
  const planned = withPeak.filter((it) => it.planned).slice(0, PLAN_MAX);
  const rest = withPeak.filter((it) => !it.planned).slice(0, PLAN_MAX - planned.length);
  return [...planned.sort(byPeak), ...rest.sort(byPeak)];
}
