/**
 * "관측 예정"(☆) 북마크 저장소. T3가 토글을 만들고 T4가 목록·통계 UI를 확장한다.
 * 소프트 삭제(deletedAt)로 지워서 동기화·내보내기 규칙(§6.3)을 지킨다.
 */
import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { DB_SCHEMA_VERSION, type Bookmark } from '@/db/types';
import type { ObjectId } from '@/catalog/objectId';

export async function listBookmarks(): Promise<Bookmark[]> {
  const rows = await getDb().bookmarks.orderBy('updatedAt').reverse().toArray();
  return rows.filter((b) => !b.deletedAt);
}

export async function getBookmark(objectId: ObjectId): Promise<Bookmark | undefined> {
  const rows = await getDb().bookmarks.where('objectId').equals(objectId).toArray();
  return rows.find((b) => !b.deletedAt);
}

export async function isBookmarked(objectId: ObjectId): Promise<boolean> {
  return (await getBookmark(objectId)) !== undefined;
}

export async function addBookmark(objectId: ObjectId, note?: string): Promise<Bookmark> {
  const db = getDb();
  const existing = await getBookmark(objectId);
  if (existing) return existing;
  const now = nowIso();
  // 소프트 삭제된 행이 있으면 되살린다
  const deleted = (await db.bookmarks.where('objectId').equals(objectId).toArray())[0];
  const record: Bookmark = deleted
    ? { ...deleted, deletedAt: undefined, updatedAt: now, note }
    : {
        id: newId(),
        objectId,
        note,
        createdAt: now,
        updatedAt: now,
        schemaVersion: DB_SCHEMA_VERSION,
      };
  if (record.note === undefined) delete record.note;
  if (record.deletedAt === undefined) delete record.deletedAt;
  await db.bookmarks.put(record);
  emitDbChange('bookmarks');
  return record;
}

export async function removeBookmark(objectId: ObjectId): Promise<void> {
  const existing = await getBookmark(objectId);
  if (!existing) return;
  const now = nowIso();
  await getDb().bookmarks.update(existing.id, { deletedAt: now, updatedAt: now });
  emitDbChange('bookmarks');
}

/** 토글 후 상태(true = 북마크됨) */
export async function toggleBookmark(objectId: ObjectId): Promise<boolean> {
  if (await isBookmarked(objectId)) {
    await removeBookmark(objectId);
    return false;
  }
  await addBookmark(objectId);
  return true;
}

export async function bookmarkedIds(): Promise<Set<ObjectId>> {
  return new Set((await listBookmarks()).map((b) => b.objectId));
}
