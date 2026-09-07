/**
 * 기록 탭 데이터 훅(task-04 §3.4).
 * - `useObservations`: 삭제 제외 전체 기록(최근순). `logStore.version`이 바뀔 때(리포지토리 쓰기마다) 다시 읽는다.
 * - `useCatalog`: 이름 표시용 카탈로그(한 번 로드).
 * - `useBlobUrl`: 스케치·사진 blob → objectURL(언마운트·교체 시 revoke).
 * - `useTick`: 주기 재계산용 카운터(관측 예정 목록의 고도·방위).
 */
import { useEffect, useState } from 'react';
import { loadCatalog, type Catalog } from '@/catalog/catalog';
import { getBlob } from '@/db/repos/blobs';
import { listObservations } from '@/db/repos/observations';
import type { Observation } from '@/db/types';
import { useLogStore } from '@/state/logStore';

export interface ObservationsState {
  /** 삭제 제외, 최근순 */
  rows: Observation[];
  /** 첫 읽기가 끝났는가 */
  ready: boolean;
}

export function useObservations(): ObservationsState {
  const version = useLogStore((s) => s.version);
  const [state, setState] = useState<ObservationsState>({ rows: [], ready: false });
  useEffect(() => {
    let alive = true;
    void listObservations().then((rows) => {
      if (alive) setState({ rows, ready: true });
    });
    return () => {
      alive = false;
    };
  }, [version]);
  return state;
}

export function useCatalog(): Catalog | null {
  const [cat, setCat] = useState<Catalog | null>(null);
  useEffect(() => {
    let alive = true;
    void loadCatalog()
      .then((c) => {
        if (alive) setCat(c);
      })
      .catch(() => {
        /* 오프라인·실패: id로 표시 */
      });
    return () => {
      alive = false;
    };
  }, []);
  return cat;
}

/** blob id → objectURL. 없거나 로드 전이면 null. */
export function useBlobUrl(blobId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blobId) {
      const h = window.setTimeout(() => setUrl(null), 0);
      return () => window.clearTimeout(h);
    }
    let alive = true;
    let created: string | null = null;
    void getBlob(blobId).then((rec) => {
      if (!alive) return;
      if (!rec) {
        setUrl(null);
        return;
      }
      created = URL.createObjectURL(rec.data);
      setUrl(created);
    });
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [blobId]);
  return url;
}

/** `ms`마다 1씩 오르는 카운터 — useMemo 의존성으로 넣어 주기 재계산한다 */
export function useTick(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return tick;
}
