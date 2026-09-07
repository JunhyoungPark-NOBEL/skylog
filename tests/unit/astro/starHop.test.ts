import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { starHop, positionAngle, type HopStar } from '@/astro/starHop';
import { decodeStarPack } from '@/catalog/starPackFormat';
import { unitVectorToRaDec } from '@/astro/coords';
import type { ObjectId } from '@/catalog/objectId';
const raw = readFileSync('public/data/stars-deep.v1.bin');
const pack = decodeStarPack(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const stars: HopStar[] = Array.from({ length: pack.count }, (_, i) => {
  const v = unitVectorToRaDec([
    pack.positions[i * 3]!,
    pack.positions[i * 3 + 1]!,
    pack.positions[i * 3 + 2]!,
  ]);
  return {
    id: pack.hip[i] ? `star:HIP${pack.hip[i]!}` : `star:HYG${pack.hygId[i]!}`,
    ra: v.raDeg,
    dec: v.decDeg,
    mag: pack.mag[i]!,
  };
});
const dsos = JSON.parse(readFileSync('public/data/dso.v1.json', 'utf8')) as {
  id: ObjectId;
  ra: number;
  dec: number;
}[];
describe('실제 카탈로그 스타호핑', () => {
  for (const id of ['dso:M13', 'dso:M57', 'dso:M31', 'dso:M27', 'dso:M11'])
    it(id + ' 경로는 실제 6° 시야 안에서 짧게 끝난다', () => {
      const target = dsos.find((s) => s.id === id)!;
      expect(target).toBeDefined();
      const route = starHop(target, stars, 6, 7.5);
      expect(route).not.toBeNull();
      expect(route!.steps.length).toBeLessThanOrEqual(4);
      expect(route!.steps.at(-1)!.to.id).toBe(id);
      expect(route!.steps.at(-1)!.distanceDeg).toBeLessThanOrEqual(3);
      expect(route!.steps.every((s) => s.distanceDeg <= 4.8)).toBe(true);
      expect(new Set([route!.start.id, ...route!.steps.map((s) => s.to.id)]).size).toBe(
        route!.steps.length + 1,
      );
    });
  it('길 없는 좁은 시야를 임의로 넓히지 않는다', () => {
    expect(starHop({ id: 'dso:M13', ra: 250.42, dec: 36.46 }, [], 0.1)).toBeNull();
    expect(starHop({ id: 'dso:M13', ra: 250.42, dec: 36.46 }, stars, NaN)).toBeNull();
  });
  it('천구 북과 동쪽 방향의 위치각이 맞는다', () => {
    const a = { id: 'star:HIP1' as const, ra: 0, dec: 0 };
    expect(positionAngle(a, { ...a, dec: 10 })).toBeCloseTo(0);
    expect(positionAngle(a, { ...a, ra: 10 })).toBeCloseTo(90);
  });
});
