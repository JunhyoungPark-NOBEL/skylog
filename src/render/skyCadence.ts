import { degPerPixel } from './projection';

/** 확대 시 1초마다 천체가 뛰는 현상을 줄인다. 추정 이동 0.006°/s에 0.08px 예산을 둔다. */
export function skyUpdateIntervalMs(fovDeg: number, width: number, height: number): number {
  return Math.max(40, Math.min(1000, (degPerPixel(fovDeg, width, height) / 0.006) * 80));
}
