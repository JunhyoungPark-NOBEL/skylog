/** 구면 선 유틸: 큰 원 보간(slerp), 원 생성. 모두 단위벡터([x,y,z]) 기준. */
import { DEG, type Vec3 } from '@/astro/coords';

export function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

export function angleBetweenDeg(a: Vec3, b: Vec3): number {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(d) / DEG;
}

/** a→b 큰 원 위 점들(a, b 포함). 세그먼트가 maxStepDeg보다 길면 분할. */
export function slerpPoints(a: Vec3, b: Vec3, maxStepDeg = 3): Vec3[] {
  const omega = angleBetweenDeg(a, b) * DEG;
  const n = Math.max(1, Math.ceil(omega / (maxStepDeg * DEG)));
  if (omega < 1e-9) return [a, b];
  const s = Math.sin(omega);
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wa = Math.sin((1 - t) * omega) / s;
    const wb = Math.sin(t * omega) / s;
    out.push([a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]);
  }
  return out;
}

/** 축(axis)을 법선으로 하는 큰 원(또는 위도 latDeg의 작은 원). stepDeg 간격, 닫힘(첫 점 반복). */
export function circlePoints(axis: Vec3, stepDeg = 3, latDeg = 0): Vec3[] {
  const n = normalize(axis);
  // 축에 수직인 기저 u, v
  const ref: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(ref, n));
  const v = cross(n, u);
  const r = Math.cos(latDeg * DEG);
  const h = Math.sin(latDeg * DEG);
  const steps = Math.max(8, Math.round(360 / stepDeg));
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t) * r;
    const s = Math.sin(t) * r;
    out.push([
      u[0] * c + v[0] * s + n[0] * h,
      u[1] * c + v[1] * s + n[1] * h,
      u[2] * c + v[2] * s + n[2] * h,
    ]);
  }
  return out;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** 폴리라인(점 배열) → LineSegments용 정점 배열 + 누적 각거리(도) */
export function polylineToSegments(
  points: Vec3[],
  positions: number[],
  dists: number[],
  startDist = 0,
): number {
  let d = startDist;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    const seg = angleBetweenDeg(a, b);
    dists.push(d, d + seg);
    d += seg;
  }
  return d;
}
