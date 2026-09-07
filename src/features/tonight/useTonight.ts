/**
 * "오늘 밤" 탭의 데이터 조립: 관측 밤 → 창(프리셋) → 날씨(캐시) → 이달 현상 → 추천. 계산은 이펙트 안에서 비동기로.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Interval, ObservingNight } from '@/astro/night';
import { monthPhenomena, specialEventsFrom, type Phenomenon } from '@/astro/phenomena';
import { recommend, type Candidate, type RecommendResult, type SiteConstraints } from '@/astro/recommend';
import { loadCatalog, type Catalog } from '@/catalog/catalog';
import { FAMOUS_SET } from '@/catalog/famous';
import { loadMeteors, type MeteorShower } from '@/catalog/meteors';
import { buildCandidates, SEASON_SIGNATURES } from '@/catalog/recommendCandidates';
import { useSiteRecord } from '@/features/settings/useSiteRecord';
import { useObservingNight } from '@/features/tonight/useNight';
import { getWeather, hourAt, summarizeWeather, type WeatherForecast, type WeatherSummary } from '@/services/weather';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useTonightStore, type WindowPreset } from '@/state/tonightStore';
import { zonedDateTime } from '@/ui/format';

const RECOMPUTE_MS = 5 * 60_000;
const WEATHER_REFRESH_MS = 30 * 60_000;

/** 밤 안의 현지 시(0..24) → 시각. 12시 이후는 밤 시작일, 그 전은 다음 날 */
export function nightHour(night: ObservingNight, hour: number): Date {
  const h = ((hour % 24) + 24) % 24;
  return new Date(night.start.getTime() + ((h + 12) % 24) * 3_600_000);
}

/** 프리셋 → 창(task-03 §3.7). 창이 비거나 뒤집히면 null. */
export function windowForPreset(
  night: ObservingNight,
  preset: WindowPreset,
  now: Date,
  custom: { fromHour: number; toHour: number },
): Interval | null {
  let from: Date;
  let to: Date;
  switch (preset) {
    case 'next2h':
      from = now;
      to = new Date(now.getTime() + 2 * 3_600_000);
      break;
    case 'evening':
      // 일몰부터: 금성·초승달·목성은 박명 중에도 보인다(DSO는 엔진의 −12° 게이트가 따로 막는다)
      from = night.timeline.sunset ?? night.darkSpan?.from ?? nightHour(night, 19);
      to = nightHour(night, 1);
      break;
    case 'lateNight':
      from = nightHour(night, 23);
      to = nightHour(night, 3);
      break;
    case 'dawn':
      from = nightHour(night, 3);
      to = night.darkSpan?.to ?? night.timeline.sunrise ?? nightHour(night, 5);
      break;
    case 'custom':
      from = nightHour(night, custom.fromHour);
      to = nightHour(night, custom.toHour);
      if (to.getTime() <= from.getTime()) to = new Date(to.getTime() + 24 * 3_600_000);
      break;
  }
  if (to.getTime() <= from.getTime()) return null;
  // 밤 범위 밖으로 나가지 않게
  from = new Date(Math.max(from.getTime(), night.start.getTime()));
  to = new Date(Math.min(to.getTime(), night.end.getTime() + 3_600_000));
  return to.getTime() > from.getTime() ? { from, to } : null;
}

const phenomenaCache = new Map<string, Phenomenon[]>();

export function getMonthPhenomena(
  site: { lat: number; lon: number; elevation?: number },
  year: number,
  month: number,
  showers: MeteorShower[],
  tz: string,
): Phenomenon[] {
  const key = `${site.lat.toFixed(2)},${site.lon.toFixed(2)}|${year}-${month}|${showers.length}`;
  let v = phenomenaCache.get(key);
  if (!v) {
    v = monthPhenomena(site, year, month, showers, tz);
    if (phenomenaCache.size > 24) phenomenaCache.clear();
    phenomenaCache.set(key, v);
  }
  return v;
}

function ymOf(date: Date, tz: string): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { year: get('year'), month: get('month') };
}

export interface TonightData {
  night: ObservingNight | null;
  now: Date;
  window: Interval | null;
  cat: Catalog | null;
  weather: WeatherForecast | null;
  weatherSummary: WeatherSummary | null;
  result: RecommendResult | null;
  computing: boolean;
  phenomena: Phenomenon[];
  nextMonthPhenomena: Phenomenon[];
  showers: MeteorShower[];
  constraints: SiteConstraints;
  siteName: string;
  ym: { year: number; month: number } | null;
}

let candidatesCache: { cat: Catalog; list: Candidate[] } | null = null;

export function useTonight(): TonightData {
  const site = useLocationStore((s) => s.site);
  const { constraints } = useSiteRecord();
  const night = useObservingNight();
  const preset = useTonightStore((s) => s.preset);
  const customFrom = useTonightStore((s) => s.customFromHour);
  const customTo = useTonightStore((s) => s.customToHour);
  const equipment = useTonightStore((s) => s.equipment);
  const [now, setNow] = useState(() => useClockStore.getState().now());
  const [cat, setCat] = useState<Catalog | null>(null);
  const [showers, setShowers] = useState<MeteorShower[]>([]);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [computed, setComputed] = useState<{ key: string; result: RecommendResult } | null>(null);

  // 데이터 로드
  useEffect(() => {
    let alive = true;
    void loadCatalog().then((c) => {
      if (alive) setCat(c);
    });
    void loadMeteors()
      .then((m) => {
        if (alive) setShowers(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 시계: 5분마다 + 시간 여행 시
  useEffect(() => {
    const tick = () => setNow(useClockStore.getState().now());
    const timer = window.setInterval(tick, RECOMPUTE_MS);
    const unsub = useClockStore.subscribe(() => {
      const c = useClockStore.getState();
      if (c.mode === 'manual' || c.offsetMs !== 0) tick();
    });
    return () => {
      window.clearInterval(timer);
      unsub();
    };
  }, []);

  // 날씨(관측지 바뀌면 다시, 30분마다 갱신)
  useEffect(() => {
    let alive = true;
    const load = () => {
      void getWeather(site.lat, site.lon).then((w) => {
        if (alive) setWeather(w);
      });
    };
    const first = window.setTimeout(load, 0);
    const timer = window.setInterval(load, WEATHER_REFRESH_MS);
    const onOnline = () => load();
    window.addEventListener('online', onOnline);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [site.lat, site.lon]);

  const window_ = useMemo(
    () => (night ? windowForPreset(night, preset, now, { fromHour: customFrom, toHour: customTo }) : null),
    [night, preset, now, customFrom, customTo],
  );

  const ym = useMemo(() => (night ? ymOf(new Date(night.start.getTime() + 12 * 3_600_000), night.tz) : null), [night]);
  const phenomena = useMemo(
    () => (night && ym ? getMonthPhenomena(site, ym.year, ym.month, showers, night.tz) : []),
    [night, ym, site, showers],
  );
  const nextMonthPhenomena = useMemo(() => {
    if (!night || !ym) return [];
    const ny = ym.month === 12 ? ym.year + 1 : ym.year;
    const nm = ym.month === 12 ? 1 : ym.month + 1;
    return getMonthPhenomena(site, ny, nm, showers, night.tz);
  }, [night, ym, site, showers]);

  const weatherSummary = useMemo(
    () => (weather && window_ ? summarizeWeather(weather, window_) : null),
    [weather, window_],
  );

  // 추천 계산(비동기 틱에서). 입력 키가 바뀌면 이전 결과를 보여 주면서 다시 계산한다.
  const computeKey = useMemo(
    () =>
      window_ && night
        ? [
            window_.from.getTime(),
            window_.to.getTime(),
            Math.floor(now.getTime() / 60_000),
            equipment,
            JSON.stringify(constraints),
            weather?.fetchedAt.getTime() ?? 0,
            site.lat,
            site.lon,
            cat ? 1 : 0,
            phenomena.length,
          ].join('|')
        : '',
    [window_, night, now, equipment, constraints, weather, site.lat, site.lon, cat, phenomena.length],
  );
  useEffect(() => {
    if (!cat || !night || !window_ || !computeKey) return;
    let alive = true;
    const key = computeKey;
    const h = window.setTimeout(() => {
      if (!alive) return;
      if (!candidatesCache || candidatesCache.cat !== cat) candidatesCache = { cat, list: buildCandidates(cat) };
      const events = specialEventsFrom([...phenomena, ...nextMonthPhenomena]);
      const r = recommend({
        candidates: candidatesCache.list,
        observer: site,
        window: window_,
        now,
        night,
        site: constraints,
        equipment,
        cloudAt: weather ? (t) => hourAt(weather, t)?.cloud : undefined,
        events,
        seasonSignatures: SEASON_SIGNATURES,
        famous: FAMOUS_SET,
      });
      if (!alive) return;
      setComputed({ key, result: r });
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(h);
    };
  }, [cat, night, window_, now, site, constraints, equipment, weather, phenomena, nextMonthPhenomena, computeKey]);

  return {
    night,
    now,
    window: window_,
    cat,
    weather,
    weatherSummary,
    result: computed?.result ?? null,
    computing: !!computeKey && computed?.key !== computeKey,
    phenomena,
    nextMonthPhenomena,
    showers,
    constraints,
    siteName: site.name,
    ym,
  };
}

export { zonedDateTime };
