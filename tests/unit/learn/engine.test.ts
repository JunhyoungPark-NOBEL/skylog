import { describe, expect, it } from 'vitest';
import {
  availableMissions,
  badgeSatisfied,
  checklistKey,
  evaluateMission,
  longestNightStreak,
  longestQuizStreak,
  newBadges,
  seasonOf,
  type CatalogLookups,
  type LearnSnapshot,
} from '@/learn/engine';
import type { Badge, Mission } from '@/learn/schema';
import type { Observation } from '@/db/types';

const SITE = { lat: 36.37, lon: 127.36, name: 'test' };
let seq = 0;
function obs(objectId: Observation['objectId'], over: Partial<Observation> = {}): Observation {
  seq++;
  const at = over.observedAt ?? `2026-09-0${(seq % 5) + 1}T12:00:00.000Z`;
  return {
    id: `o${seq}`,
    objectId,
    observedAt: at,
    nightKey: at.slice(0, 10),
    outcome: 'seen',
    site: SITE,
    notes: '',
    tags: [],
    createdAt: at,
    updatedAt: at,
    schemaVersion: 1,
    ...over,
  };
}
function snap(over: Partial<LearnSnapshot> = {}): LearnSnapshot {
  return {
    observations: [],
    readSet: new Set(),
    foundSet: new Set(),
    skillEvents: [],
    quizResults: new Map(),
    checked: new Set(),
    completedMissions: new Set(),
    earnedBadges: new Set(),
    ...over,
  };
}
const lookups: CatalogLookups = {
  categoryOf: (id) =>
    id === 'dso:M13' ? 'globularCluster' : id.startsWith('planet:') ? 'planet' : null,
  messierOf: (id) => (id.startsWith('dso:M') ? Number(id.slice(5)) : null),
  caldwellOf: (id) => (id === 'dso:NGC869' ? 14 : null),
};
const mission: Mission = {
  id: 'm1',
  title: { ko: '테스트' },
  description: { ko: '…' },
  level: 'binoculars',
  season: 'summer',
  estimatedMinutes: 20,
  requires: { equipment: ['binoculars'] },
  steps: [
    { type: 'read', contentId: 'dso:M13' },
    { type: 'checklist', items: [{ ko: 'a' }, { ko: 'b' }] },
    { type: 'find', objectId: 'dso:M13', hint: { ko: '힌트' } },
    { type: 'observe', objectId: 'dso:M13', minRating: 3 },
    { type: 'quiz', quizIds: ['q1', 'q2'], passRatio: 1 },
    { type: 'skill', skill: 'sketch' },
    { type: 'observeAny', category: 'planet', count: 2 },
  ],
  enabled: true,
};

describe('evaluateMission: 단계 판정 8종', () => {
  it('아무것도 없으면 0/7, 조건을 채우면 단계별로 완료', () => {
    const s0 = evaluateMission(mission, snap(), lookups);
    expect(s0.doneCount).toBe(0);
    expect(s0.done).toBe(false);
    const s1 = evaluateMission(
      mission,
      snap({
        readSet: new Set(['dso:M13']),
        checked: new Set([checklistKey('m1', 1, 0)]),
        foundSet: new Set(['dso:M13']),
        observations: [obs('dso:M13', { rating: 2 })],
        quizResults: new Map([
          [
            'q1',
            {
              quizId: 'q1',
              correct: true,
              firstAttemptCorrect: true,
              at: 'x',
              attempts: 1,
              version: 1,
            },
          ],
        ]),
      }),
      lookups,
    );
    expect(s1.steps.map((x) => x.done)).toEqual([true, false, true, false, false, false, false]);
    expect(s1.steps[1]!.progress).toEqual({ n: 1, total: 2 });
    expect(s1.steps[4]!.progress).toEqual({ n: 1, total: 2 });
    const s2 = evaluateMission(
      mission,
      snap({
        readSet: new Set(['dso:M13']),
        checked: new Set([checklistKey('m1', 1, 0), checklistKey('m1', 1, 1)]),
        observations: [obs('dso:M13', { rating: 4 }), obs('planet:saturn'), obs('planet:jupiter')],
        quizResults: new Map([
          [
            'q1',
            {
              quizId: 'q1',
              correct: true,
              firstAttemptCorrect: false,
              at: 'x',
              attempts: 2,
              version: 1,
            },
          ],
          [
            'q2',
            {
              quizId: 'q2',
              correct: true,
              firstAttemptCorrect: true,
              at: 'y',
              attempts: 1,
              version: 1,
            },
          ],
        ]),
        skillEvents: [{ type: 'sketch', at: 'z' }],
      }),
      lookups,
    );
    expect(s2.done).toBe(true); // 관측 기록이 있으면 find도 완료로 본다
    expect(s2.steps[6]!.progress).toEqual({ n: 2, total: 2 });
  });
  it('선행 미션이 없으면 잠김', () => {
    const m = { ...mission, requires: { prerequisiteMissionIds: ['m0'] } };
    expect(evaluateMission(m, snap(), lookups).locked).toBe(true);
    expect(evaluateMission(m, snap({ completedMissions: new Set(['m0']) }), lookups).locked).toBe(
      false,
    );
  });
});

describe('배지 규칙', () => {
  const badge = (rule: Badge['rule'], id = 'b'): Badge => ({
    id,
    title: { ko: id },
    description: { ko: '' },
    icon: '★',
    rule,
    enabled: true,
  });
  it('firstObservation·firstSketch·messierCount·constellationCount·planetsAll·streak·seasonSignature·missions·quizStreak', () => {
    const s = snap({
      observations: [
        obs('dso:M13', {
          sketchBlobId: 'sk',
          observedAt: '2026-09-01T12:00:00.000Z',
          nightKey: '2026-09-01',
        }),
        obs('dso:M31', { observedAt: '2026-09-02T12:00:00.000Z', nightKey: '2026-09-02' }),
        obs('const:Cyg', { observedAt: '2026-09-03T12:00:00.000Z', nightKey: '2026-09-03' }),
        obs('const:Lyr', { observedAt: '2026-09-05T12:00:00.000Z', nightKey: '2026-09-05' }),
        obs('star:HIP91262'),
        obs('star:HIP102098'),
        obs('star:HIP97649'),
        obs('dso:NGC869'),
        obs('dso:M57', { outcome: 'notSeen' }),
      ],
      completedMissions: new Set(['a', 'b', 'c']),
      quizResults: new Map([
        [
          'q1',
          {
            quizId: 'q1',
            correct: true,
            firstAttemptCorrect: true,
            at: '2026-09-01T00:00:00Z',
            attempts: 1,
            version: 1,
          },
        ],
        [
          'q2',
          {
            quizId: 'q2',
            correct: true,
            firstAttemptCorrect: true,
            at: '2026-09-01T00:01:00Z',
            attempts: 1,
            version: 1,
          },
        ],
        [
          'q3',
          {
            quizId: 'q3',
            correct: true,
            firstAttemptCorrect: false,
            at: '2026-09-01T00:02:00Z',
            attempts: 2,
            version: 1,
          },
        ],
        [
          'q4',
          {
            quizId: 'q4',
            correct: true,
            firstAttemptCorrect: true,
            at: '2026-09-01T00:03:00Z',
            attempts: 1,
            version: 1,
          },
        ],
      ]),
    });
    expect(badgeSatisfied({ key: 'firstObservation' }, s, lookups)).toBe(true);
    expect(badgeSatisfied({ key: 'firstSketch' }, s, lookups)).toBe(true);
    expect(badgeSatisfied({ key: 'firstStarHop' }, s, lookups)).toBe(false);
    expect(badgeSatisfied({ key: 'messierCount', n: 2 }, s, lookups)).toBe(true); // M13·M31 (M57은 못 봄)
    expect(badgeSatisfied({ key: 'messierCount', n: 3 }, s, lookups)).toBe(false);
    expect(badgeSatisfied({ key: 'constellationCount', n: 2 }, s, lookups)).toBe(true);
    expect(badgeSatisfied({ key: 'caldwellCount', n: 1 }, s, lookups)).toBe(true);
    expect(badgeSatisfied({ key: 'planetsAll' }, s, lookups)).toBe(false);
    expect(badgeSatisfied({ key: 'streakNights', n: 3 }, s, lookups)).toBe(true); // 09-01~03
    expect(badgeSatisfied({ key: 'streakNights', n: 4 }, s, lookups)).toBe(false);
    expect(badgeSatisfied({ key: 'seasonSignature', id: 'summerTriangle' }, s, lookups)).toBe(true);
    expect(badgeSatisfied({ key: 'seasonSignature', id: 'winterDiamond' }, s, lookups)).toBe(false);
    expect(badgeSatisfied({ key: 'missionsCompleted', n: 3 }, s, lookups)).toBe(true);
    expect(badgeSatisfied({ key: 'quizStreak', n: 2 }, s, lookups)).toBe(true);
    expect(badgeSatisfied({ key: 'quizStreak', n: 3 }, s, lookups)).toBe(false);
    const fresh = newBadges(
      [
        badge({ key: 'firstObservation' }, 'x'),
        badge({ key: 'planetsAll' }, 'y'),
        { ...badge({ key: 'firstSketch' }, 'z'), enabled: false },
      ],
      { ...s, earnedBadges: new Set(['x']) },
      lookups,
    );
    expect(fresh).toEqual([]);
    expect(
      newBadges([badge({ key: 'firstObservation' }, 'x')], s, lookups).map((b) => b.id),
    ).toEqual(['x']);
  });
  it('moonPhasesAll: 8단계 모두', () => {
    const phases = [0, 45, 90, 135, 180, 225, 270, 315];
    const s = snap({
      observations: phases.map((p) => obs('moon', { conditions: { moonPhaseDeg: p } })),
    });
    expect(badgeSatisfied({ key: 'moonPhasesAll' }, s, lookups)).toBe(true);
    const s7 = snap({
      observations: phases.slice(1).map((p) => obs('moon', { conditions: { moonPhaseDeg: p } })),
    });
    expect(badgeSatisfied({ key: 'moonPhasesAll' }, s7, lookups)).toBe(false);
  });
  it('스트릭 계산', () => {
    expect(longestNightStreak(['2026-09-01', '2026-09-02', '2026-09-02', '2026-09-04'])).toBe(2);
    expect(longestNightStreak([])).toBe(0);
    expect(
      longestQuizStreak([
        {
          quizId: 'a',
          correct: true,
          firstAttemptCorrect: true,
          at: '2026-01-01T00:00:02Z',
          attempts: 1,
          version: 1,
        },
        {
          quizId: 'b',
          correct: true,
          firstAttemptCorrect: true,
          at: '2026-01-01T00:00:01Z',
          attempts: 1,
          version: 1,
        },
        {
          quizId: 'c',
          correct: false,
          firstAttemptCorrect: false,
          at: '2026-01-01T00:00:03Z',
          attempts: 1,
          version: 1,
        },
      ]),
    ).toBe(2);
  });
});

describe('지금 할 수 있는 미션', () => {
  it('계절·장비·가시성·선행·완료·비활성으로 거르고 진행 중인 것을 앞에', () => {
    const m2: Mission = {
      ...mission,
      id: 'm2',
      level: 'naked',
      season: 'any',
      estimatedMinutes: 10,
      requires: { equipment: ['naked'] },
    };
    const m3: Mission = {
      ...mission,
      id: 'm3',
      level: 'naked',
      season: 'winter',
      requires: { equipment: ['naked'] },
    };
    const m4: Mission = {
      ...mission,
      id: 'm4',
      level: 'telescope',
      season: 'summer',
      requires: { equipment: ['telescope'] },
    };
    const m5: Mission = {
      ...mission,
      id: 'm5',
      level: 'naked',
      season: 'summer',
      enabled: false,
      requires: { equipment: ['naked'] },
    };
    const s = snap({ readSet: new Set(['dso:M13']) });
    m2.steps = [{ type: 'observe', objectId: 'moon' }];
    const statuses = [mission, m2, m3, m4, m5].map((m) => evaluateMission(m, s, lookups));
    const out = availableMissions(statuses, {
      season: 'summer',
      equipment: new Set(['binoculars']),
      altMaxOf: () => 40,
    });
    // m1(진행 중, 쌍안경) 먼저, 그다음 m2(맨눈, 연중). m3 계절 X, m4 장비 X, m5 비활성
    expect(out.map((a) => a.status.mission.id)).toEqual(['m1', 'm2']);
    const low = availableMissions(statuses, {
      season: 'summer',
      equipment: new Set(['binoculars']),
      altMaxOf: () => 10,
    });
    expect(low).toEqual([]);
    expect(seasonOf(new Date('2026-09-06T12:00:00Z'))).toBe('autumn');
    expect(seasonOf(new Date('2026-12-31T20:00:00Z'))).toBe('winter'); // 1월 1일 05시 KST
  });
});
