/**
 * 좌표계 회전(J2000 적도 → 지평/씬)과 astronomy-engine 래퍼.
 *
 * ⚠️ astronomy-engine 호출 규칙(마스터 플랜 §6.2): `Horizon()`은 RA를 **항성시 시간(hours)** 단위,
 * **equator-of-date(EQD)** 좌표로 받는다. 이 파일의 래퍼만이 그 함수들을 호출하고, 바깥에는 도(deg)·J2000 API만 노출한다.
 * `Constellation()`은 J2000 RA(hours)/Dec를 받는다.
 *
 * 빠른 경로: `eqjToSceneMatrix()` — 프레임당 3×3 행렬 하나. 렌더러는 J2000 단위벡터 버퍼에 이 행렬만 곱한다.
 * 느린 경로: `eqjToAltAzSlow()` — Rotation_EQJ_EQD → RotateVector → Horizon. 테스트에서 빠른 경로와 ≤0.01° 대조.
 */
import {
  Constellation,
  EquatorFromVector,
  Horizon,
  Observer,
  RotateVector,
  Rotation_EQJ_EQD,
  Rotation_EQJ_HOR,
  Vector,
  type AstroTime,
} from 'astronomy-engine';
import {
  clamp,
  horToScene,
  raDecToUnitVector,
  sceneToAltAz,
  unitVectorToRaDec,
  wrap360,
  type Vec3,
} from '@/astro/coords';
import { toAstroTime, type DateLike } from '@/astro/time';

export interface ObserverLike {
  lat: number;
  lon: number;
  elevation?: number;
}

export type Refraction = 'normal' | null;

export function makeObserver(o: ObserverLike): Observer {
  return new Observer(o.lat, o.lon, o.elevation ?? 0);
}

/** 3×3 행렬 (column-major, Three.js `Matrix3.fromArray` / GLSL mat3 순서) */
export type Mat3 = Float32Array;

/** column-major 3×3 행렬 × 벡터 */
export function applyMat3(m: ArrayLike<number>, v: Vec3): Vec3 {
  return [
    m[0]! * v[0] + m[3]! * v[1] + m[6]! * v[2],
    m[1]! * v[0] + m[4]! * v[1] + m[7]! * v[2],
    m[2]! * v[0] + m[5]! * v[1] + m[8]! * v[2],
  ];
}

/**
 * J2000 적도 단위벡터 → 씬(+X 동, +Y 천정, +Z 남) 회전행렬. 굴절 없음(굴절은 셰이더/표시 단계에서).
 * 기저 벡터를 astronomy-engine `RotateVector`로 돌려 행렬 열을 만들므로 엔진의 행렬 관례에 의존하지 않는다.
 */
export function eqjToSceneMatrix(date: DateLike, observer: ObserverLike): Mat3 {
  const time = toAstroTime(date);
  const rot = Rotation_EQJ_HOR(time, makeObserver(observer));
  const m = new Float32Array(9);
  const basis: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  basis.forEach((e, col) => {
    const hor = RotateVector(rot, new Vector(e[0], e[1], e[2], time));
    const s = horToScene(hor);
    m[col * 3] = s[0];
    m[col * 3 + 1] = s[1];
    m[col * 3 + 2] = s[2];
  });
  return m;
}

/** 빠른 경로: J2000 RA/Dec(도) → alt/az(도, 굴절 없음). 행렬을 이미 갖고 있으면 `applyMat3` + `sceneToAltAz`를 직접 쓴다. */
export function eqjToAltAz(
  date: DateLike,
  observer: ObserverLike,
  raDeg: number,
  decDeg: number,
  matrix?: Mat3,
): { altDeg: number; azDeg: number } {
  const m = matrix ?? eqjToSceneMatrix(date, observer);
  return sceneToAltAz(applyMat3(m, raDecToUnitVector(raDeg, decDeg)));
}

/** J2000 → equator-of-date(세차·장동 적용) RA/Dec(도) */
export function j2000ToOfDate(
  date: DateLike,
  raDeg: number,
  decDeg: number,
): { raDeg: number; decDeg: number } {
  const time = toAstroTime(date);
  const v = raDecToUnitVector(raDeg, decDeg);
  const eqd = RotateVector(Rotation_EQJ_EQD(time), new Vector(v[0], v[1], v[2], time));
  return unitVectorToRaDec([eqd.x, eqd.y, eqd.z]);
}

/**
 * 느린 경로(검증·상세 화면용): J2000 RA/Dec(도) → EQD → `Horizon()`(RA hours) → alt/az.
 * refraction 'normal'이면 대기 굴절 포함 겉보기 고도.
 */
export function eqjToAltAzSlow(
  date: DateLike,
  observer: ObserverLike,
  raDeg: number,
  decDeg: number,
  refraction: Refraction = null,
): { altDeg: number; azDeg: number } {
  const time = toAstroTime(date);
  const ofDate = j2000ToOfDate(time, raDeg, decDeg);
  const hor = Horizon(
    time,
    makeObserver(observer),
    ofDate.raDeg / 15,
    ofDate.decDeg,
    refraction ?? undefined,
  );
  return { altDeg: hor.altitude, azDeg: wrap360(hor.azimuth) };
}

/** of-date RA/Dec(도) → alt/az. 행성처럼 이미 of-date 좌표를 가진 경우. */
export function ofDateToAltAz(
  time: AstroTime,
  observer: Observer,
  raDeg: number,
  decDeg: number,
  refraction: Refraction,
): { altDeg: number; azDeg: number } {
  // astronomy-engine 타입은 refraction?: string — 굴절 없음은 undefined로 전달한다.
  const hor = Horizon(time, observer, raDeg / 15, decDeg, refraction ?? undefined);
  return { altDeg: hor.altitude, azDeg: wrap360(hor.azimuth) };
}

/** 적도 벡터(EQJ 또는 EQD) → RA/Dec(도) */
export function vectorToRaDecDeg(v: Vector): { raDeg: number; decDeg: number } {
  const eq = EquatorFromVector(v);
  return { raDeg: wrap360(eq.ra * 15), decDeg: clamp(eq.dec, -90, 90) };
}

/** J2000 RA/Dec(도)가 속한 별자리 (IAU 3글자 약어 + 영문 이름) */
export function constellationAt(raDeg: number, decDeg: number): { symbol: string; name: string } {
  const c = Constellation(wrap360(raDeg) / 15, decDeg);
  return { symbol: c.symbol, name: c.name };
}
