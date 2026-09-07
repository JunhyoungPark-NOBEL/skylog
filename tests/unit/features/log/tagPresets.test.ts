import { describe, expect, it } from 'vitest';
import {
  EXCLUSIVE_GROUPS,
  TAG_CATEGORIES,
  TAG_ID_RE,
  TAG_PRESETS,
  allTagIds,
  categoryOf,
  presetsFor,
  tagLabelKey,
  toggleTag,
} from '@/features/log/tagPresets';

describe('tagPresets — 프리셋 데이터', () => {
  it('모든 태그 id는 영어 슬러그(<category>.<name>)이고 자기 카테고리에 속한다', () => {
    for (const c of TAG_CATEGORIES) {
      for (const id of TAG_PRESETS[c]) {
        expect(id).toMatch(TAG_ID_RE);
        expect(categoryOf(id)).toBe(c);
      }
    }
    expect(categoryOf('nope')).toBeNull();
    expect(categoryOf('unknown.thing')).toBeNull();
  });

  it('태그 id는 전체에서 중복이 없다', () => {
    const all = allTagIds();
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(30);
  });

  it('배타 그룹의 태그는 모두 프리셋에 있다', () => {
    const all = new Set(allTagIds());
    for (const g of EXCLUSIVE_GROUPS) for (const id of g) expect(all.has(id)).toBe(true);
  });

  it('요구된 프리셋이 카테고리마다 들어 있다', () => {
    expect(TAG_PRESETS.color).toEqual(['color.red', 'color.blue', 'color.yellow', 'color.white']);
    expect(TAG_PRESETS.shape).toHaveLength(6);
    expect(TAG_PRESETS.resolve).toHaveLength(3);
    expect(TAG_PRESETS.double).toHaveLength(2);
    expect(TAG_PRESETS.planet).toContain('planet.rings');
    expect(TAG_PRESETS.planet).toContain('planet.phase');
    expect(TAG_PRESETS.moon).toEqual(['moon.craters', 'moon.terminator', 'moon.maria']);
    expect(TAG_PRESETS.difficulty).toEqual([
      'difficulty.easy',
      'difficulty.normal',
      'difficulty.hard',
    ]);
    expect(TAG_PRESETS.technique).toEqual(['technique.avertedVision', 'technique.filter']);
  });

  it('i18n 키는 log.tag.<id>', () => {
    expect(tagLabelKey('color.red')).toBe('log.tag.color.red');
  });
});

describe('presetsFor(kind) — 종류별 카테고리 순서', () => {
  it('행성은 행성 그룹, 달은 달 그룹, DSO는 형태·분해가 먼저 온다', () => {
    expect(presetsFor('planet')[0]).toBe('planet');
    expect(presetsFor('moon')[0]).toBe('moon');
    expect(presetsFor('dso').slice(0, 2)).toEqual(['shape', 'resolve']);
    expect(presetsFor('star')).toContain('double');
  });

  it('모든 종류에서 중복이 없고, 난이도·기법이 마지막이며, 어울리지 않는 그룹은 빠진다', () => {
    for (const kind of ['star', 'dso', 'planet', 'moon', 'sun', 'const'] as const) {
      const cats = presetsFor(kind);
      expect(cats.length).toBeGreaterThan(0);
      expect(new Set(cats).size).toBe(cats.length);
      expect(cats.slice(-2)).toEqual(['difficulty', 'technique']);
      for (const c of cats) expect(TAG_CATEGORIES).toContain(c);
      if (kind !== 'planet') expect(cats).not.toContain('planet');
      if (kind !== 'moon') expect(cats).not.toContain('moon');
    }
  });
});

describe('toggleTag', () => {
  it('없으면 넣고 있으면 빼며 원본은 그대로 둔다', () => {
    const a: string[] = [];
    const b = toggleTag(a, 'color.red');
    expect(b).toEqual(['color.red']);
    expect(a).toEqual([]);
    expect(toggleTag(b, 'color.red')).toEqual([]);
    expect(toggleTag(b, 'color.blue')).toEqual(['color.red', 'color.blue']);
  });

  it('배타 그룹(위성 개수·난이도)은 하나만 남는다', () => {
    let tags = toggleTag(['shape.disk'], 'planet.moons2');
    tags = toggleTag(tags, 'planet.moons4');
    expect(tags).toEqual(['shape.disk', 'planet.moons4']);
    tags = toggleTag(tags, 'difficulty.easy');
    tags = toggleTag(tags, 'difficulty.hard');
    expect(tags).toEqual(['shape.disk', 'planet.moons4', 'difficulty.hard']);
    // 같은 것을 다시 누르면 빠진다
    expect(toggleTag(tags, 'difficulty.hard')).toEqual(['shape.disk', 'planet.moons4']);
  });
});
