import { create } from 'zustand';

export type ViewMode = 'manual' | 'sensor';

export interface ViewState {
  /** 화면 중심 고도(도, -90..90) */
  centerAlt: number;
  /** 화면 중심 방위(도, 북=0 동=90) */
  centerAz: number;
  /** 세로 시야각(도) */
  fovDeg: number;
  mode: ViewMode;

  setCenter(altDeg: number, azDeg: number): void;
  setFov(fovDeg: number): void;
  setMode(mode: ViewMode): void;
}

export const FOV_MIN = 5;
export const FOV_MAX = 120;

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
    set({ fovDeg: Math.max(FOV_MIN, Math.min(FOV_MAX, fovDeg)) });
  },
  setMode(mode) {
    set({ mode });
  },
}));
