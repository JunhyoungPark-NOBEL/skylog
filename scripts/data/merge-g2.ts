/**
 * GPT Pro G2 산출물(plan/research/*.csv) → data-src/curated/*.csv 병합 (재실행 가능, 결정론적).
 *
 * 규칙(D-016):
 * - constellations: G2(한국천문학회 표) 우선 — name_ko·season·note·source·confidence 전부 교체, needs_review=false(high).
 * - stars: 기존 name_ko(통용 표기)·traditional_ko(유명 전통 이름) 유지. G2 표기가 다르면 `aliases_ko`에 추가.
 *   G2에만 있는 별은 그대로 추가. needs_review = (confidence low || name_ko 빈칸).
 * - dso: 기존 name_ko 유지, G2 name_ko는 alt_names_ko에 합침. G2에만 있는 id 추가.
 * - caldwell: ngc_ic는 두 출처가 전부 일치(검증 완료 → needs_review=false). name_ko는 기존 우선, 없으면 G2. type은 OpenNGC 코드 유지.
 */
import path from 'node:path';
import { CURATED_DIR, readCsv, ROOT, writeCsv } from './lib.ts';

const RESEARCH_DIR = path.join(ROOT, 'plan', 'research');
type Row = Record<string, string>;

function uniq(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}
function splitAliases(s: string | undefined): string[] {
  return uniq((s ?? '').split(/[|;]/));
}
function log(msg: string): void {
  console.log(`[merge-g2] ${msg}`);
}

function mergeConstellations(): void {
  const research = readCsv(path.join(RESEARCH_DIR, 'constellations_ko.csv'));
  const curated = readCsv(path.join(CURATED_DIR, 'constellations-ko.csv'));
  const byId = new Map(curated.map((r) => [r['iau_abbr']!, r]));
  const header = [
    'iau_abbr',
    'name_en',
    'name_ko',
    'genitive_en',
    'season_kr',
    'note',
    'source',
    'confidence',
    'needs_review',
  ];
  const out: Row[] = [];
  let changed = 0;
  for (const r of research) {
    const c = byId.get(r['iau_abbr']!);
    if (c && c['name_ko'] !== r['name_ko']) {
      changed++;
      log(`constellation ${r['iau_abbr']}: ${c['name_ko']} → ${r['name_ko']}`);
    }
    out.push({
      iau_abbr: r['iau_abbr']!,
      name_en: r['name_en'] || c?.['name_en'] || '',
      name_ko: r['name_ko'] || c?.['name_ko'] || '',
      genitive_en: r['genitive_en'] || c?.['genitive_en'] || '',
      season_kr: r['season_kr'] || c?.['season_kr'] || '',
      note: r['note'] || c?.['note'] || '',
      source: r['source'] || c?.['source'] || '',
      confidence: r['confidence'] || c?.['confidence'] || 'medium',
      needs_review: r['confidence'] === 'high' ? 'false' : 'true',
    });
  }
  out.sort((a, b) => a['iau_abbr']!.localeCompare(b['iau_abbr']!));
  writeCsv(
    path.join(CURATED_DIR, 'constellations-ko.csv'),
    header,
    out.map((r) => header.map((h) => r[h])),
  );
  log(`constellations: ${out.length} rows, ${changed} name changes`);
}

function mergeStars(): void {
  const research = readCsv(path.join(RESEARCH_DIR, 'star_names_ko.csv'));
  const curated = readCsv(path.join(CURATED_DIR, 'star-names-ko.csv'));
  const header = [
    'hip',
    'iau_name_en',
    'name_ko',
    'traditional_ko',
    'aliases_ko',
    'note',
    'source',
    'confidence',
    'needs_review',
  ];
  const out = new Map<string, Row>();
  for (const c of curated) {
    out.set(c['hip']!, { ...c, aliases_ko: c['aliases_ko'] ?? '' });
  }
  let added = 0;
  let aliased = 0;
  for (const r of research) {
    const hip = r['hip']!;
    const c = out.get(hip);
    const rTrad = splitAliases(r['traditional_ko']);
    if (!c) {
      out.set(hip, {
        hip,
        iau_name_en: r['iau_name_en'] ?? '',
        name_ko: r['name_ko'] ?? '',
        traditional_ko: rTrad[0] ?? '',
        aliases_ko: rTrad.slice(1).join('|'),
        note: r['note'] ?? '',
        source: r['source'] ?? '',
        confidence: r['confidence'] ?? 'medium',
        needs_review: r['confidence'] === 'low' || !r['name_ko'] ? 'true' : 'false',
      });
      added++;
      continue;
    }
    const aliases = splitAliases(c['aliases_ko']);
    if (r['name_ko'] && r['name_ko'] !== c['name_ko']) {
      aliases.push(r['name_ko']);
      aliased++;
    }
    if (!c['traditional_ko'] && rTrad[0]) c['traditional_ko'] = rTrad[0];
    for (const t of rTrad) if (t !== c['traditional_ko']) aliases.push(t);
    c['aliases_ko'] = uniq(aliases)
      .filter((a) => a !== c['name_ko'])
      .join('|');
    c['source'] = uniq([...(c['source'] ?? '').split('|'), ...(r['source'] ?? '').split('|')]).join(
      ' | ',
    );
    c['note'] = c['note'] || r['note'] || '';
    c['confidence'] = r['confidence'] ?? c['confidence'] ?? 'medium';
    c['needs_review'] = r['confidence'] === 'low' ? 'true' : 'false';
  }
  const rows = [...out.values()].sort((a, b) => Number(a['hip']) - Number(b['hip']));
  writeCsv(
    path.join(CURATED_DIR, 'star-names-ko.csv'),
    header,
    rows.map((r) => header.map((h) => r[h] ?? '')),
  );
  log(
    `stars: ${rows.length} rows (${added} added from G2, ${aliased} G2 spellings kept as aliases)`,
  );
}

function mergeDso(): void {
  const research = readCsv(path.join(RESEARCH_DIR, 'dso_names_ko.csv'));
  const curated = readCsv(path.join(CURATED_DIR, 'dso-names-ko.csv'));
  const header = [
    'id',
    'name_en',
    'name_ko',
    'alt_names_ko',
    'note',
    'source',
    'confidence',
    'needs_review',
  ];
  const out = new Map<string, Row>(curated.map((r) => [r['id']!, { ...r }]));
  let added = 0;
  for (const r of research) {
    const id = r['id']!;
    const c = out.get(id);
    if (!c) {
      out.set(id, {
        id,
        name_en: r['name_en'] ?? '',
        name_ko: r['name_ko'] ?? '',
        alt_names_ko: r['alt_names_ko'] ?? '',
        note: r['note'] ?? '',
        source: r['source'] ?? '',
        confidence: r['confidence'] ?? 'medium',
        needs_review: r['confidence'] === 'low' ? 'true' : 'false',
      });
      added++;
      continue;
    }
    const alts = splitAliases(c['alt_names_ko']);
    if (r['name_ko'] && r['name_ko'] !== c['name_ko']) alts.push(r['name_ko']);
    alts.push(...splitAliases(r['alt_names_ko']));
    c['alt_names_ko'] = uniq(alts)
      .filter((a) => a !== c['name_ko'])
      .join('|');
    if (!c['name_ko'] || /^M\d+$/.test(c['name_ko']))
      c['name_ko'] = r['name_ko'] || c['name_ko'] || '';
    c['name_en'] = c['name_en'] || r['name_en'] || '';
    c['source'] = uniq([...(c['source'] ?? '').split('|'), ...(r['source'] ?? '').split('|')]).join(
      ' | ',
    );
    c['confidence'] = r['confidence'] ?? c['confidence'] ?? 'medium';
    c['needs_review'] = r['confidence'] === 'low' ? 'true' : 'false';
  }
  const rows = [...out.values()];
  writeCsv(
    path.join(CURATED_DIR, 'dso-names-ko.csv'),
    header,
    rows.map((r) => header.map((h) => r[h] ?? '')),
  );
  log(`dso: ${rows.length} rows (${added} added from G2)`);
}

function mergeCaldwell(): void {
  const research = readCsv(path.join(RESEARCH_DIR, 'caldwell.csv'));
  const curated = readCsv(path.join(CURATED_DIR, 'caldwell.csv'));
  const byN = new Map(research.map((r) => [r['caldwell']!, r]));
  const header = [
    'caldwell',
    'ngc_ic',
    'name_en',
    'name_ko',
    'type',
    'source',
    'confidence',
    'needs_review',
  ];
  let mismatch = 0;
  const rows = curated.map((c) => {
    const r = byN.get(c['caldwell']!);
    const norm = (s: string) => s.replace(/\s+/g, '').replace(/;/g, '/');
    const agree = r !== undefined && norm(r['ngc_ic'] ?? '') === norm(c['ngc_ic'] ?? '');
    if (!agree) mismatch++;
    return {
      caldwell: c['caldwell']!,
      ngc_ic: c['ngc_ic']!,
      name_en: c['name_en'] || r?.['name_en'] || '',
      name_ko: c['name_ko'] || r?.['name_ko'] || '',
      type: c['type']!,
      source: uniq([...(c['source'] ?? '').split(';'), ...(r?.['source'] ?? '').split('|')]).join(
        ' | ',
      ),
      confidence: agree ? 'high' : (r?.['confidence'] ?? 'low'),
      needs_review: agree ? 'false' : 'true',
    };
  });
  writeCsv(
    path.join(CURATED_DIR, 'caldwell.csv'),
    header,
    rows.map((r) => header.map((h) => r[h as keyof typeof r])),
  );
  log(`caldwell: ${rows.length} rows, ngc_ic mismatches ${mismatch}`);
}

mergeConstellations();
mergeStars();
mergeDso();
mergeCaldwell();
