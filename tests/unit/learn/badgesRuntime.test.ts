import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/db/database';
import { addObservation } from '@/db/repos/observations';
import { putBlob } from '@/db/repos/blobs';
import { setProgress } from '@/db/repos/progress';
import { exportBundle, importBundle } from '@/db/exportImport';
import { readLearning, recordAnswer } from '@/learn/runtime';
import { QUIZ_STAGES, stageQuestions, type StageRun } from '@/learn/stages';
import type { QuizItem } from '@/learn/schema';

vi.mock('@/catalog/catalog', async () => {
  const { readFileSync: read } = await import('node:fs');
  const dso = JSON.parse(read('public/data/dso.v1.json', 'utf8')) as { id: string }[];
  return {
    loadCatalog: async () => ({ dsoById: new Map(dso.map((d) => [d.id, d])), starById: new Map() }),
  };
});
vi.mock('@/content/loader', async () => {
  const { readFileSync: read } = await import('node:fs');
  return {
    loadContentIndex: async () =>
      JSON.parse(read('public/data/content/v1/index.json', 'utf8')) as unknown,
  };
});
beforeAll(() =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const match = url.match(/learn\/(v[12])\/(\w+\.json)/);
      if (!match) throw new Error('Unexpected pack request');
      return new Response(readFileSync(`public/data/learn/${match[1]}/${match[2]}`, 'utf8'), {
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  ),
);
afterAll(() => vi.unstubAllGlobals());
const quiz = JSON.parse(readFileSync('public/data/learn/v1/quiz.json', 'utf8')) as QuizItem[];
const first = QUIZ_STAGES[0]!;
const questions = stageQuestions(first, quiz);
const run: StageRun = {
  runId: 'run-1',
  stageId: first.id,
  stageVersion: first.version,
  answers: questions.map((q) => ({ quizId: q.id, version: q.version ?? 1, answer: q.answer })),
  completedAt: '2026-09-08T12:00:00Z',
};

describe('저장·가져오기를 통한 업적 진도', () => {
  it('반복 가져오기는 기록을 보존하면서 대상·밤·단계·문항·첨부 업적을 중복 달성하지 않는다', async () => {
    for (const objectId of ['moon', 'dso:M31', 'dso:M42'] as const) {
      const sketch = await putBlob('sketch', new Blob(['sketch'], { type: 'image/png' }));
      const photo = await putBlob('photo', new Blob(['photo'], { type: 'image/jpeg' }));
      await addObservation({
        objectId,
        observedAt: '2026-09-07T12:00:00Z',
        outcome: 'seen',
        site: { lat: 36, lon: 127 },
        notes: '색과모양을관찰하고주변별과밝기를비교해기록해요',
        tags: [],
        sketchBlobId: sketch.id,
        photoBlobIds: [photo.id],
      });
    }
    await recordAnswer(questions[0]!, questions[0]!.answer);
    await setProgress('learn.stage:run-1', run);
    await setProgress('learn.stage:duplicate', { ...run, runId: 'duplicate' });
    await setProgress('learn.stage:invalid', { ...run, stageVersion: 99 });
    await setProgress('content.read:moon', { at: '2026-09-07T12:00:00Z' });
    await setProgress('content.read:star:HIP99999999', { at: '2026-09-07T12:00:00Z' });
    const before = await readLearning();
    expect(before.data.badges).toHaveLength(48);
    expect(before.snap.earnedBadges.has('badge-first-look')).toBe(true);
    expect(before.snap.earnedBadges.has('badge-first-sketch')).toBe(true);
    expect(before.badgeProgress.get('challenge-sketched-objects-3')?.done).toBe(true);
    expect(before.badgeProgress.get('challenge-photographed-objects-3')?.done).toBe(true);
    expect(before.badgeProgress.get('challenge-observation-nights-3')?.n).toBe(1);
    expect(before.snap.clearedStages?.size).toBe(1);
    expect(before.snap.perfectStages?.size).toBe(1);
    expect(before.snap.readStories?.size).toBe(1);
    const bundle = await exportBundle();
    await importBundle(bundle, { policy: 'newest' });
    await importBundle(bundle, { policy: 'addAll' });
    const after = await readLearning();
    expect(await getDb().observations.count()).toBe(6);
    expect(after.badgeProgress).toEqual(before.badgeProgress);
    expect(after.snap.earnedBadges).toEqual(before.snap.earnedBadges);
  });
  it('파일을 뺀 백업은 사진·스케치 다수 업적을 주지 않으며 원본 기록과 기존 첫 스케치는 유지한다', async () => {
    const sketch = await putBlob('sketch', new Blob(['drawing'], { type: 'image/png' }));
    const photo = await putBlob('photo', new Blob(['image'], { type: 'image/jpeg' }));
    await addObservation({
      objectId: 'moon',
      observedAt: '2026-09-07T12:00:00Z',
      outcome: 'seen',
      site: { lat: 36, lon: 127 },
      notes: '',
      tags: [],
      sketchBlobId: sketch.id,
      photoBlobIds: [photo.id],
    });
    const bundle = await exportBundle({ includeBlobs: false });
    await getDb().observations.clear();
    await getDb().blobs.clear();
    await importBundle(bundle, { policy: 'newest' });
    const restored = await readLearning();
    expect(restored.snap.observations).toHaveLength(1);
    expect(restored.snap.earnedBadges.has('badge-first-sketch')).toBe(true);
    expect(restored.badgeProgress.get('challenge-sketched-objects-3')?.n).toBe(0);
    expect(restored.badgeProgress.get('challenge-photographed-objects-3')?.n).toBe(0);
  });
  it('퀴즈는 현재 활성 버전의 실제 답으로 다시 판정하고 재시도·변조된 정답 플래그를 세지 않는다', async () => {
    const q = questions[0]!;
    await recordAnswer(q, q.answer, new Date('2026-09-07T12:00:00Z'));
    await recordAnswer(q, q.answer, new Date('2026-09-07T12:01:00Z'));
    const wrong = q.type === 'trueFalse' ? !q.answer : (Number(q.answer) + 1) % q.choices!.length;
    await setProgress('learn.attempt:wrong', {
      quizId: q.id,
      version: q.version ?? 1,
      answer: wrong,
      correct: true,
      at: '2026-09-07T12:02:00Z',
    });
    await setProgress('learn.attempt:old', {
      quizId: q.id,
      version: 99,
      answer: q.answer,
      correct: true,
      at: '2026-09-07T12:03:00Z',
    });
    await setProgress('learn.attempt:bad', { correct: true });
    const state = await readLearning();
    expect(state.snap.quizResults.size).toBe(1);
    expect(state.snap.quizResults.get(q.id)?.correct).toBe(false);
    expect(state.badgeProgress.get('challenge-quiz-mastered-25')?.n).toBe(0);
    expect(await getDb().progress.where('key').startsWith('learn.attempt:').count()).toBe(5);
    expect(await getDb().observations.count()).toBe(0);
  });
});
