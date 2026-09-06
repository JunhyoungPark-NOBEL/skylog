/**
 * 시야각(FOV) 규약 (task-01 §5): 사용자 노출 FOV는 **화면 짧은 변** 기준. 범위 3°~100°.
 * (스테레오그래픽 투영은 보류 — D-017. 원근 투영에서 110°는 가장자리 왜곡이 심해 상한 100°.)
 * Three.js PerspectiveCamera.fov는 세로 FOV이므로 여기서 변환한다.
 */
import { DEG, RAD } from '@/astro/coords';

export const FOV_MIN_DEG = 3;
export const FOV_MAX_DEG = 100;
export const FOV_DEFAULT_DEG = 90;

export function clampFov(fovDeg: number): number {
  return Math.min(FOV_MAX_DEG, Math.max(FOV_MIN_DEG, fovDeg));
}

/** 짧은 변 기준 FOV → 세로 FOV(도) */
export function verticalFovDeg(fovShortDeg: number, width: number, height: number): number {
  if (height <= width || width <= 0) return fovShortDeg;
  // 세로가 긴 화면: 짧은 변 = 가로 → 가로 FOV가 fovShort, 세로 FOV는 더 큼
  const halfH = Math.tan((fovShortDeg / 2) * DEG) * (height / width);
  return 2 * Math.atan(halfH) * RAD;
}

/** 화면 중심 부근의 픽셀당 각도(도/px) — 드래그 감도, 라벨·hit-test 반경에 사용 */
export function degPerPixel(fovShortDeg: number, width: number, height: number): number {
  const shortSide = Math.max(1, Math.min(width, height));
  // 중심에서의 정확한 값: 2·tan(fov/2)/shortSide 라디안/px의 근사 → 소각에서 fov/shortSide
  const focalPx = shortSide / 2 / Math.tan((fovShortDeg / 2) * DEG);
  return RAD / focalPx;
}

/** 핀치/휠 줌: 비선형(넓을수록 빠르게). factor > 1이면 확대. */
export function zoomFov(fovDeg: number, factor: number): number {
  return clampFov(fovDeg / factor);
}
