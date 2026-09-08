import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import type { Phenomenon } from '@/astro/phenomena';
import type { Catalog } from '@/catalog/catalog';
import type { MeteorShower } from '@/catalog/meteors';
import { useLocationStore } from '@/state/locationStore';
import { downloadBlob } from '@/native/files';
import { formatTime } from '@/ui/format';
import { Card } from '@/ui/Card';
import { getMonthPhenomena } from './useTonight';
import {
  calendarDate,
  eventsByDay,
  eventsToIcs,
  monthCells,
  shiftMonth,
  type CalendarMonth,
} from './calendar';
import { phenomenonTitle, phenomenonDetail } from './phenomenaText';

interface Props {
  cat: Catalog | null;
  lang: Lang;
  phenomena: Phenomenon[];
  nextMonthPhenomena: Phenomenon[];
  ym: CalendarMonth | null;
  showers: MeteorShower[];
  now: Date;
}
type View = 'list' | 'month' | 'year';
const TZ = 'Asia/Seoul';
const control = 'min-h-11 rounded-full px-4 text-body-sm font-semibold';
export function EventCalendar(props: Props) {
  const [view, setView] = useState<View>('list');
  if (!props.cat || !props.ym) return null;
  // 월이 바뀌면 이전에 고른 다음 달/날짜도 새 현재 월로 돌아간다. 보기 방식은 유지한다.
  return (
    <CalendarBrowser
      key={`${props.ym.year}-${props.ym.month}`}
      {...props}
      cat={props.cat}
      ym={props.ym}
      view={view}
      setView={setView}
    />
  );
}
function CalendarBrowser({
  cat,
  lang,
  ym,
  now,
  showers,
  view,
  setView,
}: Props & { cat: Catalog; ym: CalendarMonth; view: View; setView(v: View): void }) {
  const { t } = useTranslation();
  const site = useLocationStore((s) => s.site);
  const [selected, setSelected] = useState(ym);
  const [day, setDay] = useState<number | null>(null);
  const [loadYear, setLoadYear] = useState(false);
  const [annual, setAnnual] = useState<{ key: string; months: Phenomenon[][] } | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const key = `${selected.year}|${site.lat}|${site.lon}|${site.elevation ?? 0}|${showers.length}`;
  const today = calendarDate(now, TZ);
  const list = useMemo(
    () => getMonthPhenomena(site, selected.year, selected.month, showers, TZ),
    [site, selected.year, selected.month, showers],
  );
  const groups = useMemo(() => eventsByDay(list, selected, TZ), [list, selected]);
  const yearReady = annual?.key === key && annual.months.length === 12;
  useEffect(() => {
    if (view !== 'year' && !loadYear) return;
    let cancelled = false;
    let timer: number;
    const months: Phenomenon[][] = [];
    const compute = () => {
      if (cancelled) return;
      months.push(getMonthPhenomena(site, selected.year, months.length + 1, showers, TZ));
      setAnnual({ key, months: [...months] });
      if (months.length < 12) timer = window.setTimeout(compute, 8);
    };
    timer = window.setTimeout(compute, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [view, loadYear, key, site, selected.year, showers]);
  const title = (p: Phenomenon) => phenomenonTitle(p, cat, lang, t, showers);
  const monthName = (m: CalendarMonth, year = false) =>
    new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'long',
      ...(year ? { year: 'numeric' as const } : {}),
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(m.year, m.month - 1, 1)));
  const choose = (m: CalendarMonth) => {
    setSelected(m);
    setDay(null);
  };
  const next = shiftMonth(ym, 1);
  const exportYear = async () => {
    if (!yearReady || !annual) {
      setLoadYear(true);
      return;
    }
    setSaving(true);
    setError(false);
    try {
      const body = eventsToIcs(
        annual.months.flat(),
        title,
        (p) =>
          [
            phenomenonDetail(p, t),
            t('calendar.exportNote'),
            `${site.name} (${site.lat.toFixed(3)}, ${site.lon.toFixed(3)})`,
          ]
            .filter(Boolean)
            .join('\n'),
        now,
      );
      await downloadBlob(
        new Blob([body], { type: 'text/calendar;charset=utf-8' }),
        `skylog-${selected.year}-${lang}.ics`,
      );
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };
  const visible = day === null ? list : (groups.get(day) ?? []);
  return (
    <Card title={t('calendar.title')} testId="phenomena-card" className="rounded-3xl">
      <div className="mb-4 flex rounded-2xl bg-surface-2 p-1" aria-label={t('calendar.view')}>
        {(['list', 'month', 'year'] as const).map((v) => (
          <button
            key={v}
            className={`${control} flex-1 px-2 ${view === v ? 'bg-surface text-accent shadow-card' : 'text-muted'}`}
            aria-pressed={view === v}
            data-testid={'events-view-' + v}
            onClick={() => {
              if (
                v === 'list' &&
                ![ym, next].some((m) => m.year === selected.year && m.month === selected.month)
              )
                choose(ym);
              setView(v);
              setDay(null);
            }}
          >
            {t('calendar.' + v)}
          </button>
        ))}
      </div>
      {view === 'list' ? (
        <div className="mb-3 flex gap-2">
          {[ym, next].map((m, i) => (
            <button
              key={i}
              data-testid={i ? 'phen-next' : 'phen-this'}
              className={`${control} ${selected.month === m.month && selected.year === m.year ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'}`}
              aria-pressed={selected.month === m.month && selected.year === m.year}
              onClick={() => choose(m)}
            >
              {monthName(m)}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            className={control + ' bg-surface-2'}
            aria-label={t('calendar.previous')}
            data-testid="calendar-previous"
            onClick={() => choose(shiftMonth(selected, view === 'year' ? -12 : -1))}
          >
            ‹
          </button>
          <h3 className="text-title" data-testid="calendar-heading">
            {view === 'year' ? selected.year : monthName(selected, true)}
          </h3>
          <button
            className={control + ' bg-surface-2'}
            aria-label={t('calendar.next')}
            data-testid="calendar-next"
            onClick={() => choose(shiftMonth(selected, view === 'year' ? 12 : 1))}
          >
            ›
          </button>
        </div>
      )}
      {view !== 'list' && (
        <button className={control + ' mb-2 text-accent'} onClick={() => choose(ym)}>
          {t(view === 'year' ? 'calendar.currentYear' : 'calendar.current')}
        </button>
      )}
      {view === 'month' && (
        <div data-testid="event-month-grid">
          <Weekdays lang={lang} />
          <div className="grid grid-cols-7 gap-1">
            {monthCells(selected).map((d, i) =>
              d === null ? (
                <span key={'blank' + i} />
              ) : (
                <button
                  id={'event-day-' + d}
                  data-testid={'event-day-' + d}
                  key={d}
                  aria-pressed={day === d}
                  aria-current={
                    today.year === selected.year &&
                    today.month === selected.month &&
                    today.day === d
                      ? 'date'
                      : undefined
                  }
                  aria-label={`${monthName(selected, true)} ${d}, ${t('calendar.count', { n: groups.get(d)?.length ?? 0 })}`}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-body-sm tabular-nums ${day === d ? 'bg-accent text-accent-fg' : 'bg-surface-2 aria-[current=date]:ring-1 aria-[current=date]:ring-accent'}`}
                  onClick={() => setDay(d)}
                  onKeyDown={(e) => {
                    const last = new Date(Date.UTC(selected.year, selected.month, 0)).getUTCDate();
                    const change: Record<string, number> = {
                      ArrowLeft: d - 1,
                      ArrowRight: d + 1,
                      ArrowUp: d - 7,
                      ArrowDown: d + 7,
                      Home: 1,
                      End: last,
                    };
                    if (!(e.key in change)) return;
                    e.preventDefault();
                    const n = Math.min(last, Math.max(1, change[e.key]!));
                    setDay(n);
                    document.getElementById('event-day-' + n)?.focus();
                  }}
                >
                  <span>{d}</span>
                  <span className="h-2 text-[8px] leading-2" aria-hidden>
                    {groups.has(d) ? '●' : ''}
                  </span>
                </button>
              ),
            )}
          </div>
          <p className="mt-3 text-caption text-muted">{t('calendar.dayHelp')}</p>
          {day !== null && (
            <div className="mt-3 flex items-center justify-between">
              <h4 className="font-semibold">
                {monthName(selected)} {day}
              </h4>
              <button className={control + ' text-accent'} onClick={() => setDay(null)}>
                {t('calendar.allMonth')}
              </button>
            </div>
          )}
        </div>
      )}
      {view === 'year' ? (
        <>
          <p className="mb-3 text-caption text-muted" role="status">
            {yearReady
              ? t('calendar.yearHelp')
              : t('calendar.loading', { n: annual?.key === key ? annual.months.length : 0 })}
          </p>
          <div
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] gap-2"
            data-testid="event-year-grid"
          >
            {Array.from({ length: 12 }, (_, index) => {
              const m = { year: selected.year, month: index + 1 };
              const events = annual?.key === key ? (annual.months[index] ?? []) : [];
              const days = eventsByDay(events, m, TZ);
              return (
                <button
                  key={index}
                  data-testid={'year-month-' + (index + 1)}
                  className="flex flex-col rounded-2xl border border-hairline bg-surface-2 p-2 text-left"
                  onClick={() => {
                    choose(m);
                    setView('month');
                  }}
                >
                  <h4 className="mb-2 text-body-sm font-semibold">{monthName(m)}</h4>
                  <div
                    className="grid w-full grid-cols-7 gap-y-1 text-center text-[9px] tabular-nums"
                    aria-hidden
                  >
                    {monthCells(m).map((d, i) => (
                      <span
                        key={i}
                        className={
                          d && days.has(d)
                            ? 'rounded-full bg-accent-soft font-bold text-accent'
                            : 'text-muted'
                        }
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-label text-muted">
                    {annual?.key === key && annual.months[index]
                      ? t('calendar.count', { n: events.length })
                      : '…'}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <ul
          className="mt-3 [&>li+li]:border-t [&>li+li]:border-hairline"
          data-testid="phenomena-list"
        >
          {visible.map((p, i) => (
            <li
              key={i}
              className={`flex min-h-16 items-start gap-3 py-3 ${p.at.getTime() < now.getTime() - 86400000 ? 'opacity-60' : ''}`}
              data-kind={p.kind}
            >
              <time
                dateTime={p.at.toISOString()}
                className="w-12 shrink-0 text-caption text-muted tabular-nums"
              >
                <span className="block text-body font-semibold text-fg">
                  {calendarDate(p.at, TZ).day}
                </span>
                {p.kind !== 'meteorPeak' && formatTime(p.at, TZ)}
              </time>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">{title(p)}</span>
                {phenomenonDetail(p, t) && (
                  <span className="mt-1 block text-caption leading-5 text-muted">
                    {phenomenonDetail(p, t)}
                  </span>
                )}
                {p.visibleLocally !== undefined && (
                  <span
                    className={`mt-1 block text-caption ${p.visibleLocally ? 'text-success' : 'text-muted'}`}
                  >
                    {t(p.visibleLocally ? 'phenomena.visible' : 'phenomena.notVisible')}
                  </span>
                )}
              </span>
            </li>
          ))}
          {!visible.length && (
            <li className="py-5 text-body-sm text-muted">{t('calendar.empty')}</li>
          )}
        </ul>
      )}
      <details className="mt-4 border-t border-hairline pt-2">
        <summary className={control + ' cursor-pointer content-center px-0 text-accent'}>
          {t('calendar.saveYear')}
        </summary>
        <p className="mb-2 text-caption leading-5 text-muted">
          {t('calendar.exportHelp', { year: selected.year })}
        </p>
        <button
          className={control + ' bg-accent-soft text-accent disabled:opacity-50'}
          disabled={saving || (loadYear && !yearReady)}
          data-testid="calendar-export"
          onClick={() => void exportYear()}
        >
          {saving
            ? t('common.loading')
            : yearReady
              ? t('calendar.download')
              : loadYear
                ? t('calendar.loading', { n: annual?.key === key ? annual.months.length : 0 })
                : t('calendar.prepare')}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-caption text-danger">
            {t('calendar.exportError')}
          </p>
        )}
      </details>
    </Card>
  );
}
function Weekdays({ lang }: { lang: Lang }) {
  return (
    <div className="mb-1 grid grid-cols-7 text-center text-caption text-muted" aria-hidden>
      {(lang === 'ko'
        ? ['일', '월', '화', '수', '목', '금', '토']
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      ).map((d, i) => (
        <span className="py-2" key={i}>
          {d}
        </span>
      ))}
    </div>
  );
}
