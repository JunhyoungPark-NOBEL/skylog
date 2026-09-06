import { Body, SearchHourAngle } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { bodyState } from '@/astro/bodies';
import { altAzToScene, angularSeparation, raDecToUnitVector, sceneToAltAz } from '@/astro/coords';
import {
  applyMat3,
  constellationAt,
  eqjToAltAz,
  eqjToAltAzSlow,
  eqjToSceneMatrix,
  makeObserver,
} from '@/astro/frames';
import { localSiderealTimeDeg, toAstroTime } from '@/astro/time';
import reference from '../../fixtures/reference-altaz.json';

const DAEJEON = { lat: 36.37, lon: 127.36, elevation: 70 };
const T0 = new Date(reference.utc);

/** 결정론적 난수(LCG) — 테스트 재현성 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('eqjToSceneMatrix (빠른 경로) vs Horizon (느린 경로)', () => {
  it('무작위 별 50개에서 alt/az 차이 ≤ 0.01°', () => {
    const rnd = lcg(20260906);
    const dates = [T0, new Date('2026-01-15T10:00:00Z'), new Date('2026-06-21T14:00:00Z')];
    let maxDiff = 0;
    for (const date of dates) {
      const m = eqjToSceneMatrix(date, DAEJEON);
      for (let i = 0; i < 50; i++) {
        const ra = rnd() * 360;
        const dec = Math.asin(rnd() * 2 - 1) * (180 / Math.PI);
        const fast = eqjToAltAz(date, DAEJEON, ra, dec, m);
        const slow = eqjToAltAzSlow(date, DAEJEON, ra, dec, null);
        const diff = angularSeparation(
          altAzToScene(fast.altDeg, fast.azDeg),
          altAzToScene(slow.altDeg, slow.azDeg),
        );
        maxDiff = Math.max(maxDiff, diff);
      }
    }
    expect(maxDiff).toBeLessThanOrEqual(0.01);
  });

  it('행렬은 정규직교(회전)이다', () => {
    const m = eqjToSceneMatrix(T0, DAEJEON);
    const e = [applyMat3(m, [1, 0, 0]), applyMat3(m, [0, 1, 0]), applyMat3(m, [0, 0, 1])];
    for (const v of e) expect(Math.hypot(...v)).toBeCloseTo(1, 6);
    expect(e[0]![0] * e[1]![0] + e[0]![1] * e[1]![1] + e[0]![2] * e[1]![2]).toBeCloseTo(0, 6);
  });
});

describe('불변량 (마스터 플랜 §8)', () => {
  it('북극성 고도 ≈ 위도 (±1°), 방위 ≈ 북', () => {
    const p = reference.stars.polaris;
    const { altDeg, azDeg } = eqjToAltAz(T0, DAEJEON, p.raJ2000Deg, p.decJ2000Deg);
    expect(Math.abs(altDeg - DAEJEON.lat)).toBeLessThan(1);
    expect(Math.min(azDeg, 360 - azDeg)).toBeLessThan(2);
  });

  it('태양 남중 시각에 방위 180° (±0.5°) — 대전은 ≈ 12:30 KST', () => {
    const ev = SearchHourAngle(
      Body.Sun,
      makeObserver(DAEJEON),
      0,
      toAstroTime(new Date('2026-09-06T00:00:00Z')),
      +1,
    );
    const s = bodyState('sun', ev.time.date, DAEJEON);
    expect(Math.abs(s.azDeg - 180)).toBeLessThan(0.5);
    const kst = new Date(ev.time.date.getTime() + 9 * 3_600_000);
    const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
    expect(minutes).toBeGreaterThan(12 * 60 + 15);
    expect(minutes).toBeLessThan(12 * 60 + 45);
  });

  it('하지 무렵 태양 남중 고도 ≈ 90 − 36.37 + 23.4 ≈ 77° (±0.5°)', () => {
    const ev = SearchHourAngle(
      Body.Sun,
      makeObserver(DAEJEON),
      0,
      toAstroTime(new Date('2026-06-21T00:00:00Z')),
      +1,
    );
    const s = bodyState('sun', ev.time.date, DAEJEON);
    expect(Math.abs(s.altAirlessDeg - 77.07)).toBeLessThan(0.5);
  });

  it('천구 적도(dec 0)는 동점·서점을 지난다', () => {
    const lst = localSiderealTimeDeg(T0, DAEJEON.lon);
    const east = eqjToAltAzSlow(T0, DAEJEON, lst + 90, 0, null);
    const west = eqjToAltAzSlow(T0, DAEJEON, lst - 90, 0, null);
    // J2000→of-date 세차 때문에 ±0.4° 정도 어긋날 수 있다 → 0.5° 허용
    expect(Math.abs(east.altDeg)).toBeLessThan(0.5);
    expect(Math.abs(east.azDeg - 90)).toBeLessThan(0.5);
    expect(Math.abs(west.altDeg)).toBeLessThan(0.5);
    expect(Math.abs(west.azDeg - 270)).toBeLessThan(0.5);
  });

  it('J2000 좌표를 그대로 Horizon에 넣으면 생기는 세차 오차(≈0.35°)를 래퍼가 제거한다', () => {
    const v = reference.stars.vega;
    const a = eqjToAltAz(T0, DAEJEON, v.raJ2000Deg, v.decJ2000Deg);
    const b = eqjToAltAzSlow(T0, DAEJEON, v.raJ2000Deg, v.decJ2000Deg, null);
    const diff = angularSeparation(
      altAzToScene(a.altDeg, a.azDeg),
      altAzToScene(b.altDeg, b.azDeg),
    );
    expect(diff).toBeLessThan(0.01);
  });
});

describe('JPL Horizons 기준 표 (대전 2026-09-06 21:00 KST, airless)', () => {
  for (const [key, ref] of Object.entries(reference.bodies)) {
    it(`${key}: 겉보기 RA/Dec·alt/az ≤ 0.1°, 거리 오차 작음`, () => {
      const s = bodyState(key as 'saturn' | 'jupiter' | 'moon' | 'mars', T0, DAEJEON);
      const radec = angularSeparation(
        raDecToUnitVector(s.raDeg, s.decDeg),
        raDecToUnitVector(ref.raDeg, ref.decDeg),
      );
      const altaz = angularSeparation(
        altAzToScene(s.altAirlessDeg, s.azDeg),
        altAzToScene(ref.altDeg, ref.azDeg),
      );
      expect(radec, `RA/Dec diff ${radec.toFixed(4)}°`).toBeLessThanOrEqual(0.1);
      expect(altaz, `alt/az diff ${altaz.toFixed(4)}°`).toBeLessThanOrEqual(0.1);
      expect(Math.abs(s.distanceAu - ref.deltaAu) / ref.deltaAu).toBeLessThan(0.002);
    });
  }
});

describe('coords 왕복·별자리 판정', () => {
  it('altAzToScene ↔ sceneToAltAz 왕복', () => {
    for (const [alt, az] of [
      [45, 180],
      [0, 90],
      [-10, 270],
      [89, 0],
    ] as const) {
      const r = sceneToAltAz(altAzToScene(alt, az));
      expect(r.altDeg).toBeCloseTo(alt, 6);
      expect(r.azDeg).toBeCloseTo(az, 6);
    }
    // 동쪽 지평선은 +X, 천정은 +Y, 남쪽 지평선은 +Z
    expect(altAzToScene(0, 90)).toEqual([1, expect.closeTo(0, 10), expect.closeTo(0, 10)]);
    expect(altAzToScene(90, 0)[1]).toBeCloseTo(1, 10);
    expect(altAzToScene(0, 180)[2]).toBeCloseTo(1, 10);
  });

  it('베가는 거문고자리, 시리우스는 큰개자리', () => {
    expect(
      constellationAt(reference.stars.vega.raJ2000Deg, reference.stars.vega.decJ2000Deg).symbol,
    ).toBe('Lyr');
    expect(
      constellationAt(reference.stars.sirius.raJ2000Deg, reference.stars.sirius.decJ2000Deg).symbol,
    ).toBe('CMa');
  });
});
