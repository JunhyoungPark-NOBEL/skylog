import { expect, it } from 'vitest';
import { crossCheck } from '@/content/crossCheck';
import type { ContentEntry } from '@/content/schema';
const entry = (id: ContentEntry['id'], facts: ContentEntry['facts']) =>
  ({ id, facts }) as ContentEntry;
it('거리·등급·각크기 불일치를 함께 찾고 허용 오차 안에서는 통과한다', () => {
  const stars = new Map();
  const dsos = new Map([
    ['dso:M31', { id: 'dso:M31', distLy: 2_500_000, mag: 3.4, majArcmin: 180 }],
  ]);
  expect(
    crossCheck(
      entry('dso:M31', [
        { label: '거리', value: '약 250만 광년' },
        { label: '등급', value: '3.5등급' },
        { label: '각크기', value: '177′ × 70′' },
      ]),
      stars,
      dsos,
    ).warnings,
  ).toEqual([]);
  expect(
    crossCheck(
      entry('dso:M31', [
        { label: '거리', value: '544광년' },
        { label: '등급', value: '5등급' },
        { label: '각크기', value: '50′' },
      ]),
      stars,
      dsos,
    ).warnings,
  ).toHaveLength(3);
});
it('분광형과 별 거리의 불일치를 잡으며 없는 값은 만들어내지 않는다', () => {
  const stars = new Map([['star:HIP24608', { id: 'star:HIP24608', distLy: 43, spect: 'G8III' }]]);
  expect(
    crossCheck(
      entry('star:HIP24608', [
        { label: '분광형', value: 'G0III' },
        { label: '거리', value: '90광년' },
      ]),
      stars,
      new Map(),
    ).warnings,
  ).toHaveLength(2);
  expect(
    crossCheck(entry('star:HIP24608', [{ label: '거리', value: '미확인' }]), stars, new Map())
      .warnings,
  ).toEqual([]);
});
