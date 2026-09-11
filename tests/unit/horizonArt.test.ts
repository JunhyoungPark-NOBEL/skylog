import { describe, expect, it, vi } from 'vitest';
import { DECORATIONS, DEFAULT_PERSONAL } from '@/personal/catalog';
import {
  decorationSvg,
  HORIZON_SLOTS,
  horizonAtlasSvg,
  horizonPanoramaSvg,
} from '@/personal/horizonArt';
import { HorizonLayer } from '@/render/HorizonLayer';

describe('공유 지평선 그림', () => {
  it('모든 장식은 고유한 자체 SVG이며 실행 코드나 외부 참조가 없다', () => {
    const drawings = DECORATIONS.map(({ id }) => decorationSvg(id));
    expect(drawings.every((drawing) => drawing.startsWith('<g'))).toBe(true);
    expect(new Set(drawings).size).toBe(DECORATIONS.length);
    for (const drawing of drawings) {
      expect(drawing).not.toMatch(
        /<script|<image|<foreignObject|onload=|href=|url\(|NaN|undefined/i,
      );
    }
  });

  it('아틀라스에는 지정한 다섯 방위만 한 번씩 놓이며 빈 자리는 그리지 않는다', () => {
    const svg = horizonAtlasSvg(DEFAULT_PERSONAL);
    expect(svg).toContain('width="4096"');
    expect(svg).toContain(`translate(${(180 / 360) * 5120} 218)`);
    expect(svg.match(/<ellipse cy="5"/g)).toHaveLength(1);
    expect(HORIZON_SLOTS.map((slot) => slot.azDeg)).toEqual([108, 144, 180, 216, 252]);
    expect(horizonAtlasSvg({ slots: [null, null, null, null, null] })).not.toContain(
      decorationSvg('bench'),
    );
  });

  it('프로필 그림은 같은 물품을 쓰고 ID 입력을 마크업으로 해석하지 않는다', () => {
    const svg = horizonPanoramaSvg(DEFAULT_PERSONAL, { idPrefix: '"><script>', night: true });
    expect(svg).toContain(decorationSvg('bench'));
    expect(svg).toContain('viewBox="0 0 1200 280"');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('feColorMatrix');
  });
});

describe('지평선 합성 수명', () => {
  it('지면 꼭짓점은 전부 고도 0도 이하이며 스타일을 바꿔도 새 메시를 만들지 않는다', () => {
    const layer = new HorizonLayer();
    const geometry = layer.ground.geometry;
    const position = geometry.getAttribute('position');
    for (let index = 0; index < position.count; index++)
      expect(position.getY(index)).toBeLessThan(1e-10);
    layer.setStyle('#112233', 0.5, '#ffffff');
    layer.setMeadow(true, false, -20);
    expect(layer.ground.geometry).toBe(geometry);
    expect(layer.ground.material).toHaveProperty('opacity', 0.5);
    layer.setMeadow(false, false, -20);
    expect(layer.meadowVisible).toBe(false);
    layer.dispose();
  });

  it('설정이 바뀌면 이전 읽기 이미지를 취소하고 해제 뒤에는 새 텍스처를 적용하지 않는다', () => {
    const images: HTMLImageElement[] = [];
    class FakeImage {
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        images.push(this as unknown as HTMLImageElement);
      }
    }
    vi.stubGlobal('Image', FakeImage);
    try {
      const layer = new HorizonLayer();
      const invalidate = vi.fn();
      layer.setPersonal(DEFAULT_PERSONAL, invalidate);
      const oldCompletion = images[0]!.onload;
      layer.setPersonal(
        { ...DEFAULT_PERSONAL, slots: ['telescope', null, null, null, null] },
        invalidate,
      );
      expect(images[0]!.src).toBe('');
      const material = layer.ground.material;
      const texture = Array.isArray(material) ? undefined : (material as { map?: unknown }).map;
      oldCompletion?.call(images[0]!, new Event('load'));
      expect(Array.isArray(material) ? undefined : (material as { map?: unknown }).map).toBe(
        texture,
      );
      const completion = images[1]!.onload;
      layer.dispose();
      completion?.call(images[1]!, new Event('load'));
      expect(images[1]!.src).toBe('');
      expect(Array.isArray(material) ? undefined : (material as { map?: unknown }).map).toBe(
        texture,
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('센서·밝기·숨김은 아틀라스를 재사용하고 풍경 선택 때만 새로 그린다', () => {
    let images = 0;
    class FakeImage {
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        images++;
      }
    }
    vi.stubGlobal('Image', FakeImage);
    try {
      const layer = new HorizonLayer();
      layer.setPersonal(DEFAULT_PERSONAL, () => undefined);
      layer.setPersonal({ ...DEFAULT_PERSONAL, sceneryEnabled: false }, () => undefined);
      for (let frame = 0; frame < 120; frame++) layer.setMeadow(true, frame > 60, -15);
      expect(images).toBe(1);
      layer.setPersonal({ ...DEFAULT_PERSONAL, ground: 'snow' }, () => undefined);
      expect(images).toBe(2);
      layer.setPersonal({ ...DEFAULT_PERSONAL, sceneryScale: 'medium' }, () => undefined);
      expect(images).toBe(3);
      layer.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
