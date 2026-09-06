/**
 * G3(콘텐츠 생성) 입력: content-targets.v1.csv의 각 id에 대해 카탈로그 수치를 표로 내보낸다.
 *   → data-src/content-raw/catalog-values.v1.csv
 * 컬럼: id, name_en, name_ko, ra_deg, dec_deg, mag, dist_ly, spect, size_arcmin, con, type
 */
import path from 'node:path';
import type { ConstellationOut } from './build-constellations.ts';
import type { DsoOut } from './build-dso.ts';
import type { BodyOut } from './build-misc.ts';
import type { NamedStarOut } from './build-stars.ts';
import { CONTENT_RAW_DIR, CURATED_DIR, readCsv, writeCsv } from './lib.ts';

export const CATALOG_VALUES_HEADER = [
  'id',
  'priority',
  'name_en',
  'name_ko',
  'ra_deg',
  'dec_deg',
  'mag',
  'dist_ly',
  'spect',
  'size_arcmin',
  'con',
  'type',
];

export interface ContentTarget {
  id: string;
  priority: number;
  reason: string;
}

export function readContentTargets(): ContentTarget[] {
  return readCsv(path.join(CURATED_DIR, 'content-targets.v1.csv')).map((r) => ({
    id: r['id']!,
    priority: Number(r['priority']),
    reason: r['reason'] ?? '',
  }));
}

export function exportCatalogValues(input: {
  stars: NamedStarOut[];
  dso: DsoOut[];
  constellations: Record<string, ConstellationOut>;
  bodies: BodyOut[];
}): { rows: unknown[][]; missing: string[] } {
  const targets = readContentTargets();
  const starById = new Map(input.stars.map((s) => [s.id, s]));
  const dsoById = new Map(input.dso.map((d) => [d.id, d]));
  const bodyById = new Map(input.bodies.map((b) => [b.id, b]));
  const rows: unknown[][] = [];
  const missing: string[] = [];

  for (const t of targets) {
    const [kind, key] = t.id.includes(':') ? t.id.split(':') : [t.id, ''];
    if (kind === 'star') {
      const s = starById.get(t.id);
      if (!s) {
        missing.push(t.id);
        continue;
      }
      rows.push([
        t.id,
        t.priority,
        s.en ?? '',
        s.ko ?? '',
        s.ra,
        s.dec,
        s.mag,
        s.distLy ?? '',
        s.spect ?? '',
        '',
        s.con,
        'star',
      ]);
    } else if (kind === 'dso') {
      const d = dsoById.get(t.id);
      if (!d) {
        missing.push(t.id);
        continue;
      }
      const size =
        d.majAxArcmin !== undefined
          ? `${d.majAxArcmin}${d.minAxArcmin !== undefined ? `x${d.minAxArcmin}` : ''}`
          : '';
      rows.push([
        t.id,
        t.priority,
        d.names.en ?? '',
        d.names.ko ?? '',
        d.ra,
        d.dec,
        d.mag ?? '',
        d.distLy ?? '',
        '',
        size,
        d.con,
        `${d.type} (${d.category})`,
      ]);
    } else if (kind === 'const') {
      const c = input.constellations[key!];
      if (!c) {
        missing.push(t.id);
        continue;
      }
      rows.push([
        t.id,
        t.priority,
        c.en,
        c.ko,
        c.label[0],
        c.label[1],
        '',
        '',
        '',
        '',
        key,
        `constellation (${c.season ?? ''})`,
      ]);
    } else {
      const b = bodyById.get(t.id);
      if (!b) {
        missing.push(t.id);
        continue;
      }
      rows.push([
        t.id,
        t.priority,
        b.names.en,
        b.names.ko,
        'variable',
        'variable',
        'variable',
        '',
        '',
        '',
        '',
        b.kind,
      ]);
    }
  }
  writeCsv(path.join(CONTENT_RAW_DIR, 'catalog-values.v1.csv'), CATALOG_VALUES_HEADER, rows);
  return { rows, missing };
}
