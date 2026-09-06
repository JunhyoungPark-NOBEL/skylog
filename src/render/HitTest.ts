/**
 * 탭 선택(hit-test, task-01 §3.8): 반경 안 후보 중 `가중치 = 화면거리 − k·(밝기)`가 가장 작은 것.
 * 후보: 별 팩(J2000 → 씬 변환·굴절·투영), 행성·달·태양, DSO(FOV 조건 안의 것).
 */
import type { ObjectId } from '@/catalog/objectId';

export interface Candidate {
  id: ObjectId;
  x: number;
  y: number;
  mag: number;
  /** 화면상 반지름(px) — 달처럼 큰 대상은 원반 안이면 거리 0 */
  radiusPx?: number;
}

export const HIT_RADIUS_PX = 24;
export const HIT_MAG_WEIGHT = 2.5; // px per magnitude

export function hitWeight(distPx: number, mag: number): number {
  return distPx - HIT_MAG_WEIGHT * (6 - Math.min(mag, 6));
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
