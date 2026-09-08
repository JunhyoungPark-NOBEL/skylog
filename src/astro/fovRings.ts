import { eyepieceView } from '@/astro/optics';
import type { GuideProfile } from '@/state/telescopeStore';

export interface EquipmentFovRing {
  kind: 'binoculars' | 'telescope';
  fovDeg: number;
  example: boolean;
}

/** 저장된 장비의 실시야 두 개. 구경은 이름에만 쓰고 시야각은 접안렌즈 조합으로 계산한다. */
export function equipmentFovRings(profile: GuideProfile): readonly EquipmentFovRing[] {
  return [
    {
      kind: 'binoculars',
      fovDeg: profile.binocularFov,
      example: profile.binocularFovExample === true,
    },
    {
      kind: 'telescope',
      example: profile.telescopeFovExample === true,
      fovDeg: eyepieceView(
        { apertureMm: profile.apertureMm, focalLengthMm: profile.focalLengthMm },
        { focalLengthMm: profile.eyepieceMm, afovDeg: profile.afovDeg },
      ).trueFovDeg,
    },
  ];
}

/** 모델명에 구경이 이미 들어 있으면 중복하지 않는다. */
export function telescopeRingName(profile: Pick<GuideProfile, 'name' | 'apertureMm'>): string {
  const name = profile.name.trim();
  const aperture = `${profile.apertureMm}mm`;
  return name.replaceAll(' ', '').includes(aperture) ? name : `${name} ${aperture}`.trim();
}
