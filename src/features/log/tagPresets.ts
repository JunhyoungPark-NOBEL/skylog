/**
 * 특징 태그 프리셋(task-04 §3.2). 태그 id는 영어 슬러그 `<category>.<name>`로 저장하고, 표시는 i18n `log.tag.<id>`.
 * 순수 데이터 + 순수 함수만 — 대상 종류별 카테고리 순서(`presetsFor`), 배타 그룹을 고려한 토글(`toggleTag`).
 */
import type { ObjectKind } from '@/catalog/objectId';

export type TagCategory =
  'color' | 'shape' | 'resolve' | 'double' | 'planet' | 'moon' | 'difficulty' | 'technique';

export const TAG_CATEGORIES: readonly TagCategory[] = [
  'color',
  'shape',
  'resolve',
  'double',
  'planet',
  'moon',
  'difficulty',
  'technique',
];

/** 카테고리별 태그 id(표시 순서) */
export const TAG_PRESETS: Record<TagCategory, readonly string[]> = {
  color: ['color.red', 'color.blue', 'color.yellow', 'color.white'],
  shape: [
    'shape.disk',
    'shape.oval',
    'shape.spiralHint',
    'shape.brightCore',
    'shape.fuzzyEdge',
    'shape.elongated',
  ],
  resolve: ['resolve.stars', 'resolve.fuzzy', 'resolve.pointlike'],
  double: ['double.split', 'double.colorContrast'],
  planet: [
    'planet.rings',
    'planet.bands',
    'planet.moons1',
    'planet.moons2',
    'planet.moons3',
    'planet.moons4',
    'planet.phase',
  ],
  moon: ['moon.craters', 'moon.terminator', 'moon.maria'],
  difficulty: ['difficulty.easy', 'difficulty.normal', 'difficulty.hard'],
  technique: ['technique.avertedVision', 'technique.filter'],
};

/** 같은 그룹 안에서는 하나만 고를 수 있는 태그들(위성 개수, 난이도) */
export const EXCLUSIVE_GROUPS: readonly (readonly string[])[] = [
  ['planet.moons1', 'planet.moons2', 'planet.moons3', 'planet.moons4'],
  ['difficulty.easy', 'difficulty.normal', 'difficulty.hard'],
];

/** 태그 id 형식: `<category>.<camelName>` */
export const TAG_ID_RE = /^[a-z]+\.[a-z][A-Za-z0-9]*$/;

/** 모든 프리셋 태그 id(카테고리 순서대로, 중복 없음) */
export function allTagIds(): string[] {
  return TAG_CATEGORIES.flatMap((c) => [...TAG_PRESETS[c]]);
}

export function categoryOf(tagId: string): TagCategory | null {
  const dot = tagId.indexOf('.');
  if (dot <= 0) return null;
  const c = tagId.slice(0, dot);
  return (TAG_CATEGORIES as readonly string[]).includes(c) ? (c as TagCategory) : null;
}

/**
 * 대상 종류에 맞는 카테고리 순서. 그 종류에서 먼저 볼 카테고리를 앞에 둔다
 * (행성 → 행성 그룹, 달 → 달 그룹, DSO → 형태·분해, 별 → 색·이중성). 난이도·기법은 항상 마지막.
 */
export function presetsFor(kind: ObjectKind, isDouble = false): TagCategory[] {
  const common: TagCategory[] = ['color', 'difficulty', 'resolve'];
  switch (kind) {
    case 'planet':
      return [...common, 'planet'];
    case 'moon':
      return [...common, 'moon'];
    case 'sun':
      return common;
    case 'dso':
      return [...common, 'shape'];
    case 'star':
      return isDouble ? [...common, 'double'] : common;
    case 'const':
      return common;
  }
}

/** 태그 토글. 배타 그룹의 다른 태그는 자동으로 빠진다. 원본 배열은 바꾸지 않는다. */
export function toggleTag(tags: readonly string[], tagId: string): string[] {
  if (tags.includes(tagId)) return tags.filter((t) => t !== tagId);
  const group = EXCLUSIVE_GROUPS.find((g) => g.includes(tagId));
  const kept = group ? tags.filter((t) => !group.includes(t)) : [...tags];
  return [...kept, tagId];
}

/** 표시용 i18n 키 */
export function tagLabelKey(tagId: string): string {
  return `log.tag.${tagId}`;
}
