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
  private readonly meadowUniforms = {
    uMeadowEnabled: { value: 0 },
    uMeadowTint: { value: new THREE.Color() },
  };
  private disposed = false;

  get meadowVisible(): boolean {
    return this.meadowUniforms.uMeadowEnabled.value > 0 && this.groundMaterial.opacity > 0.001;
  }

  constructor() {
    // 아래 반구: thetaStart π/2 (적도) 부터 π (남극) 까지
    const geom = new THREE.SphereGeometry(95, 192, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
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

  async loadMeadow(invalidate: () => void, maxAnisotropy = 1): Promise<void> {
    try {
      const texture = await new THREE.TextureLoader().loadAsync(
        `${import.meta.env.BASE_URL}landscapes/meadow-v2.webp`,
      );
      if (this.disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      this.groundMaterial.map = texture;
      this.groundMaterial.needsUpdate = true;
      invalidate();
    } catch {
      /* 풍경을 읽지 못해도 기존 지면·하늘은 계속 표시한다. */
    }
  }
  /** 풍경과 지면을 한 번만 합성한다. 별도 반투명 레이어가 겹쳐 짙어지는 현상을 막는다. */
  blendMeadowEdge(): void {
    const project = this.groundMaterial.onBeforeCompile.bind(this.groundMaterial);
    this.groundMaterial.onBeforeCompile = (shader, renderer) => {
      project(shader, renderer);
      Object.assign(shader.uniforms, this.meadowUniforms);
      shader.fragmentShader = `uniform float uMeadowEnabled;\nuniform vec3 uMeadowTint;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
        // 아래 반구 UV: 지평선 y=1, 천저 y=0. 하늘 위에는 장식을 그리지 않는다.
        float belowDeg = (1.0 - vMapUv.y) * 90.0;
        float meadowBlend = smoothstep(0.0, 2.5, belowDeg)
          * (1.0 - smoothstep(14.0, 32.0, belowDeg)) * uMeadowEnabled;
        // 반복 가장자리 10%를 겹쳐, 원본이 완전한 타일이 아니어도 이음매를 숨긴다.
        float mx = fract(vMapUv.x * 6.0) * 0.9;
        float my = clamp(1.0 - belowDeg / 32.0, 0.0, 1.0);
        vec3 meadowA = texture2D(map, vec2(mx, my)).rgb;
        vec3 meadowB = texture2D(map, vec2(mx + 0.9, my)).rgb;
        vec3 meadowColor = mix(meadowA, meadowB, 1.0 - smoothstep(0.0, 0.1, mx));
        diffuseColor.rgb = mix(diffuseColor.rgb, meadowColor * uMeadowTint, meadowBlend);
        diffuseColor.a *= mix(1.0, smoothstep(0.0, 0.8, belowDeg), uMeadowEnabled);
        #endif
      `,
      );
    };
    this.groundMaterial.customProgramCacheKey = () => 'skylog-stereographic-meadow-blend-v2';
  }
  setMeadow(enabled: boolean, night: boolean, sunAltitude: number): void {
    this.meadowUniforms.uMeadowEnabled.value = enabled && !!this.groundMaterial.map ? 1 : 0;
    // 적색 테마를 유지하고, 낮/밤에 맞춰 장식의 밝기만 조절한다.
    const brightness = Math.max(0.3, Math.min(0.8, 0.3 + (sunAltitude + 18) / 48));
    this.meadowUniforms.uMeadowTint.value.setRGB(
      night ? 0.55 : brightness,
      night ? 0 : brightness,
      night ? 0 : brightness,
    );
  }

  dispose(): void {
    this.disposed = true;
    this.groundMaterial.map?.dispose();
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
