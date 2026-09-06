interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange(next: T): void;
}

/** 소수의 상호 배타 선택(언어 등). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="flex-1 text-[15px]">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex rounded-full border border-border p-0.5"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className="min-h-9 min-w-11 rounded-full px-3 text-sm"
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--accent-fg)' : 'var(--fg)',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
