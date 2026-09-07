/**
 * 이달의 천문 현상(task-03 §3.8). astronomy-engine 검색 함수로 계산한다(이 파일 안에서만 호출).
 * - 행성 충·합: `SearchRelativeLongitude(body, 0|180)` — 외행성 0° = 충, 180° = 합; 내행성 0° = 내합, 180° = 외합(엔진 문서).
 * - 내행성 최대이각: `SearchMaxElongation` (visibility 'morning'|'evening', elongation 도).
 * - 달 위상 4분기: `SearchMoonQuarter`/`NextMoonQuarter` (0 삭, 1 상현, 2 망, 3 하현).
 * - 월식: `SearchLunarEclipse` + 극대 시 달 고도 > 0이면 관측지에서 보임. 일식: `SearchGlobalSolarEclipse` + `SearchLocalSolarEclipse`(관측지 가시).
 * - 근지점 보름달: 망 ± 1일 안에 근지점(`SearchLunarApsis`).
 * - 유성우: `meteors.v1.json` 극대일 밤의 달 조도·복사점 고도 → 관측 조건 등급.
 */
import {
  ApsisKind,
  Body,
  NextLunarApsis,
  NextMoonQuarter,
  SearchGlobalSolarEclipse,
  SearchLocalSolarEclipse,
  SearchLunarApsis,
  SearchLunarEclipse,
  SearchMaxElongation,
  SearchMoonQuarter,
  SearchPeakMagnitude,
  SearchRelativeLongitude,
  type AstroTime,
} from 'astronomy-engine';
import { bodyState, BODY_OF_KEY, objectIdOfBody, type BodyKey } from '@/astro/bodies';
import { twilight } from '@/astro/events';
import { eqjToAltAzSlow, makeObserver, type ObserverLike } from '@/astro/frames';
import { observingNight } from '@/astro/night';
import { toAstroTime } from '@/astro/time';
import type { MeteorShower } from '@/catalog/meteors';
import type { ObjectId } from '@/catalog/objectId';
import { DEFAULT_TZ, zonedDateTime } from '@/ui/format';

export type PhenomenonKind =
  | 'opposition'
  | 'conjunction'
  | 'inferiorConjunction'
  | 'superiorConjunction'
  | 'maxElongation'
  | 'moonQuarter'
  | 'lunarEclipse'
  | 'solarEclipse'
  | 'perigeeFullMoon'
  | 'greatestBrilliancy'
  | 'meteorPeak';

/** 최대이각이 "보이려면" 시민박명(태양 −6°) 때 고도가 이 값 이상이어야 한다(가을 저녁 황도가 눕는 한국의 수성 문제) */
export const ELONGATION_MIN_ALT_DEG = 8;
/** 유성우 등급: moonFactor = 달 조도 × (1 − 어두운 창 비율) */
export const METEOR_GOOD_MAX = 0.15;
export const METEOR_FAIR_MAX = 0.45;

export type MeteorCondition = 'good' | 'fair' | 'poor';

export interface MeteorInfo {
  id: string;
  zhr: number;
  moonIllumination: number;
  radiantAltDeg: number;
  condition: MeteorCondition;
  /** 극대 밤의 관측 권장 시각(현지, 복사점이 높은 새벽) */
  bestAt: Date;
}

export interface Phenomenon {
  kind: PhenomenonKind;
  at: Date;
  bodyKey?: BodyKey;
  objectId?: ObjectId;
  /** 달 위상 4분기: 0 삭, 1 상현, 2 망, 3 하현 */
  quarter?: 0 | 1 | 2 | 3;
  /** 최대이각 */
  visibility?: 'morning' | 'evening';
  elongationDeg?: number;
  /** 식 */
  eclipseKind?: string;
  obscuration?: number;
  /** 관측지에서 보이는가(식·유성우) */
  visibleLocally?: boolean;
  altAtPeakDeg?: number;
  /** 식 지속(분): 부분식 반지속 ×2 */
  durationMin?: number;
  /** 유성우 */
  meteor?: MeteorInfo;
  /** 행성 근접(충 근처) 거리·등급 */
  distanceAu?: number;
  magnitude?: number;
}

const SUPERIOR: BodyKey[] = ['mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const INFERIOR: BodyKey[] = ['mercury', 'venus'];
const DAY_MS = 86_400_000;

export interface MonthRange {
  start: Date;
  end: Date;
}

export function monthRange(year: number, month: number, tz = DEFAULT_TZ): MonthRange {
  const mm = String(month).padStart(2, '0');
  const start = zonedDateTime(`${year}-${mm}-01`, 0, tz);
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const end = zonedDateTime(`${ny}-${String(nm).padStart(2, '0')}-01`, 0, tz);
  return { start, end };
}

function inRange(t: AstroTime | Date, r: MonthRange): boolean {
  const ms = t instanceof Date ? t.getTime() : t.date.getTime();
  return ms >= r.start.getTime() && ms < r.end.getTime();
}

/**
 * 유성우 관측 조건(극대일 밤 = 극대일 저녁 → 다음 날 새벽).
 * moonFactor = 달 조도 × (1 − 어두운 창 비율): 달이 밝아도 일찍 지면 좋은 밤. good ≤ 0.15, fair ≤ 0.45, 그 외 poor.
 * 복사점이 새벽 2시에 20° 아래면 good → fair.
 */
export function meteorCondition(
  shower: MeteorShower,
  year: number,
  observer: ObserverLike,
  tz = DEFAULT_TZ,
): MeteorInfo & { peakNight: Date } {
  const peakDate = zonedDateTime(`${year}-${shower.peak}`, 0, tz);
  const night = observingNight(observer, new Date(peakDate.getTime() + 21 * 3_600_000), tz);
  const bestAt = new Date(peakDate.getTime() + 26 * 3_600_000);
  const radiant = eqjToAltAzSlow(bestAt, observer, shower.radiant.ra, shower.radiant.dec, 'normal');
  const illum = night.moon.illumination;
  const spanMin = night.darkSpan ? (night.darkSpan.to.getTime() - night.darkSpan.from.getTime()) / 60_000 : 0;
  const darkFraction = spanMin > 0 ? Math.min(1, night.darkTotalMin / spanMin) : 0;
  const moonFactor = illum * (1 - darkFraction);
  let condition: MeteorCondition;
  if (moonFactor <= METEOR_GOOD_MAX) condition = 'good';
  else if (moonFactor <= METEOR_FAIR_MAX) condition = 'fair';
  else condition = 'poor';
  if (radiant.altDeg < 20 && condition === 'good') condition = 'fair';
  return {
    id: shower.id,
    zhr: shower.zhr,
    moonIllumination: illum,
    radiantAltDeg: radiant.altDeg,
    condition,
    bestAt,
    peakNight: peakDate,
  };
}

/** 최대이각 때 시민박명(태양 −6°) 시각의 행성 고도 — 한국에서 실제로 보이는지 */
function elongationAltitude(key: BodyKey, at: Date, visibility: 'morning' | 'evening', observer: ObserverLike): number {
  const t = twilight(observer, new Date(at.getTime() - 12 * 3_600_000), 'civil', visibility === 'morning' ? +1 : -1, 2);
  if (!t) return 0;
  return bodyState(key, t, observer).altDeg;
}

/** 지정한 달(현지)의 천문 현상 목록(시간순). 달 위상은 항상 하나 이상 있다. */
export function monthPhenomena(
  observer: ObserverLike,
  year: number,
  month: number,
  showers: MeteorShower[] = [],
  tz = DEFAULT_TZ,
): Phenomenon[] {
  const r = monthRange(year, month, tz);
  const out: Phenomenon[] = [];
  const startT = toAstroTime(r.start);
  const obs = makeObserver(observer);

  // 행성 충·합
  for (const key of SUPERIOR) {
    const body = BODY_OF_KEY[key];
    const opp = SearchRelativeLongitude(body, 0, startT);
    if (inRange(opp, r)) {
      const s = bodyState(key, opp.date, observer);
      out.push({
        kind: 'opposition',
        at: opp.date,
        bodyKey: key,
        objectId: objectIdOfBody(key),
        distanceAu: s.distanceAu,
        magnitude: s.magnitude,
      });
    }
    const conj = SearchRelativeLongitude(body, 180, startT);
    if (inRange(conj, r))
      out.push({ kind: 'conjunction', at: conj.date, bodyKey: key, objectId: objectIdOfBody(key) });
  }
  for (const key of INFERIOR) {
    const body = BODY_OF_KEY[key];
    const inf = SearchRelativeLongitude(body, 0, startT);
    if (inRange(inf, r))
      out.push({ kind: 'inferiorConjunction', at: inf.date, bodyKey: key, objectId: objectIdOfBody(key) });
    const sup = SearchRelativeLongitude(body, 180, startT);
    if (inRange(sup, r))
      out.push({ kind: 'superiorConjunction', at: sup.date, bodyKey: key, objectId: objectIdOfBody(key) });
    let from: AstroTime = startT;
    for (let i = 0; i < 3; i++) {
      const el = SearchMaxElongation(body, from);
      if (!inRange(el.time, r)) break;
      const vis = el.visibility === 'morning' ? 'morning' : 'evening';
      const alt = elongationAltitude(key, el.time.date, vis, observer);
      out.push({
        kind: 'maxElongation',
        at: el.time.date,
        bodyKey: key,
        objectId: objectIdOfBody(key),
        visibility: vis,
        elongationDeg: el.elongation,
        altAtPeakDeg: alt,
        visibleLocally: alt >= ELONGATION_MIN_ALT_DEG,
      });
      from = toAstroTime(new Date(el.time.date.getTime() + 5 * DAY_MS));
    }
  }
  // 금성 최대 광도(내합 전후 ≈36일)
  try {
    const peak = SearchPeakMagnitude(Body.Venus, startT);
    if (inRange(peak.time, r))
      out.push({ kind: 'greatestBrilliancy', at: peak.time.date, bodyKey: 'venus', objectId: 'planet:venus', magnitude: peak.mag });
  } catch {
    /* 엔진이 못 찾으면 생략 */
  }

  // 달 위상
  let mq = SearchMoonQuarter(startT);
  const fullMoons: Date[] = [];
  for (let i = 0; i < 8 && inRange(mq.time, r); i++) {
    out.push({
      kind: 'moonQuarter',
      at: mq.time.date,
      bodyKey: 'moon',
      objectId: 'moon',
      quarter: mq.quarter as 0 | 1 | 2 | 3,
    });
    if (mq.quarter === 2) fullMoons.push(mq.time.date);
    mq = NextMoonQuarter(mq);
  }
  // 근지점 보름달
  for (const full of fullMoons) {
    let apsis = SearchLunarApsis(toAstroTime(new Date(full.getTime() - 3 * DAY_MS)));
    if (apsis.kind !== ApsisKind.Pericenter) apsis = NextLunarApsis(apsis);
    if (Math.abs(apsis.time.date.getTime() - full.getTime()) <= DAY_MS)
      out.push({
        kind: 'perigeeFullMoon',
        at: full,
        bodyKey: 'moon',
        objectId: 'moon',
        distanceAu: apsis.dist_au,
      });
  }

  // 월식
  const lunar = SearchLunarEclipse(startT);
  if (inRange(lunar.peak, r)) {
    const moonAlt = bodyState('moon', lunar.peak.date, observer).altDeg;
    out.push({
      kind: 'lunarEclipse',
      at: lunar.peak.date,
      bodyKey: 'moon',
      objectId: 'moon',
      eclipseKind: lunar.kind,
      obscuration: lunar.obscuration,
      visibleLocally: moonAlt > 0,
      altAtPeakDeg: moonAlt,
      durationMin: Math.round((lunar.sd_partial > 0 ? lunar.sd_partial : lunar.sd_penum) * 2),
    });
  }
  // 일식
  const solar = SearchGlobalSolarEclipse(startT);
  if (inRange(solar.peak, r)) {
    let local: ReturnType<typeof SearchLocalSolarEclipse> | null = null;
    try {
      const l = SearchLocalSolarEclipse(startT, obs);
      if (Math.abs(l.peak.time.date.getTime() - solar.peak.date.getTime()) <= DAY_MS) local = l;
    } catch {
      local = null;
    }
    out.push({
      kind: 'solarEclipse',
      at: local ? local.peak.time.date : solar.peak.date,
      bodyKey: 'sun',
      objectId: 'sun',
      eclipseKind: local ? local.kind : solar.kind,
      obscuration: local ? local.obscuration : solar.obscuration,
      visibleLocally: !!local && local.peak.altitude > 0,
      altAtPeakDeg: local?.peak.altitude,
      durationMin: local
        ? Math.round(
            (local.partial_end.time.date.getTime() - local.partial_begin.time.date.getTime()) / 60_000,
          )
        : undefined,
    });
  }

  // 유성우
  for (const s of showers) {
    const mm = Number(s.peak.slice(0, 2));
    if (mm !== month) continue;
    const c = meteorCondition(s, year, observer, tz);
    const { peakNight, ...meteor } = c;
    out.push({
      kind: 'meteorPeak',
      at: peakNight,
      meteor,
      visibleLocally: meteor.radiantAltDeg > 0,
    });
  }

  out.sort((a, b) => a.at.getTime() - b.at.getTime());
  return out;
}

export interface SpecialEventLite {
  objectId: ObjectId;
  kind: 'opposition' | 'elongation' | 'meteorPeak' | 'fullMoon';
  at: Date;
  withinDays?: number;
}

/** 추천 엔진용 특별 이벤트(충·최대이각·근지점 보름달) 추출 */
export function specialEventsFrom(events: Phenomenon[]): SpecialEventLite[] {
  const out: SpecialEventLite[] = [];
  for (const e of events) {
    if (e.kind === 'opposition' && e.objectId)
      out.push({ objectId: e.objectId, kind: 'opposition', at: e.at, withinDays: 21 });
    else if (e.kind === 'maxElongation' && e.objectId)
      out.push({ objectId: e.objectId, kind: 'elongation', at: e.at, withinDays: 10 });
    else if (e.kind === 'perigeeFullMoon')
      out.push({ objectId: 'moon', kind: 'fullMoon', at: e.at, withinDays: 1 });
  }
  return out;
}
