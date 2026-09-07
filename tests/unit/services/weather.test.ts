import { describe, expect, it, vi } from 'vitest';
import { cacheGet } from '@/db/repos/cache';
import {
  dewRisk,
  getWeather,
  hourAt,
  localIsoToDate,
  openMeteoUrl,
  parseOpenMeteo,
  summarizeWeather,
  type OpenMeteoResponse,
} from '@/services/weather';

function sample(): OpenMeteoResponse {
  const time: string[] = [];
  const cloud: number[] = [];
  const temp: number[] = [];
  const dew: number[] = [];
  for (let h = 0; h < 48; h++) {
    const d = h < 24 ? '2026-09-07' : '2026-09-08';
    time.push(`${d}T${String(h % 24).padStart(2, '0')}:00`);
    // 21~01시(현지)는 맑음(10%), 그 외 80%
    const local = h % 24;
    cloud.push(local >= 21 || local <= 1 ? 10 : 80);
    temp.push(20);
    dew.push(local === 23 ? 19 : 12);
  }
  return {
    latitude: 36.35,
    longitude: 127.375,
    utc_offset_seconds: 32400,
    timezone: 'Asia/Seoul',
    hourly: {
      time,
      cloud_cover: cloud,
      cloud_cover_low: cloud.map((c) => c / 2),
      cloud_cover_mid: cloud.map(() => 0),
      cloud_cover_high: cloud.map((c) => c / 2),
      visibility: cloud.map(() => 24140),
      relative_humidity_2m: cloud.map(() => 60),
      dew_point_2m: dew,
      temperature_2m: temp,
      wind_speed_10m: cloud.map(() => 8),
      precipitation_probability: cloud.map(() => 5),
    },
  };
}

describe('Open-Meteo 파싱', () => {
  it('현지 시각 문자열 + 오프셋 → UTC 순간', () => {
    expect(localIsoToDate('2026-09-07T21:00', 32400).toISOString()).toBe(
      '2026-09-07T12:00:00.000Z',
    );
    expect(localIsoToDate('2026-09-07T21:00:00', -14400).toISOString()).toBe(
      '2026-09-08T01:00:00.000Z',
    );
  });
  it('URL에 필요한 변수·timezone=auto가 들어간다', () => {
    const u = openMeteoUrl(36.37, 127.36);
    expect(u).toContain('latitude=36.3700');
    expect(u).toContain('timezone=auto');
    expect(u).toContain('cloud_cover_low');
    expect(u).toContain('forecast_days=2');
  });
  it('시간별 레코드·결로 판정·요약', () => {
    const f = parseOpenMeteo(sample(), new Date('2026-09-07T10:00:00Z'));
    expect(f.hours.length).toBe(48);
    expect(f.hours[21]!.at.toISOString()).toBe('2026-09-07T12:00:00.000Z');
    expect(f.hours[21]!.cloud).toBe(10);
    expect(dewRisk(f.hours[23]!)).toBe(true);
    expect(dewRisk(f.hours[22]!)).toBe(false);
    const h = hourAt(f, new Date('2026-09-07T12:30:00Z'));
    expect(h?.at.toISOString()).toBe('2026-09-07T12:00:00.000Z');
    const s = summarizeWeather(f, {
      from: new Date('2026-09-07T11:00:00Z'), // 20:00 KST
      to: new Date('2026-09-07T20:00:00Z'), // 05:00 KST
    });
    expect(s).not.toBeNull();
    expect(s!.clearWindow?.from.toISOString()).toBe('2026-09-07T12:00:00.000Z'); // 21:00
    expect(s!.clearWindow?.to.toISOString()).toBe('2026-09-07T17:00:00.000Z'); // 02:00(01시 + 1h)
    expect(s!.minCloud).toBe(10);
    expect(s!.dewRiskHours).toBe(1);
  });
});

describe('getWeather: 캐시·실패 처리', () => {
  it('첫 호출은 fetch, 두 번째는 캐시(1시간)', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(sample()), { status: 200 }));
    const a = await getWeather(36.37, 127.36, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => new Date('2026-09-07T10:00:00Z'),
    });
    expect(a?.hours.length).toBe(48);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(await cacheGet('weather:36.37,127.36')).toBeTruthy();
    const b = await getWeather(36.37, 127.36, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(b?.hours.length).toBe(48);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('HTTP 오류·네트워크 예외·잘못된 응답이면 null(예외 없음)', async () => {
    const bad = vi.fn(async () => new Response('nope', { status: 500 }));
    expect(await getWeather(1, 2, { fetchImpl: bad as unknown as typeof fetch })).toBeNull();
    const throwing = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await getWeather(1, 3, { fetchImpl: throwing as unknown as typeof fetch })).toBeNull();
    const empty = vi.fn(
      async () => new Response(JSON.stringify({ hourly: { time: [] } }), { status: 200 }),
    );
    expect(await getWeather(1, 4, { fetchImpl: empty as unknown as typeof fetch })).toBeNull();
  });
});
