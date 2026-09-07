/**
 * 통계 카드(task-04 §3.6, A5): 숫자 타일 4개 · 진행률 3개(탭하면 남은 목록 → "다음에 볼 것"으로 연결) ·
 * 행성 7종·달·태양 체크 · 달 위상 8단계 · 월별 막대(최근 6개월) · 가장 많이 본 대상.
 * 야간 모드는 토큰 교체라 색만으로 의미를 주지 않는다(✓·★ 글리프와 문구를 함께).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MoonPhaseName } from '@/astro/bodies';
import { displayName, type Catalog, type Lang } from '@/catalog/catalog';
import { PLANET_KEYS, type ObjectId } from '@/catalog/objectId';
import { computeStats, messierId, MOON_PHASE_ORDER, type LogStats } from '@/features/log/stats';
import type { StatsCardProps } from '@/features/log/types';
import { openObject } from '@/features/object/objectApi';
import { getSkyScene } from '@/features/sky/skyApi';
import { useClockStore } from '@/state/clockStore';
import { Card, CardSection } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { PillButton } from '@/ui/PillButton';
import { DEFAULT_TZ } from '@/ui/format';

type ProgressKey = 'constellations' | 'messier' | 'caldwell';
const PROGRESS_KEYS: readonly ProgressKey[] = ['constellations', 'messier', 'caldwell'];
/** 남은 목록 한 번에 보여 주는 개수 */
const PAGE = 20;
/** 월별 막대 개수 */
const MONTH_BARS = 6;

/** 달 위상 글리프(오른쪽이 밝은 북반구 기준). 기우는 위상은 좌우 반전으로 그린다 */
const PHASE_GLYPH: Record<MoonPhaseName, { glyph: string; flip: boolean }> = {
  new: { glyph: '○', flip: false },
  waxingCrescent: { glyph: '◔', flip: false },
  firstQuarter: { glyph: '◑', flip: false },
  waxingGibbous: { glyph: '◕', flip: false },
  full: { glyph: '●', flip: false },
  waningGibbous: { glyph: '◕', flip: true },
  lastQuarter: { glyph: '◐', flip: false },
  waningCrescent: { glyph: '◔', flip: true },
};

interface RemainingItem {
  key: string;
  id: ObjectId | null;
  label: string;
}

function dateLabel(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: DEFAULT_TZ,
  }).format(new Date(iso));
}

function monthLabel(ym: string, lang: Lang): string {
  const m = Number(ym.slice(5, 7));
  if (lang === 'ko') return `${m}월`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2000, m - 1, 1)),
  );
}

function remainingOf(stats: LogStats, key: ProgressKey, cat: Catalog | null, lang: Lang) {
  if (key === 'constellations') {
    return stats.constellations.remaining
      .map((abbr): RemainingItem => {
        const c = cat?.constellations[abbr];
        return {
          key: abbr,
          id: `const:${abbr}`,
          label: c ? (lang === 'ko' ? c.ko : c.en) : abbr,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, lang));
  }
  if (key === 'messier') {
    return stats.messier.remaining.map((n): RemainingItem => {
      const id = messierId(n);
      const name = cat ? displayName(cat, id, lang) : `M${n}`;
      return { key: `M${n}`, id, label: name === `M${n}` ? name : `M${n} ${name}` };
    });
  }
  return stats.caldwell.remaining.map(({ n, id }): RemainingItem => {
    const name = id && cat ? displayName(cat, id, lang) : '';
    const bare = id ? id.slice(4) : '';
    return { key: `C${n}`, id, label: name && name !== bare ? `C${n} ${name}` : `C${n}` };
  });
}

export function StatsCard({ observations, cat, lang }: StatsCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<ProgressKey | null>(null);
  const [shown, setShown] = useState(PAGE);

  const stats = useMemo(
    () =>
      computeStats(observations, cat, {
        now: useClockStore.getState().now(),
        resolveJ2000: (id) => getSkyScene()?.objectJ2000(id) ?? null,
      }),
    [observations, cat],
  );

  const progress: Record<ProgressKey, { n: number; total: number }> = {
    constellations: { n: stats.constellations.done.length, total: stats.constellations.total },
    messier: { n: stats.messier.done.length, total: stats.messier.total },
    caldwell: { n: stats.caldwell.done.length, total: stats.caldwell.total },
  };
  const remaining = useMemo(
    () => (open ? remainingOf(stats, open, cat, lang) : []),
    [stats, open, cat, lang],
  );

  const toggle = (key: ProgressKey) => {
    setOpen((cur) => (cur === key ? null : key));
    setShown(PAGE);
  };

  const months = stats.monthly.slice(-MONTH_BARS);
  const monthMax = Math.max(1, ...months.map((m) => m.count));
  const bodyLabel = (id: ObjectId, key: string) =>
    cat ? displayName(cat, id, lang) : t(`stats.body.${key}`);

  return (
    <Card
      title={t('stats.title')}
      aside={
        stats.attemptedCount > 0 ? t('stats.attempted', { n: stats.attemptedCount }) : undefined
      }
      testId="stats-card"
    >
      {/* 숫자 타일 4개 */}
      <ul className="grid grid-cols-4 gap-2" aria-label={t('stats.title')}>
        <Tile
          value={stats.seenCount}
          label={t('stats.tile.observations')}
          testId="stats-tile-observations"
        />
        <Tile
          value={stats.objectCount}
          label={t('stats.tile.objects')}
          testId="stats-tile-objects"
        />
        <Tile value={stats.nightCount} label={t('stats.tile.nights')} testId="stats-tile-nights" />
        <Tile
          value={stats.streak.current}
          label={t('stats.tile.streak')}
          sub={
            stats.streak.longest > 0 ? t('stats.longest', { n: stats.streak.longest }) : undefined
          }
          testId="stats-tile-streak"
        />
      </ul>
      {observations.length === 0 && (
        <p className="mt-3 text-body-sm text-muted" data-testid="stats-empty">
          {t('stats.empty')}
        </p>
      )}

      {/* 진행률 3개 — 탭하면 남은 목록("다음에 볼 것") */}
      <CardSection title={t('stats.next')}>
        <ul className="-mx-2 [&>li+li]:hairline-t">
          {PROGRESS_KEYS.map((key) => {
            const { n, total } = progress[key];
            const isOpen = open === key;
            const pct = Math.min(100, Math.round((n / total) * 100));
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`stats-remaining-${key}`}
                  onClick={() => toggle(key)}
                  className={`flex min-h-11 w-full flex-col justify-center gap-1.5 rounded-sm px-2 py-2 text-left transition-[background-color] duration-150 ease-standard active:bg-surface-2 ${
                    isOpen ? 'bg-surface-2' : ''
                  }`}
                  data-testid={`stats-progress-${key}`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-body font-medium">{t(`stats.progress.${key}`)}</span>
                    <span className="text-body-sm text-muted tabular-nums">
                      {t('stats.ratio', { n, total })}
                    </span>
                  </span>
                  <span
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={n}
                    aria-label={t(`stats.progress.${key}`)}
                    className="block h-1.5 w-full overflow-hidden rounded-pill bg-surface-3"
                  >
                    <span
                      className="block h-full rounded-pill bg-accent transition-[width] duration-250 ease-standard"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </button>
                {isOpen && (
                  <div id={`stats-remaining-${key}`} className="px-2 pt-1 pb-3">
                    {remaining.length === 0 ? (
                      <p className="text-body-sm text-muted">{t('stats.allDone')}</p>
                    ) : (
                      <>
                        <p className="mb-2 text-caption text-muted">
                          {t('stats.remaining', { n: remaining.length })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {remaining.slice(0, shown).map(({ key: k, id, label }) => (
                            <Chip
                              key={k}
                              testId="stats-remaining-item"
                              onClick={id ? () => openObject(id) : undefined}
                              className={id ? '' : 'opacity-70'}
                            >
                              {label}
                            </Chip>
                          ))}
                        </div>
                        {remaining.length > shown && (
                          <PillButton
                            variant="ghost"
                            size="sm"
                            className="mt-1"
                            onClick={() => setShown((s) => s + PAGE)}
                            testId="stats-remaining-more"
                          >
                            {t('stats.showMore', { n: remaining.length - shown })}
                          </PillButton>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardSection>

      {/* 행성 7종 + 달·태양 */}
      <CardSection title={t('stats.planets')}>
        <ul className="grid grid-cols-7 gap-1" data-testid="stats-planets">
          {PLANET_KEYS.map((key) => (
            <CheckCell
              key={key}
              glyph="●"
              seen={stats.planets[key]}
              label={bodyLabel(`planet:${key}`, key)}
              seenText={t('stats.seen')}
              testId={`stats-planet-${key}`}
            />
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip selected={stats.moonSeen} tone="accent" testId="stats-moon">
            {stats.moonSeen ? '★' : '☆'} {bodyLabel('moon', 'moon')}
          </Chip>
          <Chip selected={stats.sunSeen} tone="accent" testId="stats-sun">
            {stats.sunSeen ? '★' : '☆'} {bodyLabel('sun', 'sun')}
          </Chip>
        </div>
      </CardSection>

      {/* 달 위상 8단계 */}
      <CardSection title={t('stats.moonPhases', { n: stats.moonPhases.length })}>
        <ul className="grid grid-cols-4 gap-1" data-testid="stats-moon-phases">
          {MOON_PHASE_ORDER.map((phase) => {
            const g = PHASE_GLYPH[phase];
            return (
              <CheckCell
                key={phase}
                glyph={g.glyph}
                flip={g.flip}
                seen={stats.moonPhases.includes(phase)}
                label={t(`tonight.moonPhase.${phase}`)}
                seenText={t('stats.seen')}
                testId={`stats-phase-${phase}`}
              />
            );
          })}
        </ul>
      </CardSection>

      {/* 월별 막대(최근 6개월) */}
      <CardSection title={t('stats.monthly')}>
        <ol className="flex h-24 items-end gap-2" data-testid="stats-monthly">
          {months.map((m) => {
            const h = m.count === 0 ? 2 : Math.max(6, Math.round((m.count / monthMax) * 64));
            return (
              <li
                key={m.ym}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                aria-label={`${monthLabel(m.ym, lang)} ${t('stats.times', { n: m.count })}`}
              >
                <span className="text-caption text-muted tabular-nums">{m.count || ''}</span>
                <span
                  className={`block w-full rounded-xs ${m.count ? 'bg-accent' : 'bg-surface-3'}`}
                  style={{ height: `${h}px` }}
                  aria-hidden
                />
                <span className="text-label text-muted">{monthLabel(m.ym, lang)}</span>
              </li>
            );
          })}
        </ol>
      </CardSection>

      {/* 가장 많이 본 대상 */}
      {stats.topObjects.length > 0 && (
        <CardSection title={t('stats.top')}>
          <ol className="-mx-2 [&>li+li]:hairline-t" data-testid="stats-top">
            {stats.topObjects.map((o, i) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => openObject(o.id)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-sm px-2 text-left transition-[background-color] duration-150 ease-standard active:bg-surface-2"
                  data-testid="stats-top-item"
                >
                  <span className="w-5 shrink-0 text-body-sm text-muted tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-body">
                    <span className="text-marker">★</span>{' '}
                    {cat ? displayName(cat, o.id, lang) : o.id}
                  </span>
                  <span className="shrink-0 text-body-sm text-muted tabular-nums">
                    {t('stats.times', { n: o.count })}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </CardSection>
      )}

      {stats.firstAt && stats.lastAt && (
        <p className="mt-3 text-caption text-muted" data-testid="stats-range">
          {t('stats.range', {
            first: dateLabel(stats.firstAt, lang),
            last: dateLabel(stats.lastAt, lang),
          })}
        </p>
      )}
    </Card>
  );
}

function Tile({
  value,
  label,
  sub,
  testId,
}: {
  value: number;
  label: string;
  sub?: string;
  testId: string;
}) {
  return (
    <li
      className="flex min-h-16 flex-col items-center justify-center rounded-md bg-surface-2 px-1 py-2 text-center"
      data-testid={testId}
    >
      <span className="text-title tabular-nums">{value}</span>
      <span className="text-caption text-muted">{label}</span>
      {sub && <span className="text-label text-muted">{sub}</span>}
    </li>
  );
}

/** 체크 셀: 글리프(본 것은 marker 색 + ✓) 아래 이름. 색만으로 구분하지 않는다 */
function CheckCell({
  glyph,
  flip = false,
  seen,
  label,
  seenText,
  testId,
}: {
  glyph: string;
  flip?: boolean;
  seen: boolean;
  label: string;
  seenText: string;
  testId: string;
}) {
  return (
    <li
      className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-sm py-1 text-center"
      data-testid={testId}
      data-seen={seen ? 'true' : 'false'}
      aria-label={seen ? `${label} ${seenText}` : label}
    >
      <span className="relative inline-flex h-6 items-center justify-center">
        <span
          className={`text-body-lg leading-none ${flip ? 'inline-block -scale-x-100' : ''} ${
            seen ? 'text-marker' : 'text-muted-2'
          }`}
          aria-hidden
        >
          {glyph}
        </span>
        {seen && (
          <span
            className="absolute -top-0.5 -right-2.5 text-label leading-none font-semibold text-marker"
            aria-hidden
          >
            ✓
          </span>
        )}
      </span>
      <span className={`w-full truncate text-label ${seen ? 'text-fg' : 'text-muted'}`}>
        {label}
      </span>
    </li>
  );
}
