/**
 * 학습 진행 엔진(task-07 §3.3, D-025): 앱 상태 스냅샷(기록·읽음·스킬 이벤트·퀴즈 결과·체크리스트)을 받아
 * 미션 단계 완료·미션 완료·새 배지·"지금 할 수 있는 미션"을 계산하는 순수 함수들. DB 접근 없음.
 */
import { moonPhaseName, type MoonPhaseName } from '../astro/bodies';
import { kindOf, PLANET_KEYS, type ObjectId } from '../catalog/objectId';
import type { Observation } from '../db/types';
import type {
  Badge,
  BadgeRule,
  Level,
  Mission,
  MissionStep,
  ObserveCategory,
  Season,
  Skill,
} from './schema';

export interface SkillEvent {
  type: Skill;
  at: string;
  meta?: Record<string, unknown>;
}

export interface QuizResult {
  quizId: string;
  /** 최근 응답이 정답인가 */
  correct: boolean;
  /** 최초 응답이 정답인가(연속 정답 배지용) */
  firstAttemptCorrect: boolean;
  at: string;
  attempts: number;
  version: number;
}

export interface LearnSnapshot {
  /** 삭제 제외 전체 기록 */
  observations: readonly Observation[];
  readSet: ReadonlySet<ObjectId>;
  /** 하늘에서 찾아가기 완료(중앙 진입·수동 확인) */
  foundSet: ReadonlySet<ObjectId>;
  skillEvents: readonly SkillEvent[];
  quizResults: ReadonlyMap<string, QuizResult>;
  /** `${missionId}:${stepIndex}:${itemIndex}` */
  checked: ReadonlySet<string>;
  completedMissions: ReadonlySet<string>;
  earnedBadges: ReadonlySet<string>;
}

export interface CatalogLookups {
  categoryOf(id: ObjectId): ObserveCategory | null;
  messierOf(id: ObjectId): number | null;
  caldwellOf(id: ObjectId): number | null;
}

export interface StepStatus {
  step: MissionStep;
  done: boolean;
  /** 진행 중인 단계의 부분 진행(퀴즈 정답 수, 체크 수 등) */
  progress?: { n: number; total: number };
}

export interface MissionStatus {
  mission: Mission;
  steps: StepStatus[];
  doneCount: number;
  total: number;
  done: boolean;
  /** 선행 미션 미완료 */
  locked: boolean;
}

export const checklistKey = (missionId: string, stepIndex: number, itemIndex: number): string =>
  `${missionId}:${stepIndex}:${itemIndex}`;

const seenOf = (snap: LearnSnapshot, id: ObjectId): Observation[] =>
  snap.observations.filter((o) => o.objectId === id && o.outcome === 'seen');

export function evaluateStep(
  step: MissionStep,
  snap: LearnSnapshot,
  ctx: { missionId: string; stepIndex: number; lookups: CatalogLookups },
): StepStatus {
  switch (step.type) {
    case 'find':
      return {
        step,
        done: snap.foundSet.has(step.objectId) || seenOf(snap, step.objectId).length > 0,
      };
    case 'observe': {
      const min = step.minRating ?? 0;
      return { step, done: seenOf(snap, step.objectId).some((o) => (o.rating ?? 0) >= min) };
    }
    case 'observeAny': {
      const ids = new Set(
        snap.observations
          .filter(
            (o) => o.outcome === 'seen' && ctx.lookups.categoryOf(o.objectId) === step.category,
          )
          .map((o) => o.objectId),
      );
      return {
        step,
        done: ids.size >= step.count,
        progress: { n: Math.min(ids.size, step.count), total: step.count },
      };
    }
    case 'read':
      return { step, done: snap.readSet.has(step.contentId) };
    case 'quiz': {
      const correct = step.quizIds.filter((q) => snap.quizResults.get(q)?.correct).length;
      const need = Math.ceil(step.quizIds.length * step.passRatio);
      return {
        step,
        done: correct >= need,
        progress: { n: Math.min(correct, need), total: need },
      };
    }
    case 'skill':
      return { step, done: snap.skillEvents.some((e) => e.type === step.skill) };
    case 'checklist': {
      const n = step.items.filter((_, i) =>
        snap.checked.has(checklistKey(ctx.missionId, ctx.stepIndex, i)),
      ).length;
      return { step, done: n === step.items.length, progress: { n, total: step.items.length } };
    }
  }
}

export function evaluateMission(
  mission: Mission,
  snap: LearnSnapshot,
  lookups: CatalogLookups,
): MissionStatus {
  const steps = mission.steps.map((step, i) =>
    evaluateStep(step, snap, { missionId: mission.id, stepIndex: i, lookups }),
  );
  const doneCount = steps.filter((s) => s.done).length;
  const locked = (mission.requires?.prerequisiteMissionIds ?? []).some(
    (id) => !snap.completedMissions.has(id),
  );
  return {
    mission,
    steps,
    doneCount,
    total: steps.length,
    done: doneCount === steps.length && steps.length > 0,
    locked,
  };
}

/** 계절 시그니처 구성 별(HIP). 모두 관측(seen)해야 배지. */
export const SEASON_SIGNATURE_MEMBERS: Record<
  Extract<BadgeRule, { key: 'seasonSignature' }>['id'],
  ObjectId[]
> = {
  summerTriangle: ['star:HIP91262', 'star:HIP102098', 'star:HIP97649'],
  winterDiamond: [
    'star:HIP32349',
    'star:HIP24436',
    'star:HIP21421',
    'star:HIP24608',
    'star:HIP37826',
    'star:HIP37279',
  ],
  springTriangle: ['star:HIP69673', 'star:HIP65474', 'star:HIP57632'],
  autumnSquare: ['star:HIP677', 'star:HIP113881', 'star:HIP113963', 'star:HIP1067'],
};

const MOON_PHASES: MoonPhaseName[] = [
  'new',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'full',
  'waningGibbous',
  'lastQuarter',
  'waningCrescent',
];

/** 연속 관측 밤(nightKey 기준) 최장 길이 */
export function longestNightStreak(nightKeys: Iterable<string>): number {
  const days = [...new Set(nightKeys)]
    .map((k) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)))
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = Number.NaN;
  for (const d of days) {
    run = d - prev === 86_400_000 ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
  }
  return best;
}

/** 서로 다른 문항의 최초 응답 연속 정답 최장 길이(시간순) */
export function longestQuizStreak(results: Iterable<QuizResult>): number {
  const ordered = [...results].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  let best = 0;
  let run = 0;
  for (const r of ordered) {
    run = r.firstAttemptCorrect ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export function badgeSatisfied(
  rule: BadgeRule,
  snap: LearnSnapshot,
  lookups: CatalogLookups,
): boolean {
  const seen = snap.observations.filter((o) => o.outcome === 'seen');
  const seenIds = new Set(seen.map((o) => o.objectId));
  const distinct = (f: (id: ObjectId) => boolean) => [...seenIds].filter(f).length;
  switch (rule.key) {
    case 'firstObservation':
      return seen.length > 0;
    case 'firstSketch':
      return (
        seen.some((o) => !!o.sketchBlobId) || snap.skillEvents.some((e) => e.type === 'sketch')
      );
    case 'firstStarHop':
      return snap.skillEvents.some((e) => e.type === 'starhop');
    case 'align2Success':
      return snap.skillEvents.some((e) => e.type === 'align2');
    case 'messierCount':
      return distinct((id) => lookups.messierOf(id) !== null) >= rule.n;
    case 'constellationCount':
      return distinct((id) => kindOf(id) === 'const') >= rule.n;
    case 'caldwellCount':
      return distinct((id) => lookups.caldwellOf(id) !== null) >= rule.n;
    case 'planetsAll':
      return PLANET_KEYS.every((k) => seenIds.has(`planet:${k}`));
    case 'moonPhasesAll': {
      const phases = new Set(
        seen
          .filter((o) => o.objectId === 'moon' && o.conditions?.moonPhaseDeg !== undefined)
          .map((o) => moonPhaseName(o.conditions!.moonPhaseDeg!)),
      );
      return MOON_PHASES.every((p) => phases.has(p));
    }
    case 'streakNights':
      return longestNightStreak(seen.map((o) => o.nightKey)) >= rule.n;
    case 'seasonSignature':
      return SEASON_SIGNATURE_MEMBERS[rule.id].every((id) => seenIds.has(id));
    case 'missionsCompleted':
      return snap.completedMissions.size >= rule.n;
    case 'quizStreak':
      return longestQuizStreak(snap.quizResults.values()) >= rule.n;
  }
}

/** 아직 얻지 않았고 조건을 만족하는 배지(활성만) */
export function newBadges(
  badges: readonly Badge[],
  snap: LearnSnapshot,
  lookups: CatalogLookups,
): Badge[] {
  return badges.filter(
    (b) =>
      b.enabled !== false && !snap.earnedBadges.has(b.id) && badgeSatisfied(b.rule, snap, lookups),
  );
}

/** 월 기준 계절(D-025): 3~5 봄, 6~8 여름, 9~11 가을, 12~2 겨울 */
export function seasonOf(date: Date, timeZone = 'Asia/Seoul'): Exclude<Season, 'any'> {
  const m = Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone }).format(date));
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export interface AvailabilityCtx {
  season: Exclude<Season, 'any'>;
  /** 사용자가 가진 장비. 맨눈은 항상 */
  equipment: ReadonlySet<Level>;
  /** 오늘 밤 어두운 구간 안 최고 고도(없으면 null). 고도 조건은 25°. */
  altMaxOf(id: ObjectId): number | null;
  minAltDeg?: number;
}

export const MISSION_MIN_ALT_DEG = 25;
const LEVEL_ORDER: Record<Level, number> = { naked: 0, binoculars: 1, telescope: 2 };

/** 미션의 관측 대상(find/observe) id */
export function missionTargets(m: Mission): ObjectId[] {
  const ids: ObjectId[] = [];
  for (const s of m.steps)
    if ((s.type === 'find' || s.type === 'observe') && !ids.includes(s.objectId))
      ids.push(s.objectId);
  return ids;
}

export interface MissionAvailability {
  status: MissionStatus;
  /** 오늘 밤 가능한가(가시성·계절·장비·선행) */
  available: boolean;
  reasons: ('disabled' | 'done' | 'locked' | 'season' | 'equipment' | 'visibility')[];
}

export function missionAvailability(
  status: MissionStatus,
  ctx: AvailabilityCtx,
): MissionAvailability {
  const m = status.mission;
  const reasons: MissionAvailability['reasons'] = [];
  if (m.enabled === false) reasons.push('disabled');
  if (status.done) reasons.push('done');
  if (status.locked) reasons.push('locked');
  if (m.season && m.season !== 'any' && m.season !== ctx.season) reasons.push('season');
  const eq = m.requires?.equipment ?? [m.level];
  if (!eq.some((e) => e === 'naked' || ctx.equipment.has(e))) reasons.push('equipment');
  const minAlt = ctx.minAltDeg ?? MISSION_MIN_ALT_DEG;
  const targets = missionTargets(m);
  if (targets.length > 0) {
    const ok = targets.every((id) => {
      const a = ctx.altMaxOf(id);
      return a !== null && a >= minAlt;
    });
    if (!ok) reasons.push('visibility');
  }
  return { status, available: reasons.length === 0, reasons };
}

/** "지금 할 수 있는 미션" 상위 n개: 진행 중인 것 먼저, 그다음 쉬운 장비·짧은 시간 순 */
export function availableMissions(
  statuses: readonly MissionStatus[],
  ctx: AvailabilityCtx,
  limit = 3,
): MissionAvailability[] {
  return statuses
    .map((s) => missionAvailability(s, ctx))
    .filter((a) => a.available)
    .sort(
      (a, b) =>
        Number(b.status.doneCount > 0) - Number(a.status.doneCount > 0) ||
        LEVEL_ORDER[a.status.mission.level] - LEVEL_ORDER[b.status.mission.level] ||
        a.status.mission.estimatedMinutes - b.status.mission.estimatedMinutes ||
        a.status.mission.id.localeCompare(b.status.mission.id),
    )
    .slice(0, limit);
}
