import { create } from 'zustand';
import type { ObjectId } from '@/catalog/objectId';

export type SheetStage = 'half' | 'full';

export interface SelectionState {
  /** 하늘에서 선택된(툴팁) 천체 */
  selectedId: ObjectId | null;
  /** 상세 시트가 열려 있는가(열려 있으면 selectedId를 보여준다) */
  sheetOpen: boolean;
  sheetStage: SheetStage;
  /** 찾아가기(화살표) 대상 */
  targetId: ObjectId | null;

  select(id: ObjectId | null): void;
  /** 어디서든 상세 시트 열기(task-03 §3.2 `openObject`) */
  openSheet(id: ObjectId, stage?: SheetStage): void;
  setSheetStage(stage: SheetStage): void;
  closeSheet(): void;
  setTarget(id: ObjectId | null): void;
  clear(): void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedId: null,
  sheetOpen: false,
  sheetStage: 'half',
  targetId: null,
  select: (selectedId) => set({ selectedId }),
  openSheet: (id, stage = 'half') => set({ selectedId: id, sheetOpen: true, sheetStage: stage }),
  setSheetStage: (sheetStage) => set({ sheetStage }),
  closeSheet: () => set({ sheetOpen: false }),
  setTarget: (targetId) => set({ targetId }),
  clear: () => set({ selectedId: null, targetId: null, sheetOpen: false }),
}));
