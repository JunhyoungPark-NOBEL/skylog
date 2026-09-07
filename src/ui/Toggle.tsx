import { useTranslation } from 'react-i18next';

interface ToggleProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange(next: boolean): void;
}

/**
 * 44px 터치 타깃의 스위치. `role="switch"`로 접근성 보장.
 * 트랙은 색 전환, 썸은 transform(스프링)만 애니메이션한다 — left/width 애니메이션 금지.
 */
export function Toggle({ id, label, hint, checked, disabled, onChange }: ToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-body">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-caption text-muted">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        data-state={checked ? 'on' : 'off'}
        onClick={() => onChange(!checked)}
        className="group relative h-8 w-[52px] shrink-0 rounded-pill bg-surface-3 transition-colors duration-250 ease-standard data-[state=on]:bg-accent disabled:opacity-40"
      >
        <span
          aria-hidden="true"
          className="absolute left-1 top-1 h-6 w-6 rounded-pill bg-fg/90 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-[350ms] ease-spring-fast group-data-[state=on]:translate-x-5 group-data-[state=on]:bg-accent-fg"
        />
        <span className="sr-only">{checked ? t('common.on') : t('common.off')}</span>
      </button>
    </div>
  );
}
