import { describe, expect, it } from 'vitest';
import { bodyState, brightLimbAngleDeg, moonPhaseName, moonSummary } from '@/astro/bodies';
import { angularSeparationRaDec, equatorialToHorizontal, wrap180, wrap360 } from '@/astro/coords';
import {
  binocularsView,
  eyepieceView,
  fovFromFieldWidth,
  usefulMagnificationRange,
} from '@/astro/optics';
import {
  apparentAltitude,
  bennettRefractionDeg,
  saemundssonRefractionDeg,
  trueAltitude,
} from '@/astro/refraction';
import { greenwichSiderealTimeDeg, julianDate, localSiderealTimeDeg, nightKey } from '@/astro/time';
import {
  BORTLE_NELM,
  dawesLimitArcsec,
  extinctionPenaltyMag,
  moonPenaltyMag,
  nakedEyeLimitMag,
  telescopeLimitMag,
} from '@/astro/visibility';

describe('refraction', () => {
  it('Bennett: 지평선 ≈ 34.5′, 45° ≈ 1′, 90° ≈ 0', () => {
    expect(bennettRefractionDeg(0) * 60).toBeCloseTo(34.5, 0);
    expect(bennettRefractionDeg(45) * 60).toBeCloseTo(0.98, 1);
    expect(bennettRefractionDeg(90) * 60).toBeLessThan(0.05);
  });
  it('Sæmundsson: 지평선 ≈ 29′, 10° ≈ 5.3′', () => {
    expect(saemundssonRefractionDeg(0) * 60).toBeCloseTo(29.0, 0);
    expect(saemundssonRefractionDeg(10) * 60).toBeCloseTo(5.3, 0);
  });
  it('참↔겉보기 고도 왕복 오차 < 0.02°', () => {
    for (const h of [0, 2, 5, 10, 30, 60]) {
      expect(Math.abs(trueAltitude(apparentAltitude(h)) - h)).toBeLessThan(0.02);
    }
  });
  it('지평선 아래는 −1° 값으로 고정', () => {
    expect(saemundssonRefractionDeg(-5)).toBe(saemundssonRefractionDeg(-1));
  });
});

describe('visibility', () => {
  it('Bortle 표와 달·소광 보정', () => {
    expect(BORTLE_NELM[1]).toBe(7.6);
    expect(BORTLE_NELM[9]).toBe(3.6);
    expect(nakedEyeLimitMag(5)).toBeCloseTo(5.6, 5);
    expect(moonPenaltyMag({ illumination: 1, altDeg: 60, separationDeg: 0 })).toBeCloseTo(3, 5);
    expect(moonPenaltyMag({ illumination: 1, altDeg: -5 })).toBe(0);
    expect(extinctionPenaltyMag(90)).toBeCloseTo(0, 5);
    expect(extinctionPenaltyMag(10)).toBeGreaterThan(0.9);
    expect(extinctionPenaltyMag(10)).toBeLessThan(1.3);
    expect(nakedEyeLimitMag(4, 10, { illumination: 0.5, altDeg: 40 })).toBeLessThan(
      BORTLE_NELM[4] - 1,
    );
  });
  it('망원경 한계등급·분해능 (SV48P 90mm)', () => {
    expect(telescopeLimitMag(90)).toBeCloseTo(11.77, 2);
    expect(dawesLimitArcsec(90)).toBeCloseTo(1.29, 2);
  });
});

describe('optics', () => {
  it('SV48P(90/500) + 25mm 52° 접안렌즈: 20배, 2.6°, 사출동공 4.5mm', () => {
    const v = eyepieceView(
      { apertureMm: 90, focalLengthMm: 500 },
      { focalLengthMm: 25, afovDeg: 52 },
    );
    expect(v.magnification).toBe(20);
    expect(v.trueFovDeg).toBeCloseTo(2.6, 5);
    expect(v.exitPupilMm).toBeCloseTo(4.5, 5);
  });
  it('쌍안경 10×50 6.5°', () => {
    const b = binocularsView({ magnification: 10, apertureMm: 50, fovDeg: 6.5 });
    expect(b.exitPupilMm).toBe(5);
    expect(b.twilightFactor).toBeCloseTo(22.36, 1);
    expect(fovFromFieldWidth(114)).toBeCloseTo(6.52, 1);
    expect(usefulMagnificationRange(90)).toEqual({ min: 90 / 7, max: 180 });
  });
});

describe('coords 보조·시간', () => {
  it('wrap·구면삼각법', () => {
    expect(wrap360(-30)).toBe(330);
    expect(wrap180(270)).toBe(-90);
    // 대전에서 H=0, δ=0 → 남쪽, 고도 90−36.37
    const h = equatorialToHorizontal(0, 0, 36.37);
    expect(h.azDeg).toBeCloseTo(180, 6);
    expect(h.altDeg).toBeCloseTo(53.63, 5);
    // 동점: H = −90°, δ=0 → 방위 90, 고도 0
    const e = equatorialToHorizontal(-90, 0, 36.37);
    expect(e.azDeg).toBeCloseTo(90, 6);
    expect(e.altDeg).toBeCloseTo(0, 6);
    expect(angularSeparationRaDec(0, 0, 90, 0)).toBeCloseTo(90, 8);
  });
  it('JD(J2000) = 2451545.0, LST − GST = 경도, 밤 키', () => {
    expect(julianDate(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(2451545.0, 3);
    const d = new Date('2026-09-06T12:00:00Z');
    expect(wrap360(localSiderealTimeDeg(d, 127.36) - greenwichSiderealTimeDeg(d))).toBeCloseTo(
      127.36,
      6,
    );
    expect(nightKey(new Date('2026-09-06T14:00:00Z'))).toBe('2026-09-06'); // 23:00 KST
    expect(nightKey(new Date('2026-09-06T18:00:00Z'))).toBe('2026-09-06'); // 03:00 KST 다음날 → 전날 밤
    expect(nightKey(new Date('2026-09-07T04:00:00Z'))).toBe('2026-09-07'); // 13:00 KST
  });
});

describe('bodies', () => {
  it('달 위상 이름·조도, 밝은 가장자리', () => {
    expect(moonPhaseName(0)).toBe('new');
    expect(moonPhaseName(90)).toBe('firstQuarter');
    expect(moonPhaseName(180)).toBe('full');
    expect(moonPhaseName(300)).toBe('waningCrescent');
    const m = moonSummary(new Date('2026-09-06T12:00:00Z'));
    expect(m.illumination).toBeGreaterThanOrEqual(0);
    expect(m.illumination).toBeLessThanOrEqual(1);
    // 태양이 정동쪽(같은 적위)에 있으면 밝은 가장자리는 동쪽(90°)
    expect(brightLimbAngleDeg({ raDeg: 100, decDeg: 0 }, { raDeg: 90, decDeg: 0 })).toBeCloseTo(
      90,
      6,
    );
    const s = bodyState('saturn', new Date('2026-09-06T12:00:00Z'), { lat: 36.37, lon: 127.36 });
    expect(s.angularDiameterArcsec).toBeGreaterThan(17);
    expect(s.angularDiameterArcsec).toBeLessThan(21);
    expect(s.magnitude).toBeLessThan(1.5);
    expect(s.altDeg).toBeGreaterThan(s.altAirlessDeg); // 굴절은 고도를 올린다
  });
});
