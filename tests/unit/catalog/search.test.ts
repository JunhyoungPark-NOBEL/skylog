import { describe, expect, it, beforeAll } from 'vitest';
import { isChoseongQuery, normalizeAlias, toChoseong } from '@/catalog/normalize';
import {
  lastSearchMs,
  search,
  searchEntries,
  setSearchIndexForTesting,
  withinOneEdit,
  type SearchEntry,
} from '@/catalog/searchIndex';
import { FAMOUS_IDS } from '@/catalog/famous';

import rawIndex from '../../../public/data/search-index.v1.json';

const INDEX = rawIndex as SearchEntry[];

describe('normalizeAlias · 초성', () => {
  it('공백·기호·대소문자를 무시한다', () => {
    expect(normalizeAlias('M 31')).toBe('m31');
    expect(normalizeAlias('NGC-224')).toBe('ngc224');
    expect(normalizeAlias("Barnard's Star")).toBe('barnardsstar');
    expect(normalizeAlias('α Lyr')).toBe('αlyr');
  });
  it('초성 변환', () => {
    expect(toChoseong('직녀성')).toBe('ㅈㄴㅅ');
    expect(isChoseongQuery('ㅈㄴㅅ')).toBe(true);
    expect(isChoseongQuery('직녀')).toBe(false);
  });
});

describe('withinOneEdit', () => {
  it('치환·삽입·삭제 1회', () => {
    expect(withinOneEdit('andromada', 'andromeda')).toBe(true);
    expect(withinOneEdit('satrn', 'saturn')).toBe(true);
    expect(withinOneEdit('saturnn', 'saturn')).toBe(true);
    expect(withinOneEdit('saturn', 'saturn')).toBe(true);
    expect(withinOneEdit('satrun', 'saturn')).toBe(false); // 전위는 2회
    expect(withinOneEdit('abc', 'xyz')).toBe(false);
  });
});

describe('검색 수용 기준(task-03 §6)', () => {
  beforeAll(() => setSearchIndexForTesting(INDEX));

  const cases: [string, string][] = [
    ['토성', 'planet:saturn'],
    ['Saturn', 'planet:saturn'],
    ['saturn', 'planet:saturn'],
    ['m13', 'dso:M13'],
    ['M 13', 'dso:M13'],
    ['직녀성', 'star:HIP91262'],
    ['Vega', 'star:HIP91262'],
    ['알파 리라', 'star:HIP91262'],
    ['α Lyr', 'star:HIP91262'],
    ['안드로메다', 'dso:M31'],
    ['M31', 'dso:M31'],
    ['NGC 224', 'dso:M31'],
    ['오리온자리', 'const:Ori'],
    ['Orion', 'const:Ori'],
    ['andromada', 'dso:M31'],
    ['ㅈㄴㅅ', 'star:HIP91262'],
    ['베타 오리온', 'star:HIP24436'],
    ['리라', 'const:Lyr'],
  ];
  for (const [q, id] of cases) {
    it(`"${q}" → ${id} 1위`, () => {
      const hits = search(q);
      expect(
        hits[0]?.id,
        hits
          .slice(0, 3)
          .map((h) => `${h.id}:${h.tier}`)
          .join(','),
      ).toBe(id);
    });
  }

  it('응답 시간 < 50ms, 결과 ≤ 50', () => {
    const hits = search('a');
    expect(hits.length).toBeLessThanOrEqual(50);
    expect(lastSearchMs).toBeLessThan(50);
    search('안드로메다');
    expect(lastSearchMs).toBeLessThan(50);
  });

  it('지평선 아래인 것은 같은 등급 안에서 뒤로', () => {
    const entries: SearchEntry[] = [
      { id: 'star:HIP1', kind: 'star', mag: 1, n: ['alpha'] },
      { id: 'star:HIP2', kind: 'star', mag: 2, n: ['alpha'] },
    ];
    const hits = searchEntries(entries, 'alpha', {
      altOf: (id) => (id === 'star:HIP1' ? -10 : 30),
    });
    expect(hits.map((h) => h.id)).toEqual(['star:HIP2', 'star:HIP1']);
  });

  it('종류 필터', () => {
    const hits = search('m', { kinds: new Set(['const']) });
    expect(hits.every((h) => h.kind === 'const')).toBe(true);
  });
});

describe('유명 천체 목록이 인덱스에 존재한다', () => {
  it('모든 id가 검색 인덱스에 있다', () => {
    const ids = new Set(INDEX.map((e) => e.id));
    const missing = FAMOUS_IDS.filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });
});
