import * as THREE from 'three';
import { bodyState, type BodyKey, type BodyState } from '@/astro/bodies';
import { altAzToScene, type Vec3 } from '@/astro/coords';
import type { ObserverLike } from '@/astro/frames';
import type { DateLike } from '@/astro/time';
import bodyFrag from '@/render/shaders/body.frag.glsl?raw';
import bodyVert from '@/render/shaders/body.vert.glsl?raw';

export const BODY_KEYS: BodyKey[] = [
  'sun',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'moon',
];

const BODY_COLOR: Record<BodyKey, string> = {
  sun: '#fff4d6',
  moon: '#e8e8e8',
  mercury: '#c9c2b8',
  venus: '#fff2cc',
  mars: '#ff8a5c',
  jupiter: '#f4dcb0',
  saturn: '#f2e2a8',
  uranus: '#9ee8e8',
  neptune: '#6f8cff',
};

export interface BodyPlacement {
  key: BodyKey;
  state: BodyState;
  /** 씬 방향(굴절 포함 겉보기) */
  dir: Vec3;
  /** 화면 크기(px) — 라벨·hit-test용 */
  sizePx: number;
}

/**
 * 행성·태양(스프라이트) + 달(구 + 태양 방향 조명 → 위상 자동). 위치는 CPU(bodies.ts)에서 굴절 포함 alt/az.
 */
export class BodyLayer {
  readonly group = new THREE.Group();
  readonly points: THREE.Points;
  readonly moon: THREE.Mesh;
  readonly sunLight: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly moonMaterial: THREE.MeshLambertMaterial;
  placements: BodyPlacement[] = [];
  private magnify = 1;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    const n = BODY_KEYS.length;
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.geometry.setAttribute('aSizePx', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.geometry.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.geometry.setAttribute('aRingTilt', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: bodyVert,
      fragmentShader: bodyFrag,
      uniforms: {
        uShowBelowHorizon: { value: 1 },
        uNight: { value: 0 },
        uNightColor: { value: new THREE.Color('#ff3b30') },
        uPixelRatio: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 35;
    this.group.add(this.points);

    this.moonMaterial = new THREE.MeshLambertMaterial({ color: new THREE.Color('#d8d8d8') });
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.moonMaterial);
    this.moon.renderOrder = 36;
    this.moon.frustumCulled = false;
    this.group.add(this.moon);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.08); // 지구조
    this.group.add(this.sunLight, this.ambient);
  }

  /**
   * 시각·관측지로 9개 천체를 다시 배치한다(1초 또는 시간 변경 시).
   * degPerPixel: 각지름을 픽셀로 바꾸는 데 사용. pixelRatio: 기기 픽셀비.
   */
  update(
    date: DateLike,
    observer: ObserverLike,
    degPerPixel: number,
    pixelRatio: number,
    magnify: boolean,
    /** 하늘 밝기를 반영한 한계등급 — 이보다 어두운 행성은 낮에 숨긴다 */
    limitingMag = 99,
  ): void {
    this.magnify = magnify ? 3 : 1;
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const size = this.geometry.getAttribute('aSizePx') as THREE.BufferAttribute;
    const color = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const kind = this.geometry.getAttribute('aKind') as THREE.BufferAttribute;
    const tilt = this.geometry.getAttribute('aRingTilt') as THREE.BufferAttribute;
    const placements: BodyPlacement[] = [];
    const c = new THREE.Color();
    let sunDir: Vec3 = [0, -1, 0];

    BODY_KEYS.forEach((key, i) => {
      const s = bodyState(key, date, observer);
      const dir = altAzToScene(s.altDeg, s.azDeg);
      const angDeg = (s.angularDiameterArcsec / 3600) * this.magnify;
      const angPx = angDeg / Math.max(degPerPixel, 1e-6);
      // 등급 기반 크기(별과 같은 규칙, 상한 18px) + 최소 크기 보장(행성은 항상 찾기 쉽게)
      const magSize = Math.min(18, 4.5 * Math.pow(10, -0.2 * s.magnitude));
      let sizePx: number;
      if (key === 'moon')
        sizePx = 0; // 달은 구 메시
      else if (key === 'sun')
        sizePx = Math.max(22, angPx * 2.2) * pixelRatio; // 원반 + 글로우
      else sizePx = Math.max(7, magSize, angPx) * pixelRatio;
      // 낮에는 한계등급보다 어두운 행성을 숨긴다(태양·달은 항상)
      if (key !== 'sun' && key !== 'moon' && s.magnitude > limitingMag) sizePx = 0;
      sizePx = Math.min(sizePx, 400 * pixelRatio);

      pos.setXYZ(i, dir[0], dir[1], dir[2]);
      size.setX(i, sizePx);
      c.set(BODY_COLOR[key]);
      color.setXYZ(i, c.r, c.g, c.b);
      kind.setX(i, key === 'sun' ? 1 : key === 'saturn' ? 2 : 0);
      tilt.setX(i, key === 'saturn' ? Math.abs(s.ringTiltDeg ?? 15) : 0);
      placements.push({ key, state: s, dir, sizePx: key === 'moon' ? angPx * pixelRatio : sizePx });
      if (key === 'sun') sunDir = dir;

      if (key === 'moon') {
        const radius = 98 * Math.tan((angDeg / 2) * (Math.PI / 180));
        this.moon.position.set(dir[0] * 98, dir[1] * 98, dir[2] * 98);
        this.moon.scale.setScalar(Math.max(radius, 0.05));
        this.moon.visible = s.altDeg > -3;
      }
    });
    pos.needsUpdate = true;
    size.needsUpdate = true;
    color.needsUpdate = true;
    kind.needsUpdate = true;
    tilt.needsUpdate = true;
    this.sunLight.position.set(sunDir[0] * 1000, sunDir[1] * 1000, sunDir[2] * 1000);
    this.placements = placements;
  }

  get sunPlacement(): BodyPlacement | undefined {
    return this.placements.find((p) => p.key === 'sun');
  }

  setShowBelowHorizon(show: boolean): void {
    this.material.uniforms['uShowBelowHorizon']!.value = show ? 1 : 0;
    const moon = this.placements.find((p) => p.key === 'moon');
    this.moon.visible = !!moon && (show || moon.state.altDeg >= 0);
  }

  setStyle(night: boolean, nightColor: string, moonColor: string, pixelRatio: number): void {
    this.material.uniforms['uNight']!.value = night ? 1 : 0;
    (this.material.uniforms['uNightColor']!.value as THREE.Color).set(nightColor);
    this.material.uniforms['uPixelRatio']!.value = pixelRatio;
    this.moonMaterial.color.set(night ? nightColor : moonColor);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.moon.geometry.dispose();
    this.moonMaterial.dispose();
  }
}
