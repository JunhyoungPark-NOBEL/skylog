/**
 * 관측 기록 통계(task-04 §3.6, A5) — 순수 함수. 삭제된 기록은 입력에 없다고 가정한다.
 * `outcome:'notSeen'`(시도)은 `attemptedCount`에만 들어가고, 나머지 수치는 전부 '본' 기록(seen) 기준이다.
 * 별자리 판정: 별·DSO는 카탈로그의 `con`, `const:`는 자기 자신, 행성·달·태양은 관측 시각·장소의 J2000 좌표로
 * `constellationAt`, 카탈로그에 없는 팩 전용 별은 `resolveJ2000`(하늘 씬)이 좌표를 주면 판정하고 없으면 제외한다.
 */
import { bodyKeyFromObjectId, bodyState, moonPhaseName, type MoonPhaseName } from '@/astro/bodies';
import { constellationAt } from '@/astro/frames';
import { nightKey as nightKeyOf } from '@/astro/time';
import type { Catalog } from '@/catalog/catalog';
import {
  kindOf,
  PLANET_KEYS,
  type ObjectId,
  type ObjectKind,
  type PlanetKey,
} from '@/catalog/objectId';
import type { Observation } from '@/db/types';

export const CONSTELLATION_TOTAL = 88;
export const MESSIER_TOTAL = 110;
export const CALDWELL_TOTAL = 109;
/** 월별 카운트 범위(최근 n개월) */
export const MONTHLY_MONTHS = 12;
/** 가장 많이 본 대상 개수 */
export const TOP_OBJECTS = 3;

/** 달 위상 8단계의 표준 순서(삭→초승→상현→…→그믐) */
export const MOON_PHASE_ORDER: readonly MoonPhaseName[] = [
  'new',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'full',
  'waningGibbous',
  'lastQuarter',
  'waningCrescent',
];

export interface ProgressStat<T> {
  /** 본 것(정렬됨) */
  done: T[];
  /** 아직 안 본 것(정렬됨) */
  remaining: T[];
  total: number;
}

/** 콜드웰은 번호→ObjectId가 카탈로그에 따라 다르므로(NGC/IC/C…) 둘 다 준다. 카탈로그에 없으면 id는 null */
export interface CaldwellEntry {
  n: number;
  id: ObjectId | null;
}

export interface TopObject {
  id: ObjectId;
  count: number;
  /** 마지막으로 본 시각(ISO) */
  lastAt: string;
}

export interface MonthCount {
  /** 'YYYY-MM' (nightKey 기준 — 자정 넘긴 기록은 그 밤의 달로) */
  ym: string;
  count: number;
}

export interface Streak {
  /** 오늘 밤(또는 어젯밤)으로 끝나는 연속 밤 수. 끊겼으면 0 */
  current: number;
  longest: number;
}

export interface LogStats {
  /** outcome:'seen' 기록 수 */
  seenCount: number;
  /** outcome:'notSeen'(시도) 기록 수 */
  attemptedCount: number;
  /** 본 대상(ObjectId 고유) 수 */
  objectCount: number;
  /** 관측 밤(nightKey 고유) 수 */
  nightCount: number;
  byKind: Record<ObjectKind, number>;
  /** IAU 3글자 약어(카탈로그 `constellations` 키와 같음) */
  constellations: ProgressStat<string>;
  messier: ProgressStat<number>;
  caldwell: { done: number[]; remaining: CaldwellEntry[]; total: number };
  planets: Record<PlanetKey, boolean>;
  moonSeen: boolean;
  sunSeen: boolean;
  /** 달을 본 기록의 `conditions.moonPhaseDeg`로 판정한 위상 단계(표준 순서) */
  moonPhases: MoonPhaseName[];
  streak: Streak;
  topObjects: TopObject[];
  /** 오래된 달 → 최근 달, MONTHLY_MONTHS개 */
  monthly: MonthCount[];
  /** 첫·마지막 관측 시각(ISO). 본 기록이 없으면 null */
  firstAt: string | null;
  lastAt: string | null;
}

export interface StatsOptions {
  /** "지금"(스트릭·월별 범위 기준). 기본 new Date() — 앱에서는 clockStore.now()를 넘긴다 */
  now?: Date;
  /** nightKey 시간대. 기본 'Asia/Seoul' */
  tz?: string;
  /** 카탈로그에 없는 팩 전용 별의 J2000 좌표(없으면 별자리 집계에서 제외) */
  resolveJ2000?: (id: ObjectId) => { raDeg: number; decDeg: number } | null;
}

const KINDS: readonly ObjectKind[] = ['star', 'dso', 'planet', 'moon', 'sun', 'const'];

/** 기록 하나가 속한 별자리(IAU 약어). 판정할 수 없으면 null */
export function constellationOf(
  o: Observation,
  cat: Catalog | null,
  resolveJ2000?: StatsOptions['resolveJ2000'],
): string | null {
  const id = o.objectId;
  const kind = kindOf(id);
  if (kind === 'const') return id.slice(6) || null;
  if (kind === 'star' || kind === 'dso') {
    const con = kind === 'star' ? cat?.starById.get(id)?.con : cat?.dsoById.get(id)?.con;
    if (con) return con;
    const j = resolveJ2000?.(id);
    return j ? constellationAt(j.raDeg, j.decDeg).symbol : null;
  }
  const key = bodyKeyFromObjectId(id);
  if (!key) return null;
  const at = new Date(o.observedAt);
  if (Number.isNaN(at.getTime())) return null;
  try {
    const st = bodyState(key, at, o.site);
    return constellationAt(st.raJ2000Deg, st.decJ2000Deg).symbol;
  } catch {
    return null;
  }
}

/** 'YYYY-MM-DD' → 1970-01-01 기준 일 번호 */
export function dayIndex(nightKey: string): number {
  const [y, m, d] = nightKey.split('-').map(Number);
  return Math.round(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/**
 * 연속 관측 스트릭(밤 기준). `todayKey`는 지금이 속한 밤의 nightKey.
 * 현재 스트릭은 오늘 밤으로 끝나는 연속 구간이고, 오늘 밤 기록이 아직 없으면 어젯밤으로 끝나는 구간을 살아 있는 것으로 본다.
 */
export function computeStreak(nights: Iterable<string>, todayKey: string): Streak {
  const days = [...new Set(nights)].map(dayIndex).sort((a, b) => a - b);
  const runEndingAt = new Map<number, number>();
  let longest = 0;
  let run = 0;
  let prev = Number.NaN;
  for (const d of days) {
    run = d === prev + 1 ? run + 1 : 1;
    prev = d;
    if (run > longest) longest = run;
    runEndingAt.set(d, run);
  }
  const today = dayIndex(todayKey);
  const current = runEndingAt.get(today) ?? runEndingAt.get(today - 1) ?? 0;
  return { current, longest };
}

/** `ymNow`('YYYY-MM')로 끝나는 최근 n개월(오래된 순) */
export function recentMonths(ymNow: string, n: number): string[] {
  const [y, m] = ymNow.split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function emptyKinds(): Record<ObjectKind, number> {
  return { star: 0, dso: 0, planet: 0, moon: 0, sun: 0, const: 0 };
}

function emptyPlanets(): Record<PlanetKey, boolean> {
  const out = {} as Record<PlanetKey, boolean>;
  for (const k of PLANET_KEYS) out[k] = false;
  return out;
}

function numRange(total: number): number[] {
  return Array.from({ length: total }, (_, i) => i + 1);
}

export function computeStats(
  observations: readonly Observation[],
  cat: Catalog | null,
  opts: StatsOptions = {},
): LogStats {
  const now = opts.now ?? new Date();
  const todayKey = nightKeyOf(now, opts.tz);

  const byKind = emptyKinds();
  const planets = emptyPlanets();
  const objects = new Map<ObjectId, { count: number; lastAt: string; lastMs: number }>();
  const nights = new Set<string>();
  const cons = new Set<string>();
  const messierDone = new Set<number>();
  const caldwellDone = new Set<number>();
  const phases = new Set<MoonPhaseName>();
  const monthCount = new Map<string, number>();
  let seenCount = 0;
  let attemptedCount = 0;
  let moonSeen = false;
  let sunSeen = false;
  let firstAt: string | null = null;
  let firstMs = Number.POSITIVE_INFINITY;
  let lastAt: string | null = null;
  let lastMs = Number.NEGATIVE_INFINITY;

  for (const o of observations) {
    if (o.outcome !== 'seen') {
      attemptedCount += 1;
      continue;
    }
    seenCount += 1;
    const id = o.objectId;
    const kind = kindOf(id);
    if (kind in byKind) byKind[kind] += 1;
    nights.add(o.nightKey);
    const ym = o.nightKey.slice(0, 7);
    monthCount.set(ym, (monthCount.get(ym) ?? 0) + 1);

    const ms = Date.parse(o.observedAt);
    const entry = objects.get(id) ?? { count: 0, lastAt: o.observedAt, lastMs: ms };
    entry.count += 1;
    if (ms > entry.lastMs) {
      entry.lastMs = ms;
      entry.lastAt = o.observedAt;
    }
    objects.set(id, entry);
    if (ms < firstMs) {
      firstMs = ms;
      firstAt = o.observedAt;
    }
    if (ms > lastMs) {
      lastMs = ms;
      lastAt = o.observedAt;
    }

    const con = constellationOf(o, cat, opts.resolveJ2000);
    if (con) cons.add(con);

    if (kind === 'dso') {
      const d = cat?.dsoById.get(id);
      if (d?.messier !== undefined) messierDone.add(d.messier);
      if (d?.caldwell !== undefined) caldwellDone.add(d.caldwell);
    } else if (kind === 'planet') {
      planets[id.slice(7) as PlanetKey] = true;
    } else if (kind === 'moon') {
      moonSeen = true;
      const deg = o.conditions?.moonPhaseDeg;
      if (deg !== undefined && Number.isFinite(deg)) phases.add(moonPhaseName(deg));
    } else if (kind === 'sun') {
      sunSeen = true;
    }
  }

  const allCons = cat ? Object.keys(cat.constellations) : [];
  const consDone = [...cons].sort();
  const consRemaining = allCons.filter((a) => !cons.has(a)).sort();

  const messierAll = numRange(MESSIER_TOTAL);
  const caldwellIdByNumber = new Map<number, ObjectId>();
  if (cat)
    for (const d of cat.dso) if (d.caldwell !== undefined) caldwellIdByNumber.set(d.caldwell, d.id);

  const byCount = [...objects.entries()]
    .map(([id, e]) => ({ id, count: e.count, lastAt: e.lastAt, lastMs: e.lastMs }))
    .sort((a, b) => b.count - a.count || b.lastMs - a.lastMs)
    .slice(0, TOP_OBJECTS)
    .map(({ id, count, lastAt: at }) => ({ id, count, lastAt: at }));

  const monthly = recentMonths(todayKey.slice(0, 7), MONTHLY_MONTHS).map((ym) => ({
    ym,
    count: monthCount.get(ym) ?? 0,
  }));

  return {
    seenCount,
    attemptedCount,
    objectCount: objects.size,
    nightCount: nights.size,
    byKind,
    constellations: { done: consDone, remaining: consRemaining, total: CONSTELLATION_TOTAL },
    messier: {
      done: [...messierDone].sort((a, b) => a - b),
      remaining: messierAll.filter((n) => !messierDone.has(n)),
      total: MESSIER_TOTAL,
    },
    caldwell: {
      done: [...caldwellDone].sort((a, b) => a - b),
      remaining: numRange(CALDWELL_TOTAL)
        .filter((n) => !caldwellDone.has(n))
        .map((n) => ({ n, id: caldwellIdByNumber.get(n) ?? null })),
      total: CALDWELL_TOTAL,
    },
    planets,
    moonSeen,
    sunSeen,
    moonPhases: MOON_PHASE_ORDER.filter((p) => phases.has(p)),
    streak: computeStreak(nights, todayKey),
    topObjects: byCount,
    monthly,
    firstAt,
    lastAt,
  };
}

/** 메시에 번호 → ObjectId(마스터 플랜 §6.1: M 우선) */
export function messierId(n: number): ObjectId {
  return `dso:M${n}`;
}

/** 종류 목록(표시 순서) */
export const KIND_ORDER = KINDS;
