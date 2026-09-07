import Dexie, { type EntityTable, type Table } from 'dexie';
import { nightKey as nightKeyOf } from '@/astro/time';
import type {
  Binoculars,
  BlobRecord,
  Bookmark,
  CacheRecord,
  Eyepiece,
  Observation,
  Progress,
  SettingRecord,
  Site,
  Telescope,
} from '@/db/types';

export const DB_NAME = 'skylog';
export const DB_VERSION = 2;

const STORES_V1 = {
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
} as const;

/**
 * Dexie DB (D-010, D-023). 10개 테이블.
 * 인덱스 규칙: 첫 항목이 기본 키. `*tags`는 multiEntry, `&key`는 유일 인덱스.
 * v1(T0): 모든 테이블 생성. v2(T4): 인덱스 변경 없음 — 관측 기록 리포지토리 도입 시점을 표시하고,
 * 예전 행에 빠졌을 수 있는 `notes`/`tags`/`nightKey`를 채운다(v1→v2 보존 테스트의 기준).
 * 스키마를 바꿀 때는 버전을 올리고 `.upgrade()`로 마이그레이션하며 DECISIONS에 기록한다.
 */
export class SkylogDB extends Dexie {
  observations!: EntityTable<Observation, 'id'>;
  bookmarks!: EntityTable<Bookmark, 'id'>;
  sites!: EntityTable<Site, 'id'>;
  telescopes!: EntityTable<Telescope, 'id'>;
  eyepieces!: EntityTable<Eyepiece, 'id'>;
  binoculars!: EntityTable<Binoculars, 'id'>;
  blobs!: EntityTable<BlobRecord, 'id'>;
  progress!: EntityTable<Progress, 'id'>;
  settings!: Table<SettingRecord, string>;
  cache!: Table<CacheRecord, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(STORES_V1);
    this.version(2)
      .stores(STORES_V1)
      .upgrade(async (tx) => {
        await tx
          .table('observations')
          .toCollection()
          .modify((row: Record<string, unknown>) => {
            if (!Array.isArray(row.tags)) row.tags = [];
            if (typeof row.notes !== 'string') row.notes = '';
            if (typeof row.nightKey !== 'string' && typeof row.observedAt === 'string') {
              const d = new Date(row.observedAt);
              if (!Number.isNaN(d.getTime())) row.nightKey = nightKeyOf(d);
            }
          });
      });
  }
}

export const TABLE_NAMES = [
  'observations',
  'bookmarks',
  'sites',
  'telescopes',
  'eyepieces',
  'binoculars',
  'blobs',
  'progress',
  'settings',
  'cache',
] as const;

let instance: SkylogDB | null = null;

/** 앱 전역 DB 인스턴스(지연 생성). 테스트는 `new SkylogDB('test-…')`로 격리한다. */
export function getDb(): SkylogDB {
  instance ??= new SkylogDB();
  return instance;
}

/** 테스트 전용: 전역 인스턴스를 교체한다. */
export function setDbForTesting(db: SkylogDB | null): void {
  instance = db;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // 매우 오래된 WebView 폴백
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
