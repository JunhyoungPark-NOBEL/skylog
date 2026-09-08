import { it, expect } from 'vitest';
import { HOP_COURSES, hopCourseProgress } from '@/learn/hopCourses';
import type { SkillEvent } from '@/learn/engine';
import type { Observation } from '@/db/types';
const c = HOP_COURSES[0]!;
const event: SkillEvent = {
  type: 'starhop',
  at: '2026-09-08T12:00:00Z',
  meta: { courseId: c.id, objectId: c.target, confirmed: true },
};
const observation: Observation = {
  id: 'o1',
  schemaVersion: 1,
  objectId: c.target,
  observedAt: event.at,
  createdAt: '2026-09-08T12:05:00Z',
  updatedAt: event.at,
  outcome: 'seen',
  nightKey: '2026-09-08',
  site: { lat: 36, lon: 127 },
  notes: '',
  tags: [],
};
it('다른 코스·모의 관측·미확인 이벤트로 코스를 완료하지 않는다', () => {
  for (const meta of [
    { ...event.meta, courseId: 'different' },
    { ...event.meta, objectId: 'dso:M13' },
    { ...event.meta, simulated: true },
    { ...event.meta, confirmed: false },
  ])
    expect(
      hopCourseProgress(c, { skillEvents: [{ ...event, meta }], observations: [observation] })
        .count,
    ).toBe(0);
});
it('실제 완료 후 저장된 봤어요 기록만 두 번째 단계로 인정한다', () => {
  expect(hopCourseProgress(c, { skillEvents: [event], observations: [] }).count).toBe(1);
  for (const change of [
    { outcome: 'notSeen' as const },
    { deletedAt: event.at },
    { objectId: 'dso:M13' as const },
    { createdAt: '2026-09-07T12:00:00Z' },
  ])
    expect(
      hopCourseProgress(c, { skillEvents: [event], observations: [{ ...observation, ...change }] })
        .count,
    ).toBe(1);
  expect(hopCourseProgress(c, { skillEvents: [event], observations: [observation] }).count).toBe(2);
});
