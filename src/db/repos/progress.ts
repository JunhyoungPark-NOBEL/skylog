/**
 * `progress` 테이블(key-value, 유일 key) 리포지토리 — 콘텐츠 읽음(T6)·미션/배지/퀴즈 SR 상태(T7)가 쓴다.
 * 키 규칙: `content.read:<ObjectId>`, `content.report:<ObjectId>`, `learn.mission:<id>`, `learn.badge:<id>`, `learn.sr:<quizId>`, `learn.event:<n>`.
 */
import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { DB_SCHEMA_VERSION, type Progress } from '@/db/types';

export async function getProgress<T = unknown>(key: string): Promise<T | undefined> {
  const row = await getDb().progress.where('key').equals(key).first();
  return row && !row.deletedAt ? (row.value as T) : undefined;
}

export async function setProgress(key: string, value: unknown): Promise<Progress> {
  const db = getDb();
  const now = nowIso();
  const existing = await db.progress.where('key').equals(key).first();
  const record: Progress = existing
    ? { ...existing, value, updatedAt: now }
    : { id: newId(), key, value, createdAt: now, updatedAt: now, schemaVersion: DB_SCHEMA_VERSION };
  delete record.deletedAt;
  await db.progress.put(record);
  emitDbChange('progress');
  return record;
}

export async function deleteProgress(key: string): Promise<void> {
  const db = getDb();
  const existing = await db.progress.where('key').equals(key).first();
  if (!existing) return;
  const now = nowIso();
  await db.progress.update(existing.id, { deletedAt: now, updatedAt: now });
  emitDbChange('progress');
}

/** 접두사로 시작하는 살아 있는 항목 전부(key → value). */
export async function listProgress<T = unknown>(prefix: string): Promise<Map<string, T>> {
  const rows = await getDb().progress.where('key').startsWith(prefix).toArray();
  const out = new Map<string, T>();
  for (const r of rows) if (!r.deletedAt) out.set(r.key, r.value as T);
  return out;
}
