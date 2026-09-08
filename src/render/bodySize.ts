import { DEG, RAD } from '@/astro/coords';

export const BODY_DISTANCE = 98;
export const MIN_LUMINARY_DIAMETER_CSS = 24;
/** body.frag의 정규화된 태양 원반 반지름 = 전체 스프라이트 지름에 대한 원반 지름 비율. */
export const SUN_DISC_FRACTION = 0.35;

export interface BodyDiscSize {
  diameterCss: number;
  angularRadiusRad: number;
  meshRadius: number;
}

/** 시선에서 벗어난 각원도 같은 입체 투영으로 계산한다. 뒤 반구의 크기는 경계값으로 제한한다. */
export function projectedBodyDiameter(
  angularRadiusRad: number,
  degreesPerPixel: number,
  cosViewAngle = 1,
): number {
  const scale = (2 * RAD) / Math.max(degreesPerPixel, 1e-6);
  const facing = Math.max(0, Math.min(1, cosViewAngle));
  return (2 * scale * Math.sin(angularRadiusRad)) / (facing + Math.cos(angularRadiusRad));
}

/** 태양·달 본체에 최소 CSS 지름을 보장하되 확대하면 실제 각지름(선택 시×3)을 사용한다. */
export function luminaryDiscSize(
  angularDiameterArcsec: number,
  degreesPerPixel: number,
  magnify: boolean,
  cosViewAngle = 1,
): BodyDiscSize {
  const scale = (2 * RAD) / Math.max(degreesPerPixel, 1e-6);
  const facing = Math.max(0, Math.min(1, cosViewAngle));
  const k = MIN_LUMINARY_DIAMETER_CSS / (2 * scale);
  const phi = Math.atan(k);
  // k = sin(radius) / (cos(viewAngle) + cos(radius))를 radius에 대해 푼다.
  const minimumRadius = phi + Math.asin(facing * Math.sin(phi));
  const physicalRadius = (Math.max(0, angularDiameterArcsec) / 7200) * DEG * (magnify ? 3 : 1);
  // 아직 뷰포트 크기가 없는 초기 프레임에서도 구가 카메라를 삼키지 않게 한다.
  const angularRadiusRad = Math.min(89 * DEG, Math.max(minimumRadius, physicalRadius));
  return {
    diameterCss: projectedBodyDiameter(angularRadiusRad, degreesPerPixel, facing),
    angularRadiusRad,
    // 카메라에서 거리 D인 구의 각반지름은 asin(r / D). 위상용 구 메시도 같은 크기다.
    meshRadius: BODY_DISTANCE * Math.sin(angularRadiusRad),
  };
}
