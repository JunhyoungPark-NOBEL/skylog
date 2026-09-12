import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClockStore } from '@/state/clockStore';
import { useSettingsStore } from '@/state/settingsStore';
import { IconChevron } from '@/ui/icons';

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
 * 실시간은 작은 시각 pill, 필요할 때만 상세 제어를 펼친다. 시간 이동과 지금 복귀는 접어도 표시한다.
 * 위치는 SkyView의 하단 스택(bottom-sky)이 정한다.
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
      className={`${open ? 'glass-sm' : 'glass-hud'} pointer-events-auto flex max-w-full flex-col text-caption shadow-card ${
        open ? 'w-full rounded-xl' : 'rounded-pill'
      } ${notNow ? 'text-accent' : 'text-fg'}`}
      data-testid="time-bar"
      data-time-shifted={notNow ? '1' : '0'}
    >
      <div className={`flex min-h-11 items-center ${notNow ? 'gap-1 pl-3 pr-1' : 'px-3'}`}>
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left text-body-sm font-medium tabular-nums"
          onClick={() => setOpen((o) => !o)}
          disabled={readOnly}
          data-testid="time-toggle"
          aria-expanded={open}
          aria-controls={open ? controlsId : undefined}
          aria-label={`${t('sky.time.controls')} · ${label}${notNow ? ` · ${t('status.manualTime')}` : ''}`}
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate">
              {!open && !notNow && (
                <span className="mr-1.5 font-normal text-fg/70">{t('sky.time.now')}</span>
              )}
              {open || notNow ? label : timeOnly}
              {mode === 'manual' && rate !== 0 ? ` ×${rate}` : ''}
            </span>
            {notNow && !readOnly && (
              <span className="text-label font-medium" data-testid="time-shift-label">
                {t('status.manualTime')}
              </span>
            )}
          </span>
          <IconChevron
            size={14}
            className={`ml-auto shrink-0 transition-transform duration-150 ease-standard ${
              open ? 'rotate-90' : '-rotate-90'
            }`}
          />
        </button>
        {notNow && !readOnly && (
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill px-3 text-caption font-semibold text-accent transition-colors duration-150 ease-standard active:bg-accent-soft"
            onClick={() => useClockStore.getState().resetToNow()}
            data-testid="time-now"
          >
            {t('sky.time.now')}
          </button>
        )}
      </div>
      {open && !readOnly && (
        <div
          id={controlsId}
          className="flex max-h-[45dvh] flex-col gap-2 overflow-y-auto overscroll-contain px-3 pb-3 text-fg"
          data-testid="time-controls"
        >
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
