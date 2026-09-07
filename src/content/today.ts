/**
 * "오늘의 천체" 선택(task-06 §3.6, D-024):
 * 오늘 밤 실제로 보이는(어두운 구간 안에서 최고 고도 ≥ 25°) 콘텐츠 보유 대상 중
 * 미열람 우선 → 우선순위(1이 먼저) → 날짜 기반 결정적 셔플(같은 밤은 같은 카드). 태양은 제외.
 */
import { bodyState } from '@/astro/bodies';
import { eqjToAltAzSlow, type ObserverLike } from '@/astro/frames';
import type { Interval } from '@/astro/night';
import type { Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { resolveTarget, type J2000Fallback } from '@/catalog/objectTarget';
import type { ContentIndexEntry } from '@/content/schema';

export const TODAY_MIN_ALT_DEG = 25;
const STEP_MS = 30 * 60_000;

/** 문자열 → 32비트 해시(결정적 셔플용, FNV-1a) */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 구간 안(30분 간격)에서 대상의 최고 고도(굴절 없음). 대상을 못 풀면 null. */
export function maxAltitudeInWindow(
  cat: Catalog,
  id: ObjectId,
  observer: ObserverLike,
  window: Interval,
  fallback: J2000Fallback | null = null,
): number | null {
  const t0 = window.from.getTime();
  const t1 = window.to.getTime();
  if (!(t1 > t0)) return null;
  const mid = new Date((t0 + t1) / 2);
  const target = resolveTarget(cat, id, mid, observer, fallback);
  if (!target) return null;
  let best = -90;
  for (let t = t0; t <= t1; t += STEP_MS) {
    const d = new Date(t);
    const alt = target.bodyKey
      ? bodyState(target.bodyKey, d, observer).altDeg
      : eqjToAltAzSlow(d, observer, target.raJ2000Deg, target.decJ2000Deg, null).altDeg;
    if (alt > best) best = alt;
  }
  // 끝 시각도 한 번
  const end = new Date(t1);
  const altEnd = target.bodyKey
    ? bodyState(target.bodyKey, end, observer).altDeg
    : eqjToAltAzSlow(end, observer, target.raJ2000Deg, target.decJ2000Deg, null).altDeg;
  return Math.max(best, altEnd);
}

export interface TodayPick {
  id: ObjectId;
  altMaxDeg: number;
  unread: boolean;
}

export interface TodayPickInput {
  entries: readonly ContentIndexEntry[];
  readSet: ReadonlySet<ObjectId>;
  /** 밤 키('YYYY-MM-DD') — 같은 밤이면 같은 결과 */
  nightKey: string;
  /** 대상별 최고 고도(없으면 후보에서 제외) */
  altMaxOf: (id: ObjectId) => number | null;
  minAltDeg?: number;
}

/** 순수 선택 규칙. 후보가 없으면 null. */
export function pickTodayObject(input: TodayPickInput): TodayPick | null {
  const minAlt = input.minAltDeg ?? TODAY_MIN_ALT_DEG;
  const candidates: (TodayPick & { priority: number; h: number })[] = [];
  for (const e of input.entries) {
    if (e.id === 'sun') continue;
    const alt = input.altMaxOf(e.id);
    if (alt === null || alt < minAlt) continue;
    candidates.push({
      id: e.id,
      altMaxDeg: alt,
      unread: !input.readSet.has(e.id),
      priority: e.priority ?? 3,
      h: hash32(`${input.nightKey}|${e.id}`),
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      Number(b.unread) - Number(a.unread) ||
      a.priority - b.priority ||
      a.h - b.h ||
      a.id.localeCompare(b.id),
  );
  const top = candidates[0]!;
  return { id: top.id, altMaxDeg: top.altMaxDeg, unread: top.unread };
}
