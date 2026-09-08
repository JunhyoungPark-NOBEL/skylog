import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { availableMissions, seasonOf } from '@/learn/engine';
import type { LearningState } from '@/learn/runtime';
import type { Text } from '@/learn/schema';
import { useObservingNight } from '@/features/tonight/useNight';
import { maxAltitudeInWindow } from '@/content/today';
import { useLocationStore } from '@/state/locationStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useClockStore } from '@/state/clockStore';
import { Card } from '@/ui/Card';
import { MissionCard } from './MissionCard';
import { navigateLearn } from './learnNavigation';
import { HopCourses } from './HopCourses';
export function CoursesScreen({
  value,
  pathId,
  missionId,
  hopCourseId,
  theme,
  group,
}: {
  value: LearningState;
  pathId: string | null;
  missionId: string | null;
  hopCourseId?: string | null;
  theme?: 'naked' | 'binoculars' | 'telescope' | null;
  group?: string | null;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const text = (x: Text) => (lang === 'en' ? (x.en ?? x.ko) : x.ko);
  const path = value.data.paths.find((p) => p.id === pathId);
  const mission = value.statuses.find((m) => m.mission.id === missionId);
  const equipment =
    theme ?? path?.level ?? (hopCourseId || group === 'starhop' ? 'telescope' : 'naked');
  const site = useLocationStore((s) => s.site);
  const night = useObservingNight();
  const [now, setNow] = useState(() => useClockStore.getState().now());
  useEffect(() => {
    const refresh = () => setNow(useClockStore.getState().now());
    const timer = window.setInterval(refresh, 60_000);
    const unsub = useClockStore.subscribe(refresh);
    return () => {
      window.clearInterval(timer);
      unsub();
    };
  }, []);
  const recommended = useMemo(() => {
    if (!value || !night?.darkSpan) return [];
    return availableMissions(value.statuses, {
      season: seasonOf(now),
      equipment: new Set([
        'naked',
        theme ??
          value.data.paths.find((p) => p.id === pathId)?.level ??
          (hopCourseId || group === 'starhop' ? 'telescope' : 'naked'),
      ]),
      altMaxOf: (id) => maxAltitudeInWindow(value.cat, id, site, night.darkSpan!),
    });
  }, [value, night, site, now, theme, pathId, hopCourseId, group]);

  return (
    <div className="space-y-5" data-testid="courses-screen">
      {hopCourseId ? (
        <HopCourses value={value} courseId={hopCourseId} />
      ) : mission ? (
        <MissionCard
          status={mission}
          state={value}
          onBack={() => navigateLearn('courses', { theme: equipment, path: pathId })}
        />
      ) : path ? (
        <>
          <button
            className="min-h-11 text-accent"
            onClick={() => navigateLearn('courses', { theme: equipment })}
          >
            ← {t('courseThemes.' + equipment)}
          </button>
          <h2 className="text-title">{text(path.title)}</h2>
          <p className="text-body leading-7 text-muted">{text(path.description)}</p>
          {path.missionIds.map((id, i) => {
            const s = value.statuses.find((m) => m.mission.id === id)!;
            return (
              <button
                key={id}
                onClick={() =>
                  navigateLearn('courses', { theme: equipment, path: pathId, mission: id })
                }
                className="flex min-h-20 w-full items-center gap-4 rounded-2xl border border-hairline bg-surface p-5 text-left"
                data-testid={'mission-' + id}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
                  {s.done ? '✓' : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold">{text(s.mission.title)}</span>
                  <span className="mt-1 block text-caption text-muted">
                    {s.mission.enabled === false
                      ? t('study.comingSoon')
                      : t('study.steps', { n: s.doneCount, total: s.total })}
                  </span>
                </span>
                <span aria-hidden>↗</span>
              </button>
            );
          })}
        </>
      ) : group === 'starhop' ? (
        <>
          <button
            className="min-h-11 text-accent"
            onClick={() => navigateLearn('courses', { theme: 'telescope' })}
          >
            ← {t('courseThemes.telescope')}
          </button>
          <HopCourses value={value} />
        </>
      ) : !theme ? (
        <section className="space-y-3" data-testid="course-themes">
          <p className="mb-4 text-body-sm text-muted">{t('courseThemes.intro')}</p>
          {(['naked', 'binoculars', 'telescope'] as const).map((kind, index) => (
            <button
              key={kind}
              data-testid={'course-theme-' + kind}
              className="flex min-h-28 w-full items-center gap-4 rounded-3xl bg-surface p-5 text-left shadow-card"
              onClick={() => navigateLearn('courses', { theme: kind })}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <CourseIcon kind={index} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-title">{t('courseThemes.' + kind)}</span>
                <span className="mt-1 block text-caption leading-5 text-muted">
                  {t('courseThemes.' + kind + 'Help')}
                </span>
              </span>
              <span className="text-muted" aria-hidden>
                ›
              </span>
            </button>
          ))}
        </section>
      ) : (
        <>
          <button className="min-h-11 text-accent" onClick={() => navigateLearn('courses')}>
            ← {t('courseThemes.all')}
          </button>
          <h2 className="text-headline">{t('courseThemes.' + equipment)}</h2>
          {equipment === 'telescope' && (
            <button
              data-testid="course-group-starhop"
              className="flex min-h-24 w-full items-center justify-between gap-3 rounded-3xl bg-accent-soft p-5 text-left text-accent"
              onClick={() => navigateLearn('courses', { theme: 'telescope', group: 'starhop' })}
            >
              <span>
                <span className="block text-title">{t('courseThemes.starhop')}</span>
                <span className="mt-1 block text-caption">{t('courseThemes.starhopHelp')}</span>
              </span>
              <span aria-hidden>›</span>
            </button>
          )}
          <details
            className="rounded-2xl border border-hairline px-4"
            data-testid="course-recommended"
          >
            <summary className="min-h-12 cursor-pointer content-center text-body-sm font-semibold">
              {t('study.available')}
            </summary>
            <Card>
              <p className="mb-3 text-caption text-muted">{t('study.visibilityNote')}</p>
              {recommended.length ? (
                recommended.slice(0, 3).map(({ status: s }) => (
                  <button
                    key={s.mission.id}
                    className="flex min-h-12 w-full items-center justify-between border-t border-hairline py-3 text-left text-body"
                    onClick={() =>
                      navigateLearn('courses', { theme: equipment, mission: s.mission.id })
                    }
                  >
                    <span>{text(s.mission.title)}</span>
                    <span className="text-caption text-muted">
                      {s.mission.estimatedMinutes} {t('study.minutes')} ↗
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-body-sm text-muted">{t('study.noMissionTonight')}</p>
              )}
            </Card>
          </details>
          <section>
            <h2 className="mb-3 px-1 text-title">{t('study.paths')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {value.data.paths
                .filter((p) => p.level === equipment)
                .map((p, i) => {
                  const count = p.missionIds.filter((id) =>
                    value.snap.completedMissions.has(id),
                  ).length;
                  return (
                    <button
                      key={p.id}
                      className="space-y-3 rounded-3xl border border-hairline bg-surface p-5 text-left"
                      onClick={() => navigateLearn('courses', { theme: equipment, path: p.id })}
                      data-testid={'path-' + p.id}
                    >
                      <div className="flex justify-between text-caption text-muted">
                        <span>
                          0{i + 1} · {t('object.equipment.' + p.level)}
                        </span>
                        <span>
                          {count}/{p.missionIds.length}
                        </span>
                      </div>
                      <h3 className="text-title">{text(p.title)}</h3>
                      <div className="h-1.5 rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: (count / p.missionIds.length) * 100 + '%' }}
                        />
                      </div>
                    </button>
                  );
                })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CourseIcon({ kind }: { kind: number }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {kind === 0 ? (
        <>
          <path d="M3 16s5-9 13-9 13 9 13 9-5 9-13 9S3 16 3 16Z" />
          <circle cx="16" cy="16" r="4" />
        </>
      ) : kind === 1 ? (
        <>
          <circle cx="9" cy="22" r="6" />
          <circle cx="23" cy="22" r="6" />
          <path d="m3 22 3-15h6l3 15m2 0 3-15h6l3 15M14 13h4" />
        </>
      ) : (
        <>
          <path d="m6 11 16-7 4 9-16 7Z M22 4l3-1 5 11-4 1M16 18v11m0-8-7 8m7-8 7 8M4 13l-2 1 3 6 4-2" />
        </>
      )}
    </svg>
  );
}
