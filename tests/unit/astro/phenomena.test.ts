import { describe, expect, it } from 'vitest';
import { meteorCondition, monthPhenomena, monthRange, specialEventsFrom } from '@/astro/phenomena';
import type { MeteorShower } from '@/catalog/meteors';
import meteors from '../../../public/data/meteors.v1.json';

const SITE = { lat: 36.37, lon: 127.36, elevation: 70 };
const SHOWERS = meteors as MeteorShower[];

describe('이달의 천문 현상', () => {
  it('2026년 10월: 토성 충(10-04 근처), 달 위상 4개 이상, 오리온자리 유성우 극대', () => {
    const ev = monthPhenomena(SITE, 2026, 10, SHOWERS);
    const sat = ev.find((e) => e.kind === 'opposition' && e.bodyKey === 'saturn');
    expect(sat).toBeDefined();
    const d = sat!.at.getTime();
    expect(Math.abs(d - Date.parse('2026-10-04T00:00:00+09:00'))).toBeLessThan(2 * 86_400_000);
    expect(sat!.magnitude).toBeLessThan(1);
    expect(ev.filter((e) => e.kind === 'moonQuarter').length).toBeGreaterThanOrEqual(4);
    const ori = ev.find((e) => e.kind === 'meteorPeak' && e.meteor?.id === 'ORI');
    expect(ori).toBeDefined();
    expect(['good', 'fair', 'poor']).toContain(ori!.meteor!.condition);
    // 시간순
    for (let i = 1; i < ev.length; i++)
      expect(ev[i]!.at.getTime()).toBeGreaterThanOrEqual(ev[i - 1]!.at.getTime());
  });
  it('매달 달 위상은 최소 하나, 월 범위는 현지 자정 기준', () => {
    for (let m = 1; m <= 12; m++) {
      const r = monthRange(2026, m);
      expect(r.end.getTime()).toBeGreaterThan(r.start.getTime());
      const ev = monthPhenomena(SITE, 2026, m);
      expect(ev.some((e) => e.kind === 'moonQuarter')).toBe(true);
      for (const e of ev) {
        expect(e.at.getTime()).toBeGreaterThanOrEqual(r.start.getTime());
        expect(e.at.getTime()).toBeLessThan(r.end.getTime());
      }
    }
    expect(monthRange(2026, 9).start.toISOString()).toBe('2026-08-31T15:00:00.000Z');
  });
  it('2026년 8월: 12일 개기일식(한국에서 안 보임)·28일 부분월식·페르세우스 유성우가 잡힌다', () => {
    const ev = monthPhenomena(SITE, 2026, 8, SHOWERS);
    const solar = ev.find((e) => e.kind === 'solarEclipse');
    expect(solar).toBeDefined();
    expect(solar!.visibleLocally).toBe(false);
    const lunar = ev.find((e) => e.kind === 'lunarEclipse');
    expect(lunar).toBeDefined();
    expect(lunar!.eclipseKind).toBe('partial');
    const per = ev.find((e) => e.kind === 'meteorPeak' && e.meteor?.id === 'PER');
    expect(per).toBeDefined();
  });
  it('유성우 조건: 보름달 근처면 poor, 달이 없으면 good', () => {
    const gem = SHOWERS.find((s) => s.id === 'GEM')!;
    const c = meteorCondition(gem, 2026, SITE);
    expect(c.bestAt.getTime() - c.peakNight.getTime()).toBe(26 * 3_600_000);
    expect(c.radiantAltDeg).toBeGreaterThan(30); // 새벽 2시 쌍둥이자리는 높다
    const per2025 = meteorCondition(SHOWERS.find((s) => s.id === 'PER')!, 2025, SITE);
    expect(per2025.condition).toBe('poor'); // 2025-08-12 극대는 보름(8/9) 직후 달이 밝다
  });
  it('특별 이벤트 추출', () => {
    const ev = monthPhenomena(SITE, 2026, 10, SHOWERS);
    const sp = specialEventsFrom(ev);
    expect(sp.some((e) => e.kind === 'opposition' && e.objectId === 'planet:saturn')).toBe(true);
  });
});
