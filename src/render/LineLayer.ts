import * as THREE from 'three';
import type { Vec3 } from '@/astro/coords';
import { polylineToSegments } from '@/render/greatCircle';
import lineFrag from '@/render/shaders/line.frag.glsl?raw';
import lineVert from '@/render/shaders/line.vert.glsl?raw';
import refractionGlsl from '@/render/shaders/refraction.glsl?raw';

export interface LineLayerOptions {
  /** true: 정점이 J2000 → 프레임마다 행렬 적용. false: 씬 프레임 고정(고도-방위 격자 등) */
  useMatrix: boolean;
  refraction: boolean;
  dashDeg?: number;
  fadeBelowHorizon?: boolean;
  renderOrder?: number;
}

/**
 * 공용 선 레이어: 폴리라인 목록을 LineSegments 하나로 합친다(draw call 1개).
 * 별자리 선·경계, 천구 적도·황도, 자오선, 고도-방위 격자에 재사용.
 */
export class LineLayer {
  readonly object: THREE.LineSegments;
  private readonly material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;

  constructor(opts: LineLayerOptions) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: `${refractionGlsl}\n${lineVert}`,
      fragmentShader: lineFrag,
      uniforms: {
        uEqjToScene: { value: new THREE.Matrix3() },
        uUseMatrix: { value: opts.useMatrix ? 1 : 0 },
        uRefraction: { value: opts.refraction ? 1 : 0 },
        uColor: { value: new THREE.Color('#4f7fbf') },
        uAlpha: { value: 0.35 },
        uDashDeg: { value: opts.dashDeg ?? 0 },
        uFadeBelowHorizon: { value: opts.fadeBelowHorizon === false ? 0 : 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.geometry = new THREE.BufferGeometry();
    this.object = new THREE.LineSegments(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.object.renderOrder = opts.renderOrder ?? 30;
  }

  /** 폴리라인들을 세그먼트로 올린다. */
  setPolylines(polylines: Vec3[][]): void {
    const positions: number[] = [];
    const dists: number[] = [];
    for (const pl of polylines) polylineToSegments(pl, positions, dists, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('aDist', new THREE.Float32BufferAttribute(dists, 1));
    const old = this.geometry;
    this.geometry = g;
    this.object.geometry = g;
    old.dispose();
  }

  setMatrix(m: Float32Array): void {
    (this.material.uniforms['uEqjToScene']!.value as THREE.Matrix3).fromArray(m);
  }

  setStyle(color: string, alpha: number): void {
    (this.material.uniforms['uColor']!.value as THREE.Color).set(color);
    this.material.uniforms['uAlpha']!.value = alpha;
  }

  setRefraction(on: boolean): void {
    this.material.uniforms['uRefraction']!.value = on ? 1 : 0;
  }

  set visible(v: boolean) {
    this.object.visible = v;
  }
  get visible(): boolean {
    return this.object.visible;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
