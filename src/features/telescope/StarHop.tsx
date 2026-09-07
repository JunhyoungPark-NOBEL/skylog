import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { starHop } from '@/astro/starHop';
import { altAzToScene } from '@/astro/coords';
import { eqjToAltAzSlow, type ObserverLike } from '@/astro/frames';
import { displayName, type Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import type { StarPack } from '@/catalog/starPackFormat';
import { emitSkill } from '@/learn/runtime';
import { useTelescopeStore } from '@/state/telescopeStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useSensorStore } from '@/state/sensorStore';
import { flyToObject } from '@/features/sky/skyApi';
import { compass16 } from '@/ui/format';
import { hopStars, guideTarget } from './skyData';
import { FinderChart } from './FinderChart';
import { EQUIPMENT_BUTTON } from './styles';
export function StarHop({
  cat,
  pack,
  targetId,
  date,
  observer,
}: {
  cat: Catalog;
  pack: StarPack;
  targetId: ObjectId;
  date: Date;
  observer: ObserverLike;
}) {
  const { t } = useTranslation();
  const simulator = useSensorStore((s) => s.simulator);
  const lang = useSettingsStore((s) => s.lang),
    p = useTelescopeStore((s) => s.profile);
  const fov = p.mode === 'binoculars' ? p.binocularFov : p.finderFov;
  const target = guideTarget(cat, targetId, date, observer);
  const ra = target?.raJ2000Deg,
    dec = target?.decJ2000Deg;
  const stars = useMemo(() => hopStars(pack), [pack]);
  const route = useMemo(
    () =>
      ra !== undefined && dec !== undefined
        ? starHop(
            { id: targetId, ra, dec },
            stars,
            fov,
            p.mode === 'binoculars' ? 9 : p.finderKind === 'rdf' ? 5.5 : 7.5,
          )
        : null,
    [targetId, ra, dec, stars, fov, p.mode, p.finderKind],
  );
  const [step, setStep] = useState(-1),
    [done, setDone] = useState(false),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  if (!target || !route)
    return (
      <div className="rounded-3xl bg-surface p-5">
        <h2 className="text-title">{t('guide.hop')}</h2>
        <p className="mt-3 leading-7 text-muted">{t('guide.noRoute')}</p>
      </div>
    );
  const dir = (s: { ra: number; dec: number }) => {
    const a = eqjToAltAzSlow(date, observer, s.ra, s.dec, 'normal');
    return altAzToScene(a.altDeg, a.azDeg);
  };
  const visible =
    target.altDeg > 0 && dir(route.start)[1] > 0 && route.steps.every((s) => dir(s.to)[1] > 0);
  const complete = async () => {
    if (busy || done || !visible) return;
    setBusy(true);
    try {
      if (!useSensorStore.getState().simulator)
        await emitSkill('starhop', {
          objectId: targetId,
          from: route.start.id,
          hops: route.steps.map((s) => s.to.id),
          fovDeg: fov,
          confirmed: true,
          at: date.toISOString(),
        });
      setDone(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4" data-testid="starhop">
      <h2 className="text-title">{t('guide.hop')}</h2>
      <p className="text-body-sm leading-6 text-muted">
        {t('guide.hopIntro', { fov: fov.toFixed(1) })}
      </p>
      {!visible && (
        <p role="status" className="rounded-xl bg-surface-2 p-3">
          {t('guide.hopBelow')}
        </p>
      )}
      <button
        className="min-h-12 w-full rounded-pill bg-surface-2 px-4 text-accent"
        onClick={() => {
          useTelescopeStore.getState().setRoute(route);
          flyToObject(route.start.id, Math.max(15, fov * 3));
          window.location.hash = '#/sky';
        }}
      >
        {t('guide.routeOnSky')}
      </button>
      <div className="rounded-3xl bg-surface p-5">
        <p className="text-caption text-accent">{t('guide.startStar')}</p>
        <h3 className="my-2 text-title">{displayName(cat, route.start.id, lang)}</h3>
        <button
          disabled={step >= 0 || !visible}
          className={EQUIPMENT_BUTTON + ' w-full'}
          onClick={() => setStep(0)}
        >
          {t(step >= 0 ? 'guide.checked' : 'guide.startConfirmed')}
        </button>
      </div>
      {route.steps.map((s, i) => (
        <section
          key={s.to.id}
          className={
            'rounded-3xl border p-5 ' +
            (step === i ? 'border-accent bg-accent-soft' : 'border-hairline bg-surface')
          }
          data-testid="hop-step"
        >
          <p className="text-caption text-accent">
            {i + 1} / {route.steps.length}
          </p>
          <h3 className="mt-2 text-title">
            {displayName(cat, s.from.id, lang)} → {displayName(cat, s.to.id, lang)}
          </h3>
          <p className="my-3 text-body-sm">
            {t('guide.hopDistance', {
              direction: compass16(s.bearingDeg, lang),
              deg: s.distanceDeg.toFixed(1),
              fields: s.fields.toFixed(1),
            })}
          </p>
          <FinderChart
            small
            pack={pack}
            cat={cat}
            center={dir(s.from)}
            previous={dir(s.from)}
            target={dir(s.to)}
            date={date}
            observer={observer}
            fovDeg={fov * 1.8}
            orientation={
              p.mode === 'binoculars' || p.finderKind !== 'optical' ? 'upright' : 'rotate180'
            }
            rotationDeg={p.rotationDeg}
          />
          <p className="my-2 text-caption text-muted">{t('guide.contextChart')}</p>
          <button
            className={EQUIPMENT_BUTTON + ' mt-3 w-full'}
            disabled={step !== i || !visible}
            onClick={() => setStep(i + 1)}
          >
            {t(step > i ? 'guide.checked' : 'guide.hopConfirmed')}
          </button>
        </section>
      ))}
      {step === route.steps.length && (
        <button
          className={EQUIPMENT_BUTTON + ' w-full'}
          disabled={busy || done || !visible}
          data-testid="hop-finish"
          onClick={() => void complete()}
        >
          {t(done ? (simulator ? 'guide.simulation' : 'guide.hopDone') : 'guide.hopFinish')}
        </button>
      )}
      {error && <p role="alert">{t('guide.error')}</p>}
    </div>
  );
}
