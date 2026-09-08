/** 망원경 전용 상대 방향: 자력계·AR 보정·화면 회전을 안내에 섞지 않는다. W3C RelativeOrientationSensor. */
import type { Quaternion } from 'three';
import { create } from 'zustand';
import { physicalQuaternion, type QTuple } from '@/astro/pointing';
import { deviceOrientationToScene, genericSensorToScene } from './orientation/math';
import { requestOrientationPermission } from './permissions';
import { useSensorStore } from '@/state/sensorStore';
import { isNative, watchNativeMotion } from '@/native/motion';
interface Reading {
  q: QTuple | null;
  at: number;
  status: 'off' | 'waiting' | 'active' | 'unavailable' | 'denied';
  source: string;
  sessionId: string;
}
export const useTelescopeOrientation = create<Reading>(() => ({
  q: null,
  at: 0,
  status: 'off',
  source: '',
  sessionId: '',
}));
interface RelativeSensor {
  quaternion: ArrayLike<number> | null;
  onreading: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
let cleanup: (() => void) | null = null;
let generation = 0;
export function stopTelescopeOrientation() {
  generation++;
  cleanup?.();
  cleanup = null;
  useTelescopeOrientation.setState({ q: null, status: 'off', at: 0 });
}
export async function startTelescopeOrientation() {
  stopTelescopeOrientation();
  const token = generation;
  useTelescopeOrientation.setState({
    status: 'waiting',
    sessionId: crypto.randomUUID(),
    source: '',
  });
  const simulation = useSensorStore.getState().simulator;
  const permission = simulation ? 'granted' : await requestOrientationPermission();
  if (token !== generation) return;
  if (permission !== 'granted') {
    useTelescopeOrientation.setState({
      status: permission === 'denied' ? 'denied' : 'unavailable',
    });
    return;
  }
  let filtered: Quaternion | null = null,
    last = 0,
    readingAt = 0;
  const publish = (q: Quaternion, source: string) => {
    if (token !== generation) return;
    if (!q.toArray().every(Number.isFinite) || q.lengthSq() < 1e-9) return;
    const now = performance.now();
    const dt = Math.max(0, now - readingAt);
    readingAt = now;
    filtered = filtered ? filtered.slerp(q, 1 - Math.exp(-dt / 65)) : q.clone();
    if (now - last < 60) return;
    last = now;
    useTelescopeOrientation.setState({
      q: filtered.toArray() as QTuple,
      at: Date.now(),
      status: 'active',
      source,
    });
  };
  const watchdog = window.setInterval(() => {
    const s = useTelescopeOrientation.getState();
    if (s.status === 'active' && Date.now() - s.at > 1500)
      useTelescopeOrientation.setState({
        status: 'unavailable',
        q: null,
        sessionId: crypto.randomUUID(),
      });
  }, 500);
  if (simulation) {
    const timer = window.setInterval(() => {
      const s = useSensorStore.getState().sim;
      publish(deviceOrientationToScene(s.alpha, s.beta, s.gamma, 0), 'Simulator');
    }, 30);
    cleanup = () => {
      clearInterval(timer);
      clearInterval(watchdog);
    };
    return;
  }
  if (isNative()) {
    const stop = watchNativeMotion(
      true,
      (r) => publish(genericSensorToScene(r.quaternion, 0, 'device'), 'Native relative'),
      () => {
        if (token === generation)
          useTelescopeOrientation.setState({ status: 'unavailable', q: null });
      },
    );
    cleanup = () => {
      stop();
      clearInterval(watchdog);
    };
    return;
  }
  let sensor: RelativeSensor | null = null,
    fallbackStarted = false;
  let timeout = 0;
  const handler = (e: DeviceOrientationEvent) => {
    // absolute=true를 무시한다. 지원 안 되는 기기에서 나침반으로 몰래 대체하지 않는다.
    if (e.absolute || e.alpha === null || e.beta === null || e.gamma === null) return;
    if (![e.alpha, e.beta, e.gamma].every(Number.isFinite)) return;
    publish(
      physicalQuaternion(deviceOrientationToScene(e.alpha, e.beta, e.gamma, 0), 0),
      'DeviceOrientation (relative)',
    );
  };
  const fallback = () => {
    if (fallbackStarted || token !== generation) return;
    fallbackStarted = true;
    sensor?.stop();
    filtered = null;
    window.addEventListener('deviceorientation', handler);
    timeout = window.setTimeout(() => {
      if (useTelescopeOrientation.getState().status === 'waiting')
        useTelescopeOrientation.setState({ status: 'unavailable' });
    }, 4000);
  };
  const Ctor = (
    window as unknown as {
      RelativeOrientationSensor?: new (options: {
        frequency: number;
        referenceFrame: 'device';
      }) => RelativeSensor;
    }
  ).RelativeOrientationSensor;
  if (Ctor) {
    try {
      sensor = new Ctor({ frequency: 30, referenceFrame: 'device' });
      sensor.onreading = () => {
        if (sensor?.quaternion)
          publish(
            genericSensorToScene(sensor.quaternion, 0, 'device'),
            'RelativeOrientationSensor',
          );
      };
      sensor.onerror = fallback;
      sensor.start();
      timeout = window.setTimeout(() => {
        if (useTelescopeOrientation.getState().status === 'waiting') fallback();
      }, 2500);
    } catch {
      fallback();
    }
  } else fallback();
  cleanup = () => {
    sensor?.stop();
    window.removeEventListener('deviceorientation', handler);
    clearTimeout(timeout);
    clearInterval(watchdog);
  };
}
