import * as THREE from 'three';
import { dataUrl } from '@/catalog/manifest';
import mwFrag from '@/render/shaders/milkyway.frag.glsl?raw';
import mwVert from '@/render/shaders/milkyway.vert.glsl?raw';
import refractionGlsl from '@/render/shaders/refraction.glsl?raw';

/** 지도 모드에서는 시간과 관계없이 표시, 대기가 켜지면 박명에 따라 자연스럽게 사라진다. */
export function milkyWayOpacity(alpha: number, sunAltDeg: number, atmosphere: boolean): number {
  const strength = Math.max(0, Math.min(1, alpha));
  if (!atmosphere) return strength;
  const t = Math.max(0, Math.min(1, (sunAltDeg + 18) / 12));
  return strength * (1 - t * t * (3 - 2 * t));
}

/** 은하수: 빌드 시 mw.json에서 만든 등적색 텍스처(public/data/milkyway.v1.png)를 J2000 구에 입힌다(D-017). */
export class MilkyWayLayer {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private texture: THREE.Texture | null = null;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: `${refractionGlsl}\n${mwVert}`,
      fragmentShader: mwFrag,
      uniforms: {
        uEqjToScene: { value: new THREE.Matrix3() },
        uRefraction: { value: 1 },
        uMap: { value: null },
        uColor: { value: new THREE.Color('#6f7fb0') },
        uAlpha: { value: 0.6 },
        uNight: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(130, 96, 48), this.material);
    this.mesh.renderOrder = 10;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** 텍스처 로드(한 번). 로드 전에는 그리지 않는다. */
  async load(): Promise<void> {
    if (this.texture) return;
    const tex = await new THREE.TextureLoader().loadAsync(dataUrl('milkyway.v1.png'));
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    this.texture = tex;
    this.material.uniforms['uMap']!.value = tex;
    this.mesh.visible = true;
  }

  get loaded(): boolean {
    return this.texture !== null;
  }

  setMatrix(m: Float32Array): void {
    (this.material.uniforms['uEqjToScene']!.value as THREE.Matrix3).fromArray(m);
  }

  setStyle(color: string, alpha: number, refraction: boolean, night = false): void {
    (this.material.uniforms['uColor']!.value as THREE.Color).set(color);
    this.material.uniforms['uAlpha']!.value = alpha;
    this.material.uniforms['uRefraction']!.value = refraction ? 1 : 0;
    this.material.uniforms['uNight']!.value = night ? 1 : 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture?.dispose();
  }
}
