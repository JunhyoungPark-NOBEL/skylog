export type StarColor =
  'blue' | 'blueWhite' | 'white' | 'yellowWhite' | 'yellow' | 'orange' | 'red' | 'unknown';
export const STAR_COLOR_CSS: Record<StarColor, string> = {
  blue: '#8eb4ff',
  blueWhite: '#c7dcff',
  white: '#ffffff',
  yellowWhite: '#fff3c5',
  yellow: '#ffe18c',
  orange: '#ffb16c',
  red: '#ff805c',
  unknown: '#9aa3b5',
};

/** 카탈로그의 분광형 대분류로 표현하는 대략적인 색. 복합형은 첫 주성 분류를 쓴다. */
export function starColor(spectralType?: string): StarColor {
  const spectral = spectralType?.trim().toUpperCase();
  const first = spectral?.replace(/^(?:SD|D)(?=[OBAFGKM])/, '').charAt(0);
  return (
    (
      {
        O: 'blue',
        B: 'blueWhite',
        A: 'white',
        F: 'yellowWhite',
        G: 'yellow',
        K: 'orange',
        M: 'red',
      } as Record<string, StarColor>
    )[first ?? ''] ?? 'unknown'
  );
}
