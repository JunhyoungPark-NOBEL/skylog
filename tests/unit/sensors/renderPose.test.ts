import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { RenderPose, MAX_POSE_BLEND_MS, POSE_DELAY_MS } from '@/sensors/orientation/renderPose';
import { angleBetween } from '@/sensors/orientation/math';
import { OrientationFilter } from '@/sensors/orientation/filter';

const yaw = (degrees: number) =>
  new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (degrees * Math.PI) / 180);
const yawDegrees = (q: Quaternion) => (2 * Math.atan2(q.y, q.w) * 180) / Math.PI;

describe('sensor pose resampling for rendered frames', () => {
  it('reduces frame velocity jitter under irregular 20–45Hz samples and uneven render intervals', () => {
    const pose = new RenderPose();
    const inputIntervals = [23, 47, 29, 38, 20, 43];
    const frameIntervals = [13, 21, 16, 18, 15, 17, 22, 11];
    const speed = 60;
    let nextInput = 0,
      inputIndex = 0,
      frameIndex = 0,
      now = 0;
    let held = yaw(0);
    const previousHeld = yaw(0),
      previousSmooth = yaw(0);
    const rawErrors: number[] = [],
      smoothErrors: number[] = [],
      addedLag: number[] = [];
    while (now < 1900) {
      const dt = frameIntervals[frameIndex++ % frameIntervals.length]!;
      now += dt;
      while (nextInput <= now) {
        held = yaw((speed * nextInput) / 1000);
        pose.push(held, nextInput);
        nextInput += inputIntervals[inputIndex++ % inputIntervals.length]!;
      }
      const smooth = pose.sample(now)!.clone();
      if (now > 300) {
        rawErrors.push((angleBetween(previousHeld, held) * 1000) / dt - speed);
        smoothErrors.push((angleBetween(previousSmooth, smooth) * 1000) / dt - speed);
        addedLag.push(((yawDegrees(held) - yawDegrees(smooth)) / speed) * 1000);
      }
      previousHeld.copy(held);
      previousSmooth.copy(smooth);
    }
    const rms = (values: number[]) =>
      Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
    expect(rms(smoothErrors)).toBeLessThan(rms(rawErrors) * 0.5);
    expect(Math.max(...addedLag)).toBeLessThan(50);
    expect(addedLag.reduce((sum, value) => sum + value, 0) / addedLag.length).toBeLessThan(25);
  });

  it('settles exactly within 50ms of the final sample without repeated identical samples extending the delay', () => {
    const pose = new RenderPose();
    pose.push(yaw(0), 0);
    pose.push(yaw(90), 50);
    pose.push(yaw(90), 66);
    pose.push(yaw(90), 82);
    expect(angleBetween(pose.sample(50 + MAX_POSE_BLEND_MS)!, yaw(90))).toBeLessThan(1e-6);
    expect(pose.isMoving(50 + MAX_POSE_BLEND_MS)).toBe(false);
  });

  it('keeps the existing filter plus rendered 90-degree step response within 150ms', () => {
    const filter = new OrientationFilter({ smoothYaw: true });
    const pose = new RenderPose();
    for (let time = 0; time <= 1000; time += 1000 / 30) pose.push(filter.push(yaw(0), time), time);
    let reached: number | null = null;
    let nextInput = 1020;
    const target = yaw(90);
    for (let time = 1020; time <= 1180; time += 1000 / 60) {
      while (nextInput <= time) {
        pose.push(filter.push(target, nextInput), nextInput);
        nextInput += 1000 / 30;
      }
      if (reached === null && angleBetween(pose.sample(time)!, target) < 2) reached = time - 1020;
    }
    expect(reached).not.toBeNull();
    expect(reached!).toBeLessThanOrEqual(150);
  });

  it('is independent of whether rendered at 30Hz, 60Hz or irregular frame times', () => {
    const a = new RenderPose(),
      b = new RenderPose();
    for (const [time, degrees] of [
      [0, 0],
      [30, 2],
      [70, 4],
      [100, 6],
    ] as const) {
      a.push(yaw(degrees), time);
      b.push(yaw(degrees), time);
      for (const extra of [3, 9, 16]) a.sample(time + extra);
    }
    expect(angleBetween(a.sample(115)!, b.sample(115)!)).toBeLessThan(1e-6);
  });

  it('uses the shortest arc across north and equivalent quaternion signs', () => {
    const pose = new RenderPose();
    pose.push(yaw(359), 0);
    pose.push(yaw(1), 30);
    expect(angleBetween(pose.sample(15 + POSE_DELAY_MS)!, yaw(0))).toBeLessThan(0.1);
    const target = yaw(1);
    pose.push(new Quaternion(-target.x, -target.y, -target.z, -target.w), 45);
    expect(angleBetween(pose.sample(80)!, target)).toBeLessThan(1e-6);
  });

  it('does not extrapolate during missing input and starts fresh after a long gap or explicit stop', () => {
    const pose = new RenderPose();
    pose.push(yaw(0), 0);
    pose.push(yaw(3), 30);
    expect(angleBetween(pose.sample(1500)!, yaw(3))).toBeLessThan(1e-6);
    expect(pose.push(yaw(80), 1600)).toBe(true);
    expect(angleBetween(pose.sample(1600)!, yaw(80))).toBeLessThan(1e-6);
    pose.reset();
    expect(pose.sample(1700)).toBeNull();
    expect(pose.push(yaw(150), 1701)).toBe(true);
    expect(angleBetween(pose.sample(1701)!, yaw(150))).toBeLessThan(1e-6);
  });
});
