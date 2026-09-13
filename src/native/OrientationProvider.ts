import { SampleClock } from '@/sensors/orientation/sampleClock';
import { NorthFusion } from '@/sensors/orientation/northFusion';
import { currentScreenAngle, genericSensorToScene } from '@/sensors/orientation/math';
import type { OrientationProvider, OrientationSample } from '@/sensors/orientation/types';
import { isNative, watchNativeMotion } from './motion';
export class NativeOrientationProvider implements OrientationProvider {
  constructor(private readonly relative = false) {}
  readonly name = 'NativeOrientation' as const;
  private cleanup: (() => void) | null = null;
  isSupported() {
    return isNative();
  }
  start(onSample: (s: OrientationSample) => void, onError: (e: Error) => void) {
    const clock = new SampleClock();
    const fusion = new NorthFusion();
    this.cleanup = watchNativeMotion(
      this.relative,
      (reading) => {
        const r = fusion.push(reading);
        if (!r) return;
        const timestampMs = clock.map(r.timestampMs, performance.now());
        if (timestampMs === null) return;
        const screenAngleDeg = currentScreenAngle();
        onSample({
          q: genericSensorToScene(r.quaternion, screenAngleDeg, 'device'),
          northReference: r.northReference,
          compassHeadingDeg: null,
          compassAccuracyDeg: r.headingAccuracyDeg ?? null,
          raw: { alpha: null, beta: null, gamma: null, absolute: r.northReference !== 'relative' },
          screenAngleDeg,
          timestampMs,
          provider: this.name,
        });
      },
      onError,
    );
  }
  stop() {
    this.cleanup?.();
    this.cleanup = null;
  }
}
