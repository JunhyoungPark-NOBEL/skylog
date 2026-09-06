import { dataUrl } from '@/catalog/manifest';
import { decodeStarPack, type StarPack } from '@/catalog/starPackFormat';

export type StarPackName = 'stars-bright' | 'stars-deep';

const cache = new Map<StarPackName, Promise<StarPack>>();

/**
 * 별 팩 로더. 같은 팩은 한 번만 받아 캐시한다. 로드 시간을 콘솔에 남긴다(간단 벤치).
 *   const pack = await loadStarPack('stars-bright');  // positions(Float32Array count×3), mag, bv, hip, hygId
 * 렌더러(T1)는 positions를 그대로 GPU 버퍼로 올리고, 프레임마다 회전행렬 1개만 갱신한다.
 */
export function loadStarPack(name: StarPackName): Promise<StarPack> {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const t0 = performance.now();
      const res = await fetch(dataUrl(`${name}.v1.bin`));
      if (!res.ok) throw new Error(`star pack ${name}: HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const pack = decodeStarPack(buf);
      console.info(
        `[catalog] ${name}: ${pack.count} stars, ${(buf.byteLength / 1024).toFixed(0)} KB, ${(performance.now() - t0).toFixed(0)} ms`,
      );
      return pack;
    })();
    cache.set(name, p);
    p.catch(() => cache.delete(name));
  }
  return p;
}

/** 테스트 전용 */
export function _clearStarPackCache(): void {
  cache.clear();
}
