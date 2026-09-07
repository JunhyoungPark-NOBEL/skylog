/**
 * 기록 폼 자동 채움(task-04 §3.2): 대상의 고도·방위, 달 밝은 부분·위상각·달과 떨어진 각도, 광해 단계, 날씨(있으면).
 * - `buildConditions`는 순수 함수 — 값은 상세 시트와 같은 `computeObjectDetails`/`bodyState`에서 나온다.
 * - `loadAutoFill`은 얇은 로더: 카탈로그·대상·관측 밤·날씨를 모아 `buildConditions`를 부른다.
 * - `toLocalInput`/`fromLocalInput`은 `<input type="datetime-local">` ↔ Date 변환(앱 시간대 기준, 순수).
 */
import { bodyState } from '@/astro/bodies';
import { computeObjectDetails } from '@/astro/objectDetails';
import type { ObserverLike } from '@/astro/frames';
import type { ObservingNight } from '@/astro/night';
import { loadCatalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { resolveTarget, type ObjectTarget } from '@/catalog/objectTarget';
import type { Bortle, ObservationConditions } from '@/db/types';
import { getSkyScene } from '@/features/sky/skyApi';
import { getObservingNight } from '@/features/tonight/useNight';
import { getWeather, hourAt, type WeatherForecast, type WeatherHour } from '@/services/weather';
import { useLocationStore } from '@/state/locationStore';
import { DEFAULT_TZ, tzOffsetMinutes } from '@/ui/format';

export interface AutoFillInput {
  target: ObjectTarget;
  at: Date;
  observer: ObserverLike;
  night: ObservingNight;
  bortle?: Bortle;
  /** 그 시각의 시간별 예보(없으면 날씨 항목은 비워 둔다) */
  weatherHour?: WeatherHour;
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/**
 * 자동 조건 계산(순수). 시상·투명도는 사용자가 고르므로 여기서 채우지 않는다.
 * 달 자체를 기록할 때는 "달과 떨어진 각도"가 의미 없으므로 비운다.
 */
export function buildConditions(input: AutoFillInput): ObservationConditions {
  const { target, at, observer, night, bortle, weatherHour } = input;
  const d = computeObjectDetails(target, at, observer, night, bortle ? { bortle } : {});
  // 달 위상각은 상세 시트가 달 대상일 때만 주므로 같은 경로(`bodyState('moon')`)로 항상 계산한다.
  const moonPhaseDeg = d.now.moonPhaseDeg ?? bodyState('moon', at, observer).moonPhaseDeg;
  const out: ObservationConditions = {
    altDeg: round(d.now.altDeg, 1),
    azDeg: round(d.now.azDeg, 1),
    moonIllum: round(d.now.moonIllum, 3),
  };
  if (moonPhaseDeg !== undefined) out.moonPhaseDeg = round(moonPhaseDeg, 1);
  if (target.kind !== 'moon') out.moonSepDeg = round(d.now.moonSepDeg, 1);
  if (bortle !== undefined) out.bortle = bortle;
  if (weatherHour) {
    out.cloudCover = Math.round(weatherHour.cloud);
    out.tempC = round(weatherHour.tempC, 1);
    out.humidity = Math.round(weatherHour.humidity);
  }
  return out;
}

/** Date → "YYYY-MM-DDTHH:MM"(tz 기준 현지 시각). datetime-local 값으로 쓴다. */
export function toLocalInput(date: Date, tz = DEFAULT_TZ): string {
  const off = tzOffsetMinutes(date, tz);
  const local = new Date(date.getTime() + off * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}T${p(local.getUTCHours())}:${p(local.getUTCMinutes())}`;
}

/** "YYYY-MM-DDTHH:MM"(tz 현지 시각) → Date. 형식이 어긋나면 null. */
export function fromLocalInput(value: string, tz = DEFAULT_TZ): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const guess = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s ?? 0),
  );
  if (!Number.isFinite(guess)) return null;
  const off = tzOffsetMinutes(new Date(guess), tz);
  const first = new Date(guess - off * 60_000);
  const off2 = tzOffsetMinutes(first, tz);
  return off2 === off ? first : new Date(guess - off2 * 60_000);
}

export interface AutoFillResult {
  /** 카탈로그에 없는 id면 null(조건도 비어 있음) */
  target: ObjectTarget | null;
  conditions: ObservationConditions;
  /** 날씨를 실제로 넣었는가 */
  hasWeather: boolean;
}

export interface AutoFillOptions {
  observer?: ObserverLike;
  bortle?: Bortle;
  /** 미리 받아 둔 예보. undefined면 새로 받고(캐시 1시간), null이면 날씨를 쓰지 않는다. */
  forecast?: WeatherForecast | null;
}

/** 현재 관측지의 예보(오프라인·실패면 null). 폼이 한 번만 받아 두고 시각이 바뀔 때마다 재사용한다. */
export async function loadForecast(observer?: ObserverLike): Promise<WeatherForecast | null> {
  const site = observer ?? useLocationStore.getState().site;
  try {
    return await getWeather(site.lat, site.lon);
  } catch {
    return null;
  }
}

/**
 * 자동 조건 로더. 카탈로그 → 대상(팩 전용 별은 하늘 씬 fallback) → 관측 밤 → 날씨(있으면) → `buildConditions`.
 */
export async function loadAutoFill(
  id: ObjectId,
  at: Date,
  opts: AutoFillOptions = {},
): Promise<AutoFillResult> {
  const observer = opts.observer ?? useLocationStore.getState().site;
  const cat = await loadCatalog();
  const fallback = getSkyScene()?.objectJ2000(id) ?? null;
  const target = resolveTarget(cat, id, at, observer, fallback);
  if (!target) {
    const conditions: ObservationConditions = {};
    if (opts.bortle !== undefined) conditions.bortle = opts.bortle;
    return { target: null, conditions, hasWeather: false };
  }
  const night = getObservingNight(observer, at);
  const forecast = opts.forecast === undefined ? await loadForecast(observer) : opts.forecast;
  const weatherHour = forecast ? hourAt(forecast, at) : undefined;
  const conditions = buildConditions({
    target,
    at,
    observer,
    night,
    bortle: opts.bortle,
    weatherHour,
  });
  return { target, conditions, hasWeather: weatherHour !== undefined };
}
