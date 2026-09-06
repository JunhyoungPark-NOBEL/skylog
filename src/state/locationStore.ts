import { create } from 'zustand';
import { DAEJEON_PRESET } from '@/db/repos/sites';

export type LocationSource = 'preset' | 'gps' | 'manual';

export interface ObserverLocation {
  name: string;
  lat: number; // WGS84 도
  lon: number; // 동경 +
  elevation: number; // m
}

export interface LocationState {
  site: ObserverLocation;
  /** Dexie sites 테이블의 id(있으면) */
  siteId: string | null;
  source: LocationSource;
  accuracyM: number | null;
  updatedAt: number | null;

  setSite(site: ObserverLocation, siteId?: string | null): void;
  setFromGps(fix: {
    lat: number;
    lon: number;
    elevation?: number | null;
    accuracyM?: number | null;
  }): void;
  setManual(loc: Partial<ObserverLocation>): void;
}

/** 관측 위치. 기본은 대전 프리셋, 첫 실행 시 GPS로 대체(T2). */
export const useLocationStore = create<LocationState>()((set, get) => ({
  site: { ...DAEJEON_PRESET },
  siteId: null,
  source: 'preset',
  accuracyM: null,
  updatedAt: null,

  setSite(site, siteId = null) {
    set({ site, siteId, source: 'preset', accuracyM: null, updatedAt: Date.now() });
  },
  setFromGps(fix) {
    set({
      site: {
        name: 'GPS',
        lat: fix.lat,
        lon: fix.lon,
        elevation: fix.elevation ?? get().site.elevation,
      },
      siteId: null,
      source: 'gps',
      accuracyM: fix.accuracyM ?? null,
      updatedAt: Date.now(),
    });
  },
  setManual(loc) {
    set({
      site: { ...get().site, ...loc },
      siteId: null,
      source: 'manual',
      accuracyM: null,
      updatedAt: Date.now(),
    });
  },
}));
