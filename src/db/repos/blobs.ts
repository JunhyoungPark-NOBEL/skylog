/**
 * 스케치·사진 바이너리 저장소(task-04). 원본을 그대로 넣지 않는다 — 호출자가 리사이즈한 Blob만 저장한다.
 * 소프트 삭제(deletedAt)이지만 용량이 크므로 `purgeDeletedBlobs`로 실제 삭제할 수 있다.
 */
import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { DB_SCHEMA_VERSION, type BlobRecord } from '@/db/types';

export interface BlobMeta {
  width?: number;
  height?: number;
}

export async function putBlob(
  kind: BlobRecord['kind'],
  data: Blob,
  meta: BlobMeta = {},
): Promise<BlobRecord> {
  const now = nowIso();
  const record: BlobRecord = {
    id: newId(),
    kind,
    mime: data.type || 'application/octet-stream',
    size: data.size,
    data,
    createdAt: now,
    updatedAt: now,
    schemaVersion: DB_SCHEMA_VERSION,
  };
  if (meta.width !== undefined) record.width = meta.width;
  if (meta.height !== undefined) record.height = meta.height;
  await getDb().blobs.put(record);
  emitDbChange('blobs');
  return record;
}

/** 같은 id로 내용 교체(스케치 재편집). 없으면 undefined. */
export async function replaceBlob(
  id: string,
  data: Blob,
  meta: BlobMeta = {},
): Promise<BlobRecord | undefined> {
  const db = getDb();
  const existing = await db.blobs.get(id);
  if (!existing) return undefined;
  const record: BlobRecord = {
    ...existing,
    data,
    mime: data.type || existing.mime,
    size: data.size,
    updatedAt: nowIso(),
  };
  if (meta.width !== undefined) record.width = meta.width;
  if (meta.height !== undefined) record.height = meta.height;
  delete record.deletedAt;
  await db.blobs.put(record);
  emitDbChange('blobs');
  return record;
}

export async function getBlob(id: string): Promise<BlobRecord | undefined> {
  const row = await getDb().blobs.get(id);
  return row && !row.deletedAt ? row : undefined;
}

export async function deleteBlob(id: string): Promise<void> {
  const now = nowIso();
  await getDb().blobs.update(id, { deletedAt: now, updatedAt: now });
  emitDbChange('blobs');
}

/** 소프트 삭제된 blob을 실제로 지운다(용량 회수). 지운 개수. */
export async function purgeDeletedBlobs(): Promise<number> {
  const db = getDb();
  const rows = (await db.blobs.toArray()).filter((b) => b.deletedAt);
  await db.blobs.bulkDelete(rows.map((b) => b.id));
  if (rows.length) emitDbChange('blobs');
  return rows.length;
}

/** 저장된 blob 총 용량(삭제 제외, 바이트). */
export async function blobsTotalBytes(): Promise<number> {
  const rows = await getDb().blobs.toArray();
  return rows.filter((b) => !b.deletedAt).reduce((s, b) => s + (b.size ?? 0), 0);
}
