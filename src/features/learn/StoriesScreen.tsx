import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadContentIndex } from '@/content/loader';
import type { ContentIndex } from '@/content/schema';
import type { LearningState } from '@/learn/runtime';
import { TodayCard } from '@/features/content/TodayCard';
import { useObservingNight } from '@/features/tonight/useNight';
import { useSettingsStore } from '@/state/settingsStore';
import { useClockStore } from '@/state/clockStore';
import { openStory } from '@/state/contentUiStore';
import { normalizeAlias } from '@/catalog/normalize';

export function StoriesScreen({ value }: { value: LearningState }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const [index, setIndex] = useState<ContentIndex | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const night = useObservingNight();
  const [now, setNow] = useState(() => useClockStore.getState().now());
  useEffect(() => {
    const refresh = () => setNow(useClockStore.getState().now());
    const timer = window.setInterval(refresh, 60_000);
    const unsubscribe = useClockStore.subscribe(refresh);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    let alive = true;
    void loadContentIndex().then((data) => {
      if (alive) {
        setIndex(data);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [retry]);
  const needle = normalizeAlias(query);
  const entries =
    index?.entries.filter(
      (e) =>
        (filter === 'all' ||
          (filter === 'unread' ? !value.snap.readSet.has(e.id) : e.kind === filter)) &&
        (!needle || normalizeAlias(e.title.ko + ' ' + e.title.en + ' ' + e.id).includes(needle)),
    ) ?? [];
  return (
    <div className="space-y-5" data-testid="stories-screen">
      <TodayCard night={night} now={now} />
      <div className="space-y-3">
        <h2 className="text-title">{t('journey.library')}</h2>
        <label className="block">
          <span className="sr-only">{t('journey.searchStories')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('journey.searchStories')}
            className="min-h-12 w-full rounded-2xl border border-hairline bg-surface px-4"
            data-testid="story-search"
          />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 text-body-sm text-muted">
          <span>{t('journey.storyCount', { n: entries.length })}</span>
          <select
            className="min-h-11 max-w-[65%] rounded-pill bg-surface-2 px-4 text-fg"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={t('journey.storyFilter')}
          >
            {['all', 'unread', 'star', 'const', 'dso', 'planet', 'moon', 'sun'].map((f) => (
              <option key={f} value={f}>
                {t('journey.filters.' + f)}
              </option>
            ))}
          </select>
        </label>
        {!index ? (
          <div role="status" className="p-4 text-muted">
            {t(loaded ? 'study.loadError' : 'common.loading')}
            {loaded && (
              <button className="ml-3 min-h-11 text-accent" onClick={() => setRetry((n) => n + 1)}>
                {t('study.retry')}
              </button>
            )}
          </div>
        ) : !entries.length ? (
          <p role="status" className="p-5 text-muted">
            {t('journey.noStories')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {entries.map((e) => (
              <button
                key={e.id}
                onClick={() => openStory(e.id)}
                data-testid={'story-' + e.id}
                className="flex min-h-24 items-center gap-4 rounded-2xl border border-hairline bg-surface p-4 text-left"
              >
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-title text-accent"
                >
                  {value.snap.readSet.has(e.id) ? '✓' : e.kind === 'moon' ? '☾' : '✦'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold">{e.title[lang]}</span>
                  <span className="mt-1 line-clamp-2 block text-caption leading-5 text-muted">
                    {lang === 'ko' ? e.oneLiner : e.title.ko}
                  </span>
                  {value.snap.readSet.has(e.id) && (
                    <span className="mt-1 block text-caption text-accent">{t('journey.read')}</span>
                  )}
                </span>
                <span aria-hidden className="text-muted">
                  ›
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
