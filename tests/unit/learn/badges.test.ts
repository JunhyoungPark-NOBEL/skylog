import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { badgeProgress, type CatalogLookups, type LearnSnapshot } from '@/learn/engine';
import { HOP_COURSES } from '@/learn/hopCourses';
import { validateLearnData, type Badge, type LearnData } from '@/learn/schema';
import type { Observation } from '@/db/types';

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const badges = read<Badge[]>('public/data/learn/v2/badges.json');
const old = read<Badge[]>('public/data/learn/v1/badges.json');
const data: LearnData = {
  badges,
  paths: read('public/data/learn/v1/paths.json'),
  missions: read('public/data/learn/v1/missions.json'),
  quiz: read('public/data/learn/v1/quiz.json'),
};
const lookups: CatalogLookups = {
  categoryOf: () => null,
  messierOf: (id) =>
    id === 'dso:NGC224' ? 31 : id.startsWith('dso:M') ? Number(id.slice(5)) : null,
  caldwellOf: (id) =>
    id === 'dso:NGC869' ? 14 : id.startsWith('dso:C') ? Number(id.slice(5)) : null,
};
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
function obs(objectId: Observation['objectId'], over: Partial<Observation> = {}): Observation {
  return {
    id: objectId,
    objectId,
    observedAt: '2026-09-07T12:00:00Z',
    nightKey: '2026-09-07',
    outcome: 'seen',
    site: { lat: 36, lon: 127 },
    notes: '',
    tags: [],
    createdAt: '2026-09-07T12:00:00Z',
    updatedAt: '2026-09-07T12:00:00Z',
    schemaVersion: 1,
    ...over,
  };
}

describe('48개 업적 팩과 실제 진도', () => {
  it('v1 18개 ID·규칙과 문구를 보존하고 v2에 한영 도전 30개만 더한다', () => {
    expect(old).toHaveLength(18);
    expect(badges).toHaveLength(48);
    expect(badges.filter((b) => b.enabled !== false)).toHaveLength(48);
    expect(badges.slice(0, 18).map(({ tier: _tier, ...b }) => b)).toEqual(old);
    expect(badges.slice(18).every((b) => b.title.en && b.description.en && b.tier)).toBe(true);
    expect(validateLearnData(data).errors).toEqual([]);
    const manifest = read<{ version: number; count: number }>('public/data/learn/v2/manifest.json');
    expect(manifest).toMatchObject({ version: 2, count: 48 });
  });
  it('중복 ID·누락된 목표·소수 목표·잘못된 계절 규칙을 거부한다', () => {
    const b = badges[18]!;
    expect(validateLearnData({ ...data, badges: [b, b] }).errors.join()).toContain('중복');
    for (const rule of [
      { key: 'observedObjects' },
      { key: 'observedObjects', n: 1.5 },
      { key: 'seasonSignature', id: 'wrong' },
    ]) {
      expect(
        validateLearnData({ ...data, badges: [{ ...b, rule } as Badge] }).errors.length,
      ).toBeGreaterThan(0);
    }
  });
  it('다른 기록 ID·반복 가져오기·카탈로그 별칭으로 고유 관측 수를 늘리지 않는다', () => {
    const s = snap({
      observations: [
        obs('dso:M31'),
        obs('dso:M31', { id: 'import-copy' }),
        obs('dso:NGC224'),
        obs('dso:M42', { outcome: 'notSeen' }),
        obs('dso:M13', { deletedAt: '2026-09-08' }),
        obs('dso:NGC869'),
        obs('dso:C14'),
      ],
    });
    expect(badgeProgress({ key: 'messierCount', n: 10 }, s, lookups).n).toBe(1);
    expect(badgeProgress({ key: 'caldwellCount', n: 5 }, s, lookups).n).toBe(1);
    expect(
      badgeProgress(
        { key: 'observedObjects', n: 10 },
        snap({ observations: [obs('moon'), obs('moon', { id: 'import-copy' })] }),
        lookups,
      ).n,
    ).toBe(1);
  });
  it('관측밤은 KST 정오 경계로 다시 계산하고 밤 키 조작·자정·같은 밤 중복은 세지 않는다', () => {
    const times = [
      '2026-09-07T02:59:59Z',
      '2026-09-07T03:00:00Z',
      '2026-09-07T15:00:00Z',
      '2026-09-08T02:59:59Z',
      'bad-time',
    ];
    const s = snap({
      observations: times.map((at, i) =>
        obs('moon', { id: String(i), observedAt: at, nightKey: `2099-01-0${i + 1}` }),
      ),
    });
    expect(badgeProgress({ key: 'observationNights', n: 3 }, s, lookups)).toEqual({
      n: 2,
      total: 3,
      done: false,
    });
  });
  it('메모는 공백을 제외한 20글자, 사진·스케치는 실제 파일과 서로 다른 관측 대상이 필요하다', () => {
    const s = snap({
      observations: [
        obs('moon', { notes: '가 '.repeat(20), sketchBlobId: 'sk', photoBlobIds: ['ph'] }),
        obs('moon', {
          id: 'copy',
          notes: '가'.repeat(30),
          sketchBlobId: 'sk',
          photoBlobIds: ['ph'],
        }),
        obs('planet:saturn', {
          notes: '가 '.repeat(19),
          sketchBlobId: 'missing',
          photoBlobIds: ['missing'],
        }),
        obs('dso:M31', { notes: '가'.repeat(25), outcome: 'notSeen', sketchBlobId: 'sk' }),
      ],
      sketchIds: new Set(['sk']),
      photoIds: new Set(['ph']),
    });
    for (const key of ['detailedObjects', 'sketchedObjects', 'photographedObjects'] as const)
      expect(badgeProgress({ key, n: 3 }, s, lookups)).toEqual({ n: 1, total: 3, done: false });
    expect(
      badgeProgress({ key: 'sketchedObjects', n: 3 }, { ...s, sketchIds: new Set() }, lookups).n,
    ).toBe(0);
  });
  it('대표 코스는 실제 완료 후 목표 기록까지 있어야 한 번만 센다', () => {
    const c = HOP_COURSES[0]!;
    const e = {
      type: 'starhop' as const,
      at: '2026-09-07T11:00:00Z',
      meta: { courseId: c.id, objectId: c.target, confirmed: true },
    };
    const s = snap({ observations: [obs(c.target)], skillEvents: [e, e] });
    expect(badgeProgress({ key: 'hopCoursesCompleted', n: 3 }, s, lookups).n).toBe(1);
    expect(
      badgeProgress(
        { key: 'hopCoursesCompleted', n: 3 },
        { ...s, skillEvents: [{ ...e, meta: { ...e.meta, simulated: true } }] },
        lookups,
      ).n,
    ).toBe(0);
    expect(
      badgeProgress(
        { key: 'hopCoursesCompleted', n: 3 },
        { ...s, observations: [obs(c.target, { createdAt: '2026-09-07T10:00:00Z' })] },
        lookups,
      ).n,
    ).toBe(0);
  });
  it('신규 30개 모두 현재 저장 가능한 증거만으로 달성하며 빈 이력에서는 완료하지 않는다', () => {
    const observations: Observation[] = [
      ...Array.from({ length: 110 }, (_, i) => obs(`dso:M${i + 1}`)),
      ...Array.from({ length: 15 }, (_, i) => obs(`dso:C${i + 1}`)),
      ...Array.from({ length: 24 }, (_, i) => obs(`const:${String.fromCharCode(65 + i)}aa`)),
      ...Array.from({ length: 30 }, (_, i) =>
        obs(`star:HIP${i + 1}`, {
          observedAt: new Date(Date.UTC(2026, 7, i + 1, 12)).toISOString(),
          notes: '기록'.repeat(10),
          sketchBlobId: 'sk',
          photoBlobIds: ['ph'],
        }),
      ),
      ...HOP_COURSES.map((c) => obs(c.target)),
    ];
    const s = snap({
      observations,
      sketchIds: new Set(['sk']),
      photoIds: new Set(['ph']),
      clearedStages: new Set(Array.from({ length: 40 }, (_, i) => String(i))),
      perfectStages: new Set(['1', '2', '3', '4', '5']),
      readStories: new Set(Array.from({ length: 50 }, (_, i) => `dso:M${i + 1}` as const)),
      quizResults: new Map(
        Array.from({ length: 100 }, (_, i) => [
          `q${i}`,
          {
            quizId: `q${i}`,
            correct: true,
            firstAttemptCorrect: false,
            at: '2026-09-07T11:00:00Z',
            attempts: 1,
            version: 1,
          },
        ]),
      ),
      skillEvents: HOP_COURSES.map((c) => ({
        type: 'starhop',
        at: '2026-09-07T11:00:00Z',
        meta: { courseId: c.id, objectId: c.target, confirmed: true },
      })),
    });
    for (const b of badges.slice(18)) {
      expect(badgeProgress(b.rule, snap(), lookups).done, b.id).toBe(false);
      expect(badgeProgress(b.rule, s, lookups).done, b.id).toBe(true);
    }
  });
});
