import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { wrap360 } from '@/astro/coords';

export interface SkyRange {
  /** 보이는 방위 구간 [시작, 끝] (도, 북=0, 시계 방향). undefined = 전부 */
  arc?: [number, number];
  minAltDeg: number;
}

const SIZE = 220;
const R = 90;
const C = SIZE / 2;

function pt(azDeg: number, r = R): [number, number] {
  const a = (azDeg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

function arcPath(start: number, end: number): string {
  const span = wrap360(end - start);
  const [x1, y1] = pt(start);
  const [x2, y2] = pt(end);
  const large = span > 180 ? 1 : 0;
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

/**
 * 보이는 하늘 범위 선택기 (task-02 §3.1 C15): 방위 링 위에서 시작·끝 핸들을 끌어 구간을 정한다.
 * 예: 베란다(남동~남서) → [110, 250]. "전체"면 구간 없음.
 * 색은 전부 테마 변수(--surface-2·--hairline-strong·--accent 등) → 야간 모드에서 자동으로 붉어진다.
 */
export function SkyRangePicker({
  value,
  onChange,
}: {
  value: SkyRange;
  onChange(v: SkyRange): void;
}) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<'start' | 'end' | null>(null);
  const arc = value.arc;

  const azFromEvent = (e: React.PointerEvent): number => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE - C;
    const y = ((e.clientY - rect.top) / rect.height) * SIZE - C;
    return Math.round(wrap360((Math.atan2(x, -y) * 180) / Math.PI));
  };

  const onDown = (e: React.PointerEvent) => {
    const az = azFromEvent(e);
    if (!arc) {
      onChange({ ...value, arc: [wrap360(az - 45), wrap360(az + 45)] });
      dragging.current = 'end';
    } else {
      const dS = Math.abs(((az - arc[0] + 540) % 360) - 180);
      const dE = Math.abs(((az - arc[1] + 540) % 360) - 180);
      dragging.current = dS <= dE ? 'start' : 'end';
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current || !arc) return;
    const az = azFromEvent(e);
    onChange({ ...value, arc: dragging.current === 'start' ? [az, arc[1]] : [arc[0], az] });
  };
  const onUp = () => {
    dragging.current = null;
  };

  const labels: [string, number][] = [
    [t('sites.dir.n'), 0],
    [t('sites.dir.e'), 90],
    [t('sites.dir.s'), 180],
    [t('sites.dir.w'), 270],
  ];

  return (
    <div className="flex w-full flex-col items-center gap-3" data-testid="sky-range-picker">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-[220px] w-[220px] touch-none select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="img"
        aria-label={t('sites.range')}
      >
        {/* 링 바탕 — 표면 층 + 헤어라인(불투명 외곽선 없음) */}
        <circle cx={C} cy={C} r={R} fill="var(--surface-2)" stroke="var(--hairline-strong)" />
        {arc ? (
          <path
            d={arcPath(arc[0], arc[1])}
            fill="var(--accent)"
            fillOpacity={0.3}
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ) : (
          <circle cx={C} cy={C} r={R} fill="var(--accent)" fillOpacity={0.22} />
        )}
        {Array.from({ length: 12 }, (_, i) => {
          const major = i % 3 === 0;
          const [x1, y1] = pt(i * 30, R - (major ? 8 : 5));
          const [x2, y2] = pt(i * 30, R);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={major ? 'var(--muted)' : 'var(--muted-2)'}
              strokeWidth={major ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}
        {labels.map(([text, az]) => {
          const [x, y] = pt(az, R + 14);
          return (
            <text
              key={text}
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="var(--fg)"
            >
              {text}
            </text>
          );
        })}
        {arc &&
          (['start', 'end'] as const).map((k, i) => {
            const [x, y] = pt(arc[i]!);
            return (
              <circle
                key={k}
                cx={x}
                cy={y}
                r={9}
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth={2.5}
                data-testid={`range-handle-${k}`}
              />
            );
          })}
      </svg>
      <div className="flex items-center gap-2">
        <span className="font-mono text-caption tabular-nums text-fg" data-testid="range-text">
          {arc ? `${arc[0]}° → ${arc[1]}°` : t('sites.rangeAll')}
        </span>
        <button
          type="button"
          onClick={() => onChange({ ...value, arc: undefined })}
          className="inline-flex min-h-9 items-center justify-center rounded-pill bg-surface-3 px-3.5 text-body-sm font-medium text-fg transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97]"
          data-testid="range-all"
        >
          {t('sites.rangeAll')}
        </button>
      </div>
      <label className="flex min-h-11 w-full items-center gap-3 text-body-sm">
        <span className="w-20 shrink-0 text-muted">{t('sites.minAlt')}</span>
        <input
          type="range"
          min={0}
          max={45}
          step={1}
          value={value.minAltDeg}
          onChange={(e) => onChange({ ...value, minAltDeg: Number(e.target.value) })}
          className="min-w-0 flex-1"
          data-testid="range-minalt"
        />
        <span className="w-9 shrink-0 text-right font-mono tabular-nums">{value.minAltDeg}°</span>
      </label>
    </div>
  );
}
