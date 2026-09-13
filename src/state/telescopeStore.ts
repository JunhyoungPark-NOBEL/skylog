import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createDexieSettingsStorage } from '@/db/repos/settings';
import type { ImageOrientation } from '@/astro/finder';
import type { AlignmentSample, PointingAlignment } from '@/astro/pointing';
import type { ObjectId } from '@/catalog/objectId';
import type { HopRoute } from '@/astro/starHop';
import type { EquipmentProfile } from '@/astro/equipment';
import type { ObserverLocation } from './locationStore';
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
  /** 시작용 시야각·접안 조합인지 표시한다. 기존 사용자가 저장한 값은 예시로 바꾸지 않는다. */
  binocularFovExample?: boolean;
  telescopeFovExample?: boolean;
  mode: 'telescope' | 'binoculars';
  telescopeId?: string;
  eyepieceId?: string;
  binocularsId?: string;
}
const LEGACY_GUIDE_PROFILE: GuideProfile = {
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
export const DEFAULT_GUIDE_PROFILE: GuideProfile = {
  ...LEGACY_GUIDE_PROFILE,
  name: 'SVBONY SV48P 102mm',
  apertureMm: 102,
  focalLengthMm: 663,
  binocularMag: 8,
  binocularAperture: 42,
  binocularFov: 7.5,
  binocularFovExample: true,
  telescopeFovExample: true,
};

/** 저장 ID나 수정된 사양이 있는 장비는 보존하고, 손대지 않은 이전 시작 예시만 갱신한다. */
export function migrateDefaultGuideProfile(profile: GuideProfile): GuideProfile {
  if (
    profile.telescopeId ||
    profile.eyepieceId ||
    profile.binocularsId ||
    Object.entries(LEGACY_GUIDE_PROFILE).some(
      ([key, value]) => profile[key as keyof GuideProfile] !== value,
    )
  )
    return profile;
  return { ...profile, ...DEFAULT_GUIDE_PROFILE };
}
export interface SavedAlignment {
  /** 첫 별을 맞춘 관측 장소. 이전 한·두 별 정렬에는 없다. */
  site?: ObserverLocation;
  method?: 'three-star-v1';
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
  fovBinoculars: boolean;
  fovTelescope: boolean;
  targetId: ObjectId | null;
  route: HopRoute | null;
  savedAlignment: SavedAlignment | null;
  setProfile(profile: GuideProfile): void;
  setRings(on: boolean): void;
  setFovRing(kind: 'binoculars' | 'telescope', on: boolean): void;
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
      fovBinoculars: true,
      fovTelescope: true,
      targetId: null,
      route: null,
      savedAlignment: null,
      setProfile: (profile) => set({ profile }),
      setRings: (fovRings) => set({ fovRings }),
      setFovRing: (kind, on) =>
        set(kind === 'binoculars' ? { fovBinoculars: on } : { fovTelescope: on }),
      setTarget: (targetId) => set({ targetId }),
      setRoute: (route) => set({ route }),
      saveAlignment: (savedAlignment) => set({ savedAlignment }),
    }),
    {
      name: 'telescope',
      version: 1,
      storage: createJSONStorage(() => createDexieSettingsStorage('telescope')),
      migrate: (persisted) => {
        const previous = persisted as Partial<TelescopeState>;
        return {
          ...previous,
          profile: migrateDefaultGuideProfile(previous.profile ?? DEFAULT_GUIDE_PROFILE),
        };
      },
      partialize: (s) => ({
        profile: s.profile,
        fovRings: s.fovRings,
        fovBinoculars: s.fovBinoculars,
        fovTelescope: s.fovTelescope,
        savedAlignment: s.savedAlignment,
      }),
    },
  ),
);
