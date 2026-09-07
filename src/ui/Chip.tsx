import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  testId?: string;
  /** role: tab(카테고리) | switch(토글) | 없음(정보 배지) */
  role?: 'tab' | 'switch';
  tone?: 'accent' | 'success' | 'muted';
  className?: string;
}

/** 알약형 칩(D-020): 필터·토글·정보 배지. 선택되면 강조색으로 채운다. */
export function Chip({ children, selected = false, onClick, testId, role, tone = 'accent', className = '' }: ChipProps) {
  const fill = tone === 'success' ? 'var(--success)' : tone === 'muted' ? 'var(--surface-3)' : 'var(--accent)';
  const fg = tone === 'muted' ? 'var(--fg)' : 'var(--accent-fg)';
  const style = selected
    ? { background: fill, color: fg, borderColor: fill }
    : { background: 'var(--surface-2)', color: 'var(--fg)', borderColor: 'transparent' };
  if (!onClick)
    return (
      <span
        className={`inline-flex min-h-7 items-center rounded-pill border px-2.5 text-[12px] font-medium ${className}`}
        style={style}
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
      className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-pill border px-3.5 text-[13px] font-medium transition-colors ${className}`}
      style={style}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

/** 가로 스크롤 칩 행 */
export function ChipRow({ children, label, className = '' }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div className={`-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] ${className}`} role={label ? 'tablist' : undefined} aria-label={label}>
      {children}
    </div>
  );
}
