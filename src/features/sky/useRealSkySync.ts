import { useEffect } from 'react';
import { bodyState } from '@/astro/bodies';
import { clampBortle, DEFAULT_LIMITING_MAG, realSkyLimitingMag } from '@/astro/realSky';
import { useSiteRecord } from '@/features/settings/useSiteRecord';
import { useClockStore } from '@/state/clockStore';
import { useLayerStore } from '@/state/layerStore';
import { useLocationStore } from '@/state/locationStore';

const SYNC_MS = 30_000;

/**
 * "실제 하늘처럼"(task-03 §3.9): 켜면 Bortle(레이어 설정 > 관측지 > 7)·달 조도·고도로 한계등급을 계산해 렌더러에 넣는다.
 * 박명·낮은 렌더러가 태양 고도로 따로 처리한다(`realSky.ts` 주석). 끄면 기본 6.5로 되돌린다.
 */
export function useRealSkySync(): void {
  const realSky = useLayerStore((s) => s.realSky);
  const bortleSetting = useLayerStore((s) => s.bortle);
  const { bortle: siteBortle } = useSiteRecord();
  const site = useLocationStore((s) => s.site);
  useEffect(() => {
    const set = useLayerStore.getState().set;
    if (!realSky) {
      const h = window.setTimeout(() => {
        if (useLayerStore.getState().limitingMag !== DEFAULT_LIMITING_MAG)
          set('limitingMag', DEFAULT_LIMITING_MAG);
      }, 0);
      return () => window.clearTimeout(h);
    }
    const sync = () => {
      const now = useClockStore.getState().now();
      const moon = bodyState('moon', now, site);
      const bortle = clampBortle(bortleSetting > 0 ? bortleSetting : siteBortle);
      const mag = realSkyLimitingMag({
        bortle,
        moonIllumination: moon.phaseFraction,
        moonAltDeg: moon.altDeg,
      });
      if (useLayerStore.getState().limitingMag !== mag) set('limitingMag', mag);
    };
    const first = window.setTimeout(sync, 0);
    const timer = window.setInterval(sync, SYNC_MS);
    const unsub = useClockStore.subscribe(sync);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      unsub();
    };
  }, [realSky, bortleSetting, siteBortle, site]);
}
