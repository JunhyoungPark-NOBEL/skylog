import { describe, expect, it } from 'vitest';
import { SampleClock, browserSampleTime } from '@/sensors/orientation/sampleClock';
import { RenderPose } from '@/sensors/orientation/renderPose';
import { Quaternion, Vector3 } from 'three';
import { angleBetween } from '@/sensors/orientation/math';
const yaw = (n: number) =>
  new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (n * Math.PI) / 180);

describe('측정 시각과 화면 재표본화', () => {
  it('부팅 시각의 센서 입력이 한 번에 도착해도 원래 16ms 간격을 유지한다', () => {
    const clock = new SampleClock();
    expect(clock.map(900000, 100)).toBe(100);
    expect([clock.map(900016, 150), clock.map(900032, 150), clock.map(900048, 150)]).toEqual([
      116, 132, 148,
    ]);
    expect(clock.map(900032, 155)).toBeNull();
    expect(clock.map(NaN, 160)).toBeNull();
  });
  it('처음 지연된 시계는 되감기 없이 보정하고 구형 플러그인도 지원한다', () => {
    const c = new SampleClock();
    expect(c.map(1000, 100)).toBe(100);
    expect(c.map(1020, 110)).toBe(110);
    expect(c.map(1040, 135)).toBe(130);
    expect(new SampleClock().map(undefined, 145)).toBe(145);
    expect(browserSampleTime(30, 55)).toBe(30);
    expect(browserSampleTime(undefined, 55)).toBe(55);
    expect(browserSampleTime(Infinity, 55)).toBe(55);
  });
  it('일정 속도 입력이 최대 25ms 늦게 도착해도 렌더 속도가 흔들리지 않는다', () => {
    const pose = new RenderPose();
    const events = Array.from({ length: 181 }, (_, i) => ({
      time: (i * 1000) / 60,
      arrival: (i * 1000) / 60 + [0, 8, 25, 4, 19][i % 5]!,
      q: yaw((i / 60) * 20),
    })).sort((a, b) => a.arrival - b.arrival);
    let index = 0,
      prev: Quaternion | null = null;
    const errors: number[] = [];
    for (let frame = 0; frame < 350; frame++) {
      const now = (frame * 1000) / 120;
      while (events[index] && events[index]!.arrival <= now) {
        const e = events[index++]!;
        pose.push(e.q, e.time);
      }
      const q = pose.sample(now)?.clone();
      if (q && prev && now > 300) errors.push(Math.abs(angleBetween(prev, q) * 120 - 20));
      if (q) prev = q;
    }
    expect(Math.max(...errors)).toBeLessThan(0.01);
    const before = pose.sample(4000)!.clone();
    expect(pose.push(yaw(170), 100)).toBe(false);
    expect(pose.push(new Quaternion(NaN, 0, 0, 1), 4001)).toBe(false);
    expect(angleBetween(pose.sample(4000)!, before)).toBeLessThan(0.001);
  });
});
