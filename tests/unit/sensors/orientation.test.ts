import type { Quaternion } from 'three';
import { describe, expect, it } from 'vitest';
import { angularSeparation } from '@/astro/coords';
import { parseLatLon } from '@/sensors/coordsParse';
import { declinationDeg } from '@/sensors/declination';
import {
  applyOffset,
  compassSyncCandidate,
  pickAlignmentCandidates,
  solveYawOffset,
  YawSync,
} from '@/sensors/orientation/calibration';
import { OrientationFilter, RateMeter } from '@/sensors/orientation/filter';
import {
  applyYawOffset,
  cameraDirection,
  deviceAxisInScene,
  deviceOrientationToScene,
  genericSensorToScene,
  quaternionToAltAz,
} from '@/sensors/orientation/math';

const DAEJEON = { lat: 36.37, lon: 127.36 };

function altAz(alpha: number, beta: number, gamma: number, screen = 0) {
  return quaternionToAltAz(deviceOrientationToScene(alpha, beta, gamma, screen));
}

describe('deviceOrientationToScene — 테스트 벡터 (task-02 §3.3, G1 §A9-3)', () => {
  const cases: [number, number, number, [number, number, number], number | null, number][] = [
    [0, 90, 0, [0, 0, -1], 0, 0], // 북 지평선
    [270, 90, 0, [1, 0, 0], 90, 0], // 동
    [180, 90, 0, [0, 0, 1], 180, 0], // 남
    [90, 90, 0, [-1, 0, 0], 270, 0], // 서
    [0, 120, 0, [0, 0.5, -0.8660254], 0, 30], // 북쪽 위 30°
    [0, 0, 0, [0, -1, 0], null, -90], // 천저(폰 평평, 화면 위)
    [0, -180, 0, [0, 1, 0], null, 90], // 천정(뒷면 하늘)
    [0, 60, 30, [-0.5, -0.4330127, -0.75], 326.309932, -25.658906],
  ];
  for (const [a, b, g, dir, az, alt] of cases) {
    it(`α=${a} β=${b} γ=${g} → az ${az ?? '—'} alt ${alt}`, () => {
      for (const screen of [0, 90, 180, 270]) {
        // 화면 회전은 물리 축이 아니라 UI 회전이므로, 같은 물리 자세를 나타내는 오일러는
        // 화면 좌표계 입력이 함께 회전한다. 여기서는 θ=0 벡터를 기준으로 θ≠0에서 시선이 유지되는지 확인:
        // q(θ)는 qZ(−θ)를 마지막에 곱하므로 −Z 시선은 변하지 않아야 한다.
        const q = deviceOrientationToScene(a, b, g, screen);
        const d = cameraDirection(q);
        expect(angularSeparation(d, dir)).toBeLessThan(1e-4);
        const r = quaternionToAltAz(q);
        expect(r.altDeg).toBeCloseTo(alt, 4);
        if (az === null) expect(r.azDeg).toBeNull();
        else expect(r.azDeg!).toBeCloseTo(az, 4);
      }
    });
  }

  it('α는 위에서 볼 때 반시계: α 증가 → 방위 감소 (heading = 360 − α)', () => {
    expect(altAz(30, 90, 0).azDeg).toBeCloseTo(330, 6);
    expect(altAz(359, 90, 0).azDeg).toBeCloseTo(1, 6);
  });

  it('화면 회전 90°에서 상단 축은 물리적으로 같은 방향을 가리킨다', () => {
    // 세로 화면: 폰 상단이 북쪽 수평(β=90: 상단 축 = 천정 방향… 대신 β=0 평평 자세에서 검사)
    const q0 = deviceOrientationToScene(0, 0, 0, 0);
    const top0 = deviceAxisInScene(q0, [0, 1, 0], 0);
    expect(top0.azDeg).toBeCloseTo(0, 5); // 평평한 폰의 상단 = 북
    expect(top0.rho).toBeCloseTo(1, 6);
    // 세워서(β=90) 상단은 천정 → 투영 없음
    const q90 = deviceOrientationToScene(0, 90, 0, 0);
    expect(deviceAxisInScene(q90, [0, 1, 0]).rho).toBeLessThan(1e-6);
    // 더 젖히면(β=120) 상단 방위는 180° 반대
    const q120 = deviceOrientationToScene(0, 120, 0, 0);
    expect(deviceAxisInScene(q120, [0, 1, 0]).azDeg).toBeCloseTo(180, 4);
  });

  it('Generic Sensor 쿼터니언(항등 = 기기가 평평, 상단 북) → 천저', () => {
    const q = genericSensorToScene([0, 0, 0, 1], 0, 'device');
    const r = quaternionToAltAz(q);
    expect(r.altDeg).toBeCloseTo(-90, 5);
  });
});

describe('yaw 오프셋·편각', () => {
  it('applyYawOffset(+Δ)는 방위를 Δ만큼 늘린다', () => {
    const q = deviceOrientationToScene(0, 90, 0); // 북
    const r = quaternionToAltAz(applyYawOffset(q, 30));
    expect(r.azDeg).toBeCloseTo(30, 6);
    expect(r.altDeg).toBeCloseTo(0, 6);
    const r2 = quaternionToAltAz(applyYawOffset(deviceOrientationToScene(0, 120, 0), -45));
    expect(r2.azDeg).toBeCloseTo(315, 6);
    expect(r2.altDeg).toBeCloseTo(30, 6);
  });

  it('대전 편각은 −8~−9°(서편각), 진북 방위 = 자북 방위 + D', () => {
    const d = declinationDeg(DAEJEON.lat, DAEJEON.lon, 70, new Date('2026-09-07T00:00:00Z'));
    expect(d).toBeGreaterThan(-9.5);
    expect(d).toBeLessThan(-7.5);
    // 자북을 향한 폰(자북 프레임 α=0, β=90) → 편각 적용 후 진북 기준 방위 ≈ 351.x
    const qMag = deviceOrientationToScene(0, 90, 0);
    const az = quaternionToAltAz(applyYawOffset(qMag, d)).azDeg!;
    expect(az).toBeCloseTo(360 + d, 5);
    // 동편각(예: 미국 서부 +15°)이면 방위가 증가
    expect(declinationDeg(47.6, -122.3, 0, new Date('2026-01-01'))).toBeGreaterThan(10);
    // 유효 기간 밖 날짜는 경계로 고정되어 예외가 없다
    expect(Number.isFinite(declinationDeg(36, 127, 0, new Date('2040-01-01')))).toBe(true);
  });
});

describe('보정', () => {
  it('solveYawOffset: 1-별 정렬은 방위 차이, 여러 별은 원형 평균·잔차', () => {
    const one = solveYawOffset([
      { sensorAzDeg: 100, sensorAltDeg: 40, targetAzDeg: 110, targetAltDeg: 41 },
    ]);
    expect(one?.deltaAzDeg).toBeCloseTo(10, 6);
    expect(one?.pitchOffsetDeg).toBeCloseTo(1, 6);
    expect(one?.residualDeg).toBeCloseTo(0, 6);
    const wrap = solveYawOffset([
      { sensorAzDeg: 350, sensorAltDeg: 0, targetAzDeg: 10, targetAltDeg: 0 },
    ]);
    expect(wrap?.deltaAzDeg).toBeCloseTo(20, 6);
    const two = solveYawOffset([
      { sensorAzDeg: 0, sensorAltDeg: 30, targetAzDeg: 8, targetAltDeg: 30 },
      { sensorAzDeg: 90, sensorAltDeg: 50, targetAzDeg: 102, targetAltDeg: 50 },
    ]);
    expect(two?.deltaAzDeg).toBeCloseTo(10, 4);
    expect(two?.residualDeg).toBeCloseTo(2, 4);
    expect(solveYawOffset([])).toBeNull();
  });

  it('applyOffset: yaw + 피치가 카메라 시선에 반영된다', () => {
    const q = deviceOrientationToScene(0, 100, 0); // 북, 고도 10°
    const r = quaternionToAltAz(applyOffset(q, 45, 5));
    expect(r.azDeg).toBeCloseTo(45, 4);
    expect(r.altDeg).toBeCloseTo(15, 4);
  });

  it('compassSyncCandidate: 상단 축끼리 비교, 자세 조건 밖이면 null', () => {
    // 상대 프레임에서 폰이 평평(β=0)하고 상단이 상대 "북"(az 0). 실제 나침반은 상단이 자북 90°(동)라고 함
    const qRel = deviceOrientationToScene(0, 30, 0);
    const base = {
      qRel,
      compassHeadingDeg: 90,
      compassAccuracyDeg: 5,
      betaDeg: 30,
      gammaDeg: 0,
      screenAngleDeg: 0,
      declinationDeg: 0,
      quasiStatic: true,
    };
    expect(compassSyncCandidate(base)).toBeCloseTo(90, 4);
    // 편각 −8.5 → 진북 heading 81.5
    expect(compassSyncCandidate({ ...base, declinationDeg: -8.5 })).toBeCloseTo(81.5, 4);
    // 조건 밖: 세운 자세, 나쁜 정확도, 움직임, 무효 heading
    expect(
      compassSyncCandidate({ ...base, qRel: deviceOrientationToScene(0, 90, 0), betaDeg: 90 }),
    ).toBeNull();
    expect(compassSyncCandidate({ ...base, compassAccuracyDeg: 40 })).toBeNull();
    expect(compassSyncCandidate({ ...base, compassAccuracyDeg: -1 })).toBeNull();
    expect(compassSyncCandidate({ ...base, quasiStatic: false })).toBeNull();
    expect(compassSyncCandidate({ ...base, compassHeadingDeg: null })).toBeNull();
    // 적용하면 상단 축 방위가 나침반과 일치
    const delta = compassSyncCandidate(base)!;
    const top = deviceAxisInScene(applyYawOffset(qRel, delta), [0, 1, 0]);
    expect(top.azDeg).toBeCloseTo(90, 4);
  });

  it('YawSync: 초기 5개 평균, 이후 지수 평활, 튀는 값 무시', () => {
    const ys = new YawSync(3000, 15);
    for (let i = 0; i < 4; i++) expect(ys.update(10 + i * 0.1, i * 100)).toBeNull();
    expect(ys.update(10.4, 400)).toBeCloseTo(10.2, 1);
    // 100ms 뒤 +30° 튐 → 무시
    expect(ys.update(40, 500)).toBeCloseTo(10.2, 1);
    // 느리게 12로 수렴
    let v = 0;
    for (let t = 600; t < 20_000; t += 100) v = ys.update(12, t)!;
    expect(v).toBeCloseTo(12, 1);
  });

  it('정렬 후보: 고도 20~70°·mag ≤ 1.5 별 + 행성·달, 태양 제외, 북극성 포함', () => {
    const c = pickAlignmentCandidates([
      { id: 'sun', name: '태양', altDeg: 40, azDeg: 180, mag: -26, kind: 'sun' },
      { id: 'moon', name: '달', altDeg: 30, azDeg: 100, mag: -10, kind: 'moon' },
      { id: 'star:HIP91262', name: '베가', altDeg: 60, azDeg: 200, mag: 0.03, kind: 'star' },
      { id: 'star:HIP11767', name: '북극성', altDeg: 36, azDeg: 0, mag: 1.98, kind: 'star' },
      { id: 'star:HIP32349', name: '시리우스', altDeg: 10, azDeg: 150, mag: -1.46, kind: 'star' },
      { id: 'star:HIP677', name: '알페라츠', altDeg: 50, azDeg: 90, mag: 2.07, kind: 'star' },
    ]);
    expect(c.map((x) => x.id)).toEqual(['moon', 'star:HIP91262', 'star:HIP11767']);
  });
});

describe('OrientationFilter (60Hz 합성 입력)', () => {
  it('정지 시 잔여 떨림 < 0.2°, 90° 스텝 후 2° 이내 ≤ 150ms', () => {
    const f = new OrientationFilter({ smoothYaw: true });
    const base = deviceOrientationToScene(0, 90, 0);
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    // 2초 정지 + 노이즈 ±0.3°
    let t = 0;
    const settled: number[] = [];
    for (let i = 0; i < 120; i++) {
      t += 1000 / 60;
      const noisy = deviceOrientationToScene(rnd() * 0.3, 90 + rnd() * 0.3, rnd() * 0.3);
      const out = f.push(noisy, t);
      if (i > 60) settled.push(angleBetween2(out, base));
    }
    expect(Math.max(...settled)).toBeLessThan(0.2);
    expect(f.anomaly).toBe(false);
    // 90° 스텝(동쪽)
    const target = deviceOrientationToScene(270, 90, 0);
    const tStep = t;
    let reached: number | null = null;
    for (let i = 0; i < 60; i++) {
      t += 1000 / 60;
      const out = f.push(
        deviceOrientationToScene(270 + rnd() * 0.3, 90 + rnd() * 0.3, rnd() * 0.3),
        t,
      );
      if (reached === null && angleBetween2(out, target) < 2) reached = t - tStep;
    }
    expect(reached).not.toBeNull();
    expect(reached!).toBeLessThanOrEqual(150);
    // 한 샘플 사이 20° yaw 점프(피치 그대로) → 간섭 의심
    f.push(deviceOrientationToScene(290, 90, 0), t + 16);
    expect(f.anomaly).toBe(true);
    f.push(deviceOrientationToScene(290, 90, 0), t + 32);
    expect(f.anomaly).toBe(false);
  });

  it('RateMeter는 중앙값 간격으로 Hz를 낸다', () => {
    const m = new RateMeter();
    for (let i = 0; i < 20; i++) m.push(i * 16.67);
    expect(m.hz!).toBeCloseTo(60, 0);
  });
});

function angleBetween2(a: Quaternion, b: Quaternion): number {
  return 2 * Math.acos(Math.min(1, Math.abs(a.dot(b)))) * (180 / Math.PI);
}

describe('parseLatLon', () => {
  it('여러 표기 지원', () => {
    expect(parseLatLon('36.37, 127.36')).toEqual({ lat: 36.37, lon: 127.36 });
    expect(parseLatLon('36.37 127.36')).toEqual({ lat: 36.37, lon: 127.36 });
    expect(parseLatLon('36°22′N 127°22′E')).toEqual({ lat: 36.36667, lon: 127.36667 });
    expect(parseLatLon('36 22 12 N, 127 21 36 E')).toEqual({ lat: 36.37, lon: 127.36 });
    expect(parseLatLon('N36.37 E127.36')).toEqual({ lat: 36.37, lon: 127.36 });
    expect(parseLatLon('33.87S, 151.21E')).toEqual({ lat: -33.87, lon: 151.21 });
    expect(parseLatLon('-33.87, -70.66')).toEqual({ lat: -33.87, lon: -70.66 });
    expect(parseLatLon('hello')).toBeNull();
    expect(parseLatLon('95, 10')).toBeNull();
  });
});
