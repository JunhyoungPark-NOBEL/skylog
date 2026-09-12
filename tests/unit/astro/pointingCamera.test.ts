import { expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { pointingCameraQuaternion, pointingDirection, type QTuple } from '@/astro/pointing';
it('메인 하늘 카메라의 -Z는 모든 자세에서 경통의 보정된 +Y와 일치한다', () => {
  for (const pitch of [-179, -90, -1, 0, 89.9, 90, 90.1, 179])
    for (const roll of [0, 45, 90, 180]) {
      const q = new Quaternion()
        .setFromEuler(new Euler((pitch * Math.PI) / 180, 1.2, (roll * Math.PI) / 180))
        .toArray() as QTuple;
      for (const model of [
        null,
        {
          yawDeg: 13,
          axis: [0.08, 0.99, 0.01] as [number, number, number],
          residualDeg: 0,
          maxResidualDeg: 0,
        },
      ]) {
        const rendered = new Vector3(0, 0, -1).applyQuaternion(pointingCameraQuaternion(q, model));
        expect(rendered.distanceTo(new Vector3(...pointingDirection(q, model)))).toBeLessThan(
          1e-10,
        );
      }
    }
});
