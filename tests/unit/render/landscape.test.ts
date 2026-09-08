import { expect, it } from 'vitest';
import { effectiveGroundOpacity, landscapeFade } from '@/render/landscape';
import { restoredLayers } from '@/state/layerStore';
it('위쪽은 지면을 유지하고 아래로 갈수록 연속적으로 투명해진다', () => {
  expect(landscapeFade(20)).toBe(1);
  expect(landscapeFade(0)).toBe(1);
  expect(landscapeFade(-14)).toBeCloseTo(0.5);
  expect(landscapeFade(-28)).toBe(0);
  expect(landscapeFade(-90)).toBe(0);
  for (let alt = 0; alt > -90; alt -= 0.5)
    expect(landscapeFade(alt - 0.5)).toBeLessThanOrEqual(landscapeFade(alt));
  expect(landscapeFade(-0.01)).toBeGreaterThan(0.999);
  expect(landscapeFade(NaN)).toBe(1);
});
it('사용자 투명도를 보존하고 풍경을 끄면 기존 수동 지면 동작으로 돌아간다', () => {
  expect(effectiveGroundOpacity(0.4, true, -14)).toBeCloseTo(0.2);
  expect(effectiveGroundOpacity(0.4, false, -40)).toBe(0.4);
  expect(effectiveGroundOpacity(0, true, 30)).toBe(0);
  expect(restoredLayers({ groundOpacity: 0.35 }, 2)).toMatchObject({
    groundOpacity: 0.35,
    landscape: true,
  });
  expect(restoredLayers({ groundOpacity: 0.35, landscape: false }, 2).landscape).toBe(false);
});
