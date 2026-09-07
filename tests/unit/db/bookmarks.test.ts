import { describe, expect, it } from 'vitest';
import { getDb } from '@/db/database';
import {
  addBookmark,
  bookmarkedIds,
  isBookmarked,
  listBookmarks,
  removeBookmark,
  toggleBookmark,
} from '@/db/repos/bookmarks';

describe('bookmarks(☆ 관측 예정)', () => {
  it('토글·목록·소프트 삭제·되살리기', async () => {
    expect(await isBookmarked('dso:M31')).toBe(false);
    expect(await toggleBookmark('dso:M31')).toBe(true);
    expect(await isBookmarked('dso:M31')).toBe(true);
    await addBookmark('planet:saturn', '충 근처');
    expect((await listBookmarks()).map((b) => b.objectId).sort()).toEqual([
      'dso:M31',
      'planet:saturn',
    ]);

    expect(await toggleBookmark('dso:M31')).toBe(false);
    expect(await isBookmarked('dso:M31')).toBe(false);
    // 행은 남아 있고 deletedAt만 찍힌다
    const rows = await getDb().bookmarks.where('objectId').equals('dso:M31').toArray();
    expect(rows.length).toBe(1);
    expect(rows[0]!.deletedAt).toBeTruthy();

    // 되살리기: 같은 행 재사용
    await addBookmark('dso:M31');
    const again = await getDb().bookmarks.where('objectId').equals('dso:M31').toArray();
    expect(again.length).toBe(1);
    expect(again[0]!.deletedAt).toBeUndefined();
    expect(await bookmarkedIds()).toEqual(new Set(['dso:M31', 'planet:saturn']));
    await removeBookmark('planet:saturn');
    expect((await bookmarkedIds()).size).toBe(1);
  });
});
