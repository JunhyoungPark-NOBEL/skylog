/**
 * "실제 하늘처럼" 한계등급(task-03 §3.9): f(Bortle, 달 조도·고도). 박명·낮 하늘은 렌더러가 태양 고도로 따로 뺀다
 * (`SkyBackground.skyBrightnessPenaltyMag`, `layers.atmosphere`) — 여기서 다시 빼면 이중 감산이므로 태양은 제외한다. 구름은 반영하지 않는다.
 * 결과는 `layerStore.limitingMag`으로 렌더러에 들어가 별·DSO·라벨이 그만큼 줄어든다.
 */
import { moonPenaltyMag, BORTLE_NELM } from '@/astro/visibility';
import type { Bortle } from '@/db/types';

export interface RealSkyInput {
  bortle: Bortle;
  /** 달 조도 0..1 */
  moonIllumination: number;
  /** 달 고도(도) */
  moonAltDeg: number;
}

/** 기본(끔) 한계등급 — 렌더러 기본값과 같다 */
export const DEFAULT_LIMITING_MAG = 6.5;

export function realSkyLimitingMag(input: RealSkyInput): number {
  const base = BORTLE_NELM[input.bortle];
  const moon = moonPenaltyMag({
    illumination: input.moonIllumination,
    altDeg: input.moonAltDeg,
    separationDeg: 90,
  });
  return Math.max(2, Math.round((base - moon) * 10) / 10);
}

export function clampBortle(n: number): Bortle {
  return Math.min(9, Math.max(1, Math.round(n))) as Bortle;
}
