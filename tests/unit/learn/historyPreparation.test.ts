import { describe, expect, it, vi } from 'vitest';
import { getDb } from '@/db/database';
import { ensurePlusAccess } from '@/entitlements';
import { HISTORY_LESSONS } from '@/learn/historyLessons';
import {
  answerPreparation,
  parsePreparation,
  preparationComplete,
  readPreparation,
} from '@/learn/historyPreparation';
vi.mock('@/entitlements', () => ({ ensurePlusAccess: vi.fn(async () => {}) }));
const id = 'eratosthenes-circumference';
const lesson = HISTORY_LESSONS[id]!;
describe('prerequisite progress stays separate from the main challenge', () => {
  it('does not trust completion flags or unknown answers in imports', () => {
    const p = parsePreparation(
      { version: 1, completed: true, answers: { [lesson.warmups[0]!.id]: ['fake'] } },
      lesson,
    );
    expect(preparationComplete(p, lesson)).toBe(false);
    expect(Object.values(p.answers).flat()).toEqual([]);
    expect(parsePreparation({ version: 99, answers: {} }, lesson).version).toBe(1);
  });
  it('merges simultaneous answers, keeps success through review, and never updates main scores', async () => {
    const db = getDb();
    await db.progress.clear();
    const [first, second] = lesson.warmups;
    await Promise.all([
      answerPreparation(id, first!.id, first!.answerId),
      answerPreparation(id, second!.id, second!.answerId),
    ]);
    const wrong = first!.choices.find((c) => c.id !== first!.answerId)!;
    await answerPreparation(id, first!.id, wrong.id);
    const p = await readPreparation(id);
    expect(preparationComplete(p, lesson)).toBe(true);
    expect(p.answers[first!.id]).toContain(wrong.id);
    expect(await db.progress.where('key').startsWith('learn.history:').count()).toBe(0);
    expect(await db.progress.count()).toBe(1);
  });
  it('rejects invalid answers and paid access failures before writing', async () => {
    const before = await getDb().progress.toArray();
    await expect(answerPreparation(id, 'fake', 'fake')).rejects.toThrow(
      'INVALID_PREPARATION_ANSWER',
    );
    vi.mocked(ensurePlusAccess).mockRejectedValueOnce(new Error('PLUS_REQUIRED'));
    await expect(
      answerPreparation(id, lesson.warmups[0]!.id, lesson.warmups[0]!.answerId),
    ).rejects.toThrow('PLUS_REQUIRED');
    expect(await getDb().progress.toArray()).toEqual(before);
  });
});
