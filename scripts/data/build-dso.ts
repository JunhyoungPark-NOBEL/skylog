/**
 * OpenNGC NGC.csv + addendum.csv (세미콜론 구분) + curated dso-names-ko.csv, caldwell.csv → dso.v1.json
 *
 * 규칙(task-00 §3.3):
 * - 이름 0 채움 제거: NGC0224→NGC224, IC0434→IC434, M040→M40, Mel022→Mel22, C009→C9, B033→B33
 * - id 우선순위 M > NGC > IC > C(콜드웰) > B(바너드) > 기타 이름
 * - 타입 Dup·NonEx·Other 제외(Dup은 마스터에 별칭으로 흡수), 단일 별(*) 제외
 * - 포함: 메시에 110 전부 + 콜드웰 109 + (V-Mag ≤ 10 또는 B-Mag ≤ 10.8 또는 공통 이름 보유)
 */
import path from 'node:path';
import { CURATED_DIR, dmsToDeg, hmsToDeg, RAW_DIR, readCsv, round } from './lib.ts';

export type DsoCategory =
  | 'galaxy'
  | 'openCluster'
  | 'globularCluster'
  | 'planetaryNebula'
  | 'nebula'
  | 'supernovaRemnant'
  | 'other';

export interface DsoOut {
  id: string;
  aliases: string[];
  names: { en?: string; ko?: string; aliasesKo?: string[]; common: string[] };
  /** OpenNGC 타입 코드 */
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
  /** 콜드웰 번호(있으면) */
  caldwell?: number;
  /** 메시에 번호(있으면) */
  messier?: number;
}

export interface DsoBuildResult {
  data: DsoOut[];
  stats: {
    rowsTotal: number;
    included: number;
    messier: number;
    caldwell: number;
    byCategory: Record<string, number>;
    missingMessier: number[];
    missingCaldwell: number[];
    curatedNameUnmatched: string[];
  };
}

const CATEGORY: Record<string, DsoCategory> = {
  G: 'galaxy',
  GPair: 'galaxy',
  GTrpl: 'galaxy',
  GGroup: 'galaxy',
  OCl: 'openCluster',
  '*Ass': 'openCluster',
  'Cl+N': 'openCluster',
  GCl: 'globularCluster',
  PN: 'planetaryNebula',
  HII: 'nebula',
  Neb: 'nebula',
  EmN: 'nebula',
  RfN: 'nebula',
  DrkN: 'nebula',
  SNR: 'supernovaRemnant',
};

/** OpenNGC 이름의 0 채움 제거 → 앱 표기(NGC224, IC434, M40, Mel22, C9, B33, Cr399…) */
export function normalizeName(raw: string): string {
  const m = /^([A-Za-z]+)0*(\d+)(.*)$/.exec(raw.trim());
  if (!m) return raw.trim();
  const prefix = m[1] === 'Cl' ? 'Cr' : m[1]!; // OpenNGC 'Cl399' = Collinder 399
  return `${prefix}${m[2]}${m[3] ?? ''}`;
}

function num(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const SKIP_IDENTIFIER =
  /^(2MASX|IRAS|MCG|CGCG|SDSS|GALEX|WISE|UZC|NPM|LEDA|ESO-LV|NVSS|TXS|PKS|FIRST)/i;

/**
 * 메시에 번호 보정(D-014). OpenNGC는 M102를 M101의 중복으로 두지만(Méchain의 정정 편지 해석),
 * 현대 관측 목록·앱들은 관행적으로 M102 = NGC 5866(방추 은하)로 쓴다. 메시에 110개를 채우기 위해 후자를 따른다.
 */
const MESSIER_OVERRIDES: Record<string, number> = { NGC5866: 102 };

export function buildDso(): DsoBuildResult {
  const rows = [
    ...readCsv(path.join(RAW_DIR, 'NGC.csv'), ';'),
    ...readCsv(path.join(RAW_DIR, 'addendum.csv'), ';'),
  ];
  const koRows = readCsv(path.join(CURATED_DIR, 'dso-names-ko.csv'));
  const caldwellRows = readCsv(path.join(CURATED_DIR, 'caldwell.csv'));

  // 1) 마스터 행 수집 (Dup는 별칭으로만). 메시에 번호가 있는 행은 타입과 무관하게 유지(M73 = 'Other', M40 = '**').
  const dupAliases = new Map<string, string[]>(); // 마스터 정규 이름 → 별칭들
  const dupMaster = new Map<string, string>(); // 중복 이름 → 마스터 정규 이름
  const masters: Record<string, string>[] = [];
  for (const r of rows) {
    const type = r['Type'] ?? '';
    if (type === 'Dup') {
      const ngc = r['NGC'];
      const ic = r['IC'];
      const master = ngc ? normalizeName(`NGC${ngc}`) : ic ? normalizeName(`IC${ic}`) : undefined;
      if (master) {
        const dupName = normalizeName(r['Name']!);
        dupAliases.set(master, [...(dupAliases.get(master) ?? []), dupName]);
        dupMaster.set(dupName, master);
      }
      continue;
    }
    const hasMessier = (r['M'] ?? '') !== '';
    if (!hasMessier && (type === 'NonEx' || type === 'Other' || type === '*' || type === 'Nova'))
      continue;
    masters.push(r);
  }

  // 2) 콜드웰 매핑: ngc_ic → 번호. 슬래시(NGC869/NGC884)는 양쪽 다, 비-NGC는 addendum의 C0xx 행이 담당.
  //    OpenNGC에서 중복(Dup)으로 처리된 이름(C37 NGC6885→NGC6882, C50 NGC2244→NGC2239)은 마스터로 옮긴다.
  //    두 천체로 이루어진 항목(C14 = NGC869/NGC884)은 addendum의 C014 행이 콜드웰 번호를 갖고, 구성 천체는 별칭만 얻는다.
  const caldwellByName = new Map<string, { n: number; nameEn: string; nameKo: string }>();
  const caldwellAliasOnly = new Map<string, number>();
  for (const c of caldwellRows) {
    const n = Number(c['caldwell']);
    const entry = { n, nameEn: c['name_en'] ?? '', nameKo: c['name_ko'] ?? '' };
    const parts = (c['ngc_ic'] ?? '').split('/');
    if (parts.length > 1) {
      caldwellByName.set(`C${n}`, entry);
      for (const part of parts)
        caldwellAliasOnly.set(dupMaster.get(normalizeName(part)) ?? normalizeName(part), n);
      continue;
    }
    let key = /^(NGC|IC)/.test(parts[0]!) ? normalizeName(parts[0]!) : `C${n}`;
    key = dupMaster.get(key) ?? key;
    caldwellByName.set(key, entry);
  }
  const koById = new Map(koRows.map((r) => [normalizeName(r['id']!), r]));
  const koMatched = new Set<string>();

  const data: DsoOut[] = [];
  for (const r of masters) {
    const rawName = normalizeName(r['Name']!);
    const type = r['Type']!;
    const messier = num(r['M']) ?? MESSIER_OVERRIDES[rawName];
    const ngcRef = r['NGC'] ? normalizeName(`NGC${r['NGC']}`) : undefined;
    const icRef = r['IC'] ? normalizeName(`IC${r['IC']}`) : undefined;
    const common = (r['Common names'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // id 결정
    let canonical: string;
    if (messier !== undefined) canonical = `M${messier}`;
    else if (rawName.startsWith('NGC')) canonical = rawName;
    else if (rawName.startsWith('IC')) canonical = rawName;
    else if (ngcRef) canonical = ngcRef;
    else if (icRef) canonical = icRef;
    else canonical = rawName; // C9, C14, C41, C99, B33, Mel/Cr/ESO/PGC/UGC…

    const caldwell = caldwellByName.get(rawName) ?? caldwellByName.get(canonical);
    const ko = koById.get(canonical) ?? koById.get(rawName);
    if (ko) koMatched.add(normalizeName(ko['id']!));

    const magV = num(r['V-Mag']);
    const magB = num(r['B-Mag']);
    const include =
      messier !== undefined ||
      caldwell !== undefined ||
      (magV !== undefined && magV <= 10) ||
      (magV === undefined && magB !== undefined && magB <= 10.8) ||
      common.length > 0 ||
      ko !== undefined;
    if (!include) continue;
    if (type === '**' && messier === undefined && common.length === 0 && ko === undefined) continue;

    // 별칭: 원래 이름, NGC/IC 교차, 메시에, 콜드웰, Dup 이름, 식별자
    const aliases = new Set<string>();
    const push = (v: string | undefined) => {
      if (v && v !== canonical) aliases.add(v);
    };
    push(rawName);
    push(ngcRef);
    push(icRef);
    if (messier !== undefined) push(`M${messier}`);
    if (caldwell) push(`C${caldwell.n}`);
    const aliasOnlyC = caldwellAliasOnly.get(rawName) ?? caldwellAliasOnly.get(canonical);
    if (aliasOnlyC !== undefined) push(`C${aliasOnlyC}`);
    for (const a of dupAliases.get(rawName) ?? []) push(a);
    for (const a of dupAliases.get(canonical) ?? []) push(a);
    for (const ident of (r['Identifiers'] ?? '').split(',')) {
      const t = ident.trim();
      if (!t || SKIP_IDENTIFIER.test(t) || /J\d{4}/.test(t)) continue;
      push(t.replace(/\s+/g, ' '));
    }

    const nameEn = ko?.['name_en'] || caldwell?.nameEn || common[0];
    const nameKo = ko?.['name_ko'] || caldwell?.nameKo || undefined;
    const aliasesKo = (ko?.['alt_names_ko'] ?? '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    const out: DsoOut = {
      id: `dso:${canonical}`,
      aliases: [...aliases],
      names: { common },
      type,
      category: CATEGORY[type] ?? 'other',
      ra: round(hmsToDeg(r['RA']!), 5),
      dec: round(dmsToDeg(r['Dec']!), 5),
      con: r['Const'] ?? '',
    };
    if (nameEn) out.names.en = nameEn;
    if (nameKo) out.names.ko = nameKo;
    if (aliasesKo.length > 0) out.names.aliasesKo = aliasesKo;
    if (magV !== undefined) out.mag = round(magV, 2);
    if (magB !== undefined) out.magB = round(magB, 2);
    const maj = num(r['MajAx']);
    const min = num(r['MinAx']);
    const pa = num(r['PosAng']);
    if (maj !== undefined) out.majAxArcmin = maj;
    if (min !== undefined) out.minAxArcmin = min;
    if (pa !== undefined) out.posAngDeg = pa;
    const pax = num(r['Pax']); // mas
    if (pax !== undefined && pax > 0) out.distLy = round((1000 / pax) * 3.2616, 0);
    if (caldwell) out.caldwell = caldwell.n;
    if (messier !== undefined) out.messier = messier;
    data.push(out);
  }

  // 결정론적 순서: 메시에 → 콜드웰 → 나머지(id 순)
  data.sort((a, b) => {
    const ka = a.messier !== undefined ? 0 : a.caldwell !== undefined ? 1 : 2;
    const kb = b.messier !== undefined ? 0 : b.caldwell !== undefined ? 1 : 2;
    if (ka !== kb) return ka - kb;
    if (ka === 0) return a.messier! - b.messier!;
    if (ka === 1) return a.caldwell! - b.caldwell!;
    return a.id.localeCompare(b.id);
  });

  // 중복 id 제거(같은 정규 이름이 두 행에서 나올 수 있음 — 첫 행 유지)
  const seen = new Set<string>();
  const unique = data.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));

  const messierSet = new Set(unique.filter((d) => d.messier !== undefined).map((d) => d.messier!));
  const caldwellSet = new Set(
    unique.filter((d) => d.caldwell !== undefined).map((d) => d.caldwell!),
  );
  const byCategory: Record<string, number> = {};
  for (const d of unique) byCategory[d.category] = (byCategory[d.category] ?? 0) + 1;

  return {
    data: unique,
    stats: {
      rowsTotal: rows.length,
      included: unique.length,
      messier: messierSet.size,
      caldwell: caldwellSet.size,
      byCategory,
      missingMessier: Array.from({ length: 110 }, (_, i) => i + 1).filter(
        (n) => !messierSet.has(n),
      ),
      missingCaldwell: Array.from({ length: 109 }, (_, i) => i + 1).filter(
        (n) => !caldwellSet.has(n),
      ),
      curatedNameUnmatched: [...koById.keys()].filter((k) => !koMatched.has(k)),
    },
  };
}

/** 검색 인덱스용 별칭(정규화 전) */
export function dsoAliases(d: DsoOut): string[] {
  const out = [d.id.slice(4), ...d.aliases, ...d.names.common];
  if (d.names.en) out.push(d.names.en);
  if (d.names.ko) out.push(d.names.ko);
  if (d.names.aliasesKo) out.push(...d.names.aliasesKo);
  if (d.messier !== undefined) out.push(`Messier ${d.messier}`, `메시에 ${d.messier}`);
  if (d.caldwell !== undefined) out.push(`Caldwell ${d.caldwell}`, `콜드웰 ${d.caldwell}`);
  return out;
}
