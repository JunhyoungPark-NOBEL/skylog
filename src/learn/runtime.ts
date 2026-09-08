import { dataUrl } from '@/catalog/manifest';
import { loadCatalog, type Catalog } from '@/catalog/catalog';
import { kindOf, type ObjectId } from '@/catalog/objectId';
import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { setProgress } from '@/db/repos/progress';
import { hash32 } from '@/content/today';
import { loadContentIndex } from '@/content/loader';
import {
  evaluateMission,
  badgeProgresses,
  type LearnSnapshot,
  type CatalogLookups,
  type QuizResult,
  type SkillEvent,
} from './engine';
import {
  validateLearnData,
  type LearnData,
  type Mission,
  type QuizItem,
  type Skill,
} from './schema';
import { initialSr, reviewSr, dueForReview, type SrState } from './sr';

import {
  QUIZ_STAGES,
  stageQuestions,
  stageProgress,
  parseStageRun,
  gradeStage,
  validAnswer,
  type StageRun,
  type StageAnswer,
} from './stages';

let packPromise: Promise<LearnData> | null = null;
export function loadLearnData(): Promise<LearnData> {
  packPromise ??= Promise.all(
    ['paths', 'missions', 'badges', 'quiz'].map(async (name) => {
      // 새 규칙은 v2 별도 URL: 오래 열린 v1 앱이 모르는 규칙을 받지 않는다.
      // 기존 PWA를 오프라인에서 갱신한 경우에는 캐시된 18개 업적으로 학습을 계속한다.
      const r =
        name === 'badges'
          ? await fetch(dataUrl('learn/v2/badges.json'))
              .then((r) => {
                if (!r.ok) throw new Error('Badge pack unavailable');
                return r;
              })
              .catch(() => fetch(dataUrl('learn/v1/badges.json')))
          : await fetch(dataUrl('learn/v1/' + name + '.json'));
      if (!r.ok) throw new Error('Learning pack unavailable');
      const data: unknown = await r.json();
      if (!Array.isArray(data)) throw new Error('Invalid learning pack');
      return data;
    }),
  )
    .then(([paths, missions, badges, quiz]) => {
      const data = { paths, missions, badges, quiz } as LearnData;
      const result = validateLearnData(data);
      if (result.errors.length) throw new Error(result.errors.join(', '));
      return data;
    })
    .catch((error: unknown) => {
      packPromise = null;
      throw error;
    });
  return packPromise;
}
export const missionKey = (m: Mission) => m.id + ':' + hash32(JSON.stringify(m.steps));
export interface MissionStart {
  at: string;
  linkedObservationIds: string[];
}
export interface Attempt {
  quizId: string;
  version: number;
  correct: boolean;
  answer: number | boolean | string;
  at: string;
}
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function lookupsFor(cat: Catalog): CatalogLookups {
  return {
    categoryOf(id) {
      const kind = kindOf(id);
      if (kind === 'dso') {
        const c = cat.dsoById.get(id)?.category;
        return c &&
          [
            'openCluster',
            'globularCluster',
            'nebula',
            'planetaryNebula',
            'galaxy',
            'doubleStar',
          ].includes(c)
          ? (c as ReturnType<CatalogLookups['categoryOf']>)
          : null;
      }
      return kind === 'const' ? 'constellation' : kind === 'sun' ? null : kind;
    },
    messierOf: (id) => cat.dsoById.get(id)?.messier ?? null,
    caldwellOf: (id) => cat.dsoById.get(id)?.caldwell ?? null,
  };
}
export async function readLearning() {
  const [data, cat, rows, observations, contentIndex] = await Promise.all([
    loadLearnData(),
    loadCatalog(),
    getDb().progress.toArray(),
    getDb().observations.toArray(),
    loadContentIndex(),
  ]);
  const values = new Map(rows.filter((r) => !r.deletedAt).map((r) => [r.key, r.value]));
  const readSet = new Set<ObjectId>();
  const foundSet = new Set<ObjectId>();
  const checked = new Set<string>();
  const skillEvents: SkillEvent[] = [];
  const sr = new Map<string, SrState>();
  const quizResults = new Map<string, QuizResult>();
  const questions = new Map(data.quiz.filter((q) => q.enabled !== false).map((q) => [q.id, q]));
  const attempts = [...values.entries()]
    .filter(([k, v]) => k.startsWith('learn.attempt:') && obj(v))
    .flatMap(([, v]) => {
      const a = v as Partial<Attempt>;
      const q = typeof a.quizId === 'string' ? questions.get(a.quizId) : undefined;
      if (
        !q ||
        a.version !== (q.version ?? 1) ||
        !validAnswer(q, a.answer) ||
        typeof a.at !== 'string' ||
        !Number.isFinite(Date.parse(a.at))
      )
        return [];
      return [{ ...a, correct: a.answer === q.answer } as Attempt];
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  for (const a of attempts) {
    const q = data.quiz.find((q) => q.id === a.quizId && (q.version ?? 1) === a.version);
    if (!q || typeof a.correct !== 'boolean') continue;
    const old = quizResults.get(a.quizId);
    quizResults.set(a.quizId, {
      quizId: a.quizId,
      correct: a.correct,
      firstAttemptCorrect: old?.firstAttemptCorrect ?? a.correct,
      at: old?.at ?? a.at,
      attempts: (old?.attempts ?? 0) + 1,
      version: a.version,
    });
  }
  for (const [k, v] of values) {
    if (k.startsWith('content.read:') && obj(v)) readSet.add(k.slice(13) as ObjectId);
    if (k.startsWith('learn.found:') && obj(v)) foundSet.add(k.slice(12) as ObjectId);
    if (k.startsWith('learn.check:') && v === true) checked.add(k.slice(12));
    if (k.startsWith('learn.event:') && obj(v) && typeof v.type === 'string')
      skillEvents.push(v as unknown as SkillEvent);
    if (k.startsWith('learn.sr:') && obj(v) && typeof v.due === 'string')
      sr.set(k.slice(9), v as unknown as SrState);
  }
  const journey = stageProgress(
    data.quiz,
    [...values.entries()]
      .filter(([k]) => k.startsWith('learn.stage:'))
      .flatMap(([, v]) => {
        const run = parseStageRun(v);
        return run ? [run] : [];
      }),
  );
  const liveObservations = observations.filter((o) => !o.deletedAt);
  const attachmentIds = [
    ...new Set(
      liveObservations.flatMap((o) => [
        ...(o.sketchBlobId ? [o.sketchBlobId] : []),
        ...(o.photoBlobIds ?? []),
      ]),
    ),
  ];
  const attachments = await getDb().blobs.bulkGet(attachmentIds);
  const liveAttachments = attachments.filter((b) => b && !b.deletedAt && b.size > 0);
  const snap: LearnSnapshot = {
    observations: liveObservations,
    readSet,
    foundSet,
    checked,
    skillEvents,
    quizResults,
    completedMissions: new Set(),
    earnedBadges: new Set(),
    clearedStages: new Set(
      journey.filter((p) => p.unlocked && p.result?.cleared).map((p) => p.stage.id),
    ),
    perfectStages: new Set(
      journey.filter((p) => p.unlocked && p.result?.stars === 3).map((p) => p.stage.id),
    ),
    readStories: new Set(
      (contentIndex?.entries ?? []).filter((e) => readSet.has(e.id)).map((e) => e.id),
    ),
    sketchIds: new Set(liveAttachments.filter((b) => b?.kind === 'sketch').map((b) => b!.id)),
    photoIds: new Set(liveAttachments.filter((b) => b?.kind === 'photo').map((b) => b!.id)),
  };
  const lookups = lookupsFor(cat);
  const starts = new Map<string, MissionStart>();
  const forMission = (m: Mission): LearnSnapshot => {
    const key = missionKey(m);
    const raw = values.get('learn.start:' + key);
    const start =
      obj(raw) && typeof raw.at === 'string' ? (raw as unknown as MissionStart) : undefined;
    if (start) starts.set(m.id, start);
    const validObservations = start
      ? snap.observations.filter(
          (o) =>
            (o.observedAt >= start.at || start.linkedObservationIds?.includes(o.id)) &&
            (m.level === 'naked' || o.equipment?.kind === m.level),
        )
      : [];
    const missionChecked = new Set(
      [...checked].filter((k) => k.startsWith(key + ':')).map((k) => m.id + k.slice(key.length)),
    );
    return { ...snap, observations: validObservations, checked: missionChecked };
  };
  // 선행 미션 순서에 상관없이 완료 상태를 계산하고 삭제·수정 때 다시 평가한다.
  let statuses = data.missions.map((m) => evaluateMission(m, forMission(m), lookups));
  for (let i = 0; i < data.missions.length; i++) {
    const done = new Set(
      statuses
        .filter(
          (s) => s.done && !s.locked && s.mission.enabled !== false && starts.has(s.mission.id),
        )
        .map((s) => s.mission.id),
    );
    if (done.size === snap.completedMissions.size) break;
    snap.completedMissions = done;
    statuses = data.missions.map((m) => evaluateMission(m, forMission(m), lookups));
  }
  const progressByBadge = badgeProgresses(data.badges, snap, lookups);
  const badges = data.badges.filter((b) => b.enabled !== false && progressByBadge.get(b.id)?.done);
  snap.earnedBadges = new Set(badges.map((b) => b.id));
  return {
    data,
    cat,
    snap,
    statuses,
    badges,
    badgeProgress: progressByBadge,
    starts,
    sr,
    journey,
    due: dueForReview(sr.values(), new Date()),
  };
}
export type LearningState = Awaited<ReturnType<typeof readLearning>>;
export async function beginMission(m: Mission, linkedObservationIds: string[] = []) {
  await setProgress('learn.start:' + missionKey(m), {
    at: nowIso(),
    linkedObservationIds,
  } satisfies MissionStart);
}
export async function checkMission(m: Mission, step: number, item: number, value: boolean) {
  await setProgress('learn.check:' + missionKey(m) + ':' + step + ':' + item, value);
}
export async function markFound(id: ObjectId) {
  await setProgress('learn.found:' + id, { at: nowIso() });
}
export async function emitSkill(type: Skill, meta?: Record<string, unknown>) {
  await setProgress('learn.event:' + newId(), { type, at: nowIso(), meta } satisfies SkillEvent);
}
/** 응답과 복습 일정을 한 트랜잭션에 저장한다. 저장 실패 시 점수도 진행하지 않는다. */
export async function recordAnswer(
  q: QuizItem,
  answer: number | boolean | string,
  at = new Date(),
) {
  if (q.enabled === false || q.type === 'skyPick' || !validAnswer(q, answer))
    throw new Error('Question unavailable');
  const correct = answer === q.answer;
  const db = getDb();
  await db.transaction('rw', db.progress, async () => {
    const key = 'learn.sr:' + q.id;
    const row = await db.progress.where('key').equals(key).first();
    const previous = row && !row.deletedAt ? (row.value as SrState) : initialSr(q.id, at);
    const base = { createdAt: at.toISOString(), updatedAt: at.toISOString(), schemaVersion: 1 };
    await db.progress.put({
      ...base,
      id: newId(),
      key: 'learn.attempt:' + newId(),
      value: {
        quizId: q.id,
        version: q.version ?? 1,
        answer,
        correct,
        at: at.toISOString(),
      } satisfies Attempt,
    });
    await db.progress.put({
      ...base,
      id: row?.id ?? newId(),
      key,
      value: reviewSr(previous, correct, at),
    });
  });
  emitDbChange('progress');
  return correct;
}
/** 첫 풀이·복습을 우선하며 동일 개념·대상의 연속 출제를 피한다. */
export function selectQuiz(
  state: LearningState,
  opts: { ids?: string[]; objectId?: ObjectId; review?: boolean; limit?: number } = {},
) {
  const byId = new Set(opts.ids);
  const dueIds = new Set(state.due.map((q) => q.quizId));
  let candidates = state.data.quiz.filter((q) => q.enabled !== false && q.type !== 'skyPick');
  if (opts.ids) candidates = candidates.filter((q) => byId.has(q.id));
  else if (opts.review) candidates = candidates.filter((q) => dueIds.has(q.id));
  else if (opts.objectId) {
    const con =
      state.cat.starById.get(opts.objectId)?.con ?? state.cat.dsoById.get(opts.objectId)?.con;
    candidates = candidates.filter(
      (q) => q.objectId === opts.objectId || (!!con && q.constellation === con),
    );
  }
  candidates.sort(
    (a, b) =>
      Number(state.snap.quizResults.has(a.id)) - Number(state.snap.quizResults.has(b.id)) ||
      Number(dueIds.has(b.id)) - Number(dueIds.has(a.id)) ||
      a.difficulty - b.difficulty ||
      a.id.localeCompare(b.id),
  );
  const out: QuizItem[] = [];
  while (candidates.length && out.length < (opts.limit ?? 5)) {
    const last = out.at(-1);
    const index = Math.max(
      0,
      candidates.findIndex((q) => q.objectId !== last?.objectId),
    );
    out.push(candidates.splice(index, 1)[0]!);
  }
  return out;
}

/** 마지막 응답·복습·스테이지 완료를 함께 저장한다. runId+index로 재전송의 중복 채점을 막는다. */
export async function recordStageAnswer(
  stageId: string,
  runId: string,
  index: number,
  answer: StageAnswer['answer'],
) {
  const data = await loadLearnData();
  const stage = QUIZ_STAGES.find((s) => s.id === stageId);
  if (!stage || !runId || !Number.isInteger(index)) throw new Error('Unknown stage');
  const questions = stageQuestions(stage, data.quiz);
  const q = questions[index];
  if (!q || !validAnswer(q, answer)) throw new Error('Invalid answer');
  const db = getDb();
  const result = await db.transaction('rw', db.progress, async () => {
    const rows = await db.progress.toArray();
    const completed = rows.find((r) => !r.deletedAt && r.key === 'learn.stage:' + runId);
    const draft = rows.find((r) => !r.deletedAt && r.key === 'learn.stage-draft:' + runId);
    const saved = (completed?.value ?? draft?.value) as
      { stageId: string; stageVersion: number; answers: StageAnswer[] } | undefined;
    if (saved && (saved.stageId !== stage.id || saved.stageVersion !== stage.version))
      throw new Error('Session mismatch');
    const answers = saved?.answers ?? [];
    if (index < answers.length) {
      if (answers[index]?.answer !== answer) throw new Error('Answer already submitted');
      return {
        correct: answer === q.answer,
        result: completed ? gradeStage(stage, data.quiz, answers) : null,
      };
    }
    if (index !== answers.length) throw new Error('Answer out of order');
    const runs = rows
      .filter((r) => !r.deletedAt && r.key.startsWith('learn.stage:'))
      .flatMap((r) => {
        const run = parseStageRun(r.value);
        return run ? [run] : [];
      });
    if (!stageProgress(data.quiz, runs).find((p) => p.stage.id === stage.id)?.unlocked)
      throw new Error('Stage locked');
    const at = new Date();
    const correct = await recordAnswer(q, answer, at);
    const next = [...answers, { quizId: q.id, version: q.version ?? 1, answer }];
    const final = next.length === questions.length;
    const value = {
      runId,
      stageId,
      stageVersion: stage.version,
      answers: next,
      completedAt: at.toISOString(),
    } satisfies StageRun;
    await db.progress.put({
      id: final ? newId() : (draft?.id ?? newId()),
      key: (final ? 'learn.stage:' : 'learn.stage-draft:') + runId,
      value,
      schemaVersion: 1,
      createdAt: draft?.createdAt ?? at.toISOString(),
      updatedAt: at.toISOString(),
    });
    if (final && draft) await db.progress.delete(draft.id);
    return { correct, result: final ? gradeStage(stage, data.quiz, next) : null };
  });
  emitDbChange('progress');
  return result;
}
