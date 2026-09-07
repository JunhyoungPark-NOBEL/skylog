import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EquipmentKind } from '@/astro/equipment';
import { createDexieSettingsStorage } from '@/db/repos/settings';

/** 관측 시간대 프리셋(task-03 §3.7): 지금부터 2시간 / 저녁 / 심야 / 새벽 / 직접 */
export type WindowPreset = 'next2h' | 'evening' | 'lateNight' | 'dawn' | 'custom';

export interface TonightValues {
  preset: WindowPreset;
  /** 직접 지정(현지 시, 0..24; 끝이 시작보다 작으면 다음 날) */
  customFromHour: number;
  customToHour: number;
  equipment: EquipmentKind;
}

export interface TonightState extends TonightValues {
  setPreset(p: WindowPreset): void;
  setCustom(fromHour: number, toHour: number): void;
  setEquipment(e: EquipmentKind): void;
}

export const TONIGHT_PERSIST_NAME = 'tonight';

export const useTonightStore = create<TonightState>()(
  persist(
    (set) => ({
      preset: 'evening',
      customFromHour: 21,
      customToHour: 1,
      equipment: 'naked',
      setPreset: (preset) => set({ preset }),
      setCustom: (customFromHour, customToHour) => set({ customFromHour, customToHour, preset: 'custom' }),
      setEquipment: (equipment) => set({ equipment }),
    }),
    {
      name: TONIGHT_PERSIST_NAME,
      version: 1,
      storage: createJSONStorage(() => createDexieSettingsStorage(TONIGHT_PERSIST_NAME)),
      partialize: (s): TonightValues => ({
        preset: s.preset,
        customFromHour: s.customFromHour,
        customToHour: s.customToHour,
        equipment: s.equipment,
      }),
    },
  ),
);
