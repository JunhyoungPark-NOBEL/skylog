import { describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { DB_VERSION, getDb, SkylogDB } from '@/db/database';
import { emitDbChange, onDbChange } from '@/db/events';
import { toggleBookmark } from '@/db/repos/bookmarks';
import { blobsTotalBytes, getBlob, putBlob, purgeDeletedBlobs, deleteBlob } from '@/db/repos/blobs';
import { binoculars, telescopes } from '@/db/repos/equipment';
import {
  addObservation,
  deleteObservation,
  getObservation,
  listObservations,
  observedSets,
  restoreObservation,
  updateObservation,
  type ObservationInput,
} from '@/db/repos/observations';
import { markerKindOf, startLogSync, useLogStore } from '@/state/logStore';

const SITE = { lat: 36.37, lon: 127.36, elevation: 70, name: '대전 (KAIST)' };

function input(over: Partial<ObservationInput> = {}): ObservationInput {
  return {
    objectId: 'planet:saturn',
    observedAt: '2026-09-06T12:30:00.000Z', // 21:30 KST
    outcome: 'seen',
    site: SITE,
    notes: '',
    tags: [],
    ...over,
  };
}

describe('observations 리포지토리', () => {
  it('추가하면 nightKey(현지 정오→정오)·타임스탬프·schemaVersion이 채워진다', async () => {
    const o = await addObservation(input());
    expect(o.id).toMatch(/[0-9a-f-]{36}/);
    expect(o.nightKey).toBe('2026-09-06');
    expect(o.createdAt).toBe(o.updatedAt);
    expect(o.schemaVersion).toBe(1);
    // 자정 넘은 기록(02:00 KST)은 같은 밤
    const late = await addObservation(input({ observedAt: '2026-09-06T17:00:00.000Z' }));
    expect(late.nightKey).toBe('2026-09-06');
    // 정오 이전(11:00 KST)도 전날 밤
    const morning = await addObservation(input({ observedAt: '2026-09-07T02:00:00.000Z' }));
    expect(morning.nightKey).toBe('2026-09-06');
    const noon = await addObservation(input({ observedAt: '2026-09-07T03:00:00.000Z' }));
    expect(noon.nightKey).toBe('2026-09-07');
  });

  it('목록은 최근순이고 objectId·nightKey·기간·outcome으로 거른다', async () => {
    await addObservation(input({ observedAt: '2026-09-01T12:00:00.000Z' }));
    await addObservation(input({ observedAt: '2026-09-05T12:00:00.000Z', objectId: 'dso:M31' }));
    await addObservation(
      input({ observedAt: '2026-09-06T12:00:00.000Z', objectId: 'dso:M31', outcome: 'notSeen' }),
    );
    const all = await listObservations();
    expect(all.map((o) => o.observedAt.slice(0, 10))).toEqual([
      '2026-09-06',
      '2026-09-05',
      '2026-09-01',
    ]);
    expect((await listObservations({ objectId: 'dso:M31' })).length).toBe(2);
    expect((await listObservations({ nightKey: '2026-09-05' })).length).toBe(1);
    expect(
      (
        await listObservations({
          from: new Date('2026-09-03T00:00:00Z'),
          to: new Date('2026-09-06T00:00:00Z'),
        })
      ).length,
    ).toBe(1);
    expect((await listObservations({ outcome: 'notSeen' })).length).toBe(1);
    expect((await listObservations({ limit: 2 })).length).toBe(2);
  });

  it('편집하면 updatedAt·nightKey가 갱신되고, 소프트 삭제 → 되살리기가 된다', async () => {
    const o = await addObservation(input());
    const edited = await updateObservation(o.id, {
      observedAt: '2026-09-10T14:00:00.000Z',
      rating: 4,
      tags: ['ring'],
    });
    expect(edited?.nightKey).toBe('2026-09-10');
    expect(edited?.rating).toBe(4);
    expect(edited?.tags).toEqual(['ring']);
    expect(edited!.updatedAt >= o.updatedAt).toBe(true);
    await deleteObservation(o.id);
    expect(await getObservation(o.id)).toBeUndefined();
    expect((await listObservations()).length).toBe(0);
    expect((await listObservations({ includeDeleted: true })).length).toBe(1);
    await restoreObservation(o.id);
    expect(await getObservation(o.id)).toBeTruthy();
    expect(await updateObservation('nope', { rating: 1 })).toBeUndefined();
  });

  it('observedSets: 본 것 > 시도 우선, 대상별 개수', async () => {
    await addObservation(input({ objectId: 'dso:M13', outcome: 'notSeen' }));
    await addObservation(input({ objectId: 'dso:M13', outcome: 'seen' }));
    await addObservation(input({ objectId: 'dso:M51', outcome: 'notSeen' }));
    await addObservation(input({ objectId: 'planet:saturn' }));
    const s = await observedSets();
    expect([...s.observed].sort()).toEqual(['dso:M13', 'planet:saturn']);
    expect([...s.attempted]).toEqual(['dso:M51']);
    expect(s.countByObject.get('dso:M13')).toBe(2);
  });

  it('쓰기마다 DB 변경 이벤트가 난다', async () => {
    const spy = vi.fn();
    const off = onDbChange(spy);
    const o = await addObservation(input());
    await updateObservation(o.id, { rating: 5 });
    await deleteObservation(o.id);
    await restoreObservation(o.id);
    await toggleBookmark('dso:M31');
    expect(spy.mock.calls.map((c) => c[0])).toEqual([
      'observations',
      'observations',
      'observations',
      'observations',
      'bookmarks',
    ]);
    off();
    emitDbChange('all');
    expect(spy).toHaveBeenCalledTimes(5);
  });
});

describe('blobs · equipment 리포지토리', () => {
  it('blob 저장·조회·소프트 삭제·정리·총 용량', async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    const b = await putBlob('sketch', png, { width: 600, height: 600 });
    expect(b.mime).toBe('image/png');
    expect(b.size).toBe(4);
    expect(b.width).toBe(600);
    expect((await getBlob(b.id))?.id).toBe(b.id);
    expect(await blobsTotalBytes()).toBe(4);
    await deleteBlob(b.id);
    expect(await getBlob(b.id)).toBeUndefined();
    expect(await blobsTotalBytes()).toBe(0);
    expect(await purgeDeletedBlobs()).toBe(1);
    expect(await getDb().blobs.count()).toBe(0);
  });

  it('장비 CRUD(API만)', async () => {
    const t = await telescopes.upsert({
      name: 'SV48P',
      apertureMm: 90,
      focalLengthMm: 500,
      mountType: 'altaz',
    });
    const t2 = await telescopes.upsert({ ...t, name: 'SV48P 90/500' });
    expect(t2.id).toBe(t.id);
    expect((await telescopes.list()).map((x) => x.name)).toEqual(['SV48P 90/500']);
    await telescopes.remove(t.id);
    expect(await telescopes.list()).toEqual([]);
    await binoculars.upsert({ name: '10×50', magnification: 10, apertureMm: 50, fovDeg: 6.5 });
    expect((await binoculars.list()).length).toBe(1);
  });
});

describe('logStore', () => {
  it('refresh로 ★/회색 ★/☆ 집합과 최근 기록을 읽고, DB 변경을 구독하면 자동 갱신된다', async () => {
    const stop = startLogSync();
    await addObservation(input({ objectId: 'dso:M13' }));
    await addObservation(input({ objectId: 'dso:M51', outcome: 'notSeen' }));
    await toggleBookmark('dso:M31');
    await new Promise((r) => setTimeout(r, 20));
    const s = useLogStore.getState();
    expect(s.ready).toBe(true);
    expect(markerKindOf(s, 'dso:M13')).toBe('observed');
    expect(markerKindOf(s, 'dso:M51')).toBe('attempted');
    expect(markerKindOf(s, 'dso:M31')).toBe('bookmarked');
    expect(markerKindOf(s, 'dso:M42')).toBeNull();
    expect(s.recent.length).toBe(2);
    expect(s.countByObject.get('dso:M13')).toBe(1);
    stop();
  });
});

describe('DB v1 → v2 마이그레이션', () => {
  it('v1로 만든 데이터가 v2에서 보존되고 빠진 필드가 채워진다', async () => {
    const name = `skylog-migrate-${Date.now()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({
      observations:
        'id, objectId, observedAt, nightKey, outcome, siteId, sessionId, updatedAt, deletedAt, *tags',
      bookmarks: 'id, objectId, updatedAt, deletedAt',
      sites: 'id, name, isDefault, updatedAt, deletedAt',
      telescopes: 'id, name, updatedAt, deletedAt',
      eyepieces: 'id, name, updatedAt, deletedAt',
      binoculars: 'id, name, updatedAt, deletedAt',
      blobs: 'id, kind, updatedAt, deletedAt',
      progress: 'id, &key, updatedAt, deletedAt',
      settings: '&key, updatedAt',
      cache: '&key, expiresAt',
    });
    await v1.open();
    await v1.table('observations').put({
      id: 'old-1',
      objectId: 'dso:M31',
      observedAt: '2026-08-20T13:00:00.000Z',
      outcome: 'seen',
      site: SITE,
      createdAt: '2026-08-20T13:00:00.000Z',
      updatedAt: '2026-08-20T13:00:00.000Z',
      schemaVersion: 1,
      // notes·tags·nightKey 빠짐
    });
    await v1.table('bookmarks').put({
      id: 'bm-1',
      objectId: 'dso:M13',
      createdAt: 'x',
      updatedAt: 'x',
      schemaVersion: 1,
    });
    v1.close();

    const v2 = new SkylogDB(name);
    await v2.open();
    expect(v2.verno).toBe(DB_VERSION);
    const row = await v2.observations.get('old-1');
    expect(row?.tags).toEqual([]);
    expect(row?.notes).toBe('');
    expect(row?.nightKey).toBe('2026-08-20');
    expect(await v2.bookmarks.count()).toBe(1);
    await v2.delete();
  });
});
