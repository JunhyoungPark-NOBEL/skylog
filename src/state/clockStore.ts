import { create } from 'zustand';

export type ClockMode = 'realtime' | 'manual';

export interface ClockState {
  mode: ClockMode;
  /** 실시간 모드에서 현재 시각에 더하는 오프셋(ms). 시간 슬라이더(±12h)가 사용. */
  offsetMs: number;
  /** 수동 모드 배속(1 = 실시간, 0 = 정지, 음수 = 역행). */
  rate: number;
  /** 수동 모드 기준점: 실제 시각 anchorRealMs일 때 시뮬레이션 시각이 anchorSimMs */
  anchorRealMs: number;
  anchorSimMs: number;

  /** 현재 시뮬레이션 시각. 렌더 루프가 프레임마다 호출한다. */
  now(): Date;
  setOffset(offsetMs: number): void;
  setRate(rate: number): void;
  /** 특정 시각으로 이동(수동 모드). */
  setManual(date: Date, rate?: number): void;
  /** "지금"으로 복귀(실시간, 오프셋 0). */
  resetToNow(): void;
}

export const useClockStore = create<ClockState>()((set, get) => ({
  mode: 'realtime',
  offsetMs: 0,
  rate: 1,
  anchorRealMs: Date.now(),
  anchorSimMs: Date.now(),

  now() {
    const s = get();
    if (s.mode === 'realtime') return new Date(Date.now() + s.offsetMs);
    return new Date(s.anchorSimMs + (Date.now() - s.anchorRealMs) * s.rate);
  },
  setOffset(offsetMs) {
    set({ mode: 'realtime', offsetMs });
  },
  setRate(rate) {
    const sim = get().now().getTime();
    set({ mode: 'manual', rate, anchorRealMs: Date.now(), anchorSimMs: sim });
  },
  setManual(date, rate = get().rate) {
    set({ mode: 'manual', rate, anchorRealMs: Date.now(), anchorSimMs: date.getTime() });
  },
  resetToNow() {
    set({ mode: 'realtime', offsetMs: 0, rate: 1 });
  },
}));
