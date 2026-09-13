import { describe, expect, it } from 'vitest';
import { skyUpdateIntervalMs } from '@/render/skyCadence';
import { degPerPixel } from '@/render/projection';
import { applyMat3, eqjToSceneMatrix } from '@/astro/frames';
import { angularSeparation } from '@/astro/coords';

describe('확대 화면의 천체 위치 갱신', () => {
  it('광각의 계산량은 유지하고 확대·고해상도에서 더 자주 갱신한다', () => {
    expect(skyUpdateIntervalMs(90, 412, 915)).toBe(1000);
    expect(skyUpdateIntervalMs(3, 412, 915)).toBeLessThan(100);
    expect(skyUpdateIntervalMs(3, 824, 1830)).toBeLessThan(skyUpdateIntervalMs(3, 412, 915));
    expect(skyUpdateIntervalMs(3, 4000, 8000)).toBeGreaterThanOrEqual(40);
  });
  it('현재 천문 래퍼로 계산한 정지 시야의 별 이동을 한 번에 0.1px 이내로 제한한다', () => {
    const observer = { lat: 36.37, lon: 127.36 };
    const date = new Date('2026-09-13T12:00:00Z');
    for (const fov of [90, 15, 3]) {
      const interval = skyUpdateIntervalMs(fov, 412, 915);
      const before = applyMat3(eqjToSceneMatrix(date, observer), [1, 0, 0]);
      const after = applyMat3(
        eqjToSceneMatrix(new Date(date.getTime() + interval), observer),
        [1, 0, 0],
      );
      expect(angularSeparation(before, after) / degPerPixel(fov, 412, 915)).toBeLessThan(0.1);
    }
  });
});
