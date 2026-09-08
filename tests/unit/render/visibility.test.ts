import { describe, expect, it } from 'vitest';
import { milkyWayOpacity } from '@/render/MilkyWayLayer';

describe('은하수 표시 조건', () => {
  it('새 기본값1/3과 최대값은 같은 박명 비율로 감광되고 밤에는 선택한 강도를 유지한다', () => {
    for (const alpha of [1 / 3, 1]) {
      expect(milkyWayOpacity(alpha, -25, true)).toBe(alpha);
      expect(milkyWayOpacity(alpha, -12, true)).toBeCloseTo(alpha / 2);
      expect(milkyWayOpacity(alpha, -6, true)).toBe(0);
    }
  });

  it('기존 저장값0.6은 밤에 전부 유지하고, 대기가 켜진 낮에는 숨긴다', () => {
    expect(milkyWayOpacity(0.6, -25, true)).toBe(0.6);
    expect(milkyWayOpacity(0.6, -18, true)).toBe(0.6);
    expect(milkyWayOpacity(0.6, -12, true)).toBeCloseTo(0.3);
    expect(milkyWayOpacity(0.6, -6, true)).toBe(0);
    expect(milkyWayOpacity(0.6, 45, true)).toBe(0);
  });

  it('대기를 끈 지도에서는 낮에도 보이고 사용자알파0은 계속 숨긴다', () => {
    for (const sunAlt of [-30, -12, 0, 60]) {
      expect(milkyWayOpacity(0.6, sunAlt, false)).toBe(0.6);
      expect(milkyWayOpacity(0, sunAlt, false)).toBe(0);
    }
    expect(milkyWayOpacity(1.5, -25, true)).toBe(1);
    expect(milkyWayOpacity(-0.5, -25, true)).toBe(0);
  });
});
