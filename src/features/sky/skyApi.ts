/**
 * 다른 기능(T3 검색·상세, T4 마커, T5 가이드)이 하늘 뷰를 조작하는 진입점.
 * SkyView가 마운트될 때 씬을 등록한다. 씬이 없으면 요청을 보관했다가 마운트 직후 실행한다.
 */
import { altAzToScene, sceneToAltAz } from '@/astro/coords';
import { eqjToAltAzSlow } from '@/astro/frames';
import { apparentAltitude } from '@/astro/refraction';
import type { ObjectId } from '@/catalog/objectId';
import type { SkyScene } from '@/render/SkyScene';
import { renderStats } from '@/render/stats';
import { useSensorStore } from '@/state/sensorStore';

let current: SkyScene | null = null;
let pending: (() => void) | null = null;

/** e2e 테스트가 쓰는 전역 훅(window.__skylog…). 사용자 UI에는 영향 없음. */
export function registerSkyScene(scene: SkyScene | null): void {
  current = scene;
  if (scene && pending) {
    const p = pending;
    pending = null;
    p();
  }
  if (typeof window !== 'undefined') {
    const w = window as unknown as Record<string, unknown>;
    w['__skylogScene'] = scene;
    w['__skylogStats'] = renderStats;
    w['__skylogAstro'] = { eqjToAltAzSlow, apparentAltitude, altAzToScene, sceneToAltAz };
    Object.defineProperty(w, '__skylogSensor', {
      configurable: true,
      get: () => useSensorStore.getState(),
    });
  }
}

export function getSkyScene(): SkyScene | null {
  return current;
}

/** 천체를 화면 중앙으로 (fovDeg 생략 시 현재 유지). "하늘에서 보기" 버튼이 쓴다. */
export function flyToObject(id: ObjectId, fovDeg?: number): void {
  const run = (scene: SkyScene) => {
    // 카탈로그 로드 전이면 준비될 때까지 기다린다(검색 탭에서 하늘 탭으로 막 넘어온 경우)
    void scene.ready.then(() => {
      if (current !== scene) return;
      scene.flyToObject(id, fovDeg);
      scene.select(id);
    });
  };
  if (current) {
    run(current);
    return;
  }
  pending = () => {
    if (current) run(current);
  };
}
