/**
 * 검색 엔진 (task-03 §3.1, D-019). 외부 라이브러리 없이 `search-index.v1.json`(항목당 정규화 별칭 배열)을 선형 탐색한다.
 * 인덱스가 이미 정규화되어 있고(3,929 항목·약 3만 별칭) 질의당 수 ms면 충분하므로 MiniSearch/Fuse는 쓰지 않는다.
 *
 * 등급(tier): exact(0) < prefix(1) < substring(2) < fuzzy(3, 편집 거리 1·질의 4자 이상). 초성 질의("ㅈㄴㅅ")는 prefix 등급.
 * 같은 등급 안에서는 밝은 것(mag 오름차순) → 지금 지평선 위인 것 우선. 유명 천체(`famous.ts`)는 등급 안에서 5점 보너스.
 * 별자리의 "…자리"를 뗀 별칭(안드로메다)은 **약한 별칭**으로 보아 정확 일치라도 prefix 등급 — "안드로메다"는 M31이 1위여야 한다(§6).
 */
import { dataUrl } from '@/catalog/manifest';
import { FAMOUS_SET } from '@/catalog/famous';
import { expandKoreanQuery } from '@/catalog/koreanLatin';
import { hasHangul, isChoseongQuery, normalizeAlias, toChoseong } from '@/catalog/normalize';
import type { ObjectId } from '@/catalog/objectId';

export type SearchKind = 'star' | 'dso' | 'planet' | 'moon' | 'sun' | 'const';

export interface SearchEntry {
  id: ObjectId;
  kind: SearchKind;
  con?: string;
  mag?: number;
  /** 정규화된 별칭 */
  n: string[];
}

interface PreparedEntry extends SearchEntry {
  /** 한글 별칭의 초성 형태(초성 검색용) */
  c: string[];
  /** 약한 별칭 인덱스(정확 일치를 prefix로 강등) */
  weak: Set<number>;
  famous: boolean;
}

export type MatchTier = 'exact' | 'prefix' | 'substring' | 'fuzzy';

export interface SearchHit {
  id: ObjectId;
  kind: SearchKind;
  con?: string;
  mag?: number;
  tier: MatchTier;
  /** 일치한 별칭(정규화) */
  matched: string;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  /** 종류 필터(없으면 전체) */
  kinds?: ReadonlySet<SearchKind> | null;
  /** 추가 필터(카테고리 칩 등) */
  filter?: (entry: SearchEntry) => boolean;
  /** 지금 고도(도). 지평선 위 우선 정렬에 쓴다. undefined면 무시 */
  altOf?: (id: ObjectId) => number | undefined;
}

const TIER_SCORE: Record<MatchTier, number> = { exact: 0, prefix: 100, substring: 200, fuzzy: 300 };
const FUZZY_MIN_LEN = 4;
const DEFAULT_LIMIT = 50;

let prepared: PreparedEntry[] | null = null;
let loading: Promise<PreparedEntry[]> | null = null;
/** 마지막 검색에 걸린 시간(ms) — 디버그·수용 기준(< 50ms) 확인용 */
export let lastSearchMs = 0;

function prepare(entries: SearchEntry[]): PreparedEntry[] {
  return entries.map((e) => {
    const weak = new Set<number>();
    if (e.kind === 'const') {
      const set = new Set(e.n);
      e.n.forEach((a, i) => {
        if (hasHangul(a) && !a.endsWith('자리') && set.has(`${a}자리`)) weak.add(i);
      });
    }
    return {
      ...e,
      c: e.n.map((a) => (hasHangul(a) ? toChoseong(a) : '')),
      weak,
      famous: FAMOUS_SET.has(e.id),
    };
  });
}

/** 인덱스를 백그라운드에서 로드한다(한 번만). 실패하면 다음 호출 때 재시도. */
export function loadSearchIndex(): Promise<SearchEntry[]> {
  if (prepared) return Promise.resolve(prepared);
  if (!loading) {
    loading = fetch(dataUrl('search-index.v1.json'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`search-index HTTP ${res.status}`);
        const raw = (await res.json()) as SearchEntry[];
        prepared = prepare(raw);
        return prepared;
      })
      .catch((err: unknown) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

export function isSearchIndexReady(): boolean {
  return prepared !== null;
}

/** 테스트 전용: 인덱스를 직접 주입 */
export function setSearchIndexForTesting(entries: SearchEntry[] | null): void {
  prepared = entries ? prepare(entries) : null;
  loading = null;
}

/** 두 문자열의 편집 거리(삽입·삭제·치환)가 1 이하인가. 길이 차 ≤ 1일 때 한 번의 스캔으로 판정. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (edits++) return false;
    if (la === lb) {
      i++;
      j++;
    } else if (la > lb) i++;
    else j++;
  }
  return edits + (la - i) + (lb - j) <= 1;
}

function fuzzyPrefix(q: string, alias: string): boolean {
  const L = q.length;
  if (alias.length < L - 1) return false;
  return (
    withinOneEdit(q, alias.slice(0, L)) ||
    (alias.length > L && withinOneEdit(q, alias.slice(0, L + 1))) ||
    (L > 1 && withinOneEdit(q, alias.slice(0, L - 1)))
  );
}

function bestTier(
  e: PreparedEntry,
  q: string,
  choseong: boolean,
): { tier: MatchTier; matched: string } | null {
  let best: MatchTier | null = null;
  let matched = '';
  const consider = (tier: MatchTier, alias: string) => {
    if (best === null || TIER_SCORE[tier] < TIER_SCORE[best]) {
      best = tier;
      matched = alias;
    }
  };
  if (choseong) {
    for (let i = 0; i < e.c.length; i++) {
      const c = e.c[i]!;
      if (!c) continue;
      if (c === q) consider('exact', e.n[i]!);
      else if (c.startsWith(q)) consider('prefix', e.n[i]!);
    }
    return best ? { tier: best, matched } : null;
  }
  for (let i = 0; i < e.n.length; i++) {
    const a = e.n[i]!;
    if (a === q) {
      consider(e.weak.has(i) ? 'prefix' : 'exact', a);
      if (best === 'exact') return { tier: 'exact', matched: a };
    } else if (a.startsWith(q)) consider('prefix', a);
    else if (a.includes(q)) consider('substring', a);
  }
  if (best === null && q.length >= FUZZY_MIN_LEN) {
    for (const a of e.n) if (fuzzyPrefix(q, a)) return { tier: 'fuzzy', matched: a };
  }
  return best ? { tier: best, matched } : null;
}

/** 준비된 항목 배열에서 검색(순수 함수). */
export function searchEntries(
  entries: readonly SearchEntry[],
  query: string,
  opts: SearchOptions = {},
): SearchHit[] {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const q = normalizeAlias(query);
  if (!q) return [];
  const choseong = isChoseongQuery(q);
  // 한국어 음역 질의("알파 리라")는 라틴 별칭으로도 시도한다
  const alternates = choseong ? [] : expandKoreanQuery(q);
  const list = entries === prepared ? prepared : prepare(entries as SearchEntry[]);
  const hits: SearchHit[] = [];
  for (const e of list) {
    if (opts.kinds && !opts.kinds.has(e.kind)) continue;
    if (opts.filter && !opts.filter(e)) continue;
    let m = bestTier(e, q, choseong);
    for (const alt of alternates) {
      if (m?.tier === 'exact') break;
      const m2 = bestTier(e, alt, false);
      // 음역 확장은 약한 일치로 본다(정확 일치 → prefix): "안드로메다"가 별자리보다 M31을 먼저 내도록
      if (m2?.tier === 'exact') m2.tier = 'prefix';
      if (m2 && (!m || TIER_SCORE[m2.tier] < TIER_SCORE[m.tier])) m = m2;
    }
    if (!m) continue;
    const mag = e.mag ?? (e.kind === 'const' ? 6 : e.kind === 'star' ? 6 : 8);
    let score = TIER_SCORE[m.tier] + Math.max(-5, Math.min(15, mag));
    if (e.famous) score -= 5;
    const alt = opts.altOf?.(e.id);
    if (alt !== undefined && alt <= 0) score += 20;
    hits.push({
      id: e.id,
      kind: e.kind,
      con: e.con,
      mag: e.mag,
      tier: m.tier,
      matched: m.matched,
      score,
    });
  }
  hits.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const out = hits.length > limit ? hits.slice(0, limit) : hits;
  lastSearchMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  return out;
}

/** 로드된 인덱스에서 검색. 아직 로드 전이면 빈 배열. */
export function search(query: string, opts: SearchOptions = {}): SearchHit[] {
  if (!prepared) return [];
  return searchEntries(prepared, query, opts);
}

export function searchIndexEntries(): readonly SearchEntry[] {
  return prepared ?? [];
}
