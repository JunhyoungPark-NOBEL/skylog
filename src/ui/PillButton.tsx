import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
  pressed?: boolean;
}

const SIZE = { sm: 'min-h-9 px-3.5 text-[13px]', md: 'min-h-11 px-5 text-[15px]', lg: 'min-h-12 px-6 text-[16px]' };

/** 알약 버튼(D-020). primary는 강조색 채움, secondary는 표면 2층, ghost는 투명. 비활성은 흐리게(툴팁으로 이유). */
export function PillButton({
  children,
  variant = 'secondary',
  size = 'md',
  testId,
  pressed,
  className = '',
  disabled,
  style,
  ...rest
}: PillButtonProps) {
  const base: Record<string, string> =
    variant === 'primary'
      ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
      : variant === 'danger'
        ? { background: 'var(--danger)', color: 'var(--accent-fg)' }
        : variant === 'ghost'
          ? { background: 'transparent', color: 'var(--fg)' }
          : { background: 'var(--surface-2)', color: 'var(--fg)' };
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill font-semibold transition-[transform,opacity] active:scale-[0.97] disabled:opacity-40 ${SIZE[size]} ${className}`}
      style={{ ...base, ...style }}
      data-testid={testId}
      {...rest}
    >
      {children}
    </button>
  );
}
