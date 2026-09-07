import { describe, expect, it, vi } from 'vitest';
import { getDb } from '@/db/database';
import {
  BACKUP_LAST_AT_KEY,
  BACKUP_SNOOZE_KEY,
  backupReminderDue,
  base64ToBytes,
  bundleToJson,
  bytesToBase64,
  clearAllData,
  CSV_HEADER,
  csvCell,
  encodeBlobEntry,
  exportBundle,
  formatLocalCsvTime,
  getBackupSnoozeUntil,
  getLastBackupAt,
  importBundle,
  isSnoozed,
  markBackedUp,
  observationsToCsv,
  parseBlobEntry,
  parseBundle,
  previewImport,
  snoozeBackupReminder,
} from '@/db/exportImport';
import { onDbChange } from '@/db/events';
import { getBlob, putBlob } from '@/db/repos/blobs';
import { addBookmark, listBookmarks } from '@/db/repos/bookmarks';
import { telescopes } from '@/db/repos/equipment';
import { addObservation, listObservations } from '@/db/repos/observations';
import { getSetting, setSetting } from '@/db/repos/settings';
import { listSites, upsertSite } from '@/db/repos/sites';
import type { ExportBundle, Observation } from '@/db/types';

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3, 250, 254, 255]);
const JPG = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]);

async function seed() {
  const site = await upsertSite({
    name: '집',
    lat: 36.37215,
    lon: 127.36299,
    elevation: 70,
    bortle: 7,
    isDefault: true,
  });
  const tel = await telescopes.upsert({
    name: '8인치 돕소니언',
    apertureMm: 203,
    focalLengthMm: 1200,
    mountType: 'altaz',
  });
  const sketch = await putBlob('sketch', new Blob([PNG], { type: 'image/png' }), {
    width: 600,
    height: 600,
  });
  const photo = await putBlob('photo', new Blob([JPG], { type: 'image/jpeg' }), {
    width: 1600,
    height: 1200,
  });
  const obs = await addObservation({
    objectId: 'dso:M31',
    observedAt: '2026-09-06T12:30:00.000Z', // 21:30 KST
    outcome: 'seen',
    siteId: site.id,
    site: { lat: site.lat, lon: site.lon, elevation: 70, name: '집' },
    equipment: { kind: 'telescope', telescopeId: tel.id, magnification: 48 },
    conditions: { seeing: 3, transparency: 4, moonIllum: 0.4321, altDeg: 45.67, azDeg: 123.45 },
    rating: 4,
    notes: '안드로메다, 쌍따옴표 "테스트", 쉼표\n둘째 줄',
    tags: ['타원', '중심 밝음'],
    sketchBlobId: sketch.id,
    photoBlobIds: [photo.id],
  });
  const obs2 = await addObservation({
    objectId: 'planet:saturn',
    observedAt: '2026-09-05T13:00:00.000Z',
    outcome: 'notSeen',
    site: { lat: site.lat, lon: site.lon },
    notes: '',
    tags: [],
  });
  const bookmark = await addBookmark('dso:M42', '겨울에');
  const now = new Date().toISOString();
  await getDb().progress.put({
    id: 'progress-1',
    key: 'mission:first-light',
    value: { done: true },
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  });
  await setSetting('settings.theme', 'night');
  return { site, tel, sketch, photo, obs, obs2, bookmark };
}

function minimalBundle(observations: Partial<Observation>[] = []): ExportBundle {
  const now = '2026-09-06T12:00:00.000Z';
  return {
    app: 'skylog',
    schemaVersion: 1,
    exportedAt: now,
    data: {
      observations: observations.map(
        (o, i) =>
          ({
            id: `obs-${i}`,
            objectId: 'dso:M31',
            observedAt: now,
            nightKey: '2026-09-06',
            outcome: 'seen',
            site: { lat: 36.37, lon: 127.36 },
            notes: '',
            tags: [],
            createdAt: now,
            updatedAt: now,
            schemaVersion: 1,
            ...o,
          }) as Observation,
      ),
      bookmarks: [],
      sites: [],
      equipment: { telescopes: [], eyepieces: [], binoculars: [] },
      progress: [],
      settings: [],
    },
    blobs: {},
  };
}

async function blobBytes(id: string): Promise<number[]> {
  const rec = await getBlob(id);
  if (!rec) return [];
  return Array.from(new Uint8Array(await rec.data.arrayBuffer()));
}

describe('base64·blob 항목 인코딩', () => {
  it('bytes ↔ base64 왕복', () => {
    const big = new Uint8Array(70_000).map((_, i) => i % 251);
    expect(base64ToBytes(bytesToBase64(big))).toEqual(big);
    expect(bytesToBase64(new Uint8Array([]))).toBe('');
  });

  it('data URL 파라미터에 메타를 싣고 되읽는다(순수 base64도 허용)', () => {
    const text = encodeBlobEntry(
      {
        id: 'b1',
        kind: 'sketch',
        mime: 'image/png',
        width: 600,
        height: 400,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
        schemaVersion: 1,
      },
      'AAEC',
    );
    expect(text.startsWith('data:image/png;')).toBe(true);
    expect(parseBlobEntry(text)).toEqual({
      mime: 'image/png',
      base64: 'AAEC',
      kind: 'sketch',
      width: 600,
      height: 400,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    });
    expect(parseBlobEntry('AAEC')).toEqual({ mime: 'application/octet-stream', base64: 'AAEC' });
  });
});

describe('exportBundle → importBundle 왕복', () => {
  it('관측·북마크·관측지·장비·progress·설정·blob(base64)이 그대로 돌아온다', async () => {
    const s = await seed();
    const bundle = await exportBundle();
    expect(bundle.app).toBe('skylog');
    expect(bundle.data.observations).toHaveLength(2);
    expect(Object.keys(bundle.blobs).sort()).toEqual([s.sketch.id, s.photo.id].sort());
    expect(bundle.blobs[s.sketch.id]).toMatch(/^data:image\/png;kind=sketch;width=600;height=600;/);

    const json = bundleToJson(bundle);
    const parsed = parseBundle(json);
    expect(parsed.error).toBeUndefined();

    // 전체 삭제 뒤 복원
    const events: string[] = [];
    const off = onDbChange((t) => events.push(t));
    await clearAllData();
    const db = getDb();
    expect(await db.observations.count()).toBe(0);
    expect(await db.blobs.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    expect(events).toEqual(['all']);

    const r = await importBundle(parsed.bundle!, { policy: 'newest' });
    off();
    expect(events).toEqual(['all', 'all']);
    // 관측 2 + blob 2 + 관측지 1 + 망원경 1 + 북마크 1 + progress 1
    expect(r).toEqual({ added: 8, replaced: 0, skipped: 0, remapped: 0 });

    expect(await listObservations()).toEqual([s.obs, s.obs2]);
    expect(await listSites()).toEqual([s.site]);
    expect(await telescopes.list()).toEqual([s.tel]);
    expect(await listBookmarks()).toEqual([s.bookmark]);
    expect((await db.progress.get('progress-1'))?.value).toEqual({ done: true });
    expect(await getSetting('settings.theme')).toBe('night');

    const sketch = await getBlob(s.sketch.id);
    expect(sketch).toMatchObject({
      id: s.sketch.id,
      kind: 'sketch',
      mime: 'image/png',
      size: PNG.length,
      width: 600,
      height: 600,
      createdAt: s.sketch.createdAt,
      updatedAt: s.sketch.updatedAt,
    });
    expect(await blobBytes(s.sketch.id)).toEqual(Array.from(PNG));
    expect((await getBlob(s.photo.id))?.mime).toBe('image/jpeg');
    expect(await blobBytes(s.photo.id)).toEqual(Array.from(JPG));
  });

  it('roundCoords는 관측·관측지 좌표를 소수점 2자리로, includeBlobs=false는 blobs를 비운다', async () => {
    await seed();
    const bundle = await exportBundle({ roundCoords: true, includeBlobs: false });
    expect(bundle.blobs).toEqual({});
    expect(bundle.data.observations[0]!.site).toMatchObject({ lat: 36.37, lon: 127.36 });
    expect(bundle.data.sites[0]).toMatchObject({ lat: 36.37, lon: 127.36 });
    // DB 원본은 그대로
    expect((await listSites())[0]!.lat).toBe(36.37215);
  });

  it('소프트 삭제된 행은 내보내지 않는다', async () => {
    const s = await seed();
    const now = new Date().toISOString();
    await getDb().observations.update(s.obs2.id, { deletedAt: now, updatedAt: now });
    const bundle = await exportBundle();
    expect(bundle.data.observations.map((o) => o.id)).toEqual([s.obs.id]);
  });
});

describe('parseBundle', () => {
  it('잘못된 파일을 거부한다', () => {
    expect(parseBundle('{').error?.code).toBe('json');
    expect(parseBundle('[]').error?.code).toBe('shape');
    expect(parseBundle(JSON.stringify({ ...minimalBundle(), app: 'other' })).error?.code).toBe(
      'app',
    );
    expect(
      parseBundle(JSON.stringify({ ...minimalBundle(), schemaVersion: '1' })).error?.code,
    ).toBe('version');
    expect(parseBundle(JSON.stringify({ ...minimalBundle(), schemaVersion: 99 })).error).toEqual({
      code: 'version',
      detail: '99',
    });
    const noObs = minimalBundle() as unknown as { data: Record<string, unknown> };
    delete noObs.data.observations;
    expect(parseBundle(JSON.stringify(noObs)).error).toEqual({
      code: 'shape',
      detail: 'data.observations',
    });

    const badId = minimalBundle([{ objectId: 'nope:1' as Observation['objectId'] }]);
    expect(parseBundle(JSON.stringify(badId)).error).toEqual({
      code: 'field',
      detail: 'observations[0].objectId',
    });
    const badAt = minimalBundle([{}, { observedAt: '2026-13-45' }]);
    expect(parseBundle(JSON.stringify(badAt)).error).toEqual({
      code: 'field',
      detail: 'observations[1].observedAt',
    });
    const badOutcome = minimalBundle([{ outcome: 'maybe' as Observation['outcome'] }]);
    expect(parseBundle(JSON.stringify(badOutcome)).error).toEqual({
      code: 'field',
      detail: 'observations[0].outcome',
    });
    const badBookmark = { ...minimalBundle() };
    badBookmark.data = {
      ...badBookmark.data,
      bookmarks: [{ id: 'b', objectId: 'x' }] as unknown as ExportBundle['data']['bookmarks'],
    };
    expect(parseBundle(JSON.stringify(badBookmark)).error?.detail).toBe('bookmarks[0].objectId');
  });

  it('빠진 선택 배열은 빈 배열로, 빠진 nightKey·notes·tags는 채운다', () => {
    const raw = {
      app: 'skylog',
      schemaVersion: 1,
      exportedAt: '2026-09-06T12:00:00.000Z',
      data: {
        observations: [
          {
            id: 'o1',
            objectId: 'moon',
            observedAt: '2026-09-06T17:00:00.000Z', // 02:00 KST 다음날 → 같은 밤
            outcome: 'seen',
            site: { lat: 36.37, lon: 127.36 },
          },
        ],
      },
    };
    const res = parseBundle(JSON.stringify(raw));
    expect(res.error).toBeUndefined();
    const o = res.bundle!.data.observations[0]!;
    expect(o.nightKey).toBe('2026-09-06');
    expect(o.notes).toBe('');
    expect(o.tags).toEqual([]);
    expect(o.updatedAt).toBe('2026-09-06T12:00:00.000Z');
    expect(res.bundle!.data.bookmarks).toEqual([]);
    expect(res.bundle!.data.equipment.telescopes).toEqual([]);
    expect(res.bundle!.blobs).toEqual({});
  });
});

describe('importBundle 정책', () => {
  it("'newest'는 같은 id면 updatedAt이 새로운 쪽만 남긴다(미리보기 counts·conflicts·newer 포함)", async () => {
    const local = await addObservation({
      objectId: 'dso:M31',
      observedAt: '2026-09-06T12:30:00.000Z',
      outcome: 'seen',
      site: { lat: 36.37, lon: 127.36 },
      notes: 'local',
      tags: [],
    });

    const older = minimalBundle([
      { ...local, notes: 'old', updatedAt: '2020-01-01T00:00:00.000Z' },
    ]);
    const p1 = await previewImport(older);
    expect(p1.counts.observations).toBe(1);
    expect(p1.conflicts).toBe(1);
    expect(p1.newer).toBe(0);
    const r1 = await importBundle(older, { policy: 'newest' });
    expect(r1).toMatchObject({ added: 0, replaced: 0, skipped: 1 });
    expect((await listObservations())[0]!.notes).toBe('local');

    const newer = minimalBundle([
      { ...local, notes: 'new', updatedAt: '2099-01-01T00:00:00.000Z' },
    ]);
    const p2 = await previewImport(newer);
    expect(p2).toMatchObject({ conflicts: 1, newer: 1 });
    const r2 = await importBundle(newer, { policy: 'newest' });
    expect(r2).toMatchObject({ added: 0, replaced: 1, skipped: 0 });
    const rows = await listObservations();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.notes).toBe('new');
    expect(rows[0]!.updatedAt).toBe('2099-01-01T00:00:00.000Z');
  });

  it("'addAll'은 충돌 id를 새 id로 바꾸고 blob·관측지·장비 참조도 따라간다", async () => {
    const s = await seed();
    const bundle = await exportBundle();
    const preview = await previewImport(bundle);
    // 관측 2 + blob 2 + 관측지 1 + 망원경 1 + 북마크(objectId) 1 + progress(key) 1
    expect(preview.conflicts).toBe(8);
    expect(preview.newer).toBe(0);

    const r = await importBundle(bundle, { policy: 'addAll' });
    // 북마크·progress는 실질 키가 같아 최신 우선 → 그대로
    expect(r).toEqual({ added: 6, replaced: 0, skipped: 2, remapped: 6 });

    const db = getDb();
    expect(await db.observations.count()).toBe(4);
    expect(await db.blobs.count()).toBe(4);
    expect(await db.sites.count()).toBe(2);
    expect(await db.telescopes.count()).toBe(2);
    expect(await db.bookmarks.count()).toBe(1);
    expect(await db.progress.count()).toBe(1);

    const m31 = (await listObservations({ objectId: 'dso:M31' })).filter((o) => o.id !== s.obs.id);
    expect(m31).toHaveLength(1);
    const copy = m31[0]!;
    expect(copy.sketchBlobId).not.toBe(s.sketch.id);
    expect(copy.photoBlobIds![0]).not.toBe(s.photo.id);
    expect(await blobBytes(copy.sketchBlobId!)).toEqual(Array.from(PNG));
    expect((await getBlob(copy.sketchBlobId!))?.kind).toBe('sketch');
    expect(await blobBytes(copy.photoBlobIds![0]!)).toEqual(Array.from(JPG));
    expect(copy.siteId).not.toBe(s.site.id);
    expect(await db.sites.get(copy.siteId!)).toMatchObject({ name: '집' });
    expect(copy.equipment!.telescopeId).not.toBe(s.tel.id);
    expect(await db.telescopes.get(copy.equipment!.telescopeId!)).toMatchObject({
      name: '8인치 돕소니언',
    });
    // 기본 관측지는 하나만
    const defaults = (await db.sites.toArray()).filter((x) => x.isDefault);
    expect(defaults.map((x) => x.id)).toEqual([s.site.id]);
  });

  it('중간에 실패하면 전부 롤백된다(한 트랜잭션)', async () => {
    await seed();
    const bundle = await exportBundle();
    await clearAllData();
    const db = getDb();
    vi.spyOn(db.blobs, 'put').mockRejectedValueOnce(new Error('boom'));
    await expect(importBundle(bundle, { policy: 'newest' })).rejects.toThrow('boom');
    expect(await db.observations.count()).toBe(0);
    expect(await db.blobs.count()).toBe(0);
    expect(await db.sites.count()).toBe(0);
    expect(await db.bookmarks.count()).toBe(0);
  });
});

describe('observationsToCsv', () => {
  it('BOM·헤더·현지 시각·쌍따옴표 이스케이프·태그 구분', async () => {
    const s = await seed();
    const csv = observationsToCsv([s.obs], null, { nameOf: () => '안드로메다 은하' });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const body = csv.slice(1);
    expect(body.endsWith('\r\n')).toBe(true);
    const [header, row] = body.split('\r\n');
    expect(header).toBe(CSV_HEADER.join(','));
    expect(row).toContain(
      `${s.obs.id},dso:M31,안드로메다 은하,2026-09-06 21:30:00,2026-09-06,seen,집,`,
    );
    expect(row).toContain(',telescope,48,4,3,4,0.432,,45.7,123.5,,,,타원|중심 밝음,');
    expect(row).toContain('"안드로메다, 쌍따옴표 ""테스트"", 쉼표\n둘째 줄"');

    // 이름 해석기가 없으면 빈 칸
    const plain = observationsToCsv([s.obs2]);
    expect(plain.split('\r\n')[1]).toContain(`${s.obs2.id},planet:saturn,,2026-09-05 22:00:00,`);
  });

  it('csvCell·formatLocalCsvTime', () => {
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(3)).toBe('3');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(formatLocalCsvTime('2026-01-01T15:00:00.000Z')).toBe('2026-01-02 00:00:00');
    expect(formatLocalCsvTime('nope')).toBe('nope');
  });
});

describe('백업 리마인더', () => {
  it('backupReminderDue: 없음·30일 초과·읽을 수 없음 → true', () => {
    const now = Date.UTC(2026, 8, 7);
    const day = 86_400_000;
    expect(backupReminderDue(now, null)).toBe(true);
    expect(backupReminderDue(now, undefined)).toBe(true);
    expect(backupReminderDue(now, 'garbage')).toBe(true);
    expect(backupReminderDue(now, new Date(now - 31 * day).toISOString())).toBe(true);
    expect(backupReminderDue(now, new Date(now - 29 * day).toISOString())).toBe(false);
    expect(backupReminderDue(new Date(now), new Date(now - 29 * day).toISOString())).toBe(false);
    expect(backupReminderDue(now, new Date(now - 8 * day).toISOString(), 7)).toBe(true);
  });

  it('isSnoozed', () => {
    const now = Date.UTC(2026, 8, 7);
    expect(isSnoozed(now, null)).toBe(false);
    expect(isSnoozed(now, 'garbage')).toBe(false);
    expect(isSnoozed(now, new Date(now + 1000).toISOString())).toBe(true);
    expect(isSnoozed(now, new Date(now - 1000).toISOString())).toBe(false);
  });

  it('markBackedUp / snooze는 settings에 남는다', async () => {
    expect(await getLastBackupAt()).toBeNull();
    await markBackedUp('2026-09-01T00:00:00.000Z');
    expect(await getLastBackupAt()).toBe('2026-09-01T00:00:00.000Z');
    expect(await getSetting(BACKUP_LAST_AT_KEY)).toBe('2026-09-01T00:00:00.000Z');

    expect(await getBackupSnoozeUntil()).toBeNull();
    const now = Date.UTC(2026, 8, 7);
    const until = await snoozeBackupReminder(7, now);
    expect(until).toBe(new Date(now + 7 * 86_400_000).toISOString());
    expect(await getSetting(BACKUP_SNOOZE_KEY)).toBe(until);
    expect(isSnoozed(now + 1, until)).toBe(true);
  });
});
