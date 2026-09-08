import { create } from 'zustand';
import { FOV_MAX_DEG, FOV_MIN_DEG, clampFov } from '@/render/projection';

export type ViewMode = 'manual' | 'sensor';

export interface ViewState {
  /** 화면 중심 고도(도, -90..90) */
  centerAlt: number;
  /** 화면 중심 방위(도, 북=0 동=90) */
  centerAz: number;
  /** 짧은 변 기준 입체 투영 시야 축척(3..220°), 표시 반구 각지름은 최대180° */
  fovDeg: number;
  mode: ViewMode;

  setCenter(altDeg: number, azDeg: number): void;
  setFov(fovDeg: number): void;
  setMode(mode: ViewMode): void;
}

export const FOV_MIN = FOV_MIN_DEG;
export const FOV_MAX = FOV_MAX_DEG;

export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** 하늘 뷰 카메라 상태(T1이 사용). 기본은 남쪽 지평선 위 45°, 시야 90°. */
export const useViewStore = create<ViewState>()((set) => ({
  centerAlt: 45,
  centerAz: 180,
  fovDeg: 90,
  mode: 'manual',

  setCenter(altDeg, azDeg) {
    set({ centerAlt: Math.max(-90, Math.min(90, altDeg)), centerAz: wrap360(azDeg) });
  },
  setFov(fovDeg) {
    set({ fovDeg: clampFov(fovDeg) });
  },
  setMode(mode) {
    set({ mode });
  },
}));
