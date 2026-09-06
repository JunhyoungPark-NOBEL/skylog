/**
 * 인메모리 카탈로그: 이름 있는 별·별자리·DSO·천체 메타를 한 번 로드해 id로 조회한다.
 * 렌더러(라벨·hit-test·툴팁)와 T3(검색·상세)가 공유한다. 별 위치 버퍼는 starPack.ts(별도).
 */
import { raDecToUnitVector } from '@/astro/coords';
import { dataUrl } from '@/catalog/manifest';
import type { ObjectId } from '@/catalog/objectId';

export interface NamedStar {
  id: ObjectId;
  hip: number;
  hygId: number;
  en?: string;
  ko?: string;
  traditionalKo?: string;
  aliasesKo?: string[];
  bayer?: string;
  bayerAbbr?: string;
  flam?: number;
  con: string;
  spect?: string;
  distLy?: number;
  mag: number;
  ra: number;
  dec: number;
}

export interface ConstellationData {
  en: string;
  ko: string;
  genitive?: string;
  label: [number, number];
  lines: [number, number][][];
  bounds: [number, number][];
  boundsExtra?: [number, number][][];
  season?: string;
}

export type DsoCategory =
  | 'galaxy'
  | 'openCluster'
  | 'globularCluster'
  | 'planetaryNebula'
  | 'nebula'
  | 'supernovaRemnant'
  | 'other';

export interface DsoData {
  id: ObjectId;
  aliases: string[];
  names: { en?: string; ko?: string; aliasesKo?: string[]; common: string[] };
  type: string;
  category: DsoCategory;
  ra: number;
  dec: number;
  mag?: number;
  magB?: number;
  majAxArcmin?: number;
  minAxArcmin?: number;
  posAngDeg?: number;
  con: string;
  distLy?: number;
  messier?: number;
  caldwell?: number;
}

export interface BodyData {
  id: ObjectId;
  body: string;
  names: { ko: string; en: string };
  icon: string;
  kind: 'planet' | 'moon' | 'sun';
  hints?: { nakedEye: boolean; danger?: 'sun' };
}

export interface Catalog {
  stars: NamedStar[];
  starById: Map<string, NamedStar>;
  /** 이름 있는 별의 J2000 단위벡터(라벨·hit-test용), stars 순서 */
  starVectors: Float32Array;
  constellations: Record<string, ConstellationData>;
  dso: DsoData[];
  dsoById: Map<string, DsoData>;
  dsoVectors: Float32Array;
  bodies: BodyData[];
  bodyById: Map<string, BodyData>;
}

let promise: Promise<Catalog> | null = null;

async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(dataUrl(file));
  if (!res.ok) throw new Error(`catalog: ${file} HTTP ${res.status}`);
  return (await res.json()) as T;
}

function packVectors(items: { ra: number; dec: number }[]): Float32Array {
  const out = new Float32Array(items.length * 3);
  items.forEach((s, i) => {
    const v = raDecToUnitVector(s.ra, s.dec);
    out[i * 3] = v[0];
    out[i * 3 + 1] = v[1];
    out[i * 3 + 2] = v[2];
  });
  return out;
}

/** 카탈로그를 로드한다(한 번만). */
export function loadCatalog(): Promise<Catalog> {
  if (!promise) {
    promise = (async () => {
      const [stars, constellations, dso, bodies] = await Promise.all([
        fetchJson<NamedStar[]>('stars-bright.v1.json'),
        fetchJson<Record<string, ConstellationData>>('constellations.v1.json'),
        fetchJson<DsoData[]>('dso.v1.json'),
        fetchJson<BodyData[]>('bodies.v1.json'),
      ]);
      return {
        stars,
        starById: new Map(stars.map((s) => [s.id, s])),
        starVectors: packVectors(stars),
        constellations,
        dso,
        dsoById: new Map(dso.map((d) => [d.id, d])),
        dsoVectors: packVectors(dso),
        bodies,
        bodyById: new Map(bodies.map((b) => [b.id, b])),
      };
    })();
    promise.catch(() => {
      promise = null;
    });
  }
  return promise;
}

export type Lang = 'ko' | 'en';

/** 표시 이름: 한글(있으면) → 영문/기호 폴백 (마스터 플랜 §6.6) */
export function displayName(cat: Catalog, id: ObjectId, lang: Lang): string {
  const star = cat.starById.get(id);
  if (star) {
    const ko = star.ko ?? star.traditionalKo;
    const en =
      star.en ??
      (star.bayer ? `${star.bayer} ${star.con}` : star.flam ? `${star.flam} ${star.con}` : id);
    return lang === 'ko' ? (ko ?? en) : en;
  }
  const dso = cat.dsoById.get(id);
  if (dso) {
    const en = dso.names.en ?? id.slice(4);
    return lang === 'ko' ? (dso.names.ko ?? en) : en;
  }
  const body = cat.bodyById.get(id);
  if (body) return lang === 'ko' ? body.names.ko : body.names.en;
  if (id.startsWith('const:')) {
    const c = cat.constellations[id.slice(6)];
    if (c) return lang === 'ko' ? c.ko : c.en;
  }
  return id;
}

/** 부이름: 한글 표시 중이면 영문/기호, 영문 표시면 기호 */
export function secondaryName(cat: Catalog, id: ObjectId, lang: Lang): string | undefined {
  const star = cat.starById.get(id);
  if (star) {
    const desig = star.bayer
      ? `${star.bayer} ${star.con}`
      : star.flam
        ? `${star.flam} ${star.con}`
        : `HIP ${star.hip}`;
    if (lang === 'ko' && star.en) return `${star.en} · ${desig}`;
    return desig;
  }
  const dso = cat.dsoById.get(id);
  if (dso) {
    const cat1 = id.slice(4);
    const parts = [cat1, ...dso.aliases.filter((a) => /^(NGC|IC|C|Mel|Cr)\d/.test(a)).slice(0, 2)];
    if (lang === 'ko' && dso.names.en) parts.unshift(dso.names.en);
    return parts.join(' · ');
  }
  return undefined;
}

/** 테스트 전용 */
export function _resetCatalogForTesting(): void {
  promise = null;
}
