/**
 * 출·남중·몰, 박명, 월출·월몰.
 * - 행성·달·태양: `SearchRiseSet` / `SearchHourAngle`.
 * - 별·DSO: `withStar()`가 `DefineStar(Body.Star1, raHours, decDeg, distLy ?? 1000)`을 **질의마다 재정의**한 뒤 같은 API 호출
 *   (슬롯이 Star1~Star8 8개뿐이므로 카탈로그 객체마다 정의하지 않는다). DefineStar는 J2000 RA(hours)/Dec를 받는다.
 * - 해석식(`riseSetAnalytic`)은 검증·근사용: cos H0 = (sin h0 − sin φ sin δ)/(cos φ cos δ), h0 = −0.5667° (Meeus ch.15).
 * - 박명: `SearchAltitude(Body.Sun, observer, direction, date, 1, −6|−12|−18)`.
 */
import {
  Body,
  DefineStar,
  Equator,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
  type AstroTime,
} from 'astronomy-engine';
import { DEG, RAD, wrap180 } from '@/astro/coords';
import { makeObserver, type ObserverLike } from '@/astro/frames';
import { BODY_OF_KEY, type BodyKey } from '@/astro/bodies';
import {
  addHours,
  localSiderealTimeDeg,
  SIDEREAL_DEG_PER_HOUR,
  toAstroTime,
  type DateLike,
} from '@/astro/time';

export interface RiseTransitSet {
  rise: Date | null;
  transit: Date | null;
  set: Date | null;
  /** 남중 고도(도, 굴절 없음) */
  transitAltDeg: number | null;
  /** 출몰이 없는 경우의 이유 */
  status: 'normal' | 'circumpolar' | 'neverRises';
}

/** 항성 굴절 기준 고도(34′). 태양은 반지름 16′을 더해 −0.8333° */
export const H0_STAR_DEG = -0.5667;
export const H0_SUN_DEG = -0.8333;

/**
 * DefineStar 슬롯을 재사용하는 래퍼. J2000 RA/Dec(도) → Body.Star1에 정의 → fn(Body.Star1).
 * 거리(광년)는 미상이면 1000 ly(시차 영향 무시 수준).
 */
export function withStar<T>(
  raDeg: number,
  decDeg: number,
  fn: (body: Body) => T,
  distLy = 1000,
): T {
  DefineStar(Body.Star1, raDeg / 15, decDeg, distLy > 0 ? distLy : 1000);
  return fn(Body.Star1);
}

function searchRTS(
  body: Body,
  observer: ObserverLike,
  date: DateLike,
  limitDays: number,
): RiseTransitSet {
  const time = toAstroTime(date);
  const obs = makeObserver(observer);
  const rise = SearchRiseSet(body, obs, +1, time, limitDays);
  const set = SearchRiseSet(body, obs, -1, time, limitDays);
  const transitEv = SearchHourAngle(body, obs, 0, time, +1);
  const transit = transitEv.time.date;
  const transitAltDeg = transitEv.hor.altitude;
  let status: RiseTransitSet['status'] = 'normal';
  if (!rise && !set) status = transitAltDeg > 0 ? 'circumpolar' : 'neverRises';
  return { rise: rise?.date ?? null, transit, set: set?.date ?? null, transitAltDeg, status };
}

/** 태양·달·행성의 다음 출·남중·몰 (date 이후 limitDays 안) */
export function riseTransitSetBody(
  key: BodyKey,
  observer: ObserverLike,
  date: DateLike,
  limitDays = 1,
): RiseTransitSet {
  return searchRTS(BODY_OF_KEY[key], observer, date, limitDays);
}

/** 별·DSO(J2000 RA/Dec, 도)의 다음 출·남중·몰 */
export function riseTransitSetFixed(
  raDeg: number,
  decDeg: number,
  observer: ObserverLike,
  date: DateLike,
  distLy?: number,
  limitDays = 1,
): RiseTransitSet {
  return withStar(raDeg, decDeg, (body) => searchRTS(body, observer, date, limitDays), distLy);
}

/**
 * 해석식 출·남중·몰(고정 좌표, of-date RA/Dec 권장). date 이후 첫 남중을 기준으로 출/몰을 계산한다.
 * 정밀도 ≈ ±1분(항성). 태양·달처럼 좌표가 움직이는 천체는 남중 근처 좌표를 넣고 두 번 반복하면 ±2분.
 */
export function riseSetAnalytic(
  raDeg: number,
  decDeg: number,
  observer: ObserverLike,
  date: Date,
  h0Deg = H0_STAR_DEG,
): RiseTransitSet {
  const lat = observer.lat * DEG;
  const dec = decDeg * DEG;
  const lst = localSiderealTimeDeg(date, observer.lon);
  // 남중: H = LST − RA = 0 → 현재 H를 시간으로 환산해 앞으로 이동
  let hNow = wrap180(lst - raDeg);
  if (hNow > 0) hNow -= 360; // 다음 남중(과거가 아니라 미래)
  const transit = addHours(date, -hNow / SIDEREAL_DEG_PER_HOUR);
  const transitAltDeg = 90 - Math.abs(observer.lat - decDeg);

  const cosH0 =
    (Math.sin(h0Deg * DEG) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec));
  if (cosH0 < -1) return { rise: null, transit, set: null, transitAltDeg, status: 'circumpolar' };
  if (cosH0 > 1) return { rise: null, transit, set: null, transitAltDeg, status: 'neverRises' };
  const h0Hours = (Math.acos(cosH0) * RAD) / SIDEREAL_DEG_PER_HOUR;
  return {
    rise: addHours(transit, -h0Hours),
    transit,
    set: addHours(transit, h0Hours),
    transitAltDeg,
    status: 'normal',
  };
}

/** 태양의 해석식 출몰(두 번 반복해 좌표 갱신). 검증용. */
export function sunRiseSetAnalytic(observer: ObserverLike, date: Date): RiseTransitSet {
  const obs = makeObserver(observer);
  const coordsAt = (t: Date) => {
    const eq = Equator(Body.Sun, toAstroTime(t), obs, true, true);
    return { raDeg: eq.ra * 15, decDeg: eq.dec };
  };
  let c = coordsAt(date);
  let r = riseSetAnalytic(c.raDeg, c.decDeg, observer, date, H0_SUN_DEG);
  if (r.transit) {
    c = coordsAt(r.transit);
    r = riseSetAnalytic(c.raDeg, c.decDeg, observer, date, H0_SUN_DEG);
  }
  return r;
}

export type TwilightKind = 'civil' | 'nautical' | 'astronomical';
const TWILIGHT_ALT: Record<TwilightKind, number> = { civil: -6, nautical: -12, astronomical: -18 };

/** date 이후 첫 박명 시각. direction +1 = 새벽(고도 상승), −1 = 저녁(고도 하강). 없으면 null(백야 등). */
export function twilight(
  observer: ObserverLike,
  date: DateLike,
  kind: TwilightKind,
  direction: 1 | -1,
  limitDays = 1,
): Date | null {
  const t = SearchAltitude(
    Body.Sun,
    makeObserver(observer),
    direction,
    toAstroTime(date),
    limitDays,
    TWILIGHT_ALT[kind],
  );
  return t?.date ?? null;
}

export interface NightTimeline {
  sunset: Date | null;
  civilDusk: Date | null;
  nauticalDusk: Date | null;
  astronomicalDusk: Date | null;
  astronomicalDawn: Date | null;
  nauticalDawn: Date | null;
  civilDawn: Date | null;
  sunrise: Date | null;
  moonrise: Date | null;
  moonset: Date | null;
}

/** 관측 밤 타임라인: date(보통 현지 정오~저녁) 이후 일몰부터 다음 일출까지 */
export function nightTimeline(observer: ObserverLike, date: DateLike): NightTimeline {
  const time: AstroTime = toAstroTime(date);
  const obs = makeObserver(observer);
  const sunset = SearchRiseSet(Body.Sun, obs, -1, time, 1.5)?.date ?? null;
  const from = sunset ?? time.date;
  const civilDusk = twilight(observer, from, 'civil', -1);
  const nauticalDusk = twilight(observer, from, 'nautical', -1);
  const astronomicalDusk = twilight(observer, from, 'astronomical', -1);
  const dawnFrom = astronomicalDusk ?? nauticalDusk ?? civilDusk ?? from;
  const astronomicalDawn = twilight(observer, dawnFrom, 'astronomical', +1);
  const nauticalDawn = twilight(observer, astronomicalDawn ?? dawnFrom, 'nautical', +1);
  const civilDawn = twilight(observer, nauticalDawn ?? dawnFrom, 'civil', +1);
  const sunrise = SearchRiseSet(Body.Sun, obs, +1, toAstroTime(from), 1.5)?.date ?? null;
  const moonrise = SearchRiseSet(Body.Moon, obs, +1, time, 1.5)?.date ?? null;
  const moonset = SearchRiseSet(Body.Moon, obs, -1, time, 1.5)?.date ?? null;
  return {
    sunset,
    civilDusk,
    nauticalDusk,
    astronomicalDusk,
    astronomicalDawn,
    nauticalDawn,
    civilDawn,
    sunrise,
    moonrise,
    moonset,
  };
}
