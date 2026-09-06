/**
 * 별 팩 바이너리 포맷 v1 (`stars-bright.v1.bin`, `stars-deep.v1.bin`). 빌드 스크립트와 앱이 공유한다.
 *
 *   헤더 16바이트 (little-endian):
 *     0  'SKYS'  (4B ASCII 매직)
 *     4  u16     version (=1)
 *     6  u32     count
 *    10  6B      reserved (0)
 *   레코드 28바이트 × count:
 *     0  f32 x, 4 f32 y, 8 f32 z   — J2000 적도 좌표계 단위벡터 (x→춘분점, z→천구 북극)
 *    12  f32 mag                   — 겉보기 등급 V
 *    16  f32 bv                    — B−V 색지수 (결측 0.6)
 *    20  u32 hip                   — 히파르코스 번호 (없으면 0)
 *    24  u32 hygId                 — HYG id
 *
 * ObjectId: hip>0 ? `star:HIP<hip>` : `star:HYG<hygId>` (마스터 플랜 §6.1).
 * 포맷을 바꾸면 version을 올리고 DECISIONS에 기록한다.
 */
export const STAR_PACK_MAGIC = 'SKYS';
export const STAR_PACK_VERSION = 1;
export const STAR_PACK_HEADER_BYTES = 16;
export const STAR_PACK_RECORD_BYTES = 28;

export interface StarRecord {
  x: number;
  y: number;
  z: number;
  mag: number;
  bv: number;
  hip: number;
  hygId: number;
}

/** 디코딩 결과: 렌더러가 바로 쓸 수 있는 구조체 배열(SoA) */
export interface StarPack {
  version: number;
  count: number;
  /** count×3, J2000 단위벡터 */
  positions: Float32Array;
  mag: Float32Array;
  bv: Float32Array;
  hip: Uint32Array;
  hygId: Uint32Array;
}

export function encodeStarPack(records: readonly StarRecord[]): ArrayBuffer {
  const buf = new ArrayBuffer(STAR_PACK_HEADER_BYTES + records.length * STAR_PACK_RECORD_BYTES);
  const view = new DataView(buf);
  for (let i = 0; i < 4; i++) view.setUint8(i, STAR_PACK_MAGIC.charCodeAt(i));
  view.setUint16(4, STAR_PACK_VERSION, true);
  view.setUint32(6, records.length, true);
  let off = STAR_PACK_HEADER_BYTES;
  for (const r of records) {
    view.setFloat32(off, r.x, true);
    view.setFloat32(off + 4, r.y, true);
    view.setFloat32(off + 8, r.z, true);
    view.setFloat32(off + 12, r.mag, true);
    view.setFloat32(off + 16, r.bv, true);
    view.setUint32(off + 20, r.hip, true);
    view.setUint32(off + 24, r.hygId, true);
    off += STAR_PACK_RECORD_BYTES;
  }
  return buf;
}

export function decodeStarPack(buf: ArrayBuffer): StarPack {
  const view = new DataView(buf);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (magic !== STAR_PACK_MAGIC) throw new Error(`star pack: bad magic "${magic}"`);
  const version = view.getUint16(4, true);
  if (version !== STAR_PACK_VERSION) throw new Error(`star pack: unsupported version ${version}`);
  const count = view.getUint32(6, true);
  const expected = STAR_PACK_HEADER_BYTES + count * STAR_PACK_RECORD_BYTES;
  if (buf.byteLength !== expected) {
    throw new Error(
      `star pack: size ${buf.byteLength} ≠ expected ${expected} for ${count} records`,
    );
  }
  const positions = new Float32Array(count * 3);
  const mag = new Float32Array(count);
  const bv = new Float32Array(count);
  const hip = new Uint32Array(count);
  const hygId = new Uint32Array(count);
  let off = STAR_PACK_HEADER_BYTES;
  for (let i = 0; i < count; i++) {
    positions[i * 3] = view.getFloat32(off, true);
    positions[i * 3 + 1] = view.getFloat32(off + 4, true);
    positions[i * 3 + 2] = view.getFloat32(off + 8, true);
    mag[i] = view.getFloat32(off + 12, true);
    bv[i] = view.getFloat32(off + 16, true);
    hip[i] = view.getUint32(off + 20, true);
    hygId[i] = view.getUint32(off + 24, true);
    off += STAR_PACK_RECORD_BYTES;
  }
  return { version, count, positions, mag, bv, hip, hygId };
}

export function starObjectId(
  hip: number,
  hygId: number,
): `star:HIP${number}` | `star:HYG${number}` {
  return hip > 0 ? `star:HIP${hip}` : `star:HYG${hygId}`;
}
