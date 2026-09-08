import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { altAzToScene } from '@/astro/coords';
import { angleBetweenDeg } from '@/render/greatCircle';
import { CameraController } from '@/render/CameraController';
import {
  degPerPixel,
  hemisphereRadiusPx,
  isInsideSkyDisk,
  stereographicProject,
  stereographicUnproject,
} from '@/render/projection';
import { useViewStore } from '@/state/viewStore';

describe('입체 투영의 각도·원형 경계', () => {
  it('중심과 반구의 동서남북90° 경계가 정확한 원에 놓인다', () => {
    for (const [width, height] of [
      [400, 800],
      [900, 500],
      [600, 600],
    ]) {
      const w = width!,
        h = height!;
      expect(hemisphereRadiusPx(180, w, h)).toBeCloseTo(Math.min(w, h) / 2, 8);
      expect(hemisphereRadiusPx(220, w, h)).toBeLessThan(Math.min(w, h) / 2);
      for (let phi = 0; phi < 360; phi += 15) {
        const a = (phi * Math.PI) / 180;
        const p = stereographicProject([Math.cos(a), Math.sin(a), 0], 220, w, h)!;
        expect(Math.hypot(p.x - w / 2, p.y - h / 2)).toBeCloseTo(hemisphereRadiusPx(220, w, h), 8);
        expect(isInsideSkyDisk(p.x, p.y, 220, w, h)).toBe(true);
      }
      expect(stereographicProject([0, 0, -1], 220, w, h)).toEqual({ x: w / 2, y: h / 2 });
      expect(stereographicProject([1, 0, 0.01], 220, w, h)).toBeNull();
      expect(isInsideSkyDisk(0, 0, 220, w, h)).toBe(false);
    }
  });

  it('짧은 변의 끝이 FOV/2와 일치하고 중심 미분이 드래그 감도와 일치한다', () => {
    for (const fov of [3, 5, 30, 90, 120, 180]) {
      const theta = ((fov / 2) * Math.PI) / 180;
      const p = stereographicProject([Math.sin(theta), 0, -Math.cos(theta)], fov, 400, 800)!;
      expect(p.x).toBeCloseTo(400, 7);
      const center = stereographicUnproject(200, 400, fov, 400, 800);
      const beside = stereographicUnproject(200.01, 400, fov, 400, 800);
      expect((Math.atan2(beside[0], -beside[2]) * 180) / Math.PI / 0.01).toBeCloseTo(
        degPerPixel(fov, 400, 800),
        5,
      );
      expect(center).toEqual([0, 0, -1]);
    }
  });

  it('좁은/넓은 시야에서 독립 구면 방향→픽셀→방향 왕복, 극·경계·화면 회전까지 일치한다', () => {
    for (const fov of [3, 30, 90, 140, 180, 220]) {
      for (const [width, height] of [
        [400, 800],
        [800, 400],
      ]) {
        const w = width!,
          h = height!;
        const c = new CameraController({
          onChange: () => {},
          getSize: () => ({ width: w, height: h }),
        });
        c.setView({ altDeg: 70, azDeg: 351, fovDeg: fov }, false);
        c.applyToCamera(w, h);
        for (let theta = 0; theta <= 89.99; theta += 7.49) {
          for (let phi = 0; phi < 360; phi += 43) {
            const t = (theta * Math.PI) / 180,
              p = (phi * Math.PI) / 180;
            const direction = new THREE.Vector3(
              Math.sin(t) * Math.cos(p),
              Math.sin(t) * Math.sin(p),
              -Math.cos(t),
            ).applyQuaternion(c.camera.quaternion);
            const original: [number, number, number] = [direction.x, direction.y, direction.z];
            const px = c.directionToPixel(original, w, h)!;
            const restored = c.pixelToDirection(px.x, px.y, w, h);
            expect(angleBetweenDeg(original, restored)).toBeLessThan(0.00001);
          }
        }
      }
    }
  });

  it('북쪽에서 동쪽은 오른쪽, 천정 중심에서 동서남북 순서가 뒤집히지 않는다', () => {
    const c = new CameraController({
      onChange: () => {},
      getSize: () => ({ width: 400, height: 800 }),
    });
    c.setView({ altDeg: 0, azDeg: 0, fovDeg: 220 }, false);
    c.applyToCamera(400, 800);
    expect(c.directionToPixel(altAzToScene(0, 90), 400, 800)!.x).toBeGreaterThan(200);
    c.setView({ altDeg: 89.5, azDeg: 180 }, false);
    c.applyToCamera(400, 800);
    const north = c.directionToPixel(altAzToScene(1, 0), 400, 800)!;
    const east = c.directionToPixel(altAzToScene(1, 90), 400, 800)!;
    const south = c.directionToPixel(altAzToScene(1, 180), 400, 800)!;
    const west = c.directionToPixel(altAzToScene(1, 270), 400, 800)!;
    expect(north.y).toBeLessThan(south.y);
    expect(east.x).toBeLessThan(west.x); // 머리 위를 바라보는 하늘 지도
  });

  it('저장소와 카메라의 시야 범위가 같은3..220°다', () => {
    useViewStore.getState().setFov(300);
    expect(useViewStore.getState().fovDeg).toBe(220);
    useViewStore.getState().setFov(0);
    expect(useViewStore.getState().fovDeg).toBe(3);
    useViewStore.getState().setFov(90);
  });
});
