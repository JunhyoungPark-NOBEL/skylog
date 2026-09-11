import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HISTORY_LESSONS } from '@/learn/historyLessons';
import { HISTORY_STORY } from '@/learn/historyStory';
import {
  answerPreparation,
  preparationComplete,
  readPreparation,
} from '@/learn/historyPreparation';
import { HistoryRichText } from './HistoryRichText';
import HistoryDiagram from './HistoryDiagram';

export function HistoryPreparation({
  questionId,
  questId,
  lang,
  resume,
  allowed,
  chapterIndex = 0,
  chapterCount = 3,
  initialStep,
  onPreviousChapter,
  children,
}: {
  questionId: string;
  questId: string;
  lang: 'ko' | 'en';
  resume: boolean;
  allowed: boolean;
  chapterIndex?: number;
  chapterCount?: number;
  initialStep?: number;
  onPreviousChapter?: () => void;
  children: ReactNode;
}) {
  const lesson = HISTORY_LESSONS[questionId]!;
  const story = HISTORY_STORY[questionId]!;
  const [main, setMain] = useState(
    initialStep === undefined ? resume || !allowed : initialStep === 2,
  );
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(
    initialStep !== undefined && initialStep < 2 ? initialStep : 0,
  );
  const [choice, setChoice] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const lock = useRef(false);
  const interacted = useRef(initialStep !== undefined);
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const mainContent = useRef<HTMLDivElement>(null);
  const say = (ko: string, en: string) => (lang === 'ko' ? ko : en);
  useEffect(() => {
    if (!interacted.current) return;
    const target = main ? mainContent.current?.querySelector<HTMLElement>('h3') : heading.current;
    target?.focus({ preventScroll: true });
    card.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [main, index]);
  useEffect(() => {
    let alive = true;
    readPreparation(questionId)
      .then((p) => {
        if (!alive) return;
        setCompleted(
          lesson.warmups.filter((w) => p.answers[w.id]?.includes(w.answerId)).map((w) => w.id),
        );
        if (!interacted.current) {
          if (preparationComplete(p, lesson)) setMain(true);
          else
            setIndex(
              Math.max(
                0,
                lesson.warmups.findIndex((w) => !p.answers[w.id]?.includes(w.answerId)),
              ),
            );
        }
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          setError(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [questionId, lesson, retry]);
  const step = lesson.warmups[index]!;
  const correct = feedback === step.answerId;
  const submit = async () => {
    if (lock.current || !choice || !allowed) return;
    lock.current = true;
    interacted.current = true;
    setBusy(true);
    setError(false);
    try {
      await answerPreparation(questionId, step.id, choice);
      setFeedback(choice);
      if (choice === step.answerId) setCompleted((ids) => [...new Set([...ids, step.id])]);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const localStep = main ? lesson.warmups.length : index;
  const absoluteStep = chapterIndex * 3 + localStep + 1;
  const changeStep = (next: number) => {
    interacted.current = true;
    setMain(next === lesson.warmups.length);
    if (next < lesson.warmups.length) setIndex(next);
    setChoice('');
    setFeedback(null);
  };
  return (
    <div
      ref={card}
      className="space-y-4 rounded-3xl border border-hairline bg-surface p-4 sm:p-5"
      data-testid="history-story-step"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 text-caption">
          <span className="font-semibold text-accent">{story.title[lang]}</span>
          <span className="shrink-0 tabular-nums text-muted" data-testid="history-step-count">
            {say('단계', 'Step')} {absoluteStep} / {chapterCount * 3}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: chapterCount * 3 }, (_, n) => (
            <span
              key={n}
              className={
                'h-1 flex-1 rounded-full ' +
                (n + 1 === absoluteStep
                  ? 'bg-accent'
                  : n + 1 < absoluteStep
                    ? 'bg-accent/35'
                    : 'bg-surface-2')
              }
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            disabled={busy || (localStep === 0 && !onPreviousChapter)}
            className="min-h-11 text-body-sm text-accent disabled:invisible"
            onClick={() => (localStep === 0 ? onPreviousChapter?.() : changeStep(localStep - 1))}
          >
            ← {say('이전으로', 'Back a step')}
          </button>
          <details className="relative text-caption text-muted">
            <summary className="min-h-11 cursor-pointer py-3">
              {say('단계 이동', 'Go to a step')}
            </summary>
            <div className="absolute right-0 z-10 flex gap-1 rounded-2xl border border-hairline bg-surface p-2 shadow-card">
              {[0, 1, 2].map((n) => (
                <button
                  key={n}
                  disabled={busy}
                  aria-current={localStep === n ? 'step' : undefined}
                  className={
                    'min-h-11 min-w-14 rounded-xl px-3 ' +
                    (localStep === n ? 'bg-accent-soft text-accent' : '')
                  }
                  onClick={(event) => {
                    changeStep(n);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                >
                  {say(`${chapterIndex * 3 + n + 1}단계`, `Step ${chapterIndex * 3 + n + 1}`)}
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>
      <p className="text-body-sm leading-7" data-testid="history-scene">
        <HistoryRichText
          text={(localStep === 0 ? lesson.scene : story.bridges[localStep - 1]!)[lang]}
        />
      </p>
      <p className="text-caption leading-5 text-muted">
        {say(
          '점선 밑줄 용어는 꾹 누르면 뜻이 열려요.',
          'Press and hold a dotted term for its meaning.',
        )}
      </p>
      {!main && (
        <section className="space-y-4" data-testid="history-preparation">
          <h3 ref={heading} tabIndex={-1} className="text-title leading-7 outline-none">
            <HistoryRichText text={step.prompt[lang]} />
          </h3>
          <div className="mx-auto w-full max-w-[280px]">
            <p className="mb-2 text-caption text-muted">
              {say(
                `관측 자료 · ${chapterIndex * 3 + 3}단계에서 사용`,
                `Observation data · used in step ${chapterIndex * 3 + 3}`,
              )}
            </p>
            <HistoryDiagram questId={questId} questionId={questionId} lang={lang} />
          </div>
          <fieldset disabled={loading || busy || correct || !allowed} className="space-y-2">
            <legend className="sr-only">{say('내 답', 'Your answer')}</legend>
            {step.choices.map((c) => (
              <label
                key={c.id}
                className={
                  'flex min-h-12 items-center gap-3 rounded-xl border p-3 text-body-sm leading-6 ' +
                  (choice === c.id ? 'border-accent bg-accent-soft' : 'border-hairline')
                }
              >
                <input
                  type="radio"
                  name={'prep-' + step.id}
                  checked={choice === c.id}
                  onChange={() => {
                    interacted.current = true;
                    setChoice(c.id);
                    setFeedback(null);
                  }}
                />
                <HistoryRichText text={c.label[lang]} terms={false} />
              </label>
            ))}
          </fieldset>
          {feedback && (
            <div
              role="status"
              className="space-y-2 rounded-2xl bg-accent-soft p-4 text-body-sm leading-7"
              data-testid="preparation-feedback"
            >
              <p className="font-semibold text-accent">
                {correct
                  ? say('맞아요. 이렇게 이어집니다.', 'Right. Here is the connection.')
                  : say('한 번 더 생각해 볼까요?', 'Give it another try.')}
              </p>
              <HistoryRichText text={step.explanation[lang]} />
            </div>
          )}
          {correct || (completed.includes(step.id) && !choice) ? (
            <button
              className="min-h-12 w-full rounded-pill bg-accent px-4 text-accent-fg"
              onClick={() => {
                changeStep(index + 1);
              }}
            >
              {say('다음으로', 'Continue')} →
            </button>
          ) : (
            <button
              disabled={!choice || busy || loading || !allowed}
              className="min-h-12 w-full rounded-pill bg-accent px-4 text-accent-fg disabled:opacity-50"
              onClick={() => void submit()}
            >
              {say('생각 확인하기', 'Check my answer')}
            </button>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="text-body-sm">
          {say(
            '진행을 저장하거나 불러오지 못했어요. 선택한 답은 그대로 두었습니다.',
            'Could not load or save your progress. Your selection is still here.',
          )}{' '}
          <button className="min-h-11 text-accent" onClick={() => setRetry((n) => n + 1)}>
            {say('다시 불러오기', 'Reload progress')}
          </button>
        </p>
      )}
      <div
        ref={mainContent}
        hidden={!main}
        className="space-y-4"
        data-testid="history-main-content"
      >
        <details className="rounded-2xl border border-hairline p-4">
          <summary className="min-h-8 cursor-pointer text-body-sm">
            {say('그림과 풀이의 연결 고리', 'Diagram and useful relationships')}
          </summary>
          <div className="mt-3 space-y-4 text-body-sm leading-7">
            <HistoryDiagram questId={questId} questionId={questionId} lang={lang} />
            {lesson.relations.map((r, i) => (
              <p key={i}>
                <HistoryRichText text={r.formula} />
                <br />
                <HistoryRichText text={r.explanation[lang]} />
              </p>
            ))}
            <ol className="list-decimal space-y-2 pl-5">
              {lesson.steps.map((s, i) => (
                <li key={i}>
                  <HistoryRichText text={s[lang]} />
                </li>
              ))}
            </ol>
          </div>
        </details>
        {children}
      </div>
    </div>
  );
}
