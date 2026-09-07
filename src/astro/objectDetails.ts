/**
 * 상세 시트(task-03 §3.2)의 "지금 · 오늘 · 좌표 · 장비" 계산. 순수 함수 — 입력은 target(정적)·date·observer·관측 밤.
 * - 지금: 굴절 포함 alt/az(느린 경로 `eqjToAltAzSlow`), of-date RA/Dec, 태양·달과의 각거리, 상태 배지.
 * - 오늘: 정오→정오 안의 출·남중·몰(엔진 검색), 최적 시간대 = 어두운 구간 ∩ 고도 ≥ 30°(없으면 ≥ 20°)의 가장 긴 연속 구간(10분 샘플),
 *   "가장 좋은 달" = 매달 15일 현지 자정의 LST가 적경과 가장 가까운 달.
 */
import { AU_KM, bodyState, type BodyKey } from '@/astro/bodies';
import { angularSeparationRaDec, wrap180 } from '@/astro/coords';
import {
  allVerdicts,
  DEFAULT_EQUIPMENT,
  type EquipmentKind,
  type EquipmentProfile,
  type VerdictDetail,
} from '@/astro/equipment';
import { riseTransitSetBody, riseTransitSetFixed, type RiseTransitSet } from '@/astro/events';
import { eqjToAltAzSlow, j2000ToOfDate, type ObserverLike } from '@/astro/frames';
import type { Interval, ObservingNight } from '@/astro/night';
import { localSiderealTimeDeg } from '@/astro/time';
import type { ObjectTarget } from '@/catalog/objectTarget';
import type { Bortle } from '@/db/types';
import { zonedDateTime, type Distance } from '@/ui/format';

export type NowStatus = 'visible' | 'belowHorizon' | 'daylight' | 'twilight' | 'nearSun';

export interface ObjectNow {
  altDeg: number;
  azDeg: number;
  /** of-date */
  raDeg: number;
  decDeg: number;
  raJ2000Deg: number;
  decJ2000Deg: number;
  status: NowStatus;
  sunAltDeg: number;
  sunSepDeg: number;
  moonSepDeg: number;
  moonAltDeg: number;
  moonIllum: number;
  mag?: number;
  distance?: Distance;
  angularDiameterArcsec?: number;
  phaseFraction?: number;
  moonPhaseDeg?: number;
}

export interface ObjectToday {
  rise: Date | null;
  transit: Date | null;
  set: Date | null;
  transitAltDeg: number | null;
  rtsStatus: RiseTransitSet['status'];
  bestWindow: Interval | null;
  /** 최적 시간대 판정에 쓴 최소 고도(30 또는 20) */
  bestWindowMinAlt: number | null;
  /** 1..12, 없으면 null(달·태양) */
  bestMonth: number | null;
}

export interface ObjectDetails {
  id: ObjectTarget['id'];
  kind: ObjectTarget['kind'];
  now: ObjectNow;
  today: ObjectToday;
  verdicts: Record<EquipmentKind, VerdictDetail>;
  bortle: Bortle;
}

export interface DetailOptions {
  bortle?: Bortle;
  equipment?: EquipmentProfile;
}

export const NEAR_SUN_DEG = 15;
export const BEST_WINDOW_ALT = [30, 20] as const;
const SAMPLE_MIN = 10;

function altAtFactory(t: ObjectTarget, observer: ObserverLike): (d: Date) => number {
  if (t.bodyKey) {
    const key: BodyKey = t.bodyKey;
    return (d) => bodyState(key, d, observer).altDeg;
  }
  return (d) => eqjToAltAzSlow(d, observer, t.raJ2000Deg, t.decJ2000Deg, 'normal').altDeg;
}

/** 어두운 구간 안에서 고도 ≥ minAlt인 가장 긴 연속 구간 */
export function longestRun(
  span: Interval,
  altAt: (d: Date) => number,
  minAlt: number,
  stepMin = SAMPLE_MIN,
): Interval | null {
  const step = stepMin * 60_000;
  let best: Interval | null = null;
  let from: number | null = null;
  const end = span.to.getTime();
  for (let ms = span.from.getTime(); ms <= end; ms += step) {
    const ok = altAt(new Date(ms)) >= minAlt;
    if (ok && from === null) from = ms;
    if ((!ok || ms + step > end) && from !== null) {
      const to = ok ? Math.min(ms + step, end) : ms;
      if (!best || to - from > best.to.getTime() - best.from.getTime())
        best = { from: new Date(from), to: new Date(to) };
      from = null;
    }
  }
  return best && best.to.getTime() - best.from.getTime() >= 20 * 60_000 ? best : null;
}

/** 매달 15일 현지 자정에 남중(LST ≈ RA)이 가장 가까운 달(1..12) */
export function bestMonthFor(
  t: ObjectTarget,
  observer: ObserverLike,
  year: number,
  tz: string,
): number | null {
  if (t.bodyKey === 'moon' || t.bodyKey === 'sun') return null;
  let best = 1;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let m = 1; m <= 12; m++) {
    const midnight = zonedDateTime(`${year}-${String(m).padStart(2, '0')}-15`, 0, tz);
    const lst = localSiderealTimeDeg(midnight, observer.lon);
    const ra = t.bodyKey
      ? bodyState(t.bodyKey, midnight, observer).raDeg
      : j2000ToOfDate(midnight, t.raJ2000Deg, t.decJ2000Deg).raDeg;
    const diff = Math.abs(wrap180(lst - ra));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  }
  return best;
}

export function computeObjectDetails(
  t: ObjectTarget,
  date: Date,
  observer: ObserverLike,
  night: ObservingNight,
  opts: DetailOptions = {},
): ObjectDetails {
  const bortle = opts.bortle ?? 7;
  const sun = bodyState('sun', date, observer);
  const moon = bodyState('moon', date, observer);

  // 지금
  let now: ObjectNow;
  if (t.bodyKey) {
    const s =
      t.bodyKey === 'sun'
        ? sun
        : t.bodyKey === 'moon'
          ? moon
          : bodyState(t.bodyKey, date, observer);
    now = {
      altDeg: s.altDeg,
      azDeg: s.azDeg,
      raDeg: s.raDeg,
      decDeg: s.decDeg,
      raJ2000Deg: s.raJ2000Deg,
      decJ2000Deg: s.decJ2000Deg,
      status: 'visible',
      sunAltDeg: sun.altDeg,
      sunSepDeg:
        t.bodyKey === 'sun' ? 0 : angularSeparationRaDec(s.raDeg, s.decDeg, sun.raDeg, sun.decDeg),
      moonSepDeg:
        t.bodyKey === 'moon'
          ? 0
          : angularSeparationRaDec(s.raDeg, s.decDeg, moon.raDeg, moon.decDeg),
      moonAltDeg: moon.altDeg,
      moonIllum: moon.phaseFraction,
      mag: s.magnitude,
      distance: t.bodyKey === 'moon' ? { km: s.distanceAu * AU_KM } : { au: s.distanceAu },
      angularDiameterArcsec: s.angularDiameterArcsec,
      phaseFraction: s.phaseFraction,
      moonPhaseDeg: s.moonPhaseDeg,
    };
  } else {
    const hor = eqjToAltAzSlow(date, observer, t.raJ2000Deg, t.decJ2000Deg, 'normal');
    const od = j2000ToOfDate(date, t.raJ2000Deg, t.decJ2000Deg);
    now = {
      altDeg: hor.altDeg,
      azDeg: hor.azDeg,
      raDeg: od.raDeg,
      decDeg: od.decDeg,
      raJ2000Deg: t.raJ2000Deg,
      decJ2000Deg: t.decJ2000Deg,
      status: 'visible',
      sunAltDeg: sun.altDeg,
      sunSepDeg: angularSeparationRaDec(od.raDeg, od.decDeg, sun.raDeg, sun.decDeg),
      moonSepDeg: angularSeparationRaDec(od.raDeg, od.decDeg, moon.raDeg, moon.decDeg),
      moonAltDeg: moon.altDeg,
      moonIllum: moon.phaseFraction,
      mag: t.mag,
      distance: t.distLy !== undefined ? { ly: t.distLy } : undefined,
    };
  }
  if (now.altDeg <= 0) now.status = 'belowHorizon';
  else if (t.bodyKey !== 'sun' && now.sunSepDeg < NEAR_SUN_DEG && sun.altDeg > -18)
    now.status = 'nearSun';
  else if (t.bodyKey !== 'sun' && sun.altDeg > -6) now.status = 'daylight';
  else if (t.bodyKey !== 'sun' && sun.altDeg > -18) now.status = 'twilight';

  // 오늘
  const rts = t.bodyKey
    ? riseTransitSetBody(t.bodyKey, observer, night.start, 1)
    : riseTransitSetFixed(t.raJ2000Deg, t.decJ2000Deg, observer, night.start, t.distLy, 1);
  const inNight = (d: Date | null) =>
    d && d.getTime() >= night.start.getTime() && d.getTime() <= night.end.getTime() ? d : null;
  const altAt = altAtFactory(t, observer);
  const span: Interval | null =
    night.darkSpan ??
    (night.timeline.sunset && night.timeline.sunrise
      ? { from: night.timeline.sunset, to: night.timeline.sunrise }
      : null);
  let bestWindow: Interval | null = null;
  let bestWindowMinAlt: number | null = null;
  if (span && t.bodyKey !== 'sun') {
    for (const minAlt of BEST_WINDOW_ALT) {
      bestWindow = longestRun(span, altAt, minAlt);
      if (bestWindow) {
        bestWindowMinAlt = minAlt;
        break;
      }
    }
  }
  const year = Number(night.key.slice(0, 4));
  const today: ObjectToday = {
    rise: inNight(rts.rise),
    transit: inNight(rts.transit),
    set: inNight(rts.set),
    transitAltDeg: rts.transitAltDeg,
    rtsStatus: rts.status,
    bestWindow,
    bestWindowMinAlt,
    bestMonth: bestMonthFor(t, observer, year, night.tz),
  };

  const verdicts = allVerdicts(
    {
      mag: now.mag,
      majArcmin: t.majArcmin,
      minArcmin: t.minArcmin,
      extended: t.extended,
      kind: t.kind,
      category: t.category,
    },
    {
      bortle,
      altDeg: now.altDeg,
      moon: {
        illumination: moon.phaseFraction,
        altDeg: moon.altDeg,
        separationDeg: now.moonSepDeg,
      },
    },
    opts.equipment ?? DEFAULT_EQUIPMENT,
  );

  return { id: t.id, kind: t.kind, now, today, verdicts, bortle };
}
