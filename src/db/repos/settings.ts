import type { StateStorage } from 'zustand/middleware';
import { getDb, nowIso } from '@/db/database';

/** 설정 한 개 읽기. 없으면 undefined. */
export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const row = await getDb().settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getDb().settings.put({ key, value, updatedAt: nowIso() });
}

export async function deleteSetting(key: string): Promise<void> {
  await getDb().settings.delete(key);
}

interface PersistedEnvelope {
  state: Record<string, unknown>;
  version?: number;
}

/**
 * zustand `persist`용 storage 어댑터 (D-010: localStorage 금지, Dexie settings가 단일 진실 원천).
 * 스토어 상태를 통째로 한 행에 넣지 않고 **키마다 한 행**(`<name>.<key>`)으로 저장해
 * 다른 모듈(T4 내보내기 등)이 개별 설정을 그대로 읽을 수 있게 한다.
 */
export function createDexieSettingsStorage(namespace = 'settings'): StateStorage {
  const prefix = `${namespace}.`;
  const versionKey = `${prefix}__version`;
  let lastWritten: string | undefined;
  let pending: Promise<unknown> = Promise.resolve();
  // 센서의 런타임 상태가 바뀌어도 partialize된 설정은 대부분 같다.
  // 성공한 저장만 기억하고, 읽기/삭제까지 순서대로 처리해 복원과 재시도를 보존한다.
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  }
  return {
    getItem(_name) {
      return enqueue(async () => {
        lastWritten = undefined;
        const rows = await getDb().settings.where('key').startsWith(prefix).toArray();
        if (rows.length === 0) return null;
        const state: Record<string, unknown> = {};
        let version = 0;
        for (const row of rows) {
          if (row.key === versionKey) version = typeof row.value === 'number' ? row.value : 0;
          else state[row.key.slice(prefix.length)] = row.value;
        }
        const envelope: PersistedEnvelope = { state, version };
        return JSON.stringify(envelope);
      });
    },
    setItem(_name, value) {
      return enqueue(async () => {
        if (value === lastWritten) return;
        const envelope = JSON.parse(value) as PersistedEnvelope;
        const updatedAt = nowIso();
        const db = getDb();
        await db.transaction('rw', db.settings, async () => {
          for (const [k, v] of Object.entries(envelope.state)) {
            await db.settings.put({ key: `${prefix}${k}`, value: v, updatedAt });
          }
          await db.settings.put({ key: versionKey, value: envelope.version ?? 0, updatedAt });
        });
        lastWritten = value;
      });
    },
    removeItem(_name) {
      return enqueue(async () => {
        lastWritten = undefined;
        await getDb().settings.where('key').startsWith(prefix).delete();
      });
    },
  };
}
