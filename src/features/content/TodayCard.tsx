import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { bodyState } from '@/astro/bodies';
import { eqjToAltAzSlow } from '@/astro/frames';
import type { ObservingNight } from '@/astro/night';
import { displayName, loadCatalog, type Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { resolveTarget } from '@/catalog/objectTarget';
import { loadContentIndex } from '@/content/loader';
import { useReadStore } from '@/content/readProgress';
import type { ContentIndexEntry } from '@/content/schema';
import { maxAltitudeInWindow, pickTodayObject, type TodayPick } from '@/content/today';
import { openObject } from '@/features/object/objectApi';
import { flyToObject, getSkyScene } from '@/features/sky/skyApi';
import { openStory } from '@/state/contentUiStore';
import { useLocationStore } from '@/state/locationStore';
import { useSettingsStore } from '@/state/settingsStore';
import { getProgress, setProgress } from '@/db/repos/progress';
import { Card } from '@/ui/Card';
import { formatAlt, formatAzimuth } from '@/ui/format';

const BTN_PRIMARY =
  'inline-flex min-h-11 items-center justify-center rounded-pill bg-accent px-5 text-body font-semibold text-accent-fg active:scale-[0.97]';
const BTN_SECONDARY =
  'inline-flex min-h-11 items-center justify-center rounded-pill bg-surface-3 px-4 text-body-sm font-medium text-fg active:scale-[0.97]';

interface TodayCardProps {
  night: ObservingNight | null;
  now: Date;
}

/**
 * "오늘의 천체"(task-06 §3.6): 오늘 밤 보이는 콘텐츠 보유 대상 하나. 밤이 같으면 같은 카드(D-024).
 * 오늘 밤 탭 상단(하늘 상태 카드 위)과 배우기 탭에 놓인다.
 */
export function TodayCard({ night, now }: TodayCardProps) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const site = useLocationStore((s) => s.site);
  const readSet = useReadStore((s) => s.readSet);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [entries, setEntries] = useState<ContentIndexEntry[] | null>(null);
  const [pick, setPick] = useState<{ key: string; value: TodayPick | null } | null>(null);

  useEffect(() => {
    let alive = true;
    void loadCatalog().then((c) => {
      if (alive) setCat(c);
    });
    void loadContentIndex().then((idx) => {
      if (alive) setEntries(idx?.entries ?? []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const window_ = night?.darkSpan ?? null;
  const key = useMemo(
    () =>
      night && window_ && entries && cat
        ? `${night.key}|${site.lat.toFixed(2)}|${site.lon.toFixed(2)}`
        : '',
    [night, window_, entries, cat, site.lat, site.lon],
  );
  useEffect(() => {
    if (!key || !night || !window_ || !entries || !cat) return;
    let alive = true;
    const h = window.setTimeout(() => {
      void (async () => {
        if (!alive) return;
        const cache = new Map<ObjectId, number | null>();
        const altMaxOf = (id: ObjectId) => {
          if (!cache.has(id))
            cache.set(
              id,
              maxAltitudeInWindow(cat, id, site, window_, getSkyScene()?.objectJ2000(id) ?? null),
            );
          return cache.get(id) ?? null;
        };
        const saved = await getProgress<TodayPick>('content.today:' + key);
        const value =
          saved && entries.some((e) => e.id === saved.id) && (altMaxOf(saved.id) ?? -90) >= 25
            ? saved
            : pickTodayObject({ entries, readSet, nightKey: night.key, altMaxOf });
        if (!saved && value) await setProgress('content.today:' + key, value);
        if (alive) setPick({ key, value });
      })().catch(() => {
        if (alive) setPick({ key, value: null });
      });
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(h);
    };
  }, [key, night, window_, entries, cat, site, readSet]);

  if (!pick || pick.key !== key || !pick.value || !cat || !entries) return null;
  const id = pick.value.id;
  const meta = entries.find((e) => e.id === id);
  if (!meta) return null;
  const target = resolveTarget(cat, id, now, site, getSkyScene()?.objectJ2000(id) ?? null);
  const nowPos = target
    ? target.bodyKey
      ? bodyState(target.bodyKey, now, site)
      : eqjToAltAzSlow(now, site, target.raJ2000Deg, target.decJ2000Deg, 'normal')
    : null;
  const showInSky = () => {
    flyToObject(id);
    navigate('sky');
    openObject(id, 'half');
  };
  return (
    <Card
      title={t('content.today')}
      aside={pick.value.unread ? t('content.unread') : undefined}
      testId="today-card"
    >
      <div className="flex flex-col gap-1" data-object-id={id}>
        <p className="text-title" data-testid="today-name">
          {displayName(cat, id, lang)}
        </p>
        <p className="text-body text-fg/90">{meta.oneLiner}</p>
        <p className="text-caption text-muted tabular-nums" data-testid="today-now">
          {nowPos && nowPos.altDeg > 0
            ? t('content.nowAt', {
                dir: formatAzimuth(nowPos.azDeg, lang),
                alt: formatAlt(nowPos.altDeg, 0),
              })
            : t('content.laterTonight', { alt: formatAlt(pick.value.altMaxDeg, 0) })}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={BTN_PRIMARY}
          onClick={() => openStory(id)}
          data-testid="today-read"
        >
          {t('content.read')}
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={showInSky} data-testid="today-sky">
          {t('object.action.showInSky')}
        </button>
      </div>
    </Card>
  );
}
