/** 로컬 원본은 건드리지 않고 공개용 사본만 만든다. 서버에서 다시 검증·재인코딩한다. */
export async function prepareCommunityImage(file: File): Promise<Blob> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error('INVALID_IMAGE');
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('INVALID_IMAGE');
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('INVALID_IMAGE'))),
        'image/jpeg',
        0.87,
      ),
    );
    if (blob.size > 2200000) throw new Error('INVALID_IMAGE');
    return blob;
  } finally {
    bitmap.close();
  }
}
