import { expect, it } from 'vitest';
import { eqjToSceneMatrix, applyMat3 } from '@/astro/frames';
import { apparentAltitude } from '@/astro/refraction';
import { altAzToScene, raDecToUnitVector, sceneToAltAz } from '@/astro/coords';
import { pickConeCos, toCatalogDirection, pickExtinctionMag } from '@/render/HitTest';
import { CameraController } from '@/render/CameraController';

it('좁은 시야·지평선·천정에서 빠른 후보 필터가 손가락 아래 별을 제외하지 않는다', () => {
  const matrix = eqjToSceneMatrix(new Date('2026-09-06T12:00:00Z'), {
    lat: 36.37,
    lon: 127.36,
    elevation: 0,
  });
  const camera = new CameraController({
    onChange: () => {},
    getSize: () => ({ width: 400, height: 800 }),
  });
  for (const fov of [3, 20, 90, 220]) {
    for (let ra = 0; ra < 360; ra += 45)
      for (const dec of [-70, -10, 40, 88]) {
        const catalog = raDecToUnitVector(ra, dec);
        const aa = sceneToAltAz(applyMat3(matrix, catalog));
        const apparent = altAzToScene(apparentAltitude(aa.altDeg), aa.azDeg);
        camera.setView({ fovDeg: fov, altDeg: aa.altDeg, azDeg: aa.azDeg });
        camera.applyToCamera(400, 800);
        const point = camera.directionToPixel(apparent, 400, 800)!;
        for (const dx of [-24, 0, 24]) {
          const cone = toCatalogDirection(
            camera.pixelToDirection(point.x + dx, point.y, 400, 800),
            matrix,
          );
          const dot = catalog[0] * cone[0] + catalog[1] * cone[1] + catalog[2] * cone[2];
          expect(dot).toBeGreaterThanOrEqual(pickConeCos(fov, 400, 800));
        }
      }
  }
});
it('지평선 소광과 투명한 지표 아래의 점진적 회복을 반영한다', () => {
  expect(pickExtinctionMag(90, false)).toBeLessThan(0.001);
  expect(pickExtinctionMag(1, false)).toBeGreaterThan(5);
  expect(pickExtinctionMag(-3, true)).toBe(2);
  expect(pickExtinctionMag(-8, true)).toBe(0);
});
