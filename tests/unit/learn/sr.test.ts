import { describe, expect, it } from 'vitest';
import { dueForReview, initialSr, reviewSr, SR_EASE_MIN } from '@/learn/sr';

const DAY = 86_400_000;

describe('간격 반복(SM-2 단순화)', () => {
  it('정답이면 1→3→7→14→30→60일, 그 뒤엔 ease 배', () => {
    const t0 = new Date('2026-09-01T12:00:00Z');
    let s = initialSr('q', t0);
    const intervals: number[] = [];
    for (let i = 0; i < 7; i++) {
      s = reviewSr(s, true, new Date(t0.getTime() + i * DAY));
      intervals.push(s.intervalDays);
    }
    expect(intervals.slice(0, 6)).toEqual([1, 3, 7, 14, 30, 60]);
    expect(intervals[6]).toBeGreaterThan(60);
    expect(Date.parse(s.due) - Date.parse(s.lastAt)).toBe(s.intervalDays * DAY);
  });
  it('오답이면 1일로 돌아가고 ease가 내려간다(하한 1.3)', () => {
    let s = initialSr('q', new Date('2026-09-01T12:00:00Z'));
    s = reviewSr(s, true, new Date('2026-09-02T12:00:00Z'));
    s = reviewSr(s, true, new Date('2026-09-05T12:00:00Z'));
    s = reviewSr(s, false, new Date('2026-09-12T12:00:00Z'));
    expect(s.intervalDays).toBe(1);
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeLessThan(2.5);
    for (let i = 0; i < 10; i++) s = reviewSr(s, false, new Date('2026-09-13T12:00:00Z'));
    expect(s.ease).toBe(SR_EASE_MIN);
  });
  it('오늘 복습: 만료된 것만, 만료 순, 상한 10', () => {
    const now = new Date('2026-09-20T12:00:00Z');
    const states = Array.from({ length: 15 }, (_, i) => ({
      ...reviewSr(
        initialSr(`q${i}`, new Date('2026-09-01T12:00:00Z')),
        i % 3 !== 0,
        new Date(`2026-09-${String(2 + i).padStart(2, '0')}T12:00:00Z`),
      ),
    }));
    const due = dueForReview(states, now);
    expect(due.length).toBeLessThanOrEqual(10);
    expect(due.every((s) => Date.parse(s.due) <= now.getTime())).toBe(true);
    for (let i = 1; i < due.length; i++)
      expect(Date.parse(due[i]!.due)).toBeGreaterThanOrEqual(Date.parse(due[i - 1]!.due));
    expect(dueForReview([initialSr('fresh', now)], now)).toEqual([]); // 아직 안 푼 문항은 복습 아님
  });
});
