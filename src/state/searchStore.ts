import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ObjectId } from '@/catalog/objectId';
import { createDexieSettingsStorage } from '@/db/repos/settings';

export const RECENT_MAX = 10;

export type SearchCategory =
  'all' | 'bodies' | 'star' | 'const' | 'cluster' | 'nebula' | 'galaxy' | 'messier';

export interface SearchValues {
  recent: ObjectId[];
  /** "지금 보이는 것만" */
  visibleOnly: boolean;
}

export interface SearchState extends SearchValues {
  category: SearchCategory;
  addRecent(id: ObjectId): void;
  clearRecent(): void;
  setVisibleOnly(on: boolean): void;
  setCategory(c: SearchCategory): void;
}

export const SEARCH_PERSIST_NAME = 'search';

/** 검색 화면 상태. 최근 검색·필터는 Dexie settings에 저장, 카테고리 칩은 세션 한정. */
export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      recent: [],
      visibleOnly: false,
      category: 'all',
      addRecent: (id) =>
        set({ recent: [id, ...get().recent.filter((r) => r !== id)].slice(0, RECENT_MAX) }),
      clearRecent: () => set({ recent: [] }),
      setVisibleOnly: (visibleOnly) => set({ visibleOnly }),
      setCategory: (category) => set({ category }),
    }),
    {
      name: SEARCH_PERSIST_NAME,
      version: 1,
      storage: createJSONStorage(() => createDexieSettingsStorage(SEARCH_PERSIST_NAME)),
      partialize: (s): SearchValues => ({ recent: s.recent, visibleOnly: s.visibleOnly }),
    },
  ),
);
