import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { bodyKeyFromObjectId, bodyState } from '@/astro/bodies';
import { eqjToSceneMatrix, applyMat3 } from '@/astro/frames';
import { sceneToAltAz } from '@/astro/coords';
import { displayName, loadCatalog, secondaryName, type Catalog } from '@/catalog/catalog';
import { SUGGEST_ORDER } from '@/catalog/famous';
import type { ObjectId } from '@/catalog/objectId';
import { fovForTarget, resolveTarget } from '@/catalog/objectTarget';
import {
  isSearchIndexReady,
  lastSearchMs,
  loadSearchIndex,
  search,
  searchIndexEntries,
  type SearchEntry,
  type SearchHit,
  type SearchKind,
} from '@/catalog/searchIndex';
import { openObject } from '@/features/object/objectApi';
import { flyToObject } from '@/features/sky/skyApi';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useSearchStore, type SearchCategory } from '@/state/searchStore';
import { useSettingsStore } from '@/state/settingsStore';

const DEBOUNCE_MS = 300;
const CATEGORIES: SearchCategory[] = [
  'all',
  'bodies',
  'star',
  'const',
  'cluster',
  'nebula',
  'galaxy',
  'messier',
];

/** 지금 상태 계산기: 회전행렬 1개 + 카탈로그 벡터(별·DSO), 행성은 bodyState */
interface NowState {
  altOf(id: ObjectId): number | undefined;
  sunAltDeg: number;
}

function makeNowState(
  cat: Catalog,
  site: { lat: number; lon: number; elevation: number },
  date: Date,
): NowState {
  const m = eqjToSceneMatrix(date, site);
  const bodies = new Map<string, number>();
  for (const key of [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
  ] as const)
    bodies.set(key, bodyState(key, date, site).altDeg);
  const altOfVec = (arr: Float32Array, i: number) =>
    sceneToAltAz(applyMat3(m, [arr[i * 3]!, arr[i * 3 + 1]!, arr[i * 3 + 2]!])).altDeg;
  const starIndex = new Map(cat.stars.map((s, i) => [s.id, i]));
  const dsoIndex = new Map(cat.dso.map((d, i) => [d.id, i]));
  return {
    sunAltDeg: bodies.get('sun') ?? 0,
    altOf(id) {
      const bk = bodyKeyFromObjectId(id);
      if (bk) return bodies.get(bk);
      const si = starIndex.get(id);
      if (si !== undefined) return altOfVec(cat.starVectors, si);
      const di = dsoIndex.get(id);
      if (di !== undefined) return altOfVec(cat.dsoVectors, di);
      if (id.startsWith('const:')) {
        const c = cat.constellations[id.slice(6)];
        if (!c) return undefined;
        const rad = Math.PI / 180;
        const [ra, dec] = c.label;
        return sceneToAltAz(
          applyMat3(m, [
            Math.cos(dec * rad) * Math.cos(ra * rad),
            Math.cos(dec * rad) * Math.sin(ra * rad),
            Math.sin(dec * rad),
          ]),
        ).altDeg;
      }
      return undefined;
    },
  };
}

function categoryFilter(
  cat: Catalog,
  category: SearchCategory,
): ((e: SearchEntry) => boolean) | undefined {
  switch (category) {
    case 'all':
      return undefined;
    case 'bodies':
      return (e) => e.kind === 'planet' || e.kind === 'moon' || e.kind === 'sun';
    case 'star':
      return (e) => e.kind === 'star';
    case 'const':
      return (e) => e.kind === 'const';
    case 'cluster':
      return (e) => {
        const c = cat.dsoById.get(e.id)?.category;
        return c === 'openCluster' || c === 'globularCluster';
      };
    case 'nebula':
      return (e) => {
        const c = cat.dsoById.get(e.id)?.category;
        return c === 'nebula' || c === 'planetaryNebula' || c === 'supernovaRemnant';
      };
    case 'galaxy':
      return (e) => cat.dsoById.get(e.id)?.category === 'galaxy';
    case 'messier':
      return (e) => cat.dsoById.get(e.id)?.messier !== undefined;
  }
}

const KIND_GLYPH: Record<SearchKind, string> = {
  sun: '☀',
  moon: '☾',
  planet: '●',
  star: '✦',
  dso: '◌',
  const: '⋰',
};

function KindIcon({ kind }: { kind: SearchKind }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-base"
      aria-hidden
      style={{ color: kind === 'planet' || kind === 'sun' ? 'var(--planet)' : 'var(--fg)' }}
    >
      {KIND_GLYPH[kind]}
    </span>
  );
}

interface RowProps {
  id: ObjectId;
  kind: SearchKind;
  cat: Catalog;
  lang: 'ko' | 'en';
  alt: number | undefined;
  daytime: boolean;
  mag?: number;
  con?: string;
  onOpen(id: ObjectId): void;
}

function ResultRow({ id, kind, cat, lang, alt, daytime, mag, con, onOpen }: RowProps) {
  const { t } = useTranslation();
  const name = displayName(cat, id, lang);
  const secondary = secondaryName(cat, id, lang);
  const conName = con
    ? lang === 'ko'
      ? cat.constellations[con]?.ko
      : cat.constellations[con]?.en
    : undefined;
  const state =
    alt === undefined
      ? ''
      : alt <= 0
        ? t('search.state.below')
        : daytime && kind !== 'sun' && kind !== 'moon' && kind !== 'planet'
          ? t('search.state.day')
          : t('search.state.above', { alt: alt.toFixed(0) });
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(id)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
        data-testid="search-result"
        data-object-id={id}
      >
        <KindIcon kind={kind} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px]" data-testid="search-result-name">
            {name}
          </span>
          <span className="block truncate text-xs text-muted">
            {[t(`sky.kind.${kind}`), secondary, conName].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="shrink-0 text-right text-xs text-muted">
          {mag !== undefined && <span className="block font-mono">{mag.toFixed(1)}</span>}
          <span
            className="block"
            style={{
              color: alt !== undefined && alt > 0 && !daytime ? 'var(--success)' : undefined,
            }}
            data-testid="search-result-state"
          >
            {state}
          </span>
        </span>
      </button>
    </li>
  );
}

/** 검색 탭(task-03 §3.1): 디바운스 300ms, 결과 ≤ 50, 카테고리 칩, 최근 검색, 빈 검색어 제안. */
export function SearchScreen() {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const site = useLocationStore((s) => s.site);
  const recent = useSearchStore((s) => s.recent);
  const visibleOnly = useSearchStore((s) => s.visibleOnly);
  const category = useSearchStore((s) => s.category);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [ready, setReady] = useState(isSearchIndexReady());
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tick, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void loadCatalog().then((c) => {
      if (alive) setCat(c);
    });
    void loadSearchIndex()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {
        /* 오프라인·실패: 인덱스 없이 화면은 뜬다 */
      });
    const timer = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => window.clearTimeout(h);
  }, [query]);

  const nowState = useMemo(() => {
    void tick;
    return cat ? makeNowState(cat, site, useClockStore.getState().now()) : null;
  }, [cat, site, tick]);
  const daytime = (nowState?.sunAltDeg ?? -90) > -6;

  const { hits, ms } = useMemo(() => {
    if (!cat || !ready || !debounced.trim()) return { hits: [] as SearchHit[], ms: 0 };
    const filter = categoryFilter(cat, category);
    const altOf = nowState?.altOf;
    const results = search(debounced, {
      limit: 50,
      filter:
        visibleOnly && altOf
          ? (e) => (filter ? filter(e) : true) && (altOf(e.id) ?? -1) > 0
          : filter,
      altOf,
    });
    return { hits: results, ms: lastSearchMs };
  }, [cat, ready, debounced, category, visibleOnly, nowState]);

  const suggestions = useMemo(() => {
    if (!cat || !nowState) return [] as ObjectId[];
    const entries = new Set(searchIndexEntries().map((e) => e.id));
    const filter = categoryFilter(cat, category);
    return SUGGEST_ORDER.filter((id) => {
      const alt = nowState.altOf(id);
      if (alt === undefined || alt < 10) return false;
      if (entries.size && !entries.has(id)) return false;
      if (filter && !filter({ id, kind: kindOf(id), n: [] })) return false;
      if (daytime) return kindOf(id) === 'moon' || kindOf(id) === 'planet' || kindOf(id) === 'sun';
      return kindOf(id) !== 'sun';
    }).slice(0, 12);
  }, [cat, nowState, daytime, category]);

  const open = (id: ObjectId) => {
    useSearchStore.getState().addRecent(id);
    if (cat) {
      const target = resolveTarget(cat, id, useClockStore.getState().now(), site);
      flyToObject(id, target ? fovForTarget(target) : undefined);
    } else flyToObject(id);
    navigate('sky');
    openObject(id, 'half');
  };

  const showEmpty = !debounced.trim();

  return (
    <section className="flex h-full flex-col" data-testid="search-screen">
      <div className="shrink-0 px-4 pt-3">
        <h1 className="sr-only">{t('search.title')}</h1>
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label={t('search.title')}
            data-testid="search-input"
            className="min-h-11 w-full rounded-full border border-border bg-surface pl-4 pr-10 text-fg placeholder:text-muted"
          />
          {query && (
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted"
            >
              ✕
            </button>
          )}
        </div>
        <div
          className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-2"
          role="tablist"
          aria-label={t('search.title')}
        >
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => useSearchStore.getState().setCategory(c)}
                className="min-h-8 shrink-0 rounded-full border px-3 text-xs"
                style={{
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--accent-fg)' : 'var(--fg)',
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                }}
                data-testid={`search-cat-${c}`}
              >
                {t(`search.category.${c}`)}
              </button>
            );
          })}
          <button
            type="button"
            role="switch"
            aria-checked={visibleOnly}
            onClick={() => useSearchStore.getState().setVisibleOnly(!visibleOnly)}
            className="min-h-8 shrink-0 rounded-full border px-3 text-xs"
            style={{
              background: visibleOnly ? 'var(--success)' : 'transparent',
              color: visibleOnly ? 'var(--accent-fg)' : 'var(--fg)',
              borderColor: visibleOnly ? 'var(--success)' : 'var(--border)',
            }}
            data-testid="search-visible-only"
          >
            {t('search.visibleOnly')}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" data-testid="search-results">
        {!ready && <p className="px-4 py-3 text-sm text-muted">{t('search.loading')}</p>}
        {cat && showEmpty && recent.length > 0 && (
          <>
            <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted">
              <span>{t('search.recent')}</span>
              <button
                type="button"
                onClick={() => useSearchStore.getState().clearRecent()}
                className="min-h-8 px-2"
              >
                {t('search.clearRecent')}
              </button>
            </div>
            <ul data-testid="search-recent">
              {recent.map((id) => (
                <ResultRow
                  key={id}
                  id={id}
                  kind={kindOf(id)}
                  cat={cat}
                  lang={lang}
                  alt={nowState?.altOf(id)}
                  daytime={daytime}
                  mag={magOf(cat, id)}
                  con={conOf(cat, id)}
                  onOpen={open}
                />
              ))}
            </ul>
          </>
        )}
        {cat && showEmpty && (
          <>
            <div className="px-4 pt-3 text-xs text-muted">
              {daytime ? t('search.suggestDay') : t('search.suggest')}
            </div>
            <ul data-testid="search-suggest">
              {suggestions.map((id) => (
                <ResultRow
                  key={id}
                  id={id}
                  kind={kindOf(id)}
                  cat={cat}
                  lang={lang}
                  alt={nowState?.altOf(id)}
                  daytime={daytime}
                  mag={magOf(cat, id)}
                  con={conOf(cat, id)}
                  onOpen={open}
                />
              ))}
            </ul>
          </>
        )}
        {cat && !showEmpty && (
          <>
            {hits.length === 0 && ready && (
              <p className="px-4 py-3 text-sm text-muted">{t('search.noResults')}</p>
            )}
            <ul>
              {hits.map((h) => (
                <ResultRow
                  key={h.id}
                  id={h.id}
                  kind={h.kind}
                  cat={cat}
                  lang={lang}
                  alt={nowState?.altOf(h.id)}
                  daytime={daytime}
                  mag={h.mag ?? magOf(cat, h.id)}
                  con={h.con ?? conOf(cat, h.id)}
                  onOpen={open}
                />
              ))}
            </ul>
            {hits.length > 0 && (
              <p
                className="px-4 py-2 text-right font-mono text-[11px] text-muted"
                data-testid="search-count"
              >
                {t('search.resultCount', { n: hits.length, ms: ms.toFixed(1) })}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function kindOf(id: ObjectId): SearchKind {
  if (id === 'sun' || id === 'moon') return id;
  if (id.startsWith('planet:')) return 'planet';
  if (id.startsWith('dso:')) return 'dso';
  if (id.startsWith('const:')) return 'const';
  return 'star';
}

function magOf(cat: Catalog, id: ObjectId): number | undefined {
  return cat.starById.get(id)?.mag ?? cat.dsoById.get(id)?.mag;
}

function conOf(cat: Catalog, id: ObjectId): string | undefined {
  return cat.starById.get(id)?.con ?? cat.dsoById.get(id)?.con;
}
