/**
 * 테마 적용 + 렌더러용 팔레트 읽기 (마스터 플랜 §4.2).
 * 색은 theme.css의 CSS 변수가 단일 원천이며, JS는 getComputedStyle로 읽기만 한다.
 */

export type Theme = 'dark' | 'night';

export const PALETTE_KEYS = [
  'bg',
  'fg',
  'muted',
  'accent',
  'danger',
  'overlay',
  'star',
  'planet',
  'moon',
  'constellation',
  'constellationBound',
  'grid',
  'horizon',
  'milkyWay',
  'label',
  'marker',
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type Palette = Record<PaletteKey, string>;

/** CSS 변수 이름: camelCase → kebab-case */
function cssVarName(key: PaletteKey): string {
  return `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** 스타일시트가 없을 때(테스트·SSR)의 기본값. theme.css의 :root와 동일하게 유지한다.
 *  PALETTE_KEYS의 토큰은 반드시 리터럴 색이어야 한다(color-mix/var 값은 getComputedStyle이 풀어 주지 않아 Three.js Color가 못 읽는다). */
const FALLBACK: Palette = {
  bg: '#05070d',
  fg: '#e8ecf5',
  muted: '#8f98ad',
  accent: '#5aa9ff',
  danger: '#ff5c5c',
  overlay: 'rgba(5, 7, 13, 0.6)',
  star: '#ffffff',
  planet: '#ffd98a',
  moon: '#e8e8e8',
  constellation: '#4f7fbf',
  constellationBound: '#2d3d5c',
  grid: '#2a3550',
  horizon: '#7a5a2a',
  milkyWay: '#6f7fb0',
  label: '#c8d0e0',
  marker: '#ffb020',
};

/**
 * 현재 테마의 팔레트를 읽는다. 렌더러는 테마가 바뀔 때마다 다시 호출해 머티리얼 색을 갱신한다.
 * (필터 hack 금지 — 토큰 교체로만 야간 모드를 구현한다.)
 */
export function getPalette(
  root: HTMLElement | null = globalThis.document?.documentElement ?? null,
): Palette {
  if (!root || typeof getComputedStyle !== 'function') return { ...FALLBACK };
  const style = getComputedStyle(root);
  const out = { ...FALLBACK };
  for (const key of PALETTE_KEYS) {
    const v = style.getPropertyValue(cssVarName(key)).trim();
    if (v) out[key] = v;
  }
  return out;
}

const THEME_COLOR: Record<Theme, string> = { dark: '#05070d', night: '#000000' };

/** `<html data-theme>`와 `<meta name="theme-color">`를 갱신한다. */
export function applyTheme(theme: Theme, doc: Document | null = globalThis.document ?? null): void {
  if (!doc) return;
  if (theme === 'dark') delete doc.documentElement.dataset['theme'];
  else doc.documentElement.dataset['theme'] = theme;
  const meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[theme];
}
