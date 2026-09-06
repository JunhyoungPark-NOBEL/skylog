/**
 * search-index.v1.json — 모든 검색 대상의 정규화 별칭.
 * 항목: { id, kind, con?, mag?, n: string[] }
 * 정규화 규칙(normalizeAlias, docs/ARCHITECTURE.md): NFC → 소문자 → 공백·하이픈·점·따옴표·가운뎃점 제거 → 괄호 제거.
 * 그리스 문자와 라틴 표기(α / alpha / Alp)는 빌드 시 모두 별칭으로 넣어 둔다. 한글은 그대로(공백 제거).
 * 클라이언트는 질의에 같은 normalizeAlias를 적용해 접두/부분 일치로 찾는다.
 */
import { dsoAliases, type DsoOut } from './build-dso.ts';
import { starAliases, type NamedStarOut } from './build-stars.ts';
import type { ConstellationOut } from './build-constellations.ts';
import type { BodyOut } from './build-misc.ts';
import { normalizeAlias } from './lib.ts';

export interface SearchEntry {
  id: string;
  kind: 'star' | 'dso' | 'planet' | 'moon' | 'sun' | 'const';
  con?: string;
  mag?: number;
  n: string[];
}

function normalizeAll(list: string[]): string[] {
  const set = new Set<string>();
  for (const s of list) {
    const n = normalizeAlias(s);
    if (n) set.add(n);
  }
  return [...set];
}

export function buildSearchIndex(input: {
  stars: NamedStarOut[];
  dso: DsoOut[];
  constellations: Record<string, ConstellationOut>;
  bodies: BodyOut[];
}): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const b of input.bodies) {
    entries.push({
      id: b.id,
      kind: b.kind,
      n: normalizeAll([b.names.ko, b.names.en, b.body]),
    });
  }

  for (const [abbr, c] of Object.entries(input.constellations)) {
    const names = [c.en, c.ko, abbr, `${c.ko.replace(/자리$/, '')}`];
    if (c.genitive) names.push(c.genitive);
    entries.push({ id: `const:${abbr}`, kind: 'const', n: normalizeAll(names) });
  }

  for (const s of input.stars) {
    const conKo = input.constellations[s.con]?.ko;
    const entry: SearchEntry = {
      id: s.id,
      kind: 'star',
      con: s.con,
      mag: s.mag,
      n: normalizeAll(starAliases(s, conKo)),
    };
    entries.push(entry);
  }

  for (const d of input.dso) {
    const entry: SearchEntry = {
      id: d.id,
      kind: 'dso',
      con: d.con,
      n: normalizeAll(dsoAliases(d)),
    };
    if (d.mag !== undefined) entry.mag = d.mag;
    entries.push(entry);
  }

  return entries;
}
