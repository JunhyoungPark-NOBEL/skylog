import { create } from 'zustand';
import type { ObjectId } from '@/catalog/objectId';

export interface SelectionState {
  /** 상세 시트에 열린 천체 */
  selectedId: ObjectId | null;
  /** 찾아가기(화살표) 대상 */
  targetId: ObjectId | null;

  select(id: ObjectId | null): void;
  setTarget(id: ObjectId | null): void;
  clear(): void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedId: null,
  targetId: null,
  select: (selectedId) => set({ selectedId }),
  setTarget: (targetId) => set({ targetId }),
  clear: () => set({ selectedId: null, targetId: null }),
}));
