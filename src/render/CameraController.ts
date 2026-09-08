/**
 * alt/az 기반 카메라 컨트롤러 (task-01 §3.5). OrbitControls를 쓰지 않는다(천구 안쪽에서 보는 모델).
 * - 상태: centerAlt, centerAz, fovDeg(짧은 변 기준). 외부 진실 원천은 viewStore이지만 루프 안에서는 ref로 다룬다.
 * - 드래그(마우스/터치) alt/az 이동, 핀치/휠 FOV, 더블탭 확대, 짧은 관성, flyTo 애니메이션.
 * - T2 훅: setOrientationQuaternion(q) — 센서 목표를 받고 렌더 프레임에서 자세를 보간한다.
 */
import * as THREE from 'three';
import { RenderPose } from '@/sensors/orientation/renderPose';
import { altAzToScene, clamp, sceneToAltAz, wrap360, type Vec3 } from '@/astro/coords';
import {
  clampFov,
  degPerPixel,
  isInsideSkyDisk,
  stereographicProject,
  stereographicUnproject,
  verticalFovDeg,
  zoomFov,
} from '@/render/projection';

export interface ViewState {
  altDeg: number;
  azDeg: number;
  fovDeg: number;
}

export const ALT_LIMIT_DEG = 89.5;

const FORWARD = new THREE.Vector3(0, 0, -1);
const UP = new THREE.Vector3(0, 1, 0);

/** alt/az → 카메라 쿼터니언(롤 0, up = 천정). 씬 프레임 +X 동 +Y 천정 +Z 남. */
export function altAzToQuaternion(altDeg: number, azDeg: number): THREE.Quaternion {
  const dir = altAzToScene(clamp(altDeg, -ALT_LIMIT_DEG, ALT_LIMIT_DEG), azDeg);
  const m = new THREE.Matrix4().lookAt(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(dir[0], dir[1], dir[2]),
    UP,
  );
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/** 카메라 쿼터니언 → 시선 방향의 alt/az (센서 입력 변환에 사용) */
export function quaternionToAltAz(q: THREE.Quaternion): { altDeg: number; azDeg: number } {
  const f = FORWARD.clone().applyQuaternion(q);
  return sceneToAltAz([f.x, f.y, f.z]);
}

interface Pointer {
  id: number;
  x: number;
  y: number;
}

interface FlyAnimation {
  from: Vec3;
  to: Vec3;
  fovFrom: number;
  fovTo: number;
  start: number;
  duration: number;
}

export interface CameraControllerOptions {
  onChange(view: ViewState): void;
  /** 더블탭 등 포인터 → 화면 픽셀을 방향으로 바꿀 때 필요 */
  getSize(): { width: number; height: number };
}

export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  private view: ViewState = { altDeg: 45, azDeg: 180, fovDeg: 90 };
  private pointers: Pointer[] = [];
  private lastPinchDist = 0;
  private velocity = { alt: 0, az: 0 };
  private lastMoveTime = 0;
  private lastTapTime = 0;
  private lastTapPos = { x: 0, y: 0 };
  private fly: FlyAnimation | null = null;
  private dragging = false;
  private element: HTMLElement | null = null;
  private readonly opts: CameraControllerOptions;

  constructor(opts: CameraControllerOptions) {
    this.opts = opts;
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(0, 0, 0);
  }

  getView(): ViewState {
    return { ...this.view };
  }

  setView(v: Partial<ViewState>, notify = true): void {
    if (v.altDeg !== undefined) this.view.altDeg = clamp(v.altDeg, -ALT_LIMIT_DEG, ALT_LIMIT_DEG);
    if (v.azDeg !== undefined) this.view.azDeg = wrap360(v.azDeg);
    if (v.fovDeg !== undefined) this.view.fovDeg = clampFov(v.fovDeg);
    if (notify) this.opts.onChange(this.getView());
  }

  /** T2 센서 모드 진입점: 기기 방향 쿼터니언(씬 프레임 기준) → alt/az (롤 무시) */
  setOrientationQuaternion(q: THREE.Quaternion): void {
    this.setSensorQuaternion(q, true);
  }

  private sensorQuat: THREE.Quaternion | null = null;
  private sensorKeepLevel = false;
  private readonly sensorPose = new RenderPose();
  private lastSensorNotifyMs = -Infinity;

  /**
   * 센서 자세를 카메라에 적용. keepLevel=false면 롤(기기 기울기)도 그대로 화면에 반영(실제 AR처럼),
   * true면 alt/az만 쓰고 수평을 유지한다. null이면 센서 모드 해제(드래그가 다시 카메라를 움직인다).
   */
  setSensorQuaternion(
    q: THREE.Quaternion | null,
    keepLevel = false,
    nowMs = performance.now(),
  ): void {
    if (!q) {
      const wasActive = this.sensorPose.active;
      this.sensorPose.reset();
      this.sensorQuat = null;
      this.lastSensorNotifyMs = -Infinity;
      if (wasActive) this.opts.onChange(this.getView());
      return;
    }
    this.fly = null;
    this.velocity = { alt: 0, az: 0 };
    this.sensorKeepLevel = keepLevel;
    const target = keepLevel
      ? (() => {
          const { altDeg, azDeg } = quaternionToAltAz(q);
          return altAzToQuaternion(altDeg, azDeg);
        })()
      : q;
    if (this.sensorPose.push(target, nowMs)) this.applySensorPose(nowMs, true);
  }

  private applySensorPose(nowMs: number, immediate = false): boolean {
    const q = this.sensorPose.sample(nowMs);
    if (!q) return false;
    const { altDeg, azDeg } = quaternionToAltAz(q);
    const rendered = this.sensorKeepLevel ? altAzToQuaternion(altDeg, azDeg) : q;
    if (!immediate && this.sensorQuat && 1 - Math.abs(rendered.dot(this.sensorQuat)) < 1e-12)
      return false;
    (this.sensorQuat ??= new THREE.Quaternion()).copy(rendered);
    this.view.altDeg = clamp(altDeg, -ALT_LIMIT_DEG, ALT_LIMIT_DEG);
    this.view.azDeg = wrap360(azDeg);
    // 카메라/히트 테스트는 매 프레임 최신값을 쓰고 React 상태 알림은 최대 10Hz + 마지막 도착이다.
    if (immediate || nowMs - this.lastSensorNotifyMs >= 100 || !this.sensorPose.isMoving(nowMs)) {
      this.lastSensorNotifyMs = nowMs;
      this.opts.onChange(this.getView());
    }
    return true;
  }

  get hasSensorQuaternion(): boolean {
    return this.sensorQuat !== null;
  }

  /**
   * 드래그를 가로채는 핸들러(보정 마법사의 미세 조정). 설정되면 드래그가 카메라를 움직이지 않고
   * (Δaz, Δalt)(도)를 핸들러에 넘긴다.
   */
  dragHandler: ((dAzDeg: number, dAltDeg: number) => void) | null = null;
  /** 드래그 시작 알림(센서 모드 일시 정지용) */
  onDragStart: (() => void) | null = null;

  /** 카메라 파라미터를 현재 상태로 갱신(프레임마다 호출). */
  applyToCamera(width: number, height: number): void {
    const cam = this.camera;
    cam.aspect = width / Math.max(1, height);
    // 실제 투영은 CPU/셰이더 입체 투영이 담당한다. 내부 원근 행렬은 안전한90°로 고정한다.
    cam.fov = verticalFovDeg(90, width, height);
    if (this.sensorQuat) cam.quaternion.copy(this.sensorQuat);
    else cam.quaternion.copy(altAzToQuaternion(this.view.altDeg, this.view.azDeg));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  /** 화면 픽셀 → 씬 방향(단위벡터). 좌상단 원점. */
  pixelToDirection(x: number, y: number, width: number, height: number): Vec3 {
    const v = new THREE.Vector3(...stereographicUnproject(x, y, this.view.fovDeg, width, height));
    v.applyQuaternion(this.camera.quaternion);
    return [v.x, v.y, v.z];
  }

  /** 씬 방향 → 화면 픽셀. 카메라 뒤면 null. */
  directionToPixel(dir: Vec3, width: number, height: number): { x: number; y: number } | null {
    const v = new THREE.Vector3(...dir).applyMatrix4(this.camera.matrixWorldInverse);
    return stereographicProject([v.x, v.y, v.z], this.view.fovDeg, width, height);
  }

  /** 부드럽게 이동(300~600ms). 렌더 루프가 update()를 호출해야 진행된다. */
  flyTo(target: { altDeg: number; azDeg: number; fovDeg?: number }, durationMs = 450): void {
    const from = altAzToScene(this.view.altDeg, this.view.azDeg);
    const to = altAzToScene(clamp(target.altDeg, -ALT_LIMIT_DEG, ALT_LIMIT_DEG), target.azDeg);
    this.velocity = { alt: 0, az: 0 };
    this.fly = {
      from,
      to,
      fovFrom: this.view.fovDeg,
      fovTo: clampFov(target.fovDeg ?? this.view.fovDeg),
      start: performance.now(),
      duration: durationMs,
    };
  }

  isAnimating(): boolean {
    return (
      this.sensorPose.isMoving(performance.now()) ||
      this.fly !== null ||
      Math.hypot(this.velocity.alt, this.velocity.az) > 0.02
    );
  }

  /** 애니메이션·관성 진행. 변경이 있으면 true. */
  update(nowMs: number, dtMs: number): boolean {
    if (this.sensorPose.active) return this.applySensorPose(nowMs);
    if (this.fly) {
      const f = this.fly;
      const t = clamp((nowMs - f.start) / f.duration, 0, 1);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const a = new THREE.Vector3(...f.from);
      const b = new THREE.Vector3(...f.to);
      const omega = a.angleTo(b);
      let dir: THREE.Vector3;
      if (omega < 1e-6) dir = b;
      else {
        const s = Math.sin(omega);
        dir = a
          .multiplyScalar(Math.sin((1 - e) * omega) / s)
          .add(b.multiplyScalar(Math.sin(e * omega) / s));
      }
      const { altDeg, azDeg } = sceneToAltAz([dir.x, dir.y, dir.z]);
      this.view = {
        altDeg: clamp(altDeg, -ALT_LIMIT_DEG, ALT_LIMIT_DEG),
        azDeg,
        fovDeg: f.fovFrom + (f.fovTo - f.fovFrom) * e,
      };
      if (t >= 1) this.fly = null;
      this.opts.onChange(this.getView());
      return true;
    }
    if (!this.dragging && Math.hypot(this.velocity.alt, this.velocity.az) > 0.02) {
      const decay = Math.pow(0.004, dtMs / 1000); // ~0.5초 안에 소멸
      this.view.altDeg = clamp(
        this.view.altDeg + this.velocity.alt * dtMs,
        -ALT_LIMIT_DEG,
        ALT_LIMIT_DEG,
      );
      this.view.azDeg = wrap360(this.view.azDeg + this.velocity.az * dtMs);
      this.velocity.alt *= decay;
      this.velocity.az *= decay;
      this.opts.onChange(this.getView());
      return true;
    }
    return false;
  }

  // ---- 포인터 입력 ----

  attach(element: HTMLElement): void {
    this.element = element;
    element.style.touchAction = 'none';
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('wheel', this.onWheel, { passive: false });
  }

  detach(): void {
    const el = this.element;
    if (!el) return;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('wheel', this.onWheel);
    this.element = null;
  }

  /** 마지막 포인터업이 "탭"(이동 없음)이었는지 — 선택(hit-test)에 사용 */
  onTap: ((x: number, y: number) => void) | null = null;
  private downPos = { x: 0, y: 0 };
  private moved = false;

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.element?.setPointerCapture(e.pointerId);
    this.pointers.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
    this.fly = null;
    this.velocity = { alt: 0, az: 0 };
    this.dragging = true;
    this.moved = false;
    this.downPos = { x: e.clientX, y: e.clientY };
    this.onDragStart?.();
    if (this.pointers.length === 2) {
      const [a, b] = this.pointers as [Pointer, Pointer];
      this.lastPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const p = this.pointers.find((q) => q.id === e.pointerId);
    if (!p) return;
    const { width, height } = this.opts.getSize();
    const dpp = degPerPixel(this.view.fovDeg, width, height);
    if (this.pointers.length === 1) {
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y) > 6) this.moved = true;
      // 손가락 아래 하늘이 따라오도록: 오른쪽으로 끌면 방위 감소, 아래로 끌면 고도 증가
      const cosAlt = Math.max(0.2, Math.cos((this.view.altDeg * Math.PI) / 180));
      const dAz = (-dx * dpp) / cosAlt;
      const dAlt = dy * dpp;
      if (this.dragHandler) {
        // 보정 미세 조정: 카메라 대신 핸들러로 (오른쪽 드래그 = 하늘을 오른쪽으로 = δ 감소)
        this.dragHandler(dAz, dAlt);
        p.x = e.clientX;
        p.y = e.clientY;
        return;
      }
      if (this.sensorPose.active) this.setSensorQuaternion(null); // 수동 드래그는 보간 목표까지 해제
      this.view.altDeg = clamp(this.view.altDeg + dAlt, -ALT_LIMIT_DEG, ALT_LIMIT_DEG);
      this.view.azDeg = wrap360(this.view.azDeg + dAz);
      const now = performance.now();
      const dt = Math.max(1, now - this.lastMoveTime);
      this.velocity = { alt: dAlt / dt, az: dAz / dt };
      this.lastMoveTime = now;
      this.opts.onChange(this.getView());
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.pointers.length === 2) {
      const [a, b] = this.pointers as [Pointer, Pointer];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.lastPinchDist > 0) {
        const factor = dist / this.lastPinchDist;
        this.view.fovDeg = zoomFov(this.view.fovDeg, factor);
        this.moved = true;
        this.opts.onChange(this.getView());
      }
      this.lastPinchDist = dist;
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    this.pointers = this.pointers.filter((q) => q.id !== e.pointerId);
    if (this.pointers.length === 0) {
      this.dragging = false;
      this.lastPinchDist = 0;
      // 마지막 이동 후 시간이 지났으면 관성 없음
      if (performance.now() - this.lastMoveTime > 80) this.velocity = { alt: 0, az: 0 };
      if (!this.moved) {
        const now = performance.now();
        const dist = Math.hypot(e.clientX - this.lastTapPos.x, e.clientY - this.lastTapPos.y);
        if (now - this.lastTapTime < 300 && dist < 30) {
          this.zoomAtPixel(e.clientX, e.clientY, 2);
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
          this.lastTapPos = { x: e.clientX, y: e.clientY };
          this.onTap?.(e.clientX, e.clientY);
        }
      }
    } else if (this.pointers.length === 1) {
      this.lastPinchDist = 0;
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    this.setView({ fovDeg: zoomFov(this.view.fovDeg, factor) });
  };

  /** 화면의 한 점을 중심으로 FOV를 1/factor로 (더블탭) */
  zoomAtPixel(clientX: number, clientY: number, factor: number): void {
    const { width, height } = this.opts.getSize();
    const rect = this.element?.getBoundingClientRect();
    const x = clientX - (rect?.left ?? 0);
    const y = clientY - (rect?.top ?? 0);
    if (!isInsideSkyDisk(x, y, this.view.fovDeg, width, height)) return;
    const dir = this.pixelToDirection(x, y, width, height);
    const { altDeg, azDeg } = sceneToAltAz(dir);
    this.flyTo({ altDeg, azDeg, fovDeg: zoomFov(this.view.fovDeg, factor) }, 350);
  }
}
