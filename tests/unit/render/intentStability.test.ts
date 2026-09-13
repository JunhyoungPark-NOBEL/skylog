import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Euler, Quaternion, Vector3 } from 'three';
import { CameraController, altAzToQuaternion } from '@/render/CameraController';
import { OrientationFilter } from '@/sensors/orientation/filter';
import { RenderPose } from '@/sensors/orientation/renderPose';
import { IntentStabilizer } from '@/sensors/orientation/intentStabilizer';
import { angleBetween } from '@/sensors/orientation/math';
import { degPerPixel, stereographicProject } from '@/render/projection';

const W = 412,
  H = 915,
  D = Math.PI / 180;
const rms = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
function tremor(t: number): Quaternion {
  // 이전 회귀 입력보다 큰 손떨림과 느린 손목 흔들림을 합친 합성 입력. 기기 녹화본은 아니다.
  return new Quaternion().setFromEuler(
    new Euler(
      (0.5 * Math.sin(t * 2 * Math.PI * 6.7) + 0.25 * Math.sin(t * 2 * Math.PI * 1.2)) * D,
      (0.8 * Math.sin(t * 2 * Math.PI * 8.1) + 0.3 * Math.sin(t * 2 * Math.PI * 1.7)) * D,
      (0.3 * Math.sin(t * 2 * Math.PI * 9.3) + 0.1 * Math.sin(t * 2 * Math.PI * 0.9)) * D,
    ),
  );
}
function jitter(points: { x: number; y: number }[]) {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length;
  const y = points.reduce((s, p) => s + p.y, 0) / points.length;
  return rms(points.map((p) => Math.hypot(p.x - x, p.y - y)));
}

describe('이동 판정 이후 실제 표시 시야', () => {
  it('같은 입력의 기존 표시와 정지 범위 적용 표시를 픽셀로 비교한다', () => {
    const report = [];
    for (const hz of [30, 60, 90])
      for (const fov of [90, 15, 3]) {
        const camera = new CameraController({
          onChange: () => {},
          getSize: () => ({ width: W, height: H }),
        });
        camera.setView({ fovDeg: fov });
        const filter = new OrientationFilter({ smoothYaw: true });
        filter.setViewport(fov, degPerPixel(fov, W, H));
        const previous = new RenderPose();
        const base = altAzToQuaternion(87, 359);
        const star = new Vector3(0.004, 0.006, -1).normalize().applyQuaternion(base);
        const before: { x: number; y: number }[] = [],
          after: { x: number; y: number }[] = [];
        let next = 0,
          index = 0;
        for (let frame = 0; frame < 120 * 12; frame++) {
          const time = (frame * 1000) / 120;
          while (next <= time + 0.001) {
            const q = filter.push(base.clone().multiply(tremor(next / 1000)), next);
            previous.push(q, next);
            camera.setSensorQuaternion(q, false, next);
            // 일정하지 않은 센서 간격에서도 화면은 120Hz로 표시한다.
            next += (1000 / hz) * (1 + 0.12 * Math.sin(++index * 1.7));
          }
          camera.update(time, 1000 / 120);
          camera.applyToCamera(W, H);
          if (time > 4000) {
            const q = previous.sample(time)!;
            const local = star.clone().applyQuaternion(q.clone().invert());
            before.push(stereographicProject(local.toArray(), fov, W, H)!);
            after.push(camera.directionToPixel(star.toArray(), W, H)!);
          }
        }
        const beforeRmsPx = jitter(before),
          afterRmsPx = jitter(after);
        const maxStepPx = Math.max(
          ...after.slice(1).map((p, i) => Math.hypot(p.x - after[i]!.x, p.y - after[i]!.y)),
        );
        report.push({ hz, fov, beforeRmsPx, afterRmsPx, maxStepPx });
        expect(afterRmsPx).toBeLessThan(0.1);
        expect(afterRmsPx).toBeLessThan(beforeRmsPx * 0.1);
        expect(maxStepPx).toBeLessThan(0.1);
      }
    mkdirSync('artifacts', { recursive: true });
    writeFileSync(
      'artifacts/intent-stability-build30.json',
      JSON.stringify(
        { kind: 'synthetic, not S24+ measurements', viewport: { width: W, height: H }, report },
        null,
        2,
      ) + '\n',
    );
  });

  it.each([1, 5, 30])('손떨림이 섞인 %i°/s 이동·반전·정지에도 추종하고 다시 멈춘다', (speed) => {
    for (const fov of [90, 3]) {
      const filter = new OrientationFilter({ smoothYaw: true });
      filter.setViewport(fov, degPerPixel(fov, W, H));
      const gate = new IntentStabilizer();
      gate.setViewport(fov);
      let opened = Infinity;
      const stopped: Quaternion[] = [];
      const movingErrors: number[] = [];
      const trace: unknown[] = [];
      for (let i = 0; i < 60 * 15; i++) {
        const t = i / 60;
        const az = t < 1 ? 0 : t < 4 ? (t - 1) * speed : t < 7 ? (7 - t) * speed : 0;
        const target = altAzToQuaternion(70, 359 + az);
        const filtered = filter.push(target.clone().multiply(tremor(t)), t * 1000);
        const output = gate.push(filtered, t * 1000)!;
        if (i % 15 === 0)
          trace.push({
            t,
            state: gate.state,
            filteredError: angleBetween(filtered, target),
            displayError: angleBetween(output, target),
          });
        if (gate.state === 'following') opened = Math.min(opened, t - 1);
        if ((t > 2.5 && t < 3.5) || (t > 5.5 && t < 6.5))
          movingErrors.push(angleBetween(output, target));
        if (t > 11) stopped.push(output);
      }
      mkdirSync('artifacts', { recursive: true });
      writeFileSync(`artifacts/intent-motion-${speed}-${fov}.json`, JSON.stringify(trace, null, 2));
      expect.soft(opened, `fov${fov},speed${speed}`).toBeLessThan(2);
      expect.soft(rms(movingErrors), `fov${fov},speed${speed}`).toBeLessThan(2.5);
      expect(gate.state).toBe('holding');
      expect(Math.max(...stopped.map((q) => angleBetween(q, stopped[0]!)))).toBeLessThan(0.001);
      // 정지 범위는 시점 정확도와 맞바꾸므로, 잔여 각도도 별도로 제한한다.
      expect(angleBetween(stopped.at(-1)!, altAzToQuaternion(70, 359))).toBeLessThan(
        gate.thresholdDeg + 0.1,
      );
    }
  });
});
