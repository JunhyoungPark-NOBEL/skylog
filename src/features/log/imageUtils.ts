/**
 * 사진 리사이즈(task-04 §4): 긴 변 ≤ maxPx로 줄여 JPEG Blob으로 만든다. 원본은 저장하지 않는다.
 * `createImageBitmap(file, { imageOrientation: 'from-image' })`로 EXIF 방향을 적용하고, 지원하지 않으면 `<img>`로 디코드한다.
 * 실패하면 예외를 던진다 — 호출자는 원본을 그대로 넣지 말고 안내를 보여 준다.
 */
import { useEffect, useState } from 'react';
import { getBlob } from '@/db/repos/blobs';

export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

export interface ResizeOptions {
  mime?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 0..1 (jpeg/webp) */
  quality?: number;
}

export const PHOTO_MAX_PX = 1600;
export const THUMB_MAX_PX = 160;

/** 긴 변이 maxPx를 넘지 않는 크기 */
export function fitWithin(
  width: number,
  height: number,
  maxPx: number,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) throw new Error('invalid image size');
  const scale = Math.min(1, maxPx / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

type Drawable = ImageBitmap | HTMLImageElement;

async function decode(file: Blob): Promise<{ img: Drawable; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { img: bmp, width: bmp.width, height: bmp.height };
    } catch {
      /* 폴백으로 */
    }
  }
  if (typeof document === 'undefined') throw new Error('no image decoder');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image decode failed'));
      el.src = url;
    });
    return { img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    // 그리기 전에 revoke하면 일부 브라우저에서 draw가 실패하므로 다음 틱에 해제
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), mime, quality);
  });
}

/** 이미지 파일 → 긴 변 ≤ maxPx의 Blob. 실패하면 throw. */
export async function resizeImage(
  file: Blob,
  maxPx = PHOTO_MAX_PX,
  opts: ResizeOptions = {},
): Promise<ResizedImage> {
  const mime = opts.mime ?? 'image/jpeg';
  const quality = opts.quality ?? 0.86;
  const { img, width: w0, height: h0 } = await decode(file);
  try {
    const { width, height } = fitWithin(w0, h0, maxPx);
    if (typeof document === 'undefined') throw new Error('no canvas');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob.size) throw new Error('empty image');
    return { blob, width, height };
  } finally {
    if ('close' in img && typeof img.close === 'function') img.close();
  }
}

/** 목록용 썸네일(긴 변 ≤ 160px) */
export function makeThumbnail(blob: Blob, maxPx = THUMB_MAX_PX): Promise<ResizedImage> {
  return resizeImage(blob, maxPx, { mime: 'image/jpeg', quality: 0.8 });
}

/**
 * 저장된 blob id → 미리보기용 object URL. id가 바뀌면 이전 URL은 해제한다.
 * (동기 setState 없이 `{id,url}` 쌍으로 들고 있어 stale 값을 돌려주지 않는다)
 */
export function useBlobUrl(blobId: string | null | undefined): string | null {
  const [state, setState] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!blobId) return;
    let alive = true;
    let url: string | null = null;
    void getBlob(blobId).then((rec) => {
      if (!alive || !rec) return;
      url = URL.createObjectURL(rec.data);
      setState({ id: blobId, url });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blobId]);
  return blobId && state?.id === blobId ? state.url : null;
}
