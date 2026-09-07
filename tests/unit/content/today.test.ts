import { describe, expect, it } from 'vitest';
import { hash32, pickTodayObject } from '@/content/today';
import type { ContentIndexEntry } from '@/content/schema';

function entry(id: ContentIndexEntry['id'], priority?: 1 | 2 | 3): ContentIndexEntry {
  return {
    id,
    kind: 'dso',
    title: { ko: id, en: id },
    oneLiner: '',
    difficulty: 2,
    hasStory: true,
    hasTradition: false,
    version: 2,
    confidence: 'medium',
    reviewCount: 0,
    file: `${id}.json`,
    ...(priority ? { priority } : {}),
  };
}

describe('오늘의 천체 선택', () => {
  const entries = [
    entry('dso:M31', 1),
    entry('dso:M13', 1),
    entry('dso:M57', 2),
    entry('sun', 1),
    entry('planet:saturn', 1),
  ];
  const alt: Record<string, number | null> = {
    'dso:M31': 60,
    'dso:M13': 30,
    'dso:M57': 70,
    sun: 80,
    'planet:saturn': 10,
  };
  const altMaxOf = (id: string) => alt[id] ?? null;

  it('지평선 아래(고도 < 25°)·태양은 제외하고, 미열람 → 우선순위 → 결정적 순서', () => {
    const a = pickTodayObject({ entries, readSet: new Set(), nightKey: '2026-09-06', altMaxOf });
    expect(a).not.toBeNull();
    expect(['dso:M31', 'dso:M13']).toContain(a!.id); // 우선순위 1인 둘 중 해시 순서
    expect(a!.unread).toBe(true);
    // 같은 밤이면 같은 결과
    const b = pickTodayObject({ entries, readSet: new Set(), nightKey: '2026-09-06', altMaxOf });
    expect(b!.id).toBe(a!.id);
    // 읽은 것은 뒤로
    const c = pickTodayObject({
      entries,
      readSet: new Set([a!.id]),
      nightKey: '2026-09-06',
      altMaxOf,
    });
    expect(c!.id).not.toBe(a!.id);
    expect(c!.id).not.toBe('dso:M57'); // 우선순위 2는 아직 아님
    const d = pickTodayObject({
      entries,
      readSet: new Set(['dso:M31', 'dso:M13']),
      nightKey: '2026-09-06',
      altMaxOf,
    });
    expect(d!.id).toBe('dso:M57');
    // 다 읽었으면 다시 우선순위·해시 순
    const e = pickTodayObject({
      entries,
      readSet: new Set(['dso:M31', 'dso:M13', 'dso:M57']),
      nightKey: '2026-09-06',
      altMaxOf,
    });
    expect(e!.unread).toBe(false);
    expect(['dso:M31', 'dso:M13']).toContain(e!.id);
  });
  it('후보가 없으면 null', () => {
    expect(
      pickTodayObject({ entries, readSet: new Set(), nightKey: 'x', altMaxOf: () => 5 }),
    ).toBeNull();
  });
  it('날이 바뀌면 순서가 바뀔 수 있다(해시가 다름)', () => {
    expect(hash32('2026-09-06|dso:M31')).not.toBe(hash32('2026-09-07|dso:M31'));
    expect(hash32('a')).toBe(hash32('a'));
  });
});
