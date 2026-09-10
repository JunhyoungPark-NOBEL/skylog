import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { ensurePlusAccess } from '@/entitlements';
import { HISTORY_QUESTS, HISTORY_QUESTS_VERSION, type HistoryQuestion } from './historyQuests';

export type HistoryAttempt = { answer: string; hints: number; round: number; at: string };
export type HistoryProgress = {
  version: number;
  round: number;
  hints: number;
  input: string;
  note: string;
  attempts: HistoryAttempt[];
};
export const emptyHistoryProgress = (): HistoryProgress => ({
  version: HISTORY_QUESTS_VERSION,
  round: 1,
  hints: 0,
  input: '',
  note: '',
  attempts: [],
});

/** 계산식은 실행하지 않는다. 부호·소수·지수 및 올바른 천 단위 쉼표만 받는다. */
export function parseHistoryNumber(input: string): number | null {
  const s = input.trim();
  if (!/^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
  const value = Number(s.replaceAll(',', ''));
  return Number.isFinite(value) ? value : null;
}
export function validHistoryAnswer(q: HistoryQuestion, answer: string): boolean {
  return q.type === 'numeric'
    ? parseHistoryNumber(answer) !== null
    : q.options.some((o) => o.id === answer);
}
export function gradeHistoryAnswer(q: HistoryQuestion, answer: string): boolean {
  if (q.type === 'choice') return answer === q.answerId;
  const number = parseHistoryNumber(answer);
  return (
    number !== null &&
    Math.abs(number - q.answer) <=
      q.tolerance + Number.EPSILON * Math.max(1, Math.abs(q.answer)) * 4
  );
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
export function parseHistoryProgress(value: unknown, q: HistoryQuestion): HistoryProgress {
  const fallback = emptyHistoryProgress();
  if (
    !object(value) ||
    value.version !== HISTORY_QUESTS_VERSION ||
    !integer(value.round, 1, 100000)
  )
    return fallback;
  const round = value.round;
  const attempts: HistoryAttempt[] = Array.isArray(value.attempts)
    ? value.attempts.flatMap((a) => {
        if (
          !object(a) ||
          typeof a.answer !== 'string' ||
          !validHistoryAnswer(q, a.answer) ||
          !integer(a.hints, 0, q.hints.length) ||
          !integer(a.round, 1, round) ||
          typeof a.at !== 'string' ||
          !Number.isFinite(Date.parse(a.at))
        )
          return [];
        return [{ answer: a.answer.slice(0, 100), hints: a.hints, round: a.round, at: a.at }];
      })
    : [];
  // 1라운드의 제출은 1회. 가져온 정답/점수 플래그를 믿지 않고 실제 응답으로 다시 평가한다.
  const seen = new Set<number>();
  return {
    version: HISTORY_QUESTS_VERSION,
    round,
    hints: integer(value.hints, 0, q.hints.length) ? value.hints : 0,
    input: typeof value.input === 'string' ? value.input.slice(0, 100) : '',
    note: typeof value.note === 'string' ? value.note.slice(0, 3000) : '',
    attempts: attempts.filter((a) => {
      if (seen.has(a.round)) return false;
      seen.add(a.round);
      return true;
    }),
  };
}
export function historySummary(q: HistoryQuestion, p: HistoryProgress) {
  const correct = p.attempts.filter((a) => gradeHistoryAnswer(q, a.answer));
  return {
    solved: correct.length > 0,
    independent: correct.some((a) => a.hints === 0),
    current: p.attempts.find((a) => a.round === p.round) ?? null,
  };
}
function question(questId: string, questionId: string) {
  const q = HISTORY_QUESTS.find((quest) => quest.id === questId)?.questions.find(
    (v) => v.id === questionId,
  );
  if (!q) throw new Error('UNKNOWN_HISTORY_QUESTION');
  return q;
}
const prefix = 'learn.history:';
const keyFor = (questId: string, questionId: string) => prefix + questId + ':' + questionId;
export async function readHistoryProgress() {
  const rows = await getDb().progress.where('key').startsWith(prefix).toArray();
  const values = new Map(rows.filter((r) => !r.deletedAt).map((r) => [r.key, r.value]));
  return new Map(
    HISTORY_QUESTS.flatMap((quest) =>
      quest.questions.map(
        (q) => [q.id, parseHistoryProgress(values.get(keyFor(quest.id, q.id)), q)] as const,
      ),
    ),
  );
}
type HistoryAction =
  | { type: 'draft'; input: string; note: string }
  | { type: 'hint' }
  | { type: 'submit'; answer: string }
  | { type: 'restart' };
/** expectedRound prevents a stale tab from submitting a different round. All writes are atomic. */
export async function updateHistoryProgress(
  questId: string,
  questionId: string,
  expectedRound: number,
  action: HistoryAction,
) {
  const q = question(questId, questionId);
  await ensurePlusAccess();
  const db = getDb();
  const key = keyFor(questId, questionId);
  const value = await db.transaction('rw', db.progress, async () => {
    const row = await db.progress.where('key').equals(key).first();
    const p = parseHistoryProgress(row && !row.deletedAt ? row.value : undefined, q);
    if (p.round !== expectedRound) throw new Error('HISTORY_ROUND_CHANGED');
    const current = historySummary(q, p).current;
    if (action.type === 'draft') {
      p.note = action.note.slice(0, 3000);
      if (!current) p.input = action.input.slice(0, 100);
    } else if (action.type === 'hint') {
      if (!current) p.hints = Math.min(q.hints.length, p.hints + 1);
    } else if (action.type === 'restart') {
      if (!current) throw new Error('HISTORY_NOT_SUBMITTED');
      p.round += 1;
      p.hints = 0;
      p.input = '';
    } else {
      if (!validHistoryAnswer(q, action.answer)) throw new Error('INVALID_HISTORY_ANSWER');
      if (current && current.answer !== action.answer) throw new Error('HISTORY_ALREADY_SUBMITTED');
      if (!current)
        p.attempts.push({ answer: action.answer, hints: p.hints, round: p.round, at: nowIso() });
      p.input = action.answer;
    }
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
  return value;
}
