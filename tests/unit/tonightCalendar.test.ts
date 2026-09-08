import { describe, expect, it } from 'vitest';
import {
  calendarDate,
  eventsByDay,
  eventsToIcs,
  monthCells,
  shiftMonth,
} from '@/features/tonight/calendar';
import type { Phenomenon } from '@/astro/phenomena';
describe('현지 달력과 한 해 내보내기', () => {
  it('9월 말 밤은 9월, 현지 자정부터 10월이며 기기 UTC 날짜와 구분한다', () => {
    expect(calendarDate(new Date('2026-09-30T14:59:59Z'), 'Asia/Seoul')).toEqual({
      year: 2026,
      month: 9,
      day: 30,
    });
    expect(calendarDate(new Date('2026-09-30T15:00:00Z'), 'Asia/Seoul')).toEqual({
      year: 2026,
      month: 10,
      day: 1,
    });
    expect(calendarDate(new Date('2026-09-30T15:00:00Z'), 'America/New_York').month).toBe(9);
  });
  it('다음 달은 선택 상태와 무관하고 연말/연초·윤년도 처리한다', () => {
    expect(shiftMonth({ year: 2026, month: 9 }, 1)).toEqual({ year: 2026, month: 10 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthCells({ year: 2028, month: 2 }).filter(Boolean)).toHaveLength(29);
    expect(monthCells({ year: 2027, month: 2 }).filter(Boolean)).toHaveLength(28);
  });
  it('동일 날짜의 일정을 보존하고 다른 월은 혼입하지 않는다', () => {
    const events: Phenomenon[] = [
      { kind: 'moonQuarter', at: new Date('2026-09-30T15:01Z'), quarter: 0 },
      { kind: 'meteorPeak', at: new Date('2026-10-01T03:00Z') },
      { kind: 'moonQuarter', at: new Date('2026-09-30T14:00Z'), quarter: 3 },
    ];
    expect(eventsByDay(events, { year: 2026, month: 10 }, 'Asia/Seoul').get(1)).toHaveLength(2);
  });
  it('ICS는 안정적인 UID, UTC 순간, 한글 UTF-8 접기와 예약문자 이스케이프를 지킨다', () => {
    const events: Phenomenon[] = [
      { kind: 'moonQuarter', at: new Date('2026-10-01T03:00Z'), quarter: 0 },
    ];
    const text = '별과 달; ' + '아름다운 밤, '.repeat(20);
    const ics = eventsToIcs(
      events,
      () => text,
      () => '두 줄\n설명,테스트;',
      new Date('2026-09-08T00:00Z'),
    );
    expect(ics).toContain('DTSTART:20261001T030000Z');
    expect(ics).toContain('DTEND:20261001T030100Z');
    expect(ics).toContain('DESCRIPTION:두 줄\\n설명\\,테스트\\;');
    expect(ics.replace(/\r\n /g, '')).toContain(
      'SUMMARY:' + text.replace(/;/g, '\\;').replace(/,/g, '\\,'),
    );
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true,
    );
  });
});
