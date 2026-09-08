import { describe, expect, it } from 'vitest';
import { equipmentFovRings, telescopeRingName } from '@/astro/fovRings';
import type { GuideProfile } from '@/state/telescopeStore';

const profile: GuideProfile = {
  name: 'Saved 90mm telescope',
  apertureMm: 90,
  focalLengthMm: 500,
  eyepieceMm: 25,
  afovDeg: 52,
  mount: 'altaz',
  kind: 'refractor',
  diagonal: true,
  finderKind: 'raci',
  finderFov: 6,
  orientation: 'mirror',
  rotationDeg: 0,
  binocularMag: 10,
  binocularAperture: 50,
  binocularFov: 6.5,
  mode: 'telescope',
};

describe('equipment field-of-view rings', () => {
  it('returns only binocular and eyepiece telescope fields, without a third finder ring', () => {
    expect(equipmentFovRings(profile)).toEqual([
      { kind: 'binoculars', fovDeg: 6.5, example: false },
      { kind: 'telescope', fovDeg: 2.6, example: false },
    ]);
  });

  it('uses saved binocular field of view independently of magnification or finder specifications', () => {
    const rings = equipmentFovRings({
      ...profile,
      binocularMag: 8,
      binocularAperture: 42,
      binocularFov: 7.25,
      finderFov: 12,
      mode: 'binoculars',
    });
    expect(rings[0]).toEqual({ kind: 'binoculars', fovDeg: 7.25, example: false });
    expect(rings[1]!.fovDeg).toBeCloseTo(2.6, 12);
  });

  it('changes telescope field with focal length and eyepiece, never deriving it from aperture', () => {
    expect(equipmentFovRings({ ...profile, apertureMm: 102 })[1]!.fovDeg).toBeCloseTo(2.6, 12);
    const rings = equipmentFovRings({
      ...profile,
      apertureMm: 102,
      focalLengthMm: 663,
      eyepieceMm: 10,
      afovDeg: 68,
    });
    expect(rings[1]!.fovDeg).toBeCloseTo(68 / 66.3, 12);
  });

  it('keeps each starter example distinct from user-entered fields', () => {
    const rings = equipmentFovRings({ ...profile, binocularFovExample: true });
    expect(rings[0]!.example).toBe(true);
    expect(rings[1]!.example).toBe(false);
  });

  it('identifies the telescope by saved name and aperture without duplicating the aperture', () => {
    expect(telescopeRingName({ name: 'SVBONY SV48P', apertureMm: 102 })).toBe('SVBONY SV48P 102mm');
    expect(telescopeRingName({ name: 'SVBONY SV48P 102mm', apertureMm: 102 })).toBe(
      'SVBONY SV48P 102mm',
    );
  });
});
