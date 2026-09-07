import { describe, expect, it } from 'vitest';
import { getDb } from '@/db/database';
import { recordAnswer, missionKey, checkMission, beginMission } from '@/learn/runtime';
import type { Mission, QuizItem } from '@/learn/schema';
const q: QuizItem = {
  id: 'q-check',
  type: 'mc',
  question: { ko: '질문' },
  choices: [{ ko: '하나' }, { ko: '둘' }, { ko: '셋' }],
  answer: 1,
  explanation: { ko: '설명' },
  difficulty: 1,
  tags: [],
  version: 1,
};
describe('학습 결과 저장', () => {
  it('응답 이력을 보존하고 오답과 정답을 복습 일정에 반영한다', async () => {
    expect(await recordAnswer(q, 0, new Date('2026-09-07T12:00:00Z'))).toBe(false);
    expect(await recordAnswer(q, 1, new Date('2026-09-07T12:01:00Z'))).toBe(true);
    const attempts = await getDb().progress.where('key').startsWith('learn.attempt:').toArray();
    expect(attempts).toHaveLength(2);
    expect(attempts.map((r) => (r.value as { correct: boolean }).correct).sort()).toEqual([
      false,
      true,
    ]);
    const sr = await getDb().progress.where('key').equals('learn.sr:q-check').first();
    expect(sr?.value).toMatchObject({
      reps: 1,
      lapses: 1,
      intervalDays: 1,
      due: '2026-09-08T12:01:00.000Z',
    });
    expect(await getDb().observations.count()).toBe(0);
  });
  it('병렬 응답도 한 SR 행만 갱신하며 저장 실패 시 응답을 되돌린다', async () => {
    await Promise.all([recordAnswer(q, 1), recordAnswer(q, 1)]);
    expect(await getDb().progress.where('key').equals('learn.sr:q-check').count()).toBe(1);
    expect(
      (await getDb().progress.where('key').equals('learn.sr:q-check').first())?.value,
    ).toMatchObject({ reps: 2 });
  });
  it('비활성 문항은 응답이나 실제 관측을 만들지 않는다', async () => {
    await expect(recordAnswer({ ...q, enabled: false }, 1)).rejects.toThrow();
    expect(await getDb().progress.count()).toBe(0);
  });
  it('미션의 대상이 바뀌면 이전 체크리스트 키를 재사용하지 않는다', async () => {
    const m: Mission = {
      id: 'test',
      title: { ko: '미션' },
      description: { ko: '설명' },
      level: 'naked',
      estimatedMinutes: 5,
      steps: [
        { type: 'observe', objectId: 'moon' },
        { type: 'checklist', items: [{ ko: '확인' }] },
      ],
    };
    await beginMission(m);
    await checkMission(m, 1, 0, true);
    const changed = {
      ...m,
      steps: [{ type: 'observe' as const, objectId: 'planet:jupiter' as const }, m.steps[1]!],
    };
    expect(missionKey(m)).not.toBe(missionKey(changed));
    expect(
      await getDb()
        .progress.where('key')
        .equals('learn.start:' + missionKey(changed))
        .first(),
    ).toBeUndefined();
  });
});
