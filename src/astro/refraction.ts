/**
 * 대기 굴절.
 * - Bennett (1982): 겉보기 고도 h_a → 굴절량 R(′) = 1 / tan(h_a + 7.31/(h_a + 4.4)). 지평선에서 ≈ 34.5′.
 * - Sæmundsson (1986): 참 고도 h → 굴절량 R(′) = 1.02 / tan(h + 10.3/(h + 5.11)). 지평선에서 ≈ 29.0′.
 * 둘 다 1010 hPa, 10 °C 기준. 출처: Meeus, Astronomical Algorithms 2nd ed., ch.16 (16.3, 16.4).
 * 같은 Sæmundsson 식이 `src/render/shaders/refraction.glsl`에도 있다 — 값을 바꾸면 둘 다 바꾼다.
 */
import { DEG } from '@/astro/coords';

export interface Atmosphere {
  pressureHpa: number;
  temperatureC: number;
}

export const STANDARD_ATMOSPHERE: Atmosphere = { pressureHpa: 1010, temperatureC: 10 };

/** 기압·기온 보정 계수 (Meeus 16.3 뒤 설명) */
export function atmosphereFactor(atm: Atmosphere = STANDARD_ATMOSPHERE): number {
  return (atm.pressureHpa / 1010) * (283 / (273 + atm.temperatureC));
}

/** Bennett: 겉보기 고도(도) → 굴절량(도). 지평선 아래는 −1°에서 고정. */
export function bennettRefractionDeg(apparentAltDeg: number, atm?: Atmosphere): number {
  const h = Math.max(apparentAltDeg, -1);
  const arg = (h + 7.31 / (h + 4.4)) * DEG;
  const arcmin = 1 / Math.tan(arg);
  return (arcmin / 60) * atmosphereFactor(atm);
}

/** Sæmundsson: 참 고도(도) → 굴절량(도). 지평선 아래는 −1°에서 고정. */
export function saemundssonRefractionDeg(trueAltDeg: number, atm?: Atmosphere): number {
  const h = Math.max(trueAltDeg, -1);
  const arg = (h + 10.3 / (h + 5.11)) * DEG;
  const arcmin = 1.02 / Math.tan(arg);
  return (arcmin / 60) * atmosphereFactor(atm);
}

/** 참 고도 → 겉보기 고도 (렌더링·표시용) */
export function apparentAltitude(trueAltDeg: number, atm?: Atmosphere): number {
  return trueAltDeg + saemundssonRefractionDeg(trueAltDeg, atm);
}

/** 겉보기 고도 → 참 고도 (센서/화면에서 읽은 고도를 계산에 넣을 때) */
export function trueAltitude(apparentAltDeg: number, atm?: Atmosphere): number {
  return apparentAltDeg - bennettRefractionDeg(apparentAltDeg, atm);
}
