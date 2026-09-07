interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange(next: T): void;
}

/** 소수의 상호 배타 선택(언어 등). 캡슐 트랙 위에 선택 옵션만 강조색으로 채운다. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1 truncate text-body">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="relative flex shrink-0 rounded-pill bg-surface-2 p-1"
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
              className="relative z-10 min-h-9 min-w-11 rounded-pill px-3.5 text-body-sm font-medium text-muted transition-colors duration-150 ease-standard aria-checked:bg-accent aria-checked:text-accent-fg"
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
