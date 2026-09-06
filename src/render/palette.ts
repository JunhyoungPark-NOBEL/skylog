import { getPalette, type Palette } from '@/app/theme';

/** 렌더러가 쓰는 색(테마 토큰에서 읽음). 야간 모드면 전부 적색 계열이 된다. */
export type RenderPalette = Palette & { night: boolean };

export function readRenderPalette(): RenderPalette {
  const p = getPalette();
  const night = globalThis.document?.documentElement.dataset['theme'] === 'night';
  return { ...p, night };
}
