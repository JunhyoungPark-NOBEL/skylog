import type { Phenomenon } from '@/astro/phenomena';

export interface CalendarMonth {
  year: number;
  month: number;
}
export function calendarDate(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (key: string) => Number(parts.find((p) => p.type === key)!.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}
export function shiftMonth(value: CalendarMonth, offset: number): CalendarMonth {
  const d = new Date(Date.UTC(value.year, value.month - 1 + offset, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
export function monthCells({ year, month }: CalendarMonth): (number | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) =>
    i < first || i >= first + days ? null : i - first + 1,
  );
}
export function eventsByDay(
  events: Phenomenon[],
  month: CalendarMonth,
  tz: string,
): Map<number, Phenomenon[]> {
  const result = new Map<number, Phenomenon[]>();
  for (const event of events) {
    const date = calendarDate(event.at, tz);
    if (date.year !== month.year || date.month !== month.month) continue;
    const group = result.get(date.day) ?? [];
    group.push(event);
    result.set(date.day, group);
  }
  return result;
}
const escapeIcs = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
// RFC 5545: 한글을 자르지 않고 UTF-8 75바이트 이내로 접는다.
function foldIcs(line: string): string {
  const encoder = new TextEncoder();
  let out = '',
    chunk = '',
    bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      out += chunk + '\r\n';
      chunk = ' ';
      bytes = 1;
    }
    chunk += char;
    bytes += size;
  }
  return out + chunk;
}
export function eventsToIcs(
  events: Phenomenon[],
  title: (p: Phenomenon) => string,
  description: (p: Phenomenon) => string,
  created: Date,
): string {
  const utc = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Skylog//Astronomy Calendar//KO',
    'CALSCALE:GREGORIAN',
  ];
  for (const event of events)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.kind}-${event.bodyKey ?? event.meteor?.id ?? event.quarter ?? ''}-${event.at.getTime()}@skylog`,
      `DTSTAMP:${utc(created)}`,
      `DTSTART:${utc(event.at)}`,
      `DTEND:${utc(new Date(event.at.getTime() + 60_000))}`,
      `SUMMARY:${escapeIcs(title(event))}`,
      `DESCRIPTION:${escapeIcs(description(event))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  lines.push('END:VCALENDAR');
  return lines.map(foldIcs).join('\r\n') + '\r\n';
}
