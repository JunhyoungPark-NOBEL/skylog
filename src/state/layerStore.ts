import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createDexieSettingsStorage } from '@/db/repos/settings';

/** 하늘 뷰 레이어 토글·투명도 (T1). Dexie `settings` 테이블에 `layers.*`로 저장. */
export interface LayerValues {
  constellationLines: boolean;
  constellationLinesAlpha: number;
  constellationBounds: boolean;
  constellationBoundsAlpha: number;
  constellationNames: boolean;
  constellationNamesAlpha: number;
  altAzGrid: boolean;
  equator: boolean;
  ecliptic: boolean;
  meridian: boolean;
  /** 지면 불투명도 0..1. 1일 때 지평선 아래 천체 표시·선택을 함께 막는다. */
  groundOpacity: number;
  /** 잔디·꽃 풍경과 시선을 내릴 때 지면 자동 투명화. */
  landscape: boolean;
  milkyWay: boolean;
  milkyWayAlpha: number;
  dso: boolean;
  starLabels: boolean;
  /** 라벨 언어: 설정 언어 따름 | 한국어 | 영어 */
  labelLang: 'auto' | 'ko' | 'en';
  atmosphere: boolean;
  extinction: boolean;
  /** 별 채도 0..1 */
  starSaturation: number;
  /** 달·행성 확대 표시(×3) */
  magnifyBodies: boolean;
  /** 맨눈 한계등급(기본 6.5, T3의 "실제 하늘처럼" 모드가 갱신) */
  limitingMag: number;
  showViewInfo: boolean;
  /** "실제 하늘처럼": Bortle·달빛만큼 별을 줄인다(T3b) */
  realSky: boolean;
  /** 하늘 밝기 Bortle 1..9, 0이면 관측지 설정(없으면 7) 따름 */
  bortle: number;
  /** 내 기록 표시: 하늘 위 ★(본 것)·회색 ★(시도)·☆(예정) 마커(T4) */
  markers: boolean;
}

export interface LayerState extends LayerValues {
  set<K extends keyof LayerValues>(key: K, value: LayerValues[K]): void;
  toggle(key: BooleanLayerKey): void;
  reset(): void;
}

export type BooleanLayerKey = {
  [K in keyof LayerValues]: LayerValues[K] extends boolean ? K : never;
}[keyof LayerValues];

export const DEFAULT_LAYERS: LayerValues = {
  constellationLines: true,
  constellationLinesAlpha: 0.35,
  constellationBounds: false,
  constellationBoundsAlpha: 0.2,
  constellationNames: true,
  constellationNamesAlpha: 0.7,
  altAzGrid: false,
  equator: false,
  ecliptic: false,
  meridian: false,
  groundOpacity: 1,
  landscape: true,
  milkyWay: true,
  milkyWayAlpha: 0.33,
  dso: true,
  starLabels: true,
  labelLang: 'auto',
  atmosphere: true,
  extinction: true,
  starSaturation: 1,
  magnifyBodies: false,
  limitingMag: 6.5,
  showViewInfo: true,
  realSky: false,
  bortle: 0,
  markers: true,
};

export const LAYERS_PERSIST_NAME = 'layers';

/** v1의 겹치는 지면 옵션을 한 값으로 옮기며 이전 기본 밝기만 새 기본값으로 갱신한다. */
export function restoredLayers(value: unknown, version: number): LayerValues {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const next = { ...DEFAULT_LAYERS };
  for (const key of Object.keys(DEFAULT_LAYERS) as (keyof LayerValues)[]) {
    const saved = raw[key];
    if (typeof saved !== typeof DEFAULT_LAYERS[key]) continue;
    if (typeof saved === 'number' && !Number.isFinite(saved)) continue;
    (next as unknown as Record<string, unknown>)[key] = saved;
  }
  next.groundOpacity = Math.max(0, Math.min(1, next.groundOpacity));
  if (version < 2) {
    // 과거 기본 반투명 지면은 새 기본 불투명 지면으로, 명시적인 지면 숨김은 투명으로 옮긴다.
    if (typeof raw['groundOpacity'] !== 'number')
      next.groundOpacity = raw['ground'] === false && raw['showBelowHorizon'] !== false ? 0 : 1;
    if (raw['milkyWayAlpha'] === 0.6) next.milkyWayAlpha = DEFAULT_LAYERS.milkyWayAlpha;
    if (raw['starSaturation'] === 0.8) next.starSaturation = DEFAULT_LAYERS.starSaturation;
  }
  return next;
}

export const useLayerStore = create<LayerState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_LAYERS,
      set: (key, value) => set({ [key]: value } as Partial<LayerValues>),
      toggle: (key) => set({ [key]: !get()[key] } as Partial<LayerValues>),
      reset: () => set({ ...DEFAULT_LAYERS }),
    }),
    {
      name: LAYERS_PERSIST_NAME,
      version: 2,
      migrate: (state, version) => restoredLayers(state, version),
      // Dexie의 이전 키 행이 남아 있어도 폐기한 옵션이 상태/다시 저장할 값에 들어오지 않는다.
      merge: (persisted, current) => ({ ...current, ...restoredLayers(persisted, 2) }),
      storage: createJSONStorage(() => createDexieSettingsStorage(LAYERS_PERSIST_NAME)),
      partialize: (s): LayerValues => {
        const { set: _set, toggle: _toggle, reset: _reset, ...values } = s;
        return values;
      },
    },
  ),
);

export function waitForLayerHydration(): Promise<void> {
  if (useLayerStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useLayerStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

/** 지면의 표시와 별·라벨·선택이 같은 불투명도 설정을 따른다. */
export function showsBelowHorizon(layers: Pick<LayerValues, 'groundOpacity'>): boolean {
  return layers.groundOpacity < 1;
}
