import { describe, expect, it } from 'vitest';
import { j2000ToOfDate } from '@/astro/frames';
import {
  nightTimeline,
  riseSetAnalytic,
  riseTransitSetBody,
  riseTransitSetFixed,
  sunRiseSetAnalytic,
  twilight,
} from '@/astro/events';
import reference from '../../fixtures/reference-altaz.json';

const DAEJEON = { lat: 36.37, lon: 127.36, elevation: 70 };
const START = new Date('2026-09-06T03:00:00Z'); // 12:00 KST

function minutesApart(a: Date | null, b: Date | null): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.abs(a.getTime() - b.getTime()) / 60_000;
}

describe('출·남중·몰: 해석식 vs astronomy-engine (±2분)', () => {
  for (const [name, star] of Object.entries({
    vega: reference.stars.vega,
    sirius: reference.stars.sirius,
  })) {
    it(`${name}`, () => {
      const engine = riseTransitSetFixed(star.raJ2000Deg, star.decJ2000Deg, DAEJEON, START, 25);
      const ofDate = j2000ToOfDate(START, star.raJ2000Deg, star.decJ2000Deg);
      const analytic = riseSetAnalytic(ofDate.raDeg, ofDate.decDeg, DAEJEON, START);
      expect(engine.status).toBe('normal');
      expect(minutesApart(engine.transit, analytic.transit)).toBeLessThanOrEqual(2);
      // 엔진의 rise/set은 START 이후 첫 사건, 해석식은 첫 남중 기준 ±H0 → 같은 사건끼리 비교(24시간 차이는 항성일 보정)
      const near = (a: Date | null, b: Date | null) => {
        if (!a || !b) return Number.POSITIVE_INFINITY;
        const d = minutesApart(a, b);
        return Math.min(d, Math.abs(d - (24 * 60 - 3.93)), Math.abs(d - 2 * (24 * 60 - 3.93)));
      };
      expect(near(engine.rise, analytic.rise)).toBeLessThanOrEqual(2);
      expect(near(engine.set, analytic.set)).toBeLessThanOrEqual(2);
    });
  }

  it('태양(반복 2회) ±2분', () => {
    const engine = riseTransitSetBody('sun', DAEJEON, START);
    const analytic = sunRiseSetAnalytic(DAEJEON, START);
    // START(12:00 KST) 이후: 엔진은 다음 사건(오늘 일몰·내일 일출), 해석식은 첫 남중(오늘 12:30) 기준 ±H0(오늘 일출·일몰)
    // → 일몰은 같은 사건, 일출은 하루 차이(태양일 24h ± 태양 적위 변화)
    expect(minutesApart(engine.set, analytic.set)).toBeLessThanOrEqual(2);
    const riseDiff = minutesApart(engine.rise, analytic.rise);
    expect(Math.min(riseDiff, Math.abs(riseDiff - 24 * 60))).toBeLessThanOrEqual(2);
  });

  it('북극성은 주극성(출몰 없음)', () => {
    const p = reference.stars.polaris;
    const r = riseTransitSetFixed(p.raJ2000Deg, p.decJ2000Deg, DAEJEON, START, 430);
    expect(r.status).toBe('circumpolar');
    expect(r.rise).toBeNull();
    const a = riseSetAnalytic(p.raJ2000Deg, p.decJ2000Deg, DAEJEON, START);
    expect(a.status).toBe('circumpolar');
  });
});

describe('박명·밤 타임라인', () => {
  it('일몰 < 시민 < 항해 < 천문 박명 < 천문 새벽 < … < 일출, 9월 대전 저녁 박명은 ≈ 19시대 KST', () => {
    const tl = nightTimeline(DAEJEON, START);
    const seq = [
      tl.sunset,
      tl.civilDusk,
      tl.nauticalDusk,
      tl.astronomicalDusk,
      tl.astronomicalDawn,
      tl.nauticalDawn,
      tl.civilDawn,
      tl.sunrise,
    ];
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]!.getTime()).toBeGreaterThan(seq[i - 1]!.getTime());
    }
    const kstHour = (d: Date) => ((d.getTime() + 9 * 3_600_000) / 3_600_000) % 24;
    expect(kstHour(tl.sunset!)).toBeGreaterThan(18.5);
    expect(kstHour(tl.sunset!)).toBeLessThan(19.5);
    expect(kstHour(tl.astronomicalDusk!)).toBeGreaterThan(19.8);
    expect(kstHour(tl.astronomicalDusk!)).toBeLessThan(21);
    expect(kstHour(tl.sunrise!)).toBeGreaterThan(5.5);
    expect(kstHour(tl.sunrise!)).toBeLessThan(6.8);
  });

  it('twilight(): 저녁 시민 박명은 일몰 후 20~40분', () => {
    const sunset = riseTransitSetBody('sun', DAEJEON, START).set!;
    const civil = twilight(DAEJEON, sunset, 'civil', -1)!;
    const diff = (civil.getTime() - sunset.getTime()) / 60_000;
    expect(diff).toBeGreaterThan(20);
    expect(diff).toBeLessThan(40);
  });
});
