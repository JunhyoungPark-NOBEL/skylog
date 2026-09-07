import { describe, expect, it } from 'vitest';
import { nightKey } from '@/astro/time';
import type { BodyData, Catalog, DsoData } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { Observation } from '@/db/types';
import {
  byObject,
  calendarMonth,
  filterObservations,
  formatLocalDateTime,
  groupByNight,
  heatLevel,
  monthLabel,
  monthOfNight,
  nightLabel,
  normalizeQuery,
  periodStart,
  ratingGlyphs,
  recentObjectIds,
  shiftMonth,
  siteLabel,
  sortObjectSummaries,
} from '@/features/log/logUtils';

const SITE = { lat: 36.37, lon: 127.36, elevation: 70, name: '대전 (KAIST)' };

let seq = 0;
function obs(over: Partial<Observation> & { observedAt: string }): Observation {
  seq += 1;
  const objectId: ObjectId = over.objectId ?? 'planet:saturn';
  return {
    id: over.id ?? `obs-${seq}`,
    objectId,
    nightKey: over.nightKey ?? nightKey(new Date(over.observedAt)),
    outcome: over.outcome ?? 'seen',
    site: SITE,
    notes: over.notes ?? '',
    tags: over.tags ?? [],
    createdAt: over.observedAt,
    updatedAt: over.observedAt,
    schemaVersion: 1,
    ...over,
  };
}

function dso(id: ObjectId, ko: string, en: string, con: string): DsoData {
  return {
    id,
    aliases: [],
    names: { ko, en, common: [en] },
    type: 'G',
    category: 'galaxy',
    ra: 10,
    dec: 41,
    con,
  };
}
function body(id: ObjectId, ko: string, en: string, kind: BodyData['kind']): BodyData {
  return { id, body: en, names: { ko, en }, icon: '', kind };
}

/** 최소 카탈로그(별 없음): displayName·secondaryName만 쓴다 */
function fakeCatalog(): Catalog {
  const dsos = [
    dso('dso:M31', '안드로메다 은하', 'Andromeda Galaxy', 'And'),
    dso('dso:M13', '헤르쿨레스 구상성단', 'Hercules Cluster', 'Her'),
  ];
  const bodies = [
    body('planet:saturn', '토성', 'Saturn', 'planet'),
    body('planet:jupiter', '목성', 'Jupiter', 'planet'),
    body('moon', '달', 'Moon', 'moon'),
  ];
  return {
    stars: [],
    starById: new Map(),
    starVectors: new Float32Array(0),
    constellations: {},
    dso: dsos,
    dsoById: new Map(dsos.map((d) => [d.id, d])),
    dsoVectors: new Float32Array(0),
    bodies,
    bodyById: new Map(bodies.map((b) => [b.id, b])),
  };
}

describe('groupByNight', () => {
  it('자정 넘은 기록(02:00 KST)은 전날 저녁 기록과 같은 밤에 묶이고, 밤·기록 모두 최근순', () => {
    const rows = [
      obs({ id: 'a', observedAt: '2026-09-06T12:30:00.000Z' }), // 9/6 21:30 KST
      obs({ id: 'b', observedAt: '2026-09-06T17:00:00.000Z' }), // 9/7 02:00 KST → 9/6 밤
      obs({ id: 'c', observedAt: '2026-09-04T13:00:00.000Z' }), // 9/4 22:00 KST
      obs({ id: 'd', observedAt: '2026-09-07T03:30:00.000Z' }), // 9/7 12:30 KST → 9/7 밤
    ];
    const groups = groupByNight(rows);
    expect(groups.map((g) => g.nightKey)).toEqual(['2026-09-07', '2026-09-06', '2026-09-04']);
    expect(groups[1]!.rows.map((r) => r.id)).toEqual(['b', 'a']);
    expect(groups[2]!.rows).toHaveLength(1);
  });

  it('빈 입력이면 빈 배열', () => {
    expect(groupByNight([])).toEqual([]);
  });
});

describe('filterObservations', () => {
  const cat = fakeCatalog();
  const now = new Date('2026-09-07T12:00:00.000Z');
  const rows = [
    obs({ id: 'sat', observedAt: '2026-09-06T12:30:00.000Z', equipment: { kind: 'telescope' } }),
    obs({
      id: 'm31',
      observedAt: '2026-09-01T13:00:00.000Z',
      objectId: 'dso:M31',
      equipment: { kind: 'binoculars' },
      tags: ['가장자리 흐릿', 'averted'],
    }),
    obs({
      id: 'm13',
      observedAt: '2026-08-20T13:00:00.000Z',
      objectId: 'dso:M13',
      outcome: 'notSeen',
      equipment: { kind: 'naked' },
    }),
    obs({ id: 'moon', observedAt: '2026-07-01T13:00:00.000Z', objectId: 'moon' }),
  ];
  const ids = (out: Observation[]) => out.map((r) => r.id);

  it('빈 필터는 전부 통과(순서 유지)', () => {
    expect(ids(filterObservations(rows, {}, cat, { now }))).toEqual(['sat', 'm31', 'm13', 'moon']);
  });
  it('종류', () => {
    expect(ids(filterObservations(rows, { kind: 'dso' }, cat, { now }))).toEqual(['m31', 'm13']);
    expect(ids(filterObservations(rows, { kind: 'moon' }, cat, { now }))).toEqual(['moon']);
    expect(ids(filterObservations(rows, { kind: 'star' }, cat, { now }))).toEqual([]);
  });
  it('결과·장비', () => {
    expect(ids(filterObservations(rows, { outcome: 'notSeen' }, cat, { now }))).toEqual(['m13']);
    expect(ids(filterObservations(rows, { equipment: 'binoculars' }, cat, { now }))).toEqual([
      'm31',
    ]);
    // 장비가 기록되지 않은 행은 어떤 장비 필터에도 걸리지 않는다
    expect(ids(filterObservations(rows, { equipment: 'naked' }, cat, { now }))).toEqual(['m13']);
  });
  it('기간(7일·30일·전체)은 now 기준', () => {
    expect(ids(filterObservations(rows, { period: '7d' }, cat, { now }))).toEqual(['sat', 'm31']);
    expect(ids(filterObservations(rows, { period: '30d' }, cat, { now }))).toEqual([
      'sat',
      'm31',
      'm13',
    ]);
    expect(ids(filterObservations(rows, { period: 'all' }, cat, { now }))).toHaveLength(4);
    expect(periodStart('all', now)).toBeNull();
    expect(periodStart('7d', now)?.toISOString()).toBe('2026-08-31T12:00:00.000Z');
  });
  it('검색어: 한글·영문 이름, 부이름(M31), 공백 무시, 태그', () => {
    expect(ids(filterObservations(rows, { query: '안드로메다' }, cat, { now }))).toEqual(['m31']);
    expect(ids(filterObservations(rows, { query: 'andromeda' }, cat, { now }))).toEqual(['m31']);
    expect(ids(filterObservations(rows, { query: 'm 31' }, cat, { now }))).toEqual(['m31']);
    expect(ids(filterObservations(rows, { query: '토성' }, cat, { now }))).toEqual(['sat']);
    expect(ids(filterObservations(rows, { query: '흐릿' }, cat, { now }))).toEqual(['m31']);
    expect(ids(filterObservations(rows, { query: 'AVERTED' }, cat, { now }))).toEqual(['m31']);
    expect(ids(filterObservations(rows, { query: '없는이름' }, cat, { now }))).toEqual([]);
  });
  it('카탈로그가 없으면 id·태그로만 검색', () => {
    expect(ids(filterObservations(rows, { query: 'm13' }, null, { now }))).toEqual(['m13']);
    expect(ids(filterObservations(rows, { query: '토성' }, null, { now }))).toEqual([]);
  });
  it('조합: 종류 + 기간 + 검색어', () => {
    expect(
      ids(filterObservations(rows, { kind: 'dso', period: '30d', query: 'm' }, cat, { now })),
    ).toEqual(['m31', 'm13']);
  });
  it('normalizeQuery', () => {
    expect(normalizeQuery(' M 31 ')).toBe('m31');
  });
});

describe('calendarMonth', () => {
  it('2026년 9월은 화요일에 시작하고 30일까지, 셀 수는 7의 배수', () => {
    const m = calendarMonth(2026, 9, []);
    expect(m.firstWeekday).toBe(2);
    expect(m.daysInMonth).toBe(30);
    expect(m.cells.length % 7).toBe(0);
    expect(m.cells.slice(0, 2)).toEqual([null, null]);
    expect(m.cells[2]).toMatchObject({ date: '2026-09-01', day: 1, count: 0, level: 0 });
    expect(m.total).toBe(0);
  });
  it('히트 단계 0/1/2/3+ 와 이달 합계 — 다른 달 기록은 제외', () => {
    const rows = [
      obs({ observedAt: '2026-09-06T12:00:00.000Z' }),
      obs({ observedAt: '2026-09-06T14:00:00.000Z' }),
      obs({ observedAt: '2026-09-06T16:00:00.000Z' }),
      obs({ observedAt: '2026-09-06T17:30:00.000Z' }), // 9/7 02:30 KST → 9/6 밤
      obs({ observedAt: '2026-09-10T12:00:00.000Z' }),
      obs({ observedAt: '2026-09-10T13:00:00.000Z' }),
      obs({ observedAt: '2026-09-20T12:00:00.000Z' }),
      obs({ observedAt: '2026-08-31T12:00:00.000Z' }),
    ];
    const m = calendarMonth(2026, 9, rows);
    const cell = (date: string) => m.cells.find((c) => c?.date === date);
    expect(cell('2026-09-06')).toMatchObject({ count: 4, level: 3 });
    expect(cell('2026-09-10')).toMatchObject({ count: 2, level: 2 });
    expect(cell('2026-09-20')).toMatchObject({ count: 1, level: 1 });
    expect(cell('2026-09-07')).toMatchObject({ count: 0, level: 0 });
    expect(m.total).toBe(7);
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(3)).toBe(3);
    expect(heatLevel(99)).toBe(3);
  });
  it('2월·윤년', () => {
    expect(calendarMonth(2028, 2, []).daysInMonth).toBe(29);
    expect(calendarMonth(2026, 2, []).daysInMonth).toBe(28);
  });
  it('shiftMonth·monthOfNight는 연도 경계를 넘는다', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 9, -13)).toEqual({ year: 2025, month: 8 });
    expect(monthOfNight('2026-09-06')).toEqual({ year: 2026, month: 9 });
  });
});

describe('byObject', () => {
  const cat = fakeCatalog();
  const rows = [
    obs({ observedAt: '2026-09-06T12:00:00.000Z', objectId: 'planet:saturn', rating: 3 }),
    obs({ observedAt: '2026-09-01T12:00:00.000Z', objectId: 'planet:saturn', rating: 5 }),
    obs({ observedAt: '2026-08-20T12:00:00.000Z', objectId: 'planet:saturn' }),
    obs({ observedAt: '2026-09-05T12:00:00.000Z', objectId: 'dso:M31', rating: 4 }),
    obs({ observedAt: '2026-09-07T12:00:00.000Z', objectId: 'dso:M13', outcome: 'notSeen' }),
    obs({ observedAt: '2026-09-03T12:00:00.000Z', objectId: 'moon' }),
    obs({ observedAt: '2026-09-02T12:00:00.000Z', objectId: 'moon', outcome: 'notSeen' }),
  ];
  const nameOf = (id: ObjectId) =>
    id === 'planet:saturn'
      ? '토성'
      : id === 'dso:M31'
        ? '안드로메다 은하'
        : id === 'dso:M13'
          ? '헤르쿨레스 구상성단'
          : '달';

  it('요약: 횟수·최근·최고 평점·본 적 있음', () => {
    const items = byObject(rows);
    const sat = items.find((i) => i.objectId === 'planet:saturn')!;
    expect(sat).toMatchObject({ count: 3, seenCount: 3, bestRating: 5, seen: true });
    expect(sat.lastAt).toBe('2026-09-06T12:00:00.000Z');
    expect(sat.lastNightKey).toBe('2026-09-06');
    const m13 = items.find((i) => i.objectId === 'dso:M13')!;
    expect(m13).toMatchObject({ count: 1, seenCount: 0, seen: false });
    expect(m13.bestRating).toBeUndefined();
    const moon = items.find((i) => i.objectId === 'moon')!;
    expect(moon).toMatchObject({ count: 2, seenCount: 1, seen: true });
  });
  it('정렬 3종: 최근순(기본) / 이름순 / 횟수순(동률은 최근순)', () => {
    const items = byObject(rows);
    expect(items.map((i) => i.objectId)).toEqual(['dso:M13', 'planet:saturn', 'dso:M31', 'moon']);
    expect(sortObjectSummaries(items, 'name', nameOf, 'ko').map((i) => i.objectId)).toEqual([
      'moon',
      'dso:M31',
      'planet:saturn',
      'dso:M13',
    ]);
    expect(sortObjectSummaries(items, 'count', nameOf).map((i) => i.objectId)).toEqual([
      'planet:saturn',
      'moon',
      'dso:M13',
      'dso:M31',
    ]);
    // 입력을 바꾸지 않는다
    expect(items.map((i) => i.objectId)).toEqual(['dso:M13', 'planet:saturn', 'dso:M31', 'moon']);
    void cat;
  });
  it('recentObjectIds: 중복 제거·최근순·limit', () => {
    expect(recentObjectIds(rows, 3)).toEqual(['dso:M13', 'planet:saturn', 'dso:M31']);
    expect(recentObjectIds(rows)).toHaveLength(4);
  });
});

describe('라벨', () => {
  it('nightLabel: 올해면 연도 생략', () => {
    expect(nightLabel('2026-09-06', 'ko', 2026)).toBe('9월 6일 밤');
    expect(nightLabel('2025-12-31', 'ko', 2026)).toBe('2025년 12월 31일 밤');
    expect(nightLabel('2026-09-06', 'en', 2026)).toBe('Night of Sep 6');
    expect(nightLabel('2025-01-02', 'en', 2026)).toBe('Night of Jan 2, 2025');
    expect(nightLabel('2026-09-06', 'ko')).toBe('9월 6일 밤');
  });
  it('monthLabel', () => {
    expect(monthLabel(2026, 9, 'ko')).toBe('2026년 9월');
    expect(monthLabel(2026, 9, 'en')).toBe('September 2026');
  });
  it('formatLocalDateTime은 Asia/Seoul 기준', () => {
    expect(formatLocalDateTime('2026-09-06T12:30:00.000Z')).toBe('2026-09-06 21:30');
    expect(formatLocalDateTime('not a date')).toBe('—');
  });
  it('ratingGlyphs·siteLabel', () => {
    expect(ratingGlyphs(3)).toBe('★★★☆☆');
    expect(ratingGlyphs(undefined)).toBe('');
    expect(siteLabel(SITE)).toBe('대전 (KAIST)');
    expect(siteLabel({ lat: 36.37, lon: 127.36 })).toBe('36.370, 127.360');
  });
});
