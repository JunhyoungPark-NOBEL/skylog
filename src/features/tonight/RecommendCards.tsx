import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import type { RecGroup, Recommendation, RecommendResult } from '@/astro/recommend';
import type { Phenomenon } from '@/astro/phenomena';
import { displayName, type Catalog } from '@/catalog/catalog';
import type { MeteorShower } from '@/catalog/meteors';
import type { ObjectId } from '@/catalog/objectId';
import type { SearchKind } from '@/catalog/searchIndex';
import { bookmarkedIds, toggleBookmark } from '@/db/repos/bookmarks';
import { openObject } from '@/features/object/objectApi';
import { reasonSentence } from '@/features/tonight/reasonText';
import { formatDateShort, phenomenonTitle } from '@/features/tonight/phenomenaText';
import { Card } from '@/ui/Card';
import { Chip, ChipRow } from '@/ui/Chip';
import { compass16, formatAlt, formatTime } from '@/ui/format';

const KIND_GLYPH: Record<SearchKind, string> = {
  sun: '☀',
  moon: '☾',
  planet: '●',
  star: '✦',
  dso: '◌',
  const: '⋰',
};
const GROUPS: RecGroup[] = ['now', 'naked', 'binoculars', 'telescope', 'settingSoon', 'rising'];

/** 행 사이는 hairline(box-shadow) — 불투명 디바이더 없음 */
const ROW_LIST = '[&>li+li]:hairline-t';
/** 3차(텍스트) 버튼 */
const TEXT_BUTTON =
  'inline-flex min-h-8 items-center rounded-pill px-3 text-body-sm font-medium text-accent transition-[background-color,transform] duration-150 ease-standard active:scale-[0.97] active:bg-accent-soft';

function Row({
  rec,
  cat,
  lang,
  planned,
  onPlan,
}: {
  rec: Recommendation;
  cat: Catalog;
  lang: Lang;
  planned?: boolean;
  onPlan?: (id: ObjectId) => void;
}) {
  const { t } = useTranslation();
  const m = rec.metrics;
  return (
    <li className="flex min-h-14 items-center gap-1" data-testid="rec-item" data-object-id={rec.id}>
      <button
        type="button"
        onClick={() => openObject(rec.id, 'half')}
        className="-mx-2 flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 active:bg-surface-2"
        data-testid="rec-open"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-3 text-body ${
            rec.kind === 'planet' ? 'text-planet' : 'text-fg'
          }`}
          aria-hidden
        >
          {KIND_GLYPH[rec.kind]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold" data-testid="rec-name">
            {displayName(cat, rec.id, lang)}
          </span>
          <span className="block truncate text-caption text-muted" data-testid="rec-reason">
            {reasonSentence(rec.reasons, lang, t)}
          </span>
        </span>
        <span className="shrink-0 text-right tabular-nums">
          <span className="block text-body-sm font-medium">
            {m.peakAt ? formatTime(m.peakAt) : '—'}
          </span>
          <span className="block text-label text-muted">
            {compass16(m.peakAzDeg, lang)} {formatAlt(m.peakAltDeg, 0)}
          </span>
        </span>
      </button>
      {onPlan && (
        <button
          type="button"
          aria-pressed={planned}
          aria-label={t('recommend.addToPlan')}
          onClick={() => onPlan(rec.id)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-body-lg transition-[transform,background-color,color] duration-150 ease-standard active:scale-95 active:bg-surface-2 ${
            planned ? 'text-marker' : 'text-muted'
          }`}
          data-testid="rec-plan-toggle"
        >
          {planned ? '★' : '☆'}
        </button>
      )}
    </li>
  );
}

/** 추천 그룹 카드(task-03 §3.6): 그룹 칩 → 목록(최대 8, 더 보기) */
export function RecommendCard({
  result,
  cat,
  lang,
  computing,
  siteFiltered,
}: {
  result: RecommendResult | null;
  cat: Catalog | null;
  lang: Lang;
  computing: boolean;
  siteFiltered: boolean;
}) {
  const { t } = useTranslation();
  const [group, setGroup] = useState<RecGroup>('now');
  const [expanded, setExpanded] = useState(false);
  const available = result ? GROUPS.filter((g) => result.groups[g].length > 0) : [];
  const active = available.includes(group) ? group : (available[0] ?? 'now');
  const list = result?.groups[active] ?? [];
  const shown = expanded ? list : list.slice(0, 8);
  return (
    <Card
      title={t('recommend.title')}
      aside={
        siteFiltered ? (
          <Chip tone="success" selected>
            {t('recommend.siteBadge')}
          </Chip>
        ) : undefined
      }
      testId="recommend-card"
    >
      {!result && (
        <p className="text-body-sm text-muted">
          {computing ? t('recommend.computing') : t('common.loading')}
        </p>
      )}
      {result && available.length === 0 && (
        <p className="text-body-sm text-muted">{t('recommend.none')}</p>
      )}
      {result && available.length > 0 && cat && (
        <>
          <ChipRow label={t('recommend.title')} className="-mt-2">
            {available.map((g) => (
              <Chip
                key={g}
                role="tab"
                selected={g === active}
                onClick={() => setGroup(g)}
                testId={`rec-group-${g}`}
              >
                {t(`recommend.group.${g}`)}{' '}
                <span className="opacity-70 tabular-nums">{result.groups[g].length}</span>
              </Chip>
            ))}
          </ChipRow>
          <ul className={`mt-1 ${ROW_LIST}`} data-testid="rec-list">
            {shown.map((r) => (
              <Row key={r.id} rec={r} cat={cat} lang={lang} />
            ))}
          </ul>
          {list.length > 8 && (
            <button
              type="button"
              className={`-ml-3 mt-1 ${TEXT_BUTTON}`}
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? t('common.less') : t('common.more', { n: list.length - 8 })}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

/** 오늘 밤 계획(시간순 ≤ 12, ☆로 Dexie bookmarks에 저장) */
export function PlanCard({
  result,
  cat,
  lang,
}: {
  result: RecommendResult | null;
  cat: Catalog | null;
  lang: Lang;
}) {
  const { t } = useTranslation();
  const [planned, setPlanned] = useState<Set<ObjectId>>(new Set());
  useEffect(() => {
    let alive = true;
    void bookmarkedIds().then((s) => {
      if (alive) setPlanned(s);
    });
    return () => {
      alive = false;
    };
  }, [result]);
  if (!result || !cat || result.plan.length === 0) return null;
  const onPlan = (id: ObjectId) => {
    void toggleBookmark(id).then((on) => {
      setPlanned((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
    });
  };
  return (
    <Card title={t('recommend.plan')} aside={t('recommend.planHint')} testId="plan-card">
      <ul className={ROW_LIST}>
        {result.plan.map((r) => (
          <Row
            key={r.id}
            rec={r}
            cat={cat}
            lang={lang}
            planned={planned.has(r.id)}
            onPlan={onPlan}
          />
        ))}
      </ul>
    </Card>
  );
}

/** 오늘의 하이라이트: 행성·달 상위 + 가까운 특별 현상 1~3개 */
export function HighlightsCard({
  result,
  cat,
  lang,
  phenomena,
  now,
  showers = [],
}: {
  result: RecommendResult | null;
  cat: Catalog | null;
  lang: Lang;
  phenomena: Phenomenon[];
  now: Date;
  showers?: MeteorShower[];
}) {
  const { t } = useTranslation();
  if (!result || !cat) return null;
  const bodies = result.items.filter((r) => r.kind === 'planet' || r.kind === 'moon').slice(0, 3);
  const soon = phenomena
    .filter((p) => {
      const d = (p.at.getTime() - now.getTime()) / 86_400_000;
      if (d < -1 || d > 14) return false;
      if (p.kind === 'meteorPeak') return p.meteor?.condition !== 'poor';
      return (
        p.kind === 'opposition' ||
        p.kind === 'maxElongation' ||
        p.kind === 'lunarEclipse' ||
        p.kind === 'solarEclipse' ||
        p.kind === 'perigeeFullMoon'
      );
    })
    .slice(0, 2);
  if (bodies.length === 0 && soon.length === 0) return null;
  return (
    <Card title={t('recommend.highlights')} testId="highlights-card">
      <ul className={ROW_LIST}>
        {bodies.map((r) => (
          <Row key={r.id} rec={r} cat={cat} lang={lang} />
        ))}
      </ul>
      {soon.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" data-testid="highlight-events">
          {soon.map((p, i) => (
            <li key={i}>
              <Chip tone="accent" selected>
                {phenomenonTitle(p, cat, lang, t, showers)} · {formatDateShort(p.at, lang)}
              </Chip>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
