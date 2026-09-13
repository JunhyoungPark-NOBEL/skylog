import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClockStore } from '@/state/clockStore';
import { useSettingsStore } from '@/state/settingsStore';
import { IconClock } from '@/ui/icons';

const RATES = [-600, -60, 0, 60, 600] as const;

function toLocalDateInput(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * 시간 제어 바 (task-01 §3.7): ±12시간 슬라이더(1분), 날짜, 배속, "지금". 상태는 clockStore.
 * 우상단 시계 아이콘에서만 펼친다. 접힌 상태에서는 시각 텍스트로 시야를 가리지 않는다.
 */
export function TimeBar({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const mode = useClockStore((s) => s.mode);
  const rate = useClockStore((s) => s.rate);
  const offsetMs = useClockStore((s) => s.offsetMs);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [timeOnly, setTimeOnly] = useState('');
  const [slider, setSlider] = useState(0);
  const sliderPrev = useRef(0);
  const controlsId = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const formats = useMemo(() => {
    const locale = lang === 'ko' ? 'ko-KR' : 'en-GB';
    const time: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Seoul',
    };
    return {
      time: new Intl.DateTimeFormat(locale, time),
      dateTime: new Intl.DateTimeFormat(locale, { ...time, month: '2-digit', day: '2-digit' }),
    };
  }, [lang]);

  useEffect(() => {
    const tick = () => {
      const now = useClockStore.getState().now();
      setLabel(formats.dateTime.format(now));
      setTimeOnly(formats.time.format(now));
    };
    tick();
    const id = window.setInterval(tick, 500);
    const unsubscribe = useClockStore.subscribe(() => queueMicrotask(tick));
    return () => {
      window.clearInterval(id);
      unsubscribe();
    };
  }, [formats]);

  // 실시간 모드에서는 슬라이더 = 오프셋(파생값), 수동 모드에서는 마지막 슬라이더 위치
  const sliderValue = mode === 'realtime' ? Math.round(offsetMs / 60_000) : slider;

  const notNow = mode !== 'realtime' || offsetMs !== 0;

  const onSlider = (v: number) => {
    const c = useClockStore.getState();
    if (c.mode === 'realtime') c.setOffset(v * 60_000);
    else c.setManual(new Date(c.now().getTime() + (v - sliderPrev.current) * 60_000), c.rate);
    sliderPrev.current = v;
    setSlider(v);
  };

  const onDate = (value: string) => {
    if (!value) return;
    const c = useClockStore.getState();
    const cur = c.now();
    // 같은 KST 시각, 날짜만 교체
    const [y, m, d] = value.split('-').map(Number) as [number, number, number];
    const kst = new Date(cur.getTime() + 9 * 3_600_000);
    const next = new Date(
      Date.UTC(y, m - 1, d, kst.getUTCHours(), kst.getUTCMinutes()) - 9 * 3_600_000,
    );
    c.setManual(next, 0);
    sliderPrev.current = 0;
    setSlider(0);
  };

  return (
    <div
      ref={root}
      className="pointer-events-auto relative h-[44px] w-[44px]"
      data-testid="time-bar"
      data-time-shifted={notNow ? '1' : '0'}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={readOnly}
        data-testid="time-toggle"
        aria-expanded={open && !readOnly}
        aria-controls={open && !readOnly ? controlsId : undefined}
        aria-label={`${t('sky.time.controls')} · ${label}${notNow ? ` · ${t('status.manualTime')}` : ''}`}
        title={`${label}${notNow ? ` · ${t('status.manualTime')}` : ''}`}
        className={`flex h-[44px] w-[44px] items-center justify-center rounded-full glass-hud ${notNow ? 'text-accent' : 'text-fg'}`}
      >
        <IconClock size={21} />
        {notNow && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        )}
      </button>
      {open && !readOnly && (
        <div
          id={controlsId}
          className="absolute right-0 top-[calc(100%+8px)] z-40 flex max-h-[70dvh] w-[min(22rem,calc(100vw-24px))] flex-col gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-hairline bg-surface p-4 text-fg shadow-float"
          data-testid="time-controls"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-body-sm tabular-nums">
              {label || timeOnly}
              {notNow && (
                <span className="block text-caption text-accent" data-testid="time-shift-label">
                  {t('status.manualTime')}
                </span>
              )}
            </p>
            <button
              type="button"
              className="min-h-11 rounded-pill bg-surface-2 px-4 text-body-sm text-accent"
              data-testid="time-now"
              onClick={() => useClockStore.getState().resetToNow()}
            >
              {t('sky.time.now')}
            </button>
          </div>
          <input
            type="range"
            min={-720}
            max={720}
            step={1}
            value={sliderValue}
            onChange={(e) => onSlider(Number(e.target.value))}
            aria-label={t('sky.time.slider')}
            className="min-h-11 w-full shrink-0"
            data-testid="time-slider"
          />
          <div className="flex shrink-0 items-center gap-3">
            <label htmlFor={`${controlsId}-date`} className="shrink-0 text-fg/70">
              {t('sky.time.date')}
            </label>
            <input
              id={`${controlsId}-date`}
              type="date"
              value={toLocalDateInput(useClockStore.getState().now())}
              onChange={(e) => onDate(e.target.value)}
              aria-label={t('sky.time.date')}
              className="min-h-11 min-w-0 flex-1 rounded-sm bg-surface-2/80 px-3 text-body-sm text-fg tabular-nums outline-none transition-[background-color,box-shadow] duration-150 focus:bg-surface-3 focus-visible:shadow-[0_0_0_2px_var(--accent-glow)]"
              data-testid="time-date"
            />
          </div>
          <div
            className="grid shrink-0 grid-cols-5 gap-1"
            role="group"
            aria-label={t('sky.time.rate')}
          >
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  sliderPrev.current = sliderValue;
                  setSlider(sliderValue);
                  useClockStore.getState().setRate(r);
                }}
                aria-pressed={mode === 'manual' && rate === r}
                aria-label={`${t('sky.time.rate')} ${r}×`}
                className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-pill bg-surface-2/80 px-1 text-caption font-medium tabular-nums transition-colors duration-150 ease-standard active:bg-surface-3 aria-pressed:bg-accent aria-pressed:text-accent-fg"
                data-testid={`time-rate-${r}`}
              >
                {r === 0 ? '⏸' : `${r > 0 ? '' : '−'}${Math.abs(r)}×`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
