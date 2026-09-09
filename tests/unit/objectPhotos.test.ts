import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { getObjectPhoto, OBJECT_PHOTOS } from '@/catalog/objectPhotos';
import { isObjectId } from '@/catalog/objectId';

const publicDir = resolve('public');
const manifest: { version: number; photos: typeof OBJECT_PHOTOS; totalAssetBytes: number } =
  JSON.parse(readFileSync(resolve(publicDir, 'object-photos/v1/manifest.json'), 'utf8'));
const digest = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
const xml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('공식 천체 사진 카탈로그', () => {
  it('실재하는 canonical 천체에 한 장씩 매핑하며 사진이 없는 천체는 대체 사진을 주지 않는다', () => {
    const dso: { id: string }[] = JSON.parse(
      readFileSync(resolve(publicDir, 'data/dso.v1.json'), 'utf8'),
    );
    const dsoIds = new Set(dso.map((item) => item.id));
    expect(new Set(OBJECT_PHOTOS.map((photo) => photo.objectId)).size).toBe(OBJECT_PHOTOS.length);
    expect(OBJECT_PHOTOS).toHaveLength(164);
    expect(OBJECT_PHOTOS.filter((photo) => photo.objectId.startsWith('dso:'))).toHaveLength(153);
    for (let number = 1; number <= 110; number++)
      expect(OBJECT_PHOTOS.some((photo) => photo.objectId === `dso:M${number}`)).toBe(true);
    for (const photo of OBJECT_PHOTOS) {
      expect(isObjectId(photo.objectId)).toBe(true);
      if (photo.objectId.startsWith('dso:')) expect(dsoIds.has(photo.objectId)).toBe(true);
      expect(getObjectPhoto(photo.objectId)).toBe(photo);
    }
    expect(getObjectPhoto('star:HIP91262')).toBeUndefined();
    expect(getObjectPhoto('const:Ori')).toBeUndefined();
    expect(getObjectPhoto('planet:jupiter')?.sourceURL).toContain('science.nasa.gov');
    expect(getObjectPhoto('dso:M104')?.rightsURL).toBe('https://www.stsci.edu/copyright');
    expect(getObjectPhoto('dso:M31')?.coverage).toBe('detail');
    for (const id of [
      'sun',
      'moon',
      'planet:mercury',
      'planet:venus',
      'planet:mars',
      'planet:jupiter',
      'planet:saturn',
      'planet:uranus',
      'planet:neptune',
    ] as const)
      expect(getObjectPhoto(id)?.coverage).toBe('whole-object');
  });

  it('공개 감사 기록과 UI의 크레딧·권리·과학적 설명이 같고 전체 크레딧을 잘라내지 않는다', () => {
    expect(manifest.photos).toEqual(OBJECT_PHOTOS);
    expect(manifest.version).toBe(2);
    for (const photo of OBJECT_PHOTOS) {
      expect(photo.creditParts.map((part) => part.text).join('')).toBe(photo.credit);
      expect(photo.credit.length).toBeGreaterThan(5);
      expect(['Public domain', 'NASA/JPL image use']).toContain(photo.license);
      for (const url of [photo.sourceURL, photo.imageURL, photo.licenseURL, photo.rightsURL])
        expect(new URL(url).protocol).toBe('https:');
      expect(photo.imageURL).not.toMatch(/esahubble\.org|eso\.org/);
      if (photo.imageURL.includes('ipac.caltech.edu/2mass/')) {
        expect(photo.license).toBe('Public domain');
        expect(photo.rightsURL).toBe(
          'https://www.ipac.caltech.edu/2mass/gallery/showcase/copyright.html',
        );
        expect(photo.credit).toContain('University of Massachusetts');
        expect(photo.credit).toContain('National Science Foundation');
      }
      expect(photo.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(photo.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      for (const part of photo.creditParts)
        if (part.url) expect(new URL(part.url).protocol).toBe('https:');
      for (const language of ['ko', 'en'] as const) {
        expect(photo.title[language]).toBeTruthy();
        expect(photo.caption[language].trim()).not.toBe('');
        expect(photo.modifications[language]).toContain('WebP');
        expect(photo.rightsEvidence?.[language].trim()).toBeTruthy();
      }
    }
    expect(getObjectPhoto('star:HIP32349')?.caption.en).toContain('diffraction');
    expect(getObjectPhoto('planet:venus')?.spectralBand).toBe('multiwavelength');
    expect(getObjectPhoto('dso:M82')?.spectralBand).toBe('infrared');
    expect(getObjectPhoto('dso:NGC5139')?.caption.en).toContain('grayscale');
    expect(getObjectPhoto('dso:M102')?.caption.en).toContain('identification is debated');
    expect(getObjectPhoto('dso:M42')?.caption.en).toContain('both M42 and M43');
    expect(getObjectPhoto('sun')?.spectralBand).toBe('ultraviolet');
    expect(getObjectPhoto('star:HIP27989')?.spectralBand).toBe('ultraviolet');
  });

  it('편집 프레임 제거 좌표가 원본 안에 있고 어두운 관측 필드·과학적 삽입 사진을 보존한다', () => {
    for (const photo of OBJECT_PHOTOS) {
      const { width, height } = photo.sourceDimensions;
      expect(Number.isSafeInteger(width) && width > 0).toBe(true);
      expect(Number.isSafeInteger(height) && height > 0).toBe(true);
      const crop = photo.crop;
      if (!crop) continue;
      for (const value of [crop.left, crop.top, crop.width, crop.height])
        expect(Number.isSafeInteger(value)).toBe(true);
      expect(crop.left).toBeGreaterThanOrEqual(0);
      expect(crop.top).toBeGreaterThanOrEqual(0);
      expect(crop.width).toBeGreaterThan(0);
      expect(crop.height).toBeGreaterThan(0);
      expect(crop.left + crop.width).toBeLessThanOrEqual(width);
      expect(crop.top + crop.height).toBeLessThanOrEqual(height);
      expect(['editorial-frame', 'observation-panel']).toContain(crop.reason);
    }
    // 밝은 중심만 남기는 자동 후보로 되돌아가면 실제 주변 별밭을 잃는다.
    for (const id of ['dso:M42', 'dso:M43', 'dso:M45', 'dso:M67', 'dso:NGC104'] as const) {
      const photo = getObjectPhoto(id)!;
      expect(photo.crop!.height / photo.sourceDimensions.height).toBeGreaterThan(0.8);
    }
    const m64 = getObjectPhoto('dso:M64')!;
    expect(m64.crop?.left).toBe(0);
    expect(m64.crop?.width).toBe(m64.sourceDimensions.width);
    expect(m64.modifications.en).toContain('vertical border lines');
    for (const id of ['dso:M87', 'dso:NGC1097'] as const)
      expect(getObjectPhoto(id)?.caption.en).toContain('scientific inset');
    expect(getObjectPhoto('star:HIP27989')?.crop?.reason).toBe('observation-panel');
    expect(getObjectPhoto('dso:M42')?.sourceSha256).toBe(getObjectPhoto('dso:M43')?.sourceSha256);
    expect(getObjectPhoto('dso:M42')?.hero.sha256).not.toBe(getObjectPhoto('dso:M43')?.hero.sha256);
  });

  it('배포 WebP 해시·XMP·선택 필드 비율이 일치하며 누락·미사용 파일 없이 15MB 예산 안이다', async () => {
    let total = 0;
    for (const photo of OBJECT_PHOTOS) {
      for (const [variant, maxSide] of [
        ['hero', 960],
        ['thumb', 160],
      ] as const) {
        const asset = photo[variant];
        expect(asset.path).toMatch(/^object-photos\/v1\/[a-z0-9-]+\.webp$/);
        const bytes = readFileSync(resolve(publicDir, asset.path));
        const metadata = await sharp(bytes).metadata();
        expect(digest(bytes)).toBe(asset.sha256);
        expect(bytes.length).toBe(asset.bytes);
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(asset.width);
        expect(metadata.height).toBe(asset.height);
        expect(Math.max(asset.width, asset.height)).toBeLessThanOrEqual(maxSide);
        const xmp = metadata.xmp?.toString('utf8') ?? '';
        for (const value of [
          photo.sourceURL,
          photo.imageURL,
          photo.credit,
          photo.licenseURL,
          photo.rightsURL,
          photo.rightsEvidence!.en,
          photo.verifiedAt,
          photo.sourceSha256,
          photo.modifications.en,
          photo.caption.en,
          JSON.stringify(photo.sourceDimensions),
          JSON.stringify(photo.crop ?? null),
        ])
          expect(xmp).toContain(xml(value));
        const frame = photo.crop ?? photo.sourceDimensions;
        const scale = Math.min(1, maxSide / frame.width, maxSide / frame.height);
        expect(Math.abs(asset.width - Math.round(frame.width * scale))).toBeLessThanOrEqual(1);
        expect(Math.abs(asset.height - Math.round(frame.height * scale))).toBeLessThanOrEqual(1);
        total += bytes.length;
      }
      // 양쪽을 contain 축소해 종횡비를 유지한다(정수 픽셀 반올림 허용).
      expect(
        Math.abs(photo.thumb.width * photo.hero.height - photo.thumb.height * photo.hero.width),
      ).toBeLessThanOrEqual(photo.hero.width + photo.hero.height);
    }
    expect(total).toBe(manifest.totalAssetBytes);
    expect(total).toBeLessThanOrEqual(15_000_000);
    const paths = OBJECT_PHOTOS.flatMap((photo) => [photo.hero.path, photo.thumb.path]);
    expect(new Set(paths).size).toBe(paths.length);
    expect(
      readdirSync(resolve(publicDir, 'object-photos/v1'))
        .filter((file) => file.endsWith('.webp'))
        .sort(),
    ).toEqual(paths.map((path) => path.split('/').at(-1)).sort());
  });
});
