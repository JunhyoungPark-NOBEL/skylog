import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { curatedHop } from '@/astro/curatedHop';
import type { HopCourse } from '@/learn/hopCourses';
import { hopFieldHint } from './hopCopy';
import { navigateLearn } from '@/features/learn/learnNavigation';
import { altAzToScene, angularSeparation, type Vec3 } from '@/astro/coords';
import { eqjToAltAzSlow, type ObserverLike } from '@/astro/frames';
import type { Catalog } from '@/catalog/catalog';
import { hopName as displayName } from './hopNames';
import type { ObjectId } from '@/catalog/objectId';
import type { StarPack } from '@/catalog/starPackFormat';
import { emitSkill } from '@/learn/runtime';
import { useTelescopeStore } from '@/state/telescopeStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useSensorStore } from '@/state/sensorStore';
import { flyToObject } from '@/features/sky/skyApi';
import { openObservationForm } from '@/state/logUiStore';
import { guideTarget } from './skyData';
import { FinderChart } from './FinderChart';
import { EQUIPMENT_BUTTON } from './styles';

/** 한 구간만 크게 보여 준다. 되돌아가도 확인한 구간은 보존하되 완료는 실제 관측 확인 후 기록한다. */
export function StarHop({
  cat,
  pack,
  targetId,
  date,
  observer,
  course,
}: {
  cat: Catalog;
  pack: StarPack;
  targetId: ObjectId;
  date: Date;
  observer: ObserverLike;
  course?: HopCourse;
}) {
  const { t } = useTranslation();
  const simulator = useSensorStore((s) => s.simulator);
  const lang = useSettingsStore((s) => s.lang),
    p = useTelescopeStore((s) => s.profile);
  const fov = p.mode === 'binoculars' ? p.binocularFov : p.finderFov;
  const target = guideTarget(cat, targetId, date, observer);
  const route = useMemo(() => {
    if (!course || course.target !== targetId) return null;
    const points = course.points.map((id) => cat.starById.get(id) ?? cat.dsoById.get(id));
    return points.every((p) => p !== undefined)
      ? curatedHop(
          points.map((p) => ({ id: p!.id, ra: p!.ra, dec: p!.dec })),
          fov,
        )
      : null;
  }, [course, targetId, cat, fov]);
  const storageKey = `skylog.hop.v2.${course?.id}.${course?.points.join('.')}.${fov}`;
  const [progress, setProgress] = useState(() => {
    try {
      const n = Number(sessionStorage.getItem(storageKey) ?? -1);
      return Number.isInteger(n) && n >= -1 && n <= (route?.steps.length ?? 0) ? n : -1;
    } catch {
      return -1;
    }
  });
  const [step, setStep] = useState(progress);
  const [overview, setOverview] = useState(false);
  const [done, setDone] = useState(false),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, String(progress));
    } catch {
      /* 저장 공간이 없어도 관측은 계속한다. */
    }
  }, [progress, storageKey]);
  if (!target || !route || !course) return <p>{t('guide.noRoute')}</p>;
  const dir = (s: { ra: number; dec: number }): Vec3 => {
    const a = eqjToAltAzSlow(date, observer, s.ra, s.dec, 'normal');
    return altAzToScene(a.altDeg, a.azDeg);
  };
  const visible =
    target.altDeg > 0 && dir(route.start)[1] > 0 && route.steps.every((s) => dir(s.to)[1] > 0);
  const activeStep = route.steps[Math.max(0, Math.min(route.steps.length - 1, step))]!;
  const start = step < 0,
    finish = step >= route.steps.length;
  const from = start ? route.start : activeStep.from,
    to = activeStep.to;
  const center = dir(from);
  const landmarks = (
    overview
      ? course.landmarks
      : [
          ...new Set([
            from.id,
            to.id,
            ...(course.target === 'dso:M13'
              ? ['star:HIP81693' as const]
              : course.target === 'dso:M57' && !start
                ? ['star:HIP93194' as const]
                : []),
          ]),
        ]
  ).flatMap((id) => {
    const s = cat.starById.get(id) ?? cat.dsoById.get(id);
    return s ? [{ direction: dir(s), label: displayName(cat, id, lang) }] : [];
  });
  // 출발별을 중심에 유지하고 도착별까지 한 화면에 담는다. 긴 구간에서도 목표를 잘라내지 않는다.
  const contextFov = Math.min(
    90,
    Math.max(
      fov * 1.5,
      ...landmarks.map((s) => angularSeparation(center, s.direction) * 2.5),
      activeStep.distanceDeg * 2.5,
    ),
  );
  const confirm = () => {
    const next = step + 1;
    setProgress(Math.max(progress, next));
    setStep(next);
    setOverview(false);
  };
  const complete = async () => {
    if (busy || done || !visible || progress < route.steps.length) return;
    setBusy(true);
    setError(false);
    try {
      if (!simulator)
        await emitSkill('starhop', {
          objectId: targetId,
          from: route.start.id,
          hops: route.steps.map((s) => s.to.id),
          fovDeg: fov,
          confirmed: true,
          courseId: course.id,
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
    <div className="mx-auto max-w-lg space-y-4 p-4" data-testid="starhop">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-accent">
          {t('hopJourney.progress', {
            n: Math.min(route.steps.length + 1, Math.max(1, step + 2)),
            total: route.steps.length + 1,
          })}
        </p>
        <button
          onClick={() => setOverview(!overview)}
          className="min-h-11 rounded-pill bg-surface-2 px-3 text-caption"
          aria-pressed={overview}
          data-testid="hop-overview"
        >
          {t(overview ? 'hopJourney.closeOverview' : 'hopJourney.overview')}
        </button>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {[route.start, ...route.steps].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= progress ? 'bg-accent' : 'bg-surface-3'}`}
          />
        ))}
      </div>
      {!visible && (
        <p role="status" className="rounded-xl bg-surface-2 p-3 text-body-sm">
          {t('guide.hopBelow')}
        </p>
      )}
      {finish ? (
        <section className="space-y-4 rounded-3xl bg-surface p-5" data-testid="hop-completion">
          <h2 className="text-title">{displayName(cat, targetId, lang)}</h2>
          <p className="text-body-sm leading-7 text-muted">{course.tip[lang]}</p>
          <button
            className={EQUIPMENT_BUTTON + ' w-full'}
            disabled={busy || done || !visible}
            data-testid="hop-finish"
            onClick={() => void complete()}
          >
            {t(done ? (simulator ? 'guide.simulation' : 'guide.hopDone') : 'guide.hopFinish')}
          </button>
          {done && (
            <button
              className={EQUIPMENT_BUTTON + ' w-full'}
              onClick={() => {
                navigateLearn('courses', {
                  theme: 'telescope',
                  group: 'starhop',
                  hopCourse: course.id,
                });
                openObservationForm({ objectId: targetId });
              }}
            >
              {t('hopCourses.write')}
            </button>
          )}
        </section>
      ) : (
        <section
          className="space-y-3 rounded-3xl border border-hairline bg-surface p-4"
          data-testid="hop-step"
        >
          <p className="text-caption text-muted">
            {t(start ? 'guide.startStar' : 'hopJourney.nextStar')}
          </p>
          <h2 className="text-title">{displayName(cat, start ? route.start.id : to.id, lang)}</h2>
          <p className="text-body-sm leading-7">
            {start ? course.recognize[lang] : course.steps[step]?.[lang]}
          </p>
          <FinderChart
            small
            pack={pack}
            cat={cat}
            center={center}
            previous={start ? undefined : center}
            target={start ? undefined : dir(to)}
            date={date}
            observer={observer}
            fovDeg={contextFov}
            fieldDeg={fov}
            landmarks={landmarks}
            orientation={
              p.mode === 'binoculars' || p.finderKind !== 'optical' ? 'upright' : 'rotate180'
            }
            rotationDeg={p.rotationDeg}
          />
          <p className="text-caption leading-6 text-muted">
            {t('hopJourney.chartHint', { fov: fov.toFixed(1) })}
          </p>
          {!start && (
            <p className="text-body-sm" data-testid="hop-distance-hint">
              {activeStep.distanceDeg.toFixed(1)}° · {hopFieldHint(activeStep.fields, lang)}
            </p>
          )}
          <button
            disabled={!visible}
            className={EQUIPMENT_BUTTON + ' w-full'}
            onClick={confirm}
            data-testid="hop-confirm"
          >
            {t(
              start
                ? 'guide.startConfirmed'
                : to.id === targetId
                  ? 'hopJourney.targetConfirmed'
                  : 'guide.hopConfirmed',
            )}
          </button>
        </section>
      )}
      <div className="flex gap-2">
        <button
          disabled={step < 0}
          onClick={() => {
            setStep(step - 1);
            setOverview(false);
          }}
          className="min-h-12 flex-1 rounded-pill bg-surface-2 px-4 disabled:opacity-40"
          data-testid="hop-back"
        >
          ← {t('hopJourney.previous')}
        </button>
        <button
          onClick={() => {
            useTelescopeStore.getState().setRoute(route);
            flyToObject(from.id, Math.max(20, contextFov));
            window.location.hash = '#/sky?coursePreview=' + course.id;
          }}
          className="min-h-12 flex-1 rounded-pill bg-surface-2 px-3 text-body-sm text-accent"
          data-testid="hop-on-sky"
        >
          {t('guide.routeOnSky')}
        </button>
      </div>
      {error && <p role="alert">{t('guide.error')}</p>}
      <details className="rounded-2xl border border-hairline px-4 py-2 text-body-sm">
        <summary className="min-h-11 cursor-pointer py-2">{t('hopJourney.lost')}</summary>
        <p className="leading-7 text-muted">{t('hopJourney.lostHelp')}</p>
        <button
          className="min-h-11 text-accent"
          onClick={() => {
            setStep(-1);
            setOverview(true);
          }}
        >
          {t('hopJourney.restartView')}
        </button>
        <label className="flex min-h-12 items-center justify-between gap-3">
          {t('hopJourney.orientation')}
          <select
            className="min-h-11 rounded-xl bg-surface-2 px-3"
            value={p.finderKind}
            onChange={(e) =>
              useTelescopeStore
                .getState()
                .setProfile({ ...p, finderKind: e.target.value as 'raci' | 'optical' | 'rdf' })
            }
          >
            <option value="raci">{t('hopJourney.upright')}</option>
            <option value="optical">{t('hopJourney.inverted')}</option>
            <option value="rdf">{t('hopJourney.redDot')}</option>
          </select>
        </label>
      </details>
      <button
        className="min-h-12 w-full text-accent"
        onClick={() =>
          navigateLearn('courses', { theme: 'telescope', group: 'starhop', hopCourse: course.id })
        }
      >
        {t('hopCourses.back')}
      </button>
    </div>
  );
}
