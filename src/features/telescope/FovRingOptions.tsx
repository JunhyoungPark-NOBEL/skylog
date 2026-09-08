import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { equipmentFovRings, telescopeRingName } from '@/astro/fovRings';
import { useTelescopeStore } from '@/state/telescopeStore';
import { Toggle } from '@/ui/Toggle';

/** 전체 표시 설정은 유지하면서 저장된 쌍안경·망원경 시야를 각각 선택한다. */
export function FovRingOptions() {
  const { t } = useTranslation();
  const profile = useTelescopeStore((s) => s.profile);
  const enabled = useTelescopeStore((s) => s.fovRings);
  const binoculars = useTelescopeStore((s) => s.fovBinoculars);
  const telescope = useTelescopeStore((s) => s.fovTelescope);
  return (
    <div data-testid="fov-ring-options">
      <Toggle
        id="layer-fovRings"
        label={t('guide.fovRings')}
        checked={enabled}
        onChange={(on) => useTelescopeStore.getState().setRings(on)}
      />
      {enabled && (
        <div className="ml-4 border-l-2 border-accent/30" data-testid="fov-ring-choices">
          {equipmentFovRings(profile).map(({ kind, fovDeg, example }) => (
            <Toggle
              key={kind}
              id={`fov-ring-${kind}`}
              label={
                kind === 'binoculars'
                  ? t('guide.fovBinoculars', {
                      magnification: profile.binocularMag,
                      aperture: profile.binocularAperture,
                    })
                  : telescopeRingName(profile)
              }
              hint={[
                kind === 'binoculars'
                  ? `${fovDeg.toFixed(2)}°`
                  : t('guide.fovRingHint', {
                      fov: Number.isFinite(fovDeg) && fovDeg > 0 ? fovDeg.toFixed(2) : '—',
                      equipment: t('guide.fovEyepiece', { focalLength: profile.eyepieceMm }),
                    }),
                ...(example ? [t('guide.fovExample')] : []),
              ].join(' · ')}
              checked={kind === 'binoculars' ? binoculars : telescope}
              onChange={(on) => useTelescopeStore.getState().setFovRing(kind, on)}
            />
          ))}
          <button
            type="button"
            onClick={() => navigate('equipment')}
            className="mb-2 min-h-11 px-4 text-caption text-accent"
            data-testid="fov-edit-equipment"
          >
            {t('guide.fovSettings')}
          </button>
        </div>
      )}
    </div>
  );
}
