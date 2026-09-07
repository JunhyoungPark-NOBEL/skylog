/**
 * 추천 후보 집합(task-03 §3.6): 행성 7 + 달 + 밝은 고유명 별(mag ≤ 2.5) + 메시에·콜드웰 + 이름 있는 DSO + 유명 이중성 + 계절 대표 별자리.
 * 계절 시그니처·이중성 표는 큐레이션(id는 데이터 팩에 존재함을 테스트로 확인). D-020.
 */
import type { Candidate, SeasonSignature } from '@/astro/recommend';
import type { Catalog } from '@/catalog/catalog';
import { FAMOUS_CONSTELLATIONS } from '@/catalog/famous';
import type { ObjectId } from '@/catalog/objectId';
import { constellationExtentDeg } from '@/catalog/objectTarget';

export interface DoubleStar {
  objectId: ObjectId;
  ko: string;
  en: string;
  separationArcsec: number;
  /** 어떤 장비로 분해되나 */
  splitWith: 'binoculars' | 'telescope';
  /** 90mm로는 드물게만 분해되는 도전 대상 */
  challenge?: boolean;
  note: string;
}

/** 유명 이중성(분리각은 WDS 근사값, 초보자 안내용) */
export const DOUBLE_STARS: DoubleStar[] = [
  { objectId: 'star:HIP95947', ko: '알비레오', en: 'Albireo', separationArcsec: 34.6, splitWith: 'telescope', note: '노랑·파랑 색 대비의 대표(삼각대 고정 15× 쌍안경도 가능)' },
  { objectId: 'star:HIP65378', ko: '미자르·알코르', en: 'Mizar & Alcor', separationArcsec: 708, splitWith: 'binoculars', note: '맨눈 시력 테스트(11.8′). 망원경으로 미자르 자체도 14″ 이중성' },
  { objectId: 'star:HIP9640', ko: '알마크', en: 'Almach', separationArcsec: 9.6, splitWith: 'telescope', note: '주황·청록 대비, 가을' },
  { objectId: 'star:HIP63125', ko: '코르 카롤리', en: 'Cor Caroli', separationArcsec: 19.3, splitWith: 'telescope', note: '봄 하늘의 가장 쉬운 이중성' },
  { objectId: 'star:HIP91919', ko: '거문고자리 엡실론', en: 'Epsilon Lyrae', separationArcsec: 208, splitWith: 'binoculars', note: '"더블 더블" — 쌍안경으로 둘, 망원경 100× 이상으로 넷' },
  { objectId: 'star:HIP36850', ko: '카스토르', en: 'Castor', separationArcsec: 5.6, splitWith: 'telescope', note: '90mm에서 잘 갈라짐, 겨울' },
  { objectId: 'star:HIP11767', ko: '북극성', en: 'Polaris', separationArcsec: 18.2, splitWith: 'telescope', note: '9등급 동반성이 어둡게 보임' },
  { objectId: 'star:HIP24436', ko: '리겔', en: 'Rigel', separationArcsec: 9.4, splitWith: 'telescope', note: '주성이 밝아 시상이 좋아야 함(도전)' },
  { objectId: 'star:HIP80763', ko: '안타레스', en: 'Antares', separationArcsec: 2.6, splitWith: 'telescope', challenge: true, note: '한국에서 고도가 낮아 90mm로는 드물게만 분해' },
  { objectId: 'star:HIP84345', ko: '라스알게티', en: 'Rasalgethi', separationArcsec: 4.6, splitWith: 'telescope', note: '주황·초록빛 대비, 여름' },
  { objectId: 'star:HIP50583', ko: '알기에바', en: 'Algieba', separationArcsec: 4.7, splitWith: 'telescope', note: '황금빛 한 쌍, 봄' },
  { objectId: 'star:HIP102532', ko: '돌고래자리 감마', en: 'Gamma Delphini', separationArcsec: 9, splitWith: 'telescope', note: '노랑·연두, 여름~가을' },
  { objectId: 'star:HIP3821', ko: '카시오페이아자리 에타', en: 'Achird (η Cas)', separationArcsec: 13.4, splitWith: 'telescope', note: '노랑·붉은 동반성, 가을' },
];

export interface SeasonSignatureCurated extends SeasonSignature {
  ko: string;
  en: string;
}

/** 한국(북위 36°) 계절 시그니처 — 저녁 하늘 기준 달. 구성원은 대표 별·별자리·쇼피스 DSO */
export const SEASON_SIGNATURES: SeasonSignatureCurated[] = [
  {
    id: 'springArc',
    ko: '봄의 대곡선',
    en: 'Spring Arc',
    months: [3, 4, 5, 6],
    objectIds: [
      'star:HIP67301', 'star:HIP65378', 'star:HIP62956', 'star:HIP59774', 'star:HIP58001', 'star:HIP53910', 'star:HIP54061',
      'star:HIP69673', 'star:HIP65474', 'star:HIP63125', 'const:UMa', 'const:Boo',
      'dso:M51', 'dso:M101', 'dso:M81', 'dso:M82', 'dso:M97', 'dso:M3', 'dso:Mel111',
    ],
  },
  {
    id: 'springTriangle',
    ko: '봄의 대삼각형',
    en: 'Spring Triangle',
    months: [3, 4, 5, 6],
    objectIds: [
      'star:HIP69673', 'star:HIP65474', 'star:HIP57632', 'star:HIP49669', 'star:HIP50583', 'const:Leo', 'const:Vir', 'const:Boo',
      'dso:M44', 'dso:M65', 'dso:M66', 'dso:M104', 'dso:M64', 'dso:M53', 'dso:M5',
    ],
  },
  {
    id: 'summerTriangle',
    ko: '여름 대삼각형',
    en: 'Summer Triangle',
    months: [6, 7, 8, 9, 10],
    objectIds: [
      'star:HIP91262', 'star:HIP97649', 'star:HIP102098', 'star:HIP95947', 'star:HIP91919', 'const:Lyr', 'const:Cyg', 'const:Aql',
      'dso:M57', 'dso:M27', 'dso:M29', 'dso:M39', 'dso:M56', 'dso:M71', 'dso:NGC7000', 'dso:Cr399',
    ],
  },
  {
    id: 'summerMilkyWay',
    ko: '여름 은하수(전갈·궁수)',
    en: 'Summer Milky Way',
    months: [6, 7, 8, 9],
    objectIds: [
      'star:HIP80763', 'star:HIP90185', 'star:HIP92855', 'star:HIP86032', 'const:Sco', 'const:Sgr', 'const:Her',
      'dso:M4', 'dso:M6', 'dso:M7', 'dso:M8', 'dso:M20', 'dso:M22', 'dso:M17', 'dso:M16', 'dso:M24', 'dso:M25', 'dso:M11', 'dso:M13', 'dso:M92', 'dso:M10', 'dso:M12',
    ],
  },
  {
    id: 'autumnSquare',
    ko: '가을의 페가수스 사각형',
    en: 'Great Square of Pegasus',
    months: [9, 10, 11, 12],
    objectIds: [
      'star:HIP677', 'star:HIP113963', 'star:HIP113881', 'star:HIP1067', 'star:HIP5447', 'star:HIP9640', 'star:HIP113368', 'star:HIP15863', 'star:HIP3179', 'star:HIP746', 'star:HIP4427',
      'const:Peg', 'const:And', 'const:Cas', 'const:Per',
      'dso:M31', 'dso:M32', 'dso:M110', 'dso:M33', 'dso:M15', 'dso:M2', 'dso:NGC869', 'dso:NGC884', 'dso:NGC457', 'dso:NGC7789', 'dso:M52', 'dso:NGC7662', 'dso:M34', 'dso:NGC752', 'dso:NGC7293',
    ],
  },
  {
    id: 'winterHexagon',
    ko: '겨울 다이아몬드',
    en: 'Winter Hexagon',
    months: [12, 1, 2, 3],
    objectIds: [
      'star:HIP32349', 'star:HIP37279', 'star:HIP37826', 'star:HIP36850', 'star:HIP24608', 'star:HIP21421', 'star:HIP24436', 'star:HIP27989', 'star:HIP25336', 'star:HIP26311', 'star:HIP26727', 'star:HIP17702',
      'const:Ori', 'const:Tau', 'const:Gem', 'const:CMa',
      'dso:M42', 'dso:M45', 'dso:C41', 'dso:M35', 'dso:M36', 'dso:M37', 'dso:M38', 'dso:M41', 'dso:M1', 'dso:M78', 'dso:NGC2392', 'dso:NGC2239', 'dso:NGC2264', 'dso:M46', 'dso:M47',
    ],
  },
];

export const BRIGHT_STAR_MAG = 2.5;
/** 다른 id와 중복인 후보(이중성단 C14 = NGC869/884) */
const SKIP_IDS: ReadonlySet<string> = new Set(['dso:C14']);

/** 카탈로그에서 후보를 만든다(한 번 만들어 재사용). */
export function buildCandidates(cat: Catalog): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (c: Candidate) => {
    if (seen.has(c.id) || SKIP_IDS.has(c.id)) return;
    seen.add(c.id);
    out.push(c);
  };
  for (const b of cat.bodies) {
    if (b.kind === 'sun') continue;
    push({
      id: b.id,
      kind: b.kind,
      bodyKey: b.body.toLowerCase() as Candidate['bodyKey'],
      raJ2000Deg: 0,
      decJ2000Deg: 0,
      extended: false,
    });
  }
  const doubles = new Map(DOUBLE_STARS.map((d) => [d.objectId, d]));
  for (const s of cat.stars) {
    const dbl = doubles.get(s.id);
    if (s.mag > BRIGHT_STAR_MAG && !dbl) continue;
    if (!s.en && !s.ko && !dbl) continue;
    const tags: string[] = [];
    if (dbl) tags.push('double');
    if (dbl?.challenge) tags.push('challenge');
    push({
      id: s.id,
      kind: 'star',
      raJ2000Deg: s.ra,
      decJ2000Deg: s.dec,
      mag: s.mag,
      extended: false,
      con: s.con,
      tags: tags.length ? tags : undefined,
      doubleSplit: dbl?.splitWith,
      doubleSepArcsec: dbl?.separationArcsec,
    });
  }
  for (const d of cat.dso) {
    const named = !!(d.names.ko || d.names.en || d.names.common.length);
    if (d.messier === undefined && d.caldwell === undefined && !named) continue;
    push({
      id: d.id,
      kind: 'dso',
      raJ2000Deg: d.ra,
      decJ2000Deg: d.dec,
      mag: d.mag ?? d.magB,
      majArcmin: d.majAxArcmin,
      minArcmin: d.minAxArcmin,
      extended: d.category !== 'other' || (d.majAxArcmin ?? 0) > 1,
      category: d.category,
      con: d.con,
      tags: d.messier !== undefined ? ['messier'] : d.caldwell !== undefined ? ['caldwell'] : undefined,
    });
  }
  for (const id of FAMOUS_CONSTELLATIONS) {
    const abbr = id.slice(6);
    const c = cat.constellations[abbr];
    if (!c) continue;
    push({
      id,
      kind: 'const',
      raJ2000Deg: c.label[0],
      decJ2000Deg: c.label[1],
      majArcmin: constellationExtentDeg(c) * 60,
      extended: true,
      con: abbr,
    });
  }
  return out;
}
