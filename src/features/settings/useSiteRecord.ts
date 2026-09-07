/**
 * 현재 관측지의 Dexie 레코드(보이는 범위·최소 고도·Bortle). `locationStore.siteId`가 없으면(GPS·프리셋) 빈 제약.
 */
import { useEffect, useState } from 'react';
import type { SiteConstraints } from '@/astro/recommend';
import { getDb } from '@/db/database';
import type { Bortle, Site } from '@/db/types';
import { useLocationStore } from '@/state/locationStore';

export interface SiteRecordState {
  record: Site | null;
  constraints: SiteConstraints;
  bortle: Bortle;
}

const EMPTY: SiteRecordState = { record: null, constraints: {}, bortle: 7 };

export function useSiteRecord(): SiteRecordState {
  const siteId = useLocationStore((s) => s.siteId);
  const [state, setState] = useState<SiteRecordState>(EMPTY);
  useEffect(() => {
    let alive = true;
    if (!siteId) {
      const h = window.setTimeout(() => setState(EMPTY), 0);
      return () => window.clearTimeout(h);
    }
    void getDb()
      .sites.get(siteId)
      .then((rec) => {
        if (!alive) return;
        if (!rec) {
          setState(EMPTY);
          return;
        }
        setState({
          record: rec,
          constraints: {
            visibleAz: rec.visibleAz?.length ? rec.visibleAz : undefined,
            minAltDeg: rec.minAltDeg,
            bortle: rec.bortle,
          },
          bortle: rec.bortle ?? 7,
        });
      });
    return () => {
      alive = false;
    };
  }, [siteId]);
  return state;
}
