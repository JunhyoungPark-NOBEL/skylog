import type { CSSProperties } from 'react';

/** 각 SVG가 자기 필터를 참조한다. 미리보기·마당·장식이 함께 있어도 ID가 겹치지 않는다. */
export function personalArtNightStyle(id: string): CSSProperties {
  return { '--personal-night-filter': `url("#${id}")` } as CSSProperties;
}
