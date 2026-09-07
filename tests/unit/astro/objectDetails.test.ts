import { describe, expect, it } from 'vitest';
import { bodyState } from '@/astro/bodies';
import { eqjToAltAz } from '@/astro/frames';
import { apparentAltitude } from '@/astro/refraction';
import { equipmentVerdict, surfaceBrightnessArcmin2 } from '@/astro/equipment';
import { riseTransitSetBody, riseTransitSetFixed } from '@/astro/events';
import { observingNight } from '@/astro/night';
import { bestMonthFor, computeObjectDetails, longestRun } from '@/astro/objectDetails';
import type { ObjectTarget } from '@/catalog/objectTarget';
import reference from '../../fixtures/reference-altaz.json';

const SITE = { lat: 36.37, lon: 127.36, elevation: 70 };
const T = new Date('2026-09-06T12:00:00Z'); // 21:00 KST
const NIGHT = observingNight(SITE, T);

const VEGA: ObjectTarget = {
  id: 'star:HIP91262',
  kind: 'star',
  raJ2000Deg: reference.stars.vega.raJ2000Deg,
  decJ2000Deg: reference.stars.vega.decJ2000Deg,
  mag: 0.03,
  distLy: 25,
  extended: false,
  con: 'Lyr',
};
const M31: ObjectTarget = {
  id: 'dso:M31',
  kind: 'dso',
  raJ2000Deg: 10.68479,
  decJ2000Deg: 41.26906,
  mag: 3.44,
  distLy: 2_537_000,
  majArcmin: 177.83,
  minArcmin: 69.66,
  extended: true,
  category: 'galaxy',
  con: 'And',
};
const JUPITER: ObjectTarget = {
  id: 'planet:jupiter',
  kind: 'planet',
  bodyKey: 'jupiter',
  raJ2000Deg: 0,
  decJ2000Deg: 0,
  extended: false,
};
const M42: ObjectTarget = {
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

describe('computeObjectDetails — 지금', () => {
  it('베가 21:00 KST: 빠른 경로(행렬)+굴절과 0.05° 안, 상태 보임', () => {
    const d = computeObjectDetails(VEGA, T, SITE, NIGHT);
    const fast = eqjToAltAz(T, SITE, VEGA.raJ2000Deg, VEGA.decJ2000Deg);
    expect(Math.abs(d.now.altDeg - apparentAltitude(fast.altDeg))).toBeLessThan(0.05);
    expect(Math.abs(d.now.azDeg - fast.azDeg)).toBeLessThan(0.05);
    expect(d.now.status).toBe('visible');
    expect(d.now.distance).toEqual({ ly: 25 });
    expect(d.now.moonSepDeg).toBeGreaterThan(0);
    // of-date 적경은 J2000보다 세차만큼(26년 × ~50″) 이동
    expect(Math.abs(d.now.raDeg - d.now.raJ2000Deg)).toBeGreaterThan(0.1);
    expect(Math.abs(d.now.raDeg - d.now.raJ2000Deg)).toBeLessThan(1);
  });
  it('낮(정오)에는 상태가 낮/지평선 아래', () => {
    const noon = new Date('2026-09-06T03:00:00Z');
    const d = computeObjectDetails(VEGA, noon, SITE, NIGHT);
    expect(['daylight', 'belowHorizon']).toContain(d.now.status);
    const s = computeObjectDetails(
      { ...JUPITER, id: 'sun', kind: 'sun', bodyKey: 'sun' },
      noon,
      SITE,
      NIGHT,
    );
    expect(s.now.status).toBe('visible');
  });
});

describe('computeObjectDetails — 오늘(출·남중·몰)', () => {
  it('목성: 엔진 검색값과 일치, 밤 안의 사건만', () => {
    const d = computeObjectDetails(JUPITER, T, SITE, NIGHT);
    const rts = riseTransitSetBody('jupiter', SITE, NIGHT.start, 1);
    expect(d.today.rise?.getTime()).toBe(rts.rise?.getTime());
    expect(d.today.transit?.getTime()).toBe(rts.transit?.getTime());
    for (const ev of [d.today.rise, d.today.transit, d.today.set]) {
      if (ev) {
        expect(ev.getTime()).toBeGreaterThanOrEqual(NIGHT.start.getTime());
        expect(ev.getTime()).toBeLessThanOrEqual(NIGHT.end.getTime());
      }
    }
    // 출몰 시각의 (굴절 없는) 고도 ≈ −0.57°(엔진 기준 34′ 굴절)
    if (d.today.rise)
      expect(Math.abs(bodyState('jupiter', d.today.rise, SITE).altAirlessDeg + 0.57)).toBeLessThan(
        0.15,
      );
    // 남중 고도 = 90 − |φ − δ|
    const st = bodyState('jupiter', d.today.transit!, SITE);
    expect(Math.abs(d.today.transitAltDeg! - (90 - Math.abs(SITE.lat - st.decDeg)))).toBeLessThan(
      0.3,
    );
  });
  it('베가: 해석식과 ±3분, 최적 시간대는 어두운 구간 안·고도 30° 이상', () => {
    const d = computeObjectDetails(VEGA, T, SITE, NIGHT);
    const rts = riseTransitSetFixed(VEGA.raJ2000Deg, VEGA.decJ2000Deg, SITE, NIGHT.start, 25, 1);
    expect(d.today.set?.getTime()).toBe(rts.set?.getTime());
    expect(d.today.bestWindow).not.toBeNull();
    const w = d.today.bestWindow!;
    expect(w.from.getTime()).toBeGreaterThanOrEqual(NIGHT.darkSpan!.from.getTime());
    expect(w.to.getTime()).toBeLessThanOrEqual(NIGHT.darkSpan!.to.getTime());
    expect(d.today.bestWindowMinAlt).toBe(30);
    // 9월 초 저녁 베가는 천정 근처 → 창은 천문박명 끝부터 시작
    expect(w.from.getTime()).toBe(NIGHT.darkSpan!.from.getTime());
  });
  it('가장 좋은 달: 베가 7~8월, M42 12~1월, 달·태양은 null', () => {
    expect([6, 7, 8]).toContain(bestMonthFor(VEGA, SITE, 2026, 'Asia/Seoul'));
    expect([12, 1]).toContain(bestMonthFor(M42, SITE, 2026, 'Asia/Seoul'));
    expect(bestMonthFor({ ...JUPITER, bodyKey: 'moon' }, SITE, 2026, 'Asia/Seoul')).toBeNull();
  });
  it('M42는 9월 초 저녁에 높이 뜨지 않음 → 새벽 창 또는 20° 폴백', () => {
    const d = computeObjectDetails(M42, T, SITE, NIGHT);
    if (d.today.bestWindow)
      expect(d.today.bestWindow.from.getTime()).toBeGreaterThan(T.getTime() + 3 * 3_600_000);
  });
});

describe('longestRun', () => {
  it('가장 긴 연속 구간을 고른다', () => {
    const from = new Date(0);
    const to = new Date(6 * 3_600_000);
    const alt = (d: Date) => {
      const h = d.getTime() / 3_600_000;
      return h < 1 || (h >= 2 && h < 5) ? 40 : 10;
    };
    const r = longestRun({ from, to }, alt, 30, 10);
    expect(r!.from.getTime()).toBe(2 * 3_600_000);
    expect(r!.to.getTime()).toBe(5 * 3_600_000);
  });
});

describe('장비 판정(근사)', () => {
  const dark = { bortle: 4 as const, altDeg: 60 };
  const city = { bortle: 8 as const, altDeg: 60 };
  it('베가는 어디서나 잘 보임, 지평선 아래면 안 보임', () => {
    expect(
      equipmentVerdict('naked', { mag: 0.03, extended: false, kind: 'star' }, city).verdict,
    ).toBe('easy');
    expect(
      equipmentVerdict(
        'naked',
        { mag: 0.03, extended: false, kind: 'star' },
        { ...city, altDeg: -5 },
      ).verdict,
    ).toBe('no');
  });
  it('M31 표면 밝기 ≈ 13.5 mag/arcmin²; 도시 맨눈 안 보임, 어두운 곳 쌍안경 보임', () => {
    expect(Math.abs(surfaceBrightnessArcmin2(3.44, 177.83, 69.66) - 13.5)).toBeLessThan(0.3);
    const m31 = {
      mag: 3.44,
      majArcmin: 177.83,
      minArcmin: 69.66,
      extended: true,
      kind: 'dso' as const,
    };
    expect(equipmentVerdict('naked', m31, city).verdict).toBe('no');
    expect(['easy', 'possible']).toContain(equipmentVerdict('binoculars', m31, dark).verdict);
    expect(['easy', 'possible']).toContain(equipmentVerdict('telescope', m31, dark).verdict);
  });
  it('11등급 별: 맨눈 안 보임, 90mm 망원경 어두운 하늘에서 보임', () => {
    const faint = { mag: 11, extended: false, kind: 'star' as const };
    expect(equipmentVerdict('naked', faint, dark).verdict).toBe('no');
    expect(['possible', 'hard']).toContain(equipmentVerdict('telescope', faint, dark).verdict);
  });
  it('보름달 근처면 한계등급이 내려간다', () => {
    const moon = { illumination: 1, altDeg: 60, separationDeg: 20 };
    const a = equipmentVerdict('naked', { mag: 4, extended: false, kind: 'star' }, dark).limitMag;
    const b = equipmentVerdict(
      'naked',
      { mag: 4, extended: false, kind: 'star' },
      { ...dark, moon },
    ).limitMag;
    expect(a - b).toBeGreaterThan(1.5);
  });
  it('M31 상세: 도시(Bortle 7) 맨눈 판정이 no/hard', () => {
    const d = computeObjectDetails(M31, T, SITE, NIGHT, { bortle: 7 });
    expect(['no', 'hard']).toContain(d.verdicts.naked.verdict);
  });
});
