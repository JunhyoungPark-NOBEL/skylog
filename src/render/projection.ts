/**
 * 짧은 변 기준 입체 투영(stereographic). 중심에서 θ인 방향의 반지름은 tan(θ/2).
 * 180°에서 시선 쪽 반구 전체가 원에 들어오며, 220°까지 축소해 원 둘레에 여백을 둔다.
 * 뒤쪽 반구는 그리지 않는다. 220°는 축척이며 보이는 하늘의 각지름은 최대180°다.
 */
import { DEG, RAD, type Vec3 } from '@/astro/coords';

export const FOV_MIN_DEG = 3;
export const FOV_MAX_DEG = 220;
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

/** 화면 중심의 픽셀당 각도(도/px). θ = 2 atan(r/scale)의 중심 미분. */
export function degPerPixel(fovShortDeg: number, width: number, height: number): number {
  return (2 * RAD) / hemisphereRadiusPx(fovShortDeg, width, height);
}

/** 반구 경계(시선으로부터90°)의 화면 반지름. GPU와 CPU가 같은 축척을 공유한다. */
export function hemisphereRadiusPx(fovDeg: number, width: number, height: number): number {
  return Math.max(1, Math.min(width, height)) / 2 / Math.tan((clampFov(fovDeg) / 4) * DEG);
}

export function isInsideSkyDisk(
  x: number,
  y: number,
  fovDeg: number,
  width: number,
  height: number,
): boolean {
  return (
    Math.hypot(x - width / 2, y - height / 2) <= hemisphereRadiusPx(fovDeg, width, height) + 1e-7
  );
}

/** 카메라 좌표(-Z 앞) → 픽셀. 뒤쪽 반구의 방향은 null. */
export function stereographicProject(
  dir: Vec3,
  fovDeg: number,
  width: number,
  height: number,
): { x: number; y: number } | null {
  const length = Math.hypot(...dir);
  if (length < 1e-12 || dir[2] / length > 1e-9) return null;
  const scale = hemisphereRadiusPx(fovDeg, width, height) / (length - dir[2]);
  return { x: width / 2 + dir[0] * scale, y: height / 2 - dir[1] * scale };
}

/** 픽셀 → 카메라 단위벡터. 원 밖도 연속으로 역변환하되 탭/줌은 isInsideSkyDisk로 제한한다. */
export function stereographicUnproject(
  x: number,
  y: number,
  fovDeg: number,
  width: number,
  height: number,
): Vec3 {
  const scale = hemisphereRadiusPx(fovDeg, width, height);
  const px = (x - width / 2) / scale;
  const py = (height / 2 - y) / scale;
  const r2 = px * px + py * py;
  return [(2 * px) / (1 + r2), (2 * py) / (1 + r2), (r2 - 1) / (1 + r2)];
}

/** 핀치/휠 줌: 비선형(넓을수록 빠르게). factor > 1이면 확대. */
export function zoomFov(fovDeg: number, factor: number): number {
  return clampFov(fovDeg / factor);
}
