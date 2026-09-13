import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Quaternion, Euler, Vector3 } from 'three';
import { CameraController, altAzToQuaternion } from '@/render/CameraController';
import { OrientationFilter } from '@/sensors/orientation/filter';
import { degPerPixel } from '@/render/projection';
import { angleBetween } from '@/sensors/orientation/math';

const W = 412,
  H = 915;
const rms = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
const d = Math.PI / 180;
function noise(t: number): Quaternion {
  // 단일 사인파 대신 세 축의 느린 흔들림, 빠른 손떨림과 비주기 성분을 함께 재생한다.
  const x = 0.28 * Math.sin(2 * Math.PI * 6.7 * t) + 0.09 * Math.sin(2 * Math.PI * 1.2 * t);
  const y =
    0.5 * Math.sin(2 * Math.PI * 8.1 * t) +
    0.18 * Math.sin(2 * Math.PI * 12.3 * t) +
    0.1 * Math.sin(2 * Math.PI * 1.7 * t);
  const z = 0.25 * Math.sin(2 * Math.PI * 9.3 * t) + 0.04 * Math.sin(2 * Math.PI * 0.9 * t);
  return new Quaternion().setFromEuler(new Euler(x * d, y * d, z * d));
}

describe('센서부터 카메라·별 픽셀까지 안정화', () => {
  it('손떨림이 섞여도 의도한 느린 이동을 정지로 오인하지 않고 정지 후 수렴한다', () => {
    for (const fov of [90, 3]) {
      const f = new OrientationFilter({ smoothYaw: true });
      f.setViewport(fov, degPerPixel(fov, W, H));
      const errors: number[] = [];
      for (let i = 0; i < 60 * 12; i++) {
        const t = i / 60;
        const target = altAzToQuaternion(45, Math.min(20, Math.max(0, t - 1) * 5));
        const output = f.push(target.clone().multiply(noise(t)), t * 1000);
        if (t > 2 && t < 5) errors.push(angleBetween(output, target));
        if (t > 9) expect(angleBetween(output, target) / degPerPixel(fov, W, H)).toBeLessThan(2);
      }
      expect(rms(errors), `fov ${fov} moving error`).toBeLessThan(0.6);
    }
  });
  it.each([30, 60, 90])('%iHz 센서와 120Hz 화면: 광각·확대 세 축 흔들림', (hz) => {
    const results: { fov: number; rmsPx: number; maxStepPx: number; ratio: number }[] = [];
    for (const fov of [90, 60, 15, 3]) {
      const camera = new CameraController({
        onChange: () => {},
        getSize: () => ({ width: W, height: H }),
      });
      camera.setView({ fovDeg: fov });
      const filter = new OrientationFilter({ smoothYaw: true });
      filter.setViewport(fov, degPerPixel(fov, W, H));
      const base = altAzToQuaternion(55, 359);
      // 중심과 가장자리 모두에서 roll을 포함한 실제 CPU 투영을 측정한다.
      const stars = [
        [0, 0, -1],
        [0.004, 0.007, -1],
      ].map(
        (v) =>
          new Vector3(...v).normalize().applyQuaternion(base).toArray() as [number, number, number],
      );
      const points: number[] = [],
        steps: number[] = [],
        raw: number[] = [];
      let next = 0,
        previous: { x: number; y: number }[] | null = null;
      camera.setSensorQuaternion(base, false, 0);
      camera.applyToCamera(W, H);
      const center = stars.map((s) => camera.directionToPixel(s, W, H)!);
      for (let frame = 0; frame < 120 * 12; frame++) {
        const time = (frame * 1000) / 120;
        while (next <= time + 0.001) {
          const q = base.clone().multiply(noise(next / 1000));
          const filtered = filter.push(q, next);
          camera.setSensorQuaternion(filtered, false, next);
          if (next > 4000) raw.push(angleBetween(q, base) / degPerPixel(fov, W, H));
          next += 1000 / hz;
        }
        camera.update(time, 1000 / 120);
        camera.applyToCamera(W, H);
        const current = stars.map((s) => camera.directionToPixel(s, W, H)!);
        if (time > 4000)
          for (let i = 0; i < current.length; i++) {
            points.push(Math.hypot(current[i]!.x - center[i]!.x, current[i]!.y - center[i]!.y));
            if (previous)
              steps.push(
                Math.hypot(current[i]!.x - previous[i]!.x, current[i]!.y - previous[i]!.y),
              );
          }
        previous = current;
      }
      const result = {
        fov,
        rmsPx: rms(points),
        maxStepPx: Math.max(...steps),
        ratio: rms(points) / rms(raw),
      };
      results.push(result);
      expect.soft(result.rmsPx, JSON.stringify(result)).toBeLessThan(1);
      expect.soft(result.maxStepPx, JSON.stringify(result)).toBeLessThan(0.5);
      expect.soft(result.ratio, JSON.stringify(result)).toBeLessThan(0.15);
    }
    mkdirSync('artifacts', { recursive: true });
    writeFileSync(`artifacts/stability-${hz}hz.json`, JSON.stringify(results, null, 2));
  });

  it('단발 45° 오측정은 화면을 튀게 하지 않고, 실제 90° 전환은 150ms 안에 도달한다', () => {
    const f = new OrientationFilter({ smoothYaw: true });
    f.setViewport(3, degPerPixel(3, W, H));
    const base = altAzToQuaternion(70, 359);
    for (let i = 0; i <= 60; i++) f.push(base, (i * 1000) / 60);
    expect(angleBetween(f.push(altAzToQuaternion(70, 44), 1017), base)).toBeLessThan(0.001);
    expect(angleBetween(f.push(base, 1034), base)).toBeLessThan(0.001);
    const target = altAzToQuaternion(20, 89);
    const camera = new CameraController({
      onChange: () => {},
      getSize: () => ({ width: W, height: H }),
    });
    camera.setSensorQuaternion(base, false, 1050);
    for (let t = 1100; t <= 1234; t += 1000 / 60) {
      camera.setSensorQuaternion(f.push(target, t), false, t);
      camera.update(t, 1000 / 60);
      camera.applyToCamera(W, H);
    }
    expect(angleBetween(camera.camera.quaternion, target)).toBeLessThan(2);
  });
});
