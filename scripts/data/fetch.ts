/**
 * `pnpm data:fetch` — 원본 데이터를 data-src/raw/ 로 내려받고 sources.json(크기·SHA-256·시각)을 쓴다.
 * 이미 있는 파일은 재사용한다(`--force`로 다시 받음). 네트워크가 막히면 필요한 URL 목록을 출력하고
 * 사용자가 직접 받아 data-src/raw/ 에 두면 된다(파일명은 아래 목록과 동일).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  ensureDir,
  fail,
  fileSize,
  log,
  RAW_DIR,
  readSources,
  sha256File,
  SOURCES,
  writeSources,
  type SourceRecord,
} from './lib.ts';

const force = process.argv.includes('--force');

async function download(url: string, dest: string, attempt = 1): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    if (attempt < 3) {
      log(`  ${res.status} ${res.statusText} — 재시도 ${attempt + 1}/3`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return download(url, dest, attempt + 1);
    }
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  // Git LFS 포인터(작은 텍스트)가 오면 media 엔드포인트가 아닌 것 — 실패로 처리
  if (buf.length < 400) {
    const head = new TextDecoder().decode(buf.slice(0, 60));
    if (head.startsWith('version https://git-lfs')) {
      throw new Error(`${url} 는 Git LFS 포인터를 돌려줍니다. media/ 엔드포인트 URL을 쓰세요.`);
    }
  }
  writeFileSync(dest, buf);
}

async function main(): Promise<void> {
  ensureDir(RAW_DIR);
  const previous = new Map(readSources().map((r) => [r.key, r]));
  const records: SourceRecord[] = [];
  const failures: string[] = [];

  for (const src of SOURCES) {
    const dest = path.join(RAW_DIR, src.file);
    const prev = previous.get(src.key);
    if (existsSync(dest) && !force) {
      const sha256 = sha256File(dest);
      records.push({
        key: src.key,
        file: src.file,
        url: src.url,
        license: src.license,
        bytes: fileSize(dest),
        sha256,
        fetchedAt: prev && prev.sha256 === sha256 ? prev.fetchedAt : new Date().toISOString(),
      });
      log(`skip (exists) ${src.file} ${fileSize(dest)} B`);
      continue;
    }
    log(`fetch ${src.url}`);
    try {
      await download(src.url, dest);
      records.push({
        key: src.key,
        file: src.file,
        url: src.url,
        license: src.license,
        bytes: fileSize(dest),
        sha256: sha256File(dest),
        fetchedAt: new Date().toISOString(),
      });
      log(`  ok ${src.file} ${fileSize(dest)} B`);
    } catch (err) {
      failures.push(`${src.file}  ←  ${src.url}  (${(err as Error).message})`);
    }
  }

  writeSources(records);
  log(`sources.json 기록: ${records.length}/${SOURCES.length}`);

  if (failures.length > 0) {
    console.error(
      '\n[data] 다음 파일을 받지 못했습니다. 직접 내려받아 data-src/raw/ 에 같은 이름으로 두세요:',
    );
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  // HYG 헤더 확인(포맷이 바뀌면 빌드 전에 알 수 있게)
  const hyg = path.join(RAW_DIR, 'hyg_v44.csv.gz');
  if (existsSync(hyg)) {
    const { gunzipSync } = await import('node:zlib');
    const head = gunzipSync(readFileSync(hyg)).subarray(0, 400).toString('utf8').split('\n')[0];
    log(`HYG header: ${head}`);
    if (!head?.includes('hip') || !head.includes('proper'))
      fail('HYG 헤더에 hip/proper 컬럼이 없습니다.');
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
