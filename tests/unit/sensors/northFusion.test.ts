import { describe, expect, it } from 'vitest';
import { Quaternion, Euler, Vector3 } from 'three';
import { NorthFusion, type FusionReading } from '@/sensors/orientation/northFusion';
import { angleBetween } from '@/sensors/orientation/math';

const yaw = (d: number) =>
  new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (d * Math.PI) / 180);
const sample = (
  q: Quaternion,
  t: number,
  channel: FusionReading['channel'],
  accuracy?: number,
): FusionReading => ({
  quaternion: q.toArray(),
  timestampMs: t,
  channel,
  northReference: channel === 'motion' ? 'relative' : 'magnetic',
  headingAccuracyDeg: accuracy,
});
const quaternion = (r: FusionReading | null) => new Quaternion(...r!.quaternion);

describe('자이로 자세 + 저속 북쪽 기준', () => {
  it('초기 임의 방위를 노출하지 않고 기기 기울기·회전을 보존하며 북쪽을 맞춘다', () => {
    const f = new NorthFusion();
    const q = new Quaternion().setFromEuler(new Euler(1.56, 0.4, -0.9));
    expect(f.push(sample(q, 0, 'motion'))).toBeNull();
    f.push(sample(yaw(80).multiply(q), 0, 'reference', 5));
    const next = q.clone().multiply(new Quaternion().setFromEuler(new Euler(0.1, 0.2, 0.3)));
    const out = f.push(sample(next, 16, 'motion'));
    expect(out?.northReference).toBe('magnetic');
    expect(angleBetween(quaternion(out), yaw(80).multiply(next))).toBeLessThan(0.001);
  });
  it('동일 시각의 자세끼리 비교해 빠른 회전을 잘못된 북쪽 보정으로 누적하지 않는다', () => {
    const f = new NorthFusion();
    let out: FusionReading | null = null;
    for (let t = 0; t <= 3000; t += 10) {
      const motion = yaw(t * 0.08);
      out = f.push(sample(motion, t, 'motion'));
      if (t % 50 === 0)
        f.push(sample(yaw(30).multiply(yaw((t + 5) * 0.08)), t + 5, 'reference', 3));
    }
    expect(angleBetween(quaternion(out), yaw(270))).toBeLessThan(0.001);
  });
  it('나침반의 ±4° 진동이 빠른 자세에 섞이지 않는다', () => {
    const f = new NorthFusion();
    f.push(sample(yaw(0), 0, 'motion'));
    f.push(sample(yaw(30), 0, 'reference', 3));
    const errors: number[] = [];
    for (let i = 1; i <= 1200; i++) {
      const t = (i * 1000) / 60;
      if (i % 3 === 0)
        f.push(sample(yaw(30 + 4 * Math.sin((2 * Math.PI * 1.8 * t) / 1000)), t, 'reference', 3));
      const out = f.push(sample(yaw(0), t, 'motion'));
      if (t > 2000) errors.push(angleBetween(quaternion(out), yaw(30)));
    }
    expect(Math.max(...errors)).toBeLessThan(0.1);
  });
  it('일시적인 90° 자석 튐/나쁜 정확도는 무시하고 작은 자이로 드리프트는 서서히 보정한다', () => {
    const f = new NorthFusion();
    f.push(sample(yaw(0), 0, 'motion'));
    f.push(sample(yaw(0), 0, 'reference', 3));
    for (let i = 1; i <= 100; i++) {
      f.push(sample(yaw(90), i * 20, 'reference', 3));
      expect(
        angleBetween(quaternion(f.push(sample(yaw(0), i * 20, 'motion'))), yaw(0)),
      ).toBeLessThan(0.001);
    }
    f.push(sample(yaw(8), 2020, 'reference', 90));
    expect(angleBetween(quaternion(f.push(sample(yaw(0), 2020, 'motion'))), yaw(0))).toBeLessThan(
      0.001,
    );
    let last: FusionReading | null = null;
    for (let t = 2040; t <= 22020; t += 20) {
      f.push(sample(yaw(2), t, 'reference', 3));
      last = f.push(sample(yaw(0), t, 'motion'));
    }
    expect(angleBetween(quaternion(last), yaw(2))).toBeLessThan(0.2);
  });
  it('중복·오래된 입력을 거부하고 백그라운드 이후 상대 정렬을 재사용하지 않는다', () => {
    const f = new NorthFusion();
    f.push(sample(yaw(0), 0, 'motion'));
    f.push(sample(yaw(30), 0, 'reference'));
    expect(f.push(sample(yaw(0), 16, 'motion'))).not.toBeNull();
    expect(f.push(sample(yaw(90), 16, 'motion'))).toBeNull();
    expect(f.push(sample(yaw(90), 15, 'motion'))).toBeNull();
    expect(f.push(sample(yaw(0), 2000, 'motion'))).toBeNull();
    f.push(sample(yaw(60), 2000, 'reference'));
    expect(angleBetween(quaternion(f.push(sample(yaw(0), 2016, 'motion'))), yaw(60))).toBeLessThan(
      0.001,
    );
  });
  it('구형 플러그인·iOS·명시적인 자이로 모드는 그대로 전달한다', () => {
    const r = sample(yaw(30), 100, undefined);
    r.northReference = 'relative';
    expect(new NorthFusion().push(r)).toEqual(r);
  });
});
