import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface PillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  testId?: string;
  pressed?: boolean;
}

const SIZE: Record<Size, string> = {
  sm: 'min-h-9 px-3.5 text-body-sm',
  md: 'min-h-11 px-5 text-body',
  lg: 'min-h-12 px-6 text-body-lg',
};

/**
 * 캡슐 버튼(D-021).
 * primary 강조색 채움 · secondary 표면 3층(pressed면 톤 강조) · ghost 3차 텍스트 버튼(강조색 글자) · danger 톤 위험.
 * 하늘 위에 떠 있을 때만 className으로 shadow-float를 덧붙인다. 비활성은 흐리게(툴팁으로 이유).
 */
const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent font-semibold text-accent-fg',
  secondary:
    'bg-surface-3 font-medium text-fg aria-pressed:bg-accent-soft aria-pressed:text-accent',
  ghost: 'bg-transparent font-medium text-accent active:bg-accent-soft',
  danger: 'bg-danger-soft font-semibold text-danger',
};

export function PillButton({
  children,
  variant = 'secondary',
  size = 'md',
  testId,
  pressed,
  className = '',
  disabled,
  ...rest
}: PillButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill transition-[transform,opacity,background-color,color] duration-150 ease-standard active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${SIZE[size]} ${VARIANT[variant]} ${className}`}
      data-testid={testId}
      {...rest}
    >
      {children}
    </button>
  );
}
