import { create } from 'zustand';
import type { ObjectId } from '@/catalog/objectId';
import { onDbChange } from '@/db/events';
import { bookmarkedIds } from '@/db/repos/bookmarks';
import { listObservations, observedSets } from '@/db/repos/observations';
import type { Observation } from '@/db/types';

/**
 * 기록 파생 상태(task-04 §3.1): ★(본 것)·회색 ★(시도)·☆(예정) 집합과 최근 기록.
 * DB가 진실이고 이 스토어는 캐시다 — 리포지토리가 `emitDbChange`를 부르면 다시 읽는다(`startLogSync`).
 * 하늘 마커·검색 행·시트 헤더·추천(observedSet)이 모두 여기서 읽는다.
 */
export type MarkerKind = 'observed' | 'attempted' | 'bookmarked';

export interface LogState {
  observedSet: Set<ObjectId>;
  attemptedSet: Set<ObjectId>;
  bookmarkedSet: Set<ObjectId>;
  countByObject: Map<ObjectId, number>;
  /** 최근 기록 20개(최근순) */
  recent: Observation[];
  /** 첫 로드가 끝났는가 */
  ready: boolean;
  /** 변경 횟수 — 셀렉터 없이 "바뀌었음"만 알고 싶을 때 */
  version: number;
  refresh(): Promise<void>;
}

const RECENT_LIMIT = 20;

export const useLogStore = create<LogState>()((set, get) => ({
  observedSet: new Set(),
  attemptedSet: new Set(),
  bookmarkedSet: new Set(),
  countByObject: new Map(),
  recent: [],
  ready: false,
  version: 0,
  refresh: async () => {
    const [sets, bookmarkedSet, recent] = await Promise.all([
      observedSets(),
      bookmarkedIds(),
      listObservations({ limit: RECENT_LIMIT }),
    ]);
    set({
      observedSet: sets.observed,
      attemptedSet: sets.attempted,
      countByObject: sets.countByObject,
      bookmarkedSet,
      recent,
      ready: true,
      version: get().version + 1,
    });
  },
}));

/** 대상의 마커 종류(우선순위: 본 것 > 시도 > 예정). 없으면 null. */
export function markerKindOf(
  state: Pick<LogState, 'observedSet' | 'attemptedSet' | 'bookmarkedSet'>,
  id: ObjectId,
): MarkerKind | null {
  if (state.observedSet.has(id)) return 'observed';
  if (state.attemptedSet.has(id)) return 'attempted';
  if (state.bookmarkedSet.has(id)) return 'bookmarked';
  return null;
}

let stop: (() => void) | null = null;
let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * DB 변경 구독 시작(앱 부트스트랩에서 한 번). 연속 변경은 한 틱으로 합친다.
 * 돌려주는 함수로 구독을 끝낸다(테스트용).
 */
export function startLogSync(): () => void {
  if (stop) return stop;
  void useLogStore.getState().refresh();
  const off = onDbChange((table) => {
    if (table !== 'observations' && table !== 'bookmarks' && table !== 'all') return;
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      void useLogStore.getState().refresh();
    }, 0);
  });
  stop = () => {
    off();
    if (pending) clearTimeout(pending);
    pending = null;
    stop = null;
  };
  return stop;
}
