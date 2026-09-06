/**
 * `pnpm data:validate` — public/data 팩 검증 리포트. 실패 조건이면 non-zero exit.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { decodeStarPack } from '../../src/catalog/starPackFormat.ts';
import { readContentTargets } from './export-catalog-values.ts';
import { CONTENT_RAW_DIR, OUT_DIR } from './lib.ts';

interface NamedStar {
  id: string;
  ko?: string;
  en?: string;
  ra: number;
  dec: number;
}
interface Dso {
  id: string;
  ra: number;
  dec: number;
  messier?: number;
  caldwell?: number;
  names: { ko?: string };
}
interface Constellation {
  ko: string;
  lines: unknown[];
  bounds: unknown[];
}

const failures: string[] = [];
const warnings: string[] = [];
function check(cond: boolean, msg: string): void {
  if (!cond) failures.push(msg);
}
function warn(cond: boolean, msg: string): void {
  if (!cond) warnings.push(msg);
}
function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(OUT_DIR, file), 'utf8')) as T;
}
function kb(file: string): number {
  return statSync(path.join(OUT_DIR, file)).size / 1024;
}

function main(): void {
  const required = [
    'manifest.v1.json',
    'stars-bright.v1.bin',
    'stars-deep.v1.bin',
    'stars-bright.v1.json',
    'constellations.v1.json',
    'dso.v1.json',
    'search-index.v1.json',
    'bodies.v1.json',
    'meteors.v1.json',
    'milkyway.v1.png',
  ];
  for (const f of required) check(existsSync(path.join(OUT_DIR, f)), `파일 없음: ${f}`);
  if (failures.length > 0) return report();

  console.log('\n=== 별 ===');
  const bright = decodeStarPack(
    readFileSync(path.join(OUT_DIR, 'stars-bright.v1.bin')).buffer.slice(0) as ArrayBuffer,
  );
  const deep = decodeStarPack(
    readFileSync(path.join(OUT_DIR, 'stars-deep.v1.bin')).buffer.slice(0) as ArrayBuffer,
  );
  const bins: Record<string, number> = {};
  let badVec = 0;
  for (let i = 0; i < bright.count; i++) {
    const m = bright.mag[i]!;
    const b = m < 0 ? '<0' : `${Math.floor(m)}`;
    bins[b] = (bins[b] ?? 0) + 1;
    const x = bright.positions[i * 3]!;
    const y = bright.positions[i * 3 + 1]!;
    const z = bright.positions[i * 3 + 2]!;
    if (Math.abs(Math.hypot(x, y, z) - 1) > 1e-4) badVec++;
  }
  console.log(
    `stars-bright: ${bright.count}개 (${kb('stars-bright.v1.bin').toFixed(1)} KB), 등급 구간 ${JSON.stringify(bins)}`,
  );
  console.log(`stars-deep:   ${deep.count}개 (${kb('stars-deep.v1.bin').toFixed(1)} KB)`);
  check(bright.count >= 8000, `밝은 별 ≥ 8000 이어야 함 (${bright.count})`);
  check(badVec === 0, `단위벡터가 아닌 레코드 ${badVec}개`);
  check(
    kb('stars-bright.v1.bin') <= 400,
    `stars-bright.v1.bin ≤ 400KB (${kb('stars-bright.v1.bin').toFixed(1)})`,
  );
  const brightIds = new Set<string>();
  let dupIds = 0;
  for (let i = 0; i < bright.count; i++) {
    const id = bright.hip[i]! > 0 ? `HIP${bright.hip[i]}` : `HYG${bright.hygId[i]}`;
    if (brightIds.has(id)) dupIds++;
    brightIds.add(id);
  }
  check(dupIds === 0, `밝은 팩 중복 id ${dupIds}개`);

  const named = readJson<NamedStar[]>('stars-bright.v1.json');
  const namedKo = named.filter((s) => s.ko).length;
  const namedEn = named.filter((s) => s.en).length;
  console.log(`이름 있는 별: ${named.length}개 (영문 고유명 ${namedEn}, 한글 ${namedKo})`);
  check(named.length >= 800, `이름/메타 있는 별 ≥ 800 (${named.length})`);
  check(namedKo >= 60, `한글 이름 별 ≥ 60 (${namedKo})`);
  check(
    named.every((s) => s.ra >= 0 && s.ra < 360 && s.dec >= -90 && s.dec <= 90),
    '별 좌표 범위 오류',
  );
  check(new Set(named.map((s) => s.id)).size === named.length, '이름 있는 별 id 중복');

  console.log('\n=== 별자리 ===');
  const cons = readJson<Record<string, Constellation>>('constellations.v1.json');
  const ids = Object.keys(cons);
  const noKo = ids.filter((k) => !cons[k]!.ko);
  const noLines = ids.filter((k) => cons[k]!.lines.length === 0);
  const noBounds = ids.filter((k) => cons[k]!.bounds.length === 0);
  console.log(
    `별자리 ${ids.length}개, 한글 누락 ${noKo.length}, 선 누락 ${noLines.length}, 경계 누락 ${noBounds.length}`,
  );
  check(ids.length === 88, `별자리 88개 (${ids.length})`);
  check(noKo.length === 0, `한글 이름 누락: ${noKo.join(', ')}`);
  check(noLines.length === 0, `선 누락: ${noLines.join(', ')}`);
  check(noBounds.length === 0, `경계 누락: ${noBounds.join(', ')}`);

  console.log('\n=== DSO ===');
  const dso = readJson<Dso[]>('dso.v1.json');
  const messier = new Set(dso.filter((d) => d.messier !== undefined).map((d) => d.messier!));
  const caldwell = new Set(dso.filter((d) => d.caldwell !== undefined).map((d) => d.caldwell!));
  const missingM = Array.from({ length: 110 }, (_, i) => i + 1).filter((n) => !messier.has(n));
  const missingC = Array.from({ length: 109 }, (_, i) => i + 1).filter((n) => !caldwell.has(n));
  const dsoKo = dso.filter((d) => d.names.ko).length;
  console.log(
    `DSO ${dso.length}개, 메시에 ${messier.size}/110, 콜드웰 ${caldwell.size}/109, 한글 이름 ${dsoKo}`,
  );
  check(missingM.length === 0, `메시에 누락: ${missingM.join(', ')}`);
  check(caldwell.size >= 100, `콜드웰 ≥ 100 (${caldwell.size}); 누락: ${missingC.join(', ')}`);
  warn(missingC.length === 0, `콜드웰 누락(경고): ${missingC.join(', ')}`);
  check(dso.length >= 300, `DSO 총 ≥ 300 (${dso.length})`);
  check(
    dso.every((d) => d.ra >= 0 && d.ra < 360 && d.dec >= -90 && d.dec <= 90),
    'DSO 좌표 범위 오류',
  );
  check(new Set(dso.map((d) => d.id)).size === dso.length, 'DSO id 중복');
  check(dsoKo >= 40, `DSO 한글 이름 ≥ 40 (${dsoKo})`);

  console.log('\n=== 검색 인덱스 · 기타 ===');
  const index = readJson<{ id: string; n: string[] }[]>('search-index.v1.json');
  console.log(
    `검색 항목 ${index.length}개, 별칭 총 ${index.reduce((a, e) => a + e.n.length, 0)}개`,
  );
  check(
    index.every((e) => e.n.length > 0),
    '별칭이 없는 검색 항목 존재',
  );
  check(new Set(index.map((e) => e.id)).size === index.length, '검색 인덱스 id 중복');
  const bodies = readJson<unknown[]>('bodies.v1.json');
  const meteors = readJson<unknown[]>('meteors.v1.json');
  console.log(`천체 메타 ${bodies.length}개, 유성우 ${meteors.length}개`);
  check(bodies.length === 9, `bodies 9개 (${bodies.length})`);
  check(meteors.length >= 12, `유성우 ≥ 12 (${meteors.length})`);

  console.log('\n=== 콘텐츠 대상 (G3 입력) ===');
  const targets = readContentTargets();
  const indexIds = new Set(index.map((e) => e.id));
  const missingTargets = targets.filter((t) => !indexIds.has(t.id)).map((t) => t.id);
  console.log(`content-targets ${targets.length}개, 카탈로그에 없는 id ${missingTargets.length}개`);
  check(
    targets.length >= 110 && targets.length <= 130,
    `content-targets 120±10 (${targets.length})`,
  );
  check(
    missingTargets.length === 0,
    `카탈로그에 없는 content-target: ${missingTargets.join(', ')}`,
  );
  check(new Set(targets.map((t) => t.id)).size === targets.length, 'content-targets id 중복');
  check(
    existsSync(path.join(CONTENT_RAW_DIR, 'catalog-values.v1.csv')),
    'catalog-values.v1.csv 없음',
  );

  console.log('\n=== 파일 크기 ===');
  for (const f of required) console.log(`  ${f.padEnd(26)} ${kb(f).toFixed(1).padStart(8)} KB`);

  const manifest = readJson<{
    summary?: Record<string, number>;
    packs: Record<string, { file: string }>;
  }>('manifest.v1.json');
  check(manifest.summary !== undefined, 'manifest.summary 없음');
  check(
    Object.values(manifest.packs).every((p) => existsSync(path.join(OUT_DIR, p.file))),
    'manifest에 있는 팩 파일이 없음',
  );

  report();
}

function report(): void {
  console.log('');
  for (const w of warnings) console.log(`⚠️  ${w}`);
  if (failures.length === 0) {
    console.log('✅ data:validate 통과');
    return;
  }
  for (const f of failures) console.error(`❌ ${f}`);
  process.exit(1);
}

main();
