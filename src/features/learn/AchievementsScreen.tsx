import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LearningState } from '@/learn/runtime';
import { BADGE_TIERS, type BadgeTier } from '@/learn/schema';
import { useSettingsStore } from '@/state/settingsStore';
import { StatsCard } from '@/features/log/StatsCard';

export function AchievementsScreen({ value }: { value: LearningState }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const [earnedOnly, setEarnedOnly] = useState(false);
  const [stats, setStats] = useState(false);
  const [tier, setTier] = useState<BadgeTier | 'all'>('all');
  const available = value.data.badges.filter((b) => b.enabled !== false);
  const badges = available.filter(
    (b) =>
      (!earnedOnly || value.snap.earnedBadges.has(b.id)) &&
      (tier === 'all' || (b.tier ?? 'starter') === tier),
  );
  const next = available
    .filter((b) => !value.snap.earnedBadges.has(b.id))
    .sort((a, b) => {
      const ap = value.badgeProgress.get(a.id);
      const bp = value.badgeProgress.get(b.id);
      return (bp ? bp.n / bp.total : 0) - (ap ? ap.n / ap.total : 0);
    })
    .slice(0, 3);
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
            style={{
              width: (available.length ? value.badges.length / available.length : 0) * 100 + '%',
            }}
          />
        </div>
      </section>
      <p className="text-caption leading-6 text-muted">{t('journey.badgeEvidence')}</p>
      {next.length > 0 && !earnedOnly && tier === 'all' && (
        <section className="rounded-2xl bg-surface-2 p-4" data-testid="next-badges">
          <h3 className="text-body font-semibold">{t('journey.nextBadges')}</h3>
          <ul className="mt-3 space-y-2">
            {next.map((b) => {
              const p = value.badgeProgress.get(b.id);
              return (
                <li key={b.id} className="flex items-center justify-between gap-3 text-caption">
                  <span>{lang === 'en' ? (b.title.en ?? b.title.ko) : b.title.ko}</span>
                  {p && (
                    <span className="shrink-0 text-accent tabular-nums">
                      {p.n} / {p.total}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('study.badges')}>
        {(['all', ...BADGE_TIERS] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={tier === choice}
            onClick={() => setTier(choice)}
            data-testid={`badge-tier-${choice}`}
            className="min-h-11 rounded-pill bg-surface px-4 text-caption aria-pressed:bg-accent aria-pressed:text-accent-fg"
          >
            {t('journey.badgeTier.' + choice)}
          </button>
        ))}
      </div>
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
      <div className="grid gap-3 sm:grid-cols-2">
        {badges.map((b) => {
          const earned = value.snap.earnedBadges.has(b.id);
          const progress = value.badgeProgress.get(b.id);
          const title = lang === 'en' ? (b.title.en ?? b.title.ko) : b.title.ko;
          return (
            <article
              key={b.id}
              className="rounded-2xl border border-hairline bg-surface p-4"
              data-testid={`badge-${b.id}`}
            >
              <div
                aria-hidden
                className={
                  'mb-3 flex h-12 w-12 items-center justify-center rounded-full border text-2xl ' +
                  (earned
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-hairline bg-surface-2 text-muted')
                }
              >
                {earned ? '✦' : b.icon}
              </div>
              <p className="text-caption text-accent">
                {t(earned ? 'journey.earned' : 'journey.inProgress')} ·{' '}
                {t('journey.badgeTier.' + (b.tier ?? 'starter'))}
              </p>
              <h3 className="mt-1 text-body font-semibold">{title}</h3>
              <p className="mt-2 text-caption leading-6 text-muted">
                {b.id.startsWith('challenge-')
                  ? lang === 'en'
                    ? b.description.en
                    : b.description.ko
                  : t('journey.badgeGoals.' + b.rule.key, {
                      n: 'n' in b.rule ? b.rule.n : undefined,
                      signature: 'id' in b.rule ? t('journey.signatures.' + b.rule.id) : undefined,
                    })}
              </p>
              {progress && (
                <div className="mt-3">
                  <p className="text-caption text-accent tabular-nums">
                    {t('journey.badgeProgress', { n: progress.n, total: progress.total })}
                  </p>
                  <div
                    role="progressbar"
                    aria-label={title}
                    aria-valuemin={0}
                    aria-valuemax={progress.total}
                    aria-valuenow={progress.n}
                    className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-3"
                  >
                    <div
                      className="h-full rounded-pill bg-accent"
                      style={{ width: (progress.n / progress.total) * 100 + '%' }}
                    />
                  </div>
                </div>
              )}
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
