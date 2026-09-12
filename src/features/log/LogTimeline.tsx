import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import { nightKey } from '@/astro/time';
import { displayName, type Catalog } from '@/catalog/catalog';
import { kindOf } from '@/catalog/objectId';
import { tagLabelKey } from './tagPresets';
import { deleteObservation, restoreObservation } from '@/db/repos/observations';
import type { Observation } from '@/db/types';
import { groupByNight, nightLabel } from '@/features/log/logUtils';
import { useBlobUrl } from '@/features/log/useObservations';
import { useClockStore } from '@/state/clockStore';
import { showToast } from '@/state/logUiStore';
import { Chip } from '@/ui/Chip';
import { formatTime } from '@/ui/format';

/** 이만큼 왼쪽으로 끌면 놓을 때 삭제 */
const SWIPE_PX = 60;
/** 축(가로/세로)을 정하는 최소 이동 */
const DECIDE_PX = 8;
const UNDO_MS = 5000;

interface LogTimelineProps {
  rows: readonly Observation[];
  cat: Catalog | null;
  lang: Lang;
  onOpen(id: string): void;
  /** 그룹이 하나도 없을 때 보여 줄 문구(없으면 아무것도 그리지 않음) */
  emptyText?: string;
}

/**
 * 타임라인(task-04 §3.4): 밤(nightKey)별 그룹 + 카드 행. 행을 왼쪽으로 60px 이상 끌어 놓으면 삭제되고
 * 5초 동안 실행 취소할 수 있다(소프트 삭제 → `restoreObservation`).
 */
export function LogTimeline({ rows, cat, lang, onOpen, emptyText }: LogTimelineProps) {
  const { t } = useTranslation();
  const groups = useMemo(() => groupByNight(rows), [rows]);
  const currentYear = Number(nightKey(useClockStore.getState().now()).slice(0, 4));

  if (groups.length === 0)
    return emptyText ? (
      <p className="py-8 text-center text-body-sm text-muted" data-testid="log-timeline-empty">
        {emptyText}
      </p>
    ) : null;

  const remove = (id: string) => {
    void deleteObservation(id).then(() => {
      showToast(
        t('log.tab.deleted'),
        { label: t('log.tab.undo'), onClick: () => void restoreObservation(id) },
        UNDO_MS,
      );
    });
  };

  return (
    <div className="flex flex-col gap-4" data-testid="log-timeline">
      {groups.map((g) => (
        <section key={g.nightKey} data-testid="log-night" data-night-key={g.nightKey}>
          <h2 className="px-1 pb-2 text-body-sm font-semibold text-muted">
            {t('log.timeline.group', {
              night: nightLabel(g.nightKey, lang, currentYear),
              n: g.rows.length,
            })}
          </h2>
          <ul className="squircle overflow-hidden rounded-lg bg-surface">
            {g.rows.map((r, i) => (
              <LogRow
                key={r.id}
                row={r}
                cat={cat}
                lang={lang}
                first={i === 0}
                onOpen={onOpen}
                onDelete={remove}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface LogRowProps {
  row: Observation;
  cat: Catalog | null;
  lang: Lang;
  first: boolean;
  onOpen(id: string): void;
  onDelete(id: string): void;
}

interface DragState {
  pointerId: number;
  x: number;
  y: number;
  /** null = 아직 축 미정 */
  axis: 'x' | null;
}

/**
 * 기록 행. 가로 포인터 드래그(터치·마우스)만 스와이프로 인정하고 세로는 스크롤에 맡긴다
 * (`touch-action: pan-y` — 브라우저가 세로 팬을 가져가고 가로는 우리가 받는다).
 */
function LogRow({ row, cat, lang, first, onOpen, onDelete }: LogRowProps) {
  const { t } = useTranslation();
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const dxRef = useRef(0);
  const swiped = useRef(false);
  const thumb = useBlobUrl(row.sketchBlobId ?? row.photoBlobIds?.[0]);

  const name = cat ? displayName(cat, row.objectId, lang) : row.objectId;
  const kind = kindOf(row.objectId);
  const seen = row.outcome === 'seen';
  const meta = [
    formatTime(new Date(row.observedAt)),
    row.equipment ? t(`log.tab.equip.${row.equipment.kind}`) : null,
    t(`sky.kind.${kind}`),
  ]
    .filter(Boolean)
    .join(' · ');
  const armed = dx <= -SWIPE_PX;

  const move = (value: number) => {
    dxRef.current = value;
    setDx(value);
  };
  const finish = (commit: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== 'x') return;
    setDragging(false);
    if (commit && dxRef.current <= -SWIPE_PX) onDelete(row.id);
    move(0);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLLIElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, axis: null };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const ddx = e.clientX - d.x;
    const ddy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.hypot(ddx, ddy) < DECIDE_PX) return;
      if (Math.abs(ddx) <= Math.abs(ddy)) {
        // 세로 이동이 크면 스와이프가 아니다 — 스크롤에 맡긴다
        drag.current = null;
        return;
      }
      d.axis = 'x';
      swiped.current = true;
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* 미구현 환경 */
      }
    }
    move(Math.min(0, ddx));
  };

  return (
    <li
      className="relative touch-pan-y select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => finish(true)}
      onPointerCancel={() => finish(false)}
      data-testid="log-item-wrap"
    >
      {/* 뒤에 깔린 삭제 영역 — 끌수록 드러난다 */}
      <div
        aria-hidden
        className={`absolute inset-y-0 right-0 flex items-center justify-end bg-danger-soft pr-5 text-body-sm font-semibold text-danger transition-opacity duration-150 ${
          dx < 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width: Math.max(SWIPE_PX + 40, -dx) }}
      >
        <span className={armed ? 'scale-110' : ''}>{t('log.timeline.delete')}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onOpen(row.id);
        }}
        className={`relative flex min-h-16 w-full items-center gap-3 bg-surface px-4 py-2.5 text-left transition-colors duration-150 active:bg-surface-2 ${
          first ? '' : 'hairline-t'
        }`}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 180ms var(--motion-ease-standard)',
        }}
        data-testid="log-item"
        data-observation-id={row.id}
        data-object-id={row.objectId}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-11 w-11 shrink-0 rounded-sm bg-surface-3 object-cover"
            data-testid="log-item-thumb"
          />
        ) : (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-surface-3 text-body-lg ${
              seen ? 'text-marker' : 'text-muted'
            }`}
            aria-hidden
          >
            ★
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {thumb && (
              <span className={seen ? 'text-marker' : 'text-muted'} aria-hidden>
                ★
              </span>
            )}
            <span className="truncate text-body" data-testid="log-item-name">
              {name}
            </span>
          </span>
          <span className="block truncate text-caption text-muted">{meta}</span>
          {row.tags.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {row.tags.slice(0, 2).map((tag) => (
                <Chip key={tag} tone="muted" selected>
                  {t(tagLabelKey(tag), { defaultValue: tag })}
                </Chip>
              ))}
              {row.tags.length > 2 && (
                <span className="self-center text-label text-muted">+{row.tags.length - 2}</span>
              )}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right text-caption tabular-nums">
          {!seen && <span className="block text-muted">{t('log.timeline.attempted')}</span>}
        </span>
      </button>
    </li>
  );
}
