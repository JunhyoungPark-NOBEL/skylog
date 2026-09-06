/**
 * d3-celestial constellations{,.lines,.bounds}.json + curated constellations-ko.csv
 *   → public/data/constellations.v1.json
 * 포맷: { [iau3]: { en, ko, genitive, label:[raDeg, decDeg], lines:[[[ra,dec],...],...], bounds:[[ra,dec],...] } }
 * RA는 0..360으로 정규화(d3-celestial은 -180..180). 각도는 도(deg).
 */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { CURATED_DIR, RAW_DIR, readCsv, round, wrap360 } from './lib.ts';

interface Feature<G> {
  id: string;
  properties: Record<string, unknown>;
  geometry: G;
}
interface FeatureCollection<G> {
  features: Feature<G>[];
}
type Pt = [number, number];

export interface ConstellationOut {
  en: string;
  ko: string;
  genitive?: string;
  /** 라벨 위치 [raDeg, decDeg] */
  label: Pt;
  lines: Pt[][];
  /** 경계 폴리곤(닫힘 없이 순서대로). 별자리가 두 조각(뱀자리)이면 첫 조각 + `boundsExtra` */
  bounds: Pt[];
  boundsExtra?: Pt[][];
  /** 큐레이션 표의 계절 태그(봄/여름/가을/겨울/북극/남천) */
  season?: string;
}

export interface ConstellationBuildResult {
  data: Record<string, ConstellationOut>;
  koMismatches: { id: string; curated: string; d3: string }[];
}

function toPt(p: number[]): Pt {
  return [round(wrap360(p[0]!), 4), round(p[1]!, 4)];
}

export function buildConstellations(): ConstellationBuildResult {
  const names = JSON.parse(
    readFileSync(path.join(RAW_DIR, 'constellations.json'), 'utf8'),
  ) as FeatureCollection<{ coordinates: number[] }>;
  const lines = JSON.parse(
    readFileSync(path.join(RAW_DIR, 'constellations.lines.json'), 'utf8'),
  ) as FeatureCollection<{ type: string; coordinates: number[][][] }>;
  const bounds = JSON.parse(
    readFileSync(path.join(RAW_DIR, 'constellations.bounds.json'), 'utf8'),
  ) as FeatureCollection<{ type: string; coordinates: number[][][] }>;
  const curated = readCsv(path.join(CURATED_DIR, 'constellations-ko.csv'));
  const curatedById = new Map(curated.map((r) => [r['iau_abbr']!, r]));

  // Serpens는 d3-celestial 경계에서 Ser1/Ser2 두 조각. 선은 'Ser' 하나.
  const boundsById = new Map<string, Pt[][]>();
  for (const f of bounds.features) {
    const base = f.id.replace(/\d+$/, '');
    const rings = f.geometry.coordinates.map((ring) => ring.map(toPt));
    boundsById.set(base, [...(boundsById.get(base) ?? []), ...rings]);
  }
  const linesById = new Map<string, Pt[][]>();
  for (const f of lines.features) {
    const base = f.id.replace(/\d+$/, '');
    const segs = f.geometry.coordinates.map((seg) => seg.map(toPt));
    linesById.set(base, [...(linesById.get(base) ?? []), ...segs]);
  }

  const data: Record<string, ConstellationOut> = {};
  const koMismatches: ConstellationBuildResult['koMismatches'] = [];
  const sortedFeatures = [...names.features].sort((a, b) => a.id.localeCompare(b.id));
  for (const f of sortedFeatures) {
    const id = f.id;
    const p = f.properties;
    const cur = curatedById.get(id);
    const d3ko = typeof p['ko'] === 'string' ? (p['ko'] as string) : '';
    const ko = cur?.['name_ko'] || d3ko;
    if (cur?.['name_ko'] && d3ko && cur['name_ko'] !== d3ko) {
      koMismatches.push({ id, curated: cur['name_ko'], d3: d3ko });
    }
    const [bounds0, ...boundsRest] = boundsById.get(id) ?? [];
    const out: ConstellationOut = {
      en: String(p['name'] ?? id),
      ko,
      label: toPt(f.geometry.coordinates),
      lines: linesById.get(id) ?? [],
      bounds: bounds0 ?? [],
    };
    const genitive = cur?.['genitive_en'] || (typeof p['gen'] === 'string' ? p['gen'] : '');
    if (genitive) out.genitive = genitive;
    if (boundsRest.length > 0) out.boundsExtra = boundsRest;
    if (cur?.['season_kr']) out.season = cur['season_kr'];
    data[id] = out;
  }
  return { data, koMismatches };
}
