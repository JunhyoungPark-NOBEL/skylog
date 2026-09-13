import { useTranslation } from 'react-i18next';
import { displayName, type Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { StarPack } from '@/catalog/starPackFormat';
import type { AlignmentSample } from '@/astro/pointing';
import type { ObserverLocation } from '@/state/locationStore';
import type { GuideProfile, SavedAlignment } from '@/state/telescopeStore';
import { useSettingsStore } from '@/state/settingsStore';
import type { guideTarget } from './skyData';
import { FinderChart } from './FinderChart';

type Star = NonNullable<ReturnType<typeof guideTarget>>;
export function CalibrationPanel({
  cat,
  pack,
  date,
  site,
  profile,
  candidates,
  selected,
  samples,
  alignment,
  busy,
  error,
  ready,
  onSelect,
  onCapture,
  onDone,
  onReset,
  onStart,
}: {
  cat: Catalog;
  pack: StarPack;
  date: Date;
  site: ObserverLocation;
  profile: GuideProfile;
  candidates: Star[];
  selected: Star | null;
  samples: AlignmentSample[];
  alignment: SavedAlignment | null;
  busy: boolean;
  error: string | null;
  ready: boolean;
  onSelect(id: ObjectId): void;
  onCapture(): void;
  onDone(): void;
  onReset(): void;
  onStart(): void;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  return (
    <section className="mx-auto max-w-md space-y-4 p-4 pb-tab" data-testid="alignment-wizard">
      <div
        className="flex items-center justify-center gap-3"
        aria-label={t('calibration.progress', { n: alignment ? 3 : Math.min(samples.length, 2) })}
      >
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${n <= samples.length ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted'}`}
          >
            {n <= samples.length ? '✓' : n}
          </span>
        ))}
      </div>
      {alignment ? (
        <div className="space-y-3 rounded-3xl bg-surface p-5" data-testid="calibration-complete">
          <h2 className="text-title">{t('calibration.complete')}</h2>
          <p className="text-body-sm leading-6 text-muted">{t('calibration.reuse')}</p>
          <p className="text-accent tabular-nums" data-testid="alignment-residual">
            {t('guide.residual', { value: alignment.model.residualDeg.toFixed(2) })}
          </p>
          <p className="text-caption text-muted">{t('calibration.residualHelp')}</p>
          <button
            className="min-h-12 w-full rounded-pill bg-accent px-4 text-accent-fg"
            data-testid="alignment-done"
            onClick={onDone}
          >
            {t('calibration.navigate')}
          </button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-title">
              {t('calibration.step', { n: Math.min(samples.length + 1, 3) })}
            </h2>
            <p className="mt-2 text-body-sm leading-6 text-muted">{t('calibration.centerHelp')}</p>
          </div>
          <label className="block text-caption text-muted">
            {t('guide.alignmentStar')}
            <select
              className="mt-1 min-h-12 w-full rounded-2xl bg-surface px-3 text-body text-fg"
              data-testid="alignment-star"
              disabled={busy}
              value={selected?.id ?? ''}
              onChange={(e) => onSelect(e.target.value as ObjectId)}
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {displayName(cat, c.id, lang)} · {c.altDeg.toFixed(0)}°
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <div className="mx-auto max-w-[260px]" data-testid="calibration-finder">
              <FinderChart
                cat={cat}
                pack={pack}
                center={selected.direction}
                target={selected.direction}
                date={date}
                observer={site}
                fovDeg={profile.finderFov}
                orientation={profile.finderKind === 'optical' ? 'rotate180' : 'upright'}
                small
              />
              <p className="mt-1 text-center text-caption text-muted">
                {t('calibration.finder', { value: profile.finderFov })}
              </p>
            </div>
          )}
          {!candidates.length && (
            <p role="status" className="text-body-sm">
              {t('calibration.noStars')}
            </p>
          )}
          {ready ? (
            <button
              className="min-h-12 w-full rounded-pill bg-accent px-4 text-accent-fg disabled:opacity-50"
              data-testid="alignment-capture"
              disabled={!selected || busy}
              onClick={onCapture}
            >
              {t(busy ? 'calibration.hold' : 'calibration.capture')}
            </button>
          ) : (
            <button className="min-h-12 w-full rounded-pill bg-surface-2 px-4" onClick={onStart}>
              {t('calibration.connect')}
            </button>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-body-sm leading-6 text-danger">
          {error}
        </p>
      )}
      <details className="rounded-2xl bg-surface px-4">
        <summary className="min-h-11 py-3 text-body-sm">{t('calibration.setupDetails')}</summary>
        <p className="text-body-sm leading-6 text-muted">{t('calibration.installHelp')}</p>
        <p className="mt-3 text-caption text-muted">
          {t('calibration.fixedSite', { lat: site.lat.toFixed(4), lon: site.lon.toFixed(4) })}
        </p>
        <p className="mt-2 text-caption text-muted">{t('calibration.driftHelp')}</p>
        <button
          className="my-3 min-h-11 w-full rounded-pill bg-surface-2 px-3 text-body-sm"
          disabled={busy}
          onClick={onReset}
          data-testid="calibration-reset"
        >
          {t('calibration.restart')}
        </button>
      </details>
    </section>
  );
}
