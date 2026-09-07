import * as THREE from 'three';
import type { StarPack } from '@/catalog/starPackFormat';
import commonGlsl from '@/render/shaders/common.glsl?raw';
import refractionGlsl from '@/render/shaders/refraction.glsl?raw';
import starFrag from '@/render/shaders/star.frag.glsl?raw';
import starVert from '@/render/shaders/star.vert.glsl?raw';
import type { RenderPalette } from '@/render/palette';

export interface StarLayerParams {
  fovDeg: number;
  pixelRatio: number;
  limitingMag: number;
  saturation: number;
  extinction: boolean;
  showBelowHorizon?: boolean;
  night: boolean;
  alpha: number;
}

/**
 * 별 레이어 (task-01 §3.2). THREE.Points + 커스텀 셰이더. 별 좌표는 J2000 단위벡터 버퍼 그대로,
 * 프레임당 `uEqjToScene` 행렬 하나만 갱신한다. 팩 교체(bright → deep)는 geometry 교체로 끊김 없이.
 */
export class StarLayer {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;
  private packName = '';

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: `${refractionGlsl}\n${commonGlsl}\n${starVert}`,
      fragmentShader: `${commonGlsl}\n${starFrag}`,
      uniforms: {
        uEqjToScene: { value: new THREE.Matrix3() },
        uPixelRatio: { value: 1 },
        uFovDeg: { value: 90 },
        uLimitingMag: { value: 6.5 },
        uShowBelowHorizon: { value: 1 },
        uExtinction: { value: 1 },
        uRefraction: { value: 1 },
        uMinSizePx: { value: 1.2 },
        uMaxSizePx: { value: 18 },
        uSizeScale: { value: 4.5 },
        uSaturation: { value: 0.8 },
        uNight: { value: 0 },
        uNightColor: { value: new THREE.Color('#ff3b30') },
        uGlobalAlpha: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.geometry = new THREE.BufferGeometry();
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
  }

  /** 팩을 올린다. 같은 팩이면 무시. */
  setPack(name: string, pack: StarPack): void {
    if (this.packName === name) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pack.positions, 3));
    geometry.setAttribute('aMag', new THREE.BufferAttribute(pack.mag, 1));
    geometry.setAttribute('aBv', new THREE.BufferAttribute(pack.bv, 1));
    const old = this.geometry;
    this.geometry = geometry;
    this.points.geometry = geometry;
    old.dispose();
    this.packName = name;
  }

  get currentPack(): string {
    return this.packName;
  }

  get count(): number {
    return this.geometry.getAttribute('position')?.count ?? 0;
  }

  setMatrix(m: Float32Array): void {
    (this.material.uniforms['uEqjToScene']!.value as THREE.Matrix3).fromArray(m);
  }

  setParams(p: StarLayerParams, palette: RenderPalette): void {
    const u = this.material.uniforms;
    u['uFovDeg']!.value = p.fovDeg;
    u['uPixelRatio']!.value = p.pixelRatio;
    u['uLimitingMag']!.value = p.limitingMag;
    u['uSaturation']!.value = p.saturation;
    u['uShowBelowHorizon']!.value = p.showBelowHorizon ? 1 : 0;
    u['uExtinction']!.value = p.extinction ? 1 : 0;
    u['uNight']!.value = p.night ? 1 : 0;
    (u['uNightColor']!.value as THREE.Color).set(palette.star);
    u['uGlobalAlpha']!.value = p.alpha;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
