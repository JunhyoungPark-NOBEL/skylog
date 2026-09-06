import { describe, expect, it } from 'vitest';
import { applyTheme, getPalette } from '@/app/theme';
import { parseHash, toHash } from '@/app/router';

describe('theme', () => {
  it('applyTheme는 data-theme와 theme-color 메타를 바꾼다', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);

    applyTheme('night');
    expect(document.documentElement.dataset['theme']).toBe('night');
    expect(meta.content).toBe('#000000');

    applyTheme('dark');
    expect(document.documentElement.dataset['theme']).toBeUndefined();
    expect(meta.content).toBe('#05070d');
  });

  it('getPalette는 CSS 변수를 읽고 없으면 기본값을 쓴다', () => {
    const root = document.documentElement;
    root.style.setProperty('--star', '#ff3b30');
    root.style.setProperty('--constellation-bound', '#123456');
    const p = getPalette();
    expect(p.star).toBe('#ff3b30');
    expect(p.constellationBound).toBe('#123456');
    expect(p.bg).toBe('#05070d'); // 스타일시트 없음 → 기본값
    root.style.removeProperty('--star');
    root.style.removeProperty('--constellation-bound');
  });
});

describe('router', () => {
  it('해시를 라우트로 파싱하고 모르는 값은 sky로 폴백', () => {
    expect(parseHash('')).toBe('sky');
    expect(parseHash('#/search')).toBe('search');
    expect(parseHash('#/debug/data/')).toBe('debug/data');
    expect(parseHash('#/nope')).toBe('sky');
    expect(toHash('settings')).toBe('#/settings');
  });
});
