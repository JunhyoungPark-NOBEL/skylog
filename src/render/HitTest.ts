/**
 * 탭 선택: 손가락과의 화면 거리가 우선이며 거의 같은 위치에 겹쳤을 때만 밝기를 참고한다.
 * 후보: 별 팩(J2000 → 씬 변환·굴절·투영), 행성·달·태양, DSO(FOV 조건 안의 것).
 */
import type { ObjectId } from '@/catalog/objectId';
import type { Vec3 } from '@/astro/coords';
import { degPerPixel } from './projection';

/** 굴절 최대치보다 넉넉한 1° 여유. 원 밖의 별은 비싼 삼각함수·투영 전에 거른다. */
export function pickConeCos(fov: number, width: number, height: number): number {
  return (
    Math.cos((Math.min(180, degPerPixel(fov, width, height) * HIT_RADIUS_PX + 1) * Math.PI) / 180) -
    1e-6
  );
}

export function toCatalogDirection(scene: Vec3, matrix: Float32Array): Vec3 {
  return [0, 3, 6].map(
    (i) => matrix[i]! * scene[0] + matrix[i + 1]! * scene[1] + matrix[i + 2]! * scene[2],
  ) as Vec3;
}

/** common.glsl + star.vert.glsl의 소광과 같은 판정으로 보이지 않는 별의 선택을 피한다. */
export function pickExtinctionMag(alt: number, showBelow: boolean): number {
  if (alt <= 0) {
    const t = Math.max(0, Math.min(1, (alt + 6) / 6));
    return showBelow ? 4 * t * t * (3 - 2 * t) : 4;
  }
  const airMass =
    1 / (Math.sin((alt * Math.PI) / 180) + 0.50572 * Math.pow(alt + 6.07995, -1.6364));
  return 0.25 * Math.max(0, airMass - 1);
}

export interface Candidate {
  id: ObjectId;
  x: number;
  y: number;
  mag: number;
  /** 화면상 반지름(px) — 달처럼 큰 대상은 원반 안이면 거리 0 */
  radiusPx?: number;
}

export const HIT_RADIUS_PX = 24;
export const HIT_MAG_WEIGHT = 0.12; // 밝기 우선권은 최대 약1px: 옆 별이 선택을 빼앗지 않는다.

export function hitWeight(distPx: number, mag: number): number {
  return distPx - HIT_MAG_WEIGHT * (6 - Math.max(-2, Math.min(mag, 6)));
}

export function pickBest(
  candidates: Candidate[],
  x: number,
  y: number,
  radiusPx = HIT_RADIUS_PX,
): Candidate | null {
  let best: Candidate | null = null;
  let bestW = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    let d = Math.hypot(c.x - x, c.y - y);
    if (c.radiusPx) d = Math.max(0, d - c.radiusPx);
    if (d > radiusPx) continue;
    const w = hitWeight(d, c.mag);
    if (w < bestW) {
      bestW = w;
      best = c;
    }
  }
  return best;
}
