/**
 * d3-celestial mw.json(은하수 윤곽 5단계 MultiPolygon, [lon −180..180, lat]) → 등적색 회색조 텍스처
 *   public/data/milkyway.v1.png (1024×512). x = RA/360·W (오른쪽으로 증가), y = (90 − Dec)/180·H.
 * 렌더러는 J2000 방향에서 (u = RA/360, v = 0.5 + Dec/180)로 샘플한다(MilkyWayLayer, D-017).
 * 링이 ±180° 경계를 넘는 경우(8개)는 경도를 연속되게 풀고(unwrap) x 오프셋 −W/0/+W로 세 번 그려 빈틈을 없앤다.
 * 원본 출처: Milky Way Outline Catalog(Jose R. Vieira) → d3-celestial(BSD-3).
 */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { RAW_DIR } from './lib.ts';

const W = 1024;
const H = 512;

interface Feature {
  id: string;
  geometry: { type: string; coordinates: number[][][][] };
}

/** 단계별 누적 밝기(ol1 바깥 → ol5 중심). 겹쳐 그리므로 중심이 가장 밝다. */
const LEVEL_ALPHA: Record<string, number> = {
  ol1: 0.16,
  ol2: 0.18,
  ol3: 0.2,
  ol4: 0.22,
  ol5: 0.24,
};

function unwrapRing(ring: number[][]): [number, number][] {
  const out: [number, number][] = [];
  let offset = 0;
  let prev: number | null = null;
  for (const pt of ring) {
    const lon = pt[0]!;
    const lat = pt[1]!;
    let x = lon + offset;
    if (prev !== null) {
      while (x - prev > 180) {
        offset -= 360;
        x -= 360;
      }
      while (x - prev < -180) {
        offset += 360;
        x += 360;
      }
    }
    prev = x;
    out.push([x, lat]);
  }
  return out;
}

/** lon(연속값) → x = lon/360·W + dx. lon 0 = RA 0 → x = dx. 오프셋 {−W, 0, +W}로 0..W 구간을 모두 덮는다. */
function ringToPath(ring: [number, number][], dx: number): string {
  return (
    ring
      .map(([lon, lat], i) => {
        const px = (lon / 360) * W + dx;
        const py = ((90 - lat) / 180) * H;
        return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(' ') + ' Z'
  );
}

export async function buildMilkyWay(): Promise<Buffer> {
  const mw = JSON.parse(readFileSync(path.join(RAW_DIR, 'mw.json'), 'utf8')) as {
    features: Feature[];
  };
  const paths: string[] = [];
  for (const f of mw.features) {
    const alpha = LEVEL_ALPHA[f.id] ?? 0.18;
    for (const poly of f.geometry.coordinates) {
      for (const ring of poly) {
        const unwrapped = unwrapRing(ring);
        for (const dx of [-W, 0, W]) {
          paths.push(
            `<path d="${ringToPath(unwrapped, dx)}" fill="white" fill-opacity="${alpha}" fill-rule="evenodd"/>`,
          );
        }
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="black"/>${paths.join('')}</svg>`;
  return sharp(Buffer.from(svg))
    .blur(3)
    .grayscale()
    .png({ compressionLevel: 9, palette: true, colors: 64 })
    .toBuffer();
}
