/**
 * 가시성·한계등급·분해능.
 * 출처:
 * - Bortle 등급별 맨눈 한계등급(NELM): Bortle, J. E., "Introducing the Bortle Dark-Sky Scale", Sky & Telescope, Feb 2001 (대표값).
 * - 망원경 한계등급 ≈ 2 + 5·log10(D mm): 보수적 경험식(Sidgwick식 7.5 + 5 log10(D cm)와 동일). 시상·경험에 따라 ±1등급.
 * - Dawes 한계 116″/D(mm), Rayleigh 한계 138″/D(mm).
 */
import type { Bortle } from '@/db/types';

/** Bortle → 맨눈 한계등급(천정 부근, 완전 암순응) */
export const BORTLE_NELM: Record<Bortle, number> = {
  1: 7.6,
  2: 7.1,
  3: 6.6,
  4: 6.2,
  5: 5.6,
  6: 5.1,
  7: 4.6,
  8: 4.1,
  9: 3.6,
};

export interface MoonCondition {
  /** 0..1 조도 비율 */
  illumination: number;
  /** 달 고도(도). 지평선 아래면 영향 없음 */
  altDeg: number;
  /** 대상과 달의 각거리(도). 미상이면 90 가정 */
  separationDeg?: number;
}

/**
 * 달빛에 의한 한계등급 감소(등급). 경험적 근사: 보름달·천정·근접 시 최대 ≈ 3등급, 반달 ≈ 1.5등급.
 * (정밀 모델은 Krisciunas & Schaefer 1991; T3에서 필요하면 교체)
 */
export function moonPenaltyMag(moon: MoonCondition | undefined): number {
  if (!moon || moon.altDeg <= 0 || moon.illumination <= 0) return 0;
  const altFactor = Math.min(1, Math.max(0, moon.altDeg / 30)); // 30° 이상이면 완전 영향
  const sep = Math.min(90, Math.max(0, moon.separationDeg ?? 90));
  const sepFactor = 1 - (sep / 90) * 0.5; // 90° 떨어지면 절반
  return 3 * Math.pow(moon.illumination, 1.5) * altFactor * sepFactor;
}

/** 대기 소광에 의한 한계등급 감소(등급). 천정 0, 고도 10° ≈ 1등급, 5° ≈ 1.6등급 (근사, k≈0.25 mag/airmass) */
export function extinctionPenaltyMag(altDeg: number, k = 0.25): number {
  if (altDeg <= 0) return 10;
  const z = (90 - altDeg) * (Math.PI / 180);
  const airmass = 1 / (Math.cos(z) + 0.50572 * Math.pow(96.07995 - (90 - altDeg), -1.6364)); // Kasten & Young 1989
  return k * Math.max(0, airmass - 1);
}

/** 맨눈 한계등급(대상 고도·달 조건 반영) */
export function nakedEyeLimitMag(bortle: Bortle, altDeg = 90, moon?: MoonCondition): number {
  return BORTLE_NELM[bortle] - moonPenaltyMag(moon) - extinctionPenaltyMag(altDeg);
}

/** 망원경·쌍안경 한계등급(보수적): 2 + 5·log10(구경 mm) */
export function telescopeLimitMag(apertureMm: number): number {
  return 2 + 5 * Math.log10(apertureMm);
}

/** 도스 한계(″) */
export function dawesLimitArcsec(apertureMm: number): number {
  return 116 / apertureMm;
}

/** 레일리 한계(″) */
export function rayleighLimitArcsec(apertureMm: number): number {
  return 138 / apertureMm;
}

/** 대상 등급이 한계등급 안이면 보임. 확산 천체는 표면 밝기 때문에 여유(margin) 필요. */
export function isVisible(objectMag: number | undefined, limitMag: number, marginMag = 0): boolean {
  if (objectMag === undefined) return false;
  return objectMag <= limitMag - marginMag;
}
