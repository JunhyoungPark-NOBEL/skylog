import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { OrientationFilter } from '@/sensors/orientation/filter';
import { angleBetween } from '@/sensors/orientation/math';
import { degPerPixel } from '@/render/projection';
const yaw = (d: number) =>
  new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (d * Math.PI) / 180);
const rms = (values: number[]) => Math.sqrt(values.reduce((s, x) => s + x * x, 0) / values.length);
describe('확대 손떨림 보정', () => {
  it.each([30, 60, 90])('%iHz 입력: 3° 확대의 왕복 손떨림을 85% 이상 줄인다', (hz) => {
    const f = new OrientationFilter(),
      wide = new OrientationFilter();
    f.setViewport(3, degPerPixel(3, 412, 915));
    wide.setViewport(60, degPerPixel(60, 412, 915));
    const raw: number[] = [],
      narrow: number[] = [],
      broad: number[] = [];
    for (let i = 0; i < hz * 8; i++) {
      const t = i / hz;
      const d = 0.18 * Math.sin(2 * Math.PI * 9 * t) + 0.04 * Math.sin(2 * Math.PI * 4 * t);
      const out = f.push(yaw(d), t * 1000),
        other = wide.push(yaw(d), t * 1000);
      if (t > 2) {
        raw.push(d);
        narrow.push(angleBetween(out, yaw(0)));
        broad.push(angleBetween(other, yaw(0)));
      }
    }
    expect(rms(narrow) / rms(raw)).toBeLessThan(0.15);
    // 광각도 안정화되므로 확대가 광각보다 반드시 더 흔들리지 않는다는 상대 조건 대신 픽셀 한도를 쓴다.
    expect(rms(narrow) / degPerPixel(3, 412, 915)).toBeLessThan(0.3);
    expect(rms(broad) / degPerPixel(60, 412, 915)).toBeLessThan(0.3);
  });
  it('확대해도 의도적인 5°/s 이동은 0.4° 안에서 추종하고 큰 방향 전환은150ms 안에 도달한다', () => {
    const f = new OrientationFilter();
    f.setViewport(3, 0.007);
    let out = yaw(0);
    for (let i = 0; i < 240; i++) {
      const d = Math.max(0, i / 60 - 1) * 5;
      out = f.push(yaw(d), (i * 1000) / 60);
      if (i > 90) expect(angleBetween(out, yaw(d))).toBeLessThan(0.4);
    }
    for (let i = 240; i <= 248; i++) out = f.push(yaw(90), (i * 1000) / 60);
    expect(angleBetween(out, yaw(90))).toBeLessThan(2);
  });
  it('줌 전환은 자세를 초기화하지 않고 늦은 샘플은 무시하며 재연결은 새 자세로 시작한다', () => {
    const f = new OrientationFilter();
    f.push(yaw(20), 100);
    f.setViewport(3, 0.007);
    expect(angleBetween(f.push(yaw(20), 117), yaw(20))).toBeLessThan(0.001);
    expect(angleBetween(f.push(yaw(90), 110), yaw(20))).toBeLessThan(0.001);
    expect(angleBetween(f.push(yaw(90), 2000), yaw(90))).toBeLessThan(0.001);
  });
});
