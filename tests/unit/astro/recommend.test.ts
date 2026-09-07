import { describe, expect, it } from 'vitest';
import { observingNight } from '@/astro/night';
import { azInRanges, recommend, type Candidate, type RecommendInput } from '@/astro/recommend';
import { realSkyLimitingMag } from '@/astro/realSky';
import { DOUBLE_STARS, SEASON_SIGNATURES } from '@/catalog/recommendCandidates';
import stars from '../../../public/data/stars-bright.v1.json';
import dso from '../../../public/data/dso.v1.json';

const SITE = { lat: 36.37, lon: 127.36, elevation: 70 };
const T = new Date('2026-09-06T12:00:00Z'); // 21:00 KST
const NIGHT = observingNight(SITE, T);

const SATURN: Candidate = {
  id: 'planet:saturn',
  kind: 'planet',
  bodyKey: 'saturn',
  raJ2000Deg: 0,
  decJ2000Deg: 0,
  extended: false,
};
const MOON: Candidate = {
  id: 'moon',
  kind: 'moon',
  bodyKey: 'moon',
  raJ2000Deg: 0,
  decJ2000Deg: 0,
  extended: false,
};
const VEGA: Candidate = {
  id: 'star:HIP91262',
  kind: 'star',
  raJ2000Deg: 279.2346,
  decJ2000Deg: 38.78369,
  mag: 0.03,
  extended: false,
  con: 'Lyr',
};
const M31: Candidate = {
  id: 'dso:M31',
  kind: 'dso',
  raJ2000Deg: 10.68479,
  decJ2000Deg: 41.26906,
  mag: 3.44,
  majArcmin: 177.83,
  minArcmin: 69.66,
  extended: true,
  category: 'galaxy',
  con: 'And',
};
const M13: Candidate = {
  id: 'dso:M13',
  kind: 'dso',
  raJ2000Deg: 250.4235,
  decJ2000Deg: 36.4613,
  mag: 5.8,
  majArcmin: 20,
  minArcmin: 20,
  extended: true,
  category: 'globularCluster',
  con: 'Her',
};
const M42: Candidate = {
  id: 'dso:M42',
  kind: 'dso',
  raJ2000Deg: 83.82208,
  decJ2000Deg: -5.39111,
  mag: 4,
  majArcmin: 90,
  minArcmin: 60,
  extended: true,
  category: 'nebula',
  con: 'Ori',
};
const M101: Candidate = {
  id: 'dso:M101',
  kind: 'dso',
  raJ2000Deg: 210.8023,
  decJ2000Deg: 54.3489,
  mag: 7.9,
  majArcmin: 24,
  minArcmin: 23,
  extended: true,
  category: 'galaxy',
  con: 'UMa',
};
const SIRIUS: Candidate = {
  id: 'star:HIP32349',
  kind: 'star',
  raJ2000Deg: 101.28716,
  decJ2000Deg: -16.71612,
  mag: -1.44,
  extended: false,
  con: 'CMa',
};

function base(over: Partial<RecommendInput> = {}): RecommendInput {
  return {
    candidates: [SATURN, MOON, VEGA, M31, M13, M42, M101, SIRIUS],
    observer: SITE,
    window: { from: NIGHT.darkSpan!.from, to: new Date('2026-09-06T16:00:00Z') }, // 천문박명 끝 ~ 01:00 KST
    now: T,
    night: NIGHT,
    site: { bortle: 7 },
    equipment: 'naked',
    ...over,
  };
}

describe('추천 엔진', () => {
  it('지평선 아래(시리우스·M42는 9월 초 저녁에 안 뜸)는 제외, 행성은 상위', () => {
    const r = recommend(base());
    const ids = r.items.map((i) => i.id);
    expect(ids).not.toContain('star:HIP32349');
    expect(ids).not.toContain('dso:M42');
    expect(ids.slice(0, 3)).toContain('planet:saturn');
    expect(r.sampleCount).toBeGreaterThan(20);
  });
  it('도시(Bortle 8)에서 어두운 은하(M101)는 망원경 그룹에서도 순위가 낮고 맨눈 그룹에는 없다', () => {
    const r = recommend(base({ site: { bortle: 8 }, equipment: 'telescope' }));
    const tel = r.groups.telescope.map((i) => i.id);
    expect(r.groups.naked.map((i) => i.id)).not.toContain('dso:M101');
    if (tel.includes('dso:M101'))
      expect(tel.indexOf('dso:M101')).toBeGreaterThan(tel.indexOf('dso:M13'));
  });
  it('달 근접 감점: 같은 대상이라도 달이 밝고 가까우면 점수가 내려간다', () => {
    // 2026-09-25 저녁: 상현달 근처(달이 저녁에 떠 있음)
    const t2 = new Date('2026-09-25T12:00:00Z');
    const n2 = observingNight(SITE, t2);
    const r2 = recommend(
      base({
        now: t2,
        night: n2,
        window: { from: n2.darkSpan!.from, to: new Date('2026-09-25T16:00:00Z') },
        candidates: [VEGA],
      }),
    );
    const r1 = recommend(base({ candidates: [VEGA] }));
    expect(r1.items[0]!.score).toBeGreaterThan(r2.items[0]!.score);
    expect(r2.items[0]!.reasons.some((p) => p.type === 'moonSep')).toBe(true);
  });
  it('관측지 범위(visibleAz) 하드 필터: 동쪽만 보이면 서쪽 대상이 빠진다', () => {
    const all = recommend(base({ candidates: [VEGA, SATURN] }));
    expect(all.items.map((i) => i.id)).toContain('star:HIP91262');
    // 베가는 21시~01시 서쪽 하늘(방위 230~300°), 토성은 동쪽
    const east = recommend(
      base({ candidates: [VEGA, SATURN], site: { visibleAz: [[45, 135]], bortle: 7 } }),
    );
    expect(east.siteFiltered).toBe(true);
    expect(east.items.map((i) => i.id)).toContain('planet:saturn');
    expect(east.items.map((i) => i.id)).not.toContain('star:HIP91262');
    const west = recommend(
      base({
        candidates: [VEGA, SATURN],
        site: { visibleAz: [[200, 320]], minAltDeg: 20, bortle: 7 },
      }),
    );
    expect(west.items.map((i) => i.id)).toContain('star:HIP91262');
  });
  it('구름 ≥ 70%인 시간은 창에서 제외된다', () => {
    const r = recommend(base({ candidates: [VEGA], cloudAt: () => 90 }));
    expect(r.items.length).toBe(0);
    const r2 = recommend(
      base({
        candidates: [VEGA],
        cloudAt: (t) => (t.getTime() < new Date('2026-09-06T13:00:00Z').getTime() ? 90 : 10),
      }),
    );
    expect(r2.items.length).toBe(1);
    expect(r2.items[0]!.metrics.firstVisibleAt!.getTime()).toBeGreaterThanOrEqual(
      new Date('2026-09-06T13:00:00Z').getTime(),
    );
  });
  it('그룹: 지금 당장·곧 진다·올라오는 중, 계획은 시간순 ≤ 12', () => {
    const r = recommend(
      base({
        equipment: 'binoculars',
        events: [
          {
            objectId: 'planet:saturn',
            kind: 'opposition',
            at: new Date('2026-10-04T00:00:00Z'),
            withinDays: 30,
          },
        ],
        seasonSignatures: SEASON_SIGNATURES,
      }),
    );
    expect(r.groups.now.length).toBeGreaterThan(0);
    expect(r.plan.length).toBeLessThanOrEqual(12);
    for (let i = 1; i < r.plan.length; i++)
      expect(r.plan[i]!.metrics.peakAt!.getTime()).toBeGreaterThanOrEqual(
        r.plan[i - 1]!.metrics.peakAt!.getTime(),
      );
    const sat = r.items.find((i) => i.id === 'planet:saturn')!;
    expect(sat.event?.kind).toBe('opposition');
    expect(sat.reasons.some((p) => p.type === 'event')).toBe(true);
    const vega = r.items.find((i) => i.id === 'star:HIP91262')!;
    expect(vega.seasonId).toBe('summerTriangle');
    // M31은 저녁에 동쪽에서 올라오는 중(21시 고도 ~30°) → 올라오거나 지금
    const m31 = r.items.find((i) => i.id === 'dso:M31')!;
    expect(m31.groups.length).toBeGreaterThan(0);
  });
  it('신선도: observedSet에 없는 대상만 보너스', () => {
    const a = recommend(base({ candidates: [VEGA], observedSet: new Set() })).items[0]!.score;
    const b = recommend(base({ candidates: [VEGA], observedSet: new Set(['star:HIP91262']) }))
      .items[0]!.score;
    expect(a - b).toBe(5);
  });
});

describe('azInRanges', () => {
  it('시계 방향 구간·360° 경계', () => {
    expect(azInRanges(100, [[45, 135]])).toBe(true);
    expect(azInRanges(200, [[45, 135]])).toBe(false);
    expect(azInRanges(10, [[300, 60]])).toBe(true);
    expect(azInRanges(180, [[300, 60]])).toBe(false);
    expect(azInRanges(123, undefined)).toBe(true);
    expect(azInRanges(123, [])).toBe(true);
  });
});

describe('큐레이션 표의 id가 데이터 팩에 존재한다', () => {
  const starIds = new Set((stars as { id: string }[]).map((s) => s.id));
  const dsoIds = new Set((dso as { id: string }[]).map((d) => d.id));
  it('이중성', () => {
    for (const d of DOUBLE_STARS) expect(starIds.has(d.objectId), d.objectId).toBe(true);
  });
  it('계절 시그니처', () => {
    for (const s of SEASON_SIGNATURES)
      for (const id of s.objectIds) {
        if (id.startsWith('const:')) continue;
        expect(starIds.has(id) || dsoIds.has(id), id).toBe(true);
      }
  });
});

describe('실제 하늘처럼 한계등급', () => {
  it('Bortle과 달에 따라 내려간다, 최소 2', () => {
    expect(realSkyLimitingMag({ bortle: 4, moonIllumination: 0, moonAltDeg: -10 })).toBe(6.2);
    expect(realSkyLimitingMag({ bortle: 8, moonIllumination: 0, moonAltDeg: -10 })).toBe(4.1);
    expect(realSkyLimitingMag({ bortle: 8, moonIllumination: 1, moonAltDeg: 60 })).toBeLessThan(
      3.5,
    );
    expect(
      realSkyLimitingMag({ bortle: 9, moonIllumination: 1, moonAltDeg: 60 }),
    ).toBeGreaterThanOrEqual(2);
  });
});
