import { getDb, nowIso } from '@/db/database';

/** 만료되지 않은 캐시 값을 읽는다. 만료됐으면 지우고 undefined. */
export async function cacheGet<T = unknown>(key: string): Promise<T | undefined> {
  const db = getDb();
  const row = await db.cache.get(key);
  if (!row) return undefined;
  if (Date.parse(row.expiresAt) <= Date.now()) {
    await db.cache.delete(key);
    return undefined;
  }
  return row.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlMs: number): Promise<void> {
  const now = Date.now();
  await getDb().cache.put({
    key,
    value,
    expiresAt: new Date(now + ttlMs).toISOString(),
    updatedAt: nowIso(),
  });
}

export async function cacheDelete(key: string): Promise<void> {
  await getDb().cache.delete(key);
}

/** 만료된 항목 정리. 삭제 개수를 돌려준다. */
export async function cachePurgeExpired(now: Date = new Date()): Promise<number> {
  return getDb().cache.where('expiresAt').below(now.toISOString()).delete();
}
