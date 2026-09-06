import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClockStore } from '@/state/clockStore';

describe('clockStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T12:00:00Z'));
    useClockStore.getState().resetToNow();
  });
  afterEach(() => vi.useRealTimers());

  it('실시간 모드는 현재 시각 + 오프셋', () => {
    const s = useClockStore.getState();
    expect(s.now().toISOString()).toBe('2026-09-06T12:00:00.000Z');
    s.setOffset(3_600_000);
    expect(useClockStore.getState().now().toISOString()).toBe('2026-09-06T13:00:00.000Z');
  });

  it('수동 모드는 배속대로 흐른다', () => {
    const s = useClockStore.getState();
    s.setManual(new Date('2026-01-01T00:00:00Z'), 60);
    vi.advanceTimersByTime(1000);
    expect(useClockStore.getState().now().toISOString()).toBe('2026-01-01T00:01:00.000Z');
    useClockStore.getState().setRate(0);
    vi.advanceTimersByTime(5000);
    expect(useClockStore.getState().now().toISOString()).toBe('2026-01-01T00:01:00.000Z');
  });

  it('resetToNow는 실시간·오프셋 0으로 돌아간다', () => {
    const s = useClockStore.getState();
    s.setManual(new Date('2000-01-01T00:00:00Z'));
    s.resetToNow();
    expect(useClockStore.getState().mode).toBe('realtime');
    expect(useClockStore.getState().now().toISOString()).toBe('2026-09-06T12:00:00.000Z');
  });
});
