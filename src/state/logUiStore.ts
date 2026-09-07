import { create } from 'zustand';
import type { ObjectId } from '@/catalog/objectId';

/**
 * 기록 UI 전역 상태(task-04): 어디서든 기록 폼을 열고(`openObservationForm`), 저장/삭제 토스트를 띄운다.
 * 폼 자체는 App에 한 번 마운트된 `ObservationFormHost`가 그린다(상세 시트와 같은 방식).
 */
export interface FormRequest {
  objectId: ObjectId;
  /** 있으면 편집, 없으면 새 기록 */
  observationId?: string;
  /** 새 기록의 기본값(예: 시도했지만 못 봄) */
  outcome?: 'seen' | 'notSeen';
  /** 저장 뒤 실행(폼이 닫힌 다음) */
  onSaved?(observationId: string): void;
}

export interface ToastAction {
  label: string;
  onClick(): void;
}

export interface Toast {
  id: number;
  text: string;
  action?: ToastAction;
  /** 기본 5초 */
  ttlMs?: number;
}

export interface LogUiState {
  form: FormRequest | null;
  toast: Toast | null;
  openForm(req: FormRequest): void;
  closeForm(): void;
  showToast(t: Omit<Toast, 'id'>): number;
  dismissToast(id?: number): void;
}

let toastSeq = 0;

export const useLogUiStore = create<LogUiState>()((set, get) => ({
  form: null,
  toast: null,
  openForm: (form) => set({ form }),
  closeForm: () => set({ form: null }),
  showToast: (t) => {
    const id = ++toastSeq;
    set({ toast: { id, ...t } });
    return id;
  },
  dismissToast: (id) => {
    const cur = get().toast;
    if (!cur || (id !== undefined && cur.id !== id)) return;
    set({ toast: null });
  },
}));

/** 어디서든 기록 폼 열기(상세 시트·하늘 마커·기록 탭 "+"). */
export function openObservationForm(req: FormRequest): void {
  useLogUiStore.getState().openForm(req);
}

export function showToast(text: string, action?: ToastAction, ttlMs?: number): number {
  return useLogUiStore.getState().showToast({ text, action, ttlMs });
}
