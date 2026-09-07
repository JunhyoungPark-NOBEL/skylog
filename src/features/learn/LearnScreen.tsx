import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { displayName } from '@/catalog/catalog';
import { availableMissions, seasonOf, type MissionStatus } from '@/learn/engine';
import {
  beginMission,
  checkMission,
  markFound,
  missionKey,
  type LearningState,
} from '@/learn/runtime';
import type { MissionStep, Text } from '@/learn/schema';
import { TodayCard } from '@/features/content/TodayCard';
import { StatsCard } from '@/features/log/StatsCard';
import { useObservingNight } from '@/features/tonight/useNight';
import { maxAltitudeInWindow } from '@/content/today';
import { flyToObject } from '@/features/sky/skyApi';
import { openStory } from '@/state/contentUiStore';
import { openObservationForm, showToast } from '@/state/logUiStore';
import { useLearnUiStore } from '@/state/learnUiStore';
import { useLocationStore } from '@/state/locationStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useClockStore } from '@/state/clockStore';
import { useLearning } from './useLearning';
import { Card } from '@/ui/Card';

const BUTTON =
  'min-h-11 rounded-pill bg-accent px-5 py-2 text-body-sm font-semibold text-accent-fg';
export function LearnScreen() {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const text = (x: Text) => (lang === 'en' ? (x.en ?? x.ko) : x.ko);
  const { value, error, retry } = useLearning();
  const [pathId, setPathId] = useState<string | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [library, setLibrary] = useState(false);
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
  if (!value)
    return (
      <div className="p-5">
        <p role="status">{t(error ? 'study.loadError' : 'common.loading')}</p>
        {error && (
          <button className={BUTTON} onClick={retry}>
            {t('study.retry')}
          </button>
        )}
      </div>
    );
  const path = value.data.paths.find((p) => p.id === pathId);
  const mission = value.statuses.find((m) => m.mission.id === missionId);
  const openQuiz = useLearnUiStore.getState().openQuiz;
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5" data-testid="learn-screen">
      <header className="px-1">
        <p className="text-label font-semibold tracking-[0.18em] text-accent">LEARN · EXPLORE</p>
        <h1 className="mt-2 text-headline">{t('study.title')}</h1>
        <p className="mt-2 text-body leading-7 text-muted">{t('study.intro')}</p>
      </header>
      {mission ? (
        <MissionCard status={mission} state={value} onBack={() => setMissionId(null)} />
      ) : path ? (
        <>
          <button className="min-h-11 text-accent" onClick={() => setPathId(null)}>
            ← {t('study.allPaths')}
          </button>
          <h2 className="text-title">{text(path.title)}</h2>
          <p className="text-body leading-7 text-muted">{text(path.description)}</p>
          {path.missionIds.map((id, i) => {
            const s = value.statuses.find((m) => m.mission.id === id)!;
            return (
              <button
                key={id}
                onClick={() => setMissionId(id)}
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
          <TodayCard night={night} now={now} />
          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-3xl bg-accent-soft p-5 text-left"
              onClick={() => openQuiz({ limit: 5 })}
              data-testid="learn-quiz-start"
            >
              <span className="text-title text-accent">{t('study.quickQuiz')}</span>
              <span className="mt-2 block text-caption text-muted">{t('study.fiveQuestions')}</span>
            </button>
            <button
              className="rounded-3xl border border-hairline bg-surface p-5 text-left"
              disabled={!value.due.length}
              onClick={() => openQuiz({ review: true, limit: 10 })}
              data-testid="learn-review"
            >
              <span className="text-title">{t('study.review')}</span>
              <span className="mt-2 block text-caption text-muted">
                {t(value.due.length ? 'study.dueCount' : 'study.noReview', { n: value.due.length })}
              </span>
            </button>
          </div>
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
              recommended.map(({ status: s }) => (
                <button
                  key={s.mission.id}
                  className="flex min-h-12 w-full items-center justify-between border-t border-hairline py-3 text-left text-body"
                  onClick={() => setMissionId(s.mission.id)}
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
                    onClick={() => setPathId(p.id)}
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
          <Card
            title={t('study.badges')}
            aside={value.badges.length + ' / ' + value.data.badges.length}
          >
            <div className="grid grid-cols-2 gap-3">
              {value.data.badges.map((b) => (
                <div
                  key={b.id}
                  className={
                    'rounded-2xl p-3 ' +
                    (value.snap.earnedBadges.has(b.id) ? 'bg-accent-soft' : 'bg-surface-2')
                  }
                >
                  <div className="mb-1 text-xl text-accent" aria-hidden>
                    {value.snap.earnedBadges.has(b.id) ? '✦' : '◇'}
                  </div>
                  <p className="text-body-sm font-semibold">{text(b.title)}</p>
                  <p className="mt-1 text-caption leading-5 text-muted">{text(b.description)}</p>
                </div>
              ))}
            </div>
          </Card>
          <button
            className="min-h-12 w-full rounded-pill bg-surface-2 text-accent"
            onClick={() => setLibrary(!library)}
          >
            {t('study.observationProgress')} {library ? '−' : '+'}
          </button>
          {library && (
            <StatsCard observations={[...value.snap.observations]} cat={value.cat} lang={lang} />
          )}
          <p className="px-2 text-caption leading-6 text-muted">{t('study.upcoming')}</p>
        </>
      )}
    </div>
  );
}
function MissionCard({
  status,
  state,
  onBack,
}: {
  status: MissionStatus;
  state: LearningState;
  onBack(): void;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const text = (x: Text) => (lang === 'en' ? (x.en ?? x.ko) : x.ko);
  const m = status.mission;
  const started = state.starts.has(m.id);
  const [busy, setBusy] = useState(false);
  const [darkConfirmed, setDarkConfirmed] = useState(false);
  const [linkOld, setLinkOld] = useState(false);
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch {
      showToast(t('study.saveError'));
    } finally {
      setBusy(false);
    }
  };
  const name = (id: Parameters<typeof displayName>[1]) => displayName(state.cat, id, lang);
  const action = (step: MissionStep, i: number) => {
    if (step.type === 'read')
      return (
        <button className={BUTTON} onClick={() => openStory(step.contentId)}>
          {t('study.read')} · {name(step.contentId)}
        </button>
      );
    if (step.type === 'quiz')
      return (
        <button
          className={BUTTON}
          onClick={() =>
            useLearnUiStore.getState().openQuiz({ ids: step.quizIds, limit: step.quizIds.length })
          }
        >
          {t('study.quiz')}
        </button>
      );
    if (step.type === 'observe')
      return (
        <button className={BUTTON} onClick={() => openObservationForm({ objectId: step.objectId })}>
          {t('study.record')} · {name(step.objectId)}
        </button>
      );
    if (step.type === 'find')
      return (
        <div className="space-y-3">
          <p className="text-body-sm leading-6 text-muted">{text(step.hint)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className={BUTTON}
              onClick={() => {
                flyToObject(step.objectId);
                navigate('sky');
              }}
            >
              {t('study.find')} · {name(step.objectId)}
            </button>
            <button
              className="min-h-11 rounded-pill bg-surface-3 px-4 text-body-sm"
              onClick={() => void perform(() => markFound(step.objectId))}
            >
              {t('study.confirmFound')}
            </button>
          </div>
        </div>
      );
    if (step.type === 'checklist')
      return (
        <div>
          {step.items.map((item, j) => (
            <label key={j} className="flex min-h-12 items-center gap-3 text-body-sm">
              <input
                type="checkbox"
                checked={state.snap.checked.has(missionKey(m) + ':' + i + ':' + j)}
                onChange={(event) =>
                  void perform(() => checkMission(m, i, j, event.target.checked))
                }
              />
              {text(item)}
            </label>
          ))}
        </div>
      );
    if (step.type === 'skill')
      return (
        <button
          className={BUTTON}
          onClick={() => {
            if (step.skill === 'backup') navigate('backup');
            else if (step.skill === 'sketch')
              openObservationForm({
                objectId: m.steps.find((s) => s.type === 'observe')?.objectId ?? 'moon',
              });
            else navigate('sky');
          }}
        >
          {t('study.skill.' + step.skill)}
        </button>
      );
    return (
      <button className={BUTTON} onClick={() => navigate('log')}>
        {t('study.records')}
      </button>
    );
  };
  return (
    <section className="space-y-4" data-testid="mission-detail">
      <button className="min-h-11 text-accent" onClick={onBack}>
        ← {t('study.back')}
      </button>
      <div className="rounded-3xl bg-surface p-5">
        <p className="text-caption text-accent">
          {m.estimatedMinutes} {t('study.minutes')} · {t('object.equipment.' + m.level)}
        </p>
        <h2 className="mt-2 text-headline">{text(m.title)}</h2>
        <p className="mt-3 text-body leading-7 text-muted">{text(m.description)}</p>
        {m.enabled === false ? (
          <p className="mt-4 text-body-sm text-muted">{t('study.comingSoon')}</p>
        ) : !started ? (
          <>
            {m.requires?.darkSky && (
              <label className="mt-4 flex min-h-12 items-center gap-3 text-body-sm">
                <input
                  type="checkbox"
                  checked={darkConfirmed}
                  onChange={(e) => setDarkConfirmed(e.target.checked)}
                />
                {t('study.darkConfirm')}
              </label>
            )}
            <label className="mt-3 flex min-h-12 items-center gap-3 text-body-sm">
              <input
                type="checkbox"
                checked={linkOld}
                onChange={(e) => setLinkOld(e.target.checked)}
              />
              {t('study.linkOld')}
            </label>
            <button
              className={BUTTON + ' mt-3 disabled:opacity-40'}
              disabled={busy || status.locked || (!!m.requires?.darkSky && !darkConfirmed)}
              onClick={() =>
                void perform(() =>
                  beginMission(m, linkOld ? state.snap.observations.map((o) => o.id) : []),
                )
              }
              data-testid="mission-start"
            >
              {t(status.locked ? 'study.locked' : 'study.startMission')}
            </button>
          </>
        ) : (
          <p className="mt-4 text-body-sm text-accent" data-testid="mission-progress">
            {t(status.done ? 'study.missionDone' : 'study.steps', {
              n: status.doneCount,
              total: status.total,
            })}
          </p>
        )}
      </div>
      {status.steps.map((s, i) => (
        <div key={i} className="rounded-2xl border border-hairline bg-surface p-5">
          <p className="mb-3 text-label text-accent">
            {s.done ? '✓' : String(i + 1).padStart(2, '0')} · {t('study.step.' + s.step.type)}
          </p>
          <fieldset
            disabled={!started || m.enabled === false || busy}
            className="disabled:opacity-40"
          >
            {action(s.step, i)}
          </fieldset>
        </div>
      ))}
    </section>
  );
}
