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
  ground: boolean;
  groundOpaque: boolean;
  /** 학습용 투시: 지평선 아래 천체도 표시(실제 관측 가능 판정에는 영향 없음) */
  showBelowHorizon: boolean;
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
  ground: true,
  groundOpaque: false,
  showBelowHorizon: true,
  milkyWay: true,
  milkyWayAlpha: 0.6,
  dso: true,
  starLabels: true,
  labelLang: 'auto',
  atmosphere: true,
  extinction: true,
  starSaturation: 0.8,
  magnifyBodies: false,
  limitingMag: 6.5,
  showViewInfo: true,
  realSky: false,
  bortle: 0,
  markers: true,
};

export const LAYERS_PERSIST_NAME = 'layers';

export const useLayerStore = create<LayerState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_LAYERS,
      set: (key, value) => set({ [key]: value } as Partial<LayerValues>),
      toggle: (key) => set({ [key]: !get()[key] } as Partial<LayerValues>),
    }),
    {
      name: LAYERS_PERSIST_NAME,
      version: 1,
      storage: createJSONStorage(() => createDexieSettingsStorage(LAYERS_PERSIST_NAME)),
      partialize: (s): LayerValues => {
        const { set: _set, toggle: _toggle, ...values } = s;
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

/** 불투명 지면은 투시보다 우선한다. 저장된 사용자 설정은 그대로 유지한다. */
export function showsBelowHorizon(
  layers: Pick<LayerValues, 'ground' | 'groundOpaque' | 'showBelowHorizon'>,
): boolean {
  return layers.showBelowHorizon && !(layers.ground && layers.groundOpaque);
}
