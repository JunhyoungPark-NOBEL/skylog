import catalog from './stageCatalog.json' with { type: 'json' };
import observing from './observingStages.json' with { type: 'json' };
import type { QuizItem } from './schema';

/** 문항·보기 버전이 고정된 여정. 출제 구성을 바꿀 때 stage version도 올린다(D-026). */
export interface QuizStage {
  id: string;
  version: number;
  chapter: number;
  theme: string;
  part: number;
  track?: string;
  questions: { id: string; version: number }[];
}
export const QUIZ_STAGES: readonly QuizStage[] = [...catalog, ...observing];
export const stageTrack = (stage: QuizStage) => stage.track ?? 'sky';
export function nextStage(stage: QuizStage) {
  const list = QUIZ_STAGES.filter((s) => stageTrack(s) === stageTrack(stage));
  return list[list.indexOf(stage) + 1];
}
export function stageNumber(stage: QuizStage) {
  return QUIZ_STAGES.filter((s) => stageTrack(s) === stageTrack(stage)).indexOf(stage) + 1;
}
export interface StageAnswer {
  quizId: string;
  version: number;
  answer: number | boolean | string;
}
export interface StageRun {
  runId: string;
  stageId: string;
  stageVersion: number;
  answers: StageAnswer[];
  completedAt: string;
}
export interface StageResult {
  correct: number;
  total: number;
  score: number;
  stars: number;
  cleared: boolean;
}
export function stageQuestions(stage: QuizStage, quiz: readonly QuizItem[]): QuizItem[] {
  return stage.questions.map((ref) => {
    const q = quiz.find((q) => q.id === ref.id && (q.version ?? 1) === ref.version);
    if (!q || q.enabled === false || q.type === 'skyPick')
      throw new Error('Stage question unavailable');
    return q;
  });
}
export function validAnswer(q: QuizItem, answer: unknown): answer is StageAnswer['answer'] {
  return q.type === 'trueFalse'
    ? typeof answer === 'boolean'
    : q.type === 'mc' &&
        typeof answer === 'number' &&
        Number.isInteger(answer) &&
        answer >= 0 &&
        answer < (q.choices?.length ?? 0);
}
export function gradeStage(
  stage: QuizStage,
  quiz: readonly QuizItem[],
  answers: readonly StageAnswer[],
): StageResult {
  const questions = stageQuestions(stage, quiz);
  if (!questions.length || questions.length !== answers.length) throw new Error('Incomplete stage');
  let correct = 0;
  questions.forEach((q, i) => {
    const a = answers[i]!;
    if (a.quizId !== q.id || a.version !== (q.version ?? 1) || !validAnswer(q, a.answer))
      throw new Error('Stage answer mismatch');
    if (a.answer === q.answer) correct++;
  });
  const ratio = correct / questions.length;
  return {
    correct,
    total: questions.length,
    score: Math.round(ratio * 1000),
    stars: ratio === 1 ? 3 : ratio >= 0.8 ? 2 : ratio >= 0.6 ? 1 : 0,
    cleared: ratio >= 0.8,
  };
}
export function parseStageRun(value: unknown): StageRun | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<StageRun>;
  if (
    typeof v.runId !== 'string' ||
    typeof v.stageId !== 'string' ||
    !Number.isInteger(v.stageVersion) ||
    typeof v.completedAt !== 'string' ||
    !Number.isFinite(Date.parse(v.completedAt)) ||
    !Array.isArray(v.answers) ||
    !v.answers.every(
      (a) =>
        a &&
        typeof a.quizId === 'string' &&
        Number.isInteger(a.version) &&
        ['string', 'number', 'boolean'].includes(typeof a.answer),
    )
  )
    return null;
  return v as StageRun;
}
export function stageProgress(quiz: readonly QuizItem[], runs: readonly StageRun[]) {
  const best = new Map<string, StageResult>();
  for (const run of runs) {
    const stage = QUIZ_STAGES.find((s) => s.id === run.stageId && s.version === run.stageVersion);
    if (!stage) continue;
    try {
      const result = gradeStage(stage, quiz, run.answers);
      if (result.score > (best.get(stage.id)?.score ?? -1)) best.set(stage.id, result);
    } catch {
      /* 이전 버전·불완전한 복원 데이터는 진도에 포함하지 않는다. */
    }
  }
  const precedingCleared = new Map<string, boolean>();
  return QUIZ_STAGES.map((stage) => {
    const result = best.get(stage.id);
    const track = stageTrack(stage);
    const unlocked = precedingCleared.get(track) ?? true;
    precedingCleared.set(track, unlocked && !!result?.cleared);
    return { stage, result, unlocked };
  });
}
