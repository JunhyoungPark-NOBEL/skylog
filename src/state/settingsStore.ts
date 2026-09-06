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
  units: 'metric';
}

export interface SettingsState extends SettingsValues {
  setTheme(theme: Theme): void;
  setLang(lang: Lang): void;
  setKeepAwake(on: boolean): void;
  setDebugHud(on: boolean): void;
}

export const DEFAULT_SETTINGS: SettingsValues = {
  theme: 'dark',
  lang: 'ko',
  keepAwake: false,
  debugHud: false,
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
