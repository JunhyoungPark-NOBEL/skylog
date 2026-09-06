/**
 * meteors.v1.json (curated/meteors.csv) + bodies.v1.json (행성 7 + 달 + 태양 메타)
 */
import path from 'node:path';
import { CURATED_DIR, readCsv } from './lib.ts';

export interface MeteorShowerOut {
  id: string;
  names: { ko: string; en: string };
  /** 'MM-DD' */
  activeFrom: string;
  activeTo: string;
  peak: string;
  zhr: number;
  /** 복사점 J2000 (도) */
  radiant: { ra: number; dec: number };
  velocityKms?: number;
  parentBody?: string;
  note?: string;
}

export function buildMeteors(): MeteorShowerOut[] {
  const rows = readCsv(path.join(CURATED_DIR, 'meteors.csv'));
  return rows.map((r) => {
    const out: MeteorShowerOut = {
      id: r['id']!,
      names: { ko: r['name_ko']!, en: r['name_en']! },
      activeFrom: r['active_from']!,
      activeTo: r['active_to']!,
      peak: r['peak']!,
      zhr: Number(r['zhr']),
      radiant: { ra: Number(r['ra_deg']), dec: Number(r['dec_deg']) },
    };
    if (r['velocity_kms']) out.velocityKms = Number(r['velocity_kms']);
    if (r['parent_body']) out.parentBody = r['parent_body'];
    if (r['note']) out.note = r['note'];
    return out;
  });
}

export interface BodyOut {
  id: string;
  /** astronomy-engine `Body` enum 이름 */
  body: string;
  names: { ko: string; en: string };
  icon: string;
  kind: 'planet' | 'moon' | 'sun';
  /** 관측 관련 힌트(추천·상세에서 사용) */
  hints?: { nakedEye: boolean; danger?: 'sun' };
}

export function buildBodies(): BodyOut[] {
  return [
    {
      id: 'sun',
      body: 'Sun',
      names: { ko: '태양', en: 'Sun' },
      icon: 'sun',
      kind: 'sun',
      hints: { nakedEye: true, danger: 'sun' },
    },
    {
      id: 'moon',
      body: 'Moon',
      names: { ko: '달', en: 'Moon' },
      icon: 'moon',
      kind: 'moon',
      hints: { nakedEye: true },
    },
    {
      id: 'planet:mercury',
      body: 'Mercury',
      names: { ko: '수성', en: 'Mercury' },
      icon: 'mercury',
      kind: 'planet',
      hints: { nakedEye: true },
    },
    {
      id: 'planet:venus',
      body: 'Venus',
      names: { ko: '금성', en: 'Venus' },
      icon: 'venus',
      kind: 'planet',
      hints: { nakedEye: true },
    },
    {
      id: 'planet:mars',
      body: 'Mars',
      names: { ko: '화성', en: 'Mars' },
      icon: 'mars',
      kind: 'planet',
      hints: { nakedEye: true },
    },
    {
      id: 'planet:jupiter',
      body: 'Jupiter',
      names: { ko: '목성', en: 'Jupiter' },
      icon: 'jupiter',
      kind: 'planet',
      hints: { nakedEye: true },
    },
    {
      id: 'planet:saturn',
      body: 'Saturn',
      names: { ko: '토성', en: 'Saturn' },
      icon: 'saturn',
      kind: 'planet',
      hints: { nakedEye: true },
    },
    {
      id: 'planet:uranus',
      body: 'Uranus',
      names: { ko: '천왕성', en: 'Uranus' },
      icon: 'uranus',
      kind: 'planet',
      hints: { nakedEye: false },
    },
    {
      id: 'planet:neptune',
      body: 'Neptune',
      names: { ko: '해왕성', en: 'Neptune' },
      icon: 'neptune',
      kind: 'planet',
      hints: { nakedEye: false },
    },
  ];
}
