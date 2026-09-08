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
}: {
  value: LearningState;
  pathId: string | null;
  missionId: string | null;
  hopCourseId?: string | null;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const text = (x: Text) => (lang === 'en' ? (x.en ?? x.ko) : x.ko);
  const [equipment, setEquipment] = useState<'naked' | 'binoculars' | 'telescope'>('naked');
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
      equipment: new Set(['naked', equipment]),
      altMaxOf: (id) => maxAltitudeInWindow(value.cat, id, site, night.darkSpan!),
    });
  }, [value, night, site, now, equipment]);

  const path = value.data.paths.find((p) => p.id === pathId);
  const mission = value.statuses.find((m) => m.mission.id === missionId);
  return (
    <div className="space-y-5" data-testid="courses-screen">
      {hopCourseId ? (
        <HopCourses value={value} courseId={hopCourseId} />
      ) : mission ? (
        <MissionCard
          status={mission}
          state={value}
          onBack={() => navigateLearn('courses', { path: pathId })}
        />
      ) : path ? (
        <>
          <button className="min-h-11 text-accent" onClick={() => navigateLearn('courses')}>
            ← {t('study.allPaths')}
          </button>
          <h2 className="text-title">{text(path.title)}</h2>
          <p className="text-body leading-7 text-muted">{text(path.description)}</p>
          {path.missionIds.map((id, i) => {
            const s = value.statuses.find((m) => m.mission.id === id)!;
            return (
              <button
                key={id}
                onClick={() => navigateLearn('courses', { path: pathId, mission: id })}
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
      ) : (
        <>
          <Card title={t('study.available')}>
            <label className="flex min-h-11 items-center justify-between text-body-sm text-muted">
              {t('study.equipment')}
              <select
                className="rounded-pill bg-surface-2 px-4 py-2 text-fg"
                value={equipment}
                onChange={(event) => setEquipment(event.target.value as typeof equipment)}
              >
                {(['naked', 'binoculars', 'telescope'] as const).map((v) => (
                  <option key={v} value={v}>
                    {t('object.equipment.' + v)}
                  </option>
                ))}
              </select>
            </label>
            <p className="mb-3 text-caption text-muted">{t('study.visibilityNote')}</p>
            {recommended.length ? (
              recommended.slice(0, 3).map(({ status: s }) => (
                <button
                  key={s.mission.id}
                  className="flex min-h-12 w-full items-center justify-between border-t border-hairline py-3 text-left text-body"
                  onClick={() => navigateLearn('courses', { mission: s.mission.id })}
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
          <HopCourses value={value} />
          <section>
            <h2 className="mb-3 px-1 text-title">{t('study.paths')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {value.data.paths.map((p, i) => {
                const count = p.missionIds.filter((id) =>
                  value.snap.completedMissions.has(id),
                ).length;
                return (
                  <button
                    key={p.id}
                    className="space-y-3 rounded-3xl border border-hairline bg-surface p-5 text-left"
                    onClick={() => navigateLearn('courses', { path: p.id })}
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
