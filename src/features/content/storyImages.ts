import {
  DEG,
  angularSeparation,
  raDecToUnitVector,
  unitVectorToRaDec,
  type Vec3,
} from '@/astro/coords';
import type { Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { getObjectPhoto } from '@/catalog/objectPhotos';

/** 두 성단을 함께 담았다고 원문에 명시된 사진만 공유한다. 일반적인 별칭 추정은 하지 않는다. */
export function getStoryPhoto(id: ObjectId) {
  return (
    getObjectPhoto(id) ??
    (id === 'dso:NGC869' || id === 'dso:NGC884' ? getObjectPhoto('dso:C14') : undefined)
  );
}

type Point = { x: number; y: number };
export interface StorySkyChart {
  center: { raDeg: number; decDeg: number };
  fieldDeg: number;
  lines: [Point, Point][];
  stars: (Point & { radius: number })[];
  target: Point | null;
}

const charts = new WeakMap<Catalog, Map<ObjectId, StorySkyChart | null>>();

/** 적도 좌표를 북쪽 위·동쪽 왼쪽의 입체투영 도해로 변환한다. RA 경계·극 부근도 연속이다. */
export function projectStoryPoint(
  raDeg: number,
  decDeg: number,
  center: { raDeg: number; decDeg: number },
  halfFieldDeg: number,
): Point | null {
  const v = raDecToUnitVector(raDeg, decDeg);
  const c = raDecToUnitVector(center.raDeg, center.decDeg);
  const dot = v[0] * c[0] + v[1] * c[1] + v[2] * c[2];
  if (dot < Math.cos(halfFieldDeg * DEG) - 1e-10) return null;
  const ra = center.raDeg * DEG;
  const dec = center.decDeg * DEG;
  const east = -Math.sin(ra) * v[0] + Math.cos(ra) * v[1];
  const north =
    -Math.sin(dec) * Math.cos(ra) * v[0] -
    Math.sin(dec) * Math.sin(ra) * v[1] +
    Math.cos(dec) * v[2];
  const scale = 42 / Math.tan((halfFieldDeg * DEG) / 2) / (1 + dot);
  return { x: 50 - east * scale, y: 50 - north * scale };
}

/** 카탈로그는 이미 공유 로드되어 있다. 도해도 카탈로그·대상별로 한 번 계산해 목록/상세에서 재사용한다. */
export function getStorySkyChart(cat: Catalog, id: ObjectId): StorySkyChart | null {
  let cache = charts.get(cat);
  if (!cache) {
    cache = new Map();
    charts.set(cat, cache);
  }
  if (cache.has(id)) return cache.get(id) ?? null;
  const target = cat.starById.get(id) ?? cat.dsoById.get(id);
  const constellation = id.startsWith('const:') ? cat.constellations[id.slice(6)] : null;
  const pattern = constellation ?? (target ? cat.constellations[target.con] : null);
  const vertices = [
    ...new Map((pattern?.lines.flat() ?? []).map((p) => [p.join(','), p])).values(),
  ];
  if ((!target && !constellation) || (constellation && !vertices.length)) {
    cache.set(id, null);
    return null;
  }

  const sum: Vec3 = [0, 0, 0];
  if (constellation)
    for (const p of vertices) {
      const v = raDecToUnitVector(...p);
      sum[0] += v[0];
      sum[1] += v[1];
      sum[2] += v[2];
    }
  const center = target ? { raDeg: target.ra, decDeg: target.dec } : unitVectorToRaDec(sum);
  const centerVector = raDecToUnitVector(center.raDeg, center.decDeg);
  const halfFieldDeg = constellation
    ? Math.max(
        2,
        ...vertices.map((p) => angularSeparation(centerVector, raDecToUnitVector(...p))),
      ) + 1
    : 15;
  const project = (ra: number, dec: number) => projectStoryPoint(ra, dec, center, halfFieldDeg);
  const lines: StorySkyChart['lines'] = [];
  for (const line of pattern?.lines ?? [])
    for (let i = 1; i < line.length; i++) {
      const a = project(...line[i - 1]!);
      const b = project(...line[i]!);
      if (a && b) lines.push([a, b]);
    }
  const stars: StorySkyChart['stars'] = [];
  for (const star of [...cat.stars].sort((a, b) => a.mag - b.mag)) {
    const p = project(star.ra, star.dec);
    if (p) stars.push({ ...p, radius: Math.max(0.45, Math.min(1.8, 1.7 - star.mag * 0.19)) });
    if (stars.length >= 90) break;
  }
  // 선 끝점은 원 카탈로그에 있는 별 위치다. 밝은 별 목록에 없는 점도 연결 구조를 알아볼 수 있게 표시한다.
  for (const vertex of vertices) {
    const p = project(...vertex);
    if (p && !stars.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 0.2))
      stars.push({ ...p, radius: 0.75 });
  }
  const chart = {
    center,
    fieldDeg: halfFieldDeg * 2,
    lines,
    stars,
    target: target ? { x: 50, y: 50 } : null,
  };
  cache.set(id, chart);
  return chart;
}
