import { beforeEach, describe, expect, it } from 'vitest';
import type * as THREE from 'three';
import { getDb } from '@/db/database';
import { HorizonLayer } from '@/render/HorizonLayer';
import {
  DEFAULT_LAYERS,
  LAYERS_PERSIST_NAME,
  restoredLayers,
  showsBelowHorizon,
  useLayerStore,
  waitForLayerHydration,
} from '@/state/layerStore';

async function saveRows(state: Record<string, unknown>, version: number): Promise<void> {
  await getDb().settings.bulkPut(
    Object.entries({ ...state, __version: version }).map(([key, value]) => ({
      key: `${LAYERS_PERSIST_NAME}.${key}`,
      value,
      updatedAt: '2026-09-08T00:00:00.000Z',
    })),
  );
}

async function stored(key: string): Promise<unknown> {
  return (await getDb().settings.get(`${LAYERS_PERSIST_NAME}.${key}`))?.value;
}

describe('레이어 기본값과 이전 설정 복원', () => {
  it('새 설치는 불투명 지면·은하수33%·별 최대 채도로 시작한다', () => {
    const layers = restoredLayers(undefined, 2);
    expect(layers).toEqual(DEFAULT_LAYERS);
    expect(layers).toMatchObject({ groundOpacity: 1, milkyWayAlpha: 0.33, starSaturation: 1 });
    expect(showsBelowHorizon(layers)).toBe(false);
  });

  it.each([0, 1])('v%i의 이전 기본값만 바꾸고 나머지 설정을 보존한다', (version) => {
    const layers = restoredLayers(
      {
        ground: true,
        groundOpaque: false,
        showBelowHorizon: true,
        milkyWayAlpha: 0.6,
        starSaturation: 0.8,
        altAzGrid: true,
        labelLang: 'en',
      },
      version,
    );
    expect(layers).toMatchObject({
      groundOpacity: 1,
      milkyWayAlpha: 0.33,
      starSaturation: 1,
      altAzGrid: true,
      labelLang: 'en',
    });
  });

  it('이전에 직접 고른 은하수·채도는0을 포함해 보존한다', () => {
    for (const [milkyWayAlpha, starSaturation] of [
      [0, 0],
      [0.27, 0.45],
      [1, 1],
    ]) {
      const layers = restoredLayers({ milkyWayAlpha, starSaturation }, 1);
      expect(layers.milkyWayAlpha).toBe(milkyWayAlpha);
      expect(layers.starSaturation).toBe(starSaturation);
    }
  });

  it('v2에서 선택한0.6·0.8은 이전 기본값으로 오인해 다시 변경하지 않는다', () => {
    const saved = { groundOpacity: 0.5, milkyWayAlpha: 0.6, starSaturation: 0.8 };
    const layers = restoredLayers(saved, 2);
    expect(layers).toMatchObject(saved);
    expect(restoredLayers(layers, 2)).toEqual(layers);
  });

  it('이전 지면 끄기는 투명으로, 아래 천체 숨김은 불투명으로 옮긴다', () => {
    expect(restoredLayers({ ground: false }, 1).groundOpacity).toBe(0);
    expect(restoredLayers({ ground: false, showBelowHorizon: true }, 1).groundOpacity).toBe(0);
    for (const ground of [false, true]) {
      expect(restoredLayers({ ground, showBelowHorizon: false }, 1).groundOpacity).toBe(1);
    }
  });

  it.each([0, 0.5, 1])('새 지면 값%f는 충돌하는 폐기 옵션보다 우선한다', (groundOpacity) => {
    const layers = restoredLayers(
      { groundOpacity, ground: false, groundOpaque: false, showBelowHorizon: true, unknown: 9 },
      2,
    );
    expect(layers.groundOpacity).toBe(groundOpacity);
    expect(Object.keys(layers).sort()).toEqual(Object.keys(DEFAULT_LAYERS).sort());
    expect(showsBelowHorizon(layers)).toBe(groundOpacity < 1);
  });

  it('잘못된 저장값은 기본값으로 복구하고 지면 범위는0..1로 제한한다', () => {
    const layers = restoredLayers(
      { groundOpacity: NaN, milkyWayAlpha: '1', starSaturation: Infinity, atmosphere: null },
      2,
    );
    expect(layers).toEqual(DEFAULT_LAYERS);
    expect(restoredLayers({ groundOpacity: -0.5 }, 2).groundOpacity).toBe(0);
    expect(restoredLayers({ groundOpacity: 1.5 }, 2).groundOpacity).toBe(1);
  });
});

describe('레이어 설정 ↔ Dexie 재실행과 초기화', () => {
  beforeEach(async () => {
    await useLayerStore.persist.rehydrate();
    await waitForLayerHydration();
  });

  it('실제 v1 저장 행을 v2로 옮기며, 남은 이전 키가 재복원에 끼어들지 않는다', async () => {
    await saveRows(
      { ground: false, groundOpaque: true, showBelowHorizon: true, milkyWayAlpha: 0.6 },
      1,
    );
    await useLayerStore.persist.rehydrate();
    expect(useLayerStore.getState()).toMatchObject({ groundOpacity: 0, milkyWayAlpha: 0.33 });
    expect(await stored('__version')).toBe(2);
    expect(await stored('groundOpacity')).toBe(0);

    useLayerStore.getState().set('groundOpacity', 0.5);
    await expect.poll(() => stored('groundOpacity')).toBe(0.5);
    await useLayerStore.persist.rehydrate();
    expect(useLayerStore.getState().groundOpacity).toBe(0.5);
    expect(useLayerStore.getState()).not.toHaveProperty('ground');
    expect(useLayerStore.getState()).not.toHaveProperty('groundOpaque');
    expect(useLayerStore.getState()).not.toHaveProperty('showBelowHorizon');
    expect(typeof useLayerStore.getState().reset).toBe('function');
  });

  it.each([0, 0.5, 1])(
    '새 지면 값%f를 저장·복원해도 재질과 아래 천체 표시 정책이 일치한다',
    async (opacity) => {
      useLayerStore.getState().set('groundOpacity', opacity);
      await expect.poll(() => stored('groundOpacity')).toBe(opacity);
      await useLayerStore.persist.rehydrate();
      const layers = useLayerStore.getState();
      const horizon = new HorizonLayer();
      try {
        horizon.setStyle('#0b0d12', layers.groundOpacity, '#ffffff');
        expect((horizon.ground.material as THREE.MeshBasicMaterial).opacity).toBe(opacity);
        expect(showsBelowHorizon(layers)).toBe(opacity < 1);
      } finally {
        horizon.dispose();
      }
    },
  );

  it('초기화는 다시 불투명 지면을 적용해 아래 천체 표시·선택을 막고 새 기본값을 저장한다', async () => {
    useLayerStore.getState().set('groundOpacity', 0);
    useLayerStore.getState().set('milkyWayAlpha', 0.9);
    useLayerStore.getState().set('starSaturation', 0.2);
    useLayerStore.getState().toggle('altAzGrid');
    expect(showsBelowHorizon(useLayerStore.getState())).toBe(true);

    useLayerStore.getState().reset();
    expect(showsBelowHorizon(useLayerStore.getState())).toBe(false);
    await expect.poll(() => stored('groundOpacity')).toBe(1);
    await expect.poll(() => stored('milkyWayAlpha')).toBe(0.33);
    await expect.poll(() => stored('starSaturation')).toBe(1);
    await useLayerStore.persist.rehydrate();
    expect(restoredLayers(useLayerStore.getState(), 2)).toEqual(DEFAULT_LAYERS);
  });
});
