import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { displayName } from '@/catalog/catalog';
import type { MissionStatus } from '@/learn/engine';
import {
  beginMission,
  checkMission,
  markFound,
  missionKey,
  type LearningState,
} from '@/learn/runtime';
import type { MissionStep, Text } from '@/learn/schema';
import { flyToObject } from '@/features/sky/skyApi';
import { openStory } from '@/state/contentUiStore';
import { openObservationForm, showToast } from '@/state/logUiStore';
import { useLearnUiStore } from '@/state/learnUiStore';
import { useSettingsStore } from '@/state/settingsStore';
const BUTTON =
  'min-h-11 rounded-pill bg-accent px-5 py-2 text-body-sm font-semibold text-accent-fg';
export function MissionCard({
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
