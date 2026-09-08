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
  readonly meadow: THREE.Mesh;
  private readonly meadowMaterial: THREE.MeshBasicMaterial;
  private disposed = false;

  constructor() {
    // 아래 반구: thetaStart π/2 (적도) 부터 π (남극) 까지
    const geom = new THREE.SphereGeometry(95, 64, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    this.groundMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#0b0d12'),
      side: THREE.BackSide,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: false,
    });
    this.ground = new THREE.Mesh(geom, this.groundMaterial);
    this.ground.renderOrder = 40;
    this.ground.frustumCulled = false;

    this.meadowMaterial = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      alphaTest: 0.01,
    });
    // 텍스처의 투명 상단까지 포함한다. 꽃과 풀 끝은 지평선 약 0~3° 안쪽이다.
    this.meadow = new THREE.Mesh(
      new THREE.SphereGeometry(
        94,
        192,
        20,
        0,
        Math.PI * 2,
        (72 * Math.PI) / 180,
        (28 * Math.PI) / 180,
      ),
      this.meadowMaterial,
    );
    this.meadow.renderOrder = 40.5;
    this.meadow.frustumCulled = false;
    this.meadow.visible = false;

    const polys: Vec3[][] = [circlePoints([0, 1, 0], 1, 0)];
    for (let az = 0; az < 360; az += 10) {
      const h = az % 90 === 0 ? 3 : az % 30 === 0 ? 2 : 1;
      polys.push([altAzToScene(0, az), altAzToScene(h, az)]);
    }
    this.ring.setPolylines(polys);
  }

  setStyle(groundColor: string, opacity: number, ringColor: string): void {
    this.groundMaterial.color.set(groundColor);
    this.groundMaterial.opacity = Math.max(0, Math.min(1, opacity));
    this.ring.setStyle(ringColor, 0.8);
  }

  async loadMeadow(invalidate: () => void): Promise<void> {
    try {
      const texture = await new THREE.TextureLoader().loadAsync(
        `${import.meta.env.BASE_URL}landscapes/meadow-v1.webp`,
      );
      if (this.disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = 3;
      this.meadowMaterial.map = texture;
      this.meadowMaterial.needsUpdate = true;
      invalidate();
    } catch {
      /* 풍경을 읽지 못해도 기존 지면·하늘은 계속 표시한다. */
    }
  }
  /** 공통 천구 투영 셰이더를 유지하면서 풍경 아래쪽을 지면 색으로 잇는다. */
  blendMeadowEdge(): void {
    const project = this.meadowMaterial.onBeforeCompile.bind(this.meadowMaterial);
    this.meadowMaterial.onBeforeCompile = (shader, renderer) => {
      project(shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        #ifdef USE_MAP
        diffuseColor.a *= smoothstep(0.0, 0.24, vMapUv.y);
        #endif
      `,
      );
    };
    this.meadowMaterial.customProgramCacheKey = () => 'skylog-stereographic-meadow-fade-v1';
  }
  setMeadow(enabled: boolean, opacity: number, night: boolean, sunAltitude: number): void {
    this.meadow.visible = enabled && !!this.meadowMaterial.map && opacity > 0.001;
    this.meadowMaterial.opacity = opacity;
    // 적색 테마를 유지하고, 낮/밤에 맞춰 장식의 밝기만 조절한다.
    const brightness = Math.max(0.3, Math.min(0.8, 0.3 + (sunAltitude + 18) / 48));
    this.meadowMaterial.color.setRGB(
      night ? 0.55 : brightness,
      night ? 0 : brightness,
      night ? 0 : brightness,
    );
  }

  dispose(): void {
    this.disposed = true;
    this.meadow.geometry.dispose();
    this.meadowMaterial.map?.dispose();
    this.meadowMaterial.dispose();
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
