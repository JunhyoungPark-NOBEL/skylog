/**
 * 앱 시작 시 위치 결정: 기본 관측지(Dexie sites, 사용자가 지정) > 마지막 GPS 위치(오프라인 재사용) > 대전 프리셋.
 */
import { getDefaultSite } from '@/db/repos/sites';
import { loadLastFix } from '@/sensors/geolocation';
import { useLocationStore } from '@/state/locationStore';

export async function initLocation(): Promise<void> {
  const store = useLocationStore.getState();
  const def = await getDefaultSite();
  if (def) {
    store.setSite(
      { name: def.name, lat: def.lat, lon: def.lon, elevation: def.elevation ?? 0 },
      def.id,
    );
    return;
  }
  const last = await loadLastFix();
  if (last) {
    store.setFromGps({
      lat: last.lat,
      lon: last.lon,
      elevation: last.elevation,
      accuracyM: last.accuracyM,
    });
  }
}
