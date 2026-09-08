import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoLocationController } from '@/sensors/autoLocation';
import { GeoError, type GeoFix, type requestLocation } from '@/sensors/geolocation';
import { DAEJEON_PRESET } from '@/db/repos/sites';
import { DEFAULT_SETTINGS, useSettingsStore } from '@/state/settingsStore';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore } from '@/state/sensorStore';

vi.mock('@/native/motion', () => ({ isNative: () => false }));

const disposers: (() => void)[] = [];
const FIX: GeoFix = { lat: 37.5, lon: 127.1, elevation: 42, accuracyM: 25, timestamp: 100 };

beforeEach(async () => {
  await useSettingsStore.persist.rehydrate();
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  useLocationStore.setState({
    site: { ...DAEJEON_PRESET },
    siteId: null,
    source: 'preset',
    accuracyM: null,
    updatedAt: null,
  });
  useSensorStore.getState().patch({ gps: { status: 'idle', accuracyM: null, error: null } });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

afterEach(async () => {
  while (disposers.length) disposers.pop()!();
  await new Promise((resolve) => setTimeout(resolve, 20));
});

function harness(initialize = async () => {}) {
  let time = 0;
  const calls: {
    fix: Parameters<typeof requestLocation>[0];
    error: Parameters<typeof requestLocation>[1];
    cancel: ReturnType<typeof vi.fn>;
  }[] = [];
  const request = vi.fn<typeof requestLocation>((fix, error) => {
    const cancel = vi.fn();
    calls.push({ fix, error, cancel });
    return cancel;
  });
  const permission = vi.fn(
    async (): Promise<'prompt' | 'denied' | 'granted' | 'unknown'> => 'prompt',
  );
  const controller = new AutoLocationController({
    initialize,
    request,
    permission,
    now: () => time,
  });
  const mount = () => {
    const dispose = controller.mount();
    disposers.push(dispose);
    return dispose;
  };
  return {
    controller,
    mount,
    calls,
    request,
    permission,
    advance: () => {
      time += 31_000;
    },
  };
}

function visibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('자동 현재 위치의 수명주기', () => {
  it('시작과 복귀 때 한 번만 갱신하고 30초 위치 추적을 요청하지 않는다', async () => {
    const h = harness();
    h.mount();
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
    expect(h.request.mock.calls[0]![2]).toMatchObject({ improveMs: 0, timeoutMs: 12000 });
    h.calls[0]!.fix(FIX, true);
    expect(useLocationStore.getState().site.lat).toBe(FIX.lat);
    expect(useSensorStore.getState().gps.status).toBe('ok');
    visibility('hidden');
    visibility('visible');
    await Promise.resolve();
    expect(h.request).toHaveBeenCalledTimes(1);
    h.advance();
    visibility('hidden');
    visibility('visible');
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(2));
  });

  it('StrictMode의 즉시 해제/재마운트는 중복 GPS 요청을 만들지 않는다', async () => {
    let finish!: () => void;
    const initializing = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const h = harness(() => initializing);
    const first = h.mount();
    first();
    h.mount();
    finish();
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
  });

  it('초기 DB 복원 도중 백그라운드에 갔다 와도 초기화가 끝나면 정상 시작한다', async () => {
    let finish!: () => void;
    const h = harness(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    h.mount();
    visibility('hidden');
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.request).not.toHaveBeenCalled();
    visibility('visible');
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
  });

  it('초기화 중 수동 GPS를 눌러도 이후 복귀의 자동 갱신을 막지 않는다', async () => {
    let finish!: () => void;
    const h = harness(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    h.mount();
    await h.controller.refresh(true);
    h.calls[0]!.fix(FIX, true);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    h.advance();
    visibility('hidden');
    visibility('visible');
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(2));
  });

  it('해제 뒤 permission 또는 GPS 응답이 도착해도 요청/위치를 바꾸지 않는다', async () => {
    const h = harness();
    let permission!: (value: 'granted') => void;
    h.permission.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          permission = resolve;
        }),
    );
    const dispose = h.mount();
    await vi.waitFor(() => expect(h.permission).toHaveBeenCalledTimes(1));
    dispose();
    permission('granted');
    await Promise.resolve();
    expect(h.request).not.toHaveBeenCalled();
    const second = h.mount();
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
    second();
    h.calls[0]!.fix(FIX, true);
    expect(h.calls[0]!.cancel).toHaveBeenCalled();
    expect(useLocationStore.getState().source).toBe('preset');
  });
});

describe('권한과 사용자가 선택한 관측지', () => {
  it('거부는 저장해 복귀 때 자동 요청하지 않고 수동 GPS 버튼은 재요청한다', async () => {
    const h = harness();
    h.mount();
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
    h.calls[0]!.error(new GeoError('denied'));
    expect(useSettingsStore.getState().locationPermissionDenied).toBe(true);
    h.advance();
    visibility('hidden');
    visibility('visible');
    await vi.waitFor(() => expect(h.permission).toHaveBeenCalledTimes(2));
    expect(h.request).toHaveBeenCalledTimes(1);
    await h.controller.refresh(true);
    expect(h.request).toHaveBeenCalledTimes(2);
    h.calls[1]!.fix(FIX, true);
    expect(useSettingsStore.getState().locationPermissionDenied).toBe(false);
  });

  it('브라우저의 denied 조회는 처음부터 프롬프트를 재요청하지 않는다', async () => {
    const h = harness();
    h.permission.mockResolvedValue('denied');
    h.mount();
    await vi.waitFor(() => expect(useSensorStore.getState().gps.status).toBe('error'));
    expect(h.request).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().locationPermissionDenied).toBe(true);
  });

  it('OS 설정에서 권한이 허용된 경우 저장된 거부를 해제하고 갱신한다', async () => {
    useSettingsStore.getState().setLocationPermissionDenied(true);
    const h = harness();
    h.permission.mockResolvedValue('granted');
    h.mount();
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
    expect(useSettingsStore.getState().locationPermissionDenied).toBe(false);
  });

  it('저장 관측지를 선택하면 자동 사용을 끄고 대기 중 fix를 무시한다', async () => {
    const h = harness();
    h.mount();
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
    useLocationStore
      .getState()
      .setSite({ name: '제주', lat: 33.4, lon: 126.5, elevation: 80 }, 'jeju');
    h.calls[0]!.fix(FIX, true);
    expect(useLocationStore.getState().site.name).toBe('제주');
    expect(useSettingsStore.getState().autoLocation).toBe(false);
    expect(useSettingsStore.getState().locationSiteId).toBe('jeju');
    expect(h.calls[0]!.cancel).toHaveBeenCalled();
    h.advance();
    visibility('hidden');
    visibility('visible');
    await Promise.resolve();
    expect(h.request).toHaveBeenCalledTimes(1);
  });

  it('위치 실패는 기존 좌표를 유지하고 꺼짐 설정도 재마운트에서 유지한다', async () => {
    const h = harness();
    const dispose = h.mount();
    await vi.waitFor(() => expect(h.request).toHaveBeenCalledTimes(1));
    h.calls[0]!.error(new GeoError('timeout'));
    expect(useLocationStore.getState().site).toEqual(DAEJEON_PRESET);
    useSettingsStore.getState().setAutoLocation(false);
    dispose();
    h.mount();
    h.advance();
    visibility('hidden');
    visibility('visible');
    await Promise.resolve();
    await Promise.resolve();
    expect(h.request).toHaveBeenCalledTimes(1);
  });

  it('저장 관측지 다음에 GPS를 다시 사용하면 이전 관측지 ID를 지워 GPS 위치를 고정할 수 있다', async () => {
    useSettingsStore.getState().setLocationSite('old-site');
    const h = harness();
    h.mount();
    await h.controller.refresh(true);
    h.calls[0]!.fix(FIX, true);
    useSettingsStore.getState().setAutoLocation(false);
    expect(useSettingsStore.getState().locationSiteId).toBeNull();
    expect(useLocationStore.getState().source).toBe('gps');
  });
});
