import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { OrientationFilter } from '@/sensors/orientation/filter';
import { angleBetween } from '@/sensors/orientation/math';
import { degPerPixel } from '@/render/projection';

describe('천정과 확대 상태의 자세 필터', () => {
  it('천정을 가로지르는 작은 회전을 180° 자석 간섭으로 오인하지 않는다', () => {
    const filter = new OrientationFilter({ smoothYaw: true });
    filter.setDeadband(0.005);
    let previous: Quaternion | null = null;
    for (let i = 0; i < 240; i++) {
      const q = new Quaternion().setFromAxisAngle(
        new Vector3(1, 0, 0),
        ((88 + i / 60) * Math.PI) / 180,
      );
      const output = filter.push(q, (i * 1000) / 60);
      expect(filter.anomaly).toBe(false);
      if (previous) expect(angleBetween(previous, output)).toBeLessThan(0.1);
      expect(angleBetween(q, output)).toBeLessThan(0.2);
      previous = output;
    }
  });
  it('3° 확대에서 천천히 움직여도 데드밴드가 큰 화면 계단을 만들지 않는다', () => {
    const filter = new OrientationFilter();
    const dpp = degPerPixel(3, 400, 800);
    filter.setDeadband(dpp * 0.35);
    const values: Quaternion[] = [];
    for (let i = 0; i < 180; i++)
      values.push(
        filter.push(
          new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (i * 0.002 * Math.PI) / 180),
          (i * 1000) / 60,
        ),
      );
    const steps = values.slice(61).map((q, i) => angleBetween(values[i + 60]!, q) / dpp);
    expect(Math.max(...steps)).toBeLessThan(0.8);
    expect(steps.filter((n) => n > 0.01).length).toBeGreaterThan(45);
  });
});
