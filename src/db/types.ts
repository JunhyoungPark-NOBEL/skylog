/**
 * Dexie 저장 스키마 타입 (마스터 플랜 §6.3, D-010).
 * DB v1은 Task 0에서 생성. 리포지토리·마이그레이션·UI는 Task 4.
 */
import type { ObjectId } from '@/catalog/objectId';

export const DB_SCHEMA_VERSION = 1;

/** 모든 레코드 공통 필드. `deletedAt`은 소프트 삭제(동기화 대비). */
export interface BaseRecord {
  id: string; // uuid v4
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt?: string;
  schemaVersion: number;
}

export type EquipmentKind = 'naked' | 'binoculars' | 'telescope';
export type Rating1to5 = 1 | 2 | 3 | 4 | 5;
export type Bortle = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface ObservationSite {
  lat: number;
  lon: number;
  elevation?: number;
  name?: string;
}

export interface ObservationEquipment {
  kind: EquipmentKind;
  telescopeId?: string;
  eyepieceId?: string;
  binocularsId?: string;
  magnification?: number;
}

export interface ObservationConditions {
  seeing?: Rating1to5;
  transparency?: Rating1to5;
  bortle?: Bortle;
  cloudCover?: number; // 0..100 %
  moonIllum?: number; // 0..1
  moonPhaseDeg?: number; // astronomy-engine MoonPhase() 0..360
  moonSepDeg?: number;
  altDeg?: number;
  azDeg?: number;
  tempC?: number;
  humidity?: number;
}

export interface Observation extends BaseRecord {
  objectId: ObjectId;
  observedAt: string; // ISO 8601 (UTC)
  /** 관측 '밤' = 현지 정오→정오, 'YYYY-MM-DD'(시작일) */
  nightKey: string;
  /** notSeen = 시도했으나 못 봄(회색 ★) */
  outcome: 'seen' | 'notSeen';
  siteId?: string;
  site: ObservationSite;
  equipment?: ObservationEquipment;
  conditions?: ObservationConditions;
  rating?: Rating1to5;
  notes: string;
  tags: string[];
  sketchBlobId?: string;
  photoBlobIds?: string[];
  sessionId?: string;
}

/** "관측 예정" 목록(☆). 관측 완료 = outcome:'seen'인 Observation 존재(★) */
export interface Bookmark extends BaseRecord {
  objectId: ObjectId;
  note?: string;
}

export interface Site extends BaseRecord {
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  bortle?: Bortle;
  isDefault?: boolean;
  /** 실제로 보이는 방위 구간(도, 북=0). 예: 베란다 [[100,250]] */
  visibleAz?: [number, number][];
  /** 건물 등에 가리는 최소 고도 */
  minAltDeg?: number;
}

export interface Telescope extends BaseRecord {
  name: string;
  apertureMm: number;
  focalLengthMm: number;
  mountType: 'altaz' | 'eq' | 'goto';
  finder?: { kind: 'rdf' | 'optical'; magnification?: number; fovDeg?: number };
}

export interface Eyepiece extends BaseRecord {
  name: string;
  focalLengthMm: number;
  afovDeg: number;
}

export interface Binoculars extends BaseRecord {
  name: string;
  magnification: number;
  apertureMm: number;
  fovDeg: number;
}

/** 스케치·사진 등 바이너리. */
export interface BlobRecord extends BaseRecord {
  kind: 'sketch' | 'photo' | 'other';
  mime: string;
  size: number;
  data: Blob;
  width?: number;
  height?: number;
}

/** 학습 진행(미션·배지·퀴즈 SR 상태). key는 유일. */
export interface Progress extends BaseRecord {
  key: string;
  value: unknown;
}

/** key-value 설정. settings 테이블이 단일 진실 원천(D-010). */
export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

/** 만료 시각이 있는 key-value 캐시(날씨 등). */
export interface CacheRecord {
  key: string;
  value: unknown;
  expiresAt: string; // ISO 8601
  updatedAt: string;
}

/** JSON 내보내기 형식 (마스터 플랜 §6.3) */
export interface ExportBundle {
  app: 'skylog';
  schemaVersion: number;
  exportedAt: string;
  data: {
    observations: Observation[];
    bookmarks: Bookmark[];
    sites: Site[];
    equipment: { telescopes: Telescope[]; eyepieces: Eyepiece[]; binoculars: Binoculars[] };
    progress: Progress[];
    settings: SettingRecord[];
  };
  blobs: Record<string, string>; // id → base64
}
