/** 제한된 시야 안에서 밝은 별을 잇는 탐색. 거리=대권 각거리, 최대 7번 이동. */
import { angularSeparation, raDecToUnitVector, DEG, RAD, wrap360, type Vec3 } from './coords';
import type { ObjectId } from '@/catalog/objectId';
export interface HopStar {
  id: ObjectId;
  ra: number;
  dec: number;
  mag: number;
}
export interface HopPoint {
  id: ObjectId;
  ra: number;
  dec: number;
}
export interface HopStep {
  from: HopPoint;
  to: HopPoint;
  distanceDeg: number;
  fields: number;
  bearingDeg: number;
}
export interface HopRoute {
  start: HopPoint;
  steps: HopStep[];
  fovDeg: number;
}
const direction = (s: HopPoint): Vec3 => raDecToUnitVector(s.ra, s.dec);
const distance = (a: HopPoint, b: HopPoint) => angularSeparation(direction(a), direction(b));
/** 천구 북에서 동쪽으로 잰 위치각. 접안렌즈에서의 좌우는 차트의 상 방향을 따른다. */
export function positionAngle(a: HopPoint, b: HopPoint): number {
  const d = (b.ra - a.ra) * DEG,
    x = a.dec * DEG,
    y = b.dec * DEG;
  return wrap360(
    Math.atan2(
      Math.sin(d) * Math.cos(y),
      Math.cos(x) * Math.sin(y) - Math.sin(x) * Math.cos(y) * Math.cos(d),
    ) * RAD,
  );
}
export function starHop(
  target: HopPoint,
  stars: readonly HopStar[],
  fovDeg: number,
  limitMag = 7.5,
  startId?: ObjectId,
): HopRoute | null {
  if (!(fovDeg > 0 && fovDeg <= 30) || !Number.isFinite(limitMag)) return null;
  const pool = stars.filter(
    (s) => s.id !== target.id && s.mag <= limitMag && distance(s, target) < 30,
  );
  // 3등급 별을 우선하되 지나치게 긴 경로이면 가까운 4등급 별도 비교한다.
  let starts = pool.filter((s) => distance(s, target) <= 25 && s.mag <= 4);
  if (startId) starts = pool.filter((s) => s.id === startId);
  starts.sort((a, b) => a.mag + distance(a, target) * 0.25 - (b.mag + distance(b, target) * 0.25));
  let visits = 0;
  function search(current: HopPoint, path: HopPoint[]): HopPoint[] | null {
    if (++visits > 2500 || path.length > 7) return null;
    const left = distance(current, target);
    if (left <= fovDeg * 0.5) return [...path, target];
    const next = pool
      .filter(
        (s) =>
          !path.some((p) => p.id === s.id) &&
          distance(s, current) <= fovDeg * 0.8 &&
          distance(s, target) < left - 0.05,
      )
      .sort((a, b) => distance(a, target) + a.mag * 0.35 - (distance(b, target) + b.mag * 0.35))
      .slice(0, 10);
    for (const s of next) {
      const found = search(s, [...path, s]);
      if (found) return found;
    }
    return null;
  }
  let best: HopRoute | null = null;
  for (const start of starts.slice(0, 24)) {
    visits = 0;
    const points = search(start, [start]);
    if (points && (!best || points.length - 1 < best.steps.length))
      best = {
        start,
        fovDeg,
        steps: points.slice(1).map((to, i) => {
          const from = points[i]!,
            distanceDeg = distance(from, to);
          return {
            from,
            to,
            distanceDeg,
            fields: distanceDeg / fovDeg,
            bearingDeg: positionAngle(from, to),
          };
        }),
      };
  }
  // 실패를 숨기려고 장비의 실제 시야를 자동으로 넓히지 않는다.
  return best;
}
