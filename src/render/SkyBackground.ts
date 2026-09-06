import * as THREE from 'three';
import skyFrag from '@/render/shaders/sky.frag.glsl?raw';
import skyVert from '@/render/shaders/sky.vert.glsl?raw';

/** 하늘 배경 구(R=150, 안쪽). 태양 고도로 낮/박명/밤 색을 만든다(task-01 §3.6). */
export class SkyBackground {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      uniforms: {
        uBaseColor: { value: new THREE.Color('#05070d') },
        uSunDir: { value: new THREE.Vector3(0, -1, 0) },
        uSunAltDeg: { value: -30 },
        uAtmosphere: { value: 1 },
        uNight: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 24), this.material);
    this.mesh.renderOrder = 0;
    this.mesh.frustumCulled = false;
  }

  setSun(dir: [number, number, number], altDeg: number): void {
    (this.material.uniforms['uSunDir']!.value as THREE.Vector3).set(dir[0], dir[1], dir[2]);
    this.material.uniforms['uSunAltDeg']!.value = altDeg;
  }

  setStyle(baseColor: string, atmosphere: boolean, night: boolean): void {
    (this.material.uniforms['uBaseColor']!.value as THREE.Color).set(baseColor);
    this.material.uniforms['uAtmosphere']!.value = atmosphere ? 1 : 0;
    this.material.uniforms['uNight']!.value = night ? 1 : 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/** 태양 고도에 따른 하늘 밝기 → 한계등급 감소(별 숨김). 완전 어둠 0, 낮 ≈ 12등급. */
export function skyBrightnessPenaltyMag(sunAltDeg: number): number {
  if (sunAltDeg <= -18) return 0;
  if (sunAltDeg <= -12) return ((sunAltDeg + 18) / 6) * 1.5; // 천문박명 0→1.5
  if (sunAltDeg <= -6) return 1.5 + ((sunAltDeg + 12) / 6) * 3.0; // 항해박명 →4.5
  if (sunAltDeg <= 0) return 4.5 + ((sunAltDeg + 6) / 6) * 6.0; // 시민박명 →10.5
  return 10.5 + Math.min(sunAltDeg, 10) * 0.3;
}
