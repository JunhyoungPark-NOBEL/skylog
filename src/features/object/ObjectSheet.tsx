import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openTelescope } from '@/features/telescope/navigation';
import { useTelescopeStore, equipmentProfile } from '@/state/telescopeStore';
import { navigate, useRoute } from '@/app/router';
import { computeObjectDetails, type ObjectDetails } from '@/astro/objectDetails';
import { displayName, loadCatalog, secondaryName, type Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { fovForTarget, resolveTarget, type ObjectTarget } from '@/catalog/objectTarget';
import { toggleBookmark } from '@/db/repos/bookmarks';
import { listObservations } from '@/db/repos/observations';
import { getDb } from '@/db/database';
import type { Bortle, Observation } from '@/db/types';
import { tagLabelKey } from '@/features/log/tagPresets';
import { openObject } from '@/features/object/objectApi';
import { flyToObject, getSkyScene } from '@/features/sky/skyApi';
import { getObservingNight } from '@/features/tonight/useNight';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useLogStore } from '@/state/logStore';
import { openObservationForm } from '@/state/logUiStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import {
  formatAlt,
  formatAngularSize,
  formatAzimuth,
  formatDateTime,
  formatDistance,
  formatDms,
  formatHms,
  formatMag,
  formatSeparation,
  formatTime,
} from '@/ui/format';
import { openStory } from '@/state/contentUiStore';
import { useDragScroll } from '@/ui/useDragScroll';
import { ScrollArea } from '@/ui/ScrollArea';
import { useSheetGesture } from '@/ui/useSheetGesture';

const REFRESH_MS = 10_000;

/* 디자인 브리프(D-021) 레시피 — 프리미티브 컴포넌트 대신 클래스 문자열로 인라인 */
const ICON_BTN =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-fg/80 transition-[background-color,color] duration-150 ease-standard active:bg-surface-2';
const PRIMARY_BTN =
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-accent px-5 text-body font-semibold text-accent-fg transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97] disabled:opacity-40';
const SECONDARY_BTN =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-surface-3 px-4 text-body-sm font-medium text-fg transition-[background-color,color,transform,opacity] duration-150 ease-standard active:scale-[0.97] disabled:opacity-40 aria-pressed:bg-accent-soft aria-pressed:text-accent';
const TERTIARY_BTN =
  'inline-flex min-h-8 shrink-0 items-center justify-center rounded-pill px-3 text-body-sm font-medium text-accent transition-[background-color,transform] duration-150 ease-standard active:scale-[0.97] active:bg-accent-soft';
const CHIP_BTN =
  'inline-flex min-h-9 items-center gap-1 rounded-pill bg-surface-3 px-3.5 text-body-sm font-medium text-fg transition-[background-color,color,transform] duration-150 ease-standard active:scale-95';
const TILE = 'rounded-sm bg-surface-3/70 px-2 py-2';

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
      <span className="text-caption text-muted" title={tip}>
        {label}
        {tip && <span className="ml-1 text-label opacity-70">ⓘ</span>}
      </span>
      <span className="text-right text-body-sm font-semibold tabular-nums" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 rounded-md bg-surface-2/70 px-3.5 py-3">
      <h3 className="mb-1.5 text-body-sm font-semibold text-muted">{title}</h3>
      {children}
    </section>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-caption text-muted">{label}</span>
      <span className="flex items-center gap-1">
        <span className="font-mono text-body-sm tabular-nums">{value}</span>
        <button
          type="button"
          className={TERTIARY_BTN}
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

const VERDICT_CLASS: Record<ObjectDetails['verdicts']['naked']['verdict'], string> = {
  easy: 'text-success',
  possible: 'text-accent',
  hard: 'text-planet',
  no: 'text-muted',
};

/**
 * 천체 상세 바텀 시트(task-03 §3.2). 본문·헤더 어디서든 쓸어 단계 전환·닫기.
 * 값은 10초마다 다시 계산(순수 함수 `computeObjectDetails`).
 * 하늘 뷰 위에서 반쯤 열렸을 때만 유리(glass-strong); 전체 열림·드래그 중·리스트 위에서는 불투명(glass-off).
 */
export function ObjectSheet() {
  const profile = useTelescopeStore((s) => s.profile);
  const actionScroll = useDragScroll<HTMLDivElement>();
  const { t } = useTranslation();
  const route = useRoute();
  const open = useSelectionStore((s) => s.sheetOpen);
  const id = useSelectionStore((s) => s.selectedId);
  const stage = useSelectionStore((s) => s.sheetStage);
  const targetId = useSelectionStore((s) => s.targetId);
  const lang = useSettingsStore((s) => s.lang);
  const site = useLocationStore((s) => s.site);
  const bortle = useBortle();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // ★/☆ 상태는 항상 logStore에서(DB 변경 시 자동 갱신 — 기록 폼 저장 직후 헤더가 ★로 바뀐다)
  const bookmarked = useLogStore((s) => (id ? s.bookmarkedSet.has(id) : false));
  const observed = useLogStore((s) => (id ? s.observedSet.has(id) : false));
  const attempted = useLogStore((s) => (id ? s.attemptedSet.has(id) : false));
  const setStage = useSelectionStore((s) => s.setSheetStage);
  const close = useSelectionStore((s) => s.closeSheet);
  const { ref: gestureRef, offset: dragY, dragging } = useSheetGesture(stage, setStage, close);

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
      setLoaded({
        target,
        details: computeObjectDetails(target, now, site, night, {
          bortle,
          equipment: equipmentProfile(profile),
        }),
      });
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
  }, [open, id, cat, site, bortle, profile]);

  if (!open || !id) return null;
  const shown = loaded && loaded.target.id === id ? loaded : null;
  const name = cat ? displayName(cat, id, lang) : id;
  const secondary = cat ? secondaryName(cat, id, lang) : undefined;

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

  // 유리는 하늘이 실제로 뒤에 있을 때(하늘 탭 + 반쯤 열림)만. 드래그 중에는 WebGL 프레임 보호를 위해 끈다.
  const overSky = route === 'sky' && stage === 'half';
  const surfaceClass = overSky && !dragging ? 'glass-strong' : 'glass-off';
  const motionClass = dragging
    ? 'transition-none'
    : 'transition-[height,transform] duration-[450ms] ease-spring';
  const fullHeight = 'calc(100% - var(--status-height) - env(safe-area-inset-top) - 8px)';
  const height =
    stage === 'full'
      ? dragY > 0
        ? `max(46%, calc(${fullHeight} - ${dragY}px))`
        : fullHeight
      : dragY < 0
        ? `min(${fullHeight}, calc(46% + ${-dragY}px))`
        : '46%';

  return (
    <div
      ref={gestureRef}
      className={`fixed inset-x-0 bottom-0 z-30 isolate flex flex-col overflow-hidden rounded-t-2xl text-fg shadow-sheet squircle ${surfaceClass} ${motionClass}`}
      style={{
        height,
        transform: stage === 'half' && dragY > 0 ? `translateY(${dragY}px)` : undefined,
      }}
      role="dialog"
      aria-label={name}
      data-testid="object-sheet"
      data-stage={stage}
      data-over-sky={overSky ? '1' : '0'}
      data-dragging={dragging ? '1' : undefined}
    >
      <div
        className="flex shrink-0 cursor-grab flex-col items-center pt-2.5 pb-2"
        data-testid="sheet-handle"
        data-sheet-handle=""
      >
        <div className="h-[5px] w-9 rounded-pill bg-fg/25" />
      </div>
      <header className="flex shrink-0 items-start gap-2 px-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="min-w-0 truncate text-title" data-testid="sheet-name">
              {name}
            </h2>
            {observed && (
              <span
                className="shrink-0 text-title text-marker"
                title={t('object.records.title')}
                data-testid="sheet-observed"
              >
                ★
              </span>
            )}
            {!observed && attempted && (
              <span
                className="shrink-0 text-title text-muted"
                title={t('object.records.notSeen')}
                data-testid="sheet-attempted"
              >
                ★
              </span>
            )}
          </div>
          <p className="truncate text-caption text-muted">
            {[secondary, t(`sky.kind.${kind}`), conName].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={bookmarked}
          aria-label={t('object.action.plan')}
          onClick={() => {
            void toggleBookmark(id);
          }}
          className={`${ICON_BTN} text-title ${bookmarked ? 'text-marker' : ''}`}
          data-testid="sheet-bookmark"
        >
          {bookmarked ? '★' : '☆'}
        </button>
        <button
          type="button"
          onClick={() =>
            useSelectionStore.getState().setSheetStage(stage === 'full' ? 'half' : 'full')
          }
          className={`${ICON_BTN} text-body-lg`}
          aria-label={stage === 'full' ? t('object.collapse') : t('object.expand')}
          data-testid="sheet-stage"
        >
          {stage === 'full' ? '⌄' : '⌃'}
        </button>
        <button
          type="button"
          onClick={close}
          className={`${ICON_BTN} text-body-lg`}
          aria-label={t('common.close')}
          data-testid="sheet-close"
        >
          ✕
        </button>
      </header>

      <div
        ref={actionScroll}
        className="flex shrink-0 items-center gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]"
      >
        <button
          type="button"
          className={PRIMARY_BTN}
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
            className={SECONDARY_BTN}
            onClick={() => useSelectionStore.getState().setTarget(null)}
            data-testid="sheet-clear-target"
          >
            {t('target.clear')}
          </button>
        )}
        <button
          type="button"
          onClick={() => openTelescope(id)}
          className={SECONDARY_BTN}
          data-testid="sheet-telescope"
        >
          {t('object.action.telescope')}
        </button>
        <button
          type="button"
          className={SECONDARY_BTN}
          onClick={() => openObservationForm({ objectId: id })}
          data-testid="sheet-log"
        >
          {t('object.action.log')}
        </button>
        <button
          type="button"
          aria-pressed={bookmarked}
          className={SECONDARY_BTN}
          onClick={() => {
            void toggleBookmark(id);
          }}
          data-testid="sheet-plan"
        >
          {bookmarked ? t('object.action.planned') : t('object.action.plan')}
        </button>
        <button
          type="button"
          data-testid="sheet-story"
          onClick={() => {
            close();
            openStory(id);
          }}
          className={SECONDARY_BTN}
        >
          {t('object.action.story')}
        </button>
      </div>

      <ScrollArea
        className="px-4 pb-[calc(env(safe-area-inset-bottom)+24px)]"
        data-testid="sheet-body"
        data-sheet-body=""
      >
        <button
          className="my-3 flex min-h-12 w-full items-center justify-between rounded-xl bg-surface-2 px-4 text-body-sm"
          onClick={() => {
            close();
            window.location.hash = '#/community?object=' + encodeURIComponent(id);
          }}
        >
          <span>{t('social.title')}</span>
          <span aria-hidden>↗</span>
        </button>
        {!d && <p className="py-3 text-body-sm text-muted">{t('common.loading')}</p>}
        {d && tg && (
          <>
            <Section title={t('object.section.now')}>
              <div className="flex items-center justify-between gap-3 py-1">
                <span
                  className="inline-flex items-baseline gap-2 text-display tabular-nums"
                  data-testid="sheet-altaz"
                >
                  {formatAlt(d.now.altDeg)}
                  <span className="text-body-lg font-semibold text-muted">
                    {formatAzimuth(d.now.azDeg, lang)}
                  </span>
                </span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-label font-semibold ${
                    d.now.status === 'visible'
                      ? 'bg-success-soft text-success'
                      : 'bg-surface-3 text-muted'
                  }`}
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
                <p className="text-caption text-muted">{t('object.circumpolar')}</p>
              )}
              {d.today.rtsStatus === 'neverRises' && (
                <p className="text-caption text-muted">{t('object.neverRises')}</p>
              )}
              <div className="grid grid-cols-3 gap-2 py-1 text-center">
                {(['rise', 'transit', 'set'] as const).map((k) => (
                  <div key={k} className={TILE}>
                    <div className="text-label text-muted">{t(`object.${k}`)}</div>
                    <div
                      className="text-body font-semibold tabular-nums"
                      data-testid={`sheet-${k}`}
                    >
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
                      <div key={k} className={TILE} data-testid={`sheet-verdict-${k}`}>
                        <div className="text-label text-muted">{t(`object.equipment.${k}`)}</div>
                        <div className={`text-body-sm font-semibold ${VERDICT_CLASS[v.verdict]}`}>
                          {t(`object.verdict.${v.verdict}`)}
                        </div>
                        <div className="text-label text-muted tabular-nums">
                          {t('object.limit', { mag: v.limitMag.toFixed(1) })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-caption text-muted">
                  {t('object.verdictNote', { bortle: d.bortle })}
                </p>
              </Section>
            )}

            <RecordsSection id={id} />

            {tg.kind === 'const' && cat && conAbbr && (
              <ConstellationExtras cat={cat} abbr={conAbbr} lang={lang} />
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}

/**
 * "내 기록"(task-04 §3.2): 이 대상의 기록 목록. logStore.version이 바뀌면(저장·삭제·되살리기) 다시 읽는다.
 * 행 탭 → 편집 폼. 비어 있으면 "기록하기", 항상 "시도했지만 못 봤어요" 보조 버튼.
 */
function RecordsSection({ id }: { id: ObjectId }) {
  const { t } = useTranslation();
  const version = useLogStore((s) => s.version);
  const [rows, setRows] = useState<{ id: ObjectId; list: Observation[] } | null>(null);
  useEffect(() => {
    let alive = true;
    void listObservations({ objectId: id }).then((list) => {
      if (alive) setRows({ id, list });
    });
    return () => {
      alive = false;
    };
  }, [id, version]);
  const list = rows?.id === id ? rows.list : null;
  const title =
    list && list.length > 0
      ? `${t('object.records.title')} · ${t('object.records.count', { n: list.length })}`
      : t('object.records.title');
  return (
    <Section title={title}>
      <div data-testid="sheet-records" data-count={list?.length ?? undefined}>
        {list === null && <p className="py-1 text-body-sm text-muted">{t('common.loading')}</p>}
        {list && list.length === 0 && (
          <p className="py-1 text-body-sm text-muted" data-testid="sheet-records-empty">
            {t('object.records.empty')}
          </p>
        )}
        {list && list.length > 0 && (
          <ul className="[&>li+li]:hairline-t">
            {list.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => openObservationForm({ objectId: id, observationId: o.id })}
                  className="flex min-h-12 w-full items-center gap-2 py-1.5 text-left transition-[background-color] duration-150 ease-standard active:bg-surface-3/60"
                  data-testid="sheet-record"
                  data-outcome={o.outcome}
                >
                  <span
                    className={`shrink-0 text-body-lg ${o.outcome === 'seen' ? 'text-marker' : 'text-muted'}`}
                    aria-label={o.outcome === 'seen' ? t('log.form.seen') : t('log.form.notSeen')}
                  >
                    ★
                  </span>
                  <span className="shrink-0 text-body-sm font-semibold tabular-nums">
                    {formatDateTime(new Date(o.observedAt))}
                  </span>
                  {o.rating !== undefined && (
                    <span className="shrink-0 text-label text-marker" aria-label={`${o.rating}/5`}>
                      {'★'.repeat(o.rating)}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                    {o.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="truncate rounded-pill bg-surface-3 px-2 py-0.5 text-label text-muted"
                      >
                        {t(tagLabelKey(tag), { defaultValue: tag })}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 text-caption text-muted">
                    {o.sketchBlobId && <span title={t('object.records.sketch')}>✎</span>}
                    {o.photoBlobIds && o.photoBlobIds.length > 0 && (
                      <span title={t('object.records.photo')}> 📷</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {list && list.length === 0 && (
            <button
              type="button"
              className={SECONDARY_BTN}
              onClick={() => openObservationForm({ objectId: id })}
              data-testid="sheet-records-add"
            >
              {t('object.records.add')}
            </button>
          )}
          <button
            type="button"
            className={SECONDARY_BTN}
            onClick={() => openObservationForm({ objectId: id, outcome: 'notSeen' })}
            data-testid="sheet-not-seen"
          >
            {t('object.records.notSeen')}
          </button>
        </div>
      </div>
    </Section>
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
      <div className="text-caption text-muted">{t('object.con.mainStars')}</div>
      <ul className="mb-2 flex flex-wrap gap-1.5 py-1">
        {stars.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => openChild(s.id)} className={CHIP_BTN}>
              {displayName(cat, s.id, lang)}{' '}
              <span className="text-muted tabular-nums">{s.mag.toFixed(1)}</span>
            </button>
          </li>
        ))}
      </ul>
      {dsos.length > 0 && (
        <>
          <div className="text-caption text-muted">{t('object.con.dsos')}</div>
          <ul className="flex flex-wrap gap-1.5 py-1">
            {dsos.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => openChild(d.id)} className={CHIP_BTN}>
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
