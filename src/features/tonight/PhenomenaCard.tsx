import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import type { Phenomenon } from '@/astro/phenomena';
import { isActiveOn, type MeteorShower } from '@/catalog/meteors';
import { formatDateShort, showerName } from '@/features/tonight/phenomenaText';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';

export { EventCalendar as PhenomenaCard } from './EventCalendar';

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
