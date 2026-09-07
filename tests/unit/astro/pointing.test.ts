import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  alignOne,
  alignTwo,
  pointingDirection,
  physicalQuaternion,
  pointingDelta,
  horizonToHourAngle,
  equatorialDelta,
  sunUnsafe,
  type AlignmentSample,
  type QTuple,
} from '@/astro/pointing';
import { deviceOrientationToScene, yawQuaternion } from '@/sensors/orientation/math';
import {
  angularSeparation,
  altAzToScene,
  equatorialToHorizontal,
  sceneToAltAz,
  type Vec3,
} from '@/astro/coords';
import {
  finderPoint,
  finderDirection,
  orientPoint,
  fovPixelDiameter,
  defaultImageOrientation,
} from '@/astro/finder';
const model = {
  yawDeg: 27.3,
  axis: new Vector3(0.04, 1, 0.025).normalize().toArray() as Vec3,
  residualDeg: 0,
  maxResidualDeg: 0,
};
const q1 = deviceOrientationToScene(270, 28, 0).toArray() as QTuple;
const q2 = deviceOrientationToScene(185, 62, 5).toArray() as QTuple;
const sample = (q: QTuple, id: string): AlignmentSample => ({
  q,
  objectId: id,
  direction: pointingDirection(q, model),
  at: '2026-09-08T12:00:00Z',
});
describe('경통 포인팅', () => {
  it('폰 윗변은 평평할 때 북쪽, 세울 때 천정이며 뒤 카메라와 90° 다르다', () => {
    for (const screen of [0, 90, 180, 270]) {
      const q = physicalQuaternion(deviceOrientationToScene(0, 0, 0, screen), screen);
      expect(angularSeparation(pointingDirection(q.toArray() as QTuple), [0, 0, -1])).toBeLessThan(
        1e-6,
      );
      expect(
        sceneToAltAz(
          pointingDirection(
            physicalQuaternion(
              deviceOrientationToScene(0, 90, 0, screen),
              screen,
            ).toArray() as QTuple,
          ),
        ).altDeg,
      ).toBeCloseTo(90, 5);
    }
  });
  it('한 별과 주어진 yaw에서 장착축을 복원한다', () => {
    const fitted = alignOne(sample(q1, 'a'), model.yawDeg);
    expect(angularSeparation(fitted.axis, model.axis)).toBeLessThan(0.00001);
    expect(
      angularSeparation(pointingDirection(q2, fitted), pointingDirection(q2, model)),
    ).toBeLessThan(0.00001);
  });
  it('서로 다른 자세 두 개에서 yaw·축을 복원하고 새 자세에서도 맞는다', () => {
    const fitted = alignTwo([sample(q1, 'a'), sample(q2, 'b')]);
    expect(Math.abs(fitted.yawDeg - model.yawDeg)).toBeLessThan(0.05);
    expect(angularSeparation(fitted.axis, model.axis)).toBeLessThan(0.05);
    const q = deviceOrientationToScene(80, 49, -12).toArray() as QTuple;
    expect(
      angularSeparation(pointingDirection(q, fitted), pointingDirection(q, model)),
    ).toBeLessThan(0.05);
  });
  it('0.5° 오차를 넣은 자료도 안내 오차가 1° 미만이다', () => {
    const a = sample(q1, 'a'),
      b = sample(q2, 'b');
    a.direction = new Vector3(...a.direction).applyQuaternion(yawQuaternion(0.5)).toArray() as Vec3;
    const fitted = alignTwo([a, b]);
    expect(
      angularSeparation(pointingDirection(q2, fitted), pointingDirection(q2, model)),
    ).toBeLessThan(1);
  });
  it('같은 별·가까운 별을 성공으로 처리하지 않는다', () => {
    expect(() => alignTwo([sample(q1, 'a'), sample(q2, 'a')])).toThrow();
    expect(() => alignTwo([sample(q1, 'a'), sample(q1, 'b')])).toThrow();
  });
  it('0/360 경계와 천정에서 올바른 차이를 안내한다', () => {
    const d = pointingDelta(altAzToScene(30, 359), altAzToScene(35, 1));
    expect(d.azDeg).toBeCloseTo(2);
    expect(d.altDeg).toBeCloseTo(5);
    expect(pointingDelta(altAzToScene(89, 80), altAzToScene(89, 90)).nearZenith).toBe(true);
  });
  it('지평→시간각/적위 역변환은 독립 순방향과 일치한다', () => {
    for (const h of [-170, -80, 0, 75, 170])
      for (const d of [-55, 0, 70]) {
        const a = equatorialToHorizontal(h, d, 36.37),
          b = horizonToHourAngle(a.altDeg, a.azDeg, 36.37);
        expect(b.haDeg).toBeCloseTo(h, 6);
        expect(b.decDeg).toBeCloseTo(d, 6);
      }
    const a = equatorialToHorizontal(0, 20, 36),
      b = equatorialToHorizontal(1, 25, 36);
    const delta = equatorialDelta(
      altAzToScene(a.altDeg, a.azDeg),
      altAzToScene(b.altDeg, b.azDeg),
      36,
    );
    expect(delta.haDeg).toBeCloseTo(1, 6);
    expect(delta.decDeg).toBeCloseTo(5, 6);
  });
  it('태양이 뜨기 직전에도 목표와 경통 양쪽을 차단한다', () => {
    expect(sunUnsafe(-5, 90, [altAzToScene(5, 90)])).toBe(true);
    expect(sunUnsafe(30, 180, [altAzToScene(40, 180)])).toBe(true);
    expect(sunUnsafe(-7, 90, [altAzToScene(-7, 90)])).toBe(false);
  });
});
describe('시야와 상 방향', () => {
  it('반전·회전한 차트에서 드래그 역투영은 원래 하늘 방향을 복원한다', () => {
    for (const alt of [0, 50, 89])
      for (const orientation of ['upright', 'mirror', 'rotate180', 'flipBoth'] as const) {
        const center = altAzToScene(alt, 40),
          up: Vec3 = [0, 1, 0],
          target = altAzToScene(alt - 1, 42);
        const pos = orientPoint(...finderPoint(target, center, up, 6.5)!, orientation, 37);
        expect(
          angularSeparation(target, finderDirection(...pos, center, up, 6.5, orientation, 37)),
        ).toBeLessThan(0.00001);
      }
  });
  it('실시야 반경과 접평면 크기가 일치한다', () => {
    expect(finderPoint(altAzToScene(0, 3.25), [0, 0, -1], [0, 1, 0], 6.5)![0]).toBeCloseTo(1, 8);
    expect(fovPixelDiameter(6.5, 10, 400)).toBeCloseTo(259.618, 2);
    expect(finderPoint([0, 0, 1], [0, 0, -1], [0, 1, 0], 6.5)).toBeNull();
  });
  it('상 방향과 회전의 결과가 명시적이다(도립=양축 반전)', () => {
    expect(orientPoint(1, 2, 'upright')).toEqual([1, 2]);
    expect(orientPoint(1, 2, 'mirror')).toEqual([-1, 2]);
    expect(orientPoint(1, 2, 'rotate180')).toEqual([-1, -2]);
    expect(orientPoint(1, 2, 'flipBoth')).toEqual([-1, -2]);
    expect(orientPoint(1, 0, 'upright', 90)[1]).toBeCloseTo(1);
    expect(defaultImageOrientation('refractor', true)).toBe('mirror');
    expect(defaultImageOrientation('reflector', true)).toBe('rotate180');
  });
});
