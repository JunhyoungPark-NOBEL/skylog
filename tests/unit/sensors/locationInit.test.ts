import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initLocation } from '@/sensors/locationInit';
import { saveLastFix } from '@/sensors/geolocation';
import * as sites from '@/db/repos/sites';
import { setSetting } from '@/db/repos/settings';
import { DEFAULT_SETTINGS, useSettingsStore } from '@/state/settingsStore';
import { useLocationStore } from '@/state/locationStore';

beforeEach(async () => {
  await useSettingsStore.persist.rehydrate();
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  useLocationStore.setState({
    site: { ...sites.DAEJEON_PRESET },
    siteId: null,
    source: 'preset',
    accuracyM: null,
    updatedAt: null,
  });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise((resolve) => setTimeout(resolve, 20));
});

describe('오프라인 위치 복원과 기존 사용자 이전', () => {
  it('이전 버전의 사용자 기본 관측지는 GPS로 자동 덮어쓰지 않는다', async () => {
    const chosen = await sites.upsertSite({
      name: '집',
      lat: 35.1,
      lon: 129,
      elevation: 20,
      isDefault: true,
    });
    await saveLastFix({ lat: 37, lon: 127, elevation: 10, accuracyM: 20, timestamp: 10 });
    await initLocation();
    expect(useLocationStore.getState().siteId).toBe(chosen.id);
    expect(useSettingsStore.getState().autoLocation).toBe(false);
    expect(useSettingsStore.getState().autoLocationConfigured).toBe(true);
  });

  it('자동 위치를 명시적으로 켰다면 사용자 기본 관측지보다 마지막 GPS를 우선한다', async () => {
    await sites.upsertSite({ name: '집', lat: 35.1, lon: 129, isDefault: true });
    useSettingsStore.getState().setAutoLocation(true);
    await saveLastFix({ lat: 37, lon: 127, elevation: 10, accuracyM: 20, timestamp: 10 });
    await initLocation();
    expect(useLocationStore.getState().source).toBe('gps');
    expect(useLocationStore.getState().site.lat).toBe(37);
    expect(useSettingsStore.getState().autoLocation).toBe(true);
  });

  it('자동 사용을 끄고 고른 관측지 ID와 거부 이력은 저장에서 복원된다', async () => {
    await sites.ensureDefaultSite();
    const selected = await sites.upsertSite({ name: '제주', lat: 33.4, lon: 126.5 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await setSetting('settings.autoLocation', false);
    await setSetting('settings.autoLocationConfigured', true);
    await setSetting('settings.locationSiteId', selected.id);
    await setSetting('settings.locationPermissionDenied', true);
    await useSettingsStore.persist.rehydrate();
    await initLocation();
    expect(useLocationStore.getState().siteId).toBe(selected.id);
    expect(useSettingsStore.getState().autoLocation).toBe(false);
    expect(useSettingsStore.getState().locationPermissionDenied).toBe(true);
  });

  it('GPS에서 자동 사용만 끄면 재시작 때 대전 기본값 대신 그 GPS 위치를 유지한다', async () => {
    await sites.ensureDefaultSite();
    await saveLastFix({ lat: 37.6, lon: 126.9, elevation: 10, accuracyM: 20, timestamp: 10 });
    useSettingsStore.getState().setAutoLocation(false);
    await initLocation();
    expect(useLocationStore.getState().source).toBe('gps');
    expect(useLocationStore.getState().site.lat).toBe(37.6);
    expect(useSettingsStore.getState().autoLocation).toBe(false);
  });

  it('초기 DB 조회 중 고른 위치는 늦게 끝난 기본값 복원으로 덮지 않는다', async () => {
    let finish!: (value: Awaited<ReturnType<typeof sites.getDefaultSite>>) => void;
    vi.spyOn(sites, 'getDefaultSite').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const initializing = initLocation();
    useSettingsStore.getState().setLocationSite('chosen');
    useLocationStore
      .getState()
      .setSite({ name: '선택', lat: 35, lon: 126, elevation: 1 }, 'chosen');
    finish(undefined);
    await initializing;
    expect(useLocationStore.getState().siteId).toBe('chosen');
  });
});
