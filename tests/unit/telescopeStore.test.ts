import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GUIDE_PROFILE,
  migrateDefaultGuideProfile,
  useTelescopeStore,
  type GuideProfile,
} from '@/state/telescopeStore';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@/db/repos/settings', () => ({
  createDexieSettingsStorage: () => ({
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  }),
}));

const legacy: GuideProfile = {
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

beforeEach(() => {
  storage.clear();
  useTelescopeStore.setState({
    profile: DEFAULT_GUIDE_PROFILE,
    fovRings: false,
    fovBinoculars: true,
    fovTelescope: true,
  });
});

describe('equipment starter profile migration', () => {
  it('upgrades the untouched old example on hydration and retains the master ring setting', async () => {
    storage.set(
      'telescope',
      JSON.stringify({ state: { profile: legacy, fovRings: true }, version: 0 }),
    );
    await useTelescopeStore.persist.rehydrate();
    expect(useTelescopeStore.getState()).toMatchObject({
      profile: DEFAULT_GUIDE_PROFILE,
      fovRings: true,
      fovBinoculars: true,
      fovTelescope: true,
    });
    expect(DEFAULT_GUIDE_PROFILE).toMatchObject({
      apertureMm: 102,
      focalLengthMm: 663,
      binocularMag: 8,
      binocularAperture: 42,
      binocularFov: 7.5,
      binocularFovExample: true,
      telescopeFovExample: true,
    });
  });

  it.each([
    { eyepieceMm: 10 },
    { binocularFov: 7.2 },
    { name: 'My 90mm telescope' },
    { telescopeId: 'saved-scope' },
    { eyepieceId: 'saved-eye' },
    { binocularsId: 'saved-binoculars' },
  ])('preserves a customized or saved profile: %j', (changes) => {
    const saved = { ...legacy, ...changes };
    expect(migrateDefaultGuideProfile(saved)).toBe(saved);
  });
});

describe('individual equipment field-of-view preferences', () => {
  it('keeps each choice when hiding all rings and restores both persisted choices', async () => {
    const state = useTelescopeStore.getState();
    state.setRings(true);
    state.setFovRing('binoculars', false);
    state.setRings(false);
    state.setRings(true);
    expect(useTelescopeStore.getState()).toMatchObject({
      fovRings: true,
      fovBinoculars: false,
      fovTelescope: true,
    });
    state.setFovRing('telescope', false);
    const saved = storage.get('telescope')!;
    useTelescopeStore.setState({ fovBinoculars: true, fovTelescope: true });
    storage.set('telescope', saved);
    await useTelescopeStore.persist.rehydrate();
    expect(useTelescopeStore.getState()).toMatchObject({
      fovRings: true,
      fovBinoculars: false,
      fovTelescope: false,
    });
  });
});
