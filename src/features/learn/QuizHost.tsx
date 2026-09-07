import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readLearning, recordAnswer, recordStageAnswer, selectQuiz } from '@/learn/runtime';
import {
  QUIZ_STAGES,
  stageQuestions,
  nextStage,
  stageNumber,
  type StageResult,
} from '@/learn/stages';
import { newId } from '@/db/database';
import type { QuizItem, Text } from '@/learn/schema';
import { useLearnUiStore, type QuizRequest } from '@/state/learnUiStore';
import { useSettingsStore } from '@/state/settingsStore';
import { openStory } from '@/state/contentUiStore';
import { ScrollArea } from '@/ui/ScrollArea';

export function QuizHost() {
  const request = useLearnUiStore((s) => s.quiz);
  const close = useLearnUiStore((s) => s.closeQuiz);
  return request ? <QuizSession key={request.sessionId} request={request} onClose={close} /> : null;
}
function QuizSession({ request, onClose }: { request: QuizRequest; onClose(): void }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const text = (v: Text) => (lang === 'en' ? (v.en ?? v.ko) : v.ko);
  const stage = QUIZ_STAGES.find((s) => s.id === request.stageId);
  const [runId] = useState(newId);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [questions, setQuestions] = useState<QuizItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | boolean | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    void readLearning()
      .then((s) => {
        if (alive) {
          if (request.stageId) {
            if (!stage || !s.journey.find((p) => p.stage.id === stage.id)?.unlocked)
              throw new Error('Stage locked');
            setQuestions(stageQuestions(stage, s.data.quiz));
          } else setQuestions(selectQuiz(s, request));
          setError(false);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [request, retry, stage]);
  useEffect(() => {
    heading.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose, index, questions]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = dialog.current;
    if (!root) return;
    const siblings = [...(root.parentElement?.children ?? [])].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== root,
    );
    const inert = siblings.map((el) => el.inert);
    siblings.forEach((el) => {
      el.inert = true;
    });
    root.focus();
    return () => {
      siblings.forEach((el, i) => {
        el.inert = inert[i]!;
      });
      previous?.focus({ preventScroll: true });
    };
  }, []);
  const q = questions?.[index];
  const submitted = answers.length > index;
  const done = questions !== null && index >= questions.length;
  const options =
    q?.type === 'trueFalse'
      ? [
          { value: true, label: t('study.true') },
          { value: false, label: t('study.false') },
        ]
      : (q?.choices?.map((c, i) => ({ value: i, label: text(c) })) ?? []);
  const submit = async () => {
    if (!q || choice === null || submitted || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      const response = stage
        ? await recordStageAnswer(stage.id, runId, index, choice)
        : { correct: await recordAnswer(q, choice), result: null };
      const correct = response.correct;
      if (response.result) setStageResult(response.result);
      setAnswers((a) => [...a, correct]);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const next = () => {
    setChoice(null);
    setIndex((n) => n + 1);
    setError(false);
  };
  return (
    <div
      ref={dialog}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = [
          ...(dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], [tabindex="0"]',
          ) ?? []),
        ].filter(
          (el) => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length > 0,
        );
        const first = buttons[0],
          last = buttons.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !buttons.includes(document.activeElement as HTMLElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      className="fixed inset-0 z-[60] flex flex-col bg-bg text-fg"
      role="dialog"
      aria-modal="true"
      aria-label={t('study.quiz')}
      data-testid="quiz-host"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+16px)]">
        <span className="text-label font-semibold tracking-[0.18em] text-accent">
          {stage ? t('journey.stageHeading', { n: stageNumber(stage) }) : t('study.quiz')}
        </span>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto w-full max-w-xl space-y-6 px-5 py-4 pb-10">
          {!questions && <p role="status">{t(error ? 'study.loadError' : 'common.loading')}</p>}
          {!questions && error && (
            <button
              className="min-h-11 rounded-pill bg-accent px-5 text-accent-fg"
              onClick={() => setRetry((n) => n + 1)}
            >
              {t('study.retry')}
            </button>
          )}
          {q && (
            <>
              <div className="flex items-center justify-between text-caption text-muted">
                <span>{stage ? t('journey.themes.' + stage.theme) : t('study.smallSteps')}</span>
                <span className="tabular-nums">
                  {index + 1} / {questions!.length}
                </span>
              </div>
              <div className="flex gap-2" aria-label={t('study.progress')}>
                {questions!.map((item, i) => (
                  <div
                    key={item.id}
                    className={
                      'h-1.5 flex-1 rounded-full ' + (i <= index ? 'bg-accent' : 'bg-surface-3')
                    }
                  />
                ))}
              </div>
              <section
                className="rounded-3xl border border-hairline bg-surface p-6 shadow-card"
                data-testid="quiz-card"
              >
                <p className="mb-3 text-label text-muted">
                  {t('study.questionNumber', { n: index + 1 })}
                </p>
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className="text-headline leading-snug outline-none"
                  data-testid="quiz-question"
                >
                  {text(q.question)}
                </h1>
                {lang === 'en' && !q.question.en && (
                  <p className="mt-3 text-caption text-muted">{t('study.koreanContent')}</p>
                )}
              </section>
              <div role="radiogroup" aria-label={t('study.choose')} className="space-y-3">
                {options.map((option, i) => {
                  const selected = choice === option.value;
                  const correct = submitted && option.value === q.answer;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={choice === null ? (i === 0 ? 0 : -1) : selected ? 0 : -1}
                      onKeyDown={(event) => {
                        if (
                          ![
                            'ArrowDown',
                            'ArrowUp',
                            'ArrowLeft',
                            'ArrowRight',
                            'Home',
                            'End',
                          ].includes(event.key)
                        )
                          return;
                        event.preventDefault();
                        const nextIndex =
                          event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? options.length - 1
                              : (i +
                                  (event.key === 'ArrowDown' || event.key === 'ArrowRight'
                                    ? 1
                                    : -1) +
                                  options.length) %
                                options.length;
                        setChoice(options[nextIndex]!.value);
                        dialog.current
                          ?.querySelector<HTMLElement>(
                            '[data-testid="quiz-choice-' + nextIndex + '"]',
                          )
                          ?.focus();
                      }}
                      disabled={submitted || busy}
                      onClick={() => setChoice(option.value)}
                      data-testid={'quiz-choice-' + i}
                      className={
                        'flex min-h-16 w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left text-body transition-colors ' +
                        (correct
                          ? 'border-success bg-success-soft'
                          : selected
                            ? 'border-accent bg-accent-soft'
                            : 'border-hairline bg-surface')
                      }
                    >
                      <span
                        aria-hidden
                        className={
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption ' +
                          (selected ? 'bg-accent text-accent-fg' : 'bg-surface-3 text-muted')
                        }
                      >
                        {correct ? '✓' : String.fromCharCode(65 + i)}
                      </span>
                      <span className="min-w-0 flex-1">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <section
                  role="status"
                  className="rounded-2xl bg-surface-2 p-5"
                  data-testid="quiz-explanation"
                >
                  <h2 className="mb-2 text-title text-accent">
                    {t(answers[index] ? 'study.correct' : 'study.discover')}
                  </h2>
                  {!answers[index] && (
                    <p className="mb-2 text-body font-semibold">
                      {t('study.answer')}: {options.find((o) => o.value === q.answer)?.label}
                    </p>
                  )}
                  <p className="whitespace-pre-line text-body leading-7">{text(q.explanation)}</p>
                </section>
              )}
              {error && (
                <p role="alert" className="text-body-sm text-danger">
                  {t('study.saveError')}
                </p>
              )}
              <button
                type="button"
                disabled={choice === null || busy}
                onClick={() => {
                  if (submitted) next();
                  else void submit();
                }}
                className="min-h-14 w-full rounded-pill bg-accent px-6 text-body-lg font-semibold text-accent-fg disabled:opacity-40"
                data-testid="quiz-next"
              >
                {t(
                  busy
                    ? 'study.saving'
                    : submitted
                      ? index === questions!.length - 1
                        ? 'study.results'
                        : 'study.next'
                      : 'study.checkAnswer',
                )}
              </button>
            </>
          )}
          {done && (
            <section
              className="space-y-5 rounded-3xl bg-surface p-6 text-center"
              data-testid="quiz-results"
            >
              <div className="text-4xl text-accent" aria-hidden>
                ✦
              </div>
              <h1 ref={heading} tabIndex={-1} className="text-headline">
                {t(
                  stageResult
                    ? stageResult.cleared
                      ? 'journey.cleared'
                      : 'journey.tryAgainTitle'
                    : questions.length
                      ? 'study.finished'
                      : 'study.noQuestions',
                )}
              </h1>
              {questions.length > 0 && (
                <>
                  <p className="text-display tabular-nums">
                    {answers.filter(Boolean).length}
                    <span className="text-title text-muted"> / {questions.length}</span>
                  </p>
                  {stageResult ? (
                    <div className="space-y-3" data-testid="stage-result">
                      <p
                        className="text-3xl tracking-widest text-accent"
                        aria-label={t('journey.stars', { n: stageResult.stars })}
                      >
                        {'★'.repeat(stageResult.stars)}
                        {'☆'.repeat(3 - stageResult.stars)}
                      </p>
                      <p className="text-title">{t('journey.score', { n: stageResult.score })}</p>
                      <p className="text-body-sm leading-6 text-muted">
                        {t(
                          stageResult.cleared
                            ? stage && !nextStage(stage)
                              ? 'journey.finishedJourney'
                              : 'journey.nextUnlocked'
                            : 'journey.tryAgainNote',
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-body leading-7 text-muted">{t('study.reviewLater')}</p>
                  )}
                </>
              )}
              {stage && stageResult && (
                <button
                  className="min-h-12 w-full rounded-pill bg-accent px-5 font-semibold text-accent-fg"
                  data-testid="stage-continue"
                  onClick={() => {
                    const next = stageResult.cleared ? nextStage(stage) : undefined;
                    useLearnUiStore.getState().openQuiz({ stageId: next?.id ?? stage.id });
                  }}
                >
                  {t(
                    stageResult.cleared && nextStage(stage)
                      ? 'journey.nextStage'
                      : 'journey.replay',
                  )}
                </button>
              )}
              <button
                className="min-h-12 w-full rounded-pill bg-surface-2 px-5 font-semibold text-accent"
                onClick={onClose}
              >
                {t('study.backToLearning')}
              </button>
              {questions.find((q) => q.objectId)?.objectId && (
                <button
                  className="min-h-11 text-accent"
                  onClick={() => {
                    const id = questions.find((q) => q.objectId)!.objectId!;
                    onClose();
                    openStory(id);
                  }}
                >
                  {t('study.readMore')}
                </button>
              )}
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
