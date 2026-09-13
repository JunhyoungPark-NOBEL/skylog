import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  startTelescopeOrientation,
  stopTelescopeOrientation,
  useTelescopeOrientation,
} from '@/sensors/telescopeOrientation';
import { sceneToAltAz } from '@/astro/coords';
import { pointingDirection } from '@/astro/pointing';
import { useTelescopeStore, profileKey } from '@/state/telescopeStore';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore } from '@/state/sensorStore';
import { CalibratedTelescopeProvider } from '@/sensors/orientation/CalibratedTelescopeProvider';
// 이 파일은 센서 시계를 멈춰 검사한다. DB 저장은 별도 통합 검사에서 다룬다.
vi.mock('@/db/repos/settings', () => ({
  createDexieSettingsStorage: () => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }),
}));
class MockOrientation extends Event {
  static requestPermission = vi.fn(async () => 'granted');
  alpha = 0;
  beta = 0;
  gamma = 0;
  absolute = false;
}
function reading({ alpha = 0, beta = 0, gamma = 0, absolute = false } = {}) {
  const e = new MockOrientation('deviceorientation');
  Object.assign(e, { alpha, beta, gamma, absolute });
  window.dispatchEvent(e);
}
describe('망원경 상대 센서', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('DeviceOrientationEvent', MockOrientation);
    vi.stubGlobal('RelativeOrientationSensor', undefined);
    MockOrientation.requestPermission.mockResolvedValue('granted');
    MockOrientation.requestPermission.mockClear();
    useTelescopeStore.getState().saveAlignment(null);
  });
  afterEach(() => {
    stopTelescopeOrientation();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('상대 이벤트를 폰 상단 축으로 전달하고 화면 방향과 나침반을 섞지 않는다', async () => {
    await startTelescopeOrientation('relative');
    vi.advanceTimersByTime(100);
    reading({ alpha: 270, beta: 30 });
    const state = useTelescopeOrientation.getState();
    expect(state.status).toBe('active');
    const p = sceneToAltAz(pointingDirection(state.q!));
    expect(p.altDeg).toBeCloseTo(30);
    expect(p.azDeg).toBeCloseTo(90);
    stopTelescopeOrientation();
    reading({ alpha: 180 });
    expect(useTelescopeOrientation.getState().q).toBeNull();
  });
  it('절대 방향만 있거나 값이 누락되면 안내 가능한 상태로 만들지 않는다', async () => {
    await startTelescopeOrientation('relative');
    vi.advanceTimersByTime(100);
    reading({ absolute: true });
    reading({ alpha: NaN });
    expect(useTelescopeOrientation.getState().q).toBeNull();
    vi.advanceTimersByTime(4100);
    expect(useTelescopeOrientation.getState().status).toBe('unavailable');
  });
  it('데이터 중단 때 자세와 정렬 세션을 무효화한다', async () => {
    await startTelescopeOrientation('relative');
    vi.advanceTimersByTime(100);
    reading();
    const id = useTelescopeOrientation.getState().sessionId;
    vi.advanceTimersByTime(2000);
    expect(useTelescopeOrientation.getState().q).toBeNull();
    expect(useTelescopeOrientation.getState().sessionId).not.toBe(id);
    reading();
    expect(useTelescopeOrientation.getState().status).toBe('active');
    expect(useTelescopeOrientation.getState().sessionId).not.toBe(id);
  });
  it('중단 후 센서가 watchdog보다 먼저 돌아와도 세션과 이전 자세 필터를 무효화한다', async () => {
    await startTelescopeOrientation('relative');
    vi.advanceTimersByTime(100);
    reading({ alpha: 0, beta: 0 });
    const previousSession = useTelescopeOrientation.getState().sessionId;
    // 벽시계만 이동해 백그라운드 동안 watchdog 타이머가 실행되지 않은 상황을 만든다.
    vi.setSystemTime(new Date(Date.now() + 5000));
    vi.advanceTimersByTime(1);
    expect(useTelescopeOrientation.getState()).toMatchObject({
      status: 'active',
      sessionId: previousSession,
    });
    reading({ alpha: 90, beta: 30 });
    const resumed = useTelescopeOrientation.getState();
    expect(resumed.sessionId).not.toBe(previousSession);
    expect(resumed.status).toBe('active');
    const direction = sceneToAltAz(pointingDirection(resumed.q!));
    expect(direction.azDeg).toBeCloseTo(270, 8);
    expect(direction.altDeg).toBeCloseTo(30, 8);
  });
  it('권한 거부는 재시도 가능한 상태이고 리스너를 등록하지 않는다', async () => {
    MockOrientation.requestPermission.mockResolvedValue('denied');
    await startTelescopeOrientation('relative');
    reading();
    expect(useTelescopeOrientation.getState().status).toBe('denied');
    expect(useTelescopeOrientation.getState().q).toBeNull();
  });
  it('권한 대기 중 종료하면 늦게 돌아온 승인으로 센서를 켜지 않는다', async () => {
    let approve: (value: string) => void = () => {};
    MockOrientation.requestPermission.mockImplementation(
      () =>
        new Promise((resolve) => {
          approve = resolve;
        }),
    );
    const started = startTelescopeOrientation('relative');
    stopTelescopeOrientation();
    approve('granted');
    await started;
    expect(useTelescopeOrientation.getState().status).toBe('off');
  });
  it('자동 시작은 절대 센서 권한을 요청하고 나침반 방위를 바로 제공한다', async () => {
    await startTelescopeOrientation();
    vi.advanceTimersByTime(100);
    reading({ alpha: 270, beta: 30, absolute: true });
    expect(MockOrientation.requestPermission).toHaveBeenLastCalledWith(true);
    expect(useTelescopeOrientation.getState()).toMatchObject({
      mode: 'automatic',
      status: 'active',
      headingReady: true,
    });
    expect(
      sceneToAltAz(pointingDirection(useTelescopeOrientation.getState().q!)).altDeg,
    ).toBeCloseTo(30);
  });
  it('자동 모드에 상대 자세만 도착하면 센서 수신과 방위 준비를 구별한다', async () => {
    await startTelescopeOrientation();
    vi.advanceTimersByTime(100);
    reading({ alpha: 270, beta: 30 });
    expect(useTelescopeOrientation.getState()).toMatchObject({
      status: 'active',
      headingReady: false,
    });
  });
  it('자동→정밀 전환은 새 상대 세션을 만들며 자동 방향을 정렬로 재사용하지 않는다', async () => {
    await startTelescopeOrientation();
    vi.advanceTimersByTime(100);
    reading({ absolute: true });
    const session = useTelescopeOrientation.getState().sessionId;
    await startTelescopeOrientation('relative');
    expect(useTelescopeOrientation.getState()).toMatchObject({
      mode: 'relative',
      headingReady: false,
      q: null,
    });
    expect(useTelescopeOrientation.getState().sessionId).not.toBe(session);
    vi.advanceTimersByTime(100);
    reading({ absolute: true });
    expect(useTelescopeOrientation.getState().q).toBeNull();
    reading({ alpha: 90 });
    expect(useTelescopeOrientation.getState().status).toBe('active');
  });
  it('설치 완료 센서는 목표·화면 전환에서 재사용하고 명시적 새 설치에서만 재시작한다', async () => {
    await startTelescopeOrientation('relative');
    vi.advanceTimersByTime(100);
    reading({ alpha: 90, beta: 40 });
    const pose = useTelescopeOrientation.getState();
    useTelescopeStore.getState().saveAlignment({
      model: { yawDeg: 20, axis: [0, 1, 0], residualDeg: 0, maxResidualDeg: 0 },
      method: 'three-star-v1',
      site: { ...useLocationStore.getState().site },
      samples: [1, 2, 3].map((id) => ({
        q: pose.q!,
        direction: [0, 1, 0],
        at: new Date().toISOString(),
        objectId: `star:HIP${id}`,
      })),
      at: new Date().toISOString(),
      profileKey: profileKey(useTelescopeStore.getState().profile),
      provider: pose.source,
      sessionId: pose.sessionId,
    });
    await startTelescopeOrientation('automatic');
    expect(useTelescopeOrientation.getState().sessionId).toBe(pose.sessionId);
    expect(useTelescopeOrientation.getState().mode).toBe('relative');
    expect(MockOrientation.requestPermission).toHaveBeenCalledTimes(1);
    const provider = new CalibratedTelescopeProvider(),
      receive = vi.fn(),
      error = vi.fn();
    expect(provider.isSupported()).toBe(true);
    provider.start(receive, error);
    vi.advanceTimersByTime(40);
    reading({ alpha: 90, beta: 40 });
    expect(receive).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'CalibratedTelescope', northReference: 'true' }),
    );
    provider.stop();
    expect(useTelescopeOrientation.getState().status).toBe('active');
    const calls = receive.mock.calls.length;
    vi.advanceTimersByTime(40);
    reading({ alpha: 90, beta: 40 });
    expect(receive).toHaveBeenCalledTimes(calls);
    provider.start(receive, error);
    await startTelescopeOrientation('relative', true);
    expect(error).toHaveBeenCalledTimes(1);
    expect(useTelescopeOrientation.getState().sessionId).not.toBe(pose.sessionId);
    expect(provider.isSupported()).toBe(false);
  });
  it('권한이 필요한 브라우저에서는 자동 진입이 권한 창을 호출하지 않는다', async () => {
    useSensorStore.getState().setSetting('orientationConsent', 'unknown');
    await startTelescopeOrientation('automatic', false, false);
    expect(MockOrientation.requestPermission).not.toHaveBeenCalled();
    expect(useTelescopeOrientation.getState().status).toBe('off');
    useSensorStore.getState().setSetting('orientationConsent', 'granted');
    await startTelescopeOrientation('automatic', false, false);
    expect(MockOrientation.requestPermission).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    reading({ absolute: true });
    expect(useTelescopeOrientation.getState().status).toBe('active');
  });
});
