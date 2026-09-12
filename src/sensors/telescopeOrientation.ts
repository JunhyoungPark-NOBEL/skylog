/** 별길 방향: automatic은 나침반 추정, relative는 별 보정용 자이로. 두 모드 모두 폰 물리 +Y를 고정한다. */
import type { Quaternion } from 'three';
import { OrientationFilter } from './orientation/filter';
import { useViewStore } from '@/state/viewStore';
import { degPerPixel } from '@/render/projection';
import { create } from 'zustand';
import { physicalQuaternion, type QTuple } from '@/astro/pointing';
import { deviceOrientationToScene, genericSensorToScene } from './orientation/math';
import { requestOrientationPermission } from './permissions';
import { useSensorStore } from '@/state/sensorStore';
import { isNative, watchNativeMotion } from '@/native/motion';
import { AutomaticHeading } from './automaticHeading';
import { availableProviders, SimulatorProvider } from './orientation/providers';
import { declinationDeg } from './declination';
import { useLocationStore } from '@/state/locationStore';
interface Reading {
  q: QTuple | null;
  at: number;
  status: 'off' | 'waiting' | 'active' | 'unavailable' | 'denied';
  source: string;
  sessionId: string;
  mode: 'automatic' | 'relative';
  headingReady: boolean;
}
export const useTelescopeOrientation = create<Reading>(() => ({
  q: null,
  at: 0,
  status: 'off',
  source: '',
  sessionId: '',
  mode: 'automatic',
  headingReady: false,
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
  useTelescopeOrientation.setState({ q: null, status: 'off', at: 0, headingReady: false });
}
export async function startTelescopeOrientation(mode: Reading['mode'] = 'automatic') {
  stopTelescopeOrientation();
  const token = generation;
  useTelescopeOrientation.setState({
    status: 'waiting',
    sessionId: crypto.randomUUID(),
    source: '',
    mode,
  });
  const simulation = useSensorStore.getState().simulator;
  const permission = simulation
    ? 'granted'
    : await requestOrientationPermission(mode === 'automatic');
  if (token !== generation) return;
  if (permission !== 'granted') {
    useTelescopeOrientation.setState({
      status: permission === 'denied' ? 'denied' : 'unavailable',
    });
    return;
  }
  const filter = new OrientationFilter();
  let last = 0;
  const publish = (q: Quaternion, source: string, headingReady = false) => {
    if (token !== generation) return;
    if (!q.toArray().every(Number.isFinite) || q.lengthSq() < 1e-9) return;
    const previous = useTelescopeOrientation.getState();
    const at = Date.now();
    const resumed = previous.at > 0 && at - previous.at > 1500;
    // 백그라운드 복귀 첫 센서가 watchdog보다 먼저 와도 상대 yaw의 이전 정렬을 재사용하지 않는다.
    if (resumed) filter.reset();
    const now = performance.now();
    const fov = useViewStore.getState().fovDeg;
    filter.setViewport(fov, degPerPixel(fov, window.innerWidth, window.innerHeight));
    const filtered = filter.push(q, now);
    if (!resumed && now - last < 30) return;
    last = now;
    useTelescopeOrientation.setState({
      q: filtered.toArray() as QTuple,
      at,
      status: 'active',
      source,
      headingReady,
      ...(resumed ? { sessionId: crypto.randomUUID() } : {}),
    });
  };
  const watchdog = window.setInterval(() => {
    const s = useTelescopeOrientation.getState();
    if (s.status === 'active' && Date.now() - s.at > 1500)
      useTelescopeOrientation.setState({
        status: 'unavailable',
        q: null,
        sessionId: crypto.randomUUID(),
        headingReady: false,
      });
  }, 500);
  if (mode === 'automatic') {
    const providers = simulation
      ? [new SimulatorProvider(() => ({ ...useSensorStore.getState().sim, absolute: false }))]
      : availableProviders();
    let provider: (typeof providers)[number] | null = null;
    let timeout = 0;
    const next = () => {
      clearTimeout(timeout);
      provider?.stop();
      if (token !== generation) return;
      provider = providers.shift() ?? null;
      filter.reset();
      useTelescopeOrientation.setState({
        q: null,
        at: 0,
        headingReady: false,
        sessionId: crypto.randomUUID(),
        status: provider ? 'waiting' : 'unavailable',
      });
      if (!provider) return;
      const current = provider;
      const heading = new AutomaticHeading();
      let locationKey = '',
        declination = 0;
      timeout = window.setTimeout(next, 2500);
      current.start(
        (sample) => {
          if (provider !== current || token !== generation) return;
          clearTimeout(timeout);
          const site = useLocationStore.getState().site;
          const key = `${site.lat.toFixed(3)},${site.lon.toFixed(3)},${site.elevation}`;
          if (key !== locationKey) {
            locationKey = key;
            declination = declinationDeg(site.lat, site.lon, site.elevation, new Date());
          }
          const q = heading.push(
            sample,
            useSensorStore.getState().applyDeclination ? declination : 0,
          );
          publish(q ?? physicalQuaternion(sample.q, sample.screenAngleDeg), current.name, !!q);
        },
        () => {
          if (provider === current) next();
        },
      );
    };
    cleanup = () => {
      provider?.stop();
      provider = null;
      clearTimeout(timeout);
      clearInterval(watchdog);
    };
    next();
    return;
  }
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
    filter.reset();
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
      sensor = new Ctor({ frequency: 60, referenceFrame: 'device' });
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
