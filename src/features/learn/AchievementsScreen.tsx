import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LearningState } from '@/learn/runtime';
import { useSettingsStore } from '@/state/settingsStore';
import { StatsCard } from '@/features/log/StatsCard';

export function AchievementsScreen({ value }: { value: LearningState }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const [earnedOnly, setEarnedOnly] = useState(false);
  const [stats, setStats] = useState(false);
  const available = value.data.badges.filter((b) => b.enabled !== false);
  const badges = earnedOnly
    ? available.filter((b) => value.snap.earnedBadges.has(b.id))
    : available;
  return (
    <div className="space-y-5" data-testid="achievements-screen">
      <section className="rounded-3xl bg-accent-soft p-6">
        <p className="text-caption font-semibold text-accent">{t('journey.myCollection')}</p>
        <h2 className="mt-3 text-headline">
          {t('journey.badgeCount', { n: value.badges.length })}
        </h2>
        <p className="mt-2 text-body-sm leading-6 text-muted">{t('journey.badgesIntro')}</p>
        <div
          role="progressbar"
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-3"
          aria-valuenow={value.badges.length}
          aria-valuemin={0}
          aria-valuemax={available.length}
          aria-label={t('study.badges')}
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: (value.badges.length / available.length) * 100 + '%' }}
          />
        </div>
      </section>
      <button
        className="flex min-h-11 items-center gap-3 rounded-pill bg-surface px-4 text-body-sm"
        aria-pressed={earnedOnly}
        onClick={() => setEarnedOnly(!earnedOnly)}
      >
        <span
          aria-hidden
          className="flex h-5 w-5 items-center justify-center rounded-md border border-muted text-accent"
        >
          {earnedOnly ? '✓' : ''}
        </span>
        {t('journey.earnedOnly')}
      </button>
      {!badges.length && <p className="p-5 text-body text-muted">{t('journey.noBadges')}</p>}
      <div className="grid grid-cols-2 gap-3">
        {badges.map((b) => {
          const earned = value.snap.earnedBadges.has(b.id);
          return (
            <article key={b.id} className="rounded-2xl border border-hairline bg-surface p-4">
              <div
                aria-hidden
                className={
                  'mb-3 flex h-12 w-12 items-center justify-center rounded-full border text-2xl ' +
                  (earned
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-hairline bg-surface-2 text-muted')
                }
              >
                {earned ? '✦' : '◇'}
              </div>
              <p className="text-caption text-accent">
                {t(earned ? 'journey.earned' : 'journey.inProgress')}
              </p>
              <h3 className="mt-1 text-body font-semibold">
                {lang === 'en' ? (b.title.en ?? b.title.ko) : b.title.ko}
              </h3>
              <p className="mt-2 text-caption leading-6 text-muted">
                {t('journey.badgeGoals.' + b.rule.key, {
                  n: 'n' in b.rule ? b.rule.n : undefined,
                  signature: 'id' in b.rule ? t('journey.signatures.' + b.rule.id) : undefined,
                })}
              </p>
            </article>
          );
        })}
      </div>
      <button
        className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-surface px-4 text-body-sm"
        aria-expanded={stats}
        aria-controls="learn-observation-stats"
        onClick={() => setStats(!stats)}
      >
        {t('study.observationProgress')} <span aria-hidden>{stats ? '−' : '+'}</span>
      </button>
      {stats && (
        <div id="learn-observation-stats">
          <StatsCard observations={[...value.snap.observations]} cat={value.cat} lang={lang} />
        </div>
      )}
    </div>
  );
}
