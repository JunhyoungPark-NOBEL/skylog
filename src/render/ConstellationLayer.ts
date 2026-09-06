import { raDecToUnitVector, type Vec3 } from '@/astro/coords';
import type { Catalog } from '@/catalog/catalog';
import { slerpPoints } from '@/render/greatCircle';
import { LineLayer } from '@/render/LineLayer';

/** 별자리 선(실선)·경계(대시). 세그먼트 > 3°는 큰 원으로 분할. J2000 → 행렬 + 굴절. */
export class ConstellationLayer {
  readonly lines = new LineLayer({ useMatrix: true, refraction: true, renderOrder: 30 });
  readonly bounds = new LineLayer({
    useMatrix: true,
    refraction: true,
    dashDeg: 1.5,
    renderOrder: 29,
  });

  setCatalog(cat: Catalog): void {
    const linePolys: Vec3[][] = [];
    const boundPolys: Vec3[][] = [];
    for (const c of Object.values(cat.constellations)) {
      for (const seg of c.lines) {
        const pts = seg.map(([ra, dec]) => raDecToUnitVector(ra, dec));
        linePolys.push(subdivide(pts, 3));
      }
      const rings = [c.bounds, ...(c.boundsExtra ?? [])];
      for (const ring of rings) {
        if (ring.length < 2) continue;
        const pts = ring.map(([ra, dec]) => raDecToUnitVector(ra, dec));
        pts.push(pts[0]!);
        boundPolys.push(subdivide(pts, 2));
      }
    }
    this.lines.setPolylines(linePolys);
    this.bounds.setPolylines(boundPolys);
  }

  setMatrix(m: Float32Array): void {
    this.lines.setMatrix(m);
    this.bounds.setMatrix(m);
  }

  dispose(): void {
    this.lines.dispose();
    this.bounds.dispose();
  }
}

function subdivide(pts: Vec3[], maxStepDeg: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const seg = slerpPoints(pts[i]!, pts[i + 1]!, maxStepDeg);
    if (i > 0) seg.shift();
    out.push(...seg);
  }
  return out.length > 0 ? out : pts;
}
