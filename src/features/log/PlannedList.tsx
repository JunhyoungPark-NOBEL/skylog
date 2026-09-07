import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import { navigate } from '@/app/router';
import { computeObjectDetails, type ObjectDetails } from '@/astro/objectDetails';
import { displayName, secondaryName, type Catalog } from '@/catalog/catalog';
import { kindOf, type ObjectId } from '@/catalog/objectId';
import { fovForTarget, resolveTarget, type ObjectTarget } from '@/catalog/objectTarget';
import { listBookmarks, toggleBookmark } from '@/db/repos/bookmarks';
import { useTick } from '@/features/log/useObservations';
import { openObject } from '@/features/object/objectApi';
import { useSiteRecord } from '@/features/settings/useSiteRecord';
import { flyToObject, getSkyScene } from '@/features/sky/skyApi';
import { getObservingNight } from '@/features/tonight/useNight';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useLogStore } from '@/state/logStore';
import { openObservationForm, showToast } from '@/state/logUiStore';
import { formatAlt, formatAzimuth, formatTime } from '@/ui/format';
import { PillButton } from '@/ui/PillButton';

const REFRESH_MS = 60_000;

interface PlannedListProps {
  cat: Catalog | null;
  lang: Lang;
}

interface PlannedState {
  target: ObjectTarget;
  details: ObjectDetails;
}

/**
 * 관측 예정(☆) 목록(task-04 §3.4): 북마크 순서(최근 추가 먼저) + 지금 고도·방위 + 오늘 최적 시각.
 * 60초마다 행 수만큼 `computeObjectDetails`를 다시 계산한다(수십 행까지는 충분히 가볍다).
 */
export function PlannedList({ cat, lang }: PlannedListProps) {
  const { t } = useTranslation();
  const bookmarkedSet = useLogStore((s) => s.bookmarkedSet);
  const version = useLogStore((s) => s.version);
  const site = useLocationStore((s) => s.site);
  const { bortle } = useSiteRecord();
  const tick = useTick(REFRESH_MS);
  const [ids, setIds] = useState<ObjectId[]>([]);

  useEffect(() => {
    let alive = true;
    void listBookmarks().then((list) => {
      if (alive) setIds(list.map((b) => b.objectId));
    });
    return () => {
      alive = false;
    };
  }, [version]);

  // 목록 재읽기 전에도 ☆ 해제가 바로 반영되도록 스토어 집합으로 한 번 더 거른다
  const shown = ids.filter((id) => bookmarkedSet.has(id));
  const shownKey = shown.join(',');

  const { states, now } = useMemo(() => {
    void tick;
    const nowDate = useClockStore.getState().now();
    const map = new Map<ObjectId, PlannedState>();
    if (!cat) return { states: map, now: nowDate };
    const night = getObservingNight(site, nowDate);
    for (const id of shownKey ? (shownKey.split(',') as ObjectId[]) : []) {
      const target = resolveTarget(cat, id, nowDate, site, getSkyScene()?.objectJ2000(id) ?? null);
      if (!target) continue;
      map.set(id, {
        target,
        details: computeObjectDetails(target, nowDate, site, night, { bortle }),
      });
    }
    return { states: map, now: nowDate };
  }, [cat, shownKey, site, bortle, tick]);

  const showInSky = (id: ObjectId) => {
    const st = states.get(id);
    flyToObject(id, st ? fovForTarget(st.target) : undefined);
    navigate('sky');
    openObject(id, 'half');
  };
  const unplan = (id: ObjectId) => {
    void toggleBookmark(id).then(() => {
      showToast(t('log.tab.unplanned'), {
        label: t('log.tab.undo'),
        onClick: () => void toggleBookmark(id),
      });
    });
  };

  if (shown.length === 0)
    return (
      <div
        className="squircle rounded-xl bg-surface p-5 text-center shadow-card"
        data-testid="planned-empty"
      >
        <p className="text-body">{t('log.planned.empty')}</p>
        <p className="mt-1 text-body-sm text-muted">{t('log.planned.emptyHint')}</p>
      </div>
    );

  return (
    <ul
      className="squircle overflow-hidden rounded-lg bg-surface [&>li+li]:hairline-t"
      data-testid="planned-list"
    >
      {shown.map((id) => {
        const st = states.get(id);
        const name = cat ? displayName(cat, id, lang) : id;
        const secondary = cat ? secondaryName(cat, id, lang) : undefined;
        const d = st?.details;
        let nowText = '';
        if (d) {
          nowText =
            d.now.status === 'visible'
              ? t('log.planned.now', {
                  alt: formatAlt(d.now.altDeg, 0),
                  az: formatAzimuth(d.now.azDeg, lang),
                })
              : `${t(`object.status.${d.now.status}`)} · ${formatAlt(d.now.altDeg, 0)}`;
        }
        let bestText = '';
        if (d) {
          const w = d.today.bestWindow;
          if (!w) bestText = t('log.planned.bestNone');
          else if (w.to.getTime() < now.getTime()) bestText = t('log.planned.bestPassed');
          else bestText = t('log.planned.best', { from: formatTime(w.from), to: formatTime(w.to) });
        }
        return (
          <li key={id} className="px-4 py-3" data-testid="planned-item" data-object-id={id}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed
                aria-label={t('log.planned.unplan')}
                onClick={() => unplan(id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-title text-marker transition-[background-color,transform] duration-150 ease-standard active:scale-95 active:bg-surface-2"
                data-testid="planned-toggle"
              >
                ★
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body" data-testid="planned-name">
                  {name}
                  {secondary && <span className="ml-1.5 text-caption text-muted">{secondary}</span>}
                </p>
                <p className="truncate text-caption text-muted" data-testid="planned-now">
                  {[t(`sky.kind.${kindOf(id)}`), nowText || t('common.loading')].join(' · ')}
                </p>
                {bestText && (
                  <p
                    className="truncate text-caption text-muted tabular-nums"
                    data-testid="planned-best"
                  >
                    {bestText}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 pl-[52px]">
              <PillButton size="sm" onClick={() => showInSky(id)} testId="planned-show-in-sky">
                {t('object.action.showInSky')}
              </PillButton>
              <PillButton
                size="sm"
                variant="primary"
                onClick={() => openObservationForm({ objectId: id })}
                testId="planned-log"
              >
                {t('log.planned.log')}
              </PillButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
