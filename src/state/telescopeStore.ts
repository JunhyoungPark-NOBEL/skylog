import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createDexieSettingsStorage } from '@/db/repos/settings';
import type { ImageOrientation } from '@/astro/finder';
import type { AlignmentSample, PointingAlignment } from '@/astro/pointing';
import type { ObjectId } from '@/catalog/objectId';
import type { HopRoute } from '@/astro/starHop';
import type { EquipmentProfile } from '@/astro/equipment';
export function equipmentProfile(p: GuideProfile): EquipmentProfile {
  return {
    telescope: { apertureMm: p.apertureMm, focalLengthMm: p.focalLengthMm },
    binoculars: {
      magnification: p.binocularMag,
      apertureMm: p.binocularAperture,
      fovDeg: p.binocularFov,
    },
  };
}
export interface GuideProfile {
  name: string;
  apertureMm: number;
  focalLengthMm: number;
  eyepieceMm: number;
  afovDeg: number;
  mount: 'altaz' | 'eq' | 'goto';
  kind: 'refractor' | 'reflector' | 'compound';
  diagonal: boolean;
  finderKind: 'rdf' | 'optical' | 'raci';
  finderFov: number;
  orientation: ImageOrientation;
  rotationDeg: number;
  binocularMag: number;
  binocularAperture: number;
  binocularFov: number;
  mode: 'telescope' | 'binoculars';
  telescopeId?: string;
  eyepieceId?: string;
  binocularsId?: string;
}
export const DEFAULT_GUIDE_PROFILE: GuideProfile = {
  name: 'SVBONY SV48P',
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
export interface SavedAlignment {
  model: PointingAlignment;
  samples: AlignmentSample[];
  at: string;
  profileKey: string;
  provider: string;
  sessionId: string;
}
interface TelescopeState {
  profile: GuideProfile;
  fovRings: boolean;
  targetId: ObjectId | null;
  route: HopRoute | null;
  savedAlignment: SavedAlignment | null;
  setProfile(profile: GuideProfile): void;
  setRings(on: boolean): void;
  setTarget(id: ObjectId): void;
  setRoute(route: HopRoute | null): void;
  saveAlignment(value: SavedAlignment | null): void;
}
export const profileKey = (p: GuideProfile) =>
  JSON.stringify([
    p.mode,
    p.telescopeId,
    p.binocularsId,
    p.name,
    p.kind,
    p.apertureMm,
    p.focalLengthMm,
    p.mount,
  ]);
export const useTelescopeStore = create<TelescopeState>()(
  persist(
    (set) => ({
      profile: DEFAULT_GUIDE_PROFILE,
      fovRings: false,
      targetId: null,
      route: null,
      savedAlignment: null,
      setProfile: (profile) => set({ profile }),
      setRings: (fovRings) => set({ fovRings }),
      setTarget: (targetId) => set({ targetId }),
      setRoute: (route) => set({ route }),
      saveAlignment: (savedAlignment) => set({ savedAlignment }),
    }),
    {
      name: 'telescope',
      storage: createJSONStorage(() => createDexieSettingsStorage('telescope')),
      partialize: (s) => ({
        profile: s.profile,
        fovRings: s.fovRings,
        savedAlignment: s.savedAlignment,
      }),
    },
  ),
);
