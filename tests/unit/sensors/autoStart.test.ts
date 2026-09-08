import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SENSOR_SETTINGS,
  useSensorStore,
  waitForSensorHydration,
} from '@/state/sensorStore';
import {
  disableSkyOrientation,
  enableSkyOrientationFromGesture,
  mountSkyOrientation,
  setSkyOrientationAutomaticAllowed,
  tryAutomaticSkyOrientation,
} from '@/sensors/orientation/autoStart';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  needsPermission: vi.fn(),
  supported: vi.fn(),
  request: vi.fn(),
}));
vi.mock('@/sensors/orientation/manager', () => ({
  sensorManager: { start: mocks.start, stop: mocks.stop },
}));
vi.mock('@/sensors/permissions', () => ({
  needsOrientationPermission: mocks.needsPermission,
  orientationEventsSupported: mocks.supported,
  requestOrientationPermission: mocks.request,
}));
vi.mock('@/sensors/wakeLock', () => ({ requestWakeLock: vi.fn() }));
// 센서 생명주기만 검증한다. DB 트랜잭션/내보내기는 기존 저장소 테스트에서 별도로 검증한다.
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

let unmount: (() => void) | undefined;
let visibility = 'visible';
beforeEach(async () => {
  await waitForSensorHydration();
  vi.clearAllMocks();
  visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
    () => visibility as DocumentVisibilityState,
  );
  useSensorStore.setState({
    ...DEFAULT_SENSOR_SETTINGS,
    arActive: false,
    startup: 'idle',
    permission: 'unknown',
  });
  mocks.start.mockImplementation(() =>
    useSensorStore.getState().patch({ arActive: true, startup: 'starting' }),
  );
  mocks.stop.mockImplementation(() =>
    useSensorStore.getState().patch({ arActive: false, startup: 'idle' }),
  );
  mocks.needsPermission.mockReturnValue(false);
  mocks.supported.mockReturnValue(true);
  mocks.request.mockResolvedValue('granted');
});
afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.restoreAllMocks();
});
async function enter() {
  unmount = mountSkyOrientation();
  await tryAutomaticSkyOrientation();
}

describe('하늘 진입의 자동 센서와 사용자 선택', () => {
  it('프롬프트가 필요 없는 환경에서는 기본 자동 연결한다', async () => {
    await enter();
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('최초 iPhone 권한은 자동 요청하지 않고 한 번의 탭 안내를 표시한다', async () => {
    mocks.needsPermission.mockReturnValue(true);
    await enter();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(useSensorStore.getState()).toMatchObject({
      startup: 'permission-required',
      permission: 'prompt',
    });
  });
  it('이전 승인 환경은 프롬프트 없이 센서 수신을 시도한다', async () => {
    mocks.needsPermission.mockReturnValue(true);
    useSensorStore.getState().setSetting('orientationConsent', 'granted');
    await enter();
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('거부 이력은 재진입해도 프롬프트나 자동 연결을 반복하지 않는다', async () => {
    useSensorStore.getState().setSetting('orientationConsent', 'denied');
    await enter();
    unmount?.();
    await enter();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(useSensorStore.getState().permission).toBe('denied');
  });
  it('명시적 끄기는 재진입과 화면 복귀에도 유지된다', async () => {
    await enter();
    disableSkyOrientation();
    unmount?.();
    await enter();
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await tryAutomaticSkyOrientation();
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(useSensorStore.getState().autoStart).toBe(false);
  });
  it('사용자 탭에서는 권한 요청을 즉시 호출하고 승인되면 연결한다', async () => {
    mocks.needsPermission.mockReturnValue(true);
    await enter();
    const start = enableSkyOrientationFromGesture();
    expect(mocks.request).toHaveBeenCalledWith(true);
    await expect(start).resolves.toBe('granted');
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(useSensorStore.getState()).toMatchObject({
      orientationConsent: 'granted',
      autoStart: true,
    });
  });
  it('사용자 거부는 저장되며 허용 상태로 바꾸지 않는다', async () => {
    mocks.needsPermission.mockReturnValue(true);
    mocks.request.mockResolvedValue('denied');
    await enter();
    await enableSkyOrientationFromGesture();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(useSensorStore.getState()).toMatchObject({
      orientationConsent: 'denied',
      startup: 'permission-required',
    });
  });
  it('권한 대기 중 떠난 화면을 늦은 승인으로 다시 켜지 않는다', async () => {
    mocks.needsPermission.mockReturnValue(true);
    let resolve: (value: string) => void = () => {};
    mocks.request.mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );
    await enter();
    const start = enableSkyOrientationFromGesture();
    unmount?.();
    unmount = undefined;
    resolve('granted');
    await expect(start).resolves.toBeNull();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it('자동 사용 중 백그라운드는 중단하고 복귀하면 새 세션으로 연결한다', async () => {
    await enter();
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(useSensorStore.getState()).toMatchObject({ arActive: false, autoStart: true });
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await tryAutomaticSkyOrientation();
    expect(mocks.start).toHaveBeenCalledTimes(2);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('센서가 없으면 연결 시도 없이 수동 탐색 상태를 남긴다', async () => {
    mocks.supported.mockReturnValue(false);
    await enter();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(useSensorStore.getState()).toMatchObject({
      arActive: false,
      startup: 'unavailable',
      permission: 'unsupported',
    });
  });
  it('명시된 공유 차트는 자동 시작하지 않고 사용자 탭으로만 추종을 켠다', async () => {
    unmount = mountSkyOrientation(false);
    await tryAutomaticSkyOrientation();
    expect(mocks.start).not.toHaveBeenCalled();
    await enableSkyOrientationFromGesture();
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });
  it('현재 화면의 원형 차트 탐색은 끄기 설정을 바꾸지 않고 복귀 뒤에도 유지된다', async () => {
    await enter();
    setSkyOrientationAutomaticAllowed(false);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await tryAutomaticSkyOrientation();
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(useSensorStore.getState().autoStart).toBe(true);
    unmount?.();
    await enter();
    expect(mocks.start).toHaveBeenCalledTimes(2);
  });
});
