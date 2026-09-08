import { angularSeparation, raDecToUnitVector } from './coords';
import { positionAngle, type HopPoint, type HopRoute } from './starHop';

/** 대표 코스의 이정표를 보존한다. 실제 시야보다 긴 이동은 fields로 드러낸다. */
export function curatedHop(points: readonly HopPoint[], fovDeg: number): HopRoute | null {
  if (
    points.length < 2 ||
    !Number.isFinite(fovDeg) ||
    fovDeg <= 0 ||
    fovDeg > 30 ||
    points.some((p) => ![p.ra, p.dec].every(Number.isFinite))
  )
    return null;
  return {
    start: points[0]!,
    fovDeg,
    steps: points.slice(1).map((to, i) => {
      const from = points[i]!;
      const distanceDeg = angularSeparation(
        raDecToUnitVector(from.ra, from.dec),
        raDecToUnitVector(to.ra, to.dec),
      );
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
