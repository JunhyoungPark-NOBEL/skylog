/**
 * GPS 요청 전 오프라인 초기 위치를 복원한다. 늦은 DB 응답은 사용자가 고른 위치를 덮지 않는다.
 */
import { DAEJEON_PRESET, getDefaultSite, listSites } from '@/db/repos/sites';
import { loadLastFix } from '@/sensors/geolocation';
import { useLocationStore } from '@/state/locationStore';
import { useSettingsStore } from '@/state/settingsStore';

export async function initLocation(): Promise<void> {
  const initial = useLocationStore.getState();
  // StrictMode 두 번째 마운트나 실제 위치 선택 이후에는 초기값으로 되돌리지 않는다.
  if (initial.updatedAt !== null) return;
  const prefs = useSettingsStore.getState();
  const [def, last, sites] = await Promise.all([getDefaultSite(), loadLastFix(), listSites()]);
  const current = useLocationStore.getState();
  const latestPrefs = useSettingsStore.getState();
  if (
    current.site !== initial.site ||
    current.updatedAt !== initial.updatedAt ||
    latestPrefs.autoLocationConfigured !== prefs.autoLocationConfigured ||
    latestPrefs.autoLocation !== prefs.autoLocation ||
    latestPrefs.locationSiteId !== prefs.locationSiteId
  )
    return;

  const legacyCustom =
    !prefs.autoLocationConfigured &&
    def &&
    (def.name !== DAEJEON_PRESET.name ||
      def.lat !== DAEJEON_PRESET.lat ||
      def.lon !== DAEJEON_PRESET.lon);
  if (legacyCustom) latestPrefs.setLocationSite(def.id);
  const selected =
    (!prefs.autoLocation || legacyCustom) && prefs.locationSiteId
      ? sites.find((site) => site.id === prefs.locationSiteId)
      : undefined;
  const saved = selected ?? def;
  // GPS에서 자동 갱신만 끈 경우에는 그 위치를 고정해서 재사용한다.
  if (last && !legacyCustom && (prefs.autoLocation || !prefs.locationSiteId)) {
    current.setFromGps(last);
    useSettingsStore.setState({ locationSiteId: null });
  } else if (saved) {
    current.setSite(
      { name: saved.name, lat: saved.lat, lon: saved.lon, elevation: saved.elevation ?? 0 },
      saved.id,
    );
  } else if (last) current.setFromGps(last);
}
