/**
 * 기록 탭 순수 함수(task-04 §3.4): 밤별 그룹, 검색·필터, 달력 히트맵, 대상별 요약, 라벨 포맷.
 * React·DB 의존이 없어 Vitest로 검증한다(`tests/unit/features/log/logUtils.test.ts`).
 */
import type { Lang } from '@/app/i18n';
import { displayName, secondaryName, type Catalog } from '@/catalog/catalog';
import { kindOf, type ObjectId, type ObjectKind } from '@/catalog/objectId';
import type { EquipmentKind, Observation } from '@/db/types';
import { DEFAULT_TZ } from '@/ui/format';

/* ------------------------------------------------------------------ */
/* 공통                                                               */
/* ------------------------------------------------------------------ */

function byObservedAtDesc(a: Observation, b: Observation): number {
  return a.observedAt < b.observedAt ? 1 : a.observedAt > b.observedAt ? -1 : 0;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 검색 비교용 정규화: 소문자 + 공백 제거("M 31" = "m31") */
export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/* ------------------------------------------------------------------ */
/* 타임라인: 밤(nightKey)별 그룹                                        */
/* ------------------------------------------------------------------ */

export interface NightGroup {
  nightKey: string;
  /** 최근순 */
  rows: Observation[];
}

/** 밤별 그룹(최근 밤 먼저). 자정 넘은 기록도 `nightKey`가 같으므로 같은 그룹에 묶인다. */
export function groupByNight(rows: readonly Observation[]): NightGroup[] {
  const map = new Map<string, Observation[]>();
  for (const r of rows) {
    const list = map.get(r.nightKey);
    if (list) list.push(r);
    else map.set(r.nightKey, [r]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([nightKey, list]) => ({ nightKey, rows: [...list].sort(byObservedAtDesc) }));
}

/* ------------------------------------------------------------------ */
/* 검색·필터                                                           */
/* ------------------------------------------------------------------ */

export type LogPeriod = '7d' | '30d' | 'all';

export interface LogFilter {
  /** 대상명·태그 검색어 */
  query?: string;
  /** null = 전체 */
  kind?: ObjectKind | null;
  outcome?: Observation['outcome'] | null;
  equipment?: EquipmentKind | null;
  period?: LogPeriod;
}

export interface FilterContext {
  /** 기간 기준 "지금"(기본 new Date()). 시간 이동 중이면 clockStore의 now를 넘긴다. */
  now?: Date;
}

export const EMPTY_FILTER: LogFilter = {
  query: '',
  kind: null,
  outcome: null,
  equipment: null,
  period: 'all',
};

export function isFilterActive(f: LogFilter): boolean {
  return Boolean(
    (f.query && f.query.trim()) ||
    f.kind ||
    f.outcome ||
    f.equipment ||
    (f.period && f.period !== 'all'),
  );
}

/** 기간 시작 시각(없으면 null = 전체) */
export function periodStart(period: LogPeriod, now: Date): Date | null {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : null;
  return days === null ? null : new Date(now.getTime() - days * 86_400_000);
}

/** 대상 검색용 문자열(한·영 이름·부이름·id) — 카탈로그가 없으면 id만 */
export function objectHaystack(cat: Catalog | null, id: ObjectId): string {
  if (!cat) return normalizeQuery(id);
  const parts = [
    displayName(cat, id, 'ko'),
    displayName(cat, id, 'en'),
    secondaryName(cat, id, 'ko') ?? '',
    secondaryName(cat, id, 'en') ?? '',
    id,
  ];
  return normalizeQuery(parts.join(' '));
}

/** 종류·결과·장비·기간·검색어(대상명 또는 태그)로 거른다. 순서는 입력 그대로. */
export function filterObservations(
  rows: readonly Observation[],
  filter: LogFilter,
  cat: Catalog | null,
  ctx: FilterContext = {},
): Observation[] {
  const q = normalizeQuery(filter.query ?? '');
  const from = periodStart(filter.period ?? 'all', ctx.now ?? new Date());
  const fromIso = from?.toISOString();
  const haystacks = new Map<ObjectId, string>();
  const haystack = (id: ObjectId): string => {
    let h = haystacks.get(id);
    if (h === undefined) {
      h = objectHaystack(cat, id);
      haystacks.set(id, h);
    }
    return h;
  };
  return rows.filter((r) => {
    if (filter.kind && kindOf(r.objectId) !== filter.kind) return false;
    if (filter.outcome && r.outcome !== filter.outcome) return false;
    if (filter.equipment && r.equipment?.kind !== filter.equipment) return false;
    if (fromIso && r.observedAt < fromIso) return false;
    if (q) {
      if (haystack(r.objectId).includes(q)) return true;
      return r.tags.some((tag) => normalizeQuery(tag).includes(q));
    }
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* 달력                                                               */
/* ------------------------------------------------------------------ */

export type HeatLevel = 0 | 1 | 2 | 3;

export interface CalendarCell {
  /** 'YYYY-MM-DD' = nightKey */
  date: string;
  day: number;
  count: number;
  level: HeatLevel;
}

export interface CalendarMonth {
  year: number;
  /** 1..12 */
  month: number;
  /** 1일의 요일(0 = 일요일) */
  firstWeekday: number;
  daysInMonth: number;
  /** 7의 배수 길이. 앞뒤 빈칸은 null */
  cells: (CalendarCell | null)[];
  /** 이달 기록 수 */
  total: number;
}

/** 히트맵 단계: 0 / 1 / 2 / 3+ */
export function heatLevel(count: number): HeatLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

/** 한 달의 7열 그리드. 날짜 계산은 달력 날짜(UTC 산술)라 시간대와 무관하다. */
export function calendarMonth(
  year: number,
  month: number,
  rows: readonly Observation[],
): CalendarMonth {
  const prefix = `${year}-${pad2(month)}-`;
  const counts = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (!r.nightKey.startsWith(prefix)) continue;
    counts.set(r.nightKey, (counts.get(r.nightKey) ?? 0) + 1);
    total += 1;
  }
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (CalendarCell | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${prefix}${pad2(day)}`;
    const count = counts.get(date) ?? 0;
    cells.push({ date, day, count, level: heatLevel(count) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return { year, month, firstWeekday, daysInMonth, cells, total };
}

export interface YearMonth {
  year: number;
  month: number;
}

/** 월 이동(연도 경계 포함) */
export function shiftMonth(year: number, month: number, delta: number): YearMonth {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (((idx % 12) + 12) % 12) + 1 };
}

/** nightKey('YYYY-MM-DD') → 연·월 */
export function monthOfNight(nightKey: string): YearMonth {
  return { year: Number(nightKey.slice(0, 4)), month: Number(nightKey.slice(5, 7)) };
}

/* ------------------------------------------------------------------ */
/* 대상별                                                              */
/* ------------------------------------------------------------------ */

export interface ObjectSummary {
  objectId: ObjectId;
  /** 삭제 제외 전체 기록 수(시도 포함) */
  count: number;
  /** outcome:'seen' 수 */
  seenCount: number;
  /** 최근 기록 시각(ISO) */
  lastAt: string;
  lastNightKey: string;
  bestRating?: number;
  /** 한 번이라도 본 적 있음(금색 ★). 아니면 시도만(회색 ★) */
  seen: boolean;
}

/** 대상별 요약(최근순) */
export function byObject(rows: readonly Observation[]): ObjectSummary[] {
  const map = new Map<ObjectId, ObjectSummary>();
  for (const r of rows) {
    const cur = map.get(r.objectId);
    if (!cur) {
      map.set(r.objectId, {
        objectId: r.objectId,
        count: 1,
        seenCount: r.outcome === 'seen' ? 1 : 0,
        lastAt: r.observedAt,
        lastNightKey: r.nightKey,
        bestRating: r.rating,
        seen: r.outcome === 'seen',
      });
      continue;
    }
    cur.count += 1;
    if (r.outcome === 'seen') {
      cur.seenCount += 1;
      cur.seen = true;
    }
    if (r.observedAt > cur.lastAt) {
      cur.lastAt = r.observedAt;
      cur.lastNightKey = r.nightKey;
    }
    if (r.rating !== undefined && (cur.bestRating === undefined || r.rating > cur.bestRating))
      cur.bestRating = r.rating;
  }
  return sortObjectSummaries([...map.values()], 'recent', (id) => id);
}

export type ObjectSort = 'recent' | 'name' | 'count';

/** 정렬: 최근순 / 이름순(현지 정렬) / 횟수순. 동률은 최근순. */
export function sortObjectSummaries(
  items: readonly ObjectSummary[],
  sort: ObjectSort,
  nameOf: (id: ObjectId) => string,
  lang: Lang = 'ko',
): ObjectSummary[] {
  const recent = (a: ObjectSummary, b: ObjectSummary) =>
    a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0;
  const out = [...items];
  switch (sort) {
    case 'name':
      out.sort(
        (a, b) => nameOf(a.objectId).localeCompare(nameOf(b.objectId), lang) || recent(a, b),
      );
      break;
    case 'count':
      out.sort((a, b) => b.count - a.count || recent(a, b));
      break;
    case 'recent':
      out.sort(recent);
      break;
  }
  return out;
}

/** 최근 기록한 대상(중복 제거, 최근순) — 빠른 선택 제안용 */
export function recentObjectIds(rows: readonly Observation[], limit = 8): ObjectId[] {
  const seen = new Set<ObjectId>();
  const out: ObjectId[] = [];
  for (const r of [...rows].sort(byObservedAtDesc)) {
    if (seen.has(r.objectId)) continue;
    seen.add(r.objectId);
    out.push(r.objectId);
    if (out.length >= limit) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 라벨                                                               */
/* ------------------------------------------------------------------ */

const MONTH_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** "9월 6일 밤" / "Night of Sep 6" — 올해가 아니면 연도를 붙인다 */
export function nightLabel(nightKey: string, lang: Lang, currentYear?: number): string {
  const y = Number(nightKey.slice(0, 4));
  const m = Number(nightKey.slice(5, 7));
  const d = Number(nightKey.slice(8, 10));
  const withYear = currentYear !== undefined && y !== currentYear;
  if (lang === 'ko') return withYear ? `${y}년 ${m}월 ${d}일 밤` : `${m}월 ${d}일 밤`;
  const md = `${MONTH_EN[m - 1] ?? m} ${d}`;
  return withYear ? `Night of ${md}, ${y}` : `Night of ${md}`;
}

/** "2026년 9월" / "September 2026" */
export function monthLabel(year: number, month: number, lang: Lang): string {
  if (lang === 'ko') return `${year}년 ${month}월`;
  const long = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  return `${long} ${year}`;
}

/** 현지 "YYYY-MM-DD HH:MM" */
export function formatLocalDateTime(iso: string, tz = DEFAULT_TZ): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/** 평점 글리프 "★★★☆☆" */
export function ratingGlyphs(rating: number | undefined): string {
  if (!rating) return '';
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

/** 관측지 표시: 이름이 없으면 좌표 */
export function siteLabel(site: Observation['site']): string {
  if (site.name) return site.name;
  return `${site.lat.toFixed(3)}, ${site.lon.toFixed(3)}`;
}
