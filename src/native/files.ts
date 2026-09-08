import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]!);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const path = 'exports/' + Date.now() + '-' + filename;
    const result = await Filesystem.writeFile({
      directory: Directory.Cache,
      path,
      data,
      recursive: true,
    });
    // Android 공유 대상이 파일을 늦게 읽을 수 있어 완료 직후 삭제하지 않는다. OS 임시 캐시에만 둔다.
    await Share.share({ title: filename, files: [result.uri] });
    return;
  }
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
