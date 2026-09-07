/**
 * "이 장비로 보이나" 판정(task-03 §3.2·§4). **근사**이며 UI에 "참고"로 표기한다.
 * - 점광원(별·행성·작은 천체): 한계등급 − 대상 등급 = 여유(margin). 맨눈 한계 = Bortle NELM − 달 − 소광(`visibility.ts`),
 *   쌍안경·망원경 한계 = 2 + 5·log10(D) − (Bortle 4 대비 하늘 밝기 손실) − 달 − 소광.
 * - 확산 천체(성운·은하·성단): 표면 밝기 SB = mag + 2.5·log10(타원 면적 arcmin²) [mag/arcmin²] → +8.89로 mag/arcsec² 환산,
 *   하늘 배경 SB(Bortle 표)와의 대비로 판정. 광학계는 표면 밝기를 높이지 못하지만 배율·암순응·주변시로 검출이 쉬워지므로
 *   쌍안경 +1.0, 망원경 +2.0등급 보너스(경험값). 달빛은 하늘 배경을 밝게 한다(달 페널티를 배경에서 뺌).
 * 출처: Bortle(2001) 표, Clark "Visual Astronomy of the Deep Sky"(1990)의 대비 개념을 단순화.
 */
import type { Bortle } from '@/db/types';
import {
  BORTLE_NELM,
  extinctionPenaltyMag,
  moonPenaltyMag,
  telescopeLimitMag,
  type MoonCondition,
} from '@/astro/visibility';

export type EquipmentKind = 'naked' | 'binoculars' | 'telescope';
export type Verdict = 'easy' | 'possible' | 'hard' | 'no';

export interface EquipmentProfile {
  binoculars: { magnification: number; apertureMm: number; fovDeg: number };
  telescope: { apertureMm: number; focalLengthMm: number };
}

/** T5 전 기본 장비: 쌍안경 10×50, 망원경 90mm f/5.5(SVBONY SV48P 검토 중) */
export const DEFAULT_EQUIPMENT: EquipmentProfile = {
  binoculars: { magnification: 10, apertureMm: 50, fovDeg: 6.5 },
  telescope: { apertureMm: 90, focalLengthMm: 500 },
};

/** Bortle → 하늘 배경 표면 밝기(mag/arcsec², 천정, 대표값) */
export const BORTLE_SKY_SB: Record<Bortle, number> = {
  1: 22.0,
  2: 21.8,
  3: 21.5,
  4: 21.0,
  5: 20.5,
  6: 19.5,
  7: 19.0,
  8: 18.5,
  9: 18.0,
};

export interface TargetPhotometry {
  mag?: number;
  /** 장축·단축(′) — 확산 천체 */
  majArcmin?: number;
  minArcmin?: number;
  /** 확산 천체 여부(성운·은하·성단). 행성·별은 false */
  extended: boolean;
  kind: 'star' | 'dso' | 'planet' | 'moon' | 'sun' | 'const';
  /** DSO 분류(은하·구상성단은 중심부가 밝아 카탈로그 크기보다 작게 보인다 → 표면 밝기 보정) */
  category?: string;
}

export interface SkyCondition {
  bortle: Bortle;
  altDeg: number;
  moon?: MoonCondition;
}

/** 표면 밝기(mag/arcmin²): mag + 2.5·log10(π/4·a·b) */
export function surfaceBrightnessArcmin2(
  mag: number,
  majArcmin: number,
  minArcmin?: number,
): number {
  const area = (Math.PI / 4) * majArcmin * (minArcmin && minArcmin > 0 ? minArcmin : majArcmin);
  return mag + 2.5 * Math.log10(Math.max(area, 0.01));
}

export const ARCMIN2_TO_ARCSEC2 = 2.5 * Math.log10(3600); // 8.89

export function pointLimitMag(
  kind: EquipmentKind,
  cond: SkyCondition,
  eq = DEFAULT_EQUIPMENT,
): number {
  const moon = moonPenaltyMag(cond.moon);
  const ext = extinctionPenaltyMag(cond.altDeg);
  if (kind === 'naked') return BORTLE_NELM[cond.bortle] - moon - ext;
  const aperture = kind === 'binoculars' ? eq.binoculars.apertureMm : eq.telescope.apertureMm;
  const skyLoss = Math.max(0, BORTLE_NELM[4] - BORTLE_NELM[cond.bortle]) * 0.5;
  return telescopeLimitMag(aperture) - skyLoss - moon - ext;
}

function verdictFromMargin(margin: number): Verdict {
  if (margin >= 1.5) return 'easy';
  if (margin >= 0) return 'possible';
  if (margin >= -1) return 'hard';
  return 'no';
}

const EXTENDED_BONUS: Record<EquipmentKind, number> = { naked: 0, binoculars: 1.0, telescope: 2.0 };
/** 은하·구상성단: 카탈로그 장축(D25 등광도)은 실제 보이는 밝은 중심부보다 훨씬 크므로 면적 1/4(= +1.5등급) 보정 */
const CORE_BONUS_MAG: Record<string, number> = { galaxy: 1.5, globularCluster: 1.5 };

export interface VerdictDetail {
  verdict: Verdict;
  /** 여유(등급). 양수면 한계 안 */
  marginMag: number;
  limitMag: number;
  /** 확산 천체의 표면 밝기(mag/arcsec²), 있으면 */
  surfaceBrightness?: number;
}

/** 장비별 판정 */
export function equipmentVerdict(
  kind: EquipmentKind,
  target: TargetPhotometry,
  cond: SkyCondition,
  eq = DEFAULT_EQUIPMENT,
): VerdictDetail {
  const limit = pointLimitMag(kind, cond, eq);
  if (cond.altDeg <= 0) return { verdict: 'no', marginMag: -99, limitMag: limit };
  if (target.kind === 'sun' || target.kind === 'moon')
    return { verdict: 'easy', marginMag: 99, limitMag: limit };
  if (target.mag === undefined) return { verdict: 'possible', marginMag: 0, limitMag: limit };

  // 크고 밝은 산개성단(플레이아데스·프레세페·히아데스 등)은 별들의 집합이라 표면 밝기 모델이 오판한다 →
  // 가장 밝은 구성원의 대략값(적분 등급 + 1.5)을 점광원처럼 판정한다(M45 잘 보임 / M44 어려움 / Bortle 4에서 M44 잘 보임)
  if (target.category === 'openCluster' && (target.majArcmin ?? 0) >= 30) {
    const margin = limit - (target.mag + 1.5);
    return { verdict: verdictFromMargin(margin), marginMag: margin, limitMag: limit };
  }
  if (target.extended && target.majArcmin && target.majArcmin > 0.5) {
    const sbArcmin = surfaceBrightnessArcmin2(target.mag, target.majArcmin, target.minArcmin);
    const sb = sbArcmin + ARCMIN2_TO_ARCSEC2 - (CORE_BONUS_MAG[target.category ?? ''] ?? 0);
    const sky = BORTLE_SKY_SB[cond.bortle] - moonPenaltyMag(cond.moon) * 0.7;
    // 대비: 하늘보다 얼마나 밝은가(양수면 밝음). 소광은 대상 표면 밝기를 어둡게
    const contrast = sky - sb - extinctionPenaltyMag(cond.altDeg) + EXTENDED_BONUS[kind];
    // 총 등급도 한계 안이어야 한다(작은 확산 천체는 점광원처럼 보임)
    const pointMargin = limit - target.mag;
    const margin = Math.min(contrast + 1.0, pointMargin);
    return {
      verdict: verdictFromMargin(margin),
      marginMag: margin,
      limitMag: limit,
      surfaceBrightness: sb,
    };
  }
  const margin = limit - target.mag;
  return { verdict: verdictFromMargin(margin), marginMag: margin, limitMag: limit };
}

export function allVerdicts(
  target: TargetPhotometry,
  cond: SkyCondition,
  eq = DEFAULT_EQUIPMENT,
): Record<EquipmentKind, VerdictDetail> {
  return {
    naked: equipmentVerdict('naked', target, cond, eq),
    binoculars: equipmentVerdict('binoculars', target, cond, eq),
    telescope: equipmentVerdict('telescope', target, cond, eq),
  };
}
