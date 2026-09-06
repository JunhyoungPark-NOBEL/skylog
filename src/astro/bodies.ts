/**
 * 태양·달·행성의 현재 상태: 겉보기 RA/Dec(of date), alt/az(굴절 포함·미포함), 거리, 등급, 각지름, 위상, 밝은 가장자리 위치각.
 * astronomy-engine `Equator(body, time, observer, ofdate=true, aberration=true)` = 지심이 아닌 관측자 기준(topocentric) 겉보기 좌표.
 */
import { Body, Equator, Illumination, MoonPhase, type AstroTime } from 'astronomy-engine';
import { DEG, RAD, wrap360 } from '@/astro/coords';
import { makeObserver, ofDateToAltAz, type ObserverLike } from '@/astro/frames';
import { toAstroTime, type DateLike } from '@/astro/time';
import type { ObjectId, PlanetKey } from '@/catalog/objectId';

export type BodyKey = PlanetKey | 'sun' | 'moon';

export const BODY_OF_KEY: Record<BodyKey, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
};

/** 적도 반지름 km (IAU 2015 / NASA fact sheets) */
const RADIUS_KM: Record<BodyKey, number> = {
  sun: 695700,
  moon: 1737.4,
  mercury: 2439.7,
  venus: 6051.8,
  mars: 3396.2,
  jupiter: 71492,
  saturn: 60268,
  uranus: 25559,
  neptune: 24764,
};

export const AU_KM = 149597870.7;

export function bodyKeyFromObjectId(id: ObjectId): BodyKey | null {
  if (id === 'sun' || id === 'moon') return id;
  if (id.startsWith('planet:')) return id.slice(7) as PlanetKey;
  return null;
}

export function objectIdOfBody(key: BodyKey): ObjectId {
  return key === 'sun' || key === 'moon' ? key : `planet:${key}`;
}

export interface BodyState {
  key: BodyKey;
  /** 겉보기 적도 좌표(of date, topocentric), 도 */
  raDeg: number;
  decDeg: number;
  /** J2000 적도 좌표, 도 */
  raJ2000Deg: number;
  decJ2000Deg: number;
  /** 굴절 포함 겉보기 고도·방위 */
  altDeg: number;
  azDeg: number;
  /** 굴절 없는 고도 */
  altAirlessDeg: number;
  distanceAu: number;
  /** 겉보기 등급 */
  magnitude: number;
  angularDiameterArcsec: number;
  /** 조도 비율 0..1 */
  phaseFraction: number;
  /** 위상각(태양–천체–관측자), 도 */
  phaseAngleDeg: number;
  /** 달만: MoonPhase() 0..360 (0 삭, 90 상현, 180 망, 270 하현) */
  moonPhaseDeg?: number;
  /** 밝은 가장자리 위치각(북에서 동으로), 도 — 달·행성 */
  brightLimbAngleDeg?: number;
}

/** Meeus 48.5: 밝은 가장자리의 위치각 χ (북=0, 동쪽으로 증가) */
export function brightLimbAngleDeg(
  sun: { raDeg: number; decDeg: number },
  obj: { raDeg: number; decDeg: number },
): number {
  const a0 = sun.raDeg * DEG;
  const d0 = sun.decDeg * DEG;
  const a = obj.raDeg * DEG;
  const d = obj.decDeg * DEG;
  const y = Math.cos(d0) * Math.sin(a0 - a);
  const x = Math.sin(d0) * Math.cos(d) - Math.cos(d0) * Math.sin(d) * Math.cos(a0 - a);
  return wrap360(Math.atan2(y, x) * RAD);
}

export function angularDiameterArcsec(key: BodyKey, distanceAu: number): number {
  const r = RADIUS_KM[key];
  const d = distanceAu * AU_KM;
  return 2 * Math.asin(Math.min(1, r / d)) * RAD * 3600;
}

export function bodyState(key: BodyKey, date: DateLike, observer: ObserverLike): BodyState {
  const time: AstroTime = toAstroTime(date);
  const obs = makeObserver(observer);
  const body = BODY_OF_KEY[key];
  const eqd = Equator(body, time, obs, true, true);
  const eqj = Equator(body, time, obs, false, true);
  const raDeg = wrap360(eqd.ra * 15);
  const decDeg = eqd.dec;
  const refracted = ofDateToAltAz(time, obs, raDeg, decDeg, 'normal');
  const airless = ofDateToAltAz(time, obs, raDeg, decDeg, null);
  const illum = Illumination(body, time);

  const state: BodyState = {
    key,
    raDeg,
    decDeg,
    raJ2000Deg: wrap360(eqj.ra * 15),
    decJ2000Deg: eqj.dec,
    altDeg: refracted.altDeg,
    azDeg: refracted.azDeg,
    altAirlessDeg: airless.altDeg,
    distanceAu: eqd.dist,
    magnitude: illum.mag,
    angularDiameterArcsec: angularDiameterArcsec(key, eqd.dist),
    phaseFraction: illum.phase_fraction,
    phaseAngleDeg: illum.phase_angle,
  };
  if (key === 'moon') state.moonPhaseDeg = MoonPhase(time);
  if (key !== 'sun') {
    const sun = Equator(Body.Sun, time, obs, true, true);
    state.brightLimbAngleDeg = brightLimbAngleDeg(
      { raDeg: wrap360(sun.ra * 15), decDeg: sun.dec },
      { raDeg, decDeg },
    );
  }
  return state;
}

/** 달 위상 이름(한국어 키). MoonPhase() 각도 기준 8단계. */
export type MoonPhaseName =
  | 'new'
  | 'waxingCrescent'
  | 'firstQuarter'
  | 'waxingGibbous'
  | 'full'
  | 'waningGibbous'
  | 'lastQuarter'
  | 'waningCrescent';

export function moonPhaseName(phaseDeg: number): MoonPhaseName {
  const p = wrap360(phaseDeg);
  if (p < 22.5 || p >= 337.5) return 'new';
  if (p < 67.5) return 'waxingCrescent';
  if (p < 112.5) return 'firstQuarter';
  if (p < 157.5) return 'waxingGibbous';
  if (p < 202.5) return 'full';
  if (p < 247.5) return 'waningGibbous';
  if (p < 292.5) return 'lastQuarter';
  return 'waningCrescent';
}

/** 달의 이름·조도만 빠르게 (위젯용) */
export function moonSummary(date: DateLike): {
  phaseDeg: number;
  name: MoonPhaseName;
  illumination: number;
} {
  const time = toAstroTime(date);
  const phaseDeg = MoonPhase(time);
  return {
    phaseDeg,
    name: moonPhaseName(phaseDeg),
    illumination: Illumination(Body.Moon, time).phase_fraction,
  };
}
