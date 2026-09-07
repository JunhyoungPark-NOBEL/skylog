import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ObjectKind } from '@/catalog/objectId';
import type { EquipmentKind, Observation } from '@/db/types';
import { BackupBanner } from '@/features/log/BackupBanner';
import { LogByObject } from '@/features/log/LogByObject';
import { LogCalendar } from '@/features/log/LogCalendar';
import { LogTimeline } from '@/features/log/LogTimeline';
import {
  EMPTY_FILTER,
  filterObservations,
  isFilterActive,
  type LogFilter,
  type LogPeriod,
} from '@/features/log/logUtils';
import { ObservationDetail } from '@/features/log/ObservationDetail';
import { PlannedList } from '@/features/log/PlannedList';
import { QuickPick } from '@/features/log/QuickPick';
import { StatsCard } from '@/features/log/StatsCard';
import { useCatalog, useObservations } from '@/features/log/useObservations';
import { useClockStore } from '@/state/clockStore';
import { useSettingsStore } from '@/state/settingsStore';
import { Chip, ChipRow } from '@/ui/Chip';
import { IconSearch } from '@/ui/icons';
import { PillButton } from '@/ui/PillButton';

type LogView = 'timeline' | 'calendar' | 'byObject' | 'planned';

const VIEWS: LogView[] = ['timeline', 'calendar', 'byObject', 'planned'];
const KINDS: ObjectKind[] = ['star', 'dso', 'planet', 'moon', 'const'];
const OUTCOMES: Observation['outcome'][] = ['seen', 'notSeen'];
const EQUIPMENT: EquipmentKind[] = ['naked', 'binoculars', 'telescope'];
const PERIODS: Exclude<LogPeriod, 'all'>[] = ['7d', '30d'];

function IconPlus({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** 보기 전환 — 4개라 Segmented(라벨+트랙) 대신 가로를 꽉 채우는 캡슐 트랙 */
function ViewSwitch({
  value,
  onChange,
  label,
  names,
}: {
  value: LogView;
  onChange(v: LogView): void;
  label: string;
  names: Record<LogView, string>;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-pill bg-surface-2 p-1">
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          onClick={() => onChange(v)}
          className="min-h-9 min-w-0 flex-1 truncate rounded-pill px-2 text-body-sm font-medium text-muted transition-colors duration-150 ease-standard aria-checked:bg-accent aria-checked:text-accent-fg"
          data-testid={`log-view-${v}`}
        >
          {names[v]}
        </button>
      ))}
    </div>
  );
}

/**
 * 기록 탭(task-04 §3.4): 타임라인 · 달력 · 대상별 · 관측 예정(☆) + 검색/필터 + 통계.
 * 루트는 위·아래 여백 없이 px-4 — App의 TabScreen이 pt-status/pb-tab을 준다.
 * 상세·빠른 선택은 포털 오버레이(z-30)로 떠 있는 크롬 위에 올라간다.
 */
export function LogScreen() {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const cat = useCatalog();
  const { rows, ready } = useObservations();
  const [view, setView] = useState<LogView>('timeline');
  const [filter, setFilter] = useState<LogFilter>(EMPTY_FILTER);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const filtered = useMemo(
    () => filterObservations(rows, filter, cat, { now: useClockStore.getState().now() }),
    [rows, filter, cat],
  );
  const detail = detailId ? (rows.find((r) => r.id === detailId) ?? null) : null;

  // 열어 둔 기록이 (스와이프·다른 화면에서) 지워지면 상세를 닫는다
  useEffect(() => {
    if (!detailId || !ready || rows.some((r) => r.id === detailId)) return;
    const h = window.setTimeout(() => setDetailId(null), 0);
    return () => window.clearTimeout(h);
  }, [detailId, ready, rows]);

  const patch = (p: Partial<LogFilter>) => setFilter((f) => ({ ...f, ...p }));
  const toggle = <K extends 'outcome' | 'equipment'>(key: K, value: NonNullable<LogFilter[K]>) =>
    patch({ [key]: filter[key] === value ? null : value } as Partial<LogFilter>);
  const empty = ready && rows.length === 0;
  const showFilters = view !== 'planned' && !empty;
  const viewNames: Record<LogView, string> = {
    timeline: t('log.tab.views.timeline'),
    calendar: t('log.tab.views.calendar'),
    byObject: t('log.tab.views.byObject'),
    planned: t('log.tab.views.planned'),
  };

  return (
    <section className="px-4" data-testid="log-screen">
      <div className="flex items-center justify-between gap-3 pt-2 pb-2">
        <h1 className="text-headline">{t('log.title')}</h1>
        <button
          type="button"
          aria-label={t('log.tab.add')}
          onClick={() => setQuickOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-fg shadow-card transition-transform duration-150 ease-standard active:scale-95"
          data-testid="log-add"
        >
          <IconPlus />
        </button>
      </div>

      <BackupBanner />

      <div className="py-2">
        <ViewSwitch
          value={view}
          onChange={setView}
          label={t('log.tab.viewLabel')}
          names={viewNames}
        />
      </div>

      {showFilters && (
        <div className="pb-2" data-testid="log-filters">
          <div className="relative">
            <IconSearch
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={filter.query ?? ''}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder={t('log.tab.searchPlaceholder')}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-label={t('common.search')}
              data-testid="log-search"
              className="min-h-12 w-full appearance-none rounded-pill bg-surface-2 pl-11 pr-11 text-body text-fg outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-muted focus:bg-surface-3 focus-visible:shadow-[0_0_0_2px_var(--accent-glow)] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
            />
            {filter.query && (
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={() => patch({ query: '' })}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-pill text-muted transition-[background-color,transform] duration-150 ease-standard active:scale-95 active:bg-surface-3"
              >
                ✕
              </button>
            )}
          </div>
          <ChipRow label={t('log.tab.kindLabel')}>
            <Chip
              role="tab"
              selected={!filter.kind}
              onClick={() => patch({ kind: null })}
              testId="log-kind-all"
            >
              {t('log.tab.all')}
            </Chip>
            {KINDS.map((k) => (
              <Chip
                key={k}
                role="tab"
                selected={filter.kind === k}
                onClick={() => patch({ kind: k })}
                testId={`log-kind-${k}`}
              >
                {t(`sky.kind.${k}`)}
              </Chip>
            ))}
          </ChipRow>
          <ChipRow className="pt-0">
            {OUTCOMES.map((o) => (
              <Chip
                key={o}
                role="switch"
                tone="success"
                selected={filter.outcome === o}
                onClick={() => toggle('outcome', o)}
                testId={`log-outcome-${o}`}
              >
                <span aria-hidden className={o === 'seen' ? 'text-marker' : 'text-muted'}>
                  ★
                </span>
                {t(`log.tab.${o}`)}
              </Chip>
            ))}
            {EQUIPMENT.map((e) => (
              <Chip
                key={e}
                role="switch"
                selected={filter.equipment === e}
                onClick={() => toggle('equipment', e)}
                testId={`log-equip-${e}`}
              >
                {t(`log.tab.equip.${e}`)}
              </Chip>
            ))}
            {PERIODS.map((p) => (
              <Chip
                key={p}
                role="switch"
                selected={filter.period === p}
                onClick={() => patch({ period: filter.period === p ? 'all' : p })}
                testId={`log-period-${p}`}
              >
                {t(`log.tab.period.${p}`)}
              </Chip>
            ))}
            {isFilterActive(filter) && (
              <Chip tone="muted" onClick={() => setFilter(EMPTY_FILTER)} testId="log-filter-clear">
                ✕ {t('log.tab.clearFilter')}
              </Chip>
            )}
          </ChipRow>
        </div>
      )}

      {!ready && view !== 'planned' && (
        <p className="py-6 text-center text-body-sm text-muted">{t('common.loading')}</p>
      )}

      {empty && view !== 'planned' && (
        <div
          className="squircle rounded-xl bg-surface p-5 text-center shadow-card"
          data-testid="log-empty"
        >
          <p className="text-display leading-none text-marker" aria-hidden>
            ★
          </p>
          <p className="mt-3 text-title">{t('log.tab.empty.title')}</p>
          <p className="mt-1 text-body-sm text-muted">{t('log.tab.empty.body')}</p>
          <PillButton
            variant="primary"
            className="mt-4"
            onClick={() => setQuickOpen(true)}
            testId="log-empty-add"
          >
            <IconPlus size={18} />
            {t('log.tab.empty.action')}
          </PillButton>
        </div>
      )}

      {ready && !empty && view === 'timeline' && (
        <LogTimeline
          rows={filtered}
          cat={cat}
          lang={lang}
          onOpen={setDetailId}
          emptyText={t('log.tab.noMatch')}
        />
      )}
      {ready && !empty && view === 'calendar' && (
        <LogCalendar rows={filtered} cat={cat} lang={lang} onOpen={setDetailId} />
      )}
      {ready && !empty && view === 'byObject' && (
        <LogByObject rows={filtered} cat={cat} lang={lang} />
      )}
      {view === 'planned' && <PlannedList cat={cat} lang={lang} />}

      {ready && rows.length > 0 && (
        <div className="mt-6">
          <StatsCard observations={rows} cat={cat} lang={lang} />
        </div>
      )}

      {detail && (
        <ObservationDetail
          observation={detail}
          cat={cat}
          lang={lang}
          onClose={() => setDetailId(null)}
        />
      )}
      {quickOpen && (
        <QuickPick rows={rows} cat={cat} lang={lang} onClose={() => setQuickOpen(false)} />
      )}
    </section>
  );
}
