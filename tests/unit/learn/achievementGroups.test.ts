import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { groupAchievements } from '@/learn/achievementGroups';
import { BADGE_KEYS, type Badge } from '@/learn/schema';
import ko from '@/i18n/partials/achievement-collection.ko.json';
import en from '@/i18n/partials/achievement-collection.en.json';

const badges = JSON.parse(readFileSync('public/data/learn/v2/badges.json', 'utf8')) as Badge[];
describe('업적 모음의 분류와 집계', () => {
  it('기존 48개를 중복·누락 없이 5개 주제로 묶고 원본 ID·조건을 보존한다', () => {
    const original = JSON.stringify(badges);
    const groups = groupAchievements(badges, new Set());
    expect(groups.map((group) => [group.id, group.items.length])).toEqual([
      ['discovery', 11],
      ['deepSky', 8],
      ['journal', 9],
      ['learning', 11],
      ['fieldwork', 9],
    ]);
    expect(
      groups
        .flatMap((group) => group.items)
        .map((b) => b.id)
        .sort(),
    ).toEqual(badges.map((b) => b.id).sort());
    expect(groups.flatMap((group) => group.items).every((badge) => badges.includes(badge))).toBe(
      true,
    );
    expect(JSON.stringify(badges)).toBe(original);
  });
  it('없는 ID·비활성 업적을 총 달성수에 세지 않고 분류별 실제 완료 수를 합한다', () => {
    const groups = groupAchievements(
      [...badges, { ...badges[0]!, id: 'disabled', enabled: false }],
      new Set(['badge-first-look', 'badge-first-sketch', 'badge-first-hop', 'missing', 'disabled']),
    );
    expect(groups.map((group) => group.earned)).toEqual([1, 0, 1, 0, 1]);
    expect(groups.reduce((n, group) => n + group.items.length, 0)).toBe(48);
  });
  it('이전 오프라인 18개 팩에서도 실제 개수만 표시한다', () => {
    const old = JSON.parse(readFileSync('public/data/learn/v1/badges.json', 'utf8')) as Badge[];
    const groups = groupAchievements(old, new Set(old.map((badge) => badge.id)));
    expect(groups.reduce((n, group) => n + group.items.length, 0)).toBe(18);
    expect(groups.reduce((n, group) => n + group.earned, 0)).toBe(18);
    expect(groupAchievements([], new Set())).toEqual([]);
  });
  it('모든 지원 규칙과 네 계절에 한영 짧은 이름을 제공한다', () => {
    for (const language of [ko, en]) {
      expect(Object.keys(language.achievementCollection.short).sort()).toEqual(
        [...BADGE_KEYS].sort(),
      );
      expect(new Set(Object.values(language.achievementCollection.signatures)).size).toBe(4);
      expect(
        Object.values(language.achievementCollection.short).every((name) => name.length > 0),
      ).toBe(true);
    }
  });
});
