import { Quaternion, Vector3 } from 'three';
import { DEG } from '@/astro/coords';
import { yawQuaternion } from './orientation/math';
import type { ObserverLocation } from '@/state/locationStore';
import type { SavedAlignment } from '@/state/telescopeStore';
import type { TelescopeReading } from './telescopePose';

/** GPS의 작은 흔들림은 허용하지만 관측 장소 변경은 새 설치로 취급한다. */
export function sameObservingSite(a: ObserverLocation, b: ObserverLocation): boolean {
  const values = [a.lat, a.lon, a.elevation, b.lat, b.lon, b.elevation];
  if (!values.every(Number.isFinite)) return false;
  const dy = (a.lat - b.lat) * 111_195;
  const dx = (((a.lon - b.lon + 540) % 360) - 180) * 111_195 * Math.cos(a.lat * DEG);
  return Math.hypot(dx, dy) <= 100 && Math.abs(a.elevation - b.elevation) <= 100;
}
export function usableTelescopeAlignment(
  saved: SavedAlignment | null,
  reading: TelescopeReading,
  key: string,
  site: ObserverLocation,
  now: number,
): SavedAlignment | null {
  return saved?.method === 'three-star-v1' &&
    saved.site &&
    saved.samples.length === 3 &&
    new Set(saved.samples.map((s) => s.objectId)).size === 3 &&
    reading.mode === 'relative' &&
    reading.status === 'active' &&
    reading.q &&
    now >= reading.at &&
    now - reading.at < 1500 &&
    saved.sessionId === reading.sessionId &&
    saved.provider === reading.source &&
    saved.profileKey === key &&
    sameObservingSite(saved.site, site)
    ? saved
    : null;
}
/** 같은 센서를 육안 화면에서 재사용할 때만 화면 회전을 다시 붙인다. 경통 축 보정은 적용하지 않는다. */
export function calibratedHandheldQuaternion(
  q: [number, number, number, number],
  yaw: number,
  screen: number,
) {
  return new Quaternion(...q)
    .premultiply(yawQuaternion(yaw))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -screen * DEG))
    .normalize();
}
