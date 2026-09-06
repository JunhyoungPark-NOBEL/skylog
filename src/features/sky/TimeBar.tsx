import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClockStore } from '@/state/clockStore';

const fmtDateTime = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

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
 * 접을 수 있다. 실시간이 아닐 때는 강조색.
 */
export function TimeBar() {
  const { t } = useTranslation();
  const mode = useClockStore((s) => s.mode);
  const rate = useClockStore((s) => s.rate);
  const offsetMs = useClockStore((s) => s.offsetMs);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [slider, setSlider] = useState(0);
  const sliderPrev = useRef(0);

  useEffect(() => {
    const tick = () => setLabel(fmtDateTime.format(useClockStore.getState().now()));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);

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
      className="safe-bottom absolute inset-x-0 bottom-0 flex flex-col border-t border-border bg-overlay text-xs"
      data-testid="time-bar"
      style={{ color: notNow ? 'var(--accent)' : 'var(--fg)' }}
    >
      <div className="flex min-h-11 items-center gap-2 px-3">
        <button
          type="button"
          className="min-h-9 flex-1 text-left font-mono"
          onClick={() => setOpen((o) => !o)}
          data-testid="time-toggle"
          aria-expanded={open}
        >
          {label}
          {mode === 'manual' && rate !== 0 ? ` ×${rate}` : ''}
          {notNow ? ` · ${t('status.manualTime')}` : ''}
        </button>
        {notNow && (
          <button
            type="button"
            className="min-h-9 rounded-full bg-accent px-3 text-accent-fg"
            onClick={() => useClockStore.getState().resetToNow()}
            data-testid="time-now"
          >
            {t('sky.time.now')}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-2 px-3 pb-3" data-testid="time-controls">
          <input
            type="range"
            min={-720}
            max={720}
            step={1}
            value={sliderValue}
            onChange={(e) => onSlider(Number(e.target.value))}
            aria-label={t('sky.time.slider')}
            className="w-full"
            data-testid="time-slider"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={toLocalDateInput(useClockStore.getState().now())}
              onChange={(e) => onDate(e.target.value)}
              aria-label={t('sky.time.date')}
              className="min-h-9 rounded border border-border bg-surface px-2 text-fg"
              data-testid="time-date"
            />
            <div
              className="flex flex-1 justify-end gap-1"
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
                  className="min-h-9 min-w-10 rounded-full border border-border px-2 font-mono"
                  style={{
                    background: mode === 'manual' && rate === r ? 'var(--accent)' : 'transparent',
                    color: mode === 'manual' && rate === r ? 'var(--accent-fg)' : 'inherit',
                  }}
                  data-testid={`time-rate-${r}`}
                >
                  {r === 0 ? '⏸' : `${r > 0 ? '' : '−'}${Math.abs(r)}×`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
