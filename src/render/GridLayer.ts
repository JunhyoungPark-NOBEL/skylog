import { altAzToScene, raDecToUnitVector, type Vec3 } from '@/astro/coords';
import { circlePoints } from '@/render/greatCircle';
import { LineLayer } from '@/render/LineLayer';

/**
 * 격자·기준선: 고도-방위 격자(씬 고정, 굴절 없음), 천구 적도·황도(J2000, 행렬+굴절), 자오선(씬 고정).
 * 황도의 극: J2000 RA 270°, Dec +66.5607°.
 */
export class GridLayer {
  readonly altAz = new LineLayer({
    useMatrix: false,
    refraction: false,
    renderOrder: 25,
    fadeBelowHorizon: false,
  });
  readonly equator = new LineLayer({ useMatrix: true, refraction: true, renderOrder: 26 });
  readonly ecliptic = new LineLayer({
    useMatrix: true,
    refraction: true,
    renderOrder: 26,
    dashDeg: 2,
  });
  readonly meridian = new LineLayer({
    useMatrix: false,
    refraction: false,
    renderOrder: 26,
    fadeBelowHorizon: false,
  });

  constructor() {
    // 고도-방위 격자: 고도 원(±10°…±80°) + 방위 자오선(10° 간격)
    const polys: Vec3[][] = [];
    for (let alt = -80; alt <= 80; alt += 10) {
      if (alt === 0) continue; // 지평선은 HorizonLayer
      polys.push(circlePoints([0, 1, 0], 3, alt));
    }
    for (let az = 0; az < 360; az += 10) {
      const pts: Vec3[] = [];
      for (let alt = -90; alt <= 90; alt += 3) pts.push(altAzToScene(alt, az));
      polys.push(pts);
    }
    this.altAz.setPolylines(polys);

    // 천구 적도: J2000 z축이 법선
    this.equator.setPolylines([circlePoints([0, 0, 1], 2)]);
    // 황도: 황극이 법선
    this.ecliptic.setPolylines([circlePoints(raDecToUnitVector(270, 66.5607), 2)]);
    // 자오선: 동쪽(+X)이 법선 → 북–천정–남 큰 원
    this.meridian.setPolylines([circlePoints([1, 0, 0], 3)]);
  }

  setMatrix(m: Float32Array): void {
    this.equator.setMatrix(m);
    this.ecliptic.setMatrix(m);
  }

  dispose(): void {
    this.altAz.dispose();
    this.equator.dispose();
    this.ecliptic.dispose();
    this.meridian.dispose();
  }
}
