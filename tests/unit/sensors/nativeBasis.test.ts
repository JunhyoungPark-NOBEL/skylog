import { it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { genericSensorToScene, cameraDirection } from '@/sensors/orientation/math';
import { pointingDirection } from '@/astro/pointing';
it('Android ENU 항등 자세에서 폰 윗변은 북쪽, 후면은 천저를 향한다', () => {
  const q = genericSensorToScene([0, 0, 0, 1], 0, 'device');
  expect(pointingDirection(q.toArray())[2]).toBeCloseTo(-1);
  expect(cameraDirection(q)[1]).toBeCloseTo(-1);
});
it('iOS 북·서·천정→ENU 변환은 같은 물리 자세를 낸다', () => {
  // 북향·수평 폰: Core Motion x는 북쪽, 폰 x는 동쪽이므로 z축 −90°.
  const ios = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2);
  const enu = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2).multiply(ios);
  const q = genericSensorToScene(enu.toArray(), 0, 'device');
  expect(pointingDirection(q.toArray())[2]).toBeCloseTo(-1);
});
