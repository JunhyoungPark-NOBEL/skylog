import * as THREE from 'three';
import { bodyState, type BodyKey, type BodyState } from '@/astro/bodies';
import { altAzToScene, type Vec3 } from '@/astro/coords';
import type { ObserverLike } from '@/astro/frames';
import type { DateLike } from '@/astro/time';
import { BODY_DISTANCE, luminaryDiscSize, SUN_DISC_FRACTION } from '@/render/bodySize';
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
  /** 기기 픽셀 지름 — 달은 구 본체, 태양·행성은 글로우를 포함한 스프라이트. 라벨·hit-test 공용. */
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
  private limitingMag = 99;
  private viewDirection: Vec3 | null = null;

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
        uSunDiscFraction: { value: SUN_DISC_FRACTION },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 35;
    this.group.add(this.points);

    this.moonMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#d8d8d8'),
      // 별·선과 같은 렌더 큐에서 순서36으로 그린다. 색은 완전 불투명해 뒤의 별을 가린다.
      transparent: true,
      opacity: 1,
    });
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
    this.limitingMag = limitingMag;
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const color = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const kind = this.geometry.getAttribute('aKind') as THREE.BufferAttribute;
    const tilt = this.geometry.getAttribute('aRingTilt') as THREE.BufferAttribute;
    const placements: BodyPlacement[] = [];
    const c = new THREE.Color();
    let sunDir: Vec3 = [0, -1, 0];

    BODY_KEYS.forEach((key, i) => {
      const s = bodyState(key, date, observer);
      const dir = altAzToScene(s.altDeg, s.azDeg);
      pos.setXYZ(i, dir[0], dir[1], dir[2]);
      c.set(BODY_COLOR[key]);
      color.setXYZ(i, c.r, c.g, c.b);
      kind.setX(
        i,
        key === 'sun' ? 1 : key === 'saturn' ? 2 : key === 'jupiter' ? 3 : key === 'mars' ? 4 : 0,
      );
      tilt.setX(i, key === 'saturn' ? Math.abs(s.ringTiltDeg ?? 15) : 0);
      placements.push({ key, state: s, dir, sizePx: 0 });
      if (key === 'sun') sunDir = dir;

      if (key === 'moon') {
        this.moon.position.set(
          dir[0] * BODY_DISTANCE,
          dir[1] * BODY_DISTANCE,
          dir[2] * BODY_DISTANCE,
        );
        this.moon.visible = s.altDeg > -3;
      }
    });
    pos.needsUpdate = true;
    color.needsUpdate = true;
    kind.needsUpdate = true;
    tilt.needsUpdate = true;
    this.sunLight.position.set(sunDir[0] * 1000, sunDir[1] * 1000, sunDir[2] * 1000);
    this.placements = placements;
    this.updateViewScale(degPerPixel, pixelRatio, magnify);
  }

  /** 줌·회전·화면 크기·확대 옵션 변경은 천문 계산 없이 캐시된 천체의 크기만 갱신한다. */
  updateViewScale(
    degreesPerPixel: number,
    pixelRatio: number,
    magnify: boolean,
    viewDirection?: Vec3,
  ): void {
    if (viewDirection) this.viewDirection = viewDirection;
    const size = this.geometry.getAttribute('aSizePx') as THREE.BufferAttribute;
    this.placements.forEach((placement, i) => {
      const { key, state, dir } = placement;
      if (key === 'moon' || key === 'sun') {
        const facing = this.viewDirection
          ? dir[0] * this.viewDirection[0] +
            dir[1] * this.viewDirection[1] +
            dir[2] * this.viewDirection[2]
          : 1;
        const disc = luminaryDiscSize(
          state.angularDiameterArcsec,
          degreesPerPixel,
          magnify,
          facing,
        );
        if (key === 'moon') {
          this.moon.scale.setScalar(disc.meshRadius);
          placement.sizePx = disc.diameterCss * pixelRatio;
          size.setX(i, 0); // 달은 위상 조명을 받는 구 메시만 그린다.
        } else {
          placement.sizePx = (disc.diameterCss / SUN_DISC_FRACTION) * pixelRatio;
          size.setX(i, placement.sizePx);
        }
      } else {
        const angularPx =
          ((state.angularDiameterArcsec / 3600) * (magnify ? 3 : 1)) /
          Math.max(degreesPerPixel, 1e-6);
        const magSize = Math.min(18, 4.5 * Math.pow(10, -0.2 * state.magnitude));
        placement.sizePx =
          state.magnitude > this.limitingMag
            ? 0
            : Math.min(400, Math.max(7, magSize, angularPx) * (magnify ? 2 : 1)) * pixelRatio;
        size.setX(i, placement.sizePx);
      }
    });
    size.needsUpdate = true;
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
