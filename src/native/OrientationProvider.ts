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
    this.cleanup = watchNativeMotion(
      this.relative,
      (r) => {
        const screenAngleDeg = currentScreenAngle();
        onSample({
          q: genericSensorToScene(r.quaternion, screenAngleDeg, 'device'),
          northReference: r.northReference,
          compassHeadingDeg: null,
          compassAccuracyDeg: r.headingAccuracyDeg ?? null,
          raw: { alpha: null, beta: null, gamma: null, absolute: r.northReference !== 'relative' },
          screenAngleDeg,
          timestampMs: performance.now(),
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
