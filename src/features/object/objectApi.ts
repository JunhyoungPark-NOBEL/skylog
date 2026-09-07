/**
 * 어디서든 천체 상세 시트를 여는 진입점(task-03 §3.2). 검색·툴팁·추천·기록(T4)이 쓴다.
 */
import type { ObjectId } from '@/catalog/objectId';
import { useSelectionStore, type SheetStage } from '@/state/selectionStore';

export function openObject(id: ObjectId, stage: SheetStage = 'half'): void {
  useSelectionStore.getState().openSheet(id, stage);
}

export function closeObject(): void {
  useSelectionStore.getState().closeSheet();
}
