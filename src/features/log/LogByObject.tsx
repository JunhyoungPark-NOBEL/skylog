import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import { displayName, secondaryName, type Catalog } from '@/catalog/catalog';
import { kindOf } from '@/catalog/objectId';
import type { Observation } from '@/db/types';
import { byObject, sortObjectSummaries, type ObjectSort } from '@/features/log/logUtils';
import { openObject } from '@/features/object/objectApi';
import { formatDateTime } from '@/ui/format';
import { IconChevron } from '@/ui/icons';
import { Segmented } from '@/ui/Segmented';

interface LogByObjectProps {
  rows: readonly Observation[];
  cat: Catalog | null;
  lang: Lang;
}

const SORTS: ObjectSort[] = ['recent', 'name', 'count'];

/**
 * 대상별(task-04 §3.4): 내가 본 천체 목록 — 횟수·최근·최고 평점. 정렬 3종. 행을 누르면 상세 시트.
 * 종류 필터는 화면 공통 칩 행(LogScreen)이 담당한다.
 */
export function LogByObject({ rows, cat, lang }: LogByObjectProps) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<ObjectSort>('recent');
  const nameOf = useMemo(
    () => (id: Observation['objectId']) => (cat ? displayName(cat, id, lang) : id),
    [cat, lang],
  );
  const items = useMemo(
    () => sortObjectSummaries(byObject(rows), sort, nameOf, lang),
    [rows, sort, nameOf, lang],
  );

  if (items.length === 0)
    return (
      <p className="py-8 text-center text-body-sm text-muted" data-testid="log-by-object-empty">
        {t('log.byObject.empty')}
      </p>
    );

  return (
    <div data-testid="log-by-object">
      {/* Segmented는 자체 px-4를 가진다 — 화면의 px-4와 겹치지 않게 -mx-4 */}
      <div className="-mx-4">
        <Segmented<ObjectSort>
          label={t('log.byObject.sort')}
          value={sort}
          options={SORTS.map((s) => ({ value: s, label: t(`log.byObject.${s}`) }))}
          onChange={setSort}
        />
      </div>
      <ul className="squircle overflow-hidden rounded-lg bg-surface [&>li+li>button]:hairline-t">
        {items.map((it) => {
          const secondary = cat ? secondaryName(cat, it.objectId, lang) : undefined;
          const meta = [
            t(`sky.kind.${kindOf(it.objectId)}`),
            t('log.byObject.times', { n: it.count }),
            t('log.byObject.last', { date: formatDateTime(new Date(it.lastAt)) }),
          ].join(' · ');
          return (
            <li key={it.objectId}>
              <button
                type="button"
                onClick={() => openObject(it.objectId)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 active:bg-surface-2"
                data-testid="log-object"
                data-object-id={it.objectId}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-3 text-body ${
                    it.seen ? 'text-marker' : 'text-muted'
                  }`}
                  aria-hidden
                >
                  ★
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">
                    {nameOf(it.objectId)}
                    {secondary && (
                      <span className="ml-1.5 text-caption text-muted">{secondary}</span>
                    )}
                  </span>
                  <span className="block truncate text-caption text-muted">{meta}</span>
                </span>
                <span className="shrink-0 text-right text-caption tabular-nums">
                  {it.bestRating !== undefined && (
                    <span className="block text-marker">{'★'.repeat(it.bestRating)}</span>
                  )}
                  {!it.seen && (
                    <span className="block text-muted">{t('log.timeline.attempted')}</span>
                  )}
                </span>
                <IconChevron size={18} className="shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
