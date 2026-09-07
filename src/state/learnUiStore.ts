import { create } from 'zustand';
import type { ObjectId } from '@/catalog/objectId';
export interface QuizRequest {
  stageId?: string;
  sessionId?: string;
  ids?: string[];
  objectId?: ObjectId;
  review?: boolean;
  limit?: number;
}
export const useLearnUiStore = create<{
  quiz: QuizRequest | null;
  openQuiz(request?: QuizRequest): void;
  closeQuiz(): void;
}>((set) => ({
  quiz: null,
  openQuiz: (quiz = {}) => set({ quiz: { ...quiz, sessionId: crypto.randomUUID() } }),
  closeQuiz: () => set({ quiz: null }),
}));
