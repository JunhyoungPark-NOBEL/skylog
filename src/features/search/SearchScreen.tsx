import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { markerKindOf, useLogStore, type MarkerKind } from '@/state/logStore';
import { useSearchStore, type SearchCategory } from '@/state/searchStore';
import { useSettingsStore } from '@/state/settingsStore';
import { IconSearch } from '@/ui/icons';

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

/* ---- 디자인 레시피(D-021) — 프리미티브 대신 인라인 클래스 ---- */
/** Chip / 필터 pill(단일 선택: aria-selected 강조 채움) */
const CHIP_CLASS =
  'inline-flex min-h-9 shrink-0 items-center rounded-pill bg-surface-2 px-3.5 text-body-sm font-medium text-fg transition-[background-color,color,transform] duration-150 ease-standard active:scale-95';
const CHIP_SELECTED = 'aria-selected:bg-accent aria-selected:text-accent-fg';
/** 다중 선택 스위치: 톤(success) 선택 */
const CHIP_CHECKED =
  'gap-1 aria-checked:bg-success-soft aria-checked:text-success aria-checked:shadow-[inset_0_0_0_1px_var(--success)]';
/** 인셋 그룹(리스트) — 행 사이는 hairline(box-shadow, 레이아웃 영향 없음) */
const GROUP_CLASS =
  'mx-4 overflow-hidden rounded-lg bg-surface squircle [&>li+li>button]:hairline-t';
/** 섹션 헤더 — 문장 케이스 */
const SECTION_HEADER_CLASS = 'px-5 pb-2 pt-6 text-body-sm font-semibold text-muted';

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

/** 행 앞 아이콘: 캡슐 surface-3 글리프(행성·태양은 planet 톤) */
function KindIcon({ kind }: { kind: SearchKind }) {
  const tone = kind === 'planet' || kind === 'sun' ? 'text-planet' : 'text-fg';
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-3 text-body ${tone}`}
      aria-hidden
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
  /** T4 기록 상태: 본 것(금색 ★) > 시도(회색 ★) > 예정(☆). 없으면 표시 안 함 */
  mark?: MarkerKind | null;
  onOpen(id: ObjectId): void;
}

/** 기록 상태 글리프 — 야간 모드에선 색 구분이 사라지므로 ★/☆ 모양 + 라벨을 함께 */
const MARK_GLYPH: Record<MarkerKind, string> = {
  observed: '★',
  attempted: '★',
  bookmarked: '☆',
};
const MARK_TONE: Record<MarkerKind, string> = {
  observed: 'text-marker',
  attempted: 'text-muted',
  bookmarked: 'text-fg',
};

function ResultRow({ id, kind, cat, lang, alt, daytime, mag, con, mark, onOpen }: RowProps) {
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
  /* 떠 있음(밤·지평선 위): 색 + ▲ 글리프를 함께 — 야간 모드에서는 색 구분이 사라진다 */
  const up = alt !== undefined && alt > 0 && !daytime;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(id)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 active:bg-surface-2"
        data-testid="search-result"
        data-object-id={id}
      >
        <KindIcon kind={kind} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body" data-testid="search-result-name">
            {name}
          </span>
          <span className="block truncate text-caption text-muted">
            {[t(`sky.kind.${kind}`), secondary, conName].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="shrink-0 text-right text-caption text-muted tabular-nums">
          {mag !== undefined && <span className="block">{mag.toFixed(1)}</span>}
          <span
            className={`block ${up ? 'font-medium text-success' : 'text-muted'}`}
            data-testid="search-result-state"
          >
            {up && <span aria-hidden>▲ </span>}
            {state}
          </span>
        </span>
        {mark && (
          <span
            role="img"
            aria-label={t(`search.mark.${mark}`)}
            className={`w-5 shrink-0 text-center text-body ${MARK_TONE[mark]}`}
            data-testid="search-mark"
            data-kind={mark}
          >
            {MARK_GLYPH[mark]}
          </span>
        )}
      </button>
    </li>
  );
}

/** 섹션 헤더(문장 케이스) — 오른쪽에 3차 버튼을 둘 수 있다 */
function SectionHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  if (!action) return <div className={SECTION_HEADER_CLASS}>{children}</div>;
  /* 액션 버튼(min-h-8)은 -my-2로 행 높이에 영향을 주지 않게 — 헤더 간격이 레시피와 같게 유지된다 */
  return (
    <div className={`${SECTION_HEADER_CLASS} flex items-center justify-between pr-3`}>
      <span>{children}</span>
      {action}
    </div>
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
  // T4 기록 상태(★/☆) — 훅으로 구독해 저장·북마크 직후 행이 바로 바뀐다
  const observedSet = useLogStore((s) => s.observedSet);
  const attemptedSet = useLogStore((s) => s.attemptedSet);
  const bookmarkedSet = useLogStore((s) => s.bookmarkedSet);
  const markOf = (id: ObjectId) => markerKindOf({ observedSet, attemptedSet, bookmarkedSet }, id);
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
    /* 상·하 여백은 App(pt-status / pb-tab)이 준다 — 루트에는 패딩 없음 */
    <section className="flex min-h-full flex-col" data-testid="search-screen">
      <div className="sticky top-0 z-10 shrink-0 bg-bg px-4 pt-2">
        <h1 className="sr-only">{t('search.title')}</h1>
        {/* 캡슐 검색 입력 */}
        <div className="relative">
          <IconSearch
            size={20}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
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
            className="min-h-12 w-full appearance-none rounded-pill bg-surface-2 pl-11 pr-11 text-body text-fg outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-muted focus:bg-surface-3 focus-visible:shadow-[0_0_0_2px_var(--accent-glow)] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-pill text-muted transition-[background-color,transform] duration-150 ease-standard active:scale-95 active:bg-surface-3"
            >
              ✕
            </button>
          )}
        </div>
        {/* 카테고리 칩(단일 선택) + "지금 보이는 것만" 스위치(톤 선택) */}
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]"
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
                className={`${CHIP_CLASS} ${CHIP_SELECTED}`}
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
            className={`${CHIP_CLASS} ${CHIP_CHECKED}`}
            data-testid="search-visible-only"
          >
            {visibleOnly && <span aria-hidden>✓</span>}
            {t('search.visibleOnly')}
          </button>
        </div>
      </div>

      <div className="flex-1 pb-4" data-testid="search-results">
        {!ready && <p className="px-5 py-3 text-body-sm text-muted">{t('search.loading')}</p>}
        {cat && showEmpty && recent.length > 0 && (
          <>
            <SectionHeader
              action={
                <button
                  type="button"
                  onClick={() => useSearchStore.getState().clearRecent()}
                  className="-my-2 min-h-8 rounded-pill px-3 text-body-sm font-medium text-accent transition-[background-color,transform] duration-150 ease-standard active:scale-95 active:bg-accent-soft"
                >
                  {t('search.clearRecent')}
                </button>
              }
            >
              {t('search.recent')}
            </SectionHeader>
            <ul className={GROUP_CLASS} data-testid="search-recent">
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
                  mark={markOf(id)}
                  onOpen={open}
                />
              ))}
            </ul>
          </>
        )}
        {cat && showEmpty && (
          <>
            <SectionHeader>{daytime ? t('search.suggestDay') : t('search.suggest')}</SectionHeader>
            <ul className={GROUP_CLASS} data-testid="search-suggest">
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
                  mark={markOf(id)}
                  onOpen={open}
                />
              ))}
            </ul>
          </>
        )}
        {cat && !showEmpty && (
          <>
            {hits.length === 0 && ready && (
              <p className="mx-4 mt-2 rounded-lg bg-surface px-4 py-6 text-center text-body-sm text-muted squircle">
                {t('search.noResults')}
              </p>
            )}
            <ul className={`${GROUP_CLASS} mt-2`}>
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
                  mark={markOf(h.id)}
                  onOpen={open}
                />
              ))}
            </ul>
            {hits.length > 0 && (
              <p
                className="px-5 py-2 text-right text-label text-muted tabular-nums"
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
