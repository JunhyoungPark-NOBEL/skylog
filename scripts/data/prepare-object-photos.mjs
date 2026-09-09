/**
 * 공식 출처에서 권리를 확인한 사진만 public manifest에 먼저 등록한 뒤 실행한다.
 * node scripts/data/prepare-object-photos.mjs          수급·WebP 변환·TS 동기화
 * node scripts/data/prepare-object-photos.mjs --check  네트워크 없이 자산 무결성 확인
 * 원출처의 바이트가 바뀌면 중단한다. 권리·내용 재검토 없이 해시를 갱신하지 않는다.
 */
/* global fetch, AbortSignal */
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const publicRoot = path.join(root, 'public');
const folder = path.join(publicRoot, 'object-photos/v1');
const manifestPath = path.join(folder, 'manifest.json');
const modulePath = path.join(root, 'src/catalog/objectPhotos.ts');
const sourceCache = path.join(root, 'artifacts/object-photos-research/originals');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const checkOnly = process.argv.includes('--check');
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const xml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const trustedHosts = new Set(['cdn.esahubble.org', 'cdn.eso.org']);
function xmp(photo) {
  // 출력 파일 자신의 해시는 재귀적으로 내장할 수 없으므로 manifest에 저장한다.
  // 각 파일에는 공식 이미지의 원본 해시와 전체 출처·권리·변형 내역을 내장한다.
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/" xmlns:skylog="https://junhyoungpark-nobel.github.io/skylog/photo-metadata/1/"
dc:source="${xml(photo.sourceURL)}" dc:creator="${xml(photo.credit)}" dc:rights="CC BY 4.0" xmpRights:WebStatement="${xml(photo.licenseURL)}"
skylog:objectId="${xml(photo.objectId)}" skylog:sourceURL="${xml(photo.sourceURL)}" skylog:imageURL="${xml(photo.imageURL)}" skylog:credit="${xml(photo.credit)}" skylog:licenseURL="${xml(photo.licenseURL)}" skylog:rightsURL="${xml(photo.rightsURL)}" skylog:verifiedAt="${xml(photo.verifiedAt)}" skylog:sourceSha256="${xml(photo.sourceSha256)}" skylog:modifications="${xml(photo.modifications.en)}" skylog:caption="${xml(photo.caption.en)}"/>
</rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
}
function assertRecord(photo) {
  if (!photo.credit || photo.creditParts.map((part) => part.text).join('') !== photo.credit)
    throw new Error(`Incomplete credit: ${photo.objectId}`);
  if (
    photo.license !== 'CC BY 4.0' ||
    !photo.verifiedAt ||
    !trustedHosts.has(new URL(photo.imageURL).hostname)
  )
    throw new Error(`Unreviewed source: ${photo.objectId}`);
}
async function generate(photo) {
  assertRecord(photo);
  const slug = photo.objectId.replaceAll(':', '-').toLowerCase();
  const cachePath = path.join(sourceCache, `${slug}.jpg`);
  let source;
  try {
    source = await readFile(cachePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!source) {
    const response = await fetch(photo.imageURL, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${photo.imageURL}`);
    source = Buffer.from(await response.arrayBuffer());
  }
  const sourceHash = sha256(source);
  if (photo.sourceSha256 && sourceHash !== photo.sourceSha256)
    throw new Error(`Source changed; review rights and content again: ${photo.objectId}`);
  photo.sourceSha256 = sourceHash;
  await writeFile(cachePath, source);
  for (const [variant, maxSide, quality] of [
    ['hero', 960, 76],
    ['thumb', 160, 72],
  ]) {
    const relative = `object-photos/v1/${slug}-${variant}.webp`;
    const { data, info } = await sharp(source)
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .withXmp(xmp(photo))
      .toBuffer({ resolveWithObject: true });
    await writeFile(path.join(publicRoot, relative), data);
    photo[variant] = {
      path: relative,
      width: info.width,
      height: info.height,
      bytes: data.length,
      sha256: sha256(data),
    };
  }
  console.log(
    `${photo.objectId}: ${photo.hero.width}x${photo.hero.height}, ${photo.hero.bytes + photo.thumb.bytes} bytes`,
  );
}
async function verify(photo) {
  assertRecord(photo);
  if (!/^[a-f0-9]{64}$/.test(photo.sourceSha256))
    throw new Error(`Missing source hash: ${photo.objectId}`);
  for (const [variant, limit] of [
    ['hero', 960],
    ['thumb', 160],
  ]) {
    const asset = photo[variant];
    if (!/^object-photos\/v1\/[a-z0-9-]+\.webp$/.test(asset.path))
      throw new Error('Unsafe asset path');
    const data = await readFile(path.join(publicRoot, asset.path));
    const metadata = await sharp(data).metadata();
    if (
      sha256(data) !== asset.sha256 ||
      data.length !== asset.bytes ||
      metadata.width !== asset.width ||
      metadata.height !== asset.height ||
      metadata.format !== 'webp' ||
      Math.max(asset.width, asset.height) > limit
    )
      throw new Error(`Asset mismatch: ${asset.path}`);
    const embedded = metadata.xmp?.toString('utf8') ?? '';
    for (const value of [
      photo.sourceURL,
      photo.imageURL,
      photo.credit,
      photo.licenseURL,
      photo.rightsURL,
      photo.verifiedAt,
      photo.sourceSha256,
      photo.modifications.en,
    ])
      if (!embedded.includes(xml(value)))
        throw new Error(`Embedded attribution missing: ${asset.path}`);
  }
}
if (!checkOnly) {
  await mkdir(sourceCache, { recursive: true });
  for (let i = 0; i < manifest.photos.length; i += 3) {
    const results = await Promise.allSettled(manifest.photos.slice(i, i + 3).map(generate));
    for (const result of results) if (result.status === 'rejected') throw result.reason;
  }
  manifest.preparedWith = {
    sharp: sharp.versions.sharp,
    vips: sharp.versions.vips,
    heroMaxSide: 960,
    thumbMaxSide: 160,
    heroQuality: 76,
    thumbQuality: 72,
    crop: false,
  };
  manifest.totalAssetBytes = manifest.photos.reduce(
    (sum, photo) => sum + photo.hero.bytes + photo.thumb.bytes,
    0,
  );
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const code = await readFile(modulePath, 'utf8');
  const generated = `// BEGIN GENERATED PHOTOS — scripts/data/prepare-object-photos.mjs\nexport const OBJECT_PHOTOS: readonly ObjectPhoto[] = ${JSON.stringify(manifest.photos, null, 2)};\n// END GENERATED PHOTOS`;
  await writeFile(
    modulePath,
    await format(
      code.replace(/\/\/ BEGIN GENERATED PHOTOS[\s\S]*?\/\/ END GENERATED PHOTOS/, generated),
      { ...(await resolveConfig(modulePath)), parser: 'typescript' },
    ),
  );
}
for (const photo of manifest.photos) await verify(photo);
const bytes = manifest.photos.reduce((sum, photo) => sum + photo.hero.bytes + photo.thumb.bytes, 0);
if (bytes > 2_000_000) throw new Error(`Photo budget exceeded: ${bytes} bytes`);
console.log(
  `Verified ${manifest.photos.length} photos / ${manifest.photos.length * 2} WebP files / ${bytes} bytes. No crop, no upscaling.`,
);
