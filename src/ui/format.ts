/**
 * 표시 포맷 유틸(task-03 §4): 16방위, 시분초·도분초, 현지 시각, 시간 길이, 거리, 각크기. 전부 순수 함수.
 */
import type { Lang } from '@/app/i18n';
import { wrap360 } from '@/astro/coords';

export const DEFAULT_TZ = 'Asia/Seoul';

const COMPASS16_KO = [
  '북',
  '북북동',
  '북동',
  '동북동',
  '동',
  '동남동',
  '남동',
  '남남동',
  '남',
  '남남서',
  '남서',
  '서남서',
  '서',
  '서북서',
  '북서',
  '북북서',
] as const;
const COMPASS16_EN = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

/** 방위(도, 북=0 동=90) → 16방위 이름 */
export function compass16(azDeg: number, lang: Lang = 'ko'): string {
  const i = Math.round(wrap360(azDeg) / 22.5) % 16;
  return (lang === 'ko' ? COMPASS16_KO : COMPASS16_EN)[i]!;
}

/** "남동 132°" */
export function formatAzimuth(azDeg: number, lang: Lang = 'ko', digits = 0): string {
  return `${compass16(azDeg, lang)} ${wrap360(azDeg).toFixed(digits)}°`;
}

export function formatAlt(altDeg: number, digits = 1): string {
  return `${altDeg >= 0 ? '+' : '−'}${Math.abs(altDeg).toFixed(digits)}°`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 적경(도) → "18h 36m 56.3s" */
export function formatHms(raDeg: number, secDigits = 1): string {
  const totalSec = (wrap360(raDeg) / 15) * 3600;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec - h * 3600) / 60);
  const s = totalSec - h * 3600 - m * 60;
  const sStr = s.toFixed(secDigits).padStart(secDigits > 0 ? 3 + secDigits : 2, '0');
  // 반올림으로 60.0s가 되는 경우
  if (sStr.startsWith('60')) return formatHms(raDeg + 1e-6 * 15 * 1.5, secDigits);
  return `${pad2(h)}h ${pad2(m)}m ${sStr}s`;
}

/** 적위·각도(도) → "+38° 47′ 01″" */
export function formatDms(deg: number, secDigits = 0, signed = true): string {
  const sign = deg < 0 ? '−' : signed ? '+' : '';
  const abs = Math.abs(deg);
  const totalSec = abs * 3600;
  const d = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec - d * 3600) / 60);
  const s = totalSec - d * 3600 - m * 60;
  const sStr = s.toFixed(secDigits).padStart(secDigits > 0 ? 3 + secDigits : 2, '0');
  if (sStr.startsWith('60')) return formatDms(deg + Math.sign(deg || 1) * 1e-7, secDigits, signed);
  return `${sign}${d}° ${pad2(m)}′ ${sStr}″`;
}

const timeFmtCache = new Map<string, Intl.DateTimeFormat>();
function timeFmt(tz: string, withDate: boolean): Intl.DateTimeFormat {
  const key = `${tz}|${withDate}`;
  let f = timeFmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(withDate ? { month: '2-digit', day: '2-digit' } : {}),
    });
    timeFmtCache.set(key, f);
  }
  return f;
}

/** 현지 시각 "HH:MM" (null이면 "—") */
export function formatTime(date: Date | null | undefined, tz = DEFAULT_TZ): string {
  if (!date || Number.isNaN(date.getTime())) return '—';
  const parts = timeFmt(tz, false).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('hour')}:${get('minute')}`;
}

/** "09-06 21:04" */
export function formatDateTime(date: Date | null | undefined, tz = DEFAULT_TZ): string {
  if (!date || Number.isNaN(date.getTime())) return '—';
  const parts = timeFmt(tz, true).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/** 시간 길이(분) → "2시간 10분" / "2h 10m" */
export function formatDuration(minutes: number, lang: Lang = 'ko'): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (lang === 'ko') {
    if (h === 0) return `${r}분`;
    return r === 0 ? `${h}시간` : `${h}시간 ${r}분`;
  }
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

/** 시간 차(ms) → 사람이 읽는 상대 시간 "3시간 20분 뒤" */
export function formatRelative(fromMs: number, toMs: number, lang: Lang = 'ko'): string {
  const diffMin = (toMs - fromMs) / 60_000;
  const d = formatDuration(Math.abs(diffMin), lang);
  if (lang === 'ko') return diffMin >= 0 ? `${d} 뒤` : `${d} 전`;
  return diffMin >= 0 ? `in ${d}` : `${d} ago`;
}

export interface Distance {
  ly?: number;
  au?: number;
  km?: number;
}

/** 거리 표기: 광년(≥1 ly) / AU / km. 큰 수는 천 단위 구분 */
export function formatDistance(d: Distance | undefined, lang: Lang = 'ko'): string {
  if (!d) return '—';
  const nf = new Intl.NumberFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 1 });
  if (d.ly !== undefined && d.ly > 0) {
    if (d.ly >= 1e6) return `${nf.format(d.ly / 1e6)}${lang === 'ko' ? '백만 광년' : ' Mly'}`;
    if (d.ly >= 1e4)
      return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(d.ly)}${lang === 'ko' ? ' 광년' : ' ly'}`;
    return `${nf.format(d.ly)}${lang === 'ko' ? ' 광년' : ' ly'}`;
  }
  if (d.km !== undefined)
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(d.km)} km`;
  if (d.au !== undefined) return `${d.au.toFixed(d.au < 1 ? 3 : 2)} AU`;
  return '—';
}

/** 각크기: 분(′) 기준. 2° 이상은 도, 1′ 미만은 초 */
export function formatAngularSize(majArcmin: number | undefined, minArcmin?: number): string {
  if (majArcmin === undefined || !(majArcmin > 0)) return '—';
  const one = (a: number) => {
    if (a >= 120) return `${(a / 60).toFixed(1)}°`;
    if (a < 1) return `${(a * 60).toFixed(0)}″`;
    return `${a.toFixed(a < 10 ? 1 : 0)}′`;
  };
  return minArcmin && minArcmin > 0 && Math.abs(minArcmin - majArcmin) > 0.05 * majArcmin
    ? `${one(majArcmin)} × ${one(minArcmin)}`
    : one(majArcmin);
}

export function formatMag(mag: number | undefined): string {
  return mag === undefined ? '—' : mag.toFixed(1);
}

/** 각거리: 1° 미만은 분 */
export function formatSeparation(deg: number): string {
  return deg < 1 ? `${(deg * 60).toFixed(0)}′` : `${deg.toFixed(deg < 10 ? 1 : 0)}°`;
}

/** 시간대 오프셋(분). Intl로 계산하므로 DST 있는 시간대도 맞다. */
export function tzOffsetMinutes(date: Date, tz = DEFAULT_TZ): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** 'YYYY-MM-DD' + 현지 시(0..24) → Date(UTC 순간) */
export function zonedDateTime(ymd: string, hour: number, tz = DEFAULT_TZ, minute = 0): Date {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  const off = tzOffsetMinutes(guess, tz);
  const first = new Date(guess.getTime() - off * 60_000);
  // DST 경계 보정(한 번 더)
  const off2 = tzOffsetMinutes(first, tz);
  return off2 === off ? first : new Date(guess.getTime() - off2 * 60_000);
}
