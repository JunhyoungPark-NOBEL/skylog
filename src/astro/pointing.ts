/** 경통 광축과 상대 센서의 북 기준을 별로 추정한다. task-05 §3, W3C 기기 +Y=윗변. */
import { Quaternion, Vector3 } from 'three';
import {
  altAzToScene,
  sceneToAltAz,
  angularSeparation,
  wrap180,
  DEG,
  RAD,
  type Vec3,
} from './coords';
import { yawQuaternion } from '@/sensors/orientation/math';

export type QTuple = [number, number, number, number];
export interface AlignmentSample {
  q: QTuple;
  direction: Vec3;
  objectId: string;
  at: string;
}
export interface PointingAlignment {
  yawDeg: number;
  axis: Vec3;
  residualDeg: number;
  maxResidualDeg: number;
}
export const PHONE_TOP: Vec3 = [0, 1, 0];
const vector = (v: Vec3) => new Vector3(...v).normalize();
const tuple = (v: Vector3): Vec3 => [v.x, v.y, v.z];

/** 카메라 화면 회전을 제거해 기기의 물리 축을 고정한다. 기기를 돌려도 +Y는 항상 폰 윗변. */
export function physicalQuaternion(q: Quaternion, screenAngleDeg: number): Quaternion {
  return q
    .clone()
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), screenAngleDeg * DEG))
    .normalize();
}
export function pointingDirection(q: QTuple, alignment?: PointingAlignment | null): Vec3 {
  const v = vector(alignment?.axis ?? PHONE_TOP).applyQuaternion(new Quaternion(...q));
  if (alignment) v.applyQuaternion(yawQuaternion(alignment.yawDeg));
  return tuple(v.normalize());
}
function fit(samples: readonly AlignmentSample[], yawDeg: number): PointingAlignment {
  const invYaw = yawQuaternion(yawDeg).invert();
  const sum = new Vector3();
  for (const s of samples)
    sum.add(
      vector(s.direction)
        .applyQuaternion(invYaw)
        .applyQuaternion(new Quaternion(...s.q).invert()),
    );
  if (sum.lengthSq() < 1e-9) throw new Error('Inconsistent alignment');
  const model = { yawDeg, axis: tuple(sum.normalize()), residualDeg: 0, maxResidualDeg: 0 };
  const errors = samples.map((s) => angularSeparation(pointingDirection(s.q, model), s.direction));
  model.residualDeg = Math.sqrt(errors.reduce((a, e) => a + e * e, 0) / errors.length);
  model.maxResidualDeg = Math.max(...errors);
  return model;
}
export function alignOne(sample: AlignmentSample, yawDeg?: number): PointingAlignment {
  const raw = sceneToAltAz(pointingDirection(sample.q));
  const target = sceneToAltAz(sample.direction);
  return fit([sample], yawDeg ?? wrap180(target.azDeg - raw.azDeg));
}
/** 임의 yaw인 상대 센서: 첫 별 추정값 ±40°. 격자 후 황금분할로 국소 최소점을 정밀화. */
export function alignTwo(samples: readonly AlignmentSample[]): PointingAlignment {
  if (samples.length !== 2) throw new Error('Two stars required');
  const sep = angularSeparation(samples[0]!.direction, samples[1]!.direction);
  if (samples[0]!.objectId === samples[1]!.objectId || sep < 20 || sep > 150)
    throw new Error('Choose separated stars');
  const center = alignOne(samples[0]!).yawDeg;
  let best = fit(samples, center);
  for (let d = center - 40; d <= center + 40; d += 0.25) {
    const next = fit(samples, d);
    if (next.residualDeg < best.residualDeg) best = next;
  }
  let lo = Math.max(center - 40, best.yawDeg - 0.3),
    hi = Math.min(center + 40, best.yawDeg + 0.3);
  for (let i = 0; i < 40; i++) {
    const a = lo + (hi - lo) * 0.381966,
      b = hi - (hi - lo) * 0.381966;
    if (fit(samples, a).residualDeg < fit(samples, b).residualDeg) hi = b;
    else lo = a;
  }
  best = fit(samples, (lo + hi) / 2);
  // 같은 기울기의 퇴화 배치·너무 큰 장착 오차는 작은 잔차만으로 성공이라 하지 않는다.
  const shoulder = Math.min(
    fit(samples, best.yawDeg - 5).residualDeg,
    fit(samples, best.yawDeg + 5).residualDeg,
  );
  if (
    shoulder - best.residualDeg < 0.02 ||
    best.maxResidualDeg > 2 ||
    angularSeparation(best.axis, PHONE_TOP) > 25 ||
    Math.abs(best.yawDeg - center) > 39.8
  )
    throw new Error('Alignment poorly constrained');
  return best;
}
export function pointingDelta(p: Vec3, target: Vec3) {
  const from = sceneToAltAz(p),
    to = sceneToAltAz(target);
  const azDeg = wrap180(to.azDeg - from.azDeg),
    altDeg = to.altDeg - from.altDeg;
  return {
    azDeg,
    altDeg,
    horizontalDeg: azDeg * Math.cos(to.altDeg * DEG),
    separationDeg: angularSeparation(p, target),
    nearZenith: Math.abs(to.altDeg) > 85,
  };
}
/** 구면 삼각법으로 지평 좌표를 시간각/적위로 역변환. 시간각 양수=서쪽. 굴절 포함 안내용 근사. */
export function horizonToHourAngle(altDeg: number, azDeg: number, latitudeDeg: number) {
  const a = altDeg * DEG,
    z = azDeg * DEG,
    l = latitudeDeg * DEG;
  return {
    haDeg:
      Math.atan2(
        -Math.sin(z) * Math.cos(a),
        Math.sin(a) * Math.cos(l) - Math.cos(a) * Math.sin(l) * Math.cos(z),
      ) * RAD,
    decDeg:
      Math.asin(
        Math.max(
          -1,
          Math.min(1, Math.sin(a) * Math.sin(l) + Math.cos(a) * Math.cos(l) * Math.cos(z)),
        ),
      ) * RAD,
  };
}
export function equatorialDelta(p: Vec3, target: Vec3, lat: number) {
  const a = sceneToAltAz(p),
    b = sceneToAltAz(target);
  const from = horizonToHourAngle(a.altDeg, a.azDeg, lat),
    to = horizonToHourAngle(b.altDeg, b.azDeg, lat);
  return { haDeg: wrap180(to.haDeg - from.haDeg), decDeg: to.decDeg - from.decDeg };
}
export function sunUnsafe(
  sunAltDeg: number,
  sunAzDeg: number,
  directions: readonly Vec3[],
): boolean {
  return (
    sunAltDeg > -6 &&
    directions.some((d) => angularSeparation(d, altAzToScene(sunAltDeg, sunAzDeg)) < 15)
  );
}
