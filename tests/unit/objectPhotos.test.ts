import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { getObjectPhoto, OBJECT_PHOTOS } from '@/catalog/objectPhotos';
import { isObjectId } from '@/catalog/objectId';

const publicDir = resolve('public');
const manifest: { photos: typeof OBJECT_PHOTOS; totalAssetBytes: number } = JSON.parse(
  readFileSync(resolve(publicDir, 'object-photos/v1/manifest.json'), 'utf8'),
);
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
    expect(OBJECT_PHOTOS.length).toBeGreaterThanOrEqual(18);
    for (const photo of OBJECT_PHOTOS) {
      expect(isObjectId(photo.objectId)).toBe(true);
      if (photo.objectId.startsWith('dso:')) expect(dsoIds.has(photo.objectId)).toBe(true);
      expect(getObjectPhoto(photo.objectId)).toBe(photo);
    }
    expect(getObjectPhoto('star:HIP91262')).toBeUndefined();
    expect(getObjectPhoto('const:Ori')).toBeUndefined();
    expect(getObjectPhoto('planet:jupiter')?.sourceURL).toContain('/heic2017a/');
    expect(getObjectPhoto('dso:M104')?.sourceURL).toContain('/opo0328a/');
    expect(getObjectPhoto('dso:M31')?.coverage).toBe('detail');
    expect(getObjectPhoto('moon')?.coverage).toBe('detail');
  });

  it('공개 감사 기록과 UI의 크레딧·권리·과학적 설명이 같고 전체 크레딧을 잘라내지 않는다', () => {
    expect(manifest.photos).toEqual(OBJECT_PHOTOS);
    for (const photo of OBJECT_PHOTOS) {
      expect(photo.creditParts.map((part) => part.text).join('')).toBe(photo.credit);
      expect(photo.credit.length).toBeGreaterThan(5);
      expect(photo.license).toBe('CC BY 4.0');
      expect(photo.licenseURL).toBe('https://creativecommons.org/licenses/by/4.0/');
      expect(photo.rightsURL).toMatch(
        /^https:\/\/(esahubble\.org\/copyright\/|www\.eso\.org\/public\/outreach\/copyright\/)$/,
      );
      expect(photo.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(photo.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      for (const part of photo.creditParts)
        if (part.url) expect(new URL(part.url).protocol).toBe('https:');
      for (const language of ['ko', 'en'] as const) {
        expect(photo.title[language]).toBeTruthy();
        expect(photo.caption[language].length).toBeGreaterThan(30);
        expect(photo.modifications[language]).toContain('WebP');
      }
    }
    expect(getObjectPhoto('star:HIP32349')?.caption.en).toContain('diffraction');
    expect(getObjectPhoto('planet:mars')?.spectralBand).toBe('multiwavelength');
    expect(getObjectPhoto('dso:M82')?.spectralBand).toBe('multiwavelength');
  });

  it('배포되는 WebP 자체의 크기·해시·XMP 출처가 일치하고 2MB 예산 안이다', async () => {
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
          photo.verifiedAt,
          photo.sourceSha256,
          photo.modifications.en,
        ])
          expect(xmp).toContain(xml(value));
        total += bytes.length;
      }
      // 양쪽을 contain 축소해 종횡비를 유지한다(정수 픽셀 반올림 허용).
      expect(
        Math.abs(photo.thumb.width * photo.hero.height - photo.thumb.height * photo.hero.width),
      ).toBeLessThanOrEqual(photo.hero.width + photo.hero.height);
    }
    expect(total).toBe(manifest.totalAssetBytes);
    expect(total).toBeLessThanOrEqual(2_000_000);
  });
});
