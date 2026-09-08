import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang } from '@/app/i18n';
import type { Theme } from '@/app/theme';
import { createDexieSettingsStorage } from '@/db/repos/settings';

export interface SettingsValues {
  theme: Theme;
  lang: Lang;
  keepAwake: boolean;
  debugHud: boolean;
  postLogQuiz: boolean;
  autoLocation: boolean;
  /** 이전 버전의 명시적 기본 관측지를 처음부터 GPS로 덮어쓰지 않기 위한 선택 기록. */
  autoLocationConfigured: boolean;
  locationPermissionDenied: boolean;
  /** 자동 위치를 끄고 선택한 관측지. 재실행 때도 선택을 유지한다. */
  locationSiteId: string | null;
  units: 'metric';
}

export interface SettingsState extends SettingsValues {
  setTheme(theme: Theme): void;
  setLang(lang: Lang): void;
  setKeepAwake(on: boolean): void;
  setDebugHud(on: boolean): void;
  setPostLogQuiz(on: boolean): void;
  setAutoLocation(on: boolean): void;
  setLocationPermissionDenied(denied: boolean): void;
  setLocationSite(siteId: string | null): void;
}

export const DEFAULT_SETTINGS: SettingsValues = {
  theme: 'dark',
  lang: 'ko',
  keepAwake: false,
  debugHud: false,
  postLogQuiz: true,
  autoLocation: true,
  autoLocationConfigured: false,
  locationPermissionDenied: false,
  locationSiteId: null,
  units: 'metric',
};

export const SETTINGS_PERSIST_NAME = 'settings';

/**
 * 설정 스토어. persist storage는 Dexie `settings` 테이블(D-010) — localStorage를 쓰지 않는다.
 * 하이드레이션은 비동기이므로 부트스트랩에서 `waitForSettingsHydration()`을 기다린다.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      setKeepAwake: (keepAwake) => set({ keepAwake }),
      setDebugHud: (debugHud) => set({ debugHud }),
      setPostLogQuiz: (postLogQuiz) => set({ postLogQuiz }),
      setAutoLocation: (autoLocation) => set({ autoLocation, autoLocationConfigured: true }),
      setLocationPermissionDenied: (locationPermissionDenied) => set({ locationPermissionDenied }),
      setLocationSite: (locationSiteId) =>
        set({ locationSiteId, autoLocation: false, autoLocationConfigured: true }),
    }),
    {
      name: SETTINGS_PERSIST_NAME,
      version: 1,
      storage: createJSONStorage(() => createDexieSettingsStorage(SETTINGS_PERSIST_NAME)),
      partialize: (s): SettingsValues => ({
        theme: s.theme,
        lang: s.lang,
        keepAwake: s.keepAwake,
        debugHud: s.debugHud,
        postLogQuiz: s.postLogQuiz,
        autoLocation: s.autoLocation,
        autoLocationConfigured: s.autoLocationConfigured,
        locationPermissionDenied: s.locationPermissionDenied,
        locationSiteId: s.locationSiteId,
        units: s.units,
      }),
    },
  ),
);

/** Dexie에서 설정이 복원될 때까지 기다린다(이미 끝났으면 즉시). */
export function waitForSettingsHydration(): Promise<void> {
  if (useSettingsStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
