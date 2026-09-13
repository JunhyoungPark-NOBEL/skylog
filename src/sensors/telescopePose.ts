import { create } from 'zustand';
import type { QTuple } from '@/astro/pointing';

export interface TelescopeReading {
  q: QTuple | null;
  at: number;
  sampleMs: number;
  status: 'off' | 'waiting' | 'active' | 'unavailable' | 'denied';
  source: string;
  sessionId: string;
  mode: 'automatic' | 'relative';
  headingReady: boolean;
}
/** 화면 수명과 분리한 현재 센서 기준. 디스크에는 저장하지 않는다. */
export const useTelescopeOrientation = create<TelescopeReading>(() => ({
  q: null,
  at: 0,
  sampleMs: 0,
  status: 'off',
  source: '',
  sessionId: '',
  mode: 'automatic',
  headingReady: false,
}));
