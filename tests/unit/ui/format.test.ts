import { describe, expect, it } from 'vitest';
import {
  compass16,
  formatAngularSize,
  formatAzimuth,
  formatDistance,
  formatDms,
  formatDuration,
  formatHms,
  formatTime,
  tzOffsetMinutes,
  zonedDateTime,
} from '@/ui/format';

describe('16방위', () => {
  it('경계값', () => {
    expect(compass16(0)).toBe('북');
    expect(compass16(11)).toBe('북');
    expect(compass16(11.3)).toBe('북북동');
    expect(compass16(90)).toBe('동');
    expect(compass16(132)).toBe('남동');
    expect(compass16(180)).toBe('남');
    expect(compass16(270)).toBe('서');
    expect(compass16(359)).toBe('북');
    expect(compass16(132, 'en')).toBe('SE');
    expect(formatAzimuth(132.4)).toBe('남동 132°');
  });
});

describe('시분초·도분초', () => {
  it('베가 J2000: RA 279.2346° = 18h 36m 56.3s, Dec +38.78369° = +38° 47′ 01″', () => {
    expect(formatHms(279.2346)).toBe('18h 36m 56.3s');
    expect(formatDms(38.78369)).toBe('+38° 47′ 01″');
  });
  it('음수·반올림', () => {
    expect(formatDms(-16.716)).toBe('−16° 42′ 58″');
    expect(formatDms(0.99999, 0)).toBe('+1° 00′ 00″');
    expect(formatHms(359.99999, 1)).toBe('00h 00m 00.0s');
  });
});

describe('시각·시간대', () => {
  it('KST 표기', () => {
    expect(formatTime(new Date('2026-09-06T12:00:00Z'))).toBe('21:00');
    expect(formatTime(null)).toBe('—');
    expect(tzOffsetMinutes(new Date('2026-09-06T12:00:00Z'))).toBe(540);
    expect(zonedDateTime('2026-09-06', 12).toISOString()).toBe('2026-09-06T03:00:00.000Z');
    expect(zonedDateTime('2026-09-07', 0).toISOString()).toBe('2026-09-06T15:00:00.000Z');
  });
  it('DST 시간대(뉴욕)', () => {
    expect(tzOffsetMinutes(new Date('2026-07-01T12:00:00Z'), 'America/New_York')).toBe(-240);
    expect(zonedDateTime('2026-01-15', 12, 'America/New_York').toISOString()).toBe(
      '2026-01-15T17:00:00.000Z',
    );
  });
});

describe('길이·거리·각크기', () => {
  it('formatDuration', () => {
    expect(formatDuration(130)).toBe('2시간 10분');
    expect(formatDuration(60)).toBe('1시간');
    expect(formatDuration(5, 'en')).toBe('5m');
  });
  it('formatDistance', () => {
    expect(formatDistance({ ly: 25 })).toBe('25 광년');
    expect(formatDistance({ ly: 2.5e6 })).toBe('2.5백만 광년');
    expect(formatDistance({ au: 9.5 })).toBe('9.50 AU');
    expect(formatDistance({ km: 384400 })).toBe('384,400 km');
  });
  it('formatAngularSize', () => {
    expect(formatAngularSize(177.83, 69.66)).toBe('3.0° × 70′');
    expect(formatAngularSize(0.5)).toBe('30″');
    expect(formatAngularSize(undefined)).toBe('—');
  });
});
