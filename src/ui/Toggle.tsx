import { useTranslation } from 'react-i18next';

interface ToggleProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange(next: boolean): void;
}

/** 44px 터치 타깃의 스위치. `role="switch"`로 접근성 보장. */
export function Toggle({ id, label, hint, checked, disabled, onChange }: ToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-[15px]">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
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
        className="relative h-8 w-14 shrink-0 rounded-full border border-border transition-colors disabled:opacity-40"
        style={{ background: checked ? 'var(--accent)' : 'var(--surface-2)' }}
      >
        <span
          className="absolute top-1 h-6 w-6 rounded-full transition-[left]"
          style={{
            left: checked ? 'calc(100% - 1.75rem)' : '0.25rem',
            background: checked ? 'var(--accent-fg)' : 'var(--muted)',
          }}
        />
        <span className="sr-only">{checked ? t('common.on') : t('common.off')}</span>
      </button>
    </div>
  );
}
