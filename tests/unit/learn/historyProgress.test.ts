import { describe, expect, it, vi } from 'vitest';
import { getDb } from '@/db/database';
import { HISTORY_QUESTS } from '@/learn/historyQuests';
import {
  emptyHistoryProgress,
  gradeHistoryAnswer,
  historySummary,
  parseHistoryNumber,
  parseHistoryProgress,
  readHistoryProgress,
  updateHistoryProgress,
} from '@/learn/historyProgress';
vi.mock('@/entitlements', () => ({ ensurePlusAccess: vi.fn(async () => {}) }));
const quest = HISTORY_QUESTS[0]!;
const numeric = quest.questions.find((q) => q.type === 'numeric')!;
const choice = quest.questions.find((q) => q.type === 'choice')!;
describe('history answer parsing and grading', () => {
  it('accepts scientific notation, signs and valid grouping without evaluating expressions', () => {
    expect(parseHistoryNumber(' 4.0e4 ')).toBe(40000);
    expect(parseHistoryNumber('40,000')).toBe(40000);
    expect(parseHistoryNumber('-.5E+2')).toBe(-50);
    for (const value of [
      '',
      ' ',
      '4,00',
      '40 000',
      '2+3',
      '0x10',
      'NaN',
      'Infinity',
      '1e999',
      '4km',
      'Math.random()',
    ])
      expect(parseHistoryNumber(value)).toBeNull();
  });
  it('grades numeric tolerance and canonical choice IDs independently of saved flags', () => {
    expect(gradeHistoryAnswer(numeric, '4e4')).toBe(true);
    expect(gradeHistoryAnswer(numeric, '40005')).toBe(true);
    expect(gradeHistoryAnswer(numeric, '40006')).toBe(false);
    if (choice.type !== 'choice') throw new Error('fixture');
    expect(gradeHistoryAnswer(choice, choice.answerId)).toBe(true);
    expect(gradeHistoryAnswer(choice, 'fake')).toBe(false);
    const p = parseHistoryProgress(
      {
        ...emptyHistoryProgress(),
        solved: true,
        attempts: [{ answer: '50', round: 1, hints: 0, at: '2026-09-10T00:00:00Z', correct: true }],
      },
      numeric,
    );
    expect(historySummary(numeric, p).solved).toBe(false);
  });
  it('rejects incompatible versions and malformed imported attempts', () => {
    expect(parseHistoryProgress({ version: 99, round: 1 }, numeric)).toEqual(
      emptyHistoryProgress(),
    );
    const p = parseHistoryProgress(
      {
        ...emptyHistoryProgress(),
        hints: 99,
        attempts: [{ answer: '4e4', round: 1, hints: -1, at: 'today' }],
      },
      numeric,
    );
    expect(p.hints).toBe(0);
    expect(p.attempts).toEqual([]);
  });
});
describe('history progress transactions', () => {
  it('persists hints, drafts and notes; restores and retries without erasing previous answers', async () => {
    await updateHistoryProgress(quest.id, numeric.id, 1, {
      type: 'draft',
      input: '4e4',
      note: 'C = 360 / 7.2 × 800',
    });
    await updateHistoryProgress(quest.id, numeric.id, 1, { type: 'hint' });
    await updateHistoryProgress(quest.id, numeric.id, 1, { type: 'submit', answer: '4e4' });
    let p = (await readHistoryProgress()).get(numeric.id)!;
    expect(p.note).toContain('360');
    expect(historySummary(numeric, p)).toMatchObject({ solved: true, independent: false });
    await updateHistoryProgress(quest.id, numeric.id, 1, { type: 'restart' });
    await updateHistoryProgress(quest.id, numeric.id, 2, { type: 'submit', answer: '40000' });
    p = (await readHistoryProgress()).get(numeric.id)!;
    expect(p.attempts).toHaveLength(2);
    expect(historySummary(numeric, p).independent).toBe(true);
    expect(p.note).toContain('360');
    expect(await getDb().observations.count()).toBe(0);
  });
  it('serializes concurrent hints, deduplicates submission and rejects stale rounds or unknown questions', async () => {
    await Promise.all(
      Array.from({ length: 5 }, () =>
        updateHistoryProgress(quest.id, numeric.id, 1, { type: 'hint' }),
      ),
    );
    expect((await readHistoryProgress()).get(numeric.id)?.hints).toBe(3);
    await Promise.all(
      [1, 2].map(() =>
        updateHistoryProgress(quest.id, numeric.id, 1, { type: 'submit', answer: '40,000' }),
      ),
    );
    expect((await readHistoryProgress()).get(numeric.id)?.attempts).toHaveLength(1);
    await expect(
      updateHistoryProgress(quest.id, numeric.id, 1, { type: 'submit', answer: '30' }),
    ).rejects.toThrow('ALREADY_SUBMITTED');
    await updateHistoryProgress(quest.id, numeric.id, 1, { type: 'restart' });
    await expect(
      updateHistoryProgress(quest.id, numeric.id, 1, { type: 'submit', answer: '40,000' }),
    ).rejects.toThrow('ROUND_CHANGED');
    await expect(updateHistoryProgress(quest.id, 'fake', 1, { type: 'hint' })).rejects.toThrow(
      'UNKNOWN',
    );
  });
  it('fails closed before making any progress write when Plus access is denied', async () => {
    const { ensurePlusAccess } = await import('@/entitlements');
    vi.mocked(ensurePlusAccess).mockRejectedValueOnce(new Error('PLUS_REQUIRED'));
    await expect(updateHistoryProgress(quest.id, numeric.id, 1, { type: 'hint' })).rejects.toThrow(
      'PLUS_REQUIRED',
    );
    expect(await getDb().progress.count()).toBe(0);
  });
});
