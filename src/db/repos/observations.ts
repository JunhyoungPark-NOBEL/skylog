/**
 * 관측 기록(★) 리포지토리 (task-04 §3.1, D-023).
 * - 소프트 삭제(deletedAt) + 되살리기(스와이프 삭제 실행 취소).
 * - `nightKey`는 `observedAt`에서 자동 계산(현지 정오→정오, Asia/Seoul).
 * - 쓰기 뒤에는 `emitDbChange('observations')` → logStore가 파생 집합(★/회색 ★)을 다시 읽는다.
 */
import { nightKey } from '@/astro/time';
import type { ObjectId } from '@/catalog/objectId';
import { getDb, newId, nowIso } from '@/db/database';
import { emitDbChange } from '@/db/events';
import { DB_SCHEMA_VERSION, type BaseRecord, type Observation } from '@/db/types';

export type ObservationInput = Omit<Observation, keyof BaseRecord | 'nightKey'> & {
  id?: string;
  nightKey?: string;
};

export interface ObservationQuery {
  objectId?: ObjectId;
  /** observedAt ≥ from */
  from?: Date;
  /** observedAt < to */
  to?: Date;
  nightKey?: string;
  outcome?: Observation['outcome'];
  /** 소프트 삭제된 행도 포함(되살리기·내보내기용) */
  includeDeleted?: boolean;
  limit?: number;
}

function stripUndefined<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k];
  return o;
}

export async function addObservation(input: ObservationInput): Promise<Observation> {
  const db = getDb();
  const now = nowIso();
  const observedAt = input.observedAt || now;
  const record: Observation = stripUndefined({
    ...input,
    id: input.id ?? newId(),
    observedAt,
    nightKey: input.nightKey ?? nightKey(new Date(observedAt)),
    notes: input.notes ?? '',
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    schemaVersion: DB_SCHEMA_VERSION,
  });
  await db.observations.put(record);
  emitDbChange('observations');
  return record;
}

export async function getObservation(id: string): Promise<Observation | undefined> {
  const row = await getDb().observations.get(id);
  return row && !row.deletedAt ? row : undefined;
}

export async function updateObservation(
  id: string,
  patch: Partial<ObservationInput>,
): Promise<Observation | undefined> {
  const db = getDb();
  const existing = await db.observations.get(id);
  if (!existing) return undefined;
  const now = nowIso();
  const observedAt = patch.observedAt ?? existing.observedAt;
  const record: Observation = stripUndefined({
    ...existing,
    ...patch,
    id: existing.id,
    observedAt,
    nightKey:
      patch.nightKey ?? (patch.observedAt ? nightKey(new Date(observedAt)) : existing.nightKey),
    updatedAt: now,
  });
  await db.observations.put(record);
  emitDbChange('observations');
  return record;
}

/** 소프트 삭제. 되살리려면 `restoreObservation`. */
export async function deleteObservation(id: string): Promise<void> {
  const now = nowIso();
  await getDb().observations.update(id, { deletedAt: now, updatedAt: now });
  emitDbChange('observations');
}

export async function restoreObservation(id: string): Promise<void> {
  const db = getDb();
  const row = await db.observations.get(id);
  if (!row) return;
  delete row.deletedAt;
  row.updatedAt = nowIso();
  await db.observations.put(row);
  emitDbChange('observations');
}

/** 최근순(observedAt 내림차순). */
export async function listObservations(q: ObservationQuery = {}): Promise<Observation[]> {
  const db = getDb();
  let rows: Observation[];
  if (q.objectId) rows = await db.observations.where('objectId').equals(q.objectId).toArray();
  else if (q.nightKey) rows = await db.observations.where('nightKey').equals(q.nightKey).toArray();
  else rows = await db.observations.orderBy('observedAt').reverse().toArray();
  const fromIso = q.from?.toISOString();
  const toIso = q.to?.toISOString();
  const out = rows
    .filter((r) => q.includeDeleted || !r.deletedAt)
    .filter((r) => !q.outcome || r.outcome === q.outcome)
    .filter((r) => !fromIso || r.observedAt >= fromIso)
    .filter((r) => !toIso || r.observedAt < toIso)
    .sort((a, b) => (a.observedAt < b.observedAt ? 1 : a.observedAt > b.observedAt ? -1 : 0));
  return q.limit ? out.slice(0, q.limit) : out;
}

export interface ObservedSets {
  /** outcome:'seen' 기록이 하나라도 있는 대상(금색 ★) */
  observed: Set<ObjectId>;
  /** 시도했지만 못 본 기록만 있는 대상(회색 ★) */
  attempted: Set<ObjectId>;
  /** 대상별 기록 수(삭제 제외) */
  countByObject: Map<ObjectId, number>;
}

export async function observedSets(): Promise<ObservedSets> {
  const rows = (await getDb().observations.toArray()).filter((r) => !r.deletedAt);
  const observed = new Set<ObjectId>();
  const tried = new Set<ObjectId>();
  const countByObject = new Map<ObjectId, number>();
  for (const r of rows) {
    countByObject.set(r.objectId, (countByObject.get(r.objectId) ?? 0) + 1);
    if (r.outcome === 'seen') observed.add(r.objectId);
    else tried.add(r.objectId);
  }
  const attempted = new Set<ObjectId>([...tried].filter((id) => !observed.has(id)));
  return { observed, attempted, countByObject };
}

export async function getObservedSet(): Promise<Set<ObjectId>> {
  return (await observedSets()).observed;
}
