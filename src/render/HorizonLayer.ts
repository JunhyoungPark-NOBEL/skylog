import * as THREE from 'three';
import { altAzToScene, type Vec3 } from '@/astro/coords';
import { circlePoints } from '@/render/greatCircle';
import { LineLayer } from '@/render/LineLayer';
import {
  HORIZON_GROUND_PALETTE,
  HORIZON_ATLAS_DEPTH_DEG,
  horizonAtlasSvg,
  type HorizonArtwork,
} from '@/personal/horizonArt';

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
    uSceneryEnabled: { value: 0 },
    uSceneryHeight: { value: 9 },
    uGroundFar: { value: new THREE.Color('#718779') },
    uGroundNear: { value: new THREE.Color('#344e46') },
    uGroundDetail: { value: new THREE.Color('#a1ad87') },
    uGroundType: { value: 0 },
  };
  private disposed = false;
  private atlasKey = '';
  private atlasGeneration = 0;
  private pendingImage: HTMLImageElement | null = null;
  private sceneryEnabled = true;
  private atlasReady = false;

  get meadowVisible(): boolean {
    return this.meadowUniforms.uMeadowEnabled.value > 0 && this.groundMaterial.opacity > 0.001;
  }

  get sceneryVisible(): boolean {
    return this.meadowVisible && this.meadowUniforms.uSceneryEnabled.value > 0;
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
      // 아틀라스가 준비되기 전에도 map 셰이더 형식을 유지한다. 하늘 복귀마다 다시 컴파일하지 않는다.
      map: new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat),
    });
    this.groundMaterial.map!.needsUpdate = true;
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

  setPersonal(profile: HorizonArtwork & { sceneryEnabled: boolean }, invalidate: () => void): void {
    if (this.disposed) return;
    this.sceneryEnabled = profile.sceneryEnabled;
    const colors = HORIZON_GROUND_PALETTE[profile.ground];
    this.meadowUniforms.uGroundFar.value.set(colors[0]);
    this.meadowUniforms.uGroundNear.value.set(colors[1]);
    this.meadowUniforms.uGroundDetail.value.set(colors[2]);
    this.meadowUniforms.uGroundType.value = ['meadow', 'sand', 'stone', 'snow'].indexOf(
      profile.ground,
    );
    this.meadowUniforms.uSceneryHeight.value = HORIZON_ATLAS_DEPTH_DEG;
    const key = JSON.stringify([
      profile.slots,
      profile.sceneryScale,
      profile.backdrop,
      profile.ground,
    ]);
    if (this.atlasKey === key) {
      invalidate();
      return;
    }
    this.atlasKey = key;
    const generation = ++this.atlasGeneration;
    this.cancelPendingImage();
    const image = new Image();
    this.pendingImage = image;
    image.onload = () => {
      if (this.disposed || generation !== this.atlasGeneration) return;
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      const previous = this.groundMaterial.map;
      this.groundMaterial.map = texture;
      previous?.dispose();
      this.atlasReady = true;
      this.pendingImage = null;
      image.onload = null;
      image.onerror = null;
      invalidate();
    };
    image.onerror = () => {
      if (this.disposed || generation !== this.atlasGeneration) return;
      this.atlasReady = false;
      this.atlasKey = '';
      this.pendingImage = null;
      image.onload = null;
      image.onerror = null;
      invalidate();
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(horizonAtlasSvg(profile))}`;
    invalidate();
  }

  private cancelPendingImage(): void {
    if (!this.pendingImage) return;
    this.pendingImage.onload = null;
    this.pendingImage.onerror = null;
    this.pendingImage.src = '';
    this.pendingImage = null;
  }
  /** 풍경과 지면을 한 번만 합성한다. 별도 반투명 레이어가 겹쳐 짙어지는 현상을 막는다. */
  blendMeadowEdge(): void {
    const project = this.groundMaterial.onBeforeCompile.bind(this.groundMaterial);
    this.groundMaterial.onBeforeCompile = (shader, renderer) => {
      project(shader, renderer);
      Object.assign(shader.uniforms, this.meadowUniforms);
      shader.vertexShader = `varying vec3 vGroundDirection;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvGroundDirection = normalize(transformed);',
      );
      shader.fragmentShader = `
        uniform float uMeadowEnabled;
        uniform vec3 uMeadowTint;
        uniform float uSceneryEnabled;
        uniform float uSceneryHeight;
        uniform vec3 uGroundFar;
        uniform vec3 uGroundNear;
        uniform vec3 uGroundDetail;
        uniform float uGroundType;
        varying vec3 vGroundDirection;
        ${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
        // 실제 씬 방향으로 배치한다. UV 이음매·카메라 회전·입체 투영의 영향을 받지 않는다.
        vec3 groundDir = normalize(vGroundDirection);
        float belowDeg = degrees(asin(clamp(-groundDir.y, 0.0, 1.0)));
        float az = fract(atan(groundDir.x, -groundDir.z) / 6.28318530718 + 1.0);
        float groundBlend = smoothstep(0.0, 1.2, belowDeg)
          * (1.0 - smoothstep(22.0, 42.0, belowDeg)) * uMeadowEnabled;
        vec3 groundColor = mix(uGroundFar, uGroundNear, smoothstep(0.0, 28.0, belowDeg));
        // 세부 반복 무늬 대신 넓은 면과 색의 깊이로 가까운 잔디를 표현한다.
        groundColor *= 0.97 + 0.03 * sin(belowDeg * 0.55 + sin(az * 37.699));
        diffuseColor.rgb = mix(diffuseColor.rgb, groundColor * uMeadowTint, groundBlend);
        // 원경과 장식은 한 그림으로 합성하며 최고점도 -0.45° 아래다.
        float artY = (belowDeg - 0.45) / uSceneryHeight;
        vec4 decoration = texture2D(map, vec2(az, 1.0 - clamp(artY, 0.0, 1.0)));
        float artAlpha = decoration.a * step(0.0, artY) * step(artY, 1.0)
          * (1.0 - smoothstep(0.89, 1.0, artY)) * uSceneryEnabled * uMeadowEnabled;
        diffuseColor.rgb = mix(diffuseColor.rgb, decoration.rgb * uMeadowTint, artAlpha);
        diffuseColor.a *= mix(1.0, smoothstep(0.0, 0.35, belowDeg), uMeadowEnabled);
        // 봉우리 사이를 평평한 잔디 띠로 메우지 않는다. 원경 실루엣 뒤에는 하늘이 보인다.
        float sceneryCoverage = max(decoration.a, smoothstep(12.0, 15.0, belowDeg));
        diffuseColor.a *= mix(1.0, sceneryCoverage, uSceneryEnabled * uMeadowEnabled);
        #endif
      `,
      );
    };
    this.groundMaterial.customProgramCacheKey = () => 'skylog-stereographic-horizon-garden-v3';
  }
  setMeadow(enabled: boolean, night: boolean, sunAltitude: number): void {
    this.meadowUniforms.uMeadowEnabled.value = enabled ? 1 : 0;
    this.meadowUniforms.uSceneryEnabled.value = this.sceneryEnabled && this.atlasReady ? 1 : 0;
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
    this.atlasGeneration++;
    this.cancelPendingImage();
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
