import { describe, expect, it } from 'vitest';
import { edgePoint, insideScreen, placeEdgeArrow } from '@/render/edgeArrow';

const W = 400;
const H = 800;

describe('edgePoint', () => {
  it('오른쪽·아래·왼쪽·위 가장자리(여백 20)', () => {
    expect(edgePoint(0, W, H, 20)).toEqual({ x: 380, y: 400 });
    const down = edgePoint(Math.PI / 2, W, H, 20);
    expect(down.x).toBeCloseTo(200, 5);
    expect(down.y).toBeCloseTo(780, 5);
    const left = edgePoint(Math.PI, W, H, 20);
    expect(left.x).toBeCloseTo(20, 5);
    const up = edgePoint(-Math.PI / 2, W, H, 20);
    expect(up.y).toBeCloseTo(20, 5);
  });
  it('대각선은 짧은 변에서 잘린다', () => {
    const p = edgePoint(Math.atan2(1, 1), W, H, 0);
    expect(p.x).toBeCloseTo(400, 5);
    expect(p.y).toBeCloseTo(600, 5);
  });
});

describe('placeEdgeArrow', () => {
  it('카메라 앞·오른쪽(−z, +x) → 오른쪽 가장자리, 각도 0', () => {
    const p = placeEdgeArrow({ x: 0.7, y: 0, z: -0.7 }, W, H, 20);
    expect(p.behind).toBe(false);
    expect(p.angleDeg).toBeCloseTo(0, 5);
    expect(p.x).toBe(380);
  });
  it('카메라 위(+y) → 위쪽 가장자리, 각도 −90', () => {
    const p = placeEdgeArrow({ x: 0, y: 0.7, z: -0.7 }, W, H, 20);
    expect(p.angleDeg).toBeCloseTo(-90, 5);
    expect(p.y).toBeCloseTo(20, 5);
  });
  it('뒤쪽(z>0)도 카메라 공간 x·y 그대로: 뒤·오른쪽 → 오른쪽 화살표(오른쪽으로 돌면 가장 가깝다)', () => {
    const p = placeEdgeArrow({ x: 0.5, y: 0, z: 0.87 }, W, H, 20);
    expect(p.behind).toBe(true);
    expect(p.angleDeg).toBeCloseTo(0, 5);
    expect(p.x).toBe(380);
  });
  it('정확히 뒤 → 아래', () => {
    const p = placeEdgeArrow({ x: 0, y: 0, z: 1 }, W, H, 20);
    expect(p.angleDeg).toBeCloseTo(90, 5);
  });
});

describe('insideScreen', () => {
  it('여백 포함 판정', () => {
    expect(insideScreen({ x: 10, y: 10 }, W, H, 0)).toBe(true);
    expect(insideScreen({ x: 10, y: 10 }, W, H, 20)).toBe(false);
    expect(insideScreen(null, W, H)).toBe(false);
  });
});
