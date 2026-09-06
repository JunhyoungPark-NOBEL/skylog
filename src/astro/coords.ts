/**
 * 좌표 변환 순수 함수 (마스터 플랜 §6.2).
 * - 적도 좌표(J2000/of-date): RA·Dec 도(deg). 단위벡터 x→춘분점, z→천구 북극(오른손).
 * - 지평 좌표: Alt −90..90, Az 북=0 동=90 남=180 서=270.
 * - 씬 프레임(Three.js): +X=동, +Y=천정, +Z=남. (alt, az) → (cos alt·sin az, sin alt, −cos alt·cos az)
 * - astronomy-engine HOR 프레임: x=북, y=서, z=천정 → 씬 = (−hor.y, hor.z, −hor.x)
 */

export type Vec3 = [number, number, number];

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function wrap360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** −180 < r ≤ 180 */
export function wrap180(deg: number): number {
  const r = wrap360(deg);
  return r > 180 ? r - 360 : r;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** RA/Dec(도) → 적도 단위벡터 */
export function raDecToUnitVector(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const cd = Math.cos(dec);
  return [cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec)];
}

/** 적도 단위벡터 → RA/Dec(도). 벡터 길이는 1일 필요 없음. */
export function unitVectorToRaDec(v: Vec3): { raDeg: number; decDeg: number } {
  const [x, y, z] = v;
  const r = Math.hypot(x, y, z) || 1;
  return { raDeg: wrap360(Math.atan2(y, x) * RAD), decDeg: Math.asin(clamp(z / r, -1, 1)) * RAD };
}

/** (alt, az) → 씬 벡터 (+X 동, +Y 천정, +Z 남) */
export function altAzToScene(altDeg: number, azDeg: number): Vec3 {
  const alt = altDeg * DEG;
  const az = azDeg * DEG;
  const ca = Math.cos(alt);
  return [ca * Math.sin(az), Math.sin(alt), -ca * Math.cos(az)];
}

/** 씬 벡터 → (alt, az) */
export function sceneToAltAz(v: Vec3): { altDeg: number; azDeg: number } {
  const [x, y, z] = v;
  const r = Math.hypot(x, y, z) || 1;
  return { altDeg: Math.asin(clamp(y / r, -1, 1)) * RAD, azDeg: wrap360(Math.atan2(x, -z) * RAD) };
}

/** astronomy-engine HOR(x 북, y 서, z 천정) → 씬 */
export function horToScene(hor: { x: number; y: number; z: number }): Vec3 {
  return [-hor.y, hor.z, -hor.x];
}

/** 씬 → astronomy-engine HOR */
export function sceneToHor(v: Vec3): { x: number; y: number; z: number } {
  return { x: -v[2], y: -v[0], z: v[1] };
}

/** 두 방향의 각거리(도). 단위벡터가 아니어도 됨. 작은 각도에서도 안정(atan2). */
export function angularSeparation(a: Vec3, b: Vec3): number {
  const cx = a[1] * b[2] - a[2] * b[1];
  const cy = a[2] * b[0] - a[0] * b[2];
  const cz = a[0] * b[1] - a[1] * b[0];
  const cross = Math.hypot(cx, cy, cz);
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.atan2(cross, dot) * RAD;
}

/** RA/Dec 쌍의 각거리(도) */
export function angularSeparationRaDec(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number,
): number {
  return angularSeparation(raDecToUnitVector(ra1, dec1), raDecToUnitVector(ra2, dec2));
}

/** 시간각(도, −180..180): H = LST − RA */
export function hourAngleDeg(lstDeg: number, raDeg: number): number {
  return wrap180(lstDeg - raDeg);
}

/**
 * 구면 삼각법으로 (H, δ, φ) → (alt, az). 검증·해석식 전용(빠른 경로는 frames.ts 행렬).
 * Meeus, Astronomical Algorithms 2nd ed., ch.13 (13.5, 13.6) — az 남=0 관례를 북=0으로 변환.
 */
export function equatorialToHorizontal(
  hourAngleDegValue: number,
  decDeg: number,
  latDeg: number,
): { altDeg: number; azDeg: number } {
  const H = hourAngleDegValue * DEG;
  const d = decDeg * DEG;
  const p = latDeg * DEG;
  const sinAlt = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const y = Math.sin(H);
  const x = Math.cos(H) * Math.sin(p) - Math.tan(d) * Math.cos(p);
  const azFromSouth = Math.atan2(y, x) * RAD; // 남=0, 서=+90
  return { altDeg: alt * RAD, azDeg: wrap360(azFromSouth + 180) };
}

export function formatDeg(deg: number, digits = 1): string {
  return `${deg.toFixed(digits)}°`;
}
