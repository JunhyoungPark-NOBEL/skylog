import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import { nightKey } from '@/astro/time';
import type { Catalog } from '@/catalog/catalog';
import type { Observation } from '@/db/types';
import { LogTimeline } from '@/features/log/LogTimeline';
import {
  calendarMonth,
  monthLabel,
  monthOfNight,
  shiftMonth,
  type HeatLevel,
  type YearMonth,
} from '@/features/log/logUtils';
import { useClockStore } from '@/state/clockStore';
import { IconChevron } from '@/ui/icons';

interface LogCalendarProps {
  rows: readonly Observation[];
  cat: Catalog | null;
  lang: Lang;
  onOpen(id: string): void;
}

/** 히트맵 단계별 셀 색(0/1/2/3+). 색만으로 구분하지 않도록 셀 안에 기록 수도 적는다. */
const HEAT_CLASS: Record<HeatLevel, string> = {
  0: 'text-fg',
  1: 'bg-accent-soft/50 text-fg',
  2: 'bg-accent-soft text-accent',
  3: 'bg-accent text-accent-fg',
};

const NAV_BTN =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-fg/80 transition-[background-color,transform] duration-150 ease-standard active:scale-95 active:bg-surface-2';

/**
 * 달력(task-04 §3.4): 월 이동 + 7열 히트맵(nightKey 기준). 날짜를 누르면 그 밤의 기록이 아래에 나온다.
 */
export function LogCalendar({ rows, cat, lang, onOpen }: LogCalendarProps) {
  const { t } = useTranslation();
  const todayKey = nightKey(useClockStore.getState().now());
  const [ym, setYm] = useState<YearMonth>(() => monthOfNight(todayKey));
  const [selected, setSelected] = useState<string | null>(null);
  const month = useMemo(() => calendarMonth(ym.year, ym.month, rows), [ym, rows]);
  const selectedRows = useMemo(
    () => (selected ? rows.filter((r) => r.nightKey === selected) : []),
    [rows, selected],
  );
  const weekdays = t('log.calendar.weekdays').split(',');

  return (
    <div data-testid="log-calendar">
      <div className="squircle rounded-xl bg-surface p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className={NAV_BTN}
            aria-label={t('log.calendar.prev')}
            onClick={() => setYm(shiftMonth(ym.year, ym.month, -1))}
            data-testid="log-calendar-prev"
          >
            <IconChevron size={20} className="rotate-180" />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="text-title" data-testid="log-calendar-title">
              {monthLabel(ym.year, ym.month, lang)}
            </h2>
            <p className="text-caption text-muted tabular-nums">
              {t('log.calendar.monthTotal', { n: month.total })}
            </p>
          </div>
          <button
            type="button"
            className={NAV_BTN}
            aria-label={t('log.calendar.next')}
            onClick={() => setYm(shiftMonth(ym.year, ym.month, 1))}
            data-testid="log-calendar-next"
          >
            <IconChevron size={20} />
          </button>
        </div>

        <div
          className="grid grid-cols-7 gap-1"
          role="grid"
          aria-label={monthLabel(ym.year, ym.month, lang)}
        >
          {weekdays.map((w, i) => (
            <div
              key={`${w}-${i}`}
              role="columnheader"
              className="py-1 text-center text-label text-muted"
            >
              {w}
            </div>
          ))}
          {month.cells.map((cell, i) =>
            cell ? (
              <button
                key={cell.date}
                type="button"
                role="gridcell"
                aria-pressed={selected === cell.date}
                aria-label={`${cell.date} · ${t('log.calendar.dayCount', { n: cell.count })}`}
                onClick={() => setSelected(selected === cell.date ? null : cell.date)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-md text-body-sm tabular-nums transition-[background-color,box-shadow,transform] duration-150 ease-standard active:scale-95 ${
                  HEAT_CLASS[cell.level]
                } ${selected === cell.date ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : ''} ${
                  cell.date === todayKey && cell.level === 0 ? 'font-bold text-accent' : ''
                }`}
                data-testid={`log-day-${cell.date}`}
                data-count={cell.count}
              >
                <span className="leading-none">{cell.day}</span>
                {cell.count > 0 && (
                  <span className="mt-0.5 text-label leading-none opacity-80">{cell.count}</span>
                )}
              </button>
            ) : (
              <div key={`blank-${i}`} aria-hidden className="min-h-11" />
            ),
          )}
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 text-label text-muted">
          <span className="mr-1">{t('log.calendar.legend')}</span>
          {([0, 1, 2, 3] as const).map((lv) => (
            <span
              key={lv}
              className={`flex h-5 min-w-5 items-center justify-center rounded-xs px-1 ${
                lv === 0 ? 'bg-surface-3 text-muted' : HEAT_CLASS[lv]
              }`}
            >
              {lv === 3 ? '3+' : lv}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4" data-testid="log-calendar-night">
        {selected ? (
          <LogTimeline
            rows={selectedRows}
            cat={cat}
            lang={lang}
            onOpen={onOpen}
            emptyText={t('log.calendar.nightEmpty')}
          />
        ) : (
          <p className="px-1 text-center text-caption text-muted">{t('log.calendar.hint')}</p>
        )}
      </div>
    </div>
  );
}
