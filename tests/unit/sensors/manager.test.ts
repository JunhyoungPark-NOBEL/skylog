import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SensorManager, calibrationMatchesSite } from '@/sensors/orientation/manager';
import {
  DEFAULT_SENSOR_SETTINGS,
  useSensorStore,
  waitForSensorHydration,
  type CalibrationInfo,
} from '@/state/sensorStore';
import { useLocationStore } from '@/state/locationStore';
import { deviceOrientationToScene } from '@/sensors/orientation/math';
import type { OrientationProvider, OrientationSample } from '@/sensors/orientation/types';
import type { CameraController } from '@/render/CameraController';

const providers = vi.hoisted(() => ({ available: vi.fn() }));
vi.mock('@/sensors/orientation/providers', () => ({
  availableProviders: providers.available,
  SimulatorProvider: class {},
}));
vi.mock('@/sensors/permissions', () => ({ needsOrientationPermission: () => false }));
vi.mock('@/db/repos/settings', () => ({
  createDexieSettingsStorage: () => {
    let value: string | null = null;
    return {
      getItem: () => value,
      setItem: (_key: string, next: string) => {
        value = next;
      },
      removeItem: () => {
        value = null;
      },
    };
  },
}));
let publish: (sample: OrientationSample) => void;
let manager: SensorManager;
let provider: OrientationProvider;
function sample(
  northReference: OrientationSample['northReference'] = 'relative',
): OrientationSample {
  return {
    q: deviceOrientationToScene(270, 40, 0),
    northReference,
    compassHeadingDeg: null,
    compassAccuracyDeg: null,
    raw: { alpha: 270, beta: 40, gamma: 0, absolute: northReference !== 'relative' },
    screenAngleDeg: 0,
    timestampMs: performance.now(),
    provider: 'DeviceOrientation',
  };
}
function calibration(northReference: OrientationSample['northReference']): CalibrationInfo {
  return {
    deltaAzDeg: 20,
    pitchOffsetDeg: 2,
    targetId: 'star:HIP91262',
    targetName: 'Vega',
    at: Date.now(),
    residualDeg: 0,
    siteName: useLocationStore.getState().site.name,
    lat: useLocationStore.getState().site.lat,
    lon: useLocationStore.getState().site.lon,
    provider: 'DeviceOrientation',
    northReference,
  };
}
beforeEach(async () => {
  await waitForSensorHydration();
  vi.useFakeTimers();
  useSensorStore.setState({
    ...DEFAULT_SENSOR_SETTINGS,
    arActive: false,
    startup: 'idle',
    permission: 'granted',
    calibration: null,
    deltaAzDeg: 0,
    pitchOffsetDeg: 0,
  });
  provider = {
    name: 'DeviceOrientation',
    isSupported: () => true,
    start: vi.fn((onSample) => {
      publish = onSample;
    }),
    stop: vi.fn(),
  };
  providers.available.mockReturnValue([provider]);
  manager = new SensorManager();
});
afterEach(() => {
  manager.stop();
  vi.useRealTimers();
});
describe('보정의 실제 관측지 비교', () => {
  it('위치 이름이 GPS로 같아도 먼 좌표는 거부한다', () => {
    expect(calibrationMatchesSite({ lat: 36.37, lon: 127.36 }, { lat: 37.56, lon: 126.97 })).toBe(
      false,
    );
  });
  it('약간 다른 GPS 측정값은 같은 관측지로 허용한다', () => {
    expect(calibrationMatchesSite({ lat: 36.37, lon: 127.36 }, { lat: 36.375, lon: 127.366 })).toBe(
      true,
    );
  });
  it('실제 좌표가 없는 이전 보정은 복원하지 않는다', () => {
    expect(calibrationMatchesSite({}, { lat: 36.37, lon: 127.36 })).toBe(false);
  });
});
describe('자동 재시작을 지원하는 하늘 센서 세션', () => {
  it('북 기준 없는 상대 센서로 자동 하늘 방위를 덮어쓰지 않는다', () => {
    const setSensorQuaternion = vi.fn();
    manager.attachCamera({ setSensorQuaternion } as unknown as CameraController);
    manager.start();
    publish(sample());
    expect(setSensorQuaternion).toHaveBeenLastCalledWith(null);
    publish(sample('magnetic'));
    expect(setSensorQuaternion.mock.lastCall?.[0]).not.toBeNull();
  });
  it('실제 샘플을 받은 뒤 연결 상태가 된다', () => {
    manager.start();
    expect(useSensorStore.getState().startup).toBe('starting');
    publish(sample('magnetic'));
    expect(useSensorStore.getState().startup).toBe('active');
  });
  it('데이터가 없는 상황을 사용자 권한 거부로 단정하지 않는다', () => {
    manager.start();
    vi.advanceTimersByTime(1600);
    expect(useSensorStore.getState()).toMatchObject({
      arActive: false,
      startup: 'unavailable',
      permission: 'granted',
    });
    expect(manager.running).toBe(false);
  });
  it('종료된 provider의 늦은 이벤트는 수동 화면을 되돌리지 않는다', () => {
    manager.start();
    manager.stop();
    publish(sample('magnetic'));
    expect(useSensorStore.getState()).toMatchObject({ arActive: false, startup: 'idle' });
    expect(manager.lastSample).toBeNull();
  });
  it('같은 관측지여도 상대 yaw의 저장 보정은 새 세션에 복원하지 않는다', () => {
    useSensorStore.getState().setSetting('lastCalibration', calibration('relative'));
    manager.start();
    publish(sample());
    expect(useSensorStore.getState()).toMatchObject({ calibration: null, deltaAzDeg: 0 });
  });
  it('같은 절대 기준·provider·관측지의 보정은 복원한다', () => {
    useSensorStore.getState().setSetting('lastCalibration', calibration('magnetic'));
    manager.start();
    publish(sample('magnetic'));
    expect(useSensorStore.getState().calibration?.deltaAzDeg).toBe(20);
  });
  it('세션 중 GPS가 다른 지역으로 바뀌면 기존 보정을 해제한다', () => {
    manager.start();
    publish(sample('magnetic'));
    manager.setCalibration(calibration('magnetic'));
    const previousSite = useLocationStore.getState().site;
    useLocationStore.getState().setFromGps({ lat: previousSite.lat + 1, lon: previousSite.lon });
    publish(sample('magnetic'));
    expect(useSensorStore.getState()).toMatchObject({
      calibration: null,
      deltaAzDeg: 0,
      pitchOffsetDeg: 0,
    });
    useLocationStore.getState().setSite(previousSite);
  });
  it('watchdog보다 첫 복귀 샘플이 빨라도 상대 보정을 무효화한다', () => {
    manager.start();
    publish(sample());
    manager.setCalibration(calibration('relative'));
    vi.setSystemTime(new Date(Date.now() + 5000));
    publish(sample());
    expect(useSensorStore.getState()).toMatchObject({
      calibration: null,
      deltaAzDeg: 0,
      startup: 'active',
    });
  });
  it('수신 중단은 오래된 방향을 남기지 않고 수동 탐색으로 돌아간다', () => {
    manager.start();
    publish(sample('magnetic'));
    vi.advanceTimersByTime(2000);
    expect(useSensorStore.getState()).toMatchObject({ arActive: false, startup: 'unavailable' });
    expect(manager.currentAltAz()).toBeNull();
  });
});
