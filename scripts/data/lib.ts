/**
 * 데이터 스크립트 공용 유틸: 경로, 해시, CSV, 결정론적 JSON 출력, 각도 변환.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const RAW_DIR = path.join(ROOT, 'data-src', 'raw');
export const CURATED_DIR = path.join(ROOT, 'data-src', 'curated');
export const CONTENT_RAW_DIR = path.join(ROOT, 'data-src', 'content-raw');
export const OUT_DIR = path.join(ROOT, 'public', 'data');
export const SOURCES_JSON = path.join(RAW_DIR, 'sources.json');

/** 원본 파일 정의. `pnpm data:fetch`가 내려받고, 빌드는 이미 있는 파일을 재사용한다. */
export interface SourceSpec {
  key: string;
  /** data-src/raw/ 아래 파일명 */
  file: string;
  url: string;
  license: string;
  /** 원본 프로젝트 페이지(문서용) */
  homepage: string;
  note?: string;
}

export const SOURCES: SourceSpec[] = [
  {
    key: 'hyg',
    file: 'hyg_v44.csv.gz',
    // 파일명은 codeberg API로 data/hyg/CURRENT/를 나열해 확인(T0b 2026-09-06: hyg_v44.csv.gz).
    // 저장소는 Git LFS를 쓰므로 raw/ 대신 media/ 엔드포인트를 사용한다.
    url: 'https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz',
    license: 'CC BY-SA 4.0',
    homepage: 'https://codeberg.org/astronexus/hyg',
  },
  {
    key: 'openngc',
    file: 'NGC.csv',
    url: 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv',
    license: 'CC BY-SA 4.0',
    homepage: 'https://github.com/mattiaverga/OpenNGC',
  },
  {
    key: 'openngc-addendum',
    file: 'addendum.csv',
    url: 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/addendum.csv',
    license: 'CC BY-SA 4.0',
    homepage: 'https://github.com/mattiaverga/OpenNGC',
  },
  {
    key: 'd3c-constellations',
    file: 'constellations.json',
    url: 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json',
    license: 'BSD-3-Clause (d3-celestial; 이름 데이터: IAU 공개)',
    homepage: 'https://github.com/ofrohn/d3-celestial',
  },
  {
    key: 'd3c-lines',
    file: 'constellations.lines.json',
    url: 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json',
    license: 'BSD-3-Clause (d3-celestial)',
    homepage: 'https://github.com/ofrohn/d3-celestial',
  },
  {
    key: 'd3c-bounds',
    file: 'constellations.bounds.json',
    url: 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.bounds.json',
    license: 'BSD-3-Clause (d3-celestial; 경계: IAU / Davenhall & Leggett 1989)',
    homepage: 'https://github.com/ofrohn/d3-celestial',
  },
  {
    key: 'd3c-milkyway',
    file: 'mw.json',
    url: 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/mw.json',
    license: 'BSD-3-Clause (d3-celestial; 윤곽: Milky Way Outline Catalog, Jose R. Vieira)',
    homepage: 'https://github.com/ofrohn/d3-celestial',
    note: 'NASA SVS 은하수 이미지는 직접 파일 요청이 403이라 사용하지 않음(D-017)',
  },
];

export interface SourceRecord {
  key: string;
  file: string;
  url: string;
  license: string;
  bytes: number;
  sha256: string;
  fetchedAt: string;
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function sha256Of(buf: Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex');
}

export function sha256File(file: string): string {
  return sha256Of(readFileSync(file));
}

export function fileSize(file: string): number {
  return statSync(file).size;
}

export function readSources(): SourceRecord[] {
  if (!existsSync(SOURCES_JSON)) return [];
  return JSON.parse(readFileSync(SOURCES_JSON, 'utf8')) as SourceRecord[];
}

export function writeSources(records: SourceRecord[]): void {
  ensureDir(RAW_DIR);
  writeFileSync(SOURCES_JSON, JSON.stringify(records, null, 2) + '\n');
}

/** JSON을 결정론적으로(키 순서 유지, 줄바꿈 LF) 쓴다. */
export function writeJson(file: string, value: unknown, pretty = false): number {
  ensureDir(path.dirname(file));
  const text = pretty ? JSON.stringify(value, null, 2) + '\n' : JSON.stringify(value);
  writeFileSync(file, text);
  return Buffer.byteLength(text);
}

/**
 * 간단한 CSV 파서(RFC 4180: 따옴표·이스케이프 처리). 헤더 행을 키로 쓴다.
 * 큰 파일(HYG 12만 행)도 문자열 한 번 순회로 처리한다.
 */
export function parseCsv(text: string, delimiter = ','): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift();
  if (!header) return [];
  return rows
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''))
    .map((r) => {
      const o: Record<string, string> = {};
      header.forEach((h, i) => {
        o[h.trim()] = (r[i] ?? '').trim();
      });
      return o;
    });
}

export function readCsv(file: string, delimiter = ','): Record<string, string>[] {
  return parseCsv(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), delimiter);
}

/** CSV 필드 이스케이프 */
export function csvField(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeCsv(file: string, header: string[], rows: unknown[][]): void {
  ensureDir(path.dirname(file));
  const lines = [header.join(','), ...rows.map((r) => r.map(csvField).join(','))];
  writeFileSync(file, lines.join('\n') + '\n');
}

export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** "HH:MM:SS.ss" → 도 */
export function hmsToDeg(s: string): number {
  const [h, m, sec] = s.split(':').map(Number) as [number, number, number];
  return 15 * (h + m / 60 + (sec || 0) / 3600);
}

/** "±DD:MM:SS.s" → 도 */
export function dmsToDeg(s: string): number {
  const sign = s.trim().startsWith('-') ? -1 : 1;
  const [d, m, sec] = s.replace(/^[+-]/, '').split(':').map(Number) as [number, number, number];
  return sign * (d + m / 60 + (sec || 0) / 3600);
}

export function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** 검색 인덱스용 별칭 정규화 (docs/ARCHITECTURE.md에 규칙 문서화) */
// 검색 정규화는 앱(`src/catalog/normalize.ts`)과 같은 함수를 쓴다(D-019) — 빌드와 질의가 어긋나지 않게.
export { normalizeAlias } from '../../src/catalog/normalize.ts';

const GREEK: Record<string, string> = {
  α: 'alpha',
  β: 'beta',
  γ: 'gamma',
  δ: 'delta',
  ε: 'epsilon',
  ζ: 'zeta',
  η: 'eta',
  θ: 'theta',
  ι: 'iota',
  κ: 'kappa',
  λ: 'lambda',
  μ: 'mu',
  ν: 'nu',
  ξ: 'xi',
  ο: 'omicron',
  π: 'pi',
  ρ: 'rho',
  σ: 'sigma',
  τ: 'tau',
  υ: 'upsilon',
  φ: 'phi',
  χ: 'chi',
  ψ: 'psi',
  ω: 'omega',
};
/** HYG bayer 약어(Alp, Bet, …) → 그리스 문자 */
const BAYER_ABBR: Record<string, string> = {
  Alp: 'α',
  Bet: 'β',
  Gam: 'γ',
  Del: 'δ',
  Eps: 'ε',
  Zet: 'ζ',
  Eta: 'η',
  The: 'θ',
  Iot: 'ι',
  Kap: 'κ',
  Lam: 'λ',
  Mu: 'μ',
  Nu: 'ν',
  Xi: 'ξ',
  Omi: 'ο',
  Pi: 'π',
  Rho: 'ρ',
  Sig: 'σ',
  Tau: 'τ',
  Ups: 'υ',
  Phi: 'φ',
  Chi: 'χ',
  Psi: 'ψ',
  Ome: 'ω',
};

export function greekName(letter: string): string | undefined {
  return GREEK[letter];
}

/** 그리스 문자 한글 표기(검색용: "알파 오리온자리") */
const GREEK_KO: Record<string, string> = {
  α: '알파',
  β: '베타',
  γ: '감마',
  δ: '델타',
  ε: '엡실론',
  ζ: '제타',
  η: '에타',
  θ: '세타',
  ι: '이오타',
  κ: '카파',
  λ: '람다',
  μ: '뮤',
  ν: '뉴',
  ξ: '크시',
  ο: '오미크론',
  π: '파이',
  ρ: '로',
  σ: '시그마',
  τ: '타우',
  υ: '입실론',
  φ: '피',
  χ: '카이',
  ψ: '프시',
  ω: '오메가',
};

export function greekNameKo(letter: string): string | undefined {
  return GREEK_KO[letter];
}

/** "Alp", "Alp-2", "Bet" 등 HYG bayer 필드 → { greek: 'α', abbr: 'Alp', suffix?: '2' } */
export function parseBayer(
  bayer: string,
): { greek: string; abbr: string; suffix: string | undefined } | undefined {
  const m = /^([A-Z][a-z]{1,2})(?:-(\d+))?$/.exec(bayer.trim());
  if (!m) return undefined;
  const abbr = m[1]!;
  const greek = BAYER_ABBR[abbr];
  if (!greek) return undefined;
  return { greek, abbr, suffix: m[2] };
}

export function log(msg: string): void {
  console.log(`[data] ${msg}`);
}

export function fail(msg: string): never {
  console.error(`[data] ERROR: ${msg}`);
  process.exit(1);
}
