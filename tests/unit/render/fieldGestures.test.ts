import { afterEach, describe, expect, it, vi } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { CameraController, altAzToQuaternion } from '@/render/CameraController';
import { angleBetween } from '@/sensors/orientation/math';

const controllers: CameraController[] = [];
function setup() {
  const camera = new CameraController({
    getSize: () => ({ width: 400, height: 800 }),
    onChange: vi.fn(),
  });
  const el = document.createElement('div');
  el.setPointerCapture = vi.fn();
  el.hasPointerCapture = () => true;
  el.releasePointerCapture = vi.fn();
  camera.attach(el);
  controllers.push(camera);
  const drag = vi.fn(() => camera.setSensorQuaternion(null));
  camera.onDragStart = drag;
  camera.onTap = vi.fn();
  const pointer = (type: string, x: number, y: number, id = 1) => {
    const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0 });
    Object.defineProperty(event, 'pointerId', { value: id });
    el.dispatchEvent(event);
  };
  return { camera, pointer, drag };
}
afterEach(() => {
  controllers.splice(0).forEach((c) => c.detach());
});

describe('실사용 센서 제스처', () => {
  it('탭·손떨림은 추적을 유지하고 손가락을 댄 시점의 선택을 확정한다', () => {
    const { camera, pointer, drag } = setup();
    camera.setSensorQuaternion(altAzToQuaternion(45, 30), false, 0);
    let visible = 'Vega';
    let touched = '';
    let chosen = '';
    camera.onTapStart = () => {
      touched = visible;
    };
    camera.onTap = () => {
      chosen = touched;
    };
    pointer('pointerdown', 200, 400);
    visible = 'Nearby star';
    pointer('pointermove', 202, 401);
    pointer('pointerup', 202, 401);
    expect(chosen).toBe('Vega');
    expect(drag).not.toHaveBeenCalled();
    expect(camera.hasSensorQuaternion).toBe(true);
  });
  it('핀치 확대와 취소는 수동 전환이나 별 선택을 발생시키지 않는다', () => {
    const { camera, pointer, drag } = setup();
    camera.setSensorQuaternion(altAzToQuaternion(65, 80), false, 0);
    pointer('pointerdown', 150, 400);
    pointer('pointerdown', 250, 400, 2);
    pointer('pointermove', 280, 400, 2);
    pointer('pointerup', 280, 400, 2);
    pointer('pointerup', 150, 400);
    expect(camera.getView().fovDeg).toBeLessThan(90);
    expect(camera.hasSensorQuaternion).toBe(true);
    expect(drag).not.toHaveBeenCalled();
    expect(camera.onTap).not.toHaveBeenCalled();
    pointer('pointerdown', 200, 400);
    pointer('pointercancel', 200, 400);
    expect(camera.onTap).not.toHaveBeenCalled();
  });
  it('실제 드래그가 시작될 때만 한 번 수동 전환한다', () => {
    const { camera, pointer, drag } = setup();
    camera.setSensorQuaternion(altAzToQuaternion(89, 80), false, 0);
    camera.applyToCamera(400, 800);
    pointer('pointerdown', 200, 400);
    pointer('pointermove', 204, 400);
    expect(drag).not.toHaveBeenCalled();
    pointer('pointermove', 220, 400);
    pointer('pointermove', 240, 400);
    pointer('pointerup', 240, 400);
    expect(drag).toHaveBeenCalledTimes(1);
    expect(camera.hasSensorQuaternion).toBe(false);
    expect(camera.onTap).not.toHaveBeenCalled();
  });
  it.each([0, 60, 89.5])('고도 %s°에서 별이 손가락의 화면 이동을 따라간다', (alt) => {
    const { camera } = setup();
    camera.setSensorQuaternion(
      altAzToQuaternion(alt, 120).multiply(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.4),
      ),
      false,
      0,
    );
    camera.applyToCamera(400, 800);
    const before = camera.camera.quaternion.clone();
    camera.setSensorQuaternion(null);
    camera.applyToCamera(400, 800);
    expect(angleBetween(before, camera.camera.quaternion)).toBeLessThan(1e-5);
    const star = camera.pixelToDirection(190, 390, 400, 800);
    camera.panPixels(190, 390, 45, -50);
    camera.applyToCamera(400, 800);
    const screen = camera.directionToPixel(star, 400, 800)!;
    expect(screen.x).toBeCloseTo(235, 5);
    expect(screen.y).toBeCloseTo(340, 5);
    camera.panPixels(235, 340, -45, 50);
    camera.applyToCamera(400, 800);
    expect(angleBetween(before, camera.camera.quaternion)).toBeLessThan(1e-5);
  });
});
