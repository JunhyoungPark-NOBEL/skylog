import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { LearningState } from '@/learn/runtime';
import type { Badge } from '@/learn/schema';
import { groupAchievements, type AchievementGroup } from '@/learn/achievementGroups';
import { useSettingsStore } from '@/state/settingsStore';
import { StatsCard } from '@/features/log/StatsCard';
import { AchievementMark } from './AchievementMark';

function AchievementDetails({
  badge,
  group,
  value,
  onClose,
}: {
  badge: Badge;
  group: AchievementGroup;
  value: LearningState;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const description = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const earned = value.snap.earnedBadges.has(badge.id);
  const progress = value.badgeProgress.get(badge.id);
  const shortName = t(
    badge.rule.key === 'seasonSignature'
      ? 'achievementCollection.signatures.' + badge.rule.id
      : 'achievementCollection.short.' + badge.rule.key,
    {
      n: 'n' in badge.rule ? badge.rule.n : undefined,
    },
  );
  const title =
    lang === 'en'
      ? (badge.title.en ??
        (badge.rule.key === 'constellationCount'
          ? t('achievementCollection.constellationTitle', { n: badge.rule.n })
          : shortName))
      : badge.title.ko;
  const goal = badge.id.startsWith('challenge-')
    ? lang === 'en'
      ? badge.description.en
      : badge.description.ko
    : t('journey.badgeGoals.' + badge.rule.key, {
        n: 'n' in badge.rule ? badge.rule.n : undefined,
        signature: 'id' in badge.rule ? t('journey.signatures.' + badge.rule.id) : undefined,
      });
  return createPortal(
    <dialog
      ref={ref}
      onClose={() => {
        // StrictMode 재실행에서 닫힘 이벤트가 늦게 와도 다시 열린 창을 닫지 않는다.
        if (ref.current && !ref.current.open) onClose();
      }}
      aria-labelledby={heading}
      aria-describedby={description}
      data-testid="achievement-details"
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus();
        }
      }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border border-hairline bg-surface p-5 text-fg shadow-card backdrop:bg-black/60"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          ref.current?.close();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <AchievementMark group={group} />
        </div>
        <button
          type="button"
          autoFocus
          aria-label={t('common.close')}
          onClick={() => ref.current?.close()}
          className="min-h-11 min-w-11 rounded-full bg-surface-2 text-body"
        >
          ✕
        </button>
      </div>
      <p className="mt-4 text-caption text-accent">
        {t('achievementCollection.groups.' + group)} ·{' '}
        {t('journey.badgeTier.' + (badge.tier ?? 'starter'))}
      </p>
      <h2 id={heading} className="mt-2 break-words text-title">
        {title}
      </h2>
      <p className="mt-2 text-body-sm font-semibold text-accent">
        {t(earned ? 'journey.earned' : 'journey.inProgress')}
      </p>
      <h3 className="mt-5 text-caption font-semibold">{t('achievementCollection.condition')}</h3>
      <p id={description} className="mt-2 text-body-sm leading-relaxed text-muted">
        {goal}
      </p>
      {progress && (
        <div className="mt-4">
          <p className="text-caption tabular-nums text-accent">
            {t('journey.badgeProgress', { n: progress.n, total: progress.total })}
          </p>
          <div
            role="progressbar"
            aria-label={title}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.n}
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{
                width: `${progress.total ? Math.min(1, progress.n / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}
      <p className="mt-4 text-caption leading-relaxed text-muted">{t('journey.badgeEvidence')}</p>
    </dialog>,
    document.body,
  );
}

export function AchievementsScreen({ value }: { value: LearningState }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const [earnedOnly, setEarnedOnly] = useState(false);
  const [stats, setStats] = useState(false);
  const [selected, setSelected] = useState<{ badge: Badge; group: AchievementGroup } | null>(null);
  const groups = groupAchievements(value.data.badges, value.snap.earnedBadges);
  const total = groups.reduce((n, group) => n + group.items.length, 0);
  const earned = groups.reduce((n, group) => n + group.earned, 0);
  return (
    <div className="space-y-5" data-testid="achievements-screen">
      <section className="rounded-2xl bg-accent-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-body font-semibold">{t('journey.myCollection')}</h2>
          <p className="text-body-sm text-accent" data-testid="achievement-total">
            <strong className="text-title tabular-nums">
              {earned} / {total}
            </strong>{' '}
            {t('achievementCollection.completed')}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={earned}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={t('journey.myCollection')}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${total ? (earned / total) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-3 text-caption text-muted">{t('achievementCollection.tapHint')}</p>
      </section>
      <button
        type="button"
        className="flex min-h-11 items-center gap-2 rounded-pill bg-surface px-3 text-caption"
        aria-pressed={earnedOnly}
        onClick={() => setEarnedOnly(!earnedOnly)}
      >
        <span
          aria-hidden
          className="flex h-4 w-4 items-center justify-center rounded border border-muted text-accent"
        >
          {earnedOnly ? '✓' : ''}
        </span>
        {t('journey.earnedOnly')}
      </button>
      {earnedOnly && earned === 0 && (
        <p className="text-body-sm text-muted">{t('journey.noBadges')}</p>
      )}
      {groups
        .filter((group) => !earnedOnly || group.earned > 0)
        .map((group) => (
          <section
            key={group.id}
            aria-labelledby={`achievement-group-${group.id}`}
            data-testid={`achievement-group-${group.id}`}
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 id={`achievement-group-${group.id}`} className="text-body-sm font-semibold">
                {t('achievementCollection.groups.' + group.id)}
              </h3>
              <p
                className="shrink-0 text-caption tabular-nums text-muted"
                data-testid="achievement-group-count"
              >
                {group.earned} / {group.items.length}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2" data-testid="achievement-grid">
              {group.items
                .filter((badge) => !earnedOnly || value.snap.earnedBadges.has(badge.id))
                .map((badge) => {
                  const done = value.snap.earnedBadges.has(badge.id);
                  const progress = value.badgeProgress.get(badge.id);
                  const name = t(
                    badge.rule.key === 'seasonSignature'
                      ? 'achievementCollection.signatures.' + badge.rule.id
                      : 'achievementCollection.short.' + badge.rule.key,
                    {
                      n: 'n' in badge.rule ? badge.rule.n : undefined,
                    },
                  );
                  return (
                    <article key={badge.id} data-testid={`badge-${badge.id}`} data-earned={done}>
                      <button
                        type="button"
                        onClick={() => setSelected({ badge, group: group.id })}
                        aria-haspopup="dialog"
                        aria-label={t('achievementCollection.open', {
                          name,
                          status: t(done ? 'journey.earned' : 'journey.inProgress'),
                        })}
                        className={
                          'flex h-full w-full min-w-0 flex-col items-center rounded-2xl border px-1.5 py-3 text-center ' +
                          (done ? 'border-accent/50 bg-accent-soft' : 'border-hairline bg-surface')
                        }
                      >
                        <span
                          aria-hidden
                          className={
                            'relative mb-2 flex h-11 w-11 items-center justify-center rounded-full ' +
                            (done ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-muted')
                          }
                        >
                          <AchievementMark group={group.id} />
                          {done ? (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-accent-fg">
                              ✓
                            </span>
                          ) : (
                            <svg
                              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-surface-2 p-0.5"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            >
                              <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" />
                              <rect x="2" y="5" width="8" height="6" rx="1.5" />
                            </svg>
                          )}
                        </span>
                        <span
                          className="block min-h-8 w-full min-w-0 break-words text-[0.75rem] font-semibold leading-4 text-fg [overflow-wrap:anywhere]"
                          data-testid="achievement-short-name"
                        >
                          {name}
                        </span>
                        <span
                          className={
                            'mt-1 text-[0.6875rem] leading-4 tabular-nums ' +
                            (done ? 'text-accent' : 'text-muted')
                          }
                        >
                          {done
                            ? t('journey.earned')
                            : progress
                              ? `${progress.n} / ${progress.total}`
                              : t('journey.inProgress')}
                        </span>
                        {progress && (
                          <span
                            role="progressbar"
                            aria-label={name}
                            aria-valuemin={0}
                            aria-valuemax={progress.total}
                            aria-valuenow={progress.n}
                            className="mt-2 h-1 w-3/4 overflow-hidden rounded-full bg-surface-3"
                          >
                            <span
                              className="block h-full rounded-full bg-accent"
                              style={{
                                width: `${progress.total ? Math.min(1, progress.n / progress.total) * 100 : 0}%`,
                              }}
                            />
                          </span>
                        )}
                      </button>
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
      <button
        type="button"
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
      {selected && (
        <AchievementDetails
          badge={selected.badge}
          group={selected.group}
          value={value}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
