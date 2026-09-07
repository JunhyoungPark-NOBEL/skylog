/**
 * 천체 id → 상세 계산에 필요한 정적 정보(J2000 좌표·등급·크기·거리). 행성·달·태양은 date 기준으로 채운다.
 * 카탈로그에 없는 팩 전용 별(star:HIP…)은 호출자가 `fallback`(SkyScene.objectJ2000)으로 보충한다.
 */
import { bodyKeyFromObjectId, bodyState, type BodyKey } from '@/astro/bodies';
import { angularSeparationRaDec } from '@/astro/coords';
import type { ObserverLike } from '@/astro/frames';
import type { Catalog, ConstellationData, DsoCategory } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { SearchKind } from '@/catalog/searchIndex';
import { FOV_MAX_DEG } from '@/render/projection';

export interface ObjectTarget {
  id: ObjectId;
  kind: SearchKind;
  bodyKey?: BodyKey;
  raJ2000Deg: number;
  decJ2000Deg: number;
  mag?: number;
  distLy?: number;
  majArcmin?: number;
  minArcmin?: number;
  extended: boolean;
  category?: DsoCategory;
  con?: string;
}

export interface J2000Fallback {
  raDeg: number;
  decDeg: number;
  mag?: number;
}

/** 별자리 경계의 최대 각크기(도) */
export function constellationExtentDeg(c: ConstellationData): number {
  const pts = c.bounds;
  let max = 0;
  for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 40))) {
    for (let j = i + 1; j < pts.length; j += Math.max(1, Math.floor(pts.length / 40))) {
      const [ra1, dec1] = pts[i]!;
      const [ra2, dec2] = pts[j]!;
      const d = angularSeparationRaDec(ra1, dec1, ra2, dec2);
      if (d > max) max = d;
    }
  }
  return max || 20;
}

export function resolveTarget(
  cat: Catalog,
  id: ObjectId,
  date: Date,
  observer: ObserverLike,
  fallback?: J2000Fallback | null,
): ObjectTarget | null {
  const bodyKey = bodyKeyFromObjectId(id);
  if (bodyKey) {
    const s = bodyState(bodyKey, date, observer);
    return {
      id,
      kind: bodyKey === 'sun' || bodyKey === 'moon' ? bodyKey : 'planet',
      bodyKey,
      raJ2000Deg: s.raJ2000Deg,
      decJ2000Deg: s.decJ2000Deg,
      mag: s.magnitude,
      extended: false,
    };
  }
  const star = cat.starById.get(id);
  if (star)
    return {
      id,
      kind: 'star',
      raJ2000Deg: star.ra,
      decJ2000Deg: star.dec,
      mag: star.mag,
      distLy: star.distLy,
      extended: false,
      con: star.con,
    };
  const dso = cat.dsoById.get(id);
  if (dso)
    return {
      id,
      kind: 'dso',
      raJ2000Deg: dso.ra,
      decJ2000Deg: dso.dec,
      mag: dso.mag ?? dso.magB,
      distLy: dso.distLy,
      majArcmin: dso.majAxArcmin,
      minArcmin: dso.minAxArcmin,
      extended: dso.category !== 'other' || (dso.majAxArcmin ?? 0) > 1,
      category: dso.category,
      con: dso.con,
    };
  if (id.startsWith('const:')) {
    const abbr = id.slice(6);
    const c = cat.constellations[abbr];
    if (c) {
      const ext = constellationExtentDeg(c);
      return {
        id,
        kind: 'const',
        raJ2000Deg: c.label[0],
        decJ2000Deg: c.label[1],
        majArcmin: ext * 60,
        extended: true,
        con: abbr,
      };
    }
  }
  if (fallback) {
    const m = /^star:/.exec(id);
    if (m)
      return {
        id,
        kind: 'star',
        raJ2000Deg: fallback.raDeg,
        decJ2000Deg: fallback.decDeg,
        mag: fallback.mag,
        extended: false,
      };
  }
  return null;
}

/** "하늘에서 보기" FOV(도): 행성·달 20°, 별 30°, DSO는 크기에 맞춰(최소 15°), 별자리는 경계가 들어가게 */
export function fovForTarget(t: ObjectTarget): number {
  switch (t.kind) {
    case 'planet':
    case 'moon':
    case 'sun':
      return 20;
    case 'star':
      return 30;
    case 'dso': {
      const sizeDeg = (t.majArcmin ?? 0) / 60;
      return Math.min(FOV_MAX_DEG, Math.max(15, sizeDeg * 5, 30));
    }
    case 'const': {
      const ext = (t.majArcmin ?? 20 * 60) / 60;
      return Math.min(FOV_MAX_DEG, Math.max(30, ext * 1.35));
    }
  }
}
