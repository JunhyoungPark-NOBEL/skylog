/**
 * 시간 유틸. 내부 시각은 UTC(Date / AstroTime), 표시는 기기 시간대(기본 Asia/Seoul).
 * 출처: astronomy-engine 문서 https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md
 */
import { AstroTime, MakeTime, SiderealTime } from 'astronomy-engine';
import { wrap360 } from '@/astro/coords';

export type DateLike = Date | number | AstroTime;

/** J2000.0 (2000-01-01T12:00:00 TT) 율리우스일 */
export const JD_J2000 = 2451545.0;

export function toAstroTime(date: DateLike): AstroTime {
  return date instanceof AstroTime ? date : MakeTime(date);
}

/** J2000.0 기준 경과 일수(UT) */
export function daysSinceJ2000(date: DateLike): number {
  return toAstroTime(date).ut;
}

/** 율리우스일(UT). JD = ut + 2451545.0 */
export function julianDate(date: DateLike): number {
  return daysSinceJ2000(date) + JD_J2000;
}

/** 그리니치 겉보기 항성시(GAST), 도(0..360). astronomy-engine `SiderealTime`(시간 단위) × 15 */
export function greenwichSiderealTimeDeg(date: DateLike): number {
  return wrap360(SiderealTime(toAstroTime(date)) * 15);
}

/** 지방 항성시, 도(0..360). lonDeg 동경 +. */
export function localSiderealTimeDeg(date: DateLike, lonDeg: number): number {
  return wrap360(greenwichSiderealTimeDeg(date) + lonDeg);
}

/** 항성일 기준 각속도(도/시간). 1 항성일 = 23h 56m 4.0905s → 360.98565°/일 */
export const SIDEREAL_DEG_PER_HOUR = 360.98564736629 / 24;

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

/** 관측 '밤' 키(마스터 플랜 §6.3): 현지 정오→정오, 시작일 'YYYY-MM-DD'. */
export function nightKey(date: Date, timeZone = 'Asia/Seoul'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = Number(get('hour'));
  let y = Number(get('year'));
  let m = Number(get('month'));
  let d = Number(get('day'));
  if (hour < 12) {
    // 정오 이전이면 전날 밤에 속한다
    const prev = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
    y = prev.getUTCFullYear();
    m = prev.getUTCMonth() + 1;
    d = prev.getUTCDate();
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
