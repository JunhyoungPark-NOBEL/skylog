import { Quaternion } from 'three';
import type { QTuple } from '@/astro/pointing';
import { useTelescopeOrientation, type TelescopeReading } from './telescopePose';

/** 센서가 계속 들어오는 동안만 평균을 낸다. 흔들리는 경통·끊긴 입력은 보정에 넣지 않는다. */
export function averageAlignmentPose(readings: readonly TelescopeReading[], maxSpreadDeg: number) {
  const first = readings[0];
  if (!first?.q || readings.length < 8 || readings.at(-1)!.sampleMs - first.sampleMs < 400)
    throw new Error('Not enough live samples');
  const base = new Quaternion(...first.q),
    sum = [0, 0, 0, 0];
  let timestamp = 0;
  for (const [i, r] of readings.entries()) {
    if (
      !r.q ||
      r.status !== 'active' ||
      r.mode !== 'relative' ||
      r.sessionId !== first.sessionId ||
      r.source !== first.source ||
      !r.q.every(Number.isFinite) ||
      Math.abs(Math.hypot(...r.q) - 1) > 0.01 ||
      !Number.isFinite(r.sampleMs) ||
      !Number.isFinite(r.at) ||
      (i > 0 && r.sampleMs <= readings[i - 1]!.sampleMs)
    )
      throw new Error('Sensor session changed');
    const q = new Quaternion(...r.q);
    if ((base.angleTo(q) * 180) / Math.PI > maxSpreadDeg) throw new Error('Hold the tube still');
    const sign = base.dot(q) < 0 ? -1 : 1;
    for (let k = 0; k < 4; k++) sum[k]! += r.q[k]! * sign;
    timestamp += r.at;
  }
  return {
    q: new Quaternion(...(sum as QTuple)).normalize().toArray() as QTuple,
    at: timestamp / readings.length,
    sessionId: first.sessionId,
    source: first.source,
  };
}
export function captureStableAlignmentPose(maxSpreadDeg: number, signal: AbortSignal) {
  return new Promise<ReturnType<typeof averageAlignmentPose>>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Capture cancelled'));
      return;
    }
    const readings: TelescopeReading[] = [];
    const unsubscribe = useTelescopeOrientation.subscribe((r) => readings.push(r));
    const finish = () => {
      clearTimeout(timer);
      unsubscribe();
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      finish();
      reject(new Error('Capture cancelled'));
    };
    const timer = window.setTimeout(() => {
      finish();
      try {
        resolve(averageAlignmentPose(readings, maxSpreadDeg));
      } catch (e) {
        reject(e);
      }
    }, 700);
    signal.addEventListener('abort', abort, { once: true });
  });
}
