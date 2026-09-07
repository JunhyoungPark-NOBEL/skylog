/**
 * 내보내기·가져오기·백업 (task-04 §3.7, §4).
 *
 * - `exportBundle` → 마스터 플랜 §6.3 형식(`ExportBundle`). 소프트 삭제된 행은 뺀다.
 *   blobs는 `id → "data:<mime>;kind=…;width=…;height=…;createdAt=…;updatedAt=…;base64,<b64>"`.
 *   (타입은 `Record<id, string>` 그대로 — 메타는 data URL 파라미터에 실어 형식을 깨지 않는다.
 *   가져올 때는 순수 base64 문자열도 받는다: mime은 octet-stream, kind는 참조하는 기록에서 유추.)
 * - `roundCoords`: 관측지 좌표를 소수점 2자리(≈1km)로 반올림 — 공유용(개인정보).
 * - `parseBundle`: 구조·버전·필수 필드 검사. 실패는 예외가 아니라 `{error}`.
 * - `importBundle`: 한 트랜잭션. 실패하면 Dexie가 롤백하고 예외가 밖으로 나간다.
 *   'newest' = 같은 id면 updatedAt이 더 새로운 쪽, 'addAll' = 충돌 id를 새 id로 바꿔 모두 추가(blob·관측지·장비 참조도 재매핑).
 *   북마크는 objectId, progress는 key가 실질 키라 정책과 무관하게 최신 우선으로 합친다. settings도 최신 우선.
 * - 백업 리마인더: settings 'backup.lastAt' / 'backup.snoozeUntil'. 판정은 순수 함수(`backupReminderDue`, `isSnoozed`).
 *
 * 주의: Dexie 트랜잭션 안에서는 Dexie가 아닌 promise를 기다리면 안 된다(IndexedDB 자동 커밋) —
 * base64 디코딩·Blob 생성은 전부 트랜잭션 **밖**에서 먼저 끝낸다.
 */
import type { Lang } from '@/app/i18n';
import { nightKey as nightKeyOf } from '@/astro/time';
import type { Catalog } from '@/catalog/catalog';
import { displayName } from '@/catalog/catalog';
import { isObjectId, type ObjectId } from '@/catalog/objectId';
import { getDb, newId, nowIso, TABLE_NAMES } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { getSetting, setSetting } from '@/db/repos/settings';
import {
  DB_SCHEMA_VERSION,
  type BaseRecord,
  type Binoculars,
  type BlobRecord,
  type Bookmark,
  type Eyepiece,
  type ExportBundle,
  type Observation,
  type Progress,
  type SettingRecord,
  type Site,
  type Telescope,
} from '@/db/types';

/* ------------------------------------------------------------------ 공통 */

const DAY_MS = 86_400_000;
const DEFAULT_TZ = 'Asia/Seoul';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isLive<T extends { deletedAt?: string }>(r: T): boolean {
  return !r.deletedAt;
}

/** ISO 시각 비교. 둘 중 하나라도 못 읽으면 false(=바꾸지 않음). */
function isNewer(candidate: string | undefined, current: string | undefined): boolean {
  const a = candidate ? Date.parse(candidate) : NaN;
  const b = current ? Date.parse(current) : NaN;
  if (Number.isNaN(a)) return false;
  if (Number.isNaN(b)) return true;
  return a > b;
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/* ------------------------------------------------------------------ base64 */

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  // 아주 오래된 WebView 폴백
  return new Promise<Uint8Array>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.onerror = () => reject(r.error ?? new Error('FileReader failed'));
    r.readAsArrayBuffer(blob);
  });
}

export interface BlobEntry {
  mime: string;
  base64: string;
  kind?: BlobRecord['kind'];
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
}

const BLOB_KINDS: readonly BlobRecord['kind'][] = ['sketch', 'photo', 'other'];

/** BlobRecord → 번들 문자열(data URL + 메타 파라미터). */
export function encodeBlobEntry(rec: Omit<BlobRecord, 'data' | 'size'>, base64: string): string {
  const params: string[] = [`kind=${rec.kind}`];
  if (rec.width !== undefined) params.push(`width=${rec.width}`);
  if (rec.height !== undefined) params.push(`height=${rec.height}`);
  params.push(`createdAt=${rec.createdAt}`, `updatedAt=${rec.updatedAt}`);
  return `data:${rec.mime};${params.join(';')};base64,${base64}`;
}

/** 번들 문자열 → 메타 + base64(디코딩은 하지 않음). 순수 base64도 허용. */
export function parseBlobEntry(text: string): BlobEntry {
  if (!text.startsWith('data:')) return { mime: 'application/octet-stream', base64: text };
  const comma = text.indexOf(',');
  if (comma < 0) return { mime: 'application/octet-stream', base64: '' };
  const header = text.slice(5, comma);
  const base64 = text.slice(comma + 1);
  const [mimeRaw, ...paramsRaw] = header.split(';');
  const entry: BlobEntry = { mime: mimeRaw || 'application/octet-stream', base64 };
  for (const p of paramsRaw) {
    const eq = p.indexOf('=');
    if (eq < 0) continue; // 'base64' 플래그 등
    const k = p.slice(0, eq);
    const v = p.slice(eq + 1);
    if (k === 'kind' && (BLOB_KINDS as readonly string[]).includes(v))
      entry.kind = v as BlobRecord['kind'];
    else if (k === 'width' && Number.isFinite(Number(v))) entry.width = Number(v);
    else if (k === 'height' && Number.isFinite(Number(v))) entry.height = Number(v);
    else if (k === 'createdAt') entry.createdAt = v;
    else if (k === 'updatedAt') entry.updatedAt = v;
  }
  return entry;
}

/* ------------------------------------------------------------------ 내보내기 */

export interface ExportOptions {
  /** 기본 true. 끄면 blobs가 빈 객체 */
  includeBlobs?: boolean;
  /** 관측지 좌표를 소수점 2자리로 반올림(≈1km, 공유용) */
  roundCoords?: boolean;
}

export async function exportBundle(opts: ExportOptions = {}): Promise<ExportBundle> {
  const { includeBlobs = true, roundCoords = false } = opts;
  const db = getDb();
  const [observations, bookmarks, sites, telescopes, eyepieces, binoculars, progress, settings] =
    await Promise.all([
      db.observations.toArray(),
      db.bookmarks.toArray(),
      db.sites.toArray(),
      db.telescopes.toArray(),
      db.eyepieces.toArray(),
      db.binoculars.toArray(),
      db.progress.toArray(),
      db.settings.toArray(),
    ]);

  const liveObservations = observations
    .filter(isLive)
    .map((o) =>
      roundCoords
        ? { ...o, site: { ...o.site, lat: round2(o.site.lat), lon: round2(o.site.lon) } }
        : o,
    );
  const liveSites = sites
    .filter(isLive)
    .map((s) => (roundCoords ? { ...s, lat: round2(s.lat), lon: round2(s.lon) } : s));

  const blobs: Record<string, string> = {};
  if (includeBlobs) {
    const rows = (await db.blobs.toArray()).filter(isLive);
    for (const b of rows) {
      const bytes = await blobToBytes(b.data);
      blobs[b.id] = encodeBlobEntry(b, bytesToBase64(bytes));
    }
  }

  return {
    app: 'skylog',
    schemaVersion: DB_SCHEMA_VERSION,
    exportedAt: nowIso(),
    data: {
      observations: liveObservations,
      bookmarks: bookmarks.filter(isLive),
      sites: liveSites,
      equipment: {
        telescopes: telescopes.filter(isLive),
        eyepieces: eyepieces.filter(isLive),
        binoculars: binoculars.filter(isLive),
      },
      progress: progress.filter(isLive),
      settings,
    },
    blobs,
  };
}

export function bundleToJson(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/* ------------------------------------------------------------------ 검증 */

export type BundleErrorCode = 'json' | 'app' | 'version' | 'shape' | 'field';

export interface BundleError {
  code: BundleErrorCode;
  /** 예: "observations[3].objectId" */
  detail?: string;
}

export type ParseResult =
  { bundle: ExportBundle; error?: undefined } | { bundle?: undefined; error: BundleError };

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

export function isIsoDateTime(v: unknown): v is string {
  return typeof v === 'string' && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
}

function fieldError(detail: string): ParseResult {
  return { error: { code: 'field', detail } };
}

function shapeError(detail: string): ParseResult {
  return { error: { code: 'shape', detail } };
}

/** 배열이면 그대로, 없으면 빈 배열, 그 외는 null(구조 오류). */
function optionalArray(v: unknown): unknown[] | null {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : null;
}

/** 공통 필드(id 문자열) 검사 + 타임스탬프 기본값 채우기. 실패 시 null. */
function normalizeBase(
  raw: unknown,
  fallbackAt: string,
  schemaVersion: number,
): (Record<string, unknown> & BaseRecord) | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.length === 0) return null;
  const updatedAt = isIsoDateTime(raw.updatedAt) ? raw.updatedAt : fallbackAt;
  const createdAt = isIsoDateTime(raw.createdAt) ? raw.createdAt : updatedAt;
  const out: Record<string, unknown> & BaseRecord = {
    ...raw,
    id: raw.id,
    createdAt,
    updatedAt,
    schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : schemaVersion,
  };
  if (typeof raw.deletedAt !== 'string') delete out.deletedAt;
  return out;
}

export function parseBundle(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: { code: 'json' } };
  }
  if (!isRecord(raw)) return shapeError('root');
  if (raw.app !== 'skylog') return { error: { code: 'app' } };
  if (typeof raw.schemaVersion !== 'number' || !Number.isFinite(raw.schemaVersion))
    return { error: { code: 'version' } };
  if (raw.schemaVersion > DB_SCHEMA_VERSION)
    return { error: { code: 'version', detail: String(raw.schemaVersion) } };
  const schemaVersion = raw.schemaVersion;
  const exportedAt = isIsoDateTime(raw.exportedAt) ? raw.exportedAt : nowIso();

  if (!isRecord(raw.data)) return shapeError('data');
  const data = raw.data;
  if (!Array.isArray(data.observations)) return shapeError('data.observations');
  const equipmentRaw = data.equipment ?? {};
  if (!isRecord(equipmentRaw)) return shapeError('data.equipment');

  const lists = {
    bookmarks: optionalArray(data.bookmarks),
    sites: optionalArray(data.sites),
    telescopes: optionalArray(equipmentRaw.telescopes),
    eyepieces: optionalArray(equipmentRaw.eyepieces),
    binoculars: optionalArray(equipmentRaw.binoculars),
    progress: optionalArray(data.progress),
    settings: optionalArray(data.settings),
  };
  for (const [k, v] of Object.entries(lists)) if (v === null) return shapeError(`data.${k}`);

  // 관측 기록: 핵심 필드는 엄격히
  const observations: Observation[] = [];
  for (let i = 0; i < data.observations.length; i++) {
    const base = normalizeBase(data.observations[i], exportedAt, schemaVersion);
    const at = `observations[${i}]`;
    if (!base) return fieldError(`${at}.id`);
    if (typeof base.objectId !== 'string' || !isObjectId(base.objectId))
      return fieldError(`${at}.objectId`);
    if (!isIsoDateTime(base.observedAt)) return fieldError(`${at}.observedAt`);
    if (base.outcome !== 'seen' && base.outcome !== 'notSeen') return fieldError(`${at}.outcome`);
    if (
      !isRecord(base.site) ||
      typeof base.site.lat !== 'number' ||
      typeof base.site.lon !== 'number'
    )
      return fieldError(`${at}.site`);
    const o = base as unknown as Observation;
    observations.push({
      ...o,
      nightKey: typeof o.nightKey === 'string' ? o.nightKey : nightKeyOf(new Date(o.observedAt)),
      notes: typeof o.notes === 'string' ? o.notes : '',
      tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
    });
  }

  const bookmarks: Bookmark[] = [];
  for (let i = 0; i < lists.bookmarks!.length; i++) {
    const base = normalizeBase(lists.bookmarks![i], exportedAt, schemaVersion);
    if (!base) return fieldError(`bookmarks[${i}].id`);
    if (typeof base.objectId !== 'string' || !isObjectId(base.objectId))
      return fieldError(`bookmarks[${i}].objectId`);
    bookmarks.push(base as unknown as Bookmark);
  }

  const sites: Site[] = [];
  for (let i = 0; i < lists.sites!.length; i++) {
    const base = normalizeBase(lists.sites![i], exportedAt, schemaVersion);
    if (!base) return fieldError(`sites[${i}].id`);
    if (
      typeof base.name !== 'string' ||
      typeof base.lat !== 'number' ||
      typeof base.lon !== 'number'
    )
      return fieldError(`sites[${i}]`);
    sites.push(base as unknown as Site);
  }

  const named = <T extends BaseRecord>(rows: unknown[], table: string): T[] | ParseResult => {
    const out: T[] = [];
    for (let i = 0; i < rows.length; i++) {
      const base = normalizeBase(rows[i], exportedAt, schemaVersion);
      if (!base) return fieldError(`${table}[${i}].id`);
      out.push(base as unknown as T);
    }
    return out;
  };
  const telescopes = named<Telescope>(lists.telescopes!, 'telescopes');
  if (!Array.isArray(telescopes)) return telescopes;
  const eyepieces = named<Eyepiece>(lists.eyepieces!, 'eyepieces');
  if (!Array.isArray(eyepieces)) return eyepieces;
  const binoculars = named<Binoculars>(lists.binoculars!, 'binoculars');
  if (!Array.isArray(binoculars)) return binoculars;

  const progress: Progress[] = [];
  for (let i = 0; i < lists.progress!.length; i++) {
    const base = normalizeBase(lists.progress![i], exportedAt, schemaVersion);
    if (!base) return fieldError(`progress[${i}].id`);
    if (typeof base.key !== 'string') return fieldError(`progress[${i}].key`);
    progress.push(base as unknown as Progress);
  }

  const settings: SettingRecord[] = [];
  for (let i = 0; i < lists.settings!.length; i++) {
    const s = lists.settings![i];
    if (!isRecord(s) || typeof s.key !== 'string') return fieldError(`settings[${i}].key`);
    settings.push({
      key: s.key,
      value: s.value,
      updatedAt: isIsoDateTime(s.updatedAt) ? s.updatedAt : exportedAt,
    });
  }

  const blobs: Record<string, string> = {};
  if (raw.blobs !== undefined && raw.blobs !== null) {
    if (!isRecord(raw.blobs)) return shapeError('blobs');
    for (const [id, v] of Object.entries(raw.blobs)) {
      if (typeof v !== 'string') return fieldError(`blobs.${id}`);
      blobs[id] = v;
    }
  }

  return {
    bundle: {
      app: 'skylog',
      schemaVersion,
      exportedAt,
      data: {
        observations,
        bookmarks,
        sites,
        equipment: { telescopes, eyepieces, binoculars },
        progress,
        settings,
      },
      blobs,
    },
  };
}

/* ------------------------------------------------------------------ 가져오기 */

export type ImportPolicy = 'newest' | 'addAll';

export interface ImportOptions {
  policy: ImportPolicy;
}

export interface BundleCounts {
  observations: number;
  bookmarks: number;
  sites: number;
  telescopes: number;
  eyepieces: number;
  binoculars: number;
  progress: number;
  settings: number;
  blobs: number;
}

export interface ImportPreview {
  counts: BundleCounts;
  /** 이미 있는 항목 수(설정 제외) */
  conflicts: number;
  /** 그중 번들 쪽이 더 새로운 것('newest'면 덮어쓴다) */
  newer: number;
}

export interface ImportResult {
  added: number;
  replaced: number;
  skipped: number;
  /** addAll로 id를 새로 받은 항목 */
  remapped: number;
}

export function bundleCounts(bundle: ExportBundle): BundleCounts {
  const d = bundle.data;
  return {
    observations: d.observations.length,
    bookmarks: d.bookmarks.length,
    sites: d.sites.length,
    telescopes: d.equipment.telescopes.length,
    eyepieces: d.equipment.eyepieces.length,
    binoculars: d.equipment.binoculars.length,
    progress: d.progress.length,
    settings: d.settings.length,
    blobs: Object.keys(bundle.blobs).length,
  };
}

interface Tally {
  conflicts: number;
  newer: number;
}

/** 읽기에 필요한 최소 표면 — EntityTable/Table 어느 쪽이든 받는다 */
interface ReadableTable<T> {
  bulkGet(keys: string[]): PromiseLike<(T | undefined)[]>;
}

async function tallyBase<T extends BaseRecord>(
  table: ReadableTable<T>,
  rows: readonly { id: string; updatedAt?: string }[],
  tally: Tally,
): Promise<void> {
  if (rows.length === 0) return;
  const existing = await table.bulkGet(rows.map((r) => r.id));
  rows.forEach((r, i) => {
    const local = existing[i];
    if (!local) return;
    tally.conflicts++;
    if (isNewer(r.updatedAt, local.updatedAt)) tally.newer++;
  });
}

export async function previewImport(bundle: ExportBundle): Promise<ImportPreview> {
  const db = getDb();
  const d = bundle.data;
  const tally: Tally = { conflicts: 0, newer: 0 };
  await tallyBase(db.observations, d.observations, tally);
  await tallyBase(db.sites, d.sites, tally);
  await tallyBase(db.telescopes, d.equipment.telescopes, tally);
  await tallyBase(db.eyepieces, d.equipment.eyepieces, tally);
  await tallyBase(db.binoculars, d.equipment.binoculars, tally);
  await tallyBase(
    db.blobs,
    Object.entries(bundle.blobs).map(([id, text]) => ({
      id,
      updatedAt: parseBlobEntry(text).updatedAt,
    })),
    tally,
  );
  // 북마크는 objectId, progress는 key가 실질 키
  if (d.bookmarks.length) {
    const local = await db.bookmarks.toArray();
    const byObject = new Map(local.map((b) => [b.objectId, b] as const));
    for (const b of d.bookmarks) {
      const l = byObject.get(b.objectId);
      if (!l) continue;
      tally.conflicts++;
      if (isNewer(b.updatedAt, l.updatedAt)) tally.newer++;
    }
  }
  if (d.progress.length) {
    const local = await db.progress.toArray();
    const byKey = new Map(local.map((p) => [p.key, p] as const));
    for (const p of d.progress) {
      const l = byKey.get(p.key);
      if (!l) continue;
      tally.conflicts++;
      if (isNewer(p.updatedAt, l.updatedAt)) tally.newer++;
    }
  }
  return { counts: bundleCounts(bundle), ...tally };
}

/** 번들 blob 문자열 → BlobRecord(트랜잭션 밖에서 미리 만든다). kind는 메타 → 참조하는 기록 → 'other'. */
function decodeBlobRecords(bundle: ExportBundle): BlobRecord[] {
  const kindByRef = new Map<string, BlobRecord['kind']>();
  for (const o of bundle.data.observations) {
    if (o.sketchBlobId) kindByRef.set(o.sketchBlobId, 'sketch');
    for (const id of o.photoBlobIds ?? []) kindByRef.set(id, 'photo');
  }
  const out: BlobRecord[] = [];
  for (const [id, text] of Object.entries(bundle.blobs)) {
    const e = parseBlobEntry(text);
    const bytes = base64ToBytes(e.base64);
    const data = new Blob([bytes], { type: e.mime });
    const updatedAt = e.updatedAt ?? bundle.exportedAt;
    const rec: BlobRecord = {
      id,
      kind: e.kind ?? kindByRef.get(id) ?? 'other',
      mime: e.mime,
      size: bytes.length,
      data,
      createdAt: e.createdAt ?? updatedAt,
      updatedAt,
      schemaVersion: bundle.schemaVersion,
    };
    if (e.width !== undefined) rec.width = e.width;
    if (e.height !== undefined) rec.height = e.height;
    out.push(rec);
  }
  return out;
}

interface Plan<T extends BaseRecord> {
  put: T[];
  idMap: Map<string, string>;
  replaced: number;
  skipped: number;
  remapped: number;
}

/** id가 실질 키인 테이블(관측·관측지·장비·blob)의 병합 계획. 트랜잭션 안에서 부른다(읽기만). */
async function planBase<T extends BaseRecord>(
  table: ReadableTable<T>,
  rows: readonly T[],
  policy: ImportPolicy,
): Promise<Plan<T>> {
  const plan: Plan<T> = { put: [], idMap: new Map(), replaced: 0, skipped: 0, remapped: 0 };
  if (rows.length === 0) return plan;
  const existing = await table.bulkGet(rows.map((r) => r.id));
  rows.forEach((row, i) => {
    const local = existing[i];
    if (!local) {
      plan.put.push(row);
      return;
    }
    if (policy === 'newest') {
      if (isNewer(row.updatedAt, local.updatedAt)) {
        plan.put.push(row);
        plan.replaced++;
      } else plan.skipped++;
      return;
    }
    const id = newId();
    plan.idMap.set(row.id, id);
    plan.put.push({ ...row, id });
    plan.remapped++;
  });
  return plan;
}

function remapId(map: Map<string, string>, id: string | undefined): string | undefined {
  return id === undefined ? undefined : (map.get(id) ?? id);
}

function addResult(
  r: ImportResult,
  p: { put: unknown[]; replaced: number; skipped: number; remapped: number },
) {
  r.added += p.put.length - p.replaced;
  r.replaced += p.replaced;
  r.skipped += p.skipped;
  r.remapped += p.remapped;
}

export async function importBundle(
  bundle: ExportBundle,
  opts: ImportOptions,
): Promise<ImportResult> {
  const { policy } = opts;
  const db = getDb();
  // Blob 디코딩은 비동기가 아니지만, 무거운 작업은 트랜잭션 밖에서
  const blobRecords = decodeBlobRecords(bundle);
  const d = bundle.data;
  const result: ImportResult = { added: 0, replaced: 0, skipped: 0, remapped: 0 };

  await db.transaction(
    'rw',
    [
      db.observations,
      db.bookmarks,
      db.sites,
      db.telescopes,
      db.eyepieces,
      db.binoculars,
      db.blobs,
      db.progress,
      db.settings,
    ],
    async () => {
      // 1) 참조되는 쪽 먼저(관측지·장비·blob) — addAll의 id 재매핑 표를 만든다
      const sitesPlan = await planBase(db.sites, d.sites, policy);
      const telPlan = await planBase(db.telescopes, d.equipment.telescopes, policy);
      const eyePlan = await planBase(db.eyepieces, d.equipment.eyepieces, policy);
      const binPlan = await planBase(db.binoculars, d.equipment.binoculars, policy);
      const blobPlan = await planBase(db.blobs, blobRecords, policy);

      // 기본 관측지는 하나만: 로컬 기본이 있으면 가져온 쪽의 기본 표시는 뗀다
      const localDefault = (await db.sites.where('isDefault').equals(1).toArray()).find(isLive);
      let defaultTaken = localDefault !== undefined;
      for (const s of sitesPlan.put) {
        const isDefault = Boolean(s.isDefault) && (!defaultTaken || localDefault?.id === s.id);
        if (isDefault) {
          (s as { isDefault?: unknown }).isDefault = 1;
          defaultTaken = true;
        } else delete s.isDefault;
      }

      // 2) 관측 기록: 참조 id 재매핑
      const observations: Observation[] = d.observations.map((o) => {
        if (policy !== 'addAll') return o;
        const out: Observation = { ...o };
        const siteId = remapId(sitesPlan.idMap, o.siteId);
        if (siteId !== undefined) out.siteId = siteId;
        const sketchBlobId = remapId(blobPlan.idMap, o.sketchBlobId);
        if (sketchBlobId !== undefined) out.sketchBlobId = sketchBlobId;
        if (o.photoBlobIds)
          out.photoBlobIds = o.photoBlobIds.map((id) => remapId(blobPlan.idMap, id)!);
        if (o.equipment) {
          const eq = { ...o.equipment };
          const t = remapId(telPlan.idMap, eq.telescopeId);
          const e = remapId(eyePlan.idMap, eq.eyepieceId);
          const b = remapId(binPlan.idMap, eq.binocularsId);
          if (t !== undefined) eq.telescopeId = t;
          if (e !== undefined) eq.eyepieceId = e;
          if (b !== undefined) eq.binocularsId = b;
          out.equipment = eq;
        }
        return out;
      });
      const obsPlan = await planBase(db.observations, observations, policy);

      // 3) 북마크(objectId가 실질 키) — 정책과 무관하게 최신 우선
      const bookmarkPut: Bookmark[] = [];
      let bookmarkReplaced = 0;
      let bookmarkSkipped = 0;
      let bookmarkRemapped = 0;
      if (d.bookmarks.length) {
        const local = await db.bookmarks.toArray();
        const byObject = new Map<string, Bookmark>();
        for (const b of local) {
          const cur = byObject.get(b.objectId);
          if (!cur || (cur.deletedAt && !b.deletedAt)) byObject.set(b.objectId, b);
        }
        const byId = new Set(local.map((b) => b.id));
        for (const b of d.bookmarks) {
          const l = byObject.get(b.objectId);
          if (l) {
            if (isNewer(b.updatedAt, l.updatedAt)) {
              bookmarkPut.push({ ...b, id: l.id });
              bookmarkReplaced++;
            } else bookmarkSkipped++;
          } else if (byId.has(b.id)) {
            bookmarkPut.push({ ...b, id: newId() });
            bookmarkRemapped++;
          } else bookmarkPut.push(b);
        }
      }

      // 4) progress(key 유일) — 최신 우선
      const progressPut: Progress[] = [];
      let progressReplaced = 0;
      let progressSkipped = 0;
      let progressRemapped = 0;
      if (d.progress.length) {
        const local = await db.progress.toArray();
        const byKey = new Map(local.map((p) => [p.key, p] as const));
        const byId = new Set(local.map((p) => p.id));
        for (const p of d.progress) {
          const l = byKey.get(p.key);
          if (l) {
            if (isNewer(p.updatedAt, l.updatedAt)) {
              progressPut.push({ ...p, id: l.id });
              progressReplaced++;
            } else progressSkipped++;
          } else if (byId.has(p.id)) {
            progressPut.push({ ...p, id: newId() });
            progressRemapped++;
          } else progressPut.push(p);
        }
      }

      // 5) settings — 최신 우선(결과 집계에는 넣지 않는다)
      const settingsPut: SettingRecord[] = [];
      if (d.settings.length) {
        const existing = await db.settings.bulkGet(d.settings.map((s) => s.key));
        d.settings.forEach((s, i) => {
          const l = existing[i];
          if (!l || isNewer(s.updatedAt, l.updatedAt)) settingsPut.push(s);
        });
      }

      // 6) 쓰기 — 실패하면 전체 롤백
      for (const o of obsPlan.put) await db.observations.put(o);
      for (const b of blobPlan.put) await db.blobs.put(b);
      for (const b of bookmarkPut) await db.bookmarks.put(b);
      for (const s of sitesPlan.put) await db.sites.put(s);
      for (const t of telPlan.put) await db.telescopes.put(t);
      for (const e of eyePlan.put) await db.eyepieces.put(e);
      for (const b of binPlan.put) await db.binoculars.put(b);
      for (const p of progressPut) await db.progress.put(p);
      for (const s of settingsPut) await db.settings.put(s);

      addResult(result, obsPlan);
      addResult(result, blobPlan);
      addResult(result, sitesPlan);
      addResult(result, telPlan);
      addResult(result, eyePlan);
      addResult(result, binPlan);
      addResult(result, {
        put: bookmarkPut,
        replaced: bookmarkReplaced,
        skipped: bookmarkSkipped,
        remapped: bookmarkRemapped,
      });
      addResult(result, {
        put: progressPut,
        replaced: progressReplaced,
        skipped: progressSkipped,
        remapped: progressRemapped,
      });
    },
  );

  emitDbChange('all');
  return result;
}

/* ------------------------------------------------------------------ CSV */

export interface CsvOptions {
  lang?: Lang;
  tz?: string;
  /** 대상 이름 해석(있으면 `cat`보다 우선) */
  nameOf?: (id: ObjectId) => string;
}

export const CSV_HEADER = [
  'id',
  'objectId',
  'name',
  'observedAt',
  'nightKey',
  'outcome',
  'site',
  'lat',
  'lon',
  'equipment',
  'magnification',
  'rating',
  'seeing',
  'transparency',
  'moonIllum',
  'moonSepDeg',
  'altDeg',
  'azDeg',
  'cloudCover',
  'tempC',
  'humidity',
  'tags',
  'notes',
] as const;

export const CSV_TAG_SEPARATOR = '|';
/** UTF-8 BOM — 엑셀이 한글을 깨지 않고 읽게 */
const BOM = String.fromCharCode(0xfeff);

/** 셀 이스케이프: 쌍따옴표·쉼표·줄바꿈이 있으면 쌍따옴표로 감싸고 " → "" */
export function csvCell(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return '';
  const s = typeof v === 'number' ? String(v) : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const localFmtCache = new Map<string, Intl.DateTimeFormat>();
/** "YYYY-MM-DD HH:MM:SS"(현지, 엑셀이 날짜로 읽는 형식) */
export function formatLocalCsvTime(iso: string, tz = DEFAULT_TZ): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  let f = localFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    localFmtCache.set(tz, f);
  }
  const parts = f.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function num(v: number | undefined, digits: number): number | undefined {
  if (v === undefined || !Number.isFinite(v)) return undefined;
  const k = 10 ** digits;
  return Math.round(v * k) / k;
}

/** 관측 기록 → CSV(UTF-8 BOM, CRLF, 엑셀 호환). */
export function observationsToCsv(
  rows: readonly Observation[],
  cat?: Catalog | null,
  opts: CsvOptions = {},
): string {
  const lang = opts.lang ?? 'ko';
  const tz = opts.tz ?? DEFAULT_TZ;
  const nameOf = opts.nameOf ?? ((id: ObjectId) => (cat ? displayName(cat, id, lang) : ''));
  const lines = [CSV_HEADER.join(',')];
  for (const o of rows) {
    const c = o.conditions ?? {};
    const cells: (string | number | undefined)[] = [
      o.id,
      o.objectId,
      nameOf(o.objectId),
      formatLocalCsvTime(o.observedAt, tz),
      o.nightKey,
      o.outcome,
      o.site.name,
      o.site.lat,
      o.site.lon,
      o.equipment?.kind,
      o.equipment?.magnification,
      o.rating,
      c.seeing,
      c.transparency,
      num(c.moonIllum, 3),
      num(c.moonSepDeg, 1),
      num(c.altDeg, 1),
      num(c.azDeg, 1),
      num(c.cloudCover, 0),
      num(c.tempC, 1),
      num(c.humidity, 0),
      o.tags.join(CSV_TAG_SEPARATOR),
      o.notes,
    ];
    lines.push(cells.map(csvCell).join(','));
  }
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/* ------------------------------------------------------------------ 전체 삭제 */

/** 모든 테이블(settings·cache 포함)을 비운다. 되돌릴 수 없다 — UI는 2단계 확인. */
export async function clearAllData(): Promise<void> {
  const db = getDb();
  const tables = TABLE_NAMES.map((n) => db.table(n));
  await db.transaction('rw', tables, async () => {
    for (const t of tables) await t.clear();
  });
  emitDbChange('all');
}

/* ------------------------------------------------------------------ 백업 리마인더 */

export const BACKUP_LAST_AT_KEY = 'backup.lastAt';
export const BACKUP_SNOOZE_KEY = 'backup.snoozeUntil';
export const BACKUP_REMINDER_DAYS = 30;
export const BACKUP_SNOOZE_DAYS = 7;

export async function getLastBackupAt(): Promise<string | null> {
  const v = await getSetting<unknown>(BACKUP_LAST_AT_KEY);
  return typeof v === 'string' ? v : null;
}

export async function markBackedUp(at: string = nowIso()): Promise<void> {
  await setSetting(BACKUP_LAST_AT_KEY, at);
}

export async function getBackupSnoozeUntil(): Promise<string | null> {
  const v = await getSetting<unknown>(BACKUP_SNOOZE_KEY);
  return typeof v === 'string' ? v : null;
}

/** "나중에": `days`일 동안 배너를 숨긴다. 숨김이 끝나는 시각(ISO). */
export async function snoozeBackupReminder(
  days: number = BACKUP_SNOOZE_DAYS,
  now: Date | number = Date.now(),
): Promise<string> {
  const until = new Date(toMs(now) + days * DAY_MS).toISOString();
  await setSetting(BACKUP_SNOOZE_KEY, until);
  return until;
}

function toMs(d: Date | number): number {
  return typeof d === 'number' ? d : d.getTime();
}

/** 마지막 백업이 없거나 `days`일을 넘겼으면 true(순수). 읽을 수 없는 값도 "백업 없음"으로 본다. */
export function backupReminderDue(
  now: Date | number,
  lastAt: string | null | undefined,
  days: number = BACKUP_REMINDER_DAYS,
): boolean {
  if (!lastAt) return true;
  const t = Date.parse(lastAt);
  if (Number.isNaN(t)) return true;
  return toMs(now) - t > days * DAY_MS;
}

/** "나중에"로 미룬 기간 안이면 true(순수). */
export function isSnoozed(now: Date | number, until: string | null | undefined): boolean {
  if (!until) return false;
  const t = Date.parse(until);
  return !Number.isNaN(t) && toMs(now) < t;
}
