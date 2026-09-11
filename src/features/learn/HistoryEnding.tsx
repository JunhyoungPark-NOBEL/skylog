import { useEffect, useRef } from 'react';
import { HISTORY_NARRATIVES } from '@/learn/historyNarrative';
import { HISTORY_STORY } from '@/learn/historyStory';
import type { HistoryQuest } from '@/learn/historyQuests';
import {
  emptyHistoryProgress,
  historySummary,
  type HistoryProgress,
} from '@/learn/historyProgress';
import { HistoryRichText } from './HistoryRichText';

export function HistoryEnding({
  quest,
  progress,
  lang,
  onReturn,
  onList,
}: {
  quest: HistoryQuest;
  progress: Map<string, HistoryProgress>;
  lang: 'ko' | 'en';
  onReturn: (chapter: number) => void;
  onList: () => void;
}) {
  const narrative = HISTORY_NARRATIVES[quest.id]!;
  const heading = useRef<HTMLHeadingElement>(null);
  const card = useRef<HTMLElement>(null);
  const say = (ko: string, en: string) => (lang === 'ko' ? ko : en);
  const solved = quest.questions.filter(
    (q) => historySummary(q, progress.get(q.id) ?? emptyHistoryProgress()).solved,
  ).length;
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    card.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, []);
  return (
    <section
      ref={card}
      className="space-y-5 rounded-3xl border border-accent/30 bg-surface p-5 sm:p-6"
      data-testid="history-ending"
    >
      <p className="text-caption font-semibold tracking-wide text-accent">
        {say('이야기를 마치며', 'At the end of the story')}
      </p>
      <h3 ref={heading} tabIndex={-1} className="text-title leading-7 outline-none">
        {narrative.question[lang]}
      </h3>
      <p className="text-body-sm leading-7">
        <HistoryRichText text={narrative.ending[lang]} terms={false} />
      </p>
      <div className="border-t border-hairline pt-4">
        <p className="mb-3 text-caption text-muted">
          {say('우리가 따라온 세 장면', 'Three discoveries along the way')}
        </p>
        <ol className="space-y-2">
          {quest.questions.map((q, i) => {
            const done = historySummary(q, progress.get(q.id) ?? emptyHistoryProgress()).solved;
            return (
              <li key={q.id}>
                <details className="rounded-2xl bg-surface-2 px-4 py-1">
                  <summary className="min-h-12 cursor-pointer py-3 text-body-sm leading-6">
                    <span className="mr-2 tabular-nums text-accent">0{i + 1}</span>
                    {HISTORY_STORY[q.id]!.title[lang]}
                    <span className="mt-1 block pl-7 text-caption text-muted">
                      {done
                        ? say('풀이 완료', 'Solved')
                        : say('해설과 함께 복습하기', 'Review with the explanation')}
                    </span>
                  </summary>
                  <p className="pb-2 text-body-sm leading-7">
                    <HistoryRichText text={narrative.chapters[i]!.discovery[lang]} terms={false} />
                  </p>
                  <button
                    className="mb-2 min-h-11 text-body-sm text-accent"
                    onClick={() => onReturn(i)}
                  >
                    {say('이 장면 다시 보기', 'Revisit this act')} →
                  </button>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-caption leading-6 text-muted" data-testid="history-ending-score">
        {say(
          `계산·판단 ${solved}/${quest.questions.length}개 정답 · 이야기 감상은 점수와 별개예요.`,
          `${solved}/${quest.questions.length} calculations and decisions solved · Reading the ending does not change your score.`,
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="min-h-12 rounded-pill bg-accent px-5 text-body-sm text-accent-fg"
          onClick={onList}
        >
          {say('다른 이야기 고르기', 'Choose another story')} →
        </button>
        <button
          className="min-h-12 rounded-pill border border-hairline px-4 text-body-sm"
          onClick={() => onReturn(0)}
        >
          {say('첫 장면 다시 보기', 'Return to the first scene')}
        </button>
      </div>
    </section>
  );
}
