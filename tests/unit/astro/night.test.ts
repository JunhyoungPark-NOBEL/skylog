import { describe, expect, it } from 'vitest';
import { bodyState } from '@/astro/bodies';
import { observingNight, windowsWhere } from '@/astro/night';
import { zonedDateTime } from '@/ui/format';
import usno from '../../fixtures/reference-rstt-usno.json';

const SITE = { lat: 36.37, lon: 127.36, elevation: 0 };

function kst(ymd: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return zonedDateTime(ymd, h, 'Asia/Seoul', m);
}
function minutesApart(a: Date | null | undefined, b: Date): number {
  return a ? Math.abs(a.getTime() - b.getTime()) / 60_000 : Number.POSITIVE_INFINITY;
}

describe('관측 밤 vs USNO(±2분) — 대전 2026-09-06 밤', () => {
  const night = observingNight(SITE, new Date('2026-09-06T12:00:00Z'));
  const d6 = usno.days['2026-09-06'];
  const d7 = usno.days['2026-09-07'];

  it('정오→정오, nightKey', () => {
    expect(night.key).toBe('2026-09-06');
    expect(night.start.toISOString()).toBe('2026-09-06T03:00:00.000Z');
    expect(night.end.getTime() - night.start.getTime()).toBe(24 * 3_600_000);
  });
  it('일몰·시민박명 끝(9/6 저녁)', () => {
    expect(minutesApart(night.timeline.sunset, kst('2026-09-06', d6.sun.set))).toBeLessThanOrEqual(
      2,
    );
    expect(
      minutesApart(night.timeline.civilDusk, kst('2026-09-06', d6.sun.civilDusk)),
    ).toBeLessThanOrEqual(2);
  });
  it('시민박명 시작·일출(9/7 새벽)', () => {
    expect(
      minutesApart(night.timeline.civilDawn, kst('2026-09-07', d7.sun.civilDawn)),
    ).toBeLessThanOrEqual(2);
    expect(
      minutesApart(night.timeline.sunrise, kst('2026-09-07', d7.sun.rise)),
    ).toBeLessThanOrEqual(2);
  });
  it('월몰(9/6 15:40) · 월출(9/7 01:12) · 조도', () => {
    expect(night.moonsets.length).toBe(1);
    expect(minutesApart(night.moonsets[0], kst('2026-09-06', d6.moon.set))).toBeLessThanOrEqual(2);
    expect(night.moonrises.length).toBe(1);
    expect(minutesApart(night.moonrises[0], kst('2026-09-07', d7.moon.rise))).toBeLessThanOrEqual(
      2,
    );
    expect(night.moon.name).toBe('waningCrescent');
    expect(Math.abs(night.moon.illumination - 0.25)).toBeLessThan(0.08); // 자정 기준(USNO 30%→20% 사이)
    expect(night.moon.ageDays).toBeGreaterThan(22);
    expect(night.moon.ageDays).toBeLessThan(27);
  });
  it('박명 순서·구간이 밤을 빈틈없이 덮는다', () => {
    const tl = night.timeline;
    expect(tl.sunset!.getTime()).toBeLessThan(tl.civilDusk!.getTime());
    expect(tl.civilDusk!.getTime()).toBeLessThan(tl.nauticalDusk!.getTime());
    expect(tl.nauticalDusk!.getTime()).toBeLessThan(tl.astronomicalDusk!.getTime());
    expect(tl.astronomicalDusk!.getTime()).toBeLessThan(tl.astronomicalDawn!.getTime());
    expect(tl.astronomicalDawn!.getTime()).toBeLessThan(tl.sunrise!.getTime());
    expect(night.segments[0]!.from.getTime()).toBe(night.start.getTime());
    expect(night.segments.at(-1)!.to.getTime()).toBe(night.end.getTime());
    for (let i = 1; i < night.segments.length; i++)
      expect(night.segments[i]!.from.getTime()).toBe(night.segments[i - 1]!.to.getTime());
    expect(night.segments.map((s) => s.kind)).toEqual([
      'day',
      'civil',
      'nautical',
      'astronomical',
      'night',
      'astronomical',
      'nautical',
      'civil',
      'day',
    ]);
    expect(night.darkSpanKind).toBe('astronomical');
  });
  it('어두운 창 = 천문박명 끝 ~ 달이 10° 위로 올라오기 전(월출 01:12 + 약 1시간)', () => {
    expect(night.darkWindows.length).toBe(1);
    const w = night.darkWindows[0]!;
    expect(w.from.getTime()).toBe(night.timeline.astronomicalDusk!.getTime());
    // 창 끝에서 달 고도 ≈ 10°
    const altEnd = bodyState('moon', w.to, SITE).altDeg;
    expect(Math.abs(altEnd - 10)).toBeLessThan(0.6);
    expect(w.to.getTime()).toBeGreaterThan(kst('2026-09-07', '01:12').getTime() + 40 * 60_000);
    expect(night.darkTotalMin).toBeGreaterThan(5 * 60);
    // 달이 위인 구간: 정오~월몰, 월출~다음 정오
    expect(night.moonAbove.length).toBe(2);
    expect(night.moonAbove[0]!.from.getTime()).toBe(night.start.getTime());
    expect(night.moonAbove[1]!.to.getTime()).toBe(night.end.getTime());
  });
});

describe('windowsWhere', () => {
  it('구간 경계를 refine으로 좁힌다', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-01T02:00:00Z');
    const edge = from.getTime() + 47 * 60_000;
    const pred = (t: Date) => t.getTime() >= edge;
    const w = windowsWhere({ from, to }, pred, 5, (a, b) => {
      let lo = a.getTime();
      let hi = b.getTime();
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        if (pred(new Date(mid))) hi = mid;
        else lo = mid;
      }
      return new Date(hi);
    });
    expect(w.length).toBe(1);
    expect(Math.abs(w[0]!.from.getTime() - edge)).toBeLessThan(60_000);
    expect(w[0]!.to.getTime()).toBe(to.getTime());
  });
  it('전부 어두우면 span 전체, 전부 밝으면 빈 배열', () => {
    const from = new Date(0);
    const to = new Date(3_600_000);
    expect(windowsWhere({ from, to }, () => true)).toEqual([{ from, to }]);
    expect(windowsWhere({ from, to }, () => false)).toEqual([]);
  });
});
