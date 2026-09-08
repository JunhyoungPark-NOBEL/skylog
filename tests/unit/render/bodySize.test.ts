import { describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import * as bodies from '@/astro/bodies';
import { DEG, type Vec3 } from '@/astro/coords';
import { BodyLayer, BODY_KEYS } from '@/render/BodyLayer';
import {
  BODY_DISTANCE,
  luminaryDiscSize,
  MIN_LUMINARY_DIAMETER_CSS,
  SUN_DISC_FRACTION,
} from '@/render/bodySize';
import { degPerPixel, stereographicProject } from '@/render/projection';

const WIDTH = 412;
const HEIGHT = 915;
const OBSERVER = { lat: 36.37, lon: 127.36, elevation: 70 };

/** 크기 공식을 복사하지 않고 원반 양쪽 경계 방향을 실제 공통 투영에 넣어 지름을 잰다. */
function boundaryDiameter(radius: number, viewAngle: number, fov: number): number {
  const direction = (angle: number): Vec3 => [Math.sin(angle), 0, -Math.cos(angle)];
  const left = stereographicProject(direction(viewAngle - radius), fov, WIDTH, HEIGHT)!;
  const right = stereographicProject(direction(viewAngle + radius), fov, WIDTH, HEIGHT)!;
  return Math.hypot(right.x - left.x, right.y - left.y);
}

describe('태양·달 본체 크기와 입체 투영', () => {
  it.each([90, 180, 220])('넓은 FOV%i°에서 본체 지름24CSSpx를 중앙·주변에 보장한다', (fov) => {
    for (const angle of [0, 30, 60]) {
      const result = luminaryDiscSize(
        1900,
        degPerPixel(fov, WIDTH, HEIGHT),
        false,
        Math.cos(angle * DEG),
      );
      expect(result.diameterCss).toBeCloseTo(MIN_LUMINARY_DIAMETER_CSS, 8);
      expect(boundaryDiameter(result.angularRadiusRad, angle * DEG, fov)).toBeCloseTo(24, 8);
      expect(Math.asin(result.meshRadius / BODY_DISTANCE)).toBeCloseTo(result.angularRadiusRad, 10);
    }
  });

  it('좁은 FOV에서는24px보다 커진 실제 각지름과×3 옵션을 그대로 사용한다', () => {
    const dpp = degPerPixel(3, WIDTH, HEIGHT);
    for (const magnify of [false, true]) {
      const result = luminaryDiscSize(1800, dpp, magnify);
      const physicalRadius = 0.25 * DEG * (magnify ? 3 : 1);
      expect(result.angularRadiusRad).toBeCloseTo(physicalRadius, 12);
      expect(result.diameterCss).toBeGreaterThan(24);
      expect(boundaryDiameter(physicalRadius, 0, 3)).toBeCloseTo(result.diameterCss, 8);
    }
  });

  it('광각 주변에서 확대된 구 메시의 실루엣과 라벨용 지름이 일치한다', () => {
    const result = luminaryDiscSize(2000, degPerPixel(3, WIDTH, HEIGHT), true, Math.cos(45 * DEG));
    const sphereRadius = Math.asin(result.meshRadius / BODY_DISTANCE);
    expect(boundaryDiameter(sphereRadius, 45 * DEG, 3)).toBeCloseTo(result.diameterCss, 8);
  });
});

describe('BodyLayer 크기 갱신', () => {
  it.each(['2026-09-06T03:00:00Z', '2026-09-06T12:00:00Z'])(
    '낮/밤(%s)에도 태양·달 본체 최소 크기는 같고 어두운 행성만 한계등급을 따른다',
    (date) => {
      const layer = new BodyLayer();
      try {
        layer.update(new Date(date), OBSERVER, degPerPixel(220, WIDTH, HEIGHT), 3, false, -99);
        const sun = layer.sunPlacement!;
        const moon = layer.placements.find((p) => p.key === 'moon')!;
        expect((sun.sizePx * SUN_DISC_FRACTION) / 3).toBeCloseTo(24, 8);
        expect(moon.sizePx / 3).toBeCloseTo(24, 8);
        expect(
          layer.placements
            .filter((p) => p.key !== 'sun' && p.key !== 'moon')
            .every((p) => p.sizePx === 0),
        ).toBe(true);
        const sizes = layer.placements.map((p) => p.sizePx);
        layer.setStyle(true, '#ff0000', '#cccccc', 3);
        expect(layer.placements.map((p) => p.sizePx)).toEqual(sizes);
        expect((layer.moon.material as THREE.MeshLambertMaterial).color.g).toBe(0);
        expect((layer.moon.material as THREE.MeshLambertMaterial).color.b).toBe(0);
        const uniform = (layer.points.material as THREE.ShaderMaterial).uniforms[
          'uSunDiscFraction'
        ]!;
        expect(uniform.value).toBe(SUN_DISC_FRACTION);
      } finally {
        layer.dispose();
      }
    },
  );

  it('시간 정지 중 줌·DPR·확대·회전은 위치·위상·조명을 보존하고 크기만 갱신한다', () => {
    const bodyState = vi.spyOn(bodies, 'bodyState');
    const layer = new BodyLayer();
    try {
      layer.update(
        new Date('2026-09-06T12:00:00Z'),
        OBSERVER,
        degPerPixel(90, WIDTH, HEIGHT),
        1,
        false,
      );
      expect(bodyState).toHaveBeenCalledTimes(BODY_KEYS.length);
      const moon = layer.placements.find((p) => p.key === 'moon')!;
      const states = layer.placements.map((p) => ({ ...p.state }));
      const directions = layer.placements.map((p) => [...p.dir]);
      const moonPosition = layer.moon.position.clone();
      const illumination = layer.sunLight.position.clone();
      const wideDiameter = moon.sizePx;

      layer.updateViewScale(degPerPixel(3, WIDTH, HEIGHT), 2, true, moon.dir);
      expect(bodyState).toHaveBeenCalledTimes(BODY_KEYS.length);
      expect(layer.placements.map((p) => p.state)).toEqual(states);
      expect(layer.placements.map((p) => p.dir)).toEqual(directions);
      expect(layer.moon.position).toEqual(moonPosition);
      expect(layer.sunLight.position).toEqual(illumination);
      expect(moon.sizePx / 2).toBeGreaterThan(wideDiameter);
      const radius = Math.asin(layer.moon.scale.x / BODY_DISTANCE);
      expect(boundaryDiameter(radius, 0, 3)).toBeCloseTo(moon.sizePx / 2, 8);
      const sizes = layer.points.geometry.getAttribute('aSizePx');
      expect(sizes.getX(BODY_KEYS.indexOf('moon'))).toBe(0);
      expect(sizes.getX(BODY_KEYS.indexOf('sun'))).toBeCloseTo(layer.sunPlacement!.sizePx, 3);

      // 화면비·방향이 달라져도 최소 CSS 지름은 유지하며 DPR만 버퍼 크기에 반영한다.
      layer.updateViewScale(degPerPixel(220, HEIGHT, WIDTH), 3, false, [0, 1, 0]);
      expect(moon.sizePx / 3).toBeCloseTo(24, 8);
      expect(bodyState).toHaveBeenCalledTimes(BODY_KEYS.length);
    } finally {
      layer.dispose();
    }
  });
});
