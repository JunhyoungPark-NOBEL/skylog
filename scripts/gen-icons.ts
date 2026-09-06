/**
 * public/icon.svg → PWA 아이콘 PNG 생성 (`pnpm gen:icons`).
 * 결과는 커밋한다(빌드 시 재생성하지 않음). 아이콘 디자인을 바꾸면 다시 실행.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Sharp } from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const svgPath = path.join(root, 'public', 'icon.svg');
const outDir = path.join(root, 'public', 'icons');

interface Spec {
  file: string;
  size: number;
  /** maskable: 안전 영역(중앙 80%)에 맞게 축소하고 배경을 채운다 */
  maskable?: boolean;
}

const SPECS: Spec[] = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon-180.png', size: 180 },
  { file: 'maskable-512.png', size: 512, maskable: true },
];

async function main(): Promise<void> {
  const svg = await readFile(svgPath);
  await mkdir(outDir, { recursive: true });
  for (const spec of SPECS) {
    let img: Sharp;
    if (spec.maskable) {
      const inner = Math.round(spec.size * 0.8);
      const glyph = await sharp(svg).resize(inner, inner).png().toBuffer();
      img = sharp({
        create: {
          width: spec.size,
          height: spec.size,
          channels: 4,
          background: { r: 5, g: 7, b: 13, alpha: 1 },
        },
      }).composite([{ input: glyph, gravity: 'centre' }]);
    } else {
      img = sharp(svg).resize(spec.size, spec.size);
    }
    const out = path.join(outDir, spec.file);
    await writeFile(out, await img.png({ compressionLevel: 9 }).toBuffer());
    console.log(`wrote ${path.relative(root, out)} (${spec.size}px)`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
