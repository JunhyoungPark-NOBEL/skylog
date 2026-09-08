import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { curatedHop } from '@/astro/curatedHop';
import type { HopPoint } from '@/astro/starHop';
import { HOP_COURSES } from '@/learn/hopCourses';
const points: HopPoint[] = ['stars-bright', 'dso'].flatMap(
  (name) => JSON.parse(readFileSync(`public/data/${name}.v1.json`, 'utf8')) as HopPoint[],
);
it('대표 코스는 실제 카탈로그의 출발 별과 목적지를 보존한다', () => {
  for (const c of HOP_COURSES) {
    const selected = c.points.map((id) => points.find((p) => p.id === id)!);
    expect(selected.every(Boolean)).toBe(true);
    const route = curatedHop(selected, 6)!;
    expect(route.steps.at(-1)!.to.id).toBe(c.target);
    expect(route.steps.every((s) => s.distanceDeg > 0 && s.distanceDeg < 5)).toBe(true);
    expect(curatedHop(selected, 1)!.steps[0]!.fields).toBeCloseTo(route.steps[0]!.fields * 6);
  }
});
it('안드로메다 경로는 미라크→뮤→뉴→M31 순서이며 천구 북쪽으로 이동한다', () => {
  const c = HOP_COURSES.find((c) => c.target === 'dso:M31')!;
  const route = curatedHop(
    c.points.map((id) => points.find((p) => p.id === id)!),
    6,
  )!;
  expect(route.steps.map((s) => s.to.id)).toEqual(['star:HIP4436', 'star:HIP3881', 'dso:M31']);
  expect(route.steps[0]!.bearingDeg).toBeGreaterThan(270);
  expect(route.steps[0]!.distanceDeg).toBeGreaterThan(3);
});
it('빈 경로·잘못된 좌표와 시야를 거부한다', () => {
  expect(curatedHop([], 6)).toBeNull();
  expect(curatedHop(points.slice(0, 2), NaN)).toBeNull();
  expect(curatedHop([{ ...points[0]!, ra: NaN }, points[1]!], 6)).toBeNull();
});
