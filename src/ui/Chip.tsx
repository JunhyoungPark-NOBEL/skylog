import type { ReactNode } from 'react';

type ChipTone = 'accent' | 'success' | 'muted';

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  testId?: string;
  /** role: tab(카테고리) | switch(토글) | 없음(정보 배지) */
  role?: 'tab' | 'switch';
  tone?: ChipTone;
  className?: string;
}

/** 선택 안 됨: 표면 2층 */
const IDLE = 'bg-surface-2 text-fg';
/** 선택된 버튼 칩: 단일 선택은 강조색 채움, success는 톤(soft) + 안쪽 1px 링, muted는 표면 3층 */
const BUTTON_SELECTED: Record<ChipTone, string> = {
  accent: 'bg-accent text-accent-fg',
  success: 'bg-success-soft text-success shadow-[inset_0_0_0_1px_var(--success)]',
  muted: 'bg-surface-3 text-muted',
};
/** 정보 배지(상태 배지 레시피): 항상 톤으로만 */
const BADGE_SELECTED: Record<ChipTone, string> = {
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  muted: 'bg-surface-3 text-muted',
};

/** 캡슐 칩(D-021): 필터·토글은 버튼, onClick이 없으면 정보 배지. 외곽선 없이 톤으로 상태를 표현한다. */
export function Chip({
  children,
  selected = false,
  onClick,
  testId,
  role,
  tone = 'accent',
  className = '',
}: ChipProps) {
  if (!onClick)
    return (
      <span
        className={`inline-flex min-h-7 items-center gap-1 rounded-pill px-2.5 py-1 text-label font-semibold ${
          selected ? BADGE_SELECTED[tone] : IDLE
        } ${className}`}
        data-testid={testId}
      >
        {children}
      </span>
    );
  return (
    <button
      type="button"
      role={role}
      aria-selected={role === 'tab' ? selected : undefined}
      aria-checked={role === 'switch' ? selected : undefined}
      onClick={onClick}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill px-3.5 text-body-sm font-medium transition-[background-color,color,transform,box-shadow] duration-150 ease-standard active:scale-95 ${
        selected ? BUTTON_SELECTED[tone] : IDLE
      } ${className}`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

/** 가로 스크롤 칩 행(부모 px-4 기준으로 가장자리까지 스크롤, 스크롤바 숨김) */
export function ChipRow({
  children,
  label,
  className = '',
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role={label ? 'tablist' : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}
