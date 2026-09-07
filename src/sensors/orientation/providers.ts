/**
 * 방향 센서 Provider 어댑터 (task-02 §3.2, G1 §A7-1 우선순위).
 * 우선순위: DeviceOrientationAbsolute → AbsoluteOrientationSensor(선택) → DeviceOrientation(absolute=true면 자북, 아니면 상대+iOS 나침반).
 * 모든 Provider는 화면 회전을 반영한 **씬 카메라 쿼터니언**을 낸다. 권한 요청은 호출자가 사용자 제스처 안에서 먼저 한다.
 * 리스너는 AR 모드에서만 등록하고 stop()에서 해제한다(배터리).
 */
import { wrap360 } from '@/astro/coords';
import {
  currentScreenAngle,
  deviceOrientationToScene,
  genericSensorToScene,
} from '@/sensors/orientation/math';
import type {
  OrientationProvider,
  OrientationSample,
  ProviderName,
} from '@/sensors/orientation/types';

type DOEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

function finite(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function sampleFromEvent(
  e: DOEvent,
  provider: ProviderName,
  forceAbsolute: boolean,
): OrientationSample | null {
  const alpha = finite(e.alpha);
  const beta = finite(e.beta);
  const gamma = finite(e.gamma);
  if (alpha === null || beta === null || gamma === null) return null; // 누락값은 0으로 치환하지 않는다
  const screen = currentScreenAngle();
  const absolute = forceAbsolute || e.absolute === true;
  // iOS: webkitCompassHeading(0=북, 시계 방향, 자북), accuracy 음수 = 무효
  const heading = finite(e.webkitCompassHeading);
  const acc = finite(e.webkitCompassAccuracy);
  return {
    q: deviceOrientationToScene(alpha, beta, gamma, screen),
    northReference: absolute ? 'magnetic' : 'relative',
    compassHeadingDeg: heading !== null && heading >= 0 && heading < 360 ? heading : null,
    compassAccuracyDeg: acc,
    raw: { alpha, beta, gamma, absolute },
    screenAngleDeg: screen,
    timestampMs: performance.now(),
    provider,
  };
}

/** Android: `deviceorientationabsolute` (자북 기준 절대 자세) */
export class DeviceOrientationAbsoluteProvider implements OrientationProvider {
  readonly name: ProviderName = 'DeviceOrientationAbsolute';
  private handler: ((e: Event) => void) | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'ondeviceorientationabsolute' in window;
  }

  start(onSample: (s: OrientationSample) => void): void {
    this.handler = (e) => {
      const s = sampleFromEvent(e as DOEvent, this.name, true);
      if (s) onSample(s);
    };
    window.addEventListener('deviceorientationabsolute', this.handler);
  }

  stop(): void {
    if (this.handler) window.removeEventListener('deviceorientationabsolute', this.handler);
    this.handler = null;
  }
}

/** iOS·기타: `deviceorientation`. absolute=true면 자북, 아니면 상대 자세 + (iOS) 나침반 heading */
export class DeviceOrientationProvider implements OrientationProvider {
  readonly name: ProviderName = 'DeviceOrientation';
  private handler: ((e: Event) => void) | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  start(onSample: (s: OrientationSample) => void): void {
    this.handler = (e) => {
      const s = sampleFromEvent(e as DOEvent, this.name, false);
      if (s) onSample(s);
    };
    window.addEventListener('deviceorientation', this.handler);
  }

  stop(): void {
    if (this.handler) window.removeEventListener('deviceorientation', this.handler);
    this.handler = null;
  }
}

interface GenericSensor {
  quaternion: ArrayLike<number> | null;
  onreading: (() => void) | null;
  onerror: ((e: { error?: { name?: string; message?: string } }) => void) | null;
  start(): void;
  stop(): void;
}
type GenericSensorCtor = new (opts: {
  frequency: number;
  referenceFrame: 'device' | 'screen';
}) => GenericSensor;

/** Chrome/Edge Android: Generic Sensor API 절대 방향(선택적 Provider). 자북 ENU. */
export class AbsoluteOrientationSensorProvider implements OrientationProvider {
  readonly name: ProviderName = 'AbsoluteOrientationSensor';
  private sensor: GenericSensor | null = null;

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'AbsoluteOrientationSensor' in window &&
      window.isSecureContext
    );
  }

  start(onSample: (s: OrientationSample) => void, onError: (err: Error) => void): void {
    const Ctor = (window as unknown as { AbsoluteOrientationSensor?: GenericSensorCtor })
      .AbsoluteOrientationSensor;
    if (!Ctor) {
      onError(new Error('AbsoluteOrientationSensor unavailable'));
      return;
    }
    try {
      const sensor = new Ctor({ frequency: 60, referenceFrame: 'device' });
      sensor.onreading = () => {
        const q = sensor.quaternion;
        if (!q || q.length < 4) return;
        onSample({
          q: genericSensorToScene(q, currentScreenAngle(), 'device'),
          northReference: 'magnetic',
          compassHeadingDeg: null,
          compassAccuracyDeg: null,
          raw: { alpha: null, beta: null, gamma: null, absolute: true },
          screenAngleDeg: currentScreenAngle(),
          timestampMs: performance.now(),
          provider: this.name,
        });
      };
      sensor.onerror = (e) =>
        onError(new Error(e.error?.message ?? e.error?.name ?? 'sensor error'));
      sensor.start();
      this.sensor = sensor;
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  stop(): void {
    try {
      this.sensor?.stop();
    } catch {
      /* 무시 */
    }
    this.sensor = null;
  }
}

export interface SimValues {
  alpha: number;
  beta: number;
  gamma: number;
  compassHeading: number;
  compassAccuracy: number;
  /** true면 Android 절대 이벤트처럼(자북), false면 iOS처럼 상대+나침반 */
  absolute: boolean;
}

/** 데스크톱 시뮬레이터 (task-02 §4.3): 슬라이더 값을 같은 인터페이스로 30Hz 발행. Playwright가 AR 전 과정을 검증한다. */
export class SimulatorProvider implements OrientationProvider {
  readonly name: ProviderName = 'Simulator';
  private timer = 0;
  private values: SimValues = {
    alpha: 0,
    beta: 90,
    gamma: 0,
    compassHeading: 0,
    compassAccuracy: 5,
    absolute: false,
  };

  constructor(private readonly getValues: () => SimValues) {}

  isSupported(): boolean {
    return true;
  }

  start(onSample: (s: OrientationSample) => void): void {
    const tick = () => {
      this.values = this.getValues();
      const v = this.values;
      onSample({
        q: deviceOrientationToScene(v.alpha, v.beta, v.gamma, 0),
        northReference: v.absolute ? 'magnetic' : 'relative',
        compassHeadingDeg: v.absolute ? null : wrap360(v.compassHeading),
        compassAccuracyDeg: v.absolute ? null : v.compassAccuracy,
        raw: { alpha: v.alpha, beta: v.beta, gamma: v.gamma, absolute: v.absolute },
        screenAngleDeg: 0,
        timestampMs: performance.now(),
        provider: this.name,
      });
    };
    this.timer = window.setInterval(tick, 1000 / 30);
    tick();
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.timer = 0;
  }
}

/** 지원되는 Provider를 우선순위대로 (시뮬레이터 제외) */
export function availableProviders(): OrientationProvider[] {
  const all: OrientationProvider[] = [
    new DeviceOrientationAbsoluteProvider(),
    new AbsoluteOrientationSensorProvider(),
    new DeviceOrientationProvider(),
  ];
  return all.filter((p) => p.isSupported());
}
