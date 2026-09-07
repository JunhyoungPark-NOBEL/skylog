import { describe, expect, it } from 'vitest';
import type { Vec3 } from '@/astro/coords';
import type { ObjectId } from '@/catalog/objectId';
import {
  MARKER_OFFSET_PX,
  MARKER_PICK_MAG,
  MARKER_PICK_RADIUS_PX,
  MARKER_SIZE_PX,
  MarkerLayer,
  markerKindFor,
  markerVisible,
  type MarkerSets,
  type MarkerTarget,
  type MarkerUpdateContext,
} from '@/render/MarkerLayer';

const VEGA = 'star:HIP91262' as ObjectId;
const FAINT = 'star:HIP12345' as ObjectId;
const M31 = 'dso:M31' as ObjectId;
const MARS = 'planet:mars' as ObjectId;
const ORI = 'const:Ori' as ObjectId;
const UNKNOWN = 'star:HIP99999' as ObjectId;

/** 테스트용 해석기: 씬 방향 = J2000 벡터(항등 변환)로 두고 위치를 직접 정한다 */
const TARGETS = new Map<ObjectId, MarkerTarget>([
  [VEGA, { kind: 'star', bodyKey: null, j2000: [0.5, 0.5, 0.5], mag: 0.03 }],
  [FAINT, { kind: 'star', bodyKey: null, j2000: [-0.5, 0.2, 0.5], mag: 5.5 }],
  [M31, { kind: 'dso', bodyKey: null, j2000: [0.2, 0.8, 0.5], mag: 3.4 }],
  [MARS, { kind: 'planet', bodyKey: 'mars', j2000: null }],
  [ORI, { kind: 'const', bodyKey: null, j2000: [0.1, -0.3, 0.5] }],
]);
const resolve = (id: ObjectId) => TARGETS.get(id) ?? null;

function sets(partial: Partial<Record<keyof MarkerSets, ObjectId[]>>): MarkerSets {
  return {
    observed: new Set(partial.observed ?? []),
    attempted: new Set(partial.attempted ?? []),
    bookmarked: new Set(partial.bookmarked ?? []),
  };
}

/** 화면 400×400: x = 200 + 200·dir.x, y = 200 − 200·dir.y. dir.z < 0이면 카메라 뒤 */
function proj(dir: Vec3): { x: number; y: number } | null {
  if (dir[2] < 0) return null;
  return { x: 200 + dir[0] * 200, y: 200 - dir[1] * 200 };
}

function ctx(over: Partial<MarkerUpdateContext> = {}): MarkerUpdateContext {
  return {
    proj,
    j2000ToSceneDir: (v) => v,
    placements: [{ key: 'mars', dir: [0, 0.25, 0.5], sizePx: 40 }],
    fovDeg: 60,
    pixelRatio: 2,
    width: 400,
    height: 400,
    ground: true,
    ...over,
  };
}

function visible(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[data-testid="sky-marker"]')].filter(
    (e) => !e.hidden,
  );
}

function setup(s: MarkerSets) {
  const container = document.createElement('div');
  const layer = new MarkerLayer(container);
  layer.setResolver(resolve);
  layer.setSets(s);
  return { container, layer };
}

describe('markerKindFor', () => {
  it('우선순위: 본 것 > 시도 > 예정, 없으면 null', () => {
    const s = sets({ observed: [VEGA], attempted: [VEGA, M31], bookmarked: [VEGA, M31, MARS] });
    expect(markerKindFor(s, VEGA)).toBe('observed');
    expect(markerKindFor(s, M31)).toBe('attempted');
    expect(markerKindFor(s, MARS)).toBe('bookmarked');
    expect(markerKindFor(s, FAINT)).toBeNull();
  });
});

describe('markerVisible', () => {
  it('FOV ≤ 90°면 모두, > 90°면 mag ≤ 4만(행성·달·태양·별자리는 항상)', () => {
    expect(markerVisible(90, 9, 'star')).toBe(true);
    expect(markerVisible(60, undefined, 'dso')).toBe(true);
    expect(markerVisible(100, 4, 'star')).toBe(true);
    expect(markerVisible(100, 4.1, 'star')).toBe(false);
    expect(markerVisible(100, undefined, 'dso')).toBe(false);
    expect(markerVisible(100, 8, 'planet')).toBe(true);
    expect(markerVisible(100, undefined, 'moon')).toBe(true);
    expect(markerVisible(100, undefined, 'sun')).toBe(true);
    expect(markerVisible(100, undefined, 'const')).toBe(true);
  });
});

describe('MarkerLayer(DOM 풀)', () => {
  it('종류별 클래스·글리프·data 속성과 대상 왼쪽 위 위치', () => {
    const { container, layer } = setup(
      sets({ observed: [VEGA], attempted: [FAINT], bookmarked: [M31] }),
    );
    expect(layer.size).toBe(3);
    layer.update(ctx());
    const els = visible(container);
    expect(els).toHaveLength(3);
    const byId = new Map(els.map((e) => [e.dataset['objectId'], e]));

    const vega = byId.get(VEGA)!;
    expect(vega.dataset['kind']).toBe('observed');
    expect(vega.className).toBe('sky-marker sky-marker-observed');
    expect(vega.textContent).toBe('★');
    expect(vega.style.pointerEvents).toBe('none');
    // proj([0.5,0.5,0.5]) = (300, 100) → 글리프 박스는 (300−16, 100−16)
    expect(vega.dataset['x']).toBe('300.0');
    expect(vega.dataset['y']).toBe('100.0');
    expect(vega.style.transform).toBe(
      `translate3d(${(300 + MARKER_OFFSET_PX).toFixed(1)}px, ${(100 + MARKER_OFFSET_PX).toFixed(1)}px, 0)`,
    );

    const faint = byId.get(FAINT)!;
    expect(faint.className).toBe('sky-marker sky-marker-attempted');
    expect(faint.textContent).toBe('★');

    const m31 = byId.get(M31)!;
    expect(m31.className).toBe('sky-marker sky-marker-bookmarked');
    expect(m31.textContent).toBe('☆');
  });

  it('행성은 placements의 방향을 쓰고 원반 반지름(CSS px)만큼 더 바깥에 놓는다', () => {
    const { container, layer } = setup(sets({ observed: [MARS] }));
    layer.update(ctx({ placements: [{ key: 'mars', dir: [0, 0.25, 0.5], sizePx: 40 }] }));
    const [el] = visible(container);
    expect(el).toBeDefined();
    // proj([0,0.25,0.5]) = (200, 150); r = 40/2/2 = 10 → dx = dy = −22
    expect(el!.dataset['x']).toBe('200.0');
    expect(el!.dataset['y']).toBe('150.0');
    expect(el!.style.transform).toBe('translate3d(178.0px, 128.0px, 0)');
    // 배치가 없으면(지평선 아래·낮 등) 그리지 않는다
    layer.update(ctx({ placements: [] }));
    expect(visible(container)).toHaveLength(0);
  });

  it('넓은 시야(> 90°)에서는 어두운 별을 숨기고 밝은 별·DSO·행성·별자리만 남긴다', () => {
    const { container, layer } = setup(
      sets({ observed: [VEGA, FAINT, M31, MARS], bookmarked: [ORI] }),
    );
    layer.update(ctx({ fovDeg: 100, ground: false }));
    const ids = visible(container)
      .map((e) => e.dataset['objectId'])
      .sort();
    expect(ids).toEqual([ORI, M31, MARS, VEGA].sort());
    layer.update(ctx({ fovDeg: 90, ground: false }));
    expect(visible(container)).toHaveLength(5);
  });

  it('지평선(땅) 레이어가 켜져 있으면 지평선 아래 마커는 숨긴다', () => {
    const { container, layer } = setup(sets({ bookmarked: [ORI] }));
    layer.update(ctx({ ground: true }));
    expect(visible(container)).toHaveLength(0);
    layer.update(ctx({ ground: false }));
    expect(visible(container)).toHaveLength(1);
  });

  it('카메라 뒤·화면 밖 대상은 그리지 않는다', () => {
    const { container, layer } = setup(sets({ observed: [VEGA] }));
    layer.update(ctx({ proj: () => null }));
    expect(visible(container)).toHaveLength(0);
    layer.update(ctx({ proj: () => ({ x: 450, y: 100 }) }));
    expect(visible(container)).toHaveLength(0);
    layer.update(ctx({ proj: () => ({ x: 410, y: -10 }) }));
    expect(visible(container)).toHaveLength(1);
  });

  it('집합이 바뀌면 풀을 재사용하고 남는 엘리먼트는 숨긴다', () => {
    const { container, layer } = setup(sets({ observed: [VEGA, M31, FAINT] }));
    layer.update(ctx());
    expect(visible(container)).toHaveLength(3);
    const total = container.querySelectorAll('[data-testid="sky-marker"]').length;

    layer.setSets(sets({ bookmarked: [VEGA] }));
    layer.update(ctx());
    const els = visible(container);
    expect(els).toHaveLength(1);
    expect(els[0]!.dataset['objectId']).toBe(VEGA);
    expect(els[0]!.dataset['kind']).toBe('bookmarked');
    expect(els[0]!.textContent).toBe('☆');
    expect(container.querySelectorAll('[data-testid="sky-marker"]').length).toBe(total);
  });

  it('candidates(): 직전 프레임의 글리프 중심을 hit-test 후보로 준다, clear() 뒤에는 없음', () => {
    const { container, layer } = setup(sets({ observed: [VEGA] }));
    expect(layer.candidates()).toEqual([]);
    layer.update(ctx());
    const [c] = layer.candidates();
    expect(c).toBeDefined();
    expect(c!.id).toBe(VEGA);
    expect(c!.x).toBeCloseTo(300 + MARKER_OFFSET_PX + MARKER_SIZE_PX / 2, 6);
    expect(c!.y).toBeCloseTo(100 + MARKER_OFFSET_PX + MARKER_SIZE_PX / 2, 6);
    expect(c!.mag).toBe(MARKER_PICK_MAG);
    expect(c!.radiusPx).toBe(MARKER_PICK_RADIUS_PX);

    layer.clear();
    expect(layer.candidates()).toEqual([]);
    expect(visible(container)).toHaveLength(0);
  });

  it('해석기(카탈로그)가 없으면 집합만 보관했다가 rebuild/setResolver에서 만든다', () => {
    const container = document.createElement('div');
    const layer = new MarkerLayer(container);
    layer.setSets(sets({ observed: [VEGA, UNKNOWN] }));
    expect(layer.size).toBe(0);
    layer.update(ctx());
    expect(visible(container)).toHaveLength(0);

    layer.setResolver(resolve);
    expect(layer.size).toBe(1); // UNKNOWN은 해석되지 않아 건너뛴다
    layer.update(ctx());
    expect(visible(container)).toHaveLength(1);
  });

  it('dispose()는 엘리먼트를 모두 제거한다', () => {
    const { container, layer } = setup(sets({ observed: [VEGA, M31] }));
    layer.update(ctx());
    expect(container.childElementCount).toBe(2);
    layer.dispose();
    expect(container.childElementCount).toBe(0);
    expect(layer.size).toBe(0);
    expect(layer.candidates()).toEqual([]);
  });
});
