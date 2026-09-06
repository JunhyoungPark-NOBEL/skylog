/**
 * HYG v4.4 → stars-bright.v1.bin (mag ≤ 6.5) · stars-deep.v1.bin (mag ≤ 9.0) · stars-bright.v1.json (이름/메타)
 * - 태양(id 0) 제외, RA 시간→도, 단위벡터는 J2000 적도 좌표계.
 * - 레코드는 등급 오름차순(같으면 HYG id) 정렬 → 결정론적 출력 + 렌더러 LOD에 유리.
 */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { encodeStarPack, type StarRecord } from '../../src/catalog/starPackFormat.ts';
import {
  CURATED_DIR,
  greekName,
  greekNameKo,
  parseBayer,
  parseCsv,
  RAW_DIR,
  readCsv,
  round,
} from './lib.ts';

export const BRIGHT_MAG_LIMIT = 6.5;
export const DEEP_MAG_LIMIT = 9.0;
const PC_TO_LY = 3.2616;
const HYG_UNKNOWN_DIST_PC = 100000;

/** stars-bright.v1.json 항목 */
export interface NamedStarOut {
  id: string;
  hip: number;
  hygId: number;
  /** IAU/통용 영문 고유명 */
  en?: string;
  ko?: string;
  traditionalKo?: string;
  aliasesKo?: string[];
  /** 그리스 문자 Bayer(예: "α", "α2") */
  bayer?: string;
  /** Bayer 라틴 약어(예: "Alp") — 검색 별칭용 */
  bayerAbbr?: string;
  flam?: number;
  con: string;
  spect?: string;
  distLy?: number;
  mag: number;
  /** J2000 도 — 팩 없이도 상세·검색이 좌표를 쓸 수 있게 포함 */
  ra: number;
  dec: number;
}

export interface StarsBuildResult {
  bright: ArrayBuffer;
  deep: ArrayBuffer;
  named: NamedStarOut[];
  stats: {
    total: number;
    bright: number;
    deep: number;
    named: number;
    withHip: number;
    magBins: Record<string, number>;
    curatedUnmatchedHip: number[];
  };
}

interface HygRow {
  id: number;
  hip: number;
  proper: string;
  raDeg: number;
  dec: number;
  distPc: number;
  mag: number;
  ci: number | null;
  spect: string;
  bayer: string;
  flam: string;
  con: string;
}

function parseHyg(): HygRow[] {
  const gz = readFileSync(path.join(RAW_DIR, 'hyg_v44.csv.gz'));
  const text = gunzipSync(gz).toString('utf8');
  const rows = parseCsv(text);
  const out: HygRow[] = [];
  for (const r of rows) {
    const id = Number(r['id']);
    if (!Number.isFinite(id) || id === 0) continue; // 태양 제외
    const mag = Number(r['mag']);
    if (!Number.isFinite(mag)) continue;
    const ci = r['ci'] === '' || r['ci'] === undefined ? null : Number(r['ci']);
    out.push({
      id,
      hip: r['hip'] ? Number(r['hip']) : 0,
      proper: r['proper'] ?? '',
      raDeg: Number(r['ra']) * 15,
      dec: Number(r['dec']),
      distPc: Number(r['dist']),
      mag,
      ci: ci !== null && Number.isFinite(ci) ? ci : null,
      spect: r['spect'] ?? '',
      bayer: r['bayer'] ?? '',
      flam: r['flam'] ?? '',
      con: r['con'] ?? '',
    });
  }
  return out;
}

function toRecord(s: HygRow): StarRecord {
  const ra = (s.raDeg * Math.PI) / 180;
  const dec = (s.dec * Math.PI) / 180;
  const cd = Math.cos(dec);
  return {
    x: cd * Math.cos(ra),
    y: cd * Math.sin(ra),
    z: Math.sin(dec),
    mag: s.mag,
    bv: s.ci ?? 0.6,
    hip: s.hip,
    hygId: s.id,
  };
}

export function buildStars(): StarsBuildResult {
  const stars = parseHyg();
  stars.sort((a, b) => a.mag - b.mag || a.id - b.id);

  const bright = stars.filter((s) => s.mag <= BRIGHT_MAG_LIMIT);
  const deep = stars.filter((s) => s.mag <= DEEP_MAG_LIMIT);

  const curated = readCsv(path.join(CURATED_DIR, 'star-names-ko.csv'));
  const curatedByHip = new Map(curated.map((r) => [Number(r['hip']), r]));
  const starByHip = new Map<number, HygRow>();
  for (const s of stars) if (s.hip > 0 && !starByHip.has(s.hip)) starByHip.set(s.hip, s);

  // 이름/메타가 있는 별: 고유명 또는 Bayer/Flamsteed가 있는 밝은 별(≤6.5), 그리고 고유명·큐레이션 이름은 등급 무관
  const named: NamedStarOut[] = [];
  for (const s of deep) {
    const cur = s.hip > 0 ? curatedByHip.get(s.hip) : undefined;
    const hasDesignation = s.bayer !== '' || s.flam !== '';
    const hasName = s.proper !== '' || cur !== undefined;
    if (!hasName && !(hasDesignation && s.mag <= BRIGHT_MAG_LIMIT)) continue;

    const out: NamedStarOut = {
      id: s.hip > 0 ? `star:HIP${s.hip}` : `star:HYG${s.id}`,
      hip: s.hip,
      hygId: s.id,
      con: s.con,
      mag: round(s.mag, 2),
      ra: round(s.raDeg, 5),
      dec: round(s.dec, 5),
    };
    const en = cur?.['iau_name_en'] || s.proper;
    if (en) out.en = en;
    if (cur?.['name_ko']) out.ko = cur['name_ko'];
    if (cur?.['traditional_ko']) out.traditionalKo = cur['traditional_ko'];
    const b = parseBayer(s.bayer);
    if (b) {
      out.bayer = b.suffix ? `${b.greek}${b.suffix}` : b.greek;
      out.bayerAbbr = b.suffix ? `${b.abbr}${b.suffix}` : b.abbr;
    } else if (s.bayer) {
      // 그리스 문자가 아닌 지정(예: "82G" 82 G. Eridani)은 약어로만 보존
      out.bayerAbbr = s.bayer;
    }
    if (s.flam) out.flam = Number(s.flam);
    if (s.spect) out.spect = s.spect;
    if (s.distPc > 0 && s.distPc < HYG_UNKNOWN_DIST_PC) out.distLy = round(s.distPc * PC_TO_LY, 1);
    named.push(out);
  }

  const curatedUnmatchedHip = [...curatedByHip.keys()].filter((h) => !starByHip.has(h));

  const magBins: Record<string, number> = {};
  for (const s of stars) {
    const bin = s.mag < 0 ? '<0' : `${Math.floor(s.mag)}`;
    magBins[bin] = (magBins[bin] ?? 0) + 1;
  }

  return {
    bright: encodeStarPack(bright.map(toRecord)),
    deep: encodeStarPack(deep.map(toRecord)),
    named,
    stats: {
      total: stars.length,
      bright: bright.length,
      deep: deep.length,
      named: named.length,
      withHip: stars.filter((s) => s.hip > 0).length,
      magBins,
      curatedUnmatchedHip,
    },
  };
}

/** 검색 인덱스용: 별 하나의 별칭 목록(정규화 전). conKo는 별자리 한글 이름(예: "오리온자리"). */
export function starAliases(s: NamedStarOut, conKo?: string): string[] {
  const out: string[] = [];
  if (s.en) out.push(s.en);
  if (s.ko) out.push(s.ko);
  if (s.traditionalKo) out.push(s.traditionalKo);
  if (s.aliasesKo) out.push(...s.aliasesKo);
  if (s.bayer && s.con) {
    const greek = s.bayer.replace(/\d+$/, '');
    const suffix = s.bayer.slice(greek.length);
    const latin = greekName(greek);
    const ko = greekNameKo(greek);
    out.push(`${s.bayer} ${s.con}`);
    if (latin) out.push(`${latin}${suffix} ${s.con}`);
    if (ko && conKo) {
      out.push(`${ko}${suffix} ${conKo}`, `${ko}${suffix} ${conKo.replace(/자리$/, '')}`);
    }
  }
  if (s.bayerAbbr && s.con) out.push(`${s.bayerAbbr} ${s.con}`);
  if (s.flam && s.con) out.push(`${s.flam} ${s.con}`);
  if (s.hip) out.push(`HIP ${s.hip}`);
  else out.push(`HYG ${s.hygId}`);
  return out;
}
