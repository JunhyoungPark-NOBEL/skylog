import { describe, expect, it } from 'vitest';
import { bodyState } from '@/astro/bodies';
import { observingNight } from '@/astro/night';
import { computeObjectDetails } from '@/astro/objectDetails';
import type { ObjectTarget } from '@/catalog/objectTarget';
import { buildConditions, fromLocalInput, toLocalInput } from '@/features/log/autoFill';
import type { WeatherHour } from '@/services/weather';

const SITE = { lat: 36.37, lon: 127.36, elevation: 70 };
const T = new Date('2026-09-06T12:00:00Z'); // 21:00 KST
const NIGHT = observingNight(SITE, T);

const VEGA: ObjectTarget = {
  id: 'star:HIP91262',
  kind: 'star',
  raJ2000Deg: 279.23473,
  decJ2000Deg: 38.78369,
  mag: 0.03,
  distLy: 25,
  extended: false,
  con: 'Lyr',
};
const SATURN: ObjectTarget = {
  id: 'planet:saturn',
  kind: 'planet',
  bodyKey: 'saturn',
  raJ2000Deg: 0,
  decJ2000Deg: 0,
  extended: false,
};
const MOON: ObjectTarget = {
  id: 'moon',
  kind: 'moon',
  bodyKey: 'moon',
  raJ2000Deg: 0,
  decJ2000Deg: 0,
  extended: false,
};

const HOUR: WeatherHour = {
  at: T,
  cloud: 12.4,
  cloudLow: 5,
  cloudMid: 5,
  cloudHigh: 2,
  humidity: 63.7,
  dewPointC: 11,
  tempC: 18.26,
  windKmh: 5,
  precipProb: 0,
};

describe('buildConditions — 자동 조건', () => {
  it('별: 고도·방위·달과 떨어진 각도가 상세 시트(computeObjectDetails)와 같다', () => {
    const c = buildConditions({ target: VEGA, at: T, observer: SITE, night: NIGHT, bortle: 5 });
    const d = computeObjectDetails(VEGA, T, SITE, NIGHT, { bortle: 5 });
    expect(c.altDeg).toBeCloseTo(d.now.altDeg, 0);
    expect(c.azDeg).toBeCloseTo(d.now.azDeg, 0);
    expect(c.moonSepDeg).toBeCloseTo(d.now.moonSepDeg, 0);
    expect(c.moonIllum).toBeCloseTo(d.now.moonIllum, 2);
    expect(c.bortle).toBe(5);
    // 베가는 9월 저녁 대전에서 높이 떠 있다
    expect(c.altDeg!).toBeGreaterThan(50);
  });

  it('달 위상각·밝은 부분은 bodyState("moon")와 같다', () => {
    const moon = bodyState('moon', T, SITE);
    const c = buildConditions({ target: SATURN, at: T, observer: SITE, night: NIGHT });
    expect(c.moonPhaseDeg).toBeCloseTo(moon.moonPhaseDeg!, 0);
    expect(c.moonIllum).toBeCloseTo(moon.phaseFraction, 2);
    expect(c.moonPhaseDeg!).toBeGreaterThanOrEqual(0);
    expect(c.moonPhaseDeg!).toBeLessThan(360);
    // 행성의 고도는 bodyState와 같다
    const sat = bodyState('saturn', T, SITE);
    expect(c.altDeg).toBeCloseTo(sat.altDeg, 0);
    expect(c.azDeg).toBeCloseTo(sat.azDeg, 0);
  });

  it('달 자신을 기록할 때는 "달과 떨어진 각도"를 비운다', () => {
    const c = buildConditions({ target: MOON, at: T, observer: SITE, night: NIGHT });
    expect(c.moonSepDeg).toBeUndefined();
    expect(c.moonPhaseDeg).toBeDefined();
    expect(c.altDeg).toBeCloseTo(bodyState('moon', T, SITE).altDeg, 0);
  });

  it('날씨가 없으면 구름·기온·습도는 undefined, 있으면 반올림해서 넣는다', () => {
    const none = buildConditions({ target: VEGA, at: T, observer: SITE, night: NIGHT });
    expect(none.cloudCover).toBeUndefined();
    expect(none.tempC).toBeUndefined();
    expect(none.humidity).toBeUndefined();
    expect(none.bortle).toBeUndefined();
    const some = buildConditions({
      target: VEGA,
      at: T,
      observer: SITE,
      night: NIGHT,
      weatherHour: HOUR,
    });
    expect(some.cloudCover).toBe(12);
    expect(some.tempC).toBe(18.3);
    expect(some.humidity).toBe(64);
  });

  it('시상·투명도는 채우지 않는다(사용자 입력)', () => {
    const c = buildConditions({ target: VEGA, at: T, observer: SITE, night: NIGHT });
    expect(c.seeing).toBeUndefined();
    expect(c.transparency).toBeUndefined();
  });
});

describe('datetime-local 변환(Asia/Seoul)', () => {
  it('Date → 현지 문자열 → Date 왕복', () => {
    expect(toLocalInput(T)).toBe('2026-09-06T21:00');
    expect(fromLocalInput('2026-09-06T21:00')?.toISOString()).toBe('2026-09-06T12:00:00.000Z');
    // 자정 넘김
    expect(toLocalInput(new Date('2026-09-06T16:30:00Z'))).toBe('2026-09-07T01:30');
    expect(fromLocalInput('2026-09-07T01:30')?.toISOString()).toBe('2026-09-06T16:30:00.000Z');
  });

  it('형식이 어긋나면 null', () => {
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('2026-09-06')).toBeNull();
    expect(fromLocalInput('nonsense')).toBeNull();
  });

  it('다른 시간대도 지원한다', () => {
    expect(toLocalInput(T, 'UTC')).toBe('2026-09-06T12:00');
    expect(fromLocalInput('2026-09-06T12:00', 'UTC')?.toISOString()).toBe(
      '2026-09-06T12:00:00.000Z',
    );
  });
});
