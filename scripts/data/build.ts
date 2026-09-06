/**
 * `pnpm data:build` — data-src/ → public/data/*.v1.* 데이터 팩 빌드 + manifest.v1.json
 * 결정론적: 같은 입력이면 같은 바이트(생성 시각만 manifest에 기록).
 */
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildConstellations } from './build-constellations.ts';
import { buildDso } from './build-dso.ts';
import { buildBodies, buildMeteors } from './build-misc.ts';
import { buildMilkyWay } from './build-milkyway.ts';
import { buildSearchIndex } from './build-search-index.ts';
import { buildStars } from './build-stars.ts';
import { exportCatalogValues } from './export-catalog-values.ts';
import {
  ensureDir,
  fail,
  log,
  OUT_DIR,
  RAW_DIR,
  readSources,
  sha256Of,
  SOURCES,
  writeJson,
} from './lib.ts';

interface PackEntry {
  file: string;
  version: number;
  bytes: number;
  records?: number;
  sha256: string;
}

async function main(): Promise<void> {
  for (const s of SOURCES) {
    if (!existsSync(path.join(RAW_DIR, s.file))) {
      fail(
        `원본이 없습니다: data-src/raw/${s.file} — \`pnpm data:fetch\` 를 먼저 실행하거나 ${s.url} 에서 직접 받아 두세요.`,
      );
    }
  }
  ensureDir(OUT_DIR);
  const packs: Record<string, PackEntry> = {};
  const record = (name: string, file: string, bytes: Uint8Array | string, records?: number) => {
    const buf = typeof bytes === 'string' ? Buffer.from(bytes) : bytes;
    const entry: PackEntry = { file, version: 1, bytes: buf.byteLength, sha256: sha256Of(buf) };
    if (records !== undefined) entry.records = records;
    packs[name] = entry;
    log(
      `${file.padEnd(28)} ${(buf.byteLength / 1024).toFixed(1).padStart(8)} KB${records !== undefined ? `  ${records} records` : ''}`,
    );
  };
  const writeJsonPack = (name: string, file: string, value: unknown, records?: number) => {
    const text = JSON.stringify(value);
    writeFileSync(path.join(OUT_DIR, file), text);
    record(name, file, text, records);
  };

  // 별
  const stars = buildStars();
  writeFileSync(path.join(OUT_DIR, 'stars-bright.v1.bin'), new Uint8Array(stars.bright));
  record('stars-bright', 'stars-bright.v1.bin', new Uint8Array(stars.bright), stars.stats.bright);
  writeFileSync(path.join(OUT_DIR, 'stars-deep.v1.bin'), new Uint8Array(stars.deep));
  record('stars-deep', 'stars-deep.v1.bin', new Uint8Array(stars.deep), stars.stats.deep);
  writeJsonPack('stars-names', 'stars-bright.v1.json', stars.named, stars.named.length);
  log(
    `  HYG 총 ${stars.stats.total}개, HIP 보유 ${stars.stats.withHip}, 등급 구간 ${JSON.stringify(stars.stats.magBins)}`,
  );
  if (stars.stats.curatedUnmatchedHip.length > 0) {
    log(`  경고: 큐레이션 HIP가 HYG에 없음: ${stars.stats.curatedUnmatchedHip.join(', ')}`);
  }

  // 별자리
  const cons = buildConstellations();
  writeJsonPack(
    'constellations',
    'constellations.v1.json',
    cons.data,
    Object.keys(cons.data).length,
  );
  if (cons.koMismatches.length > 0) {
    log(
      `  참고: 한글 별자리 이름이 d3-celestial과 다른 항목(큐레이션 우선): ${cons.koMismatches.map((m) => `${m.id}(${m.curated}≠${m.d3})`).join(', ')}`,
    );
  }

  // DSO
  const dso = buildDso();
  writeJsonPack('dso', 'dso.v1.json', dso.data, dso.data.length);
  log(
    `  DSO 행 ${dso.stats.rowsTotal} → 포함 ${dso.stats.included}, 메시에 ${dso.stats.messier}/110, 콜드웰 ${dso.stats.caldwell}/109, 분류 ${JSON.stringify(dso.stats.byCategory)}`,
  );
  if (dso.stats.missingMessier.length > 0)
    log(`  경고: 누락 메시에: ${dso.stats.missingMessier.join(', ')}`);
  if (dso.stats.missingCaldwell.length > 0)
    log(`  경고: 누락 콜드웰: ${dso.stats.missingCaldwell.join(', ')}`);
  if (dso.stats.curatedNameUnmatched.length > 0)
    log(
      `  경고: 큐레이션 DSO 이름이 카탈로그와 안 맞음: ${dso.stats.curatedNameUnmatched.join(', ')}`,
    );

  // 기타
  const bodies = buildBodies();
  writeJsonPack('bodies', 'bodies.v1.json', bodies, bodies.length);
  const meteors = buildMeteors();
  writeJsonPack('meteors', 'meteors.v1.json', meteors, meteors.length);

  // 은하수 텍스처
  const mwPng = await buildMilkyWay();
  writeFileSync(path.join(OUT_DIR, 'milkyway.v1.png'), mwPng);
  record('milkyway', 'milkyway.v1.png', new Uint8Array(mwPng));

  // 검색 인덱스
  const index = buildSearchIndex({
    stars: stars.named,
    dso: dso.data,
    constellations: cons.data,
    bodies,
  });
  writeJsonPack('search-index', 'search-index.v1.json', index, index.length);

  // G3 입력
  const cv = exportCatalogValues({
    stars: stars.named,
    dso: dso.data,
    constellations: cons.data,
    bodies,
  });
  log(
    `catalog-values.v1.csv: ${cv.rows.length} rows${cv.missing.length > 0 ? `, 누락 ${cv.missing.join(', ')}` : ''}`,
  );

  // manifest
  const sources = readSources().map((s) => ({
    name: s.key,
    url: s.url,
    file: s.file,
    bytes: s.bytes,
    sha256: s.sha256,
    license: s.license,
    fetchedAt: s.fetchedAt,
  }));
  const manifest = {
    schema: 'skylog-data-manifest',
    version: 1,
    generatedAt: new Date().toISOString(),
    packs,
    sources,
    summary: {
      starsBright: stars.stats.bright,
      starsDeep: stars.stats.deep,
      namedStars: stars.stats.named,
      constellations: Object.keys(cons.data).length,
      dso: dso.data.length,
      messier: dso.stats.messier,
      caldwell: dso.stats.caldwell,
    },
  };
  const bytes = writeJson(path.join(OUT_DIR, 'manifest.v1.json'), manifest, true);
  log(`manifest.v1.json ${bytes} B`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
