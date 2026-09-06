import { describe, expect, it } from 'vitest';
import { DB_VERSION, getDb, TABLE_NAMES } from '@/db/database';
import { cacheGet, cachePurgeExpired, cacheSet } from '@/db/repos/cache';
import { getSetting, setSetting } from '@/db/repos/settings';
import {
  DAEJEON_PRESET,
  ensureDefaultSite,
  getDefaultSite,
  listSites,
  softDeleteSite,
  upsertSite,
} from '@/db/repos/sites';

describe('SkylogDB v1 스키마 (D-010)', () => {
  it('10개 테이블이 버전 1로 생성된다', async () => {
    const db = getDb();
    await db.open();
    expect(db.verno).toBe(DB_VERSION);
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual([...TABLE_NAMES].sort());
    expect(names).toHaveLength(10);
  });

  it('observations 인덱스에 objectId·nightKey·multiEntry tags가 있다', async () => {
    const db = getDb();
    await db.open();
    const idx = db.observations.schema.indexes.map((i) => i.name);
    expect(idx).toEqual(expect.arrayContaining(['objectId', 'nightKey', 'tags']));
    expect(db.observations.schema.indexes.find((i) => i.name === 'tags')?.multi).toBe(true);
    expect(db.settings.schema.primKey.name).toBe('key');
  });
});

describe('settings 리포지토리', () => {
  it('key-value로 저장·조회한다', async () => {
    await setSetting('theme', 'night');
    expect(await getSetting<string>('theme')).toBe('night');
    expect(await getSetting('missing')).toBeUndefined();
  });
});

describe('cache 리포지토리', () => {
  it('TTL이 지나면 값을 돌려주지 않고 정리된다', async () => {
    await cacheSet('weather', { cloud: 20 }, 1000);
    expect(await cacheGet<{ cloud: number }>('weather')).toEqual({ cloud: 20 });
    await cacheSet('old', 1, -1);
    expect(await cacheGet('old')).toBeUndefined();
    await cacheSet('old2', 1, -1);
    expect(await cachePurgeExpired()).toBe(1);
  });
});

describe('sites 리포지토리', () => {
  it('기본 관측지가 없으면 대전 프리셋을 만든다', async () => {
    const site = await ensureDefaultSite();
    expect(site.name).toBe(DAEJEON_PRESET.name);
    expect(site.lat).toBeCloseTo(36.37);
    const def = await getDefaultSite();
    expect(def?.id).toBe(site.id);
  });

  it('기본 관측지는 하나만 유지되고 소프트 삭제된 관측지는 목록에서 빠진다', async () => {
    const a = await upsertSite({ name: 'A', lat: 1, lon: 2, isDefault: true });
    const b = await upsertSite({ name: 'B', lat: 3, lon: 4, isDefault: true });
    expect((await getDefaultSite())?.id).toBe(b.id);
    expect((await listSites()).map((s) => s.name)).toEqual(['A', 'B']);
    await softDeleteSite(a.id);
    expect((await listSites()).map((s) => s.name)).toEqual(['B']);
  });
});
