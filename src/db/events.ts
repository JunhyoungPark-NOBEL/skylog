/**
 * DB 변경 알림(아주 작은 이벤트 버스). 리포지토리가 쓰기 뒤에 `emitDbChange(table)`을 부르고,
 * `logStore` 같은 파생 상태가 구독해 다시 읽는다. Dexie liveQuery 대신 쓰는 이유: 테스트에서 DB 인스턴스를
 * 바꿔 끼워도(setDbForTesting) 구독이 꼬이지 않고, 갱신 시점을 우리가 통제할 수 있다.
 */
export type DbTable =
  'observations' | 'bookmarks' | 'blobs' | 'sites' | 'equipment' | 'progress' | 'all';

type Listener = (table: DbTable) => void;
const listeners = new Set<Listener>();

export function onDbChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function emitDbChange(table: DbTable): void {
  for (const cb of [...listeners]) {
    try {
      cb(table);
    } catch (e) {
      console.error('[skylog] db change listener failed', e);
    }
  }
}
