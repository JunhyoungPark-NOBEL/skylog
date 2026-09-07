/**
 * 날씨(task-03 §3.5): Open-Meteo 시간별 예보(키 불필요, CORS 허용, CC BY 4.0 — 카드에 "Weather data by Open-Meteo.com" 표기).
 * 1시간 캐시는 Dexie `cache` 테이블. 실패·오프라인이면 null을 돌려주고 앱은 그대로 동작한다.
 * 7Timer ASTRO(시상·투명도)는 응답에 Access-Control-Allow-Origin이 없어 브라우저에서 호출할 수 없으므로 쓰지 않는다(D-020).
 *
 * 응답의 `hourly.time`은 `timezone=auto`일 때 **현지 시각 문자열**(오프셋 없음)이다. `utc_offset_seconds`로 UTC 순간을 만든다.
 */
import type { Interval } from '@/astro/night';
import { cacheGet, cacheSet } from '@/db/repos/cache';

export interface WeatherHour {
  at: Date;
  /** 전운량 0..100 */
  cloud: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  /** 가시거리(m), 없으면 undefined */
  visibilityM?: number;
  humidity: number;
  dewPointC: number;
  tempC: number;
  windKmh: number;
  precipProb: number;
}

export interface WeatherForecast {
  source: 'open-meteo';
  fetchedAt: Date;
  lat: number;
  lon: number;
  utcOffsetSeconds: number;
  timezone: string;
  hours: WeatherHour[];
}

/** Open-Meteo 응답(필요한 부분만) */
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  hourly: {
    time: string[];
    cloud_cover?: (number | null)[];
    cloud_cover_low?: (number | null)[];
    cloud_cover_mid?: (number | null)[];
    cloud_cover_high?: (number | null)[];
    visibility?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    dew_point_2m?: (number | null)[];
    temperature_2m?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    precipitation_probability?: (number | null)[];
  };
}

export const WEATHER_TTL_MS = 60 * 60 * 1000;
export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const HOURLY = [
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'visibility',
  'relative_humidity_2m',
  'dew_point_2m',
  'temperature_2m',
  'wind_speed_10m',
  'precipitation_probability',
].join(',');

export function openMeteoUrl(lat: number, lon: number, days = 2): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: HOURLY,
    timezone: 'auto',
    forecast_days: String(days),
  });
  return `${OPEN_METEO_URL}?${q.toString()}`;
}

/** 현지 시각 문자열("2026-09-07T21:00") + 오프셋(초) → UTC 순간 */
export function localIsoToDate(local: string, utcOffsetSeconds: number): Date {
  const asUtc = Date.parse(`${local}${local.length === 16 ? ':00' : ''}Z`);
  return new Date(asUtc - utcOffsetSeconds * 1000);
}

export function parseOpenMeteo(json: OpenMeteoResponse, fetchedAt: Date): WeatherForecast {
  const h = json.hourly;
  const num = (arr: (number | null)[] | undefined, i: number, fallback = 0): number => {
    const v = arr?.[i];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  };
  const hours: WeatherHour[] = h.time.map((t, i) => {
    const vis = h.visibility?.[i];
    return {
      at: localIsoToDate(t, json.utc_offset_seconds),
      cloud: num(h.cloud_cover, i),
      cloudLow: num(h.cloud_cover_low, i),
      cloudMid: num(h.cloud_cover_mid, i),
      cloudHigh: num(h.cloud_cover_high, i),
      visibilityM: typeof vis === 'number' ? vis : undefined,
      humidity: num(h.relative_humidity_2m, i),
      dewPointC: num(h.dew_point_2m, i),
      tempC: num(h.temperature_2m, i),
      windKmh: num(h.wind_speed_10m, i),
      precipProb: num(h.precipitation_probability, i),
    };
  });
  return {
    source: 'open-meteo',
    fetchedAt,
    lat: json.latitude,
    lon: json.longitude,
    utcOffsetSeconds: json.utc_offset_seconds,
    timezone: json.timezone,
    hours,
  };
}

interface CachedForecast {
  json: OpenMeteoResponse;
  fetchedAt: string;
}

function cacheKey(lat: number, lon: number): string {
  return `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export interface WeatherOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** 캐시를 무시하고 새로 받는다 */
  force?: boolean;
}

/**
 * 예보를 가져온다(캐시 1시간). 오프라인·실패·타임아웃(8초)이면 null — 호출자는 카드를 숨긴다.
 * 오프라인이어도 캐시가 살아 있으면 그것을 돌려준다.
 */
export async function getWeather(
  lat: number,
  lon: number,
  opts: WeatherOptions = {},
): Promise<WeatherForecast | null> {
  const now = opts.now ?? (() => new Date());
  const key = cacheKey(lat, lon);
  if (!opts.force) {
    try {
      const cached = await cacheGet<CachedForecast>(key);
      if (cached) return parseOpenMeteo(cached.json, new Date(cached.fetchedAt));
    } catch {
      /* 캐시 실패는 무시 */
    }
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) return null;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const res = await fetchImpl(openMeteoUrl(lat, lon), { signal: controller?.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as OpenMeteoResponse;
    if (!json?.hourly?.time?.length) return null;
    const fetchedAt = now();
    try {
      await cacheSet(key, { json, fetchedAt: fetchedAt.toISOString() } satisfies CachedForecast, WEATHER_TTL_MS);
    } catch {
      /* 캐시 저장 실패는 무시 */
    }
    return parseOpenMeteo(json, fetchedAt);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 구간 안의 시간별 예보 */
export function hoursIn(forecast: WeatherForecast, iv: Interval): WeatherHour[] {
  const a = iv.from.getTime();
  const b = iv.to.getTime();
  return forecast.hours.filter((h) => h.at.getTime() >= a - 30 * 60_000 && h.at.getTime() <= b);
}

/** 시각 t에 해당하는(가장 가까운 이전) 시간 예보 */
export function hourAt(forecast: WeatherForecast, t: Date): WeatherHour | undefined {
  const ms = t.getTime();
  let best: WeatherHour | undefined;
  for (const h of forecast.hours) {
    if (h.at.getTime() <= ms) best = h;
    else break;
  }
  return best && ms - best.at.getTime() <= 3_600_000 ? best : undefined;
}

/** 결로 경고: 기온 − 이슬점 < 2°C */
export function dewRisk(h: WeatherHour): boolean {
  return h.tempC - h.dewPointC < 2;
}

export interface WeatherSummary {
  /** 구름 ≤ 30%인 가장 긴 연속 구간 */
  clearWindow: Interval | null;
  minCloud: number;
  maxCloud: number;
  meanCloud: number;
  dewRiskHours: number;
  maxWindKmh: number;
  maxPrecipProb: number;
}

/** 관측 창의 예보 요약(값만; 문장은 UI가 i18n으로 만든다) */
export function summarizeWeather(forecast: WeatherForecast, iv: Interval): WeatherSummary | null {
  const hs = hoursIn(forecast, iv);
  if (hs.length === 0) return null;
  let minCloud = 100;
  let maxCloud = 0;
  let sum = 0;
  let dew = 0;
  let wind = 0;
  let precip = 0;
  let best: Interval | null = null;
  let runStart: Date | null = null;
  const closeRun = (endAt: Date) => {
    if (!runStart) return;
    if (!best || endAt.getTime() - runStart.getTime() > best.to.getTime() - best.from.getTime())
      best = { from: runStart, to: endAt };
    runStart = null;
  };
  for (const h of hs) {
    minCloud = Math.min(minCloud, h.cloud);
    maxCloud = Math.max(maxCloud, h.cloud);
    sum += h.cloud;
    if (dewRisk(h)) dew++;
    wind = Math.max(wind, h.windKmh);
    precip = Math.max(precip, h.precipProb);
    if (h.cloud <= 30) runStart ??= h.at;
    else closeRun(h.at);
  }
  const last = hs[hs.length - 1]!;
  closeRun(new Date(last.at.getTime() + 3_600_000));
  return {
    clearWindow: best,
    minCloud,
    maxCloud,
    meanCloud: sum / hs.length,
    dewRiskHours: dew,
    maxWindKmh: wind,
    maxPrecipProb: precip,
  };
}
