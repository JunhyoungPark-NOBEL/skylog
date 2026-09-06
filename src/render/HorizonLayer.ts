import * as THREE from 'three';
import { altAzToScene, type Vec3 } from '@/astro/coords';
import { circlePoints } from '@/render/greatCircle';
import { LineLayer } from '@/render/LineLayer';

/**
 * 지평선·땅·방위 눈금. 땅은 반지름 95의 아래 반구(반투명 또는 불투명), 지평선 링(고도 0)과 30° 눈금.
 * 방위 문자(북/동/남/서)는 HTML 라벨(Labels)이 그린다 — `cardinalPoints()` 참고.
 */
export class HorizonLayer {
  readonly ground: THREE.Mesh;
  readonly ring = new LineLayer({
    useMatrix: false,
    refraction: false,
    renderOrder: 41,
    fadeBelowHorizon: false,
  });
  private readonly groundMaterial: THREE.MeshBasicMaterial;

  constructor() {
    // 아래 반구: thetaStart π/2 (적도) 부터 π (남극) 까지
    const geom = new THREE.SphereGeometry(95, 64, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    this.groundMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#0b0d12'),
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: false,
    });
    this.ground = new THREE.Mesh(geom, this.groundMaterial);
    this.ground.renderOrder = 40;
    this.ground.frustumCulled = false;

    const polys: Vec3[][] = [circlePoints([0, 1, 0], 1, 0)];
    for (let az = 0; az < 360; az += 10) {
      const h = az % 90 === 0 ? 3 : az % 30 === 0 ? 2 : 1;
      polys.push([altAzToScene(0, az), altAzToScene(h, az)]);
    }
    this.ring.setPolylines(polys);
  }

  setStyle(groundColor: string, groundOpaque: boolean, ringColor: string): void {
    this.groundMaterial.color.set(groundColor);
    this.groundMaterial.opacity = groundOpaque ? 1 : 0.85;
    this.ring.setStyle(ringColor, 0.8);
  }

  dispose(): void {
    this.ground.geometry.dispose();
    this.groundMaterial.dispose();
    this.ring.dispose();
  }
}

/** 방위 라벨 위치(고도 +1.5°) — N/E/S/W + 사이 방위 */
export function cardinalPoints(lang: 'ko' | 'en'): { text: string; dir: Vec3; major: boolean }[] {
  const names =
    lang === 'ko'
      ? ['북', '북동', '동', '남동', '남', '남서', '서', '북서']
      : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names.map((text, i) => ({ text, dir: altAzToScene(1.5, i * 45), major: i % 2 === 0 }));
}
