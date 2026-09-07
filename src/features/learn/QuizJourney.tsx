import { useTranslation } from 'react-i18next';
import type { LearningState } from '@/learn/runtime';
import { QUIZ_STAGES, stageTrack, stageNumber } from '@/learn/stages';
import { useLearnUiStore } from '@/state/learnUiStore';
import { navigateLearn } from './learnNavigation';

export function QuizJourney({
  value,
  chapter,
  track = 'sky',
}: {
  value: LearningState;
  chapter?: number;
  track?: string;
}) {
  const { t } = useTranslation();
  const openQuiz = useLearnUiStore((s) => s.openQuiz);
  const journey = value.journey.filter((p) => stageTrack(p.stage) === track);
  const trackStages = QUIZ_STAGES.filter((s) => stageTrack(s) === track);
  const chapterKey = track === 'observing' ? 'observingCourse.chapters.' : 'journey.chapters.';
  const current = journey.find((p) => p.unlocked && !p.result?.cleared) ?? journey.at(-1)!;
  const selectedChapter = [1, 2, 3].includes(chapter ?? 0) ? chapter! : current.stage.chapter;
  const stages = journey.filter((p) => p.stage.chapter === selectedChapter);
  const cleared = journey.filter((p) => p.result?.cleared).length;
  const score = journey.reduce((sum, p) => sum + (p.result?.score ?? 0), 0);
  const allDone = cleared === trackStages.length;
  return (
    <div className="space-y-6" data-testid="quiz-journey">
      <div className="grid grid-cols-2 gap-2" aria-label={t('observingCourse.choose')}>
        {['sky', 'observing'].map((key) => (
          <button
            key={key}
            data-testid={'quiz-track-' + key}
            aria-pressed={track === key}
            onClick={() => navigateLearn('quiz', { track: key })}
            className={
              'min-h-14 rounded-2xl border px-3 text-body-sm font-semibold ' +
              (track === key
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-hairline bg-surface')
            }
          >
            {t('observingCourse.' + key)}
          </button>
        ))}
      </div>
      <section className="relative overflow-hidden rounded-3xl border border-hairline bg-surface p-6">
        <svg
          aria-hidden
          className="pointer-events-none absolute -right-5 -top-8 h-44 w-44 text-accent opacity-20"
          viewBox="0 0 180 180"
          fill="none"
        >
          <circle cx="100" cy="78" r="62" stroke="currentColor" />
          <circle cx="100" cy="78" r="42" stroke="currentColor" />
          <circle cx="100" cy="78" r="16" fill="currentColor" />
          <circle cx="43" cy="54" r="5" fill="currentColor" />
          <path d="m147 101 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="currentColor" />
        </svg>
        <div className="relative">
          <p className="text-caption font-semibold text-accent">
            {t(allDone ? 'journey.allDone' : 'journey.yourNext')}
          </p>
          <h2 className="mt-3 max-w-[80%] text-headline">
            {t(chapterKey + current.stage.chapter + '.title')}
          </h2>
          <p className="mt-2 text-body-sm text-muted">
            {t('journey.stageHeading', { n: stageNumber(current.stage) })} ·{' '}
            {t('journey.themes.' + current.stage.theme)}
          </p>
          <button
            className="mt-5 flex min-h-12 w-full items-center justify-between gap-3 rounded-pill bg-accent px-5 py-3 font-semibold text-accent-fg"
            data-testid="learn-quiz-start"
            onClick={() => openQuiz({ stageId: current.stage.id })}
          >
            <span>
              {t(allDone ? 'journey.replay' : cleared ? 'journey.continue' : 'journey.start')}
            </span>
            <span className="shrink-0 whitespace-nowrap text-caption">
              {t('journey.questions', { n: current.stage.questions.length })} →
            </span>
          </button>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-caption text-muted">
            <span>{t('journey.completedCount', { n: cleared, total: trackStages.length })}</span>
            <span data-testid="journey-total">
              {t('journey.personalScore', { n: score.toLocaleString() })}
            </span>
          </div>
        </div>
      </section>
      <section aria-label={t('journey.chapterSelect')}>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              aria-pressed={selectedChapter === n}
              data-testid={'journey-chapter-' + n}
              onClick={() => navigateLearn('quiz', { chapter: n, track })}
              className={
                'min-h-16 rounded-2xl border px-2 py-3 text-center ' +
                (selectedChapter === n
                  ? 'border-accent bg-accent-soft'
                  : 'border-hairline bg-surface')
              }
            >
              <span className="block text-caption text-muted">
                0{n} · {t(chapterKey + n + '.level')}
              </span>
              <span className="mt-1 block text-body-sm font-semibold">
                {t(chapterKey + n + '.title')}
              </span>
            </button>
          ))}
        </div>
        <p className="px-1 pb-2 pt-4 text-body-sm leading-6 text-muted">
          {t(chapterKey + selectedChapter + '.description')}
        </p>
        <ol className="mt-2 space-y-3">
          {stages.map((p, i) => (
            <li key={p.stage.id}>
              {(i === 0 || stages[i - 1]?.stage.theme !== p.stage.theme) && (
                <h3 className="pb-3 pt-4 text-title">{t('journey.themes.' + p.stage.theme)}</h3>
              )}
              <button
                disabled={!p.unlocked}
                onClick={() => openQuiz({ stageId: p.stage.id })}
                data-testid={'stage-' + p.stage.id}
                className={
                  'flex min-h-20 w-full items-center gap-4 rounded-2xl border p-4 text-left ' +
                  (p.result?.cleared
                    ? 'border-hairline bg-surface'
                    : p.unlocked
                      ? 'border-accent bg-accent-soft'
                      : 'border-hairline bg-surface-2')
                }
              >
                <span
                  aria-hidden
                  className={
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-title ' +
                    (p.result?.cleared
                      ? 'border-accent bg-accent text-accent-fg'
                      : p.unlocked
                        ? 'border-accent text-accent'
                        : 'border-hairline text-muted')
                  }
                >
                  {p.result?.cleared ? '✓' : String(stageNumber(p.stage)).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold">
                    {t('journey.themes.' + p.stage.theme)} {p.stage.part}
                  </span>
                  <span className="mt-1 block text-caption text-muted">
                    {t(
                      !p.unlocked
                        ? 'journey.locked'
                        : p.result
                          ? 'journey.best'
                          : 'journey.questionCount',
                      { n: p.result?.score ?? p.stage.questions.length },
                    )}
                  </span>
                </span>
                {p.result ? (
                  <span
                    className="shrink-0 text-accent"
                    aria-label={t('journey.stars', { n: p.result.stars })}
                  >
                    {'★'.repeat(p.result.stars)}
                    {'☆'.repeat(3 - p.result.stars)}
                  </span>
                ) : p.unlocked ? (
                  <span aria-hidden className="text-accent">
                    →
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ol>
      </section>
      <p className="px-1 text-caption leading-6 text-muted">{t('journey.rules')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          data-testid="learn-review"
          disabled={!value.due.length}
          onClick={() => openQuiz({ review: true, limit: 10 })}
          className="min-h-16 rounded-2xl bg-surface px-4 py-3 text-left disabled:opacity-60"
        >
          <span className="block text-body font-semibold">{t('study.review')}</span>
          <span className="mt-1 block text-caption text-muted">
            {t(value.due.length ? 'study.dueCount' : 'study.noReview', { n: value.due.length })}
          </span>
        </button>
        <button
          onClick={() => openQuiz({ limit: 5 })}
          className="min-h-16 rounded-2xl bg-surface px-4 py-3 text-left"
        >
          <span className="block text-body font-semibold">{t('journey.freePractice')}</span>
          <span className="mt-1 block text-caption text-muted">
            {t('journey.freePracticeNote')}
          </span>
        </button>
      </div>
    </div>
  );
}
