import * as THREE from 'three';
import type { Catalog, DsoCategory } from '@/catalog/catalog';
import dsoFrag from '@/render/shaders/dso.frag.glsl?raw';
import dsoVert from '@/render/shaders/dso.vert.glsl?raw';
import refractionGlsl from '@/render/shaders/refraction.glsl?raw';

const CAT_INDEX: Record<DsoCategory, number> = {
  galaxy: 0,
  openCluster: 1,
  globularCluster: 2,
  planetaryNebula: 3,
  nebula: 4,
  supernovaRemnant: 5,
  other: 6,
};

/** FOV(짧은 변)에 따른 표시 등급 한계 — 메시에는 FOV ≤ 60°에서 전부, 그 밖은 밝은 것만 */
export function dsoMagLimits(fovDeg: number): { other: number; messier: number } {
  if (fovDeg > 60) return { other: -1, messier: 5.0 };
  if (fovDeg > 30) return { other: 6.5, messier: 99 };
  if (fovDeg > 15) return { other: 8.5, messier: 99 };
  if (fovDeg > 6) return { other: 10.5, messier: 99 };
  return { other: 99, messier: 99 };
}

/** DSO 심볼 레이어(카테고리별 기호). 한 draw call. */
export class DsoLayer {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private geometry = new THREE.BufferGeometry();

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: `${refractionGlsl}\n${dsoVert}`,
      fragmentShader: dsoFrag,
      uniforms: {
        uEqjToScene: { value: new THREE.Matrix3() },
        uShowBelowHorizon: { value: 1 },
        uRefraction: { value: 1 },
        uPixelRatio: { value: 1 },
        uDegPerPixel: { value: 0.1 },
        uMagLimit: { value: -1 },
        uMessierLimit: { value: 6 },
        uColor: { value: new THREE.Color('#c8d0e0') },
        uAlpha: { value: 0.8 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 22;
  }

  setCatalog(cat: Catalog): void {
    const n = cat.dso.length;
    const catAttr = new Float32Array(n);
    const mag = new Float32Array(n);
    const size = new Float32Array(n);
    const messier = new Float32Array(n);
    cat.dso.forEach((d, i) => {
      catAttr[i] = CAT_INDEX[d.category];
      mag[i] = d.mag ?? d.magB ?? (d.messier !== undefined ? 8 : 999);
      size[i] = d.majAxArcmin ?? 5;
      messier[i] = d.messier !== undefined ? 1 : 0;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(cat.dsoVectors, 3));
    g.setAttribute('aCat', new THREE.BufferAttribute(catAttr, 1));
    g.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
    g.setAttribute('aSizeArcmin', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aMessier', new THREE.BufferAttribute(messier, 1));
    const old = this.geometry;
    this.geometry = g;
    this.points.geometry = g;
    old.dispose();
  }

  setMatrix(m: Float32Array): void {
    (this.material.uniforms['uEqjToScene']!.value as THREE.Matrix3).fromArray(m);
  }

  setParams(
    fovDeg: number,
    degPerPixel: number,
    pixelRatio: number,
    color: string,
    alpha: number,
    refraction: boolean,
    showBelowHorizon = false,
  ): void {
    const u = this.material.uniforms;
    const lim = dsoMagLimits(fovDeg);
    u['uMagLimit']!.value = lim.other;
    u['uMessierLimit']!.value = lim.messier;
    u['uDegPerPixel']!.value = degPerPixel;
    u['uPixelRatio']!.value = pixelRatio;
    (u['uColor']!.value as THREE.Color).set(color);
    u['uAlpha']!.value = alpha;
    u['uShowBelowHorizon']!.value = showBelowHorizon ? 1 : 0;
    u['uRefraction']!.value = refraction ? 1 : 0;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
