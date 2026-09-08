import { describe, expect, it } from 'vitest';
import { AutomaticHeading } from '@/sensors/automaticHeading';
import { deviceOrientationToScene } from '@/sensors/orientation/math';
import { pointingDirection, type QTuple } from '@/astro/pointing';
import { sceneToAltAz } from '@/astro/coords';
import type { OrientationSample } from '@/sensors/orientation/types';

function sample(overrides: Partial<OrientationSample> = {}): OrientationSample {
  return {
    q: deviceOrientationToScene(270, 30, 0, 0),
    northReference: 'magnetic',
    compassHeadingDeg: null,
    compassAccuracyDeg: null,
    raw: { alpha: 270, beta: 30, gamma: 0, absolute: true },
    timestampMs: 0,
    screenAngleDeg: 0,
    provider: 'DeviceOrientation',
    ...overrides,
  };
}
function direction(q: NonNullable<ReturnType<AutomaticHeading['push']>>) {
  return sceneToAltAz(pointingDirection(q.toArray() as QTuple));
}
describe('별 보정 없는 자동 방향의 관측 가능한 북 기준', () => {
  it.each([0, 90, 180, 270])(
    '화면 회전 %s°와 무관하게 폰 윗변 +Y, 편각은 한 번 적용',
    (screenAngleDeg) => {
      const heading = new AutomaticHeading();
      const q = heading.push(
        sample({ q: deviceOrientationToScene(270, 30, 0, screenAngleDeg), screenAngleDeg }),
        -8,
      )!;
      expect(direction(q).altDeg).toBeCloseTo(30, 8);
      expect(direction(q).azDeg).toBeCloseTo(82, 8);
    },
  );
  it('진북 입력에는 자북 편각을 중복 적용하지 않는다', () => {
    const q = new AutomaticHeading().push(sample({ northReference: 'true' }), -8)!;
    expect(direction(q).azDeg).toBeCloseTo(90, 8);
  });
  it('북 기준 없는 상대 센서는 임의 yaw를 자동 방위로 반환하지 않는다', () => {
    const heading = new AutomaticHeading();
    for (let i = 0; i < 20; i++)
      expect(
        heading.push(sample({ northReference: 'relative', timestampMs: i * 100 }), -8),
      ).toBeNull();
  });
  it('유효한 iOS 나침반의 정지 샘플을 모아 상대 yaw를 동기화한다', () => {
    const heading = new AutomaticHeading();
    const s = sample({ northReference: 'relative', compassHeadingDeg: 130, compassAccuracyDeg: 5 });
    for (let i = 0; i < 5; i++) expect(heading.push({ ...s, timestampMs: i * 100 }, -8)).toBeNull();
    const q = heading.push({ ...s, timestampMs: 500 }, -8)!;
    expect(direction(q).azDeg).toBeCloseTo(122, 8);
    expect(direction(q).altDeg).toBeCloseTo(30, 8);
  });
  it.each([-1, 30, null])(
    '무효/미상의 나침반 정확도 %s는 자동 방향으로 쓰지 않는다',
    (accuracy) => {
      const heading = new AutomaticHeading();
      for (let i = 0; i < 20; i++)
        expect(
          heading.push(
            sample({
              northReference: 'relative',
              compassHeadingDeg: 130,
              compassAccuracyDeg: accuracy,
              timestampMs: i * 100,
            }),
            -8,
          ),
        ).toBeNull();
    },
  );
  it('센서가 멈췄다가 복귀하면 이전 상대 yaw 동기화를 재사용하지 않는다', () => {
    const heading = new AutomaticHeading();
    const s = sample({ northReference: 'relative', compassHeadingDeg: 130, compassAccuracyDeg: 5 });
    for (let i = 0; i < 6; i++) heading.push({ ...s, timestampMs: i * 100 }, -8);
    expect(heading.push({ ...s, timestampMs: 3000 }, -8)).toBeNull();
  });
  it('동기화 뒤 큰 기울기에서 자이로를 짧게 잇되 30초 지나면 방위를 해제한다', () => {
    const heading = new AutomaticHeading();
    const s = sample({ northReference: 'relative', compassHeadingDeg: 130, compassAccuracyDeg: 5 });
    for (let i = 0; i < 6; i++) heading.push({ ...s, timestampMs: i * 100 }, -8);
    for (let time = 600; time <= 30_500; time += 100) {
      expect(heading.push({ ...s, timestampMs: time, compassHeadingDeg: null }, -8)).not.toBeNull();
    }
    expect(heading.push({ ...s, timestampMs: 30_600, compassHeadingDeg: null }, -8)).toBeNull();
  });
});
