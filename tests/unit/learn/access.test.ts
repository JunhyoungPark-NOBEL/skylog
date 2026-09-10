import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Dexie from 'dexie';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/db/database';
import { setProgress } from '@/db/repos/progress';
import { ensureMissionAccess, ensureQuizAccess, quizNeedsPlus } from '@/learn/access';
import {
  beginMission,
  checkMission,
  emitSkill,
  loadLearnData,
  readLearning,
  recordAnswer,
  recordStageAnswer,
  selectQuiz,
} from '@/learn/runtime';
import { HOP_COURSES } from '@/learn/hopCourses';
import {
  QUIZ_STAGES,
  stageQuestions,
  stageTrack,
  type QuizStage,
  type StageRun,
} from '@/learn/stages';
import type { LearnData, Mission, QuizItem } from '@/learn/schema';
import type * as EntitlementTypes from '@/entitlements/types';
import TelescopeMode from '@/features/telescope/TelescopeMode';
import { CoursesScreen } from '@/features/learn/CoursesScreen';

const gate = vi.hoisted(() => ({ allowed: false, ensure: vi.fn<() => Promise<void>>() }));
vi.mock('@/entitlements', async () => {
  const types = await vi.importActual<typeof EntitlementTypes>('@/entitlements/types');
  const snapshot = () => ({
    status: 'ready',
    accountId: 'unit-account',
    mode: import.meta.env.VITE_SKYARD_MONETIZATION_MODE === 'live' ? 'live' : 'preview',
    hasPlus: gate.allowed,
    source: gate.allowed ? 'grant' : 'none',
    validUntil: gate.allowed ? new Date(Date.now() + 3600000).toISOString() : null,
    availability: 'setup-required',
    product: null,
    restoreAvailable: false,
    busy: false,
    error: null,
  });
  return {
    ...types,
    ensurePlusAccess: gate.ensure,
    useEntitlements: snapshot,
    getEntitlementsSnapshot: snapshot,
  };
});
vi.mock('@/features/learn/PlusAccess', () => ({
  PlusOffer: () => 'PLUS_GATE',
  PlusNotice: () => 'PLUS_NOTICE',
}));
vi.mock('react-i18next', async (original) => ({
  ...(await original<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/catalog/catalog', async (original) => ({
  ...(await original<object>()),
  loadCatalog: async () => ({ starById: new Map(), dsoById: new Map() }),
}));
vi.mock('@/content/loader', async (original) => ({
  ...(await original<object>()),
  loadContentIndex: async () => ({ entries: [] }),
}));

const pack = (name: keyof LearnData) =>
  JSON.parse(
    readFileSync(`public/data/learn/${name === 'badges' ? 'v2' : 'v1'}/${name}.json`, 'utf8'),
  );
const quiz = pack('quiz') as QuizItem[];
const missions = pack('missions') as Mission[];
const q = (id: string) => {
  const found = quiz.find((item) => item.id === id);
  if (!found) throw new Error('Missing canonical fixture: ' + id);
  return found;
};
const freeMission = missions.find((m) => m.id === 'spring-polaris-direction')!;
const telescopeMission = missions.find((m) => m.level === 'telescope' && m.enabled !== false)!;
const medium = q('q-polaris-brightest');
const hard = q('q-polaris-exact-pole');
const unrelated = q('q-aldebaran-depth');
beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = url.split('/').at(-1)?.replace('.json', '') as keyof LearnData;
      if (!['paths', 'missions', 'badges', 'quiz'].includes(name))
        throw new Error('Unexpected external request');
      return Response.json(pack(name));
    }),
  );
});
beforeEach(() => {
  vi.stubEnv('VITE_SKYARD_MONETIZATION_MODE', 'live');
  gate.allowed = false;
  gate.ensure.mockReset();
  gate.ensure.mockImplementation(async () => {
    // 라이브 서버 확인을 기다릴 경계가 IndexedDB 쓰기 안으로 들어가지 않도록 확인한다.
    expect(Dexie.currentTransaction).toBeNull();
    await Promise.resolve();
    if (import.meta.env.VITE_SKYARD_MONETIZATION_MODE === 'live' && !gate.allowed)
      throw new Error('PLUS_REQUIRED');
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  window.location.hash = '';
});
afterAll(() => vi.unstubAllGlobals());

async function seedStage(stage: QuizStage) {
  const runId = 'old-' + stage.id;
  const value: StageRun = {
    runId,
    stageId: stage.id,
    stageVersion: stage.version,
    answers: stageQuestions(stage, quiz).map((item) => ({
      quizId: item.id,
      version: item.version ?? 1,
      answer: item.answer,
    })),
    completedAt: '2026-09-09T12:00:00Z',
  };
  await setProgress('learn.stage:' + runId, value);
}
async function seedBefore(stage: QuizStage) {
  const track = QUIZ_STAGES.filter((s) => stageTrack(s) === stageTrack(stage));
  for (const before of track.slice(0, track.indexOf(stage))) await seedStage(before);
}

describe('무료 확인 문제와 심화 학습 경계', () => {
  it('쉬운 문제는 무료이고 난이도2·3은 지정 무료 코스 안에서만 예외다', () => {
    expect(
      quizNeedsPlus(
        quiz.find((item) => item.difficulty === 1)!,
        missions,
      ),
    ).toBe(false);
    for (const item of [medium, hard]) {
      expect(quizNeedsPlus(item, missions)).toBe(true);
      expect(quizNeedsPlus(item, missions, freeMission.id)).toBe(false);
      expect(quizNeedsPlus(item, missions, telescopeMission.id)).toBe(true);
      expect(quizNeedsPlus(item, missions, 'invented-free-course')).toBe(true);
    }
    expect(quizNeedsPlus(unrelated, missions, freeMission.id)).toBe(true);
    expect(quizNeedsPlus(hard, [{ ...freeMission, enabled: false }], freeMission.id)).toBe(true);
  });
  it('전달된 문제의 난이도를 낮춰도 정본 문제를 다시 찾아 권한을 확인한다', async () => {
    await expect(ensureQuizAccess({ ...hard, difficulty: 1 })).rejects.toThrow('PLUS_REQUIRED');
    await expect(
      ensureQuizAccess({ ...hard, version: (hard.version ?? 1) + 1 }, freeMission.id),
    ).rejects.toThrow('Question unavailable');
    await expect(
      ensureQuizAccess({ ...hard, id: 'made-up-question' }, freeMission.id),
    ).rejects.toThrow('Question unavailable');
    expect(await getDb().progress.count()).toBe(0);
  });
  it('canonical 무료 코스의 지정 문제는 저장되지만 같은 코스에 다른 문제를 섞을 수 없다', async () => {
    await beginMission(freeMission);
    expect(await recordAnswer(hard, hard.answer, new Date(), freeMission.id)).toBe(true);
    const previous = await getDb().progress.toArray();
    await expect(
      recordAnswer(unrelated, unrelated.answer, new Date(), freeMission.id),
    ).rejects.toThrow('PLUS_REQUIRED');
    await expect(recordAnswer(hard, hard.answer)).rejects.toThrow('PLUS_REQUIRED');
    expect(await getDb().progress.toArray()).toEqual(previous);
  });
  it('전달된 망원경 미션의 level을 바꿔도 시작·체크 저장을 막는다', async () => {
    const spoofed = { ...telescopeMission, level: 'naked' as const };
    await expect(ensureMissionAccess(spoofed)).rejects.toThrow('PLUS_REQUIRED');
    await expect(beginMission(spoofed)).rejects.toThrow('PLUS_REQUIRED');
    await expect(checkMission(spoofed, 0, 0, true)).rejects.toThrow('PLUS_REQUIRED');
    expect(await getDb().progress.count()).toBe(0);
  });
  it('자유 연습·복습에서 심화를 제외하되 무료 코스가 지정한 확인 문제는 남긴다', async () => {
    const learning = await readLearning();
    const unrestricted = selectQuiz(learning, {
      ids: [medium.id, hard.id, unrelated.id],
      plusAllowed: false,
    });
    expect(unrestricted).toEqual([]);
    const included = selectQuiz(learning, {
      ids: [medium.id, hard.id, unrelated.id],
      missionId: freeMission.id,
      plusAllowed: false,
    });
    expect(included.map((item) => item.id).sort()).toEqual([medium.id, hard.id].sort());
  });
  it.each([2, 3])(
    '이미 해제된 난이도%s 단계도 미권한 사용자의 실제 답 저장을 막는다',
    async (chapter) => {
      const stage = QUIZ_STAGES.find((item) => item.chapter === chapter)!;
      await seedBefore(stage);
      expect(
        (await readLearning()).journey.find((item) => item.stage.id === stage.id)?.unlocked,
      ).toBe(true);
      const old = await getDb().progress.toArray();
      const item = stageQuestions(stage, quiz)[0]!;
      await expect(recordStageAnswer(stage.id, 'unauthorized-run', 0, item.answer)).rejects.toThrow(
        'PLUS_REQUIRED',
      );
      expect(await getDb().progress.toArray()).toEqual(old);
    },
  );
  it('허가된 심화 단계는 트랜잭션 밖에서 권한 확인 후 원자적으로 답·복습·진도를 쓴다', async () => {
    const stage = QUIZ_STAGES.find((item) => item.chapter === 2)!;
    await seedBefore(stage);
    gate.allowed = true;
    const first = stageQuestions(stage, quiz)[0]!;
    await expect(
      recordStageAnswer(stage.id, 'authorized-run', 0, first.answer),
    ).resolves.toMatchObject({ correct: true, result: null });
    expect(gate.ensure).toHaveBeenCalled();
    expect(await getDb().progress.where('key').startsWith('learn.attempt:').count()).toBe(1);
    expect(
      await getDb()
        .progress.where('key')
        .equals('learn.sr:' + first.id)
        .count(),
    ).toBe(1);
    expect(
      await getDb().progress.where('key').equals('learn.stage-draft:authorized-run').count(),
    ).toBe(1);
  });
  it('무료 첫 단계는 구매 검사 없이 완료하고 기존 기록·획득 장식을 유지한다', async () => {
    await setProgress('personal.reward:first-observation', { earnedAt: '2026-09-09T10:00:00Z' });
    const reward = await getDb()
      .progress.where('key')
      .equals('personal.reward:first-observation')
      .first();
    const stage = QUIZ_STAGES[0]!;
    let last;
    for (const [index, item] of stageQuestions(stage, quiz).entries())
      last = await recordStageAnswer(stage.id, 'free-run', index, item.answer);
    expect(last?.result).toMatchObject({ cleared: true, stars: 3 });
    expect(gate.ensure).not.toHaveBeenCalled();
    expect(
      await getDb().progress.where('key').equals('personal.reward:first-observation').first(),
    ).toEqual(reward);
  });
  it('권한 회수 뒤에도 이전 심화 성취를 읽을 수 있으며 새 저장 거부가 진도를 지우지 않는다', async () => {
    const stage = QUIZ_STAGES.find((item) => item.chapter === 2)!;
    await seedBefore(stage);
    await seedStage(stage);
    const old = await getDb().progress.toArray();
    const learning = await readLearning();
    expect(learning.journey.find((item) => item.stage.id === stage.id)?.result).toMatchObject({
      cleared: true,
      stars: 3,
    });
    await expect(
      recordAnswer(stageQuestions(stage, quiz)[0]!, stageQuestions(stage, quiz)[0]!.answer),
    ).rejects.toThrow('PLUS_REQUIRED');
    expect(await getDb().progress.toArray()).toEqual(old);
  });
  it('스타호핑 학습 코스 완료 이벤트는 유료이며 코스 없는 기본 별길 관측은 무료다', async () => {
    const course = HOP_COURSES[0]!;
    await expect(
      emitSkill('starhop', { courseId: course.id, objectId: course.target }),
    ).rejects.toThrow('PLUS_REQUIRED');
    expect(await getDb().progress.count()).toBe(0);
    await emitSkill('starhop', { objectId: course.target, confirmed: true });
    expect(await getDb().progress.where('key').startsWith('learn.event:').count()).toBe(1);
  });
  it('베타 preview는 실제 Plus를 부여하지 않고 기존 심화 체험을 유지한다', async () => {
    vi.stubEnv('VITE_SKYARD_MONETIZATION_MODE', 'preview');
    await beginMission(telescopeMission);
    expect(await recordAnswer(hard, hard.answer)).toBe(true);
    expect(gate.allowed).toBe(false);
    expect(gate.ensure).not.toHaveBeenCalled();
  });
  it('정본 망원경 코스 직접 URL은 학습 내용 대신 구매 안내를 표시한다', async () => {
    window.location.hash = `#/telescope?target=${encodeURIComponent(HOP_COURSES[0]!.target)}&view=hop&course=${HOP_COURSES[0]!.id}`;
    const html = renderToStaticMarkup(createElement(TelescopeMode));
    expect(html).toContain('PLUS_GATE');
    expect(html).not.toContain('data-testid="starhop"');
  });
  it('무료 theme 쿼리를 붙여도 정본 망원경 미션 상세는 열리지 않는다', async () => {
    await loadLearnData();
    const html = renderToStaticMarkup(
      createElement(CoursesScreen, {
        value: await readLearning(),
        pathId: null,
        missionId: telescopeMission.id,
        hopCourseId: null,
        theme: 'naked',
      }),
    );
    expect(html).toContain('PLUS_GATE');
  });
});
