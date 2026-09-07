import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  QUIZ_STAGES,
  gradeStage,
  stageProgress,
  stageQuestions,
  parseStageRun,
  stageTrack,
  nextStage,
  type StageRun,
} from '@/learn/stages';
import { recordStageAnswer } from '@/learn/runtime';
import type { LearnData, QuizItem } from '@/learn/schema';
import { getDb } from '@/db/database';
const quiz = JSON.parse(readFileSync('public/data/learn/v1/quiz.json', 'utf8')) as QuizItem[];
const first = QUIZ_STAGES[0]!;
const questions = stageQuestions(first, quiz);
const answers = questions.map((q) => ({ quizId: q.id, version: q.version ?? 1, answer: q.answer }));
const run: StageRun = {
  runId: 'run',
  stageId: first.id,
  stageVersion: 1,
  answers,
  completedAt: '2026-09-07T12:00:00Z',
};
beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = url.split('/').at(-1)!.replace('.json', '') as keyof LearnData;
      return new Response(readFileSync('public/data/learn/v1/' + name + '.json', 'utf8'));
    }),
  );
});
afterAll(() => vi.unstubAllGlobals());
describe('주제별 퀴즈 여정', () => {
  it('활성 204문항은 각 코스에서 한 번 배치되며 기존 28단계도 유지한다', () => {
    const active = quiz.filter((q) => q.enabled !== false && q.type !== 'skyPick');
    const refs = QUIZ_STAGES.flatMap((s) => stageQuestions(s, quiz));
    expect(refs).toHaveLength(204);
    expect(new Set(refs.map((q) => q.id)).size).toBe(204);
    expect(refs.map((q) => q.id).sort()).toEqual(active.map((q) => q.id).sort());
    expect(QUIZ_STAGES).toHaveLength(40);
    expect(new Set(QUIZ_STAGES.map((s) => s.id)).size).toBe(40);
    const original = JSON.parse(readFileSync('src/learn/stageCatalog.json', 'utf8'));
    expect(QUIZ_STAGES.slice(0, 28)).toEqual(original);
    const previous = new Map<string, number>();
    for (const s of QUIZ_STAGES) {
      expect(s.questions.length).toBeGreaterThanOrEqual(2);
      expect(s.questions.length).toBeLessThanOrEqual(6);
      expect(s.chapter).toBeGreaterThanOrEqual(previous.get(stageTrack(s)) ?? 1);
      expect(stageQuestions(s, quiz).every((q) => q.difficulty === s.chapter)).toBe(true);
      previous.set(stageTrack(s), s.chapter);
    }
  });
  it('전체 응답만 채점하며 80%에서 해제, 100%에서 별 셋을 준다', () => {
    const five = { ...first, questions: first.questions.slice(0, 5) };
    const correct = answers.slice(0, 5);
    const wrong = (i: number) => ({
      ...correct[i]!,
      answer: (Number(questions[i]!.answer) + 1) % questions[i]!.choices!.length,
    });
    expect(gradeStage(five, quiz, [wrong(0), ...correct.slice(1)])).toMatchObject({
      score: 800,
      stars: 2,
      cleared: true,
    });
    expect(gradeStage(five, quiz, [wrong(0), wrong(1), ...correct.slice(2)])).toMatchObject({
      score: 600,
      stars: 1,
      cleared: false,
    });
    expect(gradeStage(first, quiz, answers)).toMatchObject({
      score: 1000,
      stars: 3,
      cleared: true,
    });
    expect(() => gradeStage(first, quiz, answers.slice(1))).toThrow();
    expect(() =>
      gradeStage(first, quiz, [{ ...answers[0]!, version: 2 }, ...answers.slice(1)]),
    ).toThrow();
    expect(() =>
      gradeStage(first, quiz, [{ ...answers[0]!, answer: 999 }, ...answers.slice(1)]),
    ).toThrow();
  });
  it('최고 점수만 반영하고 다음 단계만 연다. 이전 버전과 불완전한 진도는 무시한다', () => {
    const empty = stageProgress(quiz, []);
    expect(empty.filter((p) => p.unlocked)).toHaveLength(2);
    const result = stageProgress(quiz, [run, { ...run, runId: 'replay' }]);
    expect(result.filter((p) => p.unlocked)).toHaveLength(3);
    expect(result[28]!.unlocked).toBe(true);
    expect(result[29]!.unlocked).toBe(false);
    expect(nextStage(QUIZ_STAGES[27]!)).toBeUndefined();
    expect(result.reduce((sum, p) => sum + (p.result?.score ?? 0), 0)).toBe(1000);
    expect(stageProgress(quiz, [{ ...run, stageVersion: 2 }])[1]?.unlocked).toBe(false);
    expect(stageProgress(quiz, [{ ...run, answers: [] }])[1]?.unlocked).toBe(false);
    expect(parseStageRun({ ...run, answers: [null] })).toBeNull();
  });
  it('닫거나 미완료 상태이면 도장을 주지 않고, 동시 재전송도 응답을 중복 저장하지 않는다', async () => {
    const q = questions[0]!;
    await expect(recordStageAnswer(QUIZ_STAGES[1]!.id, 'locked', 0, 0)).rejects.toThrow('locked');
    await expect(recordStageAnswer(first.id, 'skip', 1, 0)).rejects.toThrow('order');
    await Promise.all([
      recordStageAnswer(first.id, 'live', 0, q.answer),
      recordStageAnswer(first.id, 'live', 0, q.answer),
    ]);
    expect(await getDb().progress.where('key').startsWith('learn.stage:').count()).toBe(0);
    expect(await getDb().progress.where('key').startsWith('learn.attempt:').count()).toBe(1);
    for (let i = 1; i < questions.length; i++)
      await recordStageAnswer(first.id, 'live', i, questions[i]!.answer);
    expect(await getDb().progress.where('key').startsWith('learn.stage:').count()).toBe(1);
    const again = await recordStageAnswer(
      first.id,
      'live',
      questions.length - 1,
      questions.at(-1)!.answer,
    );
    expect(again.result?.score).toBe(1000);
    expect(await getDb().progress.where('key').startsWith('learn.attempt:').count()).toBe(
      questions.length,
    );
    expect(await getDb().progress.where('key').startsWith('learn.stage-draft:').count()).toBe(0);
    expect(await getDb().observations.count()).toBe(0);
  });
  it('마지막 저장 실패 시 완료·응답·복습을 함께 되돌리고 같은 세션으로 재시도한다', async () => {
    for (let i = 0; i < questions.length - 1; i++)
      await recordStageAnswer(first.id, 'atomic', i, questions[i]!.answer);
    const fail = (_key: unknown, row: { key: string }) => {
      if (row.key.startsWith('learn.stage:')) throw new Error('storage full');
    };
    getDb().progress.hook('creating', fail);
    await expect(
      recordStageAnswer(first.id, 'atomic', questions.length - 1, questions.at(-1)!.answer),
    ).rejects.toThrow('storage full');
    getDb().progress.hook('creating').unsubscribe(fail);
    expect(await getDb().progress.where('key').startsWith('learn.attempt:').count()).toBe(
      questions.length - 1,
    );
    expect(await getDb().progress.where('key').startsWith('learn.stage:').count()).toBe(0);
    expect(
      (await recordStageAnswer(first.id, 'atomic', questions.length - 1, questions.at(-1)!.answer))
        .result?.cleared,
    ).toBe(true);
  });
});
