import { describe, expect, it } from 'vitest';
import { altAzToScene, sceneToAltAz } from '@/astro/coords';
import { altAzToQuaternion, CameraController, quaternionToAltAz } from '@/render/CameraController';
import { dsoMagLimits } from '@/render/DsoLayer';
import { angleBetweenDeg, circlePoints, slerpPoints } from '@/render/greatCircle';
import { hitWeight, pickBest } from '@/render/HitTest';
import { constellationLabelBudget, Labels, starLabelMagLimit } from '@/render/Labels';
import { clampFov, degPerPixel, verticalFovDeg, zoomFov } from '@/render/projection';
import { skyBrightnessPenaltyMag } from '@/render/SkyBackground';

describe('CameraController: alt/az ↔ 쿼터니언', () => {
  it('왕복 오차 < 1e-6°, 천정 근처 클램프', () => {
    for (const [alt, az] of [
      [0, 0],
      [45, 180],
      [-20, 90],
      [80, 270],
      [10, 359],
    ] as const) {
      const q = altAzToQuaternion(alt, az);
      const r = quaternionToAltAz(q);
      expect(r.altDeg).toBeCloseTo(alt, 6);
      expect(r.azDeg).toBeCloseTo(az, 6);
    }
    expect(quaternionToAltAz(altAzToQuaternion(89.9, 10)).altDeg).toBeLessThanOrEqual(89.5 + 1e-6);
  });

  it('북쪽을 볼 때 동쪽이 화면 오른쪽, 천정이 위 (거울상 아님)', () => {
    const c = new CameraController({
      onChange: () => {},
      getSize: () => ({ width: 400, height: 800 }),
    });
    c.setView({ altDeg: 0, azDeg: 0, fovDeg: 90 }, false);
    c.applyToCamera(400, 800);
    const east = c.directionToPixel(altAzToScene(0, 30), 400, 800)!;
    const west = c.directionToPixel(altAzToScene(0, 330), 400, 800)!;
    const up = c.directionToPixel(altAzToScene(30, 0), 400, 800)!;
    expect(east.x).toBeGreaterThan(200);
    expect(west.x).toBeLessThan(200);
    expect(up.y).toBeLessThan(400);
    // 픽셀 → 방향 → 픽셀 왕복
    const dir = c.pixelToDirection(300, 200, 400, 800);
    const back = c.directionToPixel(dir, 400, 800)!;
    expect(back.x).toBeCloseTo(300, 3);
    expect(back.y).toBeCloseTo(200, 3);
    expect(c.directionToPixel(altAzToScene(0, 180), 400, 800)).toBeNull(); // 뒤쪽
  });

  it('flyTo는 목표에 도달하고 fov를 보간한다', () => {
    let last = { altDeg: 0, azDeg: 0, fovDeg: 0 };
    const c = new CameraController({
      onChange: (v) => (last = v),
      getSize: () => ({ width: 400, height: 800 }),
    });
    c.setView({ altDeg: 10, azDeg: 20, fovDeg: 90 }, false);
    c.flyTo({ altDeg: 50, azDeg: 200, fovDeg: 30 }, 400);
    const t0 = performance.now();
    c.update(t0 + 200, 16);
    expect(c.isAnimating()).toBe(true);
    c.update(t0 + 500, 16);
    expect(last.altDeg).toBeCloseTo(50, 3);
    expect(last.azDeg).toBeCloseTo(200, 3);
    expect(last.fovDeg).toBeCloseTo(30, 3);
    expect(c.isAnimating()).toBe(false);
  });
});

describe('projection', () => {
  it('짧은 변 기준 FOV → 세로 FOV, 픽셀당 각도', () => {
    expect(verticalFovDeg(90, 800, 400)).toBe(90); // 가로 화면: 세로가 짧은 변
    const v = verticalFovDeg(90, 400, 800); // 세로 화면: 가로 90° → 세로 ≈ 126.9°
    expect(v).toBeCloseTo(126.87, 1);
    expect(degPerPixel(90, 400, 800)).toBeCloseTo(0.2865, 3);
    expect(clampFov(200)).toBe(100);
    expect(clampFov(1)).toBe(3);
    expect(zoomFov(90, 2)).toBe(45);
  });
});

describe('hit-test · 라벨 임계 · DSO 한계', () => {
  it('가까운 어두운 별보다 조금 먼 밝은 별을 고른다', () => {
    const best = pickBest(
      [
        { id: 'star:HIP1', x: 103, y: 100, mag: 5.5 },
        { id: 'star:HIP2', x: 110, y: 100, mag: 0.5 },
        { id: 'star:HIP3', x: 200, y: 100, mag: -1 },
      ],
      100,
      100,
    );
    expect(best?.id).toBe('star:HIP2');
    expect(hitWeight(0, 6)).toBe(0);
    expect(hitWeight(10, 0)).toBeLessThan(hitWeight(10, 6));
    expect(pickBest([{ id: 'moon', x: 150, y: 100, mag: -10, radiusPx: 60 }], 100, 100)?.id).toBe(
      'moon',
    );
  });

  it('starLabelMagLimit는 FOV가 좁을수록 커진다(단조)', () => {
    let prev = -Infinity;
    for (const fov of [110, 100, 80, 60, 45, 30, 20, 10, 5]) {
      const v = starLabelMagLimit(fov);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(starLabelMagLimit(100)).toBe(1.5);
    expect(constellationLabelBudget(30)).toBeGreaterThan(constellationLabelBudget(100));
    expect(dsoMagLimits(90).other).toBeLessThan(0);
    expect(dsoMagLimits(50).messier).toBe(99);
  });

  it('Labels: 겹치는 라벨은 우선순위 낮은 쪽이 생략된다', () => {
    const container = document.createElement('div');
    const labels = new Labels(container);
    labels.resize(400, 400);
    labels.update([
      { key: 'a', x: 100, y: 100, text: 'Vega', priority: 1, kind: 'star' },
      { key: 'b', x: 102, y: 101, text: 'Other', priority: 5, kind: 'star' },
      { key: 'c', x: 300, y: 300, text: 'Deneb', priority: 2, kind: 'star' },
    ]);
    const visible = [...container.querySelectorAll<HTMLElement>('.sky-label')].filter(
      (e) => !e.hidden,
    );
    expect(visible.map((e) => e.textContent)).toEqual(['Vega', 'Deneb']);
  });
});

describe('greatCircle · 하늘 밝기', () => {
  it('slerp 분할과 원', () => {
    const pts = slerpPoints([1, 0, 0], [0, 1, 0], 10);
    expect(pts.length).toBe(10);
    expect(angleBetweenDeg(pts[0]!, pts[1]!)).toBeCloseTo(10, 6);
    const circle = circlePoints([0, 1, 0], 3, 30);
    for (const p of circle) expect(sceneToAltAz(p).altDeg).toBeCloseTo(30, 6);
  });
  it('태양 고도 −18° 이하 0, 낮에는 10등급 이상', () => {
    expect(skyBrightnessPenaltyMag(-25)).toBe(0);
    expect(skyBrightnessPenaltyMag(-12)).toBeCloseTo(1.5, 5);
    expect(skyBrightnessPenaltyMag(5)).toBeGreaterThan(10);
  });
});
