import { getPalette, type Palette } from '@/app/theme';

/** 테마 팔레트. 야간은 적색이며, 사용자가 요청한 흰 별자리 선/경계는 SkyScene에서 별도로 지정한다. */
export type RenderPalette = Palette & { night: boolean };

export function readRenderPalette(): RenderPalette {
  const p = getPalette();
  const night = globalThis.document?.documentElement.dataset['theme'] === 'night';
  return { ...p, night };
}
