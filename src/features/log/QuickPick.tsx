import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import { displayName, secondaryName, type Catalog } from '@/catalog/catalog';
import { FAMOUS_IDS } from '@/catalog/famous';
import { kindOf, type ObjectId } from '@/catalog/objectId';
import { isSearchIndexReady, loadSearchIndex, search } from '@/catalog/searchIndex';
import type { Observation } from '@/db/types';
import { recentObjectIds } from '@/features/log/logUtils';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { useLogStore } from '@/state/logStore';
import { openObservationForm } from '@/state/logUiStore';
import { IconSearch } from '@/ui/icons';

const DEBOUNCE_MS = 200;
const SEARCH_LIMIT = 30;
const RECENT_LIMIT = 8;
const PLANNED_LIMIT = 12;
const FAMOUS_LIMIT = 16;

const GROUP_CLASS = 'squircle overflow-hidden rounded-lg bg-surface [&>li+li>button]:hairline-t';
const SECTION_HEADER_CLASS = 'px-1 pb-2 pt-5 text-body-sm font-semibold text-muted';

const KIND_GLYPH: Record<ReturnType<typeof kindOf>, string> = {
  sun: '☀',
  moon: '☾',
  planet: '●',
  star: '✦',
  dso: '◌',
  const: '⋰',
};

interface QuickPickProps {
  rows: readonly Observation[];
  cat: Catalog | null;
  lang: Lang;
  onClose(): void;
}

/**
 * 기록 탭 "+"(task-04 §3.4): 대상을 고르면 바로 기록 폼이 열린다.
 * 빈 검색어일 때는 최근 기록 대상 → ☆ 예정 → 유명 천체 제안. 검색은 검색 탭과 같은 인덱스를 쓴다.
 */
export function QuickPick({ rows, cat, lang, onClose }: QuickPickProps) {
  const { t } = useTranslation();
  const bookmarkedSet = useLogStore((s) => s.bookmarkedSet);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [ready, setReady] = useState(isSearchIndexReady());

  useEffect(() => {
    let alive = true;
    void loadSearchIndex()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {
        /* 오프라인·실패: 제안 목록만으로 고른다 */
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => window.clearTimeout(h);
  }, [query]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = debounced.trim();
  const hits = useMemo(
    () => (q && ready ? search(q, { limit: SEARCH_LIMIT }).map((h) => h.id) : []),
    [q, ready],
  );
  const recent = useMemo(() => recentObjectIds(rows, RECENT_LIMIT), [rows]);
  const planned = useMemo(
    () => [...bookmarkedSet].filter((id) => !recent.includes(id)).slice(0, PLANNED_LIMIT),
    [bookmarkedSet, recent],
  );
  const famous = useMemo(
    () =>
      FAMOUS_IDS.filter((id) => !recent.includes(id) && !bookmarkedSet.has(id)).slice(
        0,
        FAMOUS_LIMIT,
      ),
    [recent, bookmarkedSet],
  );

  const pick = (id: ObjectId) => {
    onClose();
    openObservationForm({ objectId: id });
  };

  const renderList = (ids: readonly ObjectId[], testId: string) => (
    <ul className={GROUP_CLASS} data-testid={testId}>
      {ids.map((id) => {
        const kind = kindOf(id);
        const name = cat ? displayName(cat, id, lang) : id;
        const secondary = cat ? secondaryName(cat, id, lang) : undefined;
        const tone = kind === 'planet' || kind === 'sun' ? 'text-planet' : 'text-fg';
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => pick(id)}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 active:bg-surface-2"
              data-testid="quickpick-item"
              data-object-id={id}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-3 text-body ${tone}`}
                aria-hidden
              >
                {KIND_GLYPH[kind]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">{name}</span>
                <span className="block truncate text-caption text-muted">
                  {[t(`sky.kind.${kind}`), secondary].filter(Boolean).join(' · ')}
                </span>
              </span>
              {bookmarkedSet.has(id) && (
                <span
                  className="shrink-0 text-body text-marker"
                  aria-label={t('log.quickpick.planned')}
                >
                  ★
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const body = (
    <div className="fixed inset-0 z-30 bg-bg text-fg">
      <ScreenFrame title={t('log.quickpick.title')} onBack={onClose} testId="quickpick">
        <div className="px-4 pt-2">
          <div className="relative">
            <IconSearch
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('log.quickpick.placeholder')}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-label={t('common.search')}
              data-testid="quickpick-input"
              className="min-h-12 w-full appearance-none rounded-pill bg-surface-2 pl-11 pr-4 text-body text-fg outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-muted focus:bg-surface-3 focus-visible:shadow-[0_0_0_2px_var(--accent-glow)] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>

          {q ? (
            <>
              {!ready && <p className="px-1 py-3 text-body-sm text-muted">{t('search.loading')}</p>}
              {ready && hits.length === 0 && (
                <p className="squircle mt-3 rounded-lg bg-surface px-4 py-6 text-center text-body-sm text-muted">
                  {t('log.quickpick.noResults')}
                </p>
              )}
              {hits.length > 0 && (
                <div className="mt-3">{renderList(hits, 'quickpick-results')}</div>
              )}
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <>
                  <h2 className={SECTION_HEADER_CLASS}>{t('log.quickpick.recent')}</h2>
                  {renderList(recent, 'quickpick-recent')}
                </>
              )}
              {planned.length > 0 && (
                <>
                  <h2 className={SECTION_HEADER_CLASS}>{t('log.quickpick.planned')}</h2>
                  {renderList(planned, 'quickpick-planned')}
                </>
              )}
              <h2 className={SECTION_HEADER_CLASS}>{t('log.quickpick.famous')}</h2>
              {renderList(famous, 'quickpick-famous')}
            </>
          )}
        </div>
      </ScreenFrame>
    </div>
  );
  return createPortal(body, document.body);
}
