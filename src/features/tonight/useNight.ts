/**
 * 현재 관측지·시계 기준 관측 밤(`observingNight`)을 캐시해 주는 훅. 밤 키·관측지가 바뀔 때만 다시 계산한다(수십 ms).
 */
import { useEffect, useState } from 'react';
import { observingNight, type ObservingNight } from '@/astro/night';
import { nightKey } from '@/astro/time';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';

const cache = new Map<string, ObservingNight>();

export function getObservingNight(
  site: { lat: number; lon: number; elevation?: number },
  date: Date,
): ObservingNight {
  const key = `${nightKey(date)}|${site.lat.toFixed(3)}|${site.lon.toFixed(3)}`;
  let n = cache.get(key);
  if (!n) {
    n = observingNight(site, date);
    if (cache.size > 12) cache.clear();
    cache.set(key, n);
  }
  return n;
}

/** 시계가 다른 밤으로 넘어가거나 관측지가 바뀌면 갱신(1분 폴링 + 스토어 구독). */
export function useObservingNight(): ObservingNight | null {
  const site = useLocationStore((s) => s.site);
  const [night, setNight] = useState<ObservingNight | null>(null);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (cancelled) return;
      const n = getObservingNight(site, useClockStore.getState().now());
      setNight((prev) =>
        prev && prev.key === n.key && prev.start.getTime() === n.start.getTime() ? prev : n,
      );
    };
    const first = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 60_000);
    const unsub = useClockStore.subscribe(refresh);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      unsub();
    };
  }, [site]);
  return night;
}
