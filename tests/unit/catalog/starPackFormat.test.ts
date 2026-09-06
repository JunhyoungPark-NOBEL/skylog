import { describe, expect, it } from 'vitest';
import {
  decodeStarPack,
  encodeStarPack,
  STAR_PACK_HEADER_BYTES,
  STAR_PACK_RECORD_BYTES,
  starObjectId,
  type StarRecord,
} from '@/catalog/starPackFormat';
import { isObjectId } from '@/catalog/objectId';

const sample: StarRecord[] = [
  { x: 1, y: 0, z: 0, mag: -1.46, bv: 0.0, hip: 32349, hygId: 32263 },
  { x: 0, y: 0.6, z: 0.8, mag: 6.5, bv: 0.6, hip: 0, hygId: 118084 },
];

describe('starPackFormat v1', () => {
  it('인코딩 크기 = 16 + 28n, 디코딩하면 원본과 같다', () => {
    const buf = encodeStarPack(sample);
    expect(buf.byteLength).toBe(STAR_PACK_HEADER_BYTES + STAR_PACK_RECORD_BYTES * sample.length);
    const pack = decodeStarPack(buf);
    expect(pack.version).toBe(1);
    expect(pack.count).toBe(2);
    expect(Array.from(pack.positions)).toEqual([1, 0, 0, 0, 0.6000000238418579, 0.800000011920929]);
    expect(pack.mag[0]).toBeCloseTo(-1.46, 5);
    expect(pack.hip[0]).toBe(32349);
    expect(pack.hygId[1]).toBe(118084);
  });

  it('매직·크기가 맞지 않으면 오류', () => {
    const buf = encodeStarPack(sample);
    expect(() => decodeStarPack(buf.slice(0, buf.byteLength - 1))).toThrow(/size/);
    const bad = new Uint8Array(buf.slice(0));
    bad[0] = 0x58;
    expect(() => decodeStarPack(bad.buffer)).toThrow(/magic/);
  });

  it('ObjectId 규칙: hip>0 → star:HIP, 아니면 star:HYG', () => {
    expect(starObjectId(32349, 1)).toBe('star:HIP32349');
    expect(starObjectId(0, 118084)).toBe('star:HYG118084');
    expect(isObjectId('star:HIP32349')).toBe(true);
    expect(isObjectId('dso:C41')).toBe(true);
    expect(isObjectId('dso:B33')).toBe(true);
    expect(isObjectId('dso:X1')).toBe(false);
  });
});
