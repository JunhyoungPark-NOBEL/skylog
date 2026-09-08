import { expect, it } from 'vitest';
import { hopFieldHint } from '@/features/telescope/hopCopy';
it('시야를 세지 않고 부분 너비·한 너비·여러 배 거리로 설명한다', () => {
  expect(hopFieldHint(0.2, 'ko')).toContain('20%');
  expect(hopFieldHint(1, 'ko')).toBe('보이는 원의 너비만큼 이동해요.');
  expect(hopFieldHint(2.3, 'ko')).toContain('2.3배');
  expect(hopFieldHint(0.2, 'en')).toContain('20%');
  expect(hopFieldHint(NaN, 'ko')).toBe('');
  expect(hopFieldHint(0, 'ko')).toBe('');
});
