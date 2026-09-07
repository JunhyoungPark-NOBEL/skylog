/**
 * 콘텐츠 팩 로더 (task-06 §3.5). index.json은 한 번, 항목은 열 때마다 지연 로드(메모리 캐시).
 * 서비스 워커가 `/data/content/`를 StaleWhileRevalidate로 캐시하므로 첫 열람 후 오프라인에서도 읽힌다.
 */
import type { ObjectId } from '@/catalog/objectId';
import { dataUrl } from '@/catalog/manifest';
import type { ContentEntry, ContentIndex, ContentIndexEntry } from '@/content/schema';

let indexPromise: Promise<ContentIndex | null> | null = null;
const entryCache = new Map<string, Promise<ContentEntry | null>>();

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json')) return null; // SPA fallback(index.html) 방지
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function loadContentIndex(): Promise<ContentIndex | null> {
  indexPromise ??= fetchJson<ContentIndex>(dataUrl('content/v1/index.json')).then((idx) => {
    if (!idx || idx.schema !== 'skylog-content-index') {
      indexPromise = null;
      return null;
    }
    return idx;
  });
  return indexPromise;
}

export async function contentIndexEntry(id: ObjectId): Promise<ContentIndexEntry | null> {
  const idx = await loadContentIndex();
  return idx?.entries.find((e) => e.id === id) ?? null;
}

/** 항목 본문. 없으면 null(스토리 없는 대상). */
export function loadContentEntry(id: ObjectId): Promise<ContentEntry | null> {
  let p = entryCache.get(id);
  if (!p) {
    p = (async () => {
      const meta = await contentIndexEntry(id);
      if (!meta) return null;
      const e = await fetchJson<ContentEntry>(dataUrl(`content/v1/${meta.file}?v=${meta.version}`));
      return e && e.id === id ? e : null;
    })();
    p = p.then((entry) => {
      if (!entry) entryCache.delete(id);
      return entry;
    });
    entryCache.set(id, p);
  }
  return p;
}

/** 테스트 전용: 캐시 초기화 */
export function resetContentCache(): void {
  indexPromise = null;
  entryCache.clear();
}
