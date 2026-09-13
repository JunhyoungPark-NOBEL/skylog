import { describe, expect, it } from 'vitest';
import { Quaternion, Euler } from 'three';
import { IntentStabilizer } from '@/sensors/orientation/intentStabilizer';
import { angleBetween } from '@/sensors/orientation/math';
const d = Math.PI / 180;
const pose = (yaw: number, pitch = 0, roll = 0) =>
  new Quaternion().setFromEuler(new Euler(pitch * d, yaw * d, roll * d));

describe('화면 정지 범위와 의도적인 이동 전환', () => {
  it.each([30, 60, 90])('%iHz: 범위 안의 세 축 손떨림은 화면을 전혀 움직이지 않는다', (hz) => {
    for (const fov of [90, 15, 3]) {
      const gate = new IntentStabilizer();
      gate.setViewport(fov);
      const start = gate.push(pose(0), 0)!;
      for (let i = 1; i < hz * 10; i++) {
        const t = i / hz,
          a = 0.15;
        const q = pose(a * Math.sin(t * 11), a * Math.sin(t * 33), a * Math.sin(t * 17));
        expect(angleBetween(gate.push(q, t * 1000)!, start)).toBeLessThan(1e-6);
        expect(gate.state).toBe('holding');
      }
    }
  });
  it('작은 왕복을 누적해 의도적인 회전으로 만들지 않는다', () => {
    const gate = new IntentStabilizer();
    gate.setViewport(3);
    for (let i = 0; i < 60 * 20; i++)
      gate.push(pose(0.7 * Math.sin(((2 * Math.PI * i) / 60) * 3)), (i * 1000) / 60);
    expect(gate.state).toBe('holding');
  });
  it.each([1, 5, 45])('초당 %i°로 계속 움직이면 추종하고 멈춘 뒤 다시 고정한다', (speed) => {
    for (const fov of [90, 3]) {
      const gate = new IntentStabilizer();
      gate.setViewport(fov);
      let openedAt = Infinity,
        last = new Quaternion();
      for (let i = 0; i <= 600; i++) {
        const t = i / 60,
          target = Math.min(3, Math.max(0, t - 1)) * speed;
        last = gate.push(pose(target), t * 1000)!;
        if (gate.state === 'following') openedAt = Math.min(openedAt, t - 1);
        if (t > 7) expect(gate.state).toBe('holding');
      }
      expect(openedAt).toBeLessThan(1.5);
      expect(angleBetween(last, pose(3 * speed))).toBeLessThan(0.1);
    }
  });
  it('시점 고정을 풀 때 한 번에 새 방향으로 뛰지 않는다', () => {
    const gate = new IntentStabilizer();
    gate.setViewport(3);
    gate.push(pose(0), 0);
    let previous = pose(0),
      step = 0;
    for (let i = 1; i < 90; i++) {
      const q = gate.push(pose(i > 10 ? 1 : 0), (i * 1000) / 60)!;
      step = Math.max(step, angleBetween(q, previous));
      previous = q;
    }
    expect(step).toBeLessThan(0.25);
    expect(angleBetween(previous, pose(1))).toBeLessThan(0.1);
  });
  it('순서가 뒤집힌 입력·부호 반전·확대 변경은 고정 시점을 튀게 하지 않는다', () => {
    const gate = new IntentStabilizer();
    const q = pose(359, 89, 30);
    gate.push(q, 0);
    gate.push(q, 30);
    gate.setViewport(3);
    expect(angleBetween(gate.push(pose(40), 20)!, q)).toBeLessThan(1e-6);
    const opposite = q.clone().set(-q.x, -q.y, -q.z, -q.w);
    expect(angleBetween(gate.push(opposite, 60)!, q)).toBeLessThan(1e-6);
    gate.reset();
    expect(angleBetween(gate.push(pose(80), 100)!, pose(80))).toBeLessThan(1e-6);
  });
});
