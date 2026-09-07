import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import type { Phenomenon } from '@/astro/phenomena';
import type { Catalog } from '@/catalog/catalog';
import { isActiveOn, type MeteorShower } from '@/catalog/meteors';
import { formatDateShort, phenomenonTitle, showerName } from '@/features/tonight/phenomenaText';
import { Card } from '@/ui/Card';
import { Chip, ChipRow } from '@/ui/Chip';
import { formatTime } from '@/ui/format';

interface Props {
  cat: Catalog | null;
  lang: Lang;
  phenomena: Phenomenon[];
  nextMonthPhenomena: Phenomenon[];
  ym: { year: number; month: number } | null;
  showers: MeteorShower[];
  now: Date;
}

/** 이달의 천문 현상(task-03 §3.8) + 유성우 */
export function PhenomenaCard({
  cat,
  lang,
  phenomena,
  nextMonthPhenomena,
  ym,
  showers,
  now,
}: Props) {
  const { t } = useTranslation();
  const [which, setWhich] = useState<'this' | 'next'>('this');
  if (!cat || !ym) return null;
  const list = which === 'this' ? phenomena : nextMonthPhenomena;
  const month = which === 'this' ? ym.month : ym.month === 12 ? 1 : ym.month + 1;
  const title = (p: Phenomenon) => phenomenonTitle(p, cat, lang, t, showers);
  return (
    <Card title={t('phenomena.title')} testId="phenomena-card">
      <ChipRow className="-mt-2">
        <Chip
          role="tab"
          selected={which === 'this'}
          onClick={() => setWhich('this')}
          testId="phen-this"
        >
          {t('phenomena.month', { m: ym.month })}
        </Chip>
        <Chip
          role="tab"
          selected={which === 'next'}
          onClick={() => setWhich('next')}
          testId="phen-next"
        >
          {t('phenomena.month', { m: month })}
        </Chip>
      </ChipRow>
      <ul className="mt-1 [&>li+li]:hairline-t" data-testid="phenomena-list">
        {list.map((p, i) => {
          const past = p.at.getTime() < now.getTime() - 86_400_000;
          return (
            <li
              key={i}
              className={`flex min-h-14 items-center gap-3 py-2 ${past ? 'opacity-55' : ''}`}
              data-kind={p.kind}
            >
              <span className="w-14 shrink-0 text-caption text-muted tabular-nums">
                <span className="block font-medium">{formatDateShort(p.at, lang)}</span>
                <span className="block">{p.kind === 'meteorPeak' ? '' : formatTime(p.at)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium">{title(p)}</span>
                <span className="block text-caption text-muted">{detail(p, t)}</span>
              </span>
              {p.visibleLocally !== undefined && (
                <Chip tone={p.visibleLocally ? 'success' : 'muted'} selected className="shrink-0">
                  {p.visibleLocally ? t('phenomena.visible') : t('phenomena.notVisible')}
                </Chip>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function detail(p: Phenomenon, t: (k: string, o?: Record<string, unknown>) => string): string {
  switch (p.kind) {
    case 'opposition':
      return t('phenomena.oppositionDetail', {
        mag: p.magnitude?.toFixed(1) ?? '—',
        au: p.distanceAu?.toFixed(2) ?? '—',
      });
    case 'maxElongation':
      return p.visibleLocally === false
        ? t('phenomena.elongationHidden')
        : t(`phenomena.elongationDetail.${p.visibility ?? 'evening'}`);
    case 'greatestBrilliancy':
      return t('phenomena.brilliancyDetail', { mag: p.magnitude?.toFixed(1) ?? '—' });
    case 'lunarEclipse':
    case 'solarEclipse':
      return p.altAtPeakDeg !== undefined
        ? t('phenomena.eclipseDetail', {
            alt: Math.round(p.altAtPeakDeg),
            min: p.durationMin ?? '—',
          })
        : t('phenomena.eclipseElsewhere');
    case 'meteorPeak':
      return p.meteor
        ? t('phenomena.meteorDetail', {
            zhr: p.meteor.zhr,
            cond: t(`phenomena.condition.${p.meteor.condition}`),
            moon: Math.round(p.meteor.moonIllumination * 100),
            time: formatTime(p.meteor.bestAt),
          })
        : '';
    case 'perigeeFullMoon':
      return t('phenomena.perigeeDetail');
    default:
      return '';
  }
}

/** 유성우 카드: 오늘 활동 중인 유성우 + 다음 극대 */
export function MeteorCard({
  showers,
  phenomena,
  nextMonthPhenomena,
  now,
  lang,
}: {
  showers: MeteorShower[];
  phenomena: Phenomenon[];
  nextMonthPhenomena: Phenomenon[];
  now: Date;
  lang: Lang;
}) {
  const { t } = useTranslation();
  if (showers.length === 0) return null;
  const md = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(now)
    .filter((p) => p.type === 'month' || p.type === 'day')
    .map((p) => p.value)
    .join('-');
  const active = showers.filter((s) => isActiveOn(s, md));
  const peaks = [...phenomena, ...nextMonthPhenomena].filter(
    (p) => p.kind === 'meteorPeak' && p.at.getTime() >= now.getTime() - 86_400_000,
  );
  const next = peaks[0];
  return (
    <Card title={t('meteor.title')} testId="meteor-card">
      {active.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {active.map((s) => {
            const pk = peaks.find((p) => p.meteor?.id === s.id);
            return (
              <li key={s.id} className="max-w-full">
                <Chip tone={pk?.meteor?.condition === 'good' ? 'success' : 'muted'} selected>
                  {lang === 'ko' ? s.names.ko : s.names.en} · ZHR {s.zhr}
                  {pk ? ` · ${t('meteor.peak', { date: formatDateShort(pk.at, lang) })}` : ''}
                </Chip>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-body-sm text-muted">{t('meteor.noneActive')}</p>
      )}
      {next && next.meteor && (
        <p className="mt-3 text-caption text-muted" data-testid="meteor-next">
          {t('meteor.next', {
            name: showerName(next.meteor.id, showers, lang),
            date: formatDateShort(next.at, lang),
            cond: t(`phenomena.condition.${next.meteor.condition}`),
          })}
        </p>
      )}
    </Card>
  );
}
