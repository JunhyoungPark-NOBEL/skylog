import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { darknessLevel, type Interval, type ObservingNight } from '@/astro/night';
import type { Lang } from '@/app/i18n';
import { Card } from '@/ui/Card';
import { formatDuration, formatTime, tzOffsetMinutes } from '@/ui/format';

export interface CloudHour {
  at: Date;
  /** 0..100 */
  cloud: number;
}

interface Props {
  night: ObservingNight;
  now: Date;
  lang: Lang;
  /** T3b: 시간별 구름(있으면 겹쳐 그림) */
  clouds?: CloudHour[];
}

/* viewBox는 모바일 폭 기준(≈ 카드 안쪽 폭)이라 글자·막대가 화면에서 거의 1:1로 보인다 */
const W = 360;
const H = 96;
const PAD = 8;
const TRACK_H = 30;

/** 밤 시각 → x. 범위는 18:00~06:00(현지)이되 일몰·일출이 벗어나면 넓힌다. */
function makeScale(night: ObservingNight): {
  from: number;
  to: number;
  x(t: Date | number): number;
} {
  const off = tzOffsetMinutes(night.start, night.tz) * 60_000;
  // start = 현지 정오 → 18:00 = start + 6h
  let from = night.start.getTime() + 6 * 3_600_000;
  let to = night.start.getTime() + 18 * 3_600_000;
  const ss = night.timeline.sunset?.getTime();
  const sr = night.timeline.sunrise?.getTime();
  if (ss && ss - 3_600_000 < from) from = ss - 3_600_000;
  if (sr && sr + 3_600_000 > to) to = sr + 3_600_000;
  void off;
  return {
    from,
    to,
    x: (t) =>
      PAD + (((typeof t === 'number' ? t : t.getTime()) - from) / (to - from)) * (W - 2 * PAD),
  };
}

function clampIv(iv: Interval, from: number, to: number): [number, number] | null {
  const a = Math.max(iv.from.getTime(), from);
  const b = Math.min(iv.to.getTime(), to);
  return b > a ? [a, b] : null;
}

const LEGEND_SWATCH = 'inline-block h-2.5 w-3.5 rounded-[3px]';
const INNER_BLOCK = 'rounded-md bg-surface-2/70 px-3.5 py-3';

/** 하늘 상태 위젯(task-03 §3.4): 어둠 단계 그라데이션 · 달 있음 구간 · 어두운 창 · 구름(있으면) · 현재 커서 */
export function SkyStatusCard({ night, now, lang, clouds }: Props) {
  const { t } = useTranslation();
  const clipId = `sky-track-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const scale = makeScale(night);
  const hours: number[] = [];
  for (let ms = Math.ceil(scale.from / 3_600_000) * 3_600_000; ms <= scale.to; ms += 3_600_000)
    hours.push(ms);
  const hourLabel = (ms: number) => formatTime(new Date(ms), night.tz).slice(0, 2);
  const moonName = t(`tonight.moonPhase.${night.moon.name}`);
  const dateLabel = night.key.slice(5).replace('-', '/');
  const rows = [
    {
      label: t('tonight.sunset'),
      value: formatTime(night.timeline.sunset, night.tz),
      testId: 'sunset',
    },
    {
      label: t('tonight.astroDusk'),
      value: formatTime(night.timeline.astronomicalDusk, night.tz),
      testId: 'astro-dusk',
    },
    {
      label: t('tonight.astroDawn'),
      value: formatTime(night.timeline.astronomicalDawn, night.tz),
      testId: 'astro-dawn',
    },
    {
      label: t('tonight.sunrise'),
      value: formatTime(night.timeline.sunrise, night.tz),
      testId: 'sunrise',
    },
    {
      label: t('tonight.moonrise'),
      value: night.moonrises.map((d) => formatTime(d, night.tz)).join(', ') || '—',
      testId: 'moonrise',
    },
    {
      label: t('tonight.moonset'),
      value: night.moonsets.map((d) => formatTime(d, night.tz)).join(', ') || '—',
      testId: 'moonset',
    },
  ];

  return (
    <Card
      title={t('tonight.skyStatus')}
      aside={t('tonight.night', { date: dateLabel })}
      testId="sky-status-card"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={t('tonight.skyStatus')}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD} y={PAD} width={W - 2 * PAD} height={TRACK_H} rx={6} />
          </clipPath>
        </defs>
        {/* 트랙 바탕 */}
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={TRACK_H} rx={6} fill="var(--surface-3)" />
        <g clipPath={`url(#${clipId})`}>
          {/* 어둠 단계 */}
          {night.segments.map((s, i) => {
            const iv = clampIv(s, scale.from, scale.to);
            if (!iv) return null;
            const lvl = darknessLevel(s.kind);
            return (
              <rect
                key={i}
                x={scale.x(iv[0])}
                y={PAD}
                width={Math.max(0.5, scale.x(iv[1]) - scale.x(iv[0]))}
                height={TRACK_H}
                fill="var(--accent)"
                opacity={0.08 + 0.55 * (1 - lvl)}
                data-kind={s.kind}
              />
            );
          })}
          {/* 어두운 창 */}
          {night.darkWindows.map((w, i) => {
            const iv = clampIv(w, scale.from, scale.to);
            if (!iv) return null;
            return (
              <rect
                key={`d${i}`}
                x={scale.x(iv[0])}
                y={PAD}
                width={Math.max(0.5, scale.x(iv[1]) - scale.x(iv[0]))}
                height={TRACK_H}
                fill="var(--success)"
                opacity={0.35}
                data-testid="dark-window"
              />
            );
          })}
        </g>
        {/* 달 */}
        {night.moonAbove.map((m, i) => {
          const iv = clampIv(m, scale.from, scale.to);
          if (!iv) return null;
          return (
            <rect
              key={`m${i}`}
              x={scale.x(iv[0])}
              y={PAD + 34}
              width={Math.max(0.5, scale.x(iv[1]) - scale.x(iv[0]))}
              height={10}
              rx={5}
              fill="var(--moon)"
              opacity={0.25 + 0.6 * night.moon.illumination}
              data-testid="moon-band"
            />
          );
        })}
        {/* 구름(T3b) */}
        {clouds?.map((c, i) => {
          const ms = c.at.getTime();
          if (ms < scale.from || ms > scale.to) return null;
          const h = (c.cloud / 100) * 12;
          return (
            <rect
              key={`c${i}`}
              x={scale.x(ms)}
              y={PAD + 48 + (12 - h)}
              width={Math.max(1, scale.x(ms + 3_600_000) - scale.x(ms) - 1)}
              height={h}
              rx={1}
              fill="var(--muted)"
              opacity={0.7}
            />
          );
        })}
        {/* 시각 눈금 */}
        {hours.map((ms) => (
          <g key={ms}>
            <line
              x1={scale.x(ms)}
              x2={scale.x(ms)}
              y1={PAD}
              y2={PAD + 62}
              stroke="var(--hairline-strong)"
              strokeWidth={1}
            />
            <text
              x={scale.x(ms)}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--muted)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {hourLabel(ms)}
            </text>
          </g>
        ))}
        {/* 현재 시각 */}
        {now.getTime() >= scale.from && now.getTime() <= scale.to && (
          <g data-testid="now-cursor">
            <line
              x1={scale.x(now)}
              x2={scale.x(now)}
              y1={PAD - 4}
              y2={PAD + 64}
              stroke="var(--fg)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <text
              x={scale.x(now)}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="var(--fg)"
              stroke="var(--surface)"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {t('tonight.now')}
            </text>
          </g>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-label text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className={LEGEND_SWATCH} style={{ background: 'var(--accent)', opacity: 0.4 }} />
          {t('tonight.legend.darkness')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={LEGEND_SWATCH} style={{ background: 'var(--success)', opacity: 0.5 }} />
          {t('tonight.legend.dark')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={LEGEND_SWATCH} style={{ background: 'var(--moon)', opacity: 0.6 }} />
          {t('tonight.legend.moon')}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {rows.map((r) => (
          <div key={r.testId} className="flex items-baseline justify-between gap-2">
            <span className="text-caption text-muted">{r.label}</span>
            <span
              className="text-body-sm font-medium tabular-nums"
              data-testid={`status-${r.testId}`}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>

      <div className={`mt-3 flex items-center justify-between gap-3 ${INNER_BLOCK}`}>
        <span className="text-body font-semibold" data-testid="status-moon-phase">
          {moonName}
        </span>
        <span className="shrink-0 text-right text-caption text-muted tabular-nums">
          {t('tonight.illum', { p: Math.round(night.moon.illumination * 100) })} ·{' '}
          {t('tonight.moonAge', { d: night.moon.ageDays.toFixed(1) })}
        </span>
      </div>

      <div className={`mt-2 ${INNER_BLOCK}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-body font-semibold">{t('tonight.darkWindow')}</span>
          <span className="text-caption text-muted">{t('tonight.darkWindowHint')}</span>
        </div>
        {night.darkWindows.length === 0 ? (
          <p className="mt-1 text-caption text-muted" data-testid="dark-none">
            {t('tonight.darkNone')}
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1" data-testid="dark-list">
            {night.darkWindows.map((w, i) => (
              <li key={i} className="flex justify-between text-body-sm tabular-nums">
                <span className="font-medium">
                  {formatTime(w.from, night.tz)} – {formatTime(w.to, night.tz)}
                </span>
                <span className="text-muted">
                  {formatDuration((w.to.getTime() - w.from.getTime()) / 60_000, lang)}
                </span>
              </li>
            ))}
            <li className="text-right text-caption text-muted tabular-nums">
              {t('tonight.darkTotal', { dur: formatDuration(night.darkTotalMin, lang) })}
            </li>
          </ul>
        )}
      </div>
    </Card>
  );
}
