/**
 * 기기 자세 → 씬 프레임 카메라 쿼터니언 (task-02 §3.3, G1 §A9).
 *
 * 규약(W3C Device Orientation): 기기 프레임 +x 오른쪽, +y 상단, +z 화면 밖(사용자 쪽). 후면 카메라 시선 = −z.
 * 오일러 α(z, 0..360 **위에서 볼 때 반시계**), β(x, −180..180), γ(y, −90..90), intrinsic Z–X′–Y″.
 * 절대 모드에서 기기 상단이 북이면 α=0, 서쪽이면 α=90, 동쪽이면 α=270 → 나침반 heading = 360 − α.
 *
 * 씬 프레임: +X 동, +Y 천정, +Z 남. 카메라는 로컬 −Z를 본다.
 *   q_scene = qY(α) · qX(β) · qZ(−γ) · qX(−π/2) · qZ(−θ)      (θ = screen.orientation.angle)
 * 이는 Three.js 구 DeviceOrientationControls와 같고 G1이 S·Rz(α)Rx(β)Ry(γ)Rz(−θ)와 동치임을 검산했다.
 * 테스트 벡터(tests/unit/sensors/math.test.ts): α=0,β=90 → 북 지평선; β=0 → 천저; β=−180 → 천정; α=90,β=90 → 서; α=270,β=90 → 동.
 *
 * 방위 규약: az = wrap360(atan2(p_x, −p_z)) (북 0, 동 90). **+Y 축 양의 회전은 방위를 줄인다** → yawQuaternion(Δaz) = qY(−Δaz).
 */
import { Quaternion, Vector3 } from 'three';
import { DEG, RAD, wrap180, wrap360, type Vec3 } from '@/astro/coords';

const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const Q_X_NEG_HALF_PI = new Quaternion().setFromAxisAngle(X, -Math.PI / 2);

export function qAxis(axis: Vector3, deg: number): Quaternion {
  return new Quaternion().setFromAxisAngle(axis, deg * DEG);
}

/** W3C 오일러(도) + 화면 회전(도) → 씬 카메라 쿼터니언 */
export function deviceOrientationToScene(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenAngleDeg = 0,
): Quaternion {
  const q = qAxis(Y, alphaDeg);
  q.multiply(qAxis(X, betaDeg));
  q.multiply(qAxis(Z, -gammaDeg));
  q.multiply(Q_X_NEG_HALF_PI);
  if (screenAngleDeg !== 0) q.multiply(qAxis(Z, -screenAngleDeg));
  return q.normalize();
}

/**
 * Generic Sensor 쿼터니언([x,y,z,w], 기기→ENU) → 씬.
 *   referenceFrame 'device': qX(−π/2) · qG · qZ(−θ), 'screen': qX(−π/2) · qG (화면 보정 중복 금지)
 */
export function genericSensorToScene(
  xyzw: ArrayLike<number>,
  screenAngleDeg: number,
  referenceFrame: 'device' | 'screen' = 'device',
): Quaternion {
  const qG = new Quaternion(xyzw[0]!, xyzw[1]!, xyzw[2]!, xyzw[3]!).normalize();
  const q = Q_X_NEG_HALF_PI.clone().multiply(qG);
  if (referenceFrame === 'device' && screenAngleDeg !== 0) q.multiply(qAxis(Z, -screenAngleDeg));
  return q.normalize();
}

/** 카메라 시선(씬 단위벡터) */
export function cameraDirection(q: Quaternion): Vec3 {
  const v = new Vector3(0, 0, -1).applyQuaternion(q);
  return [v.x, v.y, v.z];
}

/** 시선 → alt/az. 천정·천저 근처(수평 성분 < 1e-6)에서는 az = null. */
export function quaternionToAltAz(q: Quaternion): { altDeg: number; azDeg: number | null } {
  const [x, y, z] = cameraDirection(q);
  const horiz = Math.hypot(x, z);
  return {
    altDeg: Math.asin(Math.max(-1, Math.min(1, y))) * RAD,
    azDeg: horiz < 1e-6 ? null : wrap360(Math.atan2(x, -z) * RAD),
  };
}

/** 방위를 Δaz(도)만큼 늘리는 세계 프레임 yaw 회전 (편각·보정·동기화 모두 이것으로 적용) */
export function yawQuaternion(deltaAzDeg: number): Quaternion {
  return qAxis(Y, -deltaAzDeg);
}

/** q_world = R_yaw(Δaz) · q */
export function applyYawOffset(q: Quaternion, deltaAzDeg: number): Quaternion {
  if (deltaAzDeg === 0) return q.clone();
  return yawQuaternion(deltaAzDeg).multiply(q).normalize();
}

/** 카메라 오른쪽 축 기준 피치 오프셋(도, 양수 = 시선이 위로) — 1-별 정렬의 고도 차이 */
export function applyPitchOffset(q: Quaternion, pitchDeg: number): Quaternion {
  if (pitchDeg === 0) return q.clone();
  const right = new Vector3(1, 0, 0).applyQuaternion(q).normalize();
  right.y = 0; // 수평 성분만 (롤과 무관하게 고도만 바꾼다)
  if (right.lengthSq() < 1e-9) return q.clone();
  right.normalize();
  const rot = new Quaternion().setFromAxisAngle(right, pitchDeg * DEG);
  return rot.multiply(q).normalize();
}

/** 기기 물리 축(기기 프레임 벡터)의 씬 방향. 화면 회전 θ가 있으면 물리 축은 qZ(+θ)로 되돌린다. */
export function deviceAxisInScene(
  q: Quaternion,
  axis: Vec3,
  screenAngleDeg = 0,
): { dir: Vec3; azDeg: number | null; rho: number } {
  const v = new Vector3(axis[0], axis[1], axis[2]);
  if (screenAngleDeg !== 0) v.applyQuaternion(qAxis(Z, screenAngleDeg));
  v.applyQuaternion(q);
  const rho = Math.hypot(v.x, v.z);
  return {
    dir: [v.x, v.y, v.z],
    azDeg: rho < 1e-6 ? null : wrap360(Math.atan2(v.x, -v.z) * RAD),
    rho,
  };
}

/** 두 자세 사이 각(도) — q ≡ −q 처리 */
export function angleBetween(a: Quaternion, b: Quaternion): number {
  const d = Math.abs(a.dot(b));
  return 2 * Math.acos(Math.min(1, d)) * RAD;
}

/** 부호 동치·최단 경로를 처리한 slerp */
export function slerpShortest(a: Quaternion, b: Quaternion, t: number): Quaternion {
  const target = a.dot(b) < 0 ? new Quaternion(-b.x, -b.y, -b.z, -b.w) : b;
  return a.clone().slerp(target, t).normalize();
}

/** 화면 회전 각도(0/90/180/270) */
export function currentScreenAngle(): number {
  const so = globalThis.screen?.orientation;
  if (so && typeof so.angle === 'number') return so.angle;
  const legacy = (globalThis.window as unknown as { orientation?: number } | undefined)
    ?.orientation;
  return typeof legacy === 'number' ? wrap360(legacy) : 0;
}

/** 원형 평균(도) */
export function circularMeanDeg(values: number[]): number | null {
  if (values.length === 0) return null;
  let s = 0;
  let c = 0;
  for (const v of values) {
    s += Math.sin(v * DEG);
    c += Math.cos(v * DEG);
  }
  if (Math.hypot(s, c) < 1e-9) return null;
  return wrap360(Math.atan2(s, c) * RAD);
}

export { wrap180, wrap360 };
