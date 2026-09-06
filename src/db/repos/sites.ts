import { getDb, newId, nowIso } from '@/db/database';
import { DB_SCHEMA_VERSION, type BaseRecord, type Site } from '@/db/types';

/** 기본 관측지 프리셋 (마스터 플랜 §2): 대전, KAIST 부근. 첫 실행 시 GPS로 대체(T2). */
export const DAEJEON_PRESET = {
  name: '대전 (KAIST)',
  lat: 36.37,
  lon: 127.36,
  elevation: 70,
} as const;

export async function listSites(): Promise<Site[]> {
  const rows = await getDb().sites.orderBy('name').toArray();
  return rows.filter((s) => !s.deletedAt);
}

export async function getDefaultSite(): Promise<Site | undefined> {
  const rows = await getDb().sites.where('isDefault').equals(1).toArray();
  return rows.find((s) => !s.deletedAt);
}

type SiteInput = Omit<Site, keyof BaseRecord> & { id?: string };

/** 관측지 추가/갱신. `isDefault`는 Dexie 인덱스를 위해 1/undefined로 저장한다. */
export async function upsertSite(input: SiteInput): Promise<Site> {
  const db = getDb();
  const now = nowIso();
  const existing = input.id ? await db.sites.get(input.id) : undefined;
  const record: Site = {
    ...(existing ?? { id: input.id ?? newId(), createdAt: now, schemaVersion: DB_SCHEMA_VERSION }),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    updatedAt: now,
  };
  // Dexie는 boolean을 인덱싱하지 않으므로 기본 관측지 플래그는 1로 저장한다.
  if (record.isDefault) {
    (record as { isDefault?: unknown }).isDefault = 1;
    await db.transaction('rw', db.sites, async () => {
      const others = await db.sites.where('isDefault').equals(1).toArray();
      for (const o of others) {
        if (o.id !== record.id)
          await db.sites.update(o.id, { isDefault: undefined, updatedAt: now });
      }
      await db.sites.put(record);
    });
  } else {
    delete record.isDefault;
    await db.sites.put(record);
  }
  return record;
}

export async function softDeleteSite(id: string): Promise<void> {
  const now = nowIso();
  await getDb().sites.update(id, { deletedAt: now, updatedAt: now, isDefault: undefined });
}

/** 관측지가 하나도 없으면 대전 프리셋을 기본으로 만든다. */
export async function ensureDefaultSite(): Promise<Site> {
  const existing = await getDefaultSite();
  if (existing) return existing;
  const any = await listSites();
  if (any[0]) return upsertSite({ ...any[0], isDefault: true });
  return upsertSite({ ...DAEJEON_PRESET, isDefault: true });
}
