/**
 * 광학 계산(망원경·접안렌즈·쌍안경). 모든 길이는 mm, 각도는 도.
 * - 배율 = 망원경 초점거리 / 접안렌즈 초점거리
 * - 실시야(TFOV) ≈ 겉보기시야(AFOV) / 배율 (근사; 정확히는 field stop 기반)
 * - 사출동공 = 구경 / 배율
 * 출처: 일반 광학(Sidgwick, Amateur Astronomer's Handbook).
 */

export interface TelescopeSpec {
  apertureMm: number;
  focalLengthMm: number;
}
export interface EyepieceSpec {
  focalLengthMm: number;
  afovDeg: number;
}
export interface BinocularsSpec {
  magnification: number;
  apertureMm: number;
  /** 실시야(도). 제조사 표기(예: 7.5°). 미터/1000m 표기면 `fovFromFieldWidth`로 변환 */
  fovDeg: number;
}

export function magnification(telescope: TelescopeSpec, eyepiece: EyepieceSpec): number {
  return telescope.focalLengthMm / eyepiece.focalLengthMm;
}

export function trueFovDeg(afovDeg: number, mag: number): number {
  return afovDeg / mag;
}

export function exitPupilMm(apertureMm: number, mag: number): number {
  return apertureMm / mag;
}

export function focalRatio(telescope: TelescopeSpec): number {
  return telescope.focalLengthMm / telescope.apertureMm;
}

/** 쌍안경 "1000m에서 x m" 표기 → 도 */
export function fovFromFieldWidth(metersAt1000m: number): number {
  return 2 * Math.atan(metersAt1000m / 2000) * (180 / Math.PI);
}

export interface EyepieceView {
  magnification: number;
  trueFovDeg: number;
  exitPupilMm: number;
}

export function eyepieceView(telescope: TelescopeSpec, eyepiece: EyepieceSpec): EyepieceView {
  const mag = magnification(telescope, eyepiece);
  return {
    magnification: mag,
    trueFovDeg: trueFovDeg(eyepiece.afovDeg, mag),
    exitPupilMm: exitPupilMm(telescope.apertureMm, mag),
  };
}

export function binocularsView(b: BinocularsSpec): EyepieceView & { twilightFactor: number } {
  return {
    magnification: b.magnification,
    trueFovDeg: b.fovDeg,
    exitPupilMm: exitPupilMm(b.apertureMm, b.magnification),
    twilightFactor: Math.sqrt(b.magnification * b.apertureMm),
  };
}

/** 최저 유용 배율(사출동공 7mm 기준)과 최고 유용 배율(구경 mm × 2) */
export function usefulMagnificationRange(apertureMm: number): { min: number; max: number } {
  return { min: apertureMm / 7, max: apertureMm * 2 };
}
