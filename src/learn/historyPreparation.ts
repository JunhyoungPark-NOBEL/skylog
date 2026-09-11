import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { ensurePlusAccess } from '@/entitlements';
import { HISTORY_LESSONS, HISTORY_LESSONS_VERSION, type HistoryLesson } from './historyLessons';

export type PreparationProgress = { version: number; answers: Record<string, string[]> };
export function parsePreparation(value: unknown, lesson: HistoryLesson): PreparationProgress {
  const result: PreparationProgress = { version: HISTORY_LESSONS_VERSION, answers: {} };
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== result.version ||
    !('answers' in value)
  )
    return result;
  const answers = value.answers;
  if (!answers || typeof answers !== 'object') return result;
  for (const step of lesson.warmups) {
    const raw = (answers as Record<string, unknown>)[step.id];
    if (Array.isArray(raw))
      result.answers[step.id] = step.choices.filter((c) => raw.includes(c.id)).map((c) => c.id);
  }
  return result;
}
export const preparationComplete = (p: PreparationProgress, lesson: HistoryLesson) =>
  lesson.warmups.every((w) => p.answers[w.id]?.includes(w.answerId));
const keyFor = (questionId: string) => 'learn.preparation:' + questionId;
function lessonFor(id: string) {
  const lesson = HISTORY_LESSONS[id];
  if (!lesson) throw new Error('UNKNOWN_HISTORY_LESSON');
  return lesson;
}
export async function readPreparation(questionId: string) {
  const lesson = lessonFor(questionId);
  const row = await getDb().progress.where('key').equals(keyFor(questionId)).first();
  return parsePreparation(row && !row.deletedAt ? row.value : undefined, lesson);
}
export async function answerPreparation(questionId: string, stepId: string, answer: string) {
  const lesson = lessonFor(questionId);
  const step = lesson.warmups.find((s) => s.id === stepId);
  if (!step?.choices.some((c) => c.id === answer)) throw new Error('INVALID_PREPARATION_ANSWER');
  await ensurePlusAccess();
  const db = getDb();
  const key = keyFor(questionId);
  const result = await db.transaction('rw', db.progress, async () => {
    const row = await db.progress.where('key').equals(key).first();
    const p = parsePreparation(row && !row.deletedAt ? row.value : undefined, lesson);
    p.answers[stepId] = [...new Set([...(p.answers[stepId] ?? []), answer])];
    const at = nowIso();
    await db.progress.put({
      id: row?.id ?? newId(),
      key,
      value: p,
      createdAt: row?.createdAt ?? at,
      updatedAt: at,
      schemaVersion: 1,
    });
    return p;
  });
  emitDbChange('progress');
  return result;
}
