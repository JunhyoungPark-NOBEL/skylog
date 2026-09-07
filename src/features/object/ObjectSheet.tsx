import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { computeObjectDetails, type ObjectDetails } from '@/astro/objectDetails';
import { displayName, loadCatalog, secondaryName, type Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { fovForTarget, resolveTarget, type ObjectTarget } from '@/catalog/objectTarget';
import { isBookmarked, toggleBookmark } from '@/db/repos/bookmarks';
import { getDb } from '@/db/database';
import type { Bortle } from '@/db/types';
import { openObject } from '@/features/object/objectApi';
import { flyToObject, getSkyScene } from '@/features/sky/skyApi';
import { getObservingNight } from '@/features/tonight/useNight';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import {
  formatAlt,
  formatAngularSize,
  formatAzimuth,
  formatDistance,
  formatDms,
  formatHms,
  formatMag,
  formatSeparation,
  formatTime,
} from '@/ui/format';

const REFRESH_MS = 10_000;
const SWIPE_PX = 70;

interface Loaded {
  target: ObjectTarget;
  details: ObjectDetails;
}

function useBortle(): Bortle {
  const siteId = useLocationStore((s) => s.siteId);
  const [bortle, setBortle] = useState<Bortle>(7);
  useEffect(() => {
    let alive = true;
    if (!siteId) {
      const h = window.setTimeout(() => setBortle(7), 0);
      return () => window.clearTimeout(h);
    }
    void getDb()
      .sites.get(siteId)
      .then((s) => {
        if (alive) setBortle(s?.bortle ?? 7);
      });
    return () => {
      alive = false;
    };
  }, [siteId]);
  return bortle;
}

function Row({
  label,
  value,
  tip,
  testId,
}: {
  label: string;
  value: string;
  tip?: string;
  testId?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-muted" title={tip}>
        {label}
        {tip && <span className="ml-1 text-[10px] opacity-70">ⓘ</span>}
      </span>
      <span className="text-right text-sm font-semibold" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 rounded-xl bg-surface-2/60 px-3 py-2">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-sm">{value}</span>
        <button
          type="button"
          className="min-h-8 rounded-full bg-surface px-2 text-[11px] text-muted"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? t('object.copied') : t('object.copy')}
        </button>
      </span>
    </div>
  );
}

const VERDICT_COLOR: Record<ObjectDetails['verdicts']['naked']['verdict'], string> = {
  easy: 'var(--success)',
  possible: 'var(--accent)',
  hard: 'var(--planet)',
  no: 'var(--muted)',
};

/**
 * 천체 상세 바텀 시트(task-03 §3.2). 반쯤/전체 2단계, 핸들 스와이프로 단계 전환·닫기.
 * 값은 10초마다 다시 계산(순수 함수 `computeObjectDetails`).
 */
export function ObjectSheet() {
  const { t } = useTranslation();
  const open = useSelectionStore((s) => s.sheetOpen);
  const id = useSelectionStore((s) => s.selectedId);
  const stage = useSelectionStore((s) => s.sheetStage);
  const targetId = useSelectionStore((s) => s.targetId);
  const lang = useSettingsStore((s) => s.lang);
  const site = useLocationStore((s) => s.site);
  const bortle = useBortle();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void loadCatalog().then((c) => {
      if (alive) setCat(c);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  // 상세 계산(초기 + 10초 간격 + 시계 변경)
  useEffect(() => {
    if (!open || !id || !cat) return;
    let alive = true;
    const compute = () => {
      if (!alive) return;
      const now = useClockStore.getState().now();
      const fallback = getSkyScene()?.objectJ2000(id) ?? null;
      const target = resolveTarget(cat, id, now, site, fallback);
      if (!target) {
        setLoaded(null);
        return;
      }
      const night = getObservingNight(site, now);
      setLoaded({ target, details: computeObjectDetails(target, now, site, night, { bortle }) });
    };
    const first = window.setTimeout(compute, 0);
    const timer = window.setInterval(compute, REFRESH_MS);
    const unsub = useClockStore.subscribe(() => {
      const c = useClockStore.getState();
      if (c.mode === 'manual' || c.offsetMs !== 0) compute();
    });
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(timer);
      unsub();
    };
  }, [open, id, cat, site, bortle]);

  useEffect(() => {
    if (!open || !id) return;
    let alive = true;
    void isBookmarked(id).then((b) => {
      if (alive) setBookmarked(b);
    });
    return () => {
      alive = false;
    };
  }, [open, id]);

  if (!open || !id) return null;
  const close = () => useSelectionStore.getState().closeSheet();
  const shown = loaded && loaded.target.id === id ? loaded : null;
  const name = cat ? displayName(cat, id, lang) : id;
  const secondary = cat ? secondaryName(cat, id, lang) : undefined;

  const onPointerDown = (e: ReactPointerEvent) => {
    dragStart.current = e.clientY;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (dragStart.current === null) return;
    setDragY(e.clientY - dragStart.current);
  };
  const onPointerUp = () => {
    const dy = dragY;
    dragStart.current = null;
    setDragging(false);
    setDragY(0);
    if (dy > SWIPE_PX) {
      if (stage === 'full') useSelectionStore.getState().setSheetStage('half');
      else close();
    } else if (dy < -SWIPE_PX && stage === 'half')
      useSelectionStore.getState().setSheetStage('full');
  };

  const d = shown?.details;
  const tg = shown?.target;
  const kind =
    tg?.kind ??
    (id === 'sun' || id === 'moon'
      ? id
      : id.startsWith('planet:')
        ? 'planet'
        : id.startsWith('dso:')
          ? 'dso'
          : id.startsWith('const:')
            ? 'const'
            : 'star');
  const conAbbr = tg?.con;
  const conName = conAbbr
    ? lang === 'ko'
      ? cat?.constellations[conAbbr]?.ko
      : cat?.constellations[conAbbr]?.en
    : undefined;
  const monthName = (m: number) =>
    lang === 'ko'
      ? t('object.month', { m })
      : new Date(2000, m - 1, 1).toLocaleString('en', { month: 'long' });

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-border bg-surface text-fg shadow-2xl"
      style={{
        height: stage === 'full' ? 'calc(100% - var(--status-height) - 8px)' : '46%',
        transform: dragY ? `translateY(${Math.max(0, dragY)}px)` : undefined,
        transition: !dragging ? 'height 200ms ease, transform 150ms ease' : 'none',
      }}
      role="dialog"
      aria-label={name}
      data-testid="object-sheet"
      data-stage={stage}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none flex-col items-center pb-1 pt-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="sheet-handle"
      >
        <div className="h-1.5 w-10 rounded-full bg-border" />
      </div>
      <header className="flex shrink-0 items-start gap-2 px-4 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold" data-testid="sheet-name">
            {name}
          </h2>
          <p className="truncate text-xs text-muted">
            {[secondary, t(`sky.kind.${kind}`), conName].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={bookmarked}
          aria-label={t('object.action.plan')}
          onClick={() => {
            void toggleBookmark(id).then(setBookmarked);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
          style={{ color: bookmarked ? 'var(--marker)' : 'var(--muted)' }}
          data-testid="sheet-bookmark"
        >
          {bookmarked ? '★' : '☆'}
        </button>
        <button
          type="button"
          onClick={() =>
            useSelectionStore.getState().setSheetStage(stage === 'full' ? 'half' : 'full')
          }
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted"
          aria-label={stage === 'full' ? t('object.collapse') : t('object.expand')}
          data-testid="sheet-stage"
        >
          {stage === 'full' ? '⌄' : '⌃'}
        </button>
        <button
          type="button"
          onClick={close}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted"
          aria-label={t('common.close')}
          data-testid="sheet-close"
        >
          ✕
        </button>
      </header>

      <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2">
        <button
          type="button"
          className="min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          onClick={() => {
            flyToObject(id, tg ? fovForTarget(tg) : undefined);
            useSelectionStore.getState().setTarget(id);
            navigate('sky');
            useSelectionStore.getState().setSheetStage('half');
          }}
          data-testid="sheet-show-in-sky"
        >
          {t('object.action.showInSky')}
        </button>
        {targetId === id && (
          <button
            type="button"
            className="min-h-9 shrink-0 rounded-full bg-surface-2 px-3 text-xs"
            onClick={() => useSelectionStore.getState().setTarget(null)}
            data-testid="sheet-clear-target"
          >
            {t('target.clear')}
          </button>
        )}
        <button
          type="button"
          disabled
          title={t('object.later.telescope')}
          className="min-h-9 shrink-0 rounded-full bg-surface-2 px-3 text-xs opacity-40"
          data-testid="sheet-telescope"
        >
          {t('object.action.telescope')}
        </button>
        <button
          type="button"
          disabled
          title={t('object.later.log')}
          className="min-h-9 shrink-0 rounded-full bg-surface-2 px-3 text-xs opacity-40"
          data-testid="sheet-log"
        >
          {t('object.action.log')}
        </button>
        <button
          type="button"
          aria-pressed={bookmarked}
          className="min-h-9 shrink-0 rounded-full bg-surface-2 px-3 text-xs"
          style={{ color: bookmarked ? 'var(--marker)' : undefined }}
          onClick={() => {
            void toggleBookmark(id).then(setBookmarked);
          }}
          data-testid="sheet-plan"
        >
          {bookmarked ? t('object.action.planned') : t('object.action.plan')}
        </button>
        <button
          type="button"
          disabled
          title={t('object.later.story')}
          className="min-h-9 shrink-0 rounded-full bg-surface-2 px-3 text-xs opacity-40"
        >
          {t('object.action.story')}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6" data-testid="sheet-body">
        {!d && <p className="py-3 text-sm text-muted">{t('common.loading')}</p>}
        {d && tg && (
          <>
            <Section title={t('object.section.now')}>
              <div className="flex items-center justify-between py-1">
                <span className="text-2xl font-bold" data-testid="sheet-altaz">
                  {formatAlt(d.now.altDeg)}
                  <span className="ml-2 text-base font-semibold">
                    {formatAzimuth(d.now.azDeg, lang)}
                  </span>
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background: d.now.status === 'visible' ? 'var(--success)' : 'var(--surface)',
                    color: d.now.status === 'visible' ? 'var(--accent-fg)' : 'var(--muted)',
                  }}
                  data-testid="sheet-status"
                  data-status={d.now.status}
                >
                  {t(`object.status.${d.now.status}`)}
                </span>
              </div>
              <Row label={t('object.mag')} value={formatMag(d.now.mag)} tip={t('object.tip.mag')} />
              <Row label={t('object.distance')} value={formatDistance(d.now.distance, lang)} />
              {tg.majArcmin !== undefined && tg.kind !== 'const' && (
                <Row
                  label={t('object.size')}
                  value={formatAngularSize(tg.majArcmin, tg.minArcmin)}
                />
              )}
              {d.now.angularDiameterArcsec !== undefined && (
                <Row
                  label={t('object.angularDiameter')}
                  value={formatAngularSize(d.now.angularDiameterArcsec / 60)}
                />
              )}
              {d.now.phaseFraction !== undefined &&
                (tg.kind === 'moon' || ['mercury', 'venus', 'mars'].includes(tg.bodyKey ?? '')) && (
                  <Row
                    label={t('object.illum')}
                    value={`${(d.now.phaseFraction * 100).toFixed(0)}%`}
                  />
                )}
              {tg.kind !== 'moon' && (
                <Row label={t('object.moonSep')} value={formatSeparation(d.now.moonSepDeg)} />
              )}
              {tg.kind !== 'sun' && d.now.sunSepDeg < 30 && (
                <Row label={t('object.sunSep')} value={formatSeparation(d.now.sunSepDeg)} />
              )}
            </Section>

            <Section title={t('object.section.today')}>
              {d.today.rtsStatus === 'circumpolar' && (
                <p className="text-xs text-muted">{t('object.circumpolar')}</p>
              )}
              {d.today.rtsStatus === 'neverRises' && (
                <p className="text-xs text-muted">{t('object.neverRises')}</p>
              )}
              <div className="grid grid-cols-3 gap-2 py-1 text-center">
                {(['rise', 'transit', 'set'] as const).map((k) => (
                  <div key={k} className="rounded-lg bg-surface px-2 py-1">
                    <div className="text-[11px] text-muted">{t(`object.${k}`)}</div>
                    <div className="font-mono text-base font-semibold" data-testid={`sheet-${k}`}>
                      {formatTime(d.today[k])}
                    </div>
                  </div>
                ))}
              </div>
              {d.today.transitAltDeg !== null && (
                <Row
                  label={t('object.transitAlt')}
                  value={formatAlt(d.today.transitAltDeg)}
                  tip={t('object.tip.alt')}
                />
              )}
              <Row
                label={t('object.bestWindow')}
                value={
                  d.today.bestWindow
                    ? `${formatTime(d.today.bestWindow.from)} – ${formatTime(d.today.bestWindow.to)}`
                    : t('object.bestWindowNone')
                }
                tip={t('object.bestWindowHint', { alt: d.today.bestWindowMinAlt ?? 30 })}
                testId="sheet-best-window"
              />
              {d.today.bestMonth !== null && (
                <Row
                  label={t('object.bestMonth')}
                  value={monthName(d.today.bestMonth)}
                  testId="sheet-best-month"
                />
              )}
            </Section>

            <Section title={t('object.section.coords')}>
              <CopyRow
                label={t('object.j2000')}
                value={`${formatHms(d.now.raJ2000Deg)}  ${formatDms(d.now.decJ2000Deg)}`}
              />
              <CopyRow
                label={t('object.jnow')}
                value={`${formatHms(d.now.raDeg)}  ${formatDms(d.now.decDeg)}`}
              />
              <CopyRow
                label={t('object.altaz')}
                value={`${formatDms(d.now.altDeg, 0, true)}  ${formatDms(d.now.azDeg, 0, false)}`}
              />
            </Section>

            {tg.kind !== 'sun' && (
              <Section title={t('object.section.equipment')}>
                <div className="grid grid-cols-3 gap-2 py-1 text-center">
                  {(['naked', 'binoculars', 'telescope'] as const).map((k) => {
                    const v = d.verdicts[k];
                    return (
                      <div
                        key={k}
                        className="rounded-lg bg-surface px-2 py-1"
                        data-testid={`sheet-verdict-${k}`}
                      >
                        <div className="text-[11px] text-muted">{t(`object.equipment.${k}`)}</div>
                        <div
                          className="text-sm font-semibold"
                          style={{ color: VERDICT_COLOR[v.verdict] }}
                        >
                          {t(`object.verdict.${v.verdict}`)}
                        </div>
                        <div className="text-[10px] text-muted">
                          {t('object.limit', { mag: v.limitMag.toFixed(1) })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted">
                  {t('object.verdictNote', { bortle: d.bortle })}
                </p>
              </Section>
            )}

            {tg.kind === 'const' && cat && conAbbr && (
              <ConstellationExtras cat={cat} abbr={conAbbr} lang={lang} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const SEASON_KEY: Record<string, string> = {
  봄: 'spring',
  여름: 'summer',
  가을: 'autumn',
  겨울: 'winter',
  북극: 'any',
  남천: 'any',
};

function ConstellationExtras({
  cat,
  abbr,
  lang,
}: {
  cat: Catalog;
  abbr: string;
  lang: 'ko' | 'en';
}) {
  const { t } = useTranslation();
  const c = cat.constellations[abbr];
  if (!c) return null;
  const stars = cat.stars
    .filter((s) => s.con === abbr && s.mag <= 3.5)
    .sort((a, b) => a.mag - b.mag)
    .slice(0, 8);
  const dsos = cat.dso
    .filter((d) => d.con === abbr && (d.messier !== undefined || d.caldwell !== undefined))
    .sort((a, b) => (a.mag ?? 99) - (b.mag ?? 99))
    .slice(0, 8);
  const season = c.season ? SEASON_KEY[c.season] : undefined;
  const openChild = (id: ObjectId) => openObject(id, 'half');
  return (
    <Section title={t('object.section.constellation')}>
      {season && <Row label={t('object.con.season')} value={t(`object.season.${season}`)} />}
      <div className="text-xs text-muted">{t('object.con.mainStars')}</div>
      <ul className="mb-2 flex flex-wrap gap-1.5 py-1">
        {stars.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => openChild(s.id)}
              className="min-h-8 rounded-full bg-surface px-2.5 text-xs"
            >
              {displayName(cat, s.id, lang)} <span className="text-muted">{s.mag.toFixed(1)}</span>
            </button>
          </li>
        ))}
      </ul>
      {dsos.length > 0 && (
        <>
          <div className="text-xs text-muted">{t('object.con.dsos')}</div>
          <ul className="flex flex-wrap gap-1.5 py-1">
            {dsos.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => openChild(d.id)}
                  className="min-h-8 rounded-full bg-surface px-2.5 text-xs"
                >
                  {displayName(cat, d.id, lang)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}
