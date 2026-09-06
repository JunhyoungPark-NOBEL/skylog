import Dexie, { type EntityTable, type Table } from 'dexie';
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
export const DB_VERSION = 1;

/**
 * Dexie DB v1 (D-010). 10개 테이블.
 * 인덱스 규칙: 첫 항목이 기본 키. `*tags`는 multiEntry, `&key`는 유일 인덱스.
 * 스키마를 바꿀 때는 버전을 올리고 `.upgrade()`로 마이그레이션(T4)하며 DECISIONS에 기록한다.
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
    this.version(DB_VERSION).stores({
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
