import { expect, it } from 'vitest';
import { starColor } from '@/catalog/starColor';

it('분광형의 주계열 색을 알려 주고, 자료가 없는 별은 추정하지 않는다', () => {
  expect(starColor('B8Ia')).toBe('blueWhite');
  expect(starColor('A0V')).toBe('white');
  expect(starColor('G2V')).toBe('yellow');
  expect(starColor('K1.5III')).toBe('orange');
  expect(starColor('M2Iab')).toBe('red');
  expect(starColor(undefined)).toBe('unknown');
  expect(starColor('WR')).toBe('unknown');
});
