import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HISTORY_LESSONS } from '@/learn/historyLessons';
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
  children,
}: {
  questionId: string;
  questId: string;
  lang: 'ko' | 'en';
  resume: boolean;
  allowed: boolean;
  children: ReactNode;
}) {
  const lesson = HISTORY_LESSONS[questionId]!;
  const [main, setMain] = useState(resume || !allowed);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const interacted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mainContent = useRef<HTMLDivElement>(null);
  const say = (ko: string, en: string) => (lang === 'ko' ? ko : en);
  useEffect(() => {
    if (!interacted.current) return;
    const target = main ? mainContent.current?.querySelector<HTMLElement>('h3') : heading.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [main, index]);
  useEffect(() => {
    let alive = true;
    readPreparation(questionId)
      .then((p) => {
        if (!alive) return;
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
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const openMain = () => {
    interacted.current = true;
    setMain(true);
  };
  return (
    <div className="space-y-4">
      {main ? (
        <button
          className="min-h-11 px-2 text-body-sm text-accent"
          disabled={!allowed}
          onClick={() => {
            interacted.current = true;
            setIndex(0);
            setChoice('');
            setFeedback(null);
            setMain(false);
          }}
        >
          {say('선행 문제 다시 보기', 'Review the warm-ups')} →
        </button>
      ) : (
        <section
          className="space-y-4 rounded-3xl border border-hairline bg-surface p-4 sm:p-5"
          data-testid="history-preparation"
        >
          <div className="flex items-center justify-between gap-3 text-caption text-muted">
            <span>
              {say('본 문제를 위한 준비', 'Before the main challenge')} · {index + 1}/
              {lesson.warmups.length}
            </span>
            <button disabled={busy} className="min-h-11 text-accent" onClick={openMain}>
              {say('본 문제로', 'Skip to challenge')} →
            </button>
          </div>
          <p className="text-body-sm leading-7">
            <HistoryRichText text={lesson.scene[lang]} />
          </p>
          <p className="text-caption text-muted">
            {say(
              '점선 밑줄이 있는 용어를 꾹 누르면 뜻을 볼 수 있어요.',
              'Hold or tap an underlined term to see its meaning.',
            )}
          </p>
          <h3 ref={heading} tabIndex={-1} className="text-title leading-7 outline-none">
            <HistoryRichText text={step.prompt[lang]} />
          </h3>
          <div className="mx-auto w-full max-w-[280px]">
            <HistoryDiagram questId={questId} questionId={questionId} lang={lang} />
          </div>
          <fieldset disabled={loading || busy || correct || !allowed} className="space-y-2">
            <legend className="sr-only">{say('선행 문제의 답', 'Warm-up answer')}</legend>
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
          {correct ? (
            <button
              className="min-h-12 w-full rounded-pill bg-accent px-4 text-accent-fg"
              onClick={() => {
                if (index < lesson.warmups.length - 1) {
                  setIndex(index + 1);
                  setChoice('');
                  setFeedback(null);
                } else openMain();
              }}
            >
              {index < lesson.warmups.length - 1
                ? say('다음 준비 문제', 'Next warm-up')
                : say('이제 본 문제 풀기', 'Try the main challenge')}{' '}
              →
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
        </section>
      )}
      <div
        ref={mainContent}
        hidden={!main}
        className="space-y-4"
        data-testid="history-main-content"
      >
        <details className="rounded-2xl border border-hairline bg-surface p-4">
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
