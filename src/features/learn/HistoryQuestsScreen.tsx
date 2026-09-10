import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HISTORY_QUESTS, type HistoryQuest, type HistoryQuestion } from '@/learn/historyQuests';
import {
  emptyHistoryProgress,
  gradeHistoryAnswer,
  historySummary,
  readHistoryProgress,
  updateHistoryProgress,
  validHistoryAnswer,
  type HistoryProgress,
} from '@/learn/historyProgress';
import { onDbChange } from '@/db/events';
import { useSettingsStore } from '@/state/settingsStore';
import { canAccessPlus, useEntitlements } from '@/entitlements';
import { PlusOffer, PlusNotice } from './PlusAccess';
import { navigateLearn } from './learnNavigation';

export default function HistoryQuestsScreen({ questId }: { questId: string | null }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const [progress, setProgress] = useState<Map<string, HistoryProgress> | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [reviewOnly, setReviewOnly] = useState(false);
  useEffect(() => {
    let alive = true,
      generation = 0;
    const refresh = () => {
      const n = ++generation;
      void readHistoryProgress()
        .then((v) => {
          if (alive && n === generation) {
            setProgress(v);
            setError(false);
          }
        })
        .catch(() => {
          if (alive) setError(true);
        });
    };
    refresh();
    const unsub = onDbChange((table) => {
      if (table === 'progress' || table === 'all') refresh();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [retry]);
  const quest = HISTORY_QUESTS.find((q) => q.id === questId);
  if (error)
    return (
      <div role="alert">
        <p>{t('history.loadError')}</p>
        <button className="min-h-11 text-accent" onClick={() => setRetry((n) => n + 1)}>
          {t('study.retry')}
        </button>
      </div>
    );
  if (!progress) return <p role="status">{t('common.loading')}</p>;
  const all = HISTORY_QUESTS.flatMap((pack) => pack.questions);
  const solved = all.filter(
    (q) => historySummary(q, progress.get(q.id) ?? emptyHistoryProgress()).solved,
  ).length;
  const independent = all.filter(
    (q) => historySummary(q, progress.get(q.id) ?? emptyHistoryProgress()).independent,
  ).length;
  return (
    <div className="space-y-5" data-testid="history-screen">
      <PlusNotice />
      {quest ? (
        <QuestDetail key={quest.id} quest={quest} progress={progress} />
      ) : (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-hairline bg-surface p-6">
            <svg
              className="pointer-events-none absolute -right-6 -top-5 h-40 w-40 text-accent opacity-15"
              aria-hidden
              viewBox="0 0 160 160"
              fill="none"
            >
              <ellipse
                cx="80"
                cy="80"
                rx="70"
                ry="34"
                transform="rotate(-30 80 80)"
                stroke="currentColor"
              />
              <circle cx="59" cy="92" r="16" fill="currentColor" />
              <circle cx="136" cy="49" r="5" fill="currentColor" />
              <path d="M20 120h120M40 100v40M80 110v30" stroke="currentColor" />
            </svg>
            <p className="text-caption font-semibold text-accent">{t('history.eyebrow')}</p>
            <h2 className="relative mt-3 text-headline">{t('history.title')}</h2>
            <p className="relative mt-3 text-body-sm leading-6 text-muted">{t('history.intro')}</p>
            <p className="mt-4 text-caption text-accent">
              {t('history.progress', { solved, total: all.length, independent })}
            </p>
          </section>
          <p className="px-1 text-caption leading-6 text-muted">{t('history.method')}</p>
          <button
            className="min-h-11 rounded-pill border border-hairline px-4 text-body-sm"
            aria-pressed={reviewOnly}
            onClick={() => setReviewOnly(!reviewOnly)}
          >
            {t(reviewOnly ? 'history.showAll' : 'history.reviewFilter')}
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            {HISTORY_QUESTS.filter(
              (pack) =>
                !reviewOnly ||
                pack.questions.some((q) => {
                  const p = progress.get(q.id) ?? emptyHistoryProgress();
                  return p.attempts.length > 0 && !historySummary(q, p).independent;
                }),
            ).map((pack, i) => {
              const n = pack.questions.filter(
                (q) => historySummary(q, progress.get(q.id) ?? emptyHistoryProgress()).solved,
              ).length;
              return (
                <button
                  key={pack.id}
                  className="min-h-40 rounded-3xl border border-hairline bg-surface p-5 text-left"
                  data-testid={'history-quest-' + pack.id}
                  onClick={() => navigateLearn('quiz', { track: 'physics', quest: pack.id })}
                >
                  <span className="flex justify-between gap-2 text-caption text-muted">
                    <span>{pack.era}</span>
                    <span>
                      {t('history.' + pack.difficulty)} ·{' '}
                      {t('history.minutes', { n: pack.minutes })}
                    </span>
                  </span>
                  <span className="mt-3 block text-title">{pack.title[lang]}</span>
                  <span className="mt-2 block text-body-sm text-muted">{pack.scientist[lang]}</span>
                  <span className="mt-4 flex justify-between text-caption text-accent">
                    <span>
                      {pack.concepts
                        .map((c) => c[lang])
                        .slice(0, 2)
                        .join(' · ')}
                    </span>
                    <span>
                      {n}/{pack.questions.length} {n === pack.questions.length ? '✓' : '→'}
                    </span>
                  </span>
                  <span className="sr-only">{i + 1}</span>
                </button>
              );
            })}
          </div>
          {reviewOnly &&
            !all.some((q) => {
              const p = progress.get(q.id) ?? emptyHistoryProgress();
              return p.attempts.length && !historySummary(q, p).independent;
            }) && <p className="p-4 text-muted">{t('history.noReview')}</p>}
        </>
      )}
    </div>
  );
}
function QuestDetail({
  quest,
  progress,
}: {
  quest: HistoryQuest;
  progress: Map<string, HistoryProgress>;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const access = useEntitlements();
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      quest.questions.findIndex(
        (q) => !historySummary(q, progress.get(q.id) ?? emptyHistoryProgress()).solved,
      ),
    ),
  );
  const q = quest.questions[index]!;
  const p = progress.get(q.id) ?? emptyHistoryProgress();
  const allowed = canAccessPlus(access);
  return (
    <div className="space-y-5">
      <button
        className="min-h-11 text-accent"
        onClick={() => navigateLearn('quiz', { track: 'physics' })}
      >
        ← {t('history.allQuests')}
      </button>
      <div>
        <p className="text-caption text-accent">
          {quest.era} · {quest.scientist[lang]}
        </p>
        <h2 className="mt-2 text-headline">{quest.title[lang]}</h2>
        <p className="mt-4 whitespace-pre-line text-body-sm leading-7 text-muted">
          {quest.story[lang]}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2" aria-label={t('history.chooseQuestion')}>
        {quest.questions.map((item, i) => (
          <button
            key={item.id}
            aria-pressed={index === i}
            className={
              'min-h-11 rounded-xl border px-2 text-body-sm ' +
              (index === i
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-hairline bg-surface')
            }
            onClick={() => setIndex(i)}
          >
            {t('history.question', { n: i + 1 })}{' '}
            {historySummary(item, progress.get(item.id) ?? emptyHistoryProgress()).solved
              ? '✓'
              : ''}
          </button>
        ))}
      </div>
      {allowed || p.attempts.length ? (
        <Question
          key={q.id + ':' + p.round}
          quest={quest}
          q={q}
          progress={p}
          allowed={allowed}
          onNext={index < quest.questions.length - 1 ? () => setIndex(index + 1) : undefined}
        />
      ) : (
        <PlusOffer />
      )}
      <details className="rounded-2xl border border-hairline p-4">
        <summary className="min-h-8 cursor-pointer text-body-sm text-muted">
          {t('history.sources')}
        </summary>
        <p className="mt-3 text-caption leading-6 text-muted">{t('history.sourceNote')}</p>
        <ul className="mt-3 space-y-2">
          {quest.sources.map((s) => (
            <li key={s.url}>
              <a
                className="inline-block min-h-11 break-words py-2 text-body-sm text-accent underline"
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                {s.title} ↗
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
function Question({
  quest,
  q,
  progress: p,
  allowed,
  onNext,
}: {
  quest: HistoryQuest;
  q: HistoryQuestion;
  progress: HistoryProgress;
  allowed: boolean;
  onNext?: () => void;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const [input, setInput] = useState(p.input);
  const [note, setNote] = useState(p.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const h = useRef<HTMLHeadingElement>(null);
  const summary = historySummary(q, p);
  const submitted = summary.current;
  const latest = submitted ?? (!allowed ? p.attempts.at(-1) : null);
  const apply = async (type: 'hint' | 'submit' | 'restart' | 'draft') => {
    if (lock.current || !allowed) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      // 메모와 입력을 먼저 보관하므로 힌트·제출·다시 풀기 때 메모가 유실되지 않는다.
      await updateHistoryProgress(quest.id, q.id, p.round, { type: 'draft', input, note });
      if (type !== 'draft')
        await updateHistoryProgress(
          quest.id,
          q.id,
          p.round,
          type === 'submit' ? { type, answer: input } : { type },
        );
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      className="space-y-5 rounded-3xl border border-hairline bg-surface p-5"
      data-testid="history-question"
    >
      <h3 ref={h} tabIndex={-1} className="text-title leading-7 outline-none">
        {q.prompt[lang]}
      </h3>
      <div
        className="whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-body-sm leading-7"
        data-testid="history-context"
      >
        {q.context[lang]}
      </div>
      {q.type === 'numeric' ? (
        <label className="block text-body-sm">
          <span>
            {t('history.yourAnswer')} ({q.unit})
          </span>
          <input
            className="mt-2 min-h-12 w-full rounded-xl border border-hairline bg-bg px-4 text-body"
            data-testid="history-numeric"
            inputMode="text"
            autoComplete="off"
            maxLength={100}
            value={input}
            disabled={!!submitted || !allowed || busy}
            onChange={(e) => {
              setInput(e.target.value);
              setSaved(false);
            }}
          />
          <span className="mt-2 block text-caption leading-5 text-muted">
            {q.inputHelp[lang]} {t('history.numberHelp')}
          </span>
        </label>
      ) : (
        <fieldset disabled={!!submitted || !allowed || busy} className="space-y-2">
          <legend className="mb-2 text-body-sm">{t('history.yourAnswer')}</legend>
          {q.options.map((o) => (
            <label
              key={o.id}
              className={
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-body-sm leading-6 ' +
                (input === o.id ? 'border-accent bg-accent-soft' : 'border-hairline')
              }
            >
              <input
                type="radio"
                name={q.id}
                value={o.id}
                checked={input === o.id}
                onChange={() => {
                  setInput(o.id);
                  setSaved(false);
                }}
              />
              {o.label[lang]}
            </label>
          ))}
        </fieldset>
      )}
      {!submitted && allowed && (
        <button
          className="min-h-12 w-full rounded-pill bg-accent px-5 text-accent-fg disabled:opacity-50"
          disabled={busy || !validHistoryAnswer(q, input)}
          onClick={() => void apply('submit')}
        >
          {t('history.submit')}
        </button>
      )}
      <div className="space-y-3">
        {q.hints.slice(0, latest ? latest.hints : p.hints).map((hint, i) => (
          <div className="rounded-2xl bg-accent-soft p-4 text-body-sm leading-7" key={i}>
            <p className="mb-2 text-caption font-semibold text-accent">
              {t('history.hint', { n: i + 1 })}
            </p>
            {hint[lang]}
          </div>
        ))}
        {!submitted && allowed && p.hints < q.hints.length && (
          <button
            className="min-h-11 rounded-pill border border-hairline px-4 text-body-sm"
            disabled={busy}
            onClick={() => void apply('hint')}
            data-testid="history-hint"
          >
            {t('history.nextHint', { n: p.hints + 1, total: q.hints.length })}
          </button>
        )}
        {!submitted && allowed && (
          <p className="text-caption text-muted">{t('history.hintNote')}</p>
        )}
      </div>
      {latest && (
        <div className="space-y-4 border-t border-hairline pt-5" data-testid="history-result">
          <p role="status" className="text-title text-accent">
            {t(gradeHistoryAnswer(q, latest.answer) ? 'history.correct' : 'history.incorrect')}
          </p>
          <p className="whitespace-pre-line text-body-sm leading-7">{q.explanation[lang]}</p>
          <ol className="list-decimal space-y-3 pl-5 text-body-sm leading-7">
            {q.workedSteps.map((step, i) => (
              <li key={i}>{step[lang]}</li>
            ))}
          </ol>
          <p className="text-caption text-muted">
            {t('history.attemptInfo', { n: p.attempts.length, hints: latest.hints })}
          </p>
          {allowed && (
            <button
              className="min-h-11 rounded-pill border border-hairline px-4 text-body-sm"
              disabled={busy}
              onClick={() => void apply('restart')}
            >
              {t('history.restart')}
            </button>
          )}
          {onNext && (
            <button className="ml-2 min-h-11 px-3 text-accent" onClick={onNext}>
              {t('history.nextQuestion')} →
            </button>
          )}
        </div>
      )}
      <label className="block text-body-sm">
        <span>{t('history.notes')}</span>
        <textarea
          className="mt-2 min-h-28 w-full resize-y rounded-xl border border-hairline bg-bg p-3 leading-6"
          maxLength={3000}
          disabled={!allowed || busy}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
        />
        <span className="mt-2 block text-caption text-muted">{t('history.notesLocal')}</span>
      </label>
      {allowed && (
        <button
          className="min-h-11 rounded-pill border border-hairline px-4 text-body-sm"
          disabled={busy}
          onClick={() => void apply('draft')}
        >
          {t('history.save')}
        </button>
      )}
      {saved && (
        <p role="status" className="text-caption text-accent">
          {t('history.saved')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-body-sm">
          {t('history.saveError')}
        </p>
      )}
      {!allowed && <PlusOffer />}
    </section>
  );
}
