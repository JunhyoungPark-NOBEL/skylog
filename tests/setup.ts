// Vitest 공통 셋업: IndexedDB 폴리필(fake-indexeddb) — Dexie 테스트용.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { SkylogDB, setDbForTesting } from '@/db/database';

let counter = 0;

/** 테스트마다 격리된 DB 인스턴스를 전역으로 꽂는다. */
beforeEach(() => {
  counter += 1;
  setDbForTesting(new SkylogDB(`skylog-test-${Date.now()}-${counter}`));
});

afterEach(async () => {
  const { getDb } = await import('@/db/database');
  const db = getDb();
  await db.delete();
  setDbForTesting(null);
});
