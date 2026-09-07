/**
 * 장비 테이블(telescopes/eyepieces/binoculars) CRUD — API만 T4에서, UI는 T5에서(task-04 §8).
 * 세 테이블이 같은 규칙(소프트 삭제·updatedAt)이라 팩토리로 만든다.
 */
import type { Table } from 'dexie';
import { getDb, newId, nowIso, type SkylogDB } from '@/db/database';
import { emitDbChange } from '@/db/events';
import {
  DB_SCHEMA_VERSION,
  type BaseRecord,
  type Binoculars,
  type Eyepiece,
  type Telescope,
} from '@/db/types';

type Input<T extends BaseRecord> = Omit<T, keyof BaseRecord> & { id?: string };

interface Repo<T extends BaseRecord> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  upsert(input: Input<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

function makeRepo<T extends BaseRecord>(pick: (db: SkylogDB) => Table<T, string>): Repo<T> {
  return {
    async list() {
      const rows = await pick(getDb()).orderBy('name').toArray();
      return rows.filter((r) => !r.deletedAt);
    },
    async get(id) {
      const row = await pick(getDb()).get(id);
      return row && !row.deletedAt ? row : undefined;
    },
    async upsert(input) {
      const table = pick(getDb());
      const now = nowIso();
      const existing = input.id ? await table.get(input.id) : undefined;
      const record = {
        ...(existing ?? {
          id: input.id ?? newId(),
          createdAt: now,
          schemaVersion: DB_SCHEMA_VERSION,
        }),
        ...input,
        id: existing?.id ?? input.id ?? newId(),
        updatedAt: now,
      } as T;
      delete record.deletedAt;
      await table.put(record);
      emitDbChange('equipment');
      return record;
    },
    async remove(id) {
      const table = pick(getDb());
      const row = await table.get(id);
      if (!row) return;
      const now = nowIso();
      await table.put({ ...row, deletedAt: now, updatedAt: now });
      emitDbChange('equipment');
    },
  };
}

export const telescopes: Repo<Telescope> = makeRepo(
  (db) => db.telescopes as Table<Telescope, string>,
);
export const eyepieces: Repo<Eyepiece> = makeRepo((db) => db.eyepieces as Table<Eyepiece, string>);
export const binoculars: Repo<Binoculars> = makeRepo(
  (db) => db.binoculars as Table<Binoculars, string>,
);
