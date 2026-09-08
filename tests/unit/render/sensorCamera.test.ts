import { describe, expect, it, vi } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { altAzToQuaternion, CameraController } from '@/render/CameraController';
import { angleBetween } from '@/sensors/orientation/math';

function controller() {
  const onChange = vi.fn();
  const camera = new CameraController({ onChange, getSize: () => ({ width: 400, height: 800 }) });
  return { camera, onChange };
}

describe('CameraController sensor frames', () => {
  it('renders intermediate poses between sensor samples and sends fewer view-store notifications', () => {
    const { camera, onChange } = controller();
    camera.setSensorQuaternion(altAzToQuaternion(20, 0), false, 0);
    camera.setSensorQuaternion(altAzToQuaternion(20, 4), false, 40);
    expect(camera.update(50, 10)).toBe(true);
    expect(camera.getView().azDeg).toBeGreaterThan(0);
    expect(camera.getView().azDeg).toBeLessThan(4);
    camera.applyToCamera(400, 800);
    for (let time = 80; time <= 1000; time += 40) {
      camera.setSensorQuaternion(altAzToQuaternion(20, time / 10), false, time);
      camera.update(time + 12, 12);
      camera.update(time + 28, 16);
    }
    camera.update(1100, 72);
    expect(camera.getView().azDeg).toBeCloseTo(100, 6);
    expect(onChange.mock.calls.length).toBeLessThan(15);
  });

  it('clears the entire interpolation state when manual exploration or sensor stop takes over', () => {
    const { camera } = controller();
    camera.setSensorQuaternion(altAzToQuaternion(20, 0), false, 0);
    camera.setSensorQuaternion(altAzToQuaternion(20, 90), false, 40);
    camera.update(50, 10);
    camera.setSensorQuaternion(null);
    camera.setView({ altDeg: 35, azDeg: 210 });
    camera.update(1000, 16);
    expect(camera.hasSensorQuaternion).toBe(false);
    expect(camera.getView()).toMatchObject({ altDeg: 35, azDeg: 210 });
    camera.setSensorQuaternion(altAzToQuaternion(10, 50), false, 1100);
    expect(camera.getView().azDeg).toBeCloseTo(50, 6);
  });

  it('keeps roll when requested and removes it in keep-level mode throughout interpolation', () => {
    const { camera } = controller();
    const rolled = altAzToQuaternion(20, 0).multiply(
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 4),
    );
    camera.setSensorQuaternion(rolled, false, 0);
    camera.applyToCamera(400, 800);
    expect(angleBetween(camera.camera.quaternion, rolled)).toBeLessThan(1e-6);
    camera.setSensorQuaternion(null);
    camera.setSensorQuaternion(rolled, true, 100);
    camera.applyToCamera(400, 800);
    expect(angleBetween(camera.camera.quaternion, altAzToQuaternion(20, 0))).toBeLessThan(1e-5);
    camera.setSensorQuaternion(altAzToQuaternion(60, 90), true, 130);
    camera.update(145, 15);
    camera.applyToCamera(400, 800);
    const view = camera.getView();
    expect(
      angleBetween(camera.camera.quaternion, altAzToQuaternion(view.altDeg, view.azDeg)),
    ).toBeLessThan(1e-5);
  });
});
