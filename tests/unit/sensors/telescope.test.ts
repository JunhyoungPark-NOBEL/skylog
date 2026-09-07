import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  startTelescopeOrientation,
  stopTelescopeOrientation,
  useTelescopeOrientation,
} from '@/sensors/telescopeOrientation';
import { sceneToAltAz } from '@/astro/coords';
import { pointingDirection } from '@/astro/pointing';
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
  });
  afterEach(() => {
    stopTelescopeOrientation();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('상대 이벤트를 폰 상단 축으로 전달하고 화면 방향과 나침반을 섞지 않는다', async () => {
    await startTelescopeOrientation();
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
    await startTelescopeOrientation();
    vi.advanceTimersByTime(100);
    reading({ absolute: true });
    reading({ alpha: NaN });
    expect(useTelescopeOrientation.getState().q).toBeNull();
    vi.advanceTimersByTime(4100);
    expect(useTelescopeOrientation.getState().status).toBe('unavailable');
  });
  it('데이터 중단 때 자세와 정렬 세션을 무효화한다', async () => {
    await startTelescopeOrientation();
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
  it('권한 거부는 재시도 가능한 상태이고 리스너를 등록하지 않는다', async () => {
    MockOrientation.requestPermission.mockResolvedValue('denied');
    await startTelescopeOrientation();
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
    const started = startTelescopeOrientation();
    stopTelescopeOrientation();
    approve('granted');
    await started;
    expect(useTelescopeOrientation.getState().status).toBe('off');
  });
});
