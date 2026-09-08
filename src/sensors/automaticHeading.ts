/** 별 정렬 없이 확인할 수 있는 북 기준만 채택한다. 상대 yaw 자체는 방위가 아니다. */
import type { Quaternion } from 'three';
import { physicalQuaternion } from '@/astro/pointing';
import { compassSyncCandidate, YawSync } from './orientation/calibration';
import { angleBetween, applyYawOffset } from './orientation/math';
import type { OrientationSample } from './orientation/types';

export class AutomaticHeading {
  private sync = new YawSync();
  private previous: OrientationSample | null = null;
  private lastCompassMs = -Infinity;

  push(sample: OrientationSample, declination: number): Quaternion | null {
    if (
      this.previous &&
      (sample.northReference !== this.previous.northReference ||
        sample.timestampMs - this.previous.timestampMs > 1500)
    ) {
      this.sync = new YawSync();
      this.lastCompassMs = -Infinity;
    }
    if (sample.northReference !== 'relative') {
      this.previous = sample;
      return physicalQuaternion(
        applyYawOffset(sample.q, sample.northReference === 'magnetic' ? declination : 0),
        sample.screenAngleDeg,
      );
    }
    const previous = this.previous;
    this.previous = sample;
    const dt = previous ? sample.timestampMs - previous.timestampMs : 0;
    const quasiStatic =
      !!previous &&
      dt > 0 &&
      angleBetween(
        physicalQuaternion(previous.q, previous.screenAngleDeg),
        physicalQuaternion(sample.q, sample.screenAngleDeg),
      ) /
        (dt / 1000) <
        10;
    const candidate = compassSyncCandidate({
      qRel: sample.q,
      compassHeadingDeg: sample.compassHeadingDeg,
      compassAccuracyDeg: sample.compassAccuracyDeg,
      betaDeg: sample.raw.beta,
      gammaDeg: sample.raw.gamma,
      screenAngleDeg: sample.screenAngleDeg,
      declinationDeg: declination,
      quasiStatic,
      axis: 'top',
    });
    if (candidate !== null) this.lastCompassMs = sample.timestampMs;
    const yaw = this.sync.update(candidate, sample.timestampMs);
    // 큰 기울기에서는 짧게 자이로를 이어 쓰지만 오래된 나침반 동기화를 확정 방위로 두지 않는다.
    if (yaw === null || sample.timestampMs - this.lastCompassMs > 30_000) return null;
    return physicalQuaternion(applyYawOffset(sample.q, yaw), sample.screenAngleDeg);
  }
}
