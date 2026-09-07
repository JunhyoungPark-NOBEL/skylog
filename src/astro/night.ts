/**
 * 관측 밤(task-03 §3.4): 현지 정오→다음 정오(`nightKey`). 일몰·박명 3단계·일출, 달 출몰·위상·달 나이,
 * 달이 지평선 위인 구간, **어두운 창(dark window)** = 천문박명 종료~시작 중 달 고도 < 10° 구간.
 * 태양·달 사건은 astronomy-engine 검색 함수(`events.ts`), 창 경계는 5분 샘플 + 이분법(≈1분).
 */
import { Body, SearchRiseSet } from 'astronomy-engine';
import { bodyState, moonPhaseName, type MoonPhaseName } from '@/astro/bodies';
import { nightTimeline, twilight, type NightTimeline } from '@/astro/events';
import { makeObserver, type ObserverLike } from '@/astro/frames';
import { nightKey, toAstroTime } from '@/astro/time';
import { DEFAULT_TZ, zonedDateTime } from '@/ui/format';

export type NightSegmentKind = 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';

export interface Interval {
  from: Date;
  to: Date;
}

export interface NightSegment extends Interval {
  kind: NightSegmentKind;
}

export interface ObservingNight {
  key: string;
  /** 현지 정오 */
  start: Date;
  /** 다음 날 정오 */
  end: Date;
  tz: string;
  timeline: NightTimeline;
  /** start..end를 빈틈없이 덮는 태양 기준 구간 */
  segments: NightSegment[];
  /** 가장 어두운 구간(천문박명 사이). 없으면 항해박명 사이, 그것도 없으면 null */
  darkSpan: Interval | null;
  darkSpanKind: 'astronomical' | 'nautical' | 'none';
  /** 달이 지평선 위인 구간(밤 안) */
  moonAbove: Interval[];
  /** 밤 안의 월출·월몰(여러 개일 수 있음) */
  moonrises: Date[];
  moonsets: Date[];
  moon: { phaseDeg: number; name: MoonPhaseName; illumination: number; ageDays: number };
  /** 어두운 창(달 없음 또는 달 고도 < 10°) */
  darkWindows: Interval[];
  darkTotalMin: number;
}

export const SYNODIC_MONTH_DAYS = 29.530588;
export const MOON_DARK_ALT_DEG = 10;

/** 달 고도(굴절 포함) */
function moonAlt(observer: ObserverLike, t: Date): number {
  return bodyState('moon', t, observer).altDeg;
}

function bisect(a: Date, b: Date, pred: (t: Date) => boolean, iterations = 3): Date {
  // a: pred 결과 X, b: pred 결과 Y (다름). 경계를 b 쪽으로 좁힌다.
  let lo = a.getTime();
  let hi = b.getTime();
  const target = pred(b);
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (pred(new Date(mid)) === target) hi = mid;
    else lo = mid;
  }
  return new Date(hi);
}

/** 어두운 창 계산(순수): span 안에서 pred(t) = "어둡다"인 구간들 */
export function windowsWhere(
  span: Interval,
  pred: (t: Date) => boolean,
  stepMin = 5,
  refine?: (a: Date, b: Date) => Date,
): Interval[] {
  const out: Interval[] = [];
  const step = stepMin * 60_000;
  let prevT = span.from;
  let prevDark = pred(prevT);
  let openFrom: Date | null = prevDark ? span.from : null;
  for (let ms = span.from.getTime() + step; ms < span.to.getTime() + step; ms += step) {
    const t = new Date(Math.min(ms, span.to.getTime()));
    const dark = pred(t);
    if (dark !== prevDark) {
      const edge = refine ? refine(prevT, t) : t;
      if (dark) openFrom = edge;
      else if (openFrom) {
        out.push({ from: openFrom, to: edge });
        openFrom = null;
      }
    }
    prevDark = dark;
    prevT = t;
    if (t.getTime() >= span.to.getTime()) break;
  }
  if (openFrom) out.push({ from: openFrom, to: span.to });
  return out.filter((w) => w.to.getTime() - w.from.getTime() >= 60_000);
}

function moonIntervals(
  observer: ObserverLike,
  start: Date,
  end: Date,
): {
  above: Interval[];
  rises: Date[];
  sets: Date[];
} {
  const obs = makeObserver(observer);
  const rises: Date[] = [];
  const sets: Date[] = [];
  const above: Interval[] = [];
  let t = start;
  let up = moonAlt(observer, start) > 0;
  let openFrom: Date | null = up ? start : null;
  for (let guard = 0; guard < 6; guard++) {
    const ev = SearchRiseSet(Body.Moon, obs, up ? -1 : +1, toAstroTime(t), 1.2);
    if (!ev || ev.date.getTime() >= end.getTime()) break;
    if (up) {
      sets.push(ev.date);
      if (openFrom) above.push({ from: openFrom, to: ev.date });
      openFrom = null;
    } else {
      rises.push(ev.date);
      openFrom = ev.date;
    }
    up = !up;
    t = new Date(ev.date.getTime() + 60_000);
  }
  if (openFrom) above.push({ from: openFrom, to: end });
  return { above, rises, sets };
}

/** 관측 밤을 계산한다. date는 그 밤에 속하는 아무 시각(정오 이전이면 전날 밤). */
export function observingNight(
  observer: ObserverLike,
  date: Date,
  tz = DEFAULT_TZ,
): ObservingNight {
  const key = nightKey(date, tz);
  const start = zonedDateTime(key, 12, tz);
  const end = new Date(start.getTime() + 24 * 3_600_000);
  const timeline = nightTimeline(observer, start);
  // nightTimeline은 일몰 이전 시각을 기준으로 새벽 박명을 찾으므로 밤 밖으로 벗어나지 않는지 확인
  const inNight = (d: Date | null) =>
    d && d.getTime() >= start.getTime() && d.getTime() <= end.getTime() ? d : null;
  const tl: NightTimeline = {
    ...timeline,
    sunset: inNight(timeline.sunset),
    civilDusk: inNight(timeline.civilDusk),
    nauticalDusk: inNight(timeline.nauticalDusk),
    astronomicalDusk: inNight(timeline.astronomicalDusk),
    astronomicalDawn: inNight(timeline.astronomicalDawn),
    nauticalDawn: inNight(timeline.nauticalDawn),
    civilDawn: inNight(timeline.civilDawn),
    sunrise: inNight(timeline.sunrise),
  };
  // 백야가 아닌데 새벽 박명이 저녁 박명보다 앞에 오는 이상 케이스 방지
  if (tl.astronomicalDusk && tl.astronomicalDawn && tl.astronomicalDawn < tl.astronomicalDusk)
    tl.astronomicalDawn = inNight(twilight(observer, tl.astronomicalDusk, 'astronomical', +1));

  // 태양 구간
  const bounds: { at: Date; next: NightSegmentKind }[] = [];
  const push = (d: Date | null, next: NightSegmentKind) => {
    if (d) bounds.push({ at: d, next });
  };
  push(tl.sunset, 'civil');
  push(tl.civilDusk, 'nautical');
  push(tl.nauticalDusk, 'astronomical');
  push(tl.astronomicalDusk, 'night');
  push(tl.astronomicalDawn, 'astronomical');
  push(tl.nauticalDawn, 'nautical');
  push(tl.civilDawn, 'civil');
  push(tl.sunrise, 'day');
  bounds.sort((a, b) => a.at.getTime() - b.at.getTime());
  const segments: NightSegment[] = [];
  let cursor = start;
  let kind: NightSegmentKind = 'day';
  for (const b of bounds) {
    if (b.at.getTime() > cursor.getTime()) segments.push({ from: cursor, to: b.at, kind });
    cursor = b.at;
    kind = b.next;
  }
  if (cursor.getTime() < end.getTime()) segments.push({ from: cursor, to: end, kind });

  let darkSpan: Interval | null = null;
  let darkSpanKind: ObservingNight['darkSpanKind'] = 'none';
  if (tl.astronomicalDusk && tl.astronomicalDawn) {
    darkSpan = { from: tl.astronomicalDusk, to: tl.astronomicalDawn };
    darkSpanKind = 'astronomical';
  } else if (tl.nauticalDusk && tl.nauticalDawn) {
    darkSpan = { from: tl.nauticalDusk, to: tl.nauticalDawn };
    darkSpanKind = 'nautical';
  }

  const moonIv = moonIntervals(observer, start, end);
  const mid = new Date(start.getTime() + 12 * 3_600_000);
  const ms = bodyState('moon', mid, observer);
  const phaseDeg = ms.moonPhaseDeg ?? 0;
  const moon = {
    phaseDeg,
    name: moonPhaseName(phaseDeg),
    illumination: ms.phaseFraction,
    ageDays: (phaseDeg / 360) * SYNODIC_MONTH_DAYS,
  };

  const darkWindows = darkSpan
    ? windowsWhere(
        darkSpan,
        (t) => moonAlt(observer, t) < MOON_DARK_ALT_DEG,
        5,
        (a, b) => bisect(a, b, (t) => moonAlt(observer, t) < MOON_DARK_ALT_DEG),
      )
    : [];
  const darkTotalMin = darkWindows.reduce(
    (s, w) => s + (w.to.getTime() - w.from.getTime()) / 60_000,
    0,
  );

  return {
    key,
    start,
    end,
    tz,
    timeline: tl,
    segments,
    darkSpan,
    darkSpanKind,
    moonAbove: moonIv.above,
    moonrises: moonIv.rises,
    moonsets: moonIv.sets,
    moon,
    darkWindows,
    darkTotalMin,
  };
}

/** 어두운 정도(0 낮 … 1 천문 밤) — 타임라인 그라데이션용 */
export function darknessLevel(kind: NightSegmentKind): number {
  switch (kind) {
    case 'day':
      return 0;
    case 'civil':
      return 0.25;
    case 'nautical':
      return 0.55;
    case 'astronomical':
      return 0.8;
    case 'night':
      return 1;
  }
}

/** 시각 t가 속한 구간 종류 */
export function segmentAt(night: ObservingNight, t: Date): NightSegmentKind {
  const ms = t.getTime();
  for (const s of night.segments) if (ms >= s.from.getTime() && ms < s.to.getTime()) return s.kind;
  return 'day';
}

export function intervalsOverlap(a: Interval, b: Interval): Interval | null {
  const from = Math.max(a.from.getTime(), b.from.getTime());
  const to = Math.min(a.to.getTime(), b.to.getTime());
  return to > from ? { from: new Date(from), to: new Date(to) } : null;
}
