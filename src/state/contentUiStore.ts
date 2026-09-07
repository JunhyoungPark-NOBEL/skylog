import { create } from 'zustand';
import type { ObjectId } from '@/catalog/objectId';

/** 스토리 전체 화면(T6): 어디서든 `openStory(id)` → App의 `StoryHost`가 그린다. */
export interface ContentUiState {
  storyId: ObjectId | null;
  openStory(id: ObjectId): void;
  closeStory(): void;
}

export const useContentUiStore = create<ContentUiState>()((set) => ({
  storyId: null,
  openStory: (storyId) => set({ storyId }),
  closeStory: () => set({ storyId: null }),
}));

export function openStory(id: ObjectId): void {
  useContentUiStore.getState().openStory(id);
}
