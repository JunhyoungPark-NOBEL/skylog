import { describe, expect, it } from 'vitest';
import { observingNight } from '@/astro/night';
import { recommend, seasonMonthOf, type Candidate, type RecommendInput } from '@/astro/recommend';
import { SEASON_SIGNATURES } from '@/catalog/recommendCandidates';

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
const URANUS: Candidate = {
  id: 'planet:uranus',
  kind: 'planet',
  bodyKey: 'uranus',
  raJ2000Deg: 0,
  decJ2000Deg: 0,
  extended: false,
};
const NEPTUNE: Candidate = {
  id: 'planet:neptune',
  kind: 'planet',
  bodyKey: 'neptune',
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
const M13: Candidate = {
  id: 'dso:M13',
  kind: 'dso',
  raJ2000Deg: 250.4235,
  decJ2000Deg: 36.4613,
  mag: 5.8,
  majArcmin: 16.5,
  minArcmin: 16.5,
  extended: true,
  category: 'globularCluster',
  con: 'Her',
};
const M45: Candidate = {
  id: 'dso:M45',
  kind: 'dso',
  raJ2000Deg: 56.86917,
  decJ2000Deg: 24.10528,
  mag: 1.2,
  majArcmin: 150,
  minArcmin: 150,
  extended: true,
  category: 'openCluster',
  con: 'Tau',
};
const CAPELLA: Candidate = {
  id: 'star:HIP24608',
  kind: 'star',
  raJ2000Deg: 79.17232,
  decJ2000Deg: 45.99799,
  mag: 0.08,
  extended: false,
  con: 'Aur',
};
const ALBIREO: Candidate = {
  id: 'star:HIP95947',
  kind: 'star',
  raJ2000Deg: 292.68033,
  decJ2000Deg: 27.95968,
  mag: 3.05,
  extended: false,
  con: 'Cyg',
  tags: ['double'],
  doubleSplit: 'telescope',
  doubleSepArcsec: 34.6,
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
    candidates: [SATURN, URANUS, NEPTUNE, VEGA, M13, M45, CAPELLA, ALBIREO],
    observer: SITE,
    window: { from: NIGHT.darkSpan!.from, to: new Date('2026-09-06T16:00:00Z') }, // 20:20 ~ 01:00 KST
    now: T,
    night: NIGHT,
    site: { bortle: 7 },
    equipment: 'naked',
    ...over,
  };
}

describe('추천 규칙(D-020 판정 반영)', () => {
  it('천왕성·해왕성은 맨눈 장비에서 후보에서 빠지고, 쌍안경·망원경 그룹에는 들어간다', () => {
    const naked = recommend(base());
    expect(naked.items.map((i) => i.id)).not.toContain('planet:neptune');
    expect(naked.items.map((i) => i.id)).not.toContain('planet:uranus');
    const bino = recommend(base({ equipment: 'binoculars' }));
    const ur = bino.items.find((i) => i.id === 'planet:uranus');
    expect(ur).toBeDefined();
    expect(ur!.groups).toContain('binoculars');
    expect(ur!.groups).toContain('telescope');
    expect(ur!.groups).not.toContain('naked');
    // 토성은 맨눈·망원경, 쌍안경 그룹에는 없다(점으로만 보임)
    const sat = bino.items.find((i) => i.id === 'planet:saturn')!;
    expect(sat.groups).toContain('naked');
    expect(sat.groups).toContain('telescope');
    expect(sat.groups).not.toContain('binoculars');
  });
  it('올라오는 중: 21시에 M45(−9°)·카펠라는 지평선 때문에 안 보이고 나중에 뜬다 → rising, 뜨는 시각순', () => {
    // 창을 04:00까지 늘려 둘 다 충분히 높이 올라오게(rising은 볼 가치가 있는 것만: 점수 ≥ 50)
    const r = recommend(
      base({
        equipment: 'binoculars',
        window: { from: NIGHT.darkSpan!.from, to: new Date('2026-09-06T19:00:00Z') },
      }),
    );
    const cap = r.items.find((i) => i.id === 'star:HIP24608')!;
    const m45 = r.items.find((i) => i.id === 'dso:M45')!;
    expect(cap.groups).toContain('rising');
    expect(m45.groups).toContain('rising');
    expect(cap.metrics.firstCause).toBe('horizon');
    expect(m45.metrics.firstVisibleAt!.getTime()).toBeGreaterThan(
      cap.metrics.firstVisibleAt!.getTime(),
    );
    const idx = r.groups.rising.map((i) => i.id);
    expect(idx.indexOf('star:HIP24608')).toBeLessThan(idx.indexOf('dso:M45'));
    expect(cap.reasons.some((p) => p.type === 'risesAt')).toBe(true);
  });
  it('곧 진다: 00:00 KST에 M13은 20° 아래로 내려가 settingSoon, 베가는 아니다; 구름 때문에 사라지는 건 "진다"가 아니다', () => {
    const now = new Date('2026-09-06T15:00:00Z');
    const r = recommend(base({ now, equipment: 'binoculars' }));
    const m13 = r.items.find((i) => i.id === 'dso:M13')!;
    expect(m13.groups).toContain('settingSoon');
    expect(m13.metrics.lastCause).toBe('horizon');
    const vega = r.items.find((i) => i.id === 'star:HIP91262')!;
    expect(vega.groups).not.toContain('settingSoon');
    const cloudy = recommend(
      base({
        now: new Date('2026-09-06T14:00:00Z'), // 23:00
        equipment: 'binoculars',
        cloudAt: (t) => (t.getTime() >= new Date('2026-09-06T14:30:00Z').getTime() ? 90 : 10),
      }),
    );
    const vega2 = cloudy.items.find((i) => i.id === 'star:HIP91262')!;
    expect(vega2.metrics.lastCause).toBe('cloud');
    expect(vega2.groups).not.toContain('settingSoon');
  });
  it('최적 시각은 달을 피한다: 달이 밝은 밤(9/25)에 M13 최적 시각의 달 항이 최고 고도 시각보다 작다', () => {
    const t2 = new Date('2026-09-25T10:30:00Z'); // 19:30 KST
    const n2 = observingNight(SITE, t2);
    const r = recommend(
      base({
        now: t2,
        night: n2,
        window: { from: n2.timeline.sunset!, to: new Date('2026-09-25T17:00:00Z') },
        candidates: [M13],
        equipment: 'binoculars',
      }),
    );
    const m13 = r.items[0]!;
    expect(m13.metrics.peakAt).not.toBeNull();
    expect(m13.metrics.peakAltDeg).toBeLessThanOrEqual(m13.metrics.maxAltDeg);
    expect(m13.reasons.some((p) => p.type === 'moonSep' || p.type === 'moonClose')).toBe(true);
  });
  it('이중성 보너스는 고른 장비로 분해 가능할 때만(+6)', () => {
    const naked = recommend(base({ candidates: [ALBIREO] })).items[0]!;
    const tele = recommend(base({ candidates: [ALBIREO], equipment: 'telescope' })).items[0]!;
    expect(tele.reasons.some((p) => p.type === 'double')).toBe(true);
    expect(naked.reasons.some((p) => p.type === 'double')).toBe(false);
    expect(tele.groups).toContain('telescope');
  });
  it('큰 산개성단 보정: Bortle 7 맨눈에서 M45는 잘 보임(심야 창)', () => {
    const now = new Date('2026-10-04T15:00:00Z'); // 00:00 KST 10/5
    const n = observingNight(SITE, now);
    const r = recommend(
      base({
        now,
        night: n,
        window: { from: new Date('2026-10-04T13:00:00Z'), to: new Date('2026-10-04T18:00:00Z') },
        candidates: [M45],
      }),
    );
    expect(r.items[0]!.metrics.verdicts.naked).toBe('easy');
    expect(r.items[0]!.groups).toContain('naked');
  });
  it('계절 체감 달: 9월 새벽 창은 겨울 하늘(시리우스 winterHexagon), 저녁 창은 여름(베가 summerTriangle)', () => {
    expect(seasonMonthOf(new Date('2026-09-06T12:00:00Z'), 'Asia/Seoul')).toBe(9); // 21:00
    expect(seasonMonthOf(new Date('2026-09-06T16:00:00Z'), 'Asia/Seoul')).toBe(11); // 01:00
    expect(seasonMonthOf(new Date('2026-09-06T19:00:00Z'), 'Asia/Seoul')).toBe(1); // 04:00 → +4
    const dawn = recommend(
      base({
        now: new Date('2026-09-06T18:00:00Z'),
        window: { from: new Date('2026-09-06T18:00:00Z'), to: NIGHT.darkSpan!.to },
        candidates: [SIRIUS, VEGA],
        seasonSignatures: SEASON_SIGNATURES,
      }),
    );
    expect(dawn.items.find((i) => i.id === 'star:HIP32349')?.seasonId).toBe('winterHexagon');
    const evening = recommend(base({ candidates: [VEGA], seasonSignatures: SEASON_SIGNATURES }));
    expect(evening.items[0]!.seasonId).toBe('summerTriangle');
  });
  it('결정성: 같은 입력이면 같은 결과', () => {
    const a = JSON.stringify(recommend(base()));
    const b = JSON.stringify(recommend(base()));
    expect(a).toBe(b);
  });
});
