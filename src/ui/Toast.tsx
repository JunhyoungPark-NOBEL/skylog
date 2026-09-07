import { useEffect } from 'react';
import { useLogUiStore } from '@/state/logUiStore';

const DEFAULT_TTL_MS = 5000;

/**
 * 하단 토스트(task-04): "저장됨 · 퀴즈 1분", "삭제됨 · 실행 취소" 같은 한 줄 + 액션 하나.
 * 떠 있는 탭 pill 위에 놓이고, 야간 모드 토큰을 그대로 쓴다. 동시에 하나만.
 */
export function ToastHost() {
  const toast = useLogUiStore((s) => s.toast);
  const dismiss = useLogUiStore((s) => s.dismissToast);
  useEffect(() => {
    if (!toast) return;
    const h = window.setTimeout(() => dismiss(toast.id), toast.ttlMs ?? DEFAULT_TTL_MS);
    return () => window.clearTimeout(h);
  }, [toast, dismiss]);
  if (!toast) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-sky z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto glass-off flex max-w-md items-center gap-3 rounded-pill bg-surface-3 py-2.5 pl-4 pr-2 text-body-sm text-fg shadow-float"
        data-testid="toast"
      >
        <span className="min-w-0 flex-1">{toast.text}</span>
        {toast.action && (
          <button
            type="button"
            className="min-h-9 shrink-0 rounded-pill bg-accent-soft px-3.5 text-body-sm font-semibold text-accent active:scale-[0.97]"
            onClick={() => {
              toast.action?.onClick();
              dismiss(toast.id);
            }}
            data-testid="toast-action"
          >
            {toast.action.label}
          </button>
        )}
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-fg/70"
          aria-label="close"
          onClick={() => dismiss(toast.id)}
          data-testid="toast-close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
