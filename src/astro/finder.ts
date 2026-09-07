/** 원형 파인더 차트: 접평면(gnomonic) 투영과 상 방향. 반지름=실시야/2. */
import { DEG, type Vec3 } from './coords';
export type ImageOrientation = 'upright' | 'rotate180' | 'mirror' | 'flipBoth';
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function chartBasis(center: Vec3, up: Vec3) {
  let right = cross(center, up);
  if (Math.hypot(...right) < 1e-6) right = cross(center, [1, 0, 0]);
  const len = Math.hypot(...right);
  right = right.map((v) => v / len) as Vec3;
  return { right, vertical: cross(right, center) };
}
export function orientPoint(
  x: number,
  y: number,
  orientation: ImageOrientation,
  rotationDeg = 0,
): [number, number] {
  if (orientation === 'mirror') x = -x;
  if (orientation === 'rotate180' || orientation === 'flipBoth') {
    x = -x;
    y = -y;
  }
  const r = rotationDeg * DEG;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
}
export function finderPoint(
  v: Vec3,
  center: Vec3,
  up: Vec3,
  fovDeg: number,
): [number, number] | null {
  const c = dot(v, center);
  if (c <= 0) return null;
  const { right, vertical } = chartBasis(center, up),
    scale = c * Math.tan((fovDeg * DEG) / 2);
  return [dot(v, right) / scale, -dot(v, vertical) / scale];
}
/** 차트의 정규화 위치→방향. 상의 반전·회전을 역변환하며 실제 포인팅은 바꾸지 않는다. */
export function finderDirection(
  x: number,
  y: number,
  center: Vec3,
  up: Vec3,
  fovDeg: number,
  orientation: ImageOrientation = 'upright',
  rotationDeg = 0,
): Vec3 {
  const rotated = orientPoint(x, y, 'upright', -rotationDeg);
  const [sx, sy] = orientPoint(...rotated, orientation);
  const { right, vertical } = chartBasis(center, up),
    k = Math.tan((fovDeg * DEG) / 2);
  const v = center.map((c, i) => c + k * (sx * right[i]! - sy * vertical[i]!)) as Vec3;
  const len = Math.hypot(...v);
  return v.map((c) => c / len) as Vec3;
}
export function fovPixelDiameter(fovDeg: number, viewFovDeg: number, heightPx: number): number {
  return (heightPx * Math.tan((fovDeg * DEG) / 2)) / Math.tan((viewFovDeg * DEG) / 2);
}
export function defaultImageOrientation(
  kind: 'refractor' | 'reflector' | 'compound',
  diagonal: boolean,
): ImageOrientation {
  return kind !== 'reflector' && diagonal ? 'mirror' : 'rotate180';
}
