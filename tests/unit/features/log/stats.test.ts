import { describe, expect, it } from 'vitest';
import { bodyState } from '@/astro/bodies';
import { constellationAt } from '@/astro/frames';
import { nightKey } from '@/astro/time';
import type { Catalog, ConstellationData, DsoData, NamedStar } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { Observation } from '@/db/types';
import {
  computeStats,
  computeStreak,
  constellationOf,
  dayIndex,
  messierId,
  recentMonths,
} from '@/features/log/stats';

// ---- 최소 카탈로그(실제 데이터 없이) ----------------------------------------------------------

const SITE = { lat: 36.37, lon: 127.36, elevation: 70, name: '대전' };

function star(id: ObjectId, con: string, ra: number, dec: number, ko: string): NamedStar {
  return { id, hip: 0, hygId: 0, ko, con, mag: 1, ra, dec };
}

function dso(
  id: ObjectId,
  con: string,
  over: Partial<DsoData> & { messier?: number; caldwell?: number } = {},
): DsoData {
  return {
    id,
    aliases: [],
    names: { common: [] },
    type: 'G',
    category: 'galaxy',
    ra: 0,
    dec: 0,
    con,
    ...over,
  };
}

function con(en: string, ko: string): ConstellationData {
  return { en, ko, label: [0, 0], lines: [], bounds: [] };
}

const STARS = [
  star('star:HIP91262', 'Lyr', 279.23, 38.78, '직녀성'),
  star('star:HIP27989', 'Ori', 88.79, 7.41, '베텔게우스'),
  star('star:HIP32349', 'CMa', 101.29, -16.72, '시리우스'),
];
const DSOS = [
  dso('dso:M31', 'And', { messier: 31, names: { common: [], ko: '안드로메다은하' } }),
  dso('dso:M42', 'Ori', { messier: 42, category: 'nebula' }),
  dso('dso:M13', 'Her', { messier: 13, category: 'globularCluster' }),
  dso('dso:NGC7000', 'Cyg', { caldwell: 20, category: 'nebula' }),
  dso('dso:NGC869', 'Per', { caldwell: 14, category: 'openCluster' }),
  dso('dso:C41', 'Tau', { caldwell: 41, category: 'openCluster' }),
  dso('dso:IC434', 'Ori', { category: 'nebula' }),
];
const CONSTELLATIONS: Record<string, ConstellationData> = {
  And: con('Andromeda', '안드로메다자리'),
  CMa: con('Canis Major', '큰개자리'),
  Cyg: con('Cygnus', '백조자리'),
  Her: con('Hercules', '헤르쿨레스자리'),
  Leo: con('Leo', '사자자리'),
  Lyr: con('Lyra', '거문고자리'),
  Ori: con('Orion', '오리온자리'),
  Per: con('Perseus', '페르세우스자리'),
  Sgr: con('Sagittarius', '궁수자리'),
  Tau: con('Taurus', '황소자리'),
  UMa: con('Ursa Major', '큰곰자리'),
};

const CAT: Catalog = {
  stars: STARS,
  starById: new Map(STARS.map((s) => [s.id, s])),
  starVectors: new Float32Array(0),
  constellations: CONSTELLATIONS,
  dso: DSOS,
  dsoById: new Map(DSOS.map((d) => [d.id, d])),
  dsoVectors: new Float32Array(0),
  bodies: [],
  bodyById: new Map(),
};

// ---- 기록 20건 ---------------------------------------------------------------------------------

let seq = 0;
function obs(objectId: ObjectId, observedAt: string, over: Partial<Observation> = {}): Observation {
  seq += 1;
  return {
    id: `obs-${seq}`,
    objectId,
    observedAt,
    nightKey: nightKey(new Date(observedAt)),
    outcome: 'seen',
    site: SITE,
    notes: '',
    tags: [],
    createdAt: observedAt,
    updatedAt: observedAt,
    schemaVersion: 1,
    ...over,
  };
}

/** 지금 = 2026-09-08 21:00 KST → 오늘 밤 '2026-09-08' */
const NOW = new Date('2026-09-08T12:00:00.000Z');

const RECORDS: Observation[] = [
  obs('star:HIP91262', '2026-08-20T12:00:00.000Z'), // 1 거문고 · 밤 08-20
  obs('dso:M31', '2026-08-30T13:00:00.000Z'), // 2 안드로메다 · 밤 08-30
  obs('dso:M42', '2026-08-31T18:00:00.000Z'), // 3 03:00 KST 9/1 → 밤 08-31(자정 넘김)
  obs('planet:saturn', '2026-08-31T12:00:00.000Z'), // 4 밤 08-31
  obs('planet:jupiter', '2026-09-06T12:00:00.000Z'), // 5 밤 09-06
  obs('moon', '2026-09-06T11:00:00.000Z', { conditions: { moonPhaseDeg: 90 } }), // 6 상현
  obs('moon', '2026-09-07T12:00:00.000Z', { conditions: { moonPhaseDeg: 180 } }), // 7 보름
  obs('moon', '2026-09-08T10:00:00.000Z', { conditions: { moonPhaseDeg: 45 } }), // 8 초승
  obs('star:HIP27989', '2026-09-07T19:00:00.000Z'), // 9 04:00 KST 9/8 → 밤 09-07(자정 넘김)
  obs('dso:NGC869', '2026-09-08T12:00:00.000Z'), // 10 콜드웰 14
  obs('dso:NGC7000', '2026-09-08T13:00:00.000Z'), // 11 콜드웰 20
  obs('planet:saturn', '2026-09-08T14:00:00.000Z'), // 12
  obs('planet:saturn', '2026-09-07T13:00:00.000Z'), // 13
  obs('dso:M31', '2026-09-06T14:00:00.000Z'), // 14
  obs('const:Sgr', '2026-08-30T14:00:00.000Z'), // 15 별자리 자체
  obs('star:HIP99999', '2026-09-08T15:00:00.000Z'), // 16 팩 전용 별(카탈로그에 없음) · 마지막 관측
  obs('dso:IC434', '2026-09-07T14:00:00.000Z'), // 17
  obs('dso:M13', '2026-07-15T12:00:00.000Z', { outcome: 'notSeen' }), // 18 시도(제외)
  obs('planet:mars', '2026-09-08T12:30:00.000Z', { outcome: 'notSeen' }), // 19 시도(제외)
  obs('sun', '2026-09-08T03:00:00.000Z'), // 20 12:00 KST 9/8 → 밤 09-08
];

describe('computeStats — 기록 20건', () => {
  const stats = computeStats(RECORDS, CAT, { now: NOW });

  it('입력이 20건이고 자정 넘긴 기록의 nightKey가 그 밤에 묶인다', () => {
    expect(RECORDS).toHaveLength(20);
    expect(RECORDS[2]?.nightKey).toBe('2026-08-31');
    expect(RECORDS[8]?.nightKey).toBe('2026-09-07');
    expect(RECORDS[19]?.nightKey).toBe('2026-09-08');
  });

  it('관측·시도·대상·밤 수', () => {
    expect(stats.seenCount).toBe(18);
    expect(stats.attemptedCount).toBe(2);
    expect(stats.objectCount).toBe(13);
    expect(stats.nightCount).toBe(6);
  });

  it('종류별 카운트(시도 제외)', () => {
    expect(stats.byKind).toEqual({ star: 3, dso: 6, planet: 4, moon: 3, sun: 1, const: 1 });
  });

  it('별자리: 카탈로그 con + const 자기 자신 + 천체는 위치로, 팩 전용 별은 제외', () => {
    const { done, remaining, total } = stats.constellations;
    expect(total).toBe(88);
    for (const c of ['Lyr', 'And', 'Ori', 'Per', 'Cyg', 'Sgr']) expect(done).toContain(c);
    // 9월 8일 정오의 태양은 사자자리
    expect(done).toContain('Leo');
    // 시도만 한 M13(헤르쿨레스)·본 적 없는 시리우스(큰개)는 남은 목록에
    expect(done).not.toContain('Her');
    expect(remaining).toContain('Her');
    expect(remaining).toContain('CMa');
    expect(remaining).toContain('UMa');
    // 카탈로그 키 = done ∪ remaining (천체 위치로만 판정된 별자리는 키에 없을 수 있다)
    for (const k of Object.keys(CONSTELLATIONS)) expect([...done, ...remaining]).toContain(k);
    expect(done).toEqual([...done].sort());
    expect(remaining).toEqual([...remaining].sort());
  });

  it('행성·달·태양은 관측 시각·장소의 J2000 좌표로 별자리를 판정한다', () => {
    const saturn = RECORDS[3];
    expect(saturn).toBeDefined();
    if (!saturn) return;
    const st = bodyState('saturn', new Date(saturn.observedAt), SITE);
    expect(constellationOf(saturn, CAT)).toBe(
      constellationAt(st.raJ2000Deg, st.decJ2000Deg).symbol,
    );
    expect(constellationOf(obs('const:UMa', '2026-09-08T12:00:00.000Z'), null)).toBe('UMa');
  });

  it('팩 전용 별은 resolveJ2000이 있으면 별자리에 포함된다', () => {
    const withResolver = computeStats(RECORDS, CAT, {
      now: NOW,
      resolveJ2000: (id) => (id === 'star:HIP99999' ? { raDeg: 101.29, decDeg: -16.72 } : null),
    });
    expect(withResolver.constellations.done).toContain('CMa');
    expect(withResolver.constellations.remaining).not.toContain('CMa');
    expect(withResolver.constellations.done).toHaveLength(stats.constellations.done.length + 1);
  });

  it('메시에 110 중 n + 남은 목록(시도한 M13 제외)', () => {
    expect(stats.messier.total).toBe(110);
    expect(stats.messier.done).toEqual([31, 42]);
    expect(stats.messier.remaining).toHaveLength(108);
    expect(stats.messier.remaining[0]).toBe(1);
    expect(stats.messier.remaining).toContain(13);
    expect(stats.messier.remaining).not.toContain(31);
    expect(messierId(31)).toBe('dso:M31');
  });

  it('콜드웰 109 중 n + 남은 목록은 카탈로그 id를 함께 준다', () => {
    expect(stats.caldwell.total).toBe(109);
    expect(stats.caldwell.done).toEqual([14, 20]);
    expect(stats.caldwell.remaining).toHaveLength(107);
    expect(stats.caldwell.remaining.find((e) => e.n === 41)).toEqual({ n: 41, id: 'dso:C41' });
    expect(stats.caldwell.remaining.find((e) => e.n === 1)).toEqual({ n: 1, id: null });
    expect(stats.caldwell.remaining.some((e) => e.n === 14 || e.n === 20)).toBe(false);
  });

  it('행성 7종 체크(시도한 화성은 아직) + 달·태양', () => {
    expect(stats.planets).toEqual({
      mercury: false,
      venus: false,
      mars: false,
      jupiter: true,
      saturn: true,
      uranus: false,
      neptune: false,
    });
    expect(stats.moonSeen).toBe(true);
    expect(stats.sunSeen).toBe(true);
  });

  it('달 위상 8단계 중 3단계(표준 순서)', () => {
    expect(stats.moonPhases).toEqual(['waxingCrescent', 'firstQuarter', 'full']);
  });

  it('스트릭: 연속 3밤(현재·최장), 끊긴 2밤·1밤은 최장에 못 미친다', () => {
    expect(stats.streak).toEqual({ current: 3, longest: 3 });
  });

  it('가장 많이 본 대상 3개(동률은 최근에 본 것 먼저)', () => {
    expect(stats.topObjects.map((t) => [t.id, t.count])).toEqual([
      ['planet:saturn', 3],
      ['moon', 3],
      ['dso:M31', 2],
    ]);
    expect(stats.topObjects[0]?.lastAt).toBe('2026-09-08T14:00:00.000Z');
  });

  it('월별 카운트(최근 12개월, 오래된 순, 시도 제외)', () => {
    expect(stats.monthly).toHaveLength(12);
    expect(stats.monthly[0]?.ym).toBe('2025-10');
    expect(stats.monthly[11]).toEqual({ ym: '2026-09', count: 13 });
    expect(stats.monthly[10]).toEqual({ ym: '2026-08', count: 5 });
    expect(stats.monthly[9]).toEqual({ ym: '2026-07', count: 0 });
    expect(stats.monthly.reduce((s, m) => s + m.count, 0)).toBe(18);
  });

  it('첫·마지막 관측 시각', () => {
    expect(stats.firstAt).toBe('2026-08-20T12:00:00.000Z');
    expect(stats.lastAt).toBe('2026-09-08T15:00:00.000Z');
  });
});

describe('computeStats — 경계', () => {
  it('기록이 없으면 0·빈 목록·null', () => {
    const s = computeStats([], CAT, { now: NOW });
    expect(s.seenCount).toBe(0);
    expect(s.attemptedCount).toBe(0);
    expect(s.objectCount).toBe(0);
    expect(s.nightCount).toBe(0);
    expect(s.constellations.done).toEqual([]);
    expect(s.constellations.remaining).toHaveLength(Object.keys(CONSTELLATIONS).length);
    expect(s.messier.remaining).toHaveLength(110);
    expect(s.caldwell.remaining).toHaveLength(109);
    expect(s.moonPhases).toEqual([]);
    expect(s.streak).toEqual({ current: 0, longest: 0 });
    expect(s.topObjects).toEqual([]);
    expect(s.monthly.every((m) => m.count === 0)).toBe(true);
    expect(s.firstAt).toBeNull();
    expect(s.lastAt).toBeNull();
  });

  it('카탈로그가 없어도 계산되고(별·DSO 별자리·메시에는 판정 불가) 천체·const는 판정된다', () => {
    const s = computeStats(RECORDS, null, { now: NOW });
    expect(s.seenCount).toBe(18);
    expect(s.constellations.remaining).toEqual([]);
    expect(s.constellations.done).toContain('Sgr');
    expect(s.constellations.done).toContain('Leo');
    expect(s.constellations.done).not.toContain('Lyr');
    expect(s.messier.done).toEqual([]);
    expect(s.caldwell.remaining.every((e) => e.id === null)).toBe(true);
  });

  it('달 위상은 달을 본 기록의 moonPhaseDeg만 센다(다른 대상의 달 조건은 무시)', () => {
    const s = computeStats(
      [
        obs('dso:M31', '2026-09-06T12:00:00.000Z', { conditions: { moonPhaseDeg: 180 } }),
        obs('moon', '2026-09-07T12:00:00.000Z', { conditions: { moonPhaseDeg: 359 } }),
        obs('moon', '2026-09-08T12:00:00.000Z'),
      ],
      CAT,
      { now: NOW },
    );
    expect(s.moonPhases).toEqual(['new']);
  });
});

describe('computeStreak', () => {
  it('자정 넘긴 기록만으로 이어진 밤도 연속으로 센다', () => {
    const late = [
      obs('moon', '2026-09-06T17:00:00.000Z'), // 02:00 KST 9/7 → 밤 09-06
      obs('moon', '2026-09-07T17:00:00.000Z'), // 밤 09-07
      obs('moon', '2026-09-08T17:00:00.000Z'), // 밤 09-08
    ];
    expect(late.map((o) => o.nightKey)).toEqual(['2026-09-06', '2026-09-07', '2026-09-08']);
    // 지금 = 9/9 11:00 KST → 아직 밤 09-08
    const s = computeStats(late, CAT, { now: new Date('2026-09-09T02:00:00.000Z') });
    expect(s.streak).toEqual({ current: 3, longest: 3 });
  });

  it('오늘 밤 기록이 없어도 어젯밤까지의 스트릭은 살아 있고, 이틀 비면 0', () => {
    const nights = ['2026-09-06', '2026-09-07', '2026-09-08'];
    expect(computeStreak(nights, '2026-09-08')).toEqual({ current: 3, longest: 3 });
    expect(computeStreak(nights, '2026-09-09')).toEqual({ current: 3, longest: 3 });
    expect(computeStreak(nights, '2026-09-10')).toEqual({ current: 0, longest: 3 });
  });

  it('최장 스트릭은 과거 구간에서도 찾는다(중복 밤은 한 번)', () => {
    const nights = [
      '2026-08-01',
      '2026-08-02',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-09-08',
    ];
    expect(computeStreak(nights, '2026-09-08')).toEqual({ current: 1, longest: 4 });
    // 월말→월초도 연속
    expect(computeStreak(['2026-08-31', '2026-09-01'], '2026-09-01')).toEqual({
      current: 2,
      longest: 2,
    });
    expect(dayIndex('2026-09-01') - dayIndex('2026-08-31')).toBe(1);
  });
});

describe('recentMonths', () => {
  it('연도 경계를 넘어 오래된 순으로 준다', () => {
    expect(recentMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(recentMonths('2026-09', 1)).toEqual(['2026-09']);
  });
});
