import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bodyState } from '@/astro/bodies';
import { altAzToScene, angularSeparation, sceneToAltAz, wrap360 } from '@/astro/coords';
import {
  alignOne,
  alignTwo,
  pointingDirection,
  pointingDelta,
  equatorialDelta,
  sunUnsafe,
  type AlignmentSample,
} from '@/astro/pointing';
import { displayName, loadCatalog, type Catalog } from '@/catalog/catalog';
import { isObjectId, type ObjectId } from '@/catalog/objectId';
import { loadStarPack } from '@/catalog/starPack';
import type { StarPack } from '@/catalog/starPackFormat';
import { hashQuery } from '@/app/router';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { useLocationStore } from '@/state/locationStore';
import { useClockStore } from '@/state/clockStore';
import { useSensorStore } from '@/state/sensorStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useTelescopeStore, profileKey, type SavedAlignment } from '@/state/telescopeStore';
import {
  useTelescopeOrientation,
  startTelescopeOrientation,
  stopTelescopeOrientation,
} from '@/sensors/telescopeOrientation';
import { requestWakeLock, releaseWakeLock } from '@/sensors/wakeLock';
import { feedbackOk } from '@/sensors/feedback';
import { emitSkill } from '@/learn/runtime';
import { HOP_COURSES } from '@/learn/hopCourses';
import { flyToObject } from '@/features/sky/skyApi';
import { Equipment } from './Equipment';
import { FinderChart } from './FinderChart';
import { StarHop } from './StarHop';
import { DirectionPanel } from './DirectionPanel';
import { guideTarget } from './skyData';
import { closeTelescope } from './navigation';
import { EQUIPMENT_BUTTON as BTN, EQUIPMENT_INPUT as INPUT } from './styles';

type View = 'guide' | 'align' | 'finder' | 'eyepiece' | 'hop' | 'equipment';
const captureDate = (simulation: boolean) =>
  simulation ? useClockStore.getState().now() : new Date();
const freshReading = () => {
  const reading = useTelescopeOrientation.getState();
  return reading.status === 'active' && Date.now() - reading.at < 1000 ? reading : null;
};
export default function TelescopeMode() {
  const { t } = useTranslation(),
    lang = useSettingsStore((s) => s.lang),
    theme = useSettingsStore((s) => s.theme);
  const site = useLocationStore((s) => s.site),
    p = useTelescopeStore((s) => s.profile),
    simulator = useSensorStore((s) => s.simulator);
  const sensor = useTelescopeOrientation();
  const [targetId, setTargetId] = useState<ObjectId | null>(() => {
    const id = hashQuery().get('target');
    return id && isObjectId(id) ? id : useTelescopeStore.getState().targetId;
  });
  const [cat, setCat] = useState<Catalog | null>(null),
    [pack, setPack] = useState<StarPack | null>(null),
    [loadError, setLoadError] = useState(false),
    [retry, setRetry] = useState(0);
  const [view, setView] = useState<View>(() => {
    const v = hashQuery().get('view');
    return v === 'hop' || v === 'align' || v === 'finder' ? v : 'guide';
  });
  const [choosing, setChoosing] = useState(!targetId),
    [query, setQuery] = useState('');
  const [alignment, setAlignment] = useState<SavedAlignment | null>(null),
    [samples, setSamples] = useState<AlignmentSample[]>([]);
  const [alignId, setAlignId] = useState<ObjectId | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [checked, setChecked] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false),
    [preview, setPreview] = useState(false),
    [pan, setPan] = useState({ alt: 0, az: 0 });
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const date = useMemo(
    () => (simulator ? useClockStore.getState().now() : new Date(tick)),
    [tick, simulator],
  );
  useEffect(() => {
    let alive = true;
    void Promise.all([loadCatalog(), loadStarPack('stars-deep')])
      .then(([c, s]) => {
        if (alive) {
          setCat(c);
          setPack(s);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  useEffect(() => {
    void requestWakeLock();
    // 물리 +Y를 사용하므로 화면 잠금이 실패해도 축은 바뀌지 않는다.
    const so = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    void so?.lock?.(so.type).catch(() => {});
    return () => {
      stopTelescopeOrientation();
      if (!useSettingsStore.getState().keepAwake) void releaseWakeLock();
      so?.unlock?.();
    };
  }, []);
  const target = cat && targetId ? guideTarget(cat, targetId, date, site) : null;
  const usable =
    alignment?.sessionId === sensor.sessionId &&
    alignment?.profileKey === profileKey(p) &&
    alignment?.provider === sensor.source
      ? alignment
      : null;
  const pointing = sensor.q ? pointingDirection(sensor.q, usable?.model) : null;
  const delta = usable && pointing && target ? pointingDelta(pointing, target.direction) : null;
  const eq =
    usable && pointing && target ? equatorialDelta(pointing, target.direction, site.lat) : null;
  const sun = bodyState('sun', date, site);
  const unsafe =
    targetId === 'sun' ||
    sunUnsafe(sun.altDeg, sun.azDeg, [
      ...(target ? [target.direction] : []),
      ...(usable && pointing ? [pointing] : []),
    ]);
  const names = useMemo(() => {
    if (!cat) return [];
    const ids = [
      ...cat.starById.keys(),
      ...cat.dsoById.keys(),
      'moon',
      'planet:mercury',
      'planet:venus',
      'planet:mars',
      'planet:jupiter',
      'planet:saturn',
      'planet:uranus',
      'planet:neptune',
    ].filter(isObjectId);
    return ids.map((id) => ({ id, name: displayName(cat, id, lang) }));
  }, [cat, lang]);
  const candidates = useMemo(() => {
    if (!cat) return [];
    const ids: ObjectId[] = [...cat.starById.values()].filter((s) => s.mag <= 2.5).map((s) => s.id);
    ids.push('moon', 'planet:venus', 'planet:jupiter', 'planet:saturn', 'planet:mars');
    const solar = bodyState('sun', date, site);
    return ids
      .map((id) => guideTarget(cat, id, date, site))
      .filter(
        (s): s is NonNullable<ReturnType<typeof guideTarget>> =>
          s !== null &&
          s.altDeg >= 25 &&
          s.altDeg <= 75 &&
          !sunUnsafe(solar.altDeg, solar.azDeg, [s.direction]),
      )
      .sort((a, b) => (a.mag ?? 0) - (b.mag ?? 0))
      .slice(0, 30);
  }, [cat, date, site]);
  const selected =
    candidates.find((c) => c.id === alignId) ??
    candidates.find((c) => !samples.some((s) => s.objectId === c.id)) ??
    null;
  const capture = async () => {
    const reading = freshReading();
    if (!cat || !reading?.q || !selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const at = captureDate(simulator);
      const fresh = guideTarget(cat, selected.id, at, site);
      if (!fresh || fresh.altDeg < 25 || fresh.altDeg > 75)
        throw new Error('Star below alignment range');
      const sample: AlignmentSample = {
        q: reading.q,
        direction: fresh.direction,
        objectId: fresh.id,
        at: at.toISOString(),
      };
      const previous = usable ? samples : [];
      const next = previous.length >= 2 ? [sample] : [...previous, sample];
      const model = next.length === 1 ? alignOne(sample) : alignTwo(next);
      if (angularSeparation(model.axis, [0, 1, 0]) > 25)
        throw new Error('Phone top must follow the tube');
      const saved: SavedAlignment = {
        model,
        samples: next,
        at: captureDate(false).toISOString(),
        profileKey: profileKey(p),
        provider: reading.source,
        sessionId: reading.sessionId,
      };
      // 저장 실패 시 화면에서도 다음 정렬 단계로 넘어가지 않는다.
      if (!simulator)
        await emitSkill(next.length === 1 ? 'align1' : 'align2', { ...saved, simulated: false });
      setSamples(next);
      setAlignment(saved);
      setChecked(null);
      useTelescopeStore.getState().saveAlignment(saved);
      setAlignId(null);
    } catch {
      setError(t('guide.alignError'));
    } finally {
      setBusy(false);
    }
  };
  const verify = () => {
    if (!selected || !usable || !pointing || sensor.status !== 'active') return;
    setChecked(angularSeparation(pointing, selected.direction));
  };
  const eyefov = p.afovDeg / (p.focalLengthMm / p.eyepieceMm),
    finderFov = p.mode === 'binoculars' ? p.binocularFov : p.finderFov;
  const inside =
    !!delta &&
    delta.separationDeg < (p.mode === 'binoculars' ? p.binocularFov : eyefov) * 0.5 &&
    !unsafe;
  const arrival = useRef(false);
  useEffect(() => {
    if (inside && !arrival.current && !simulator)
      feedbackOk({ sound: useSensorStore.getState().sound });
    arrival.current = inside;
  }, [inside, simulator, targetId]);
  const actualView = view;
  const chartFov = actualView === 'eyepiece' && p.mode === 'telescope' ? eyefov : finderFov;
  const chartBase =
    (preview ? target?.direction : usable ? pointing : target?.direction) ?? altAzToScene(30, 180);
  const aa = sceneToAltAz(chartBase),
    chartCenter = altAzToScene(
      Math.max(-89, Math.min(89, aa.altDeg + pan.alt)),
      wrap360(aa.azDeg + pan.az),
    );
  const choose = (id: ObjectId) => {
    setTargetId(id);
    useTelescopeStore.getState().setTarget(id);
    setChoosing(false);
    setPan({ alt: 0, az: 0 });
  };
  if (view === 'equipment')
    return (
      <Equipment
        onBack={() => {
          setView('guide');
          setAlignment(null);
          setSamples([]);
        }}
      />
    );
  if (unsafe)
    return (
      <ScreenFrame title={t('guide.sunTitle')} onBack={closeTelescope} testId="sun-guard">
        <div
          role="alert"
          className="m-4 rounded-3xl border-2 border-danger bg-danger-soft p-6 text-danger"
        >
          <h2 className="text-headline">{t('guide.sunTitle')}</h2>
          <p className="mt-5 text-body leading-8">{t('guide.sunWarning')}</p>
          <button
            className={BTN + ' mt-6 w-full'}
            onClick={() => {
              setTargetId(null);
              setChoosing(true);
              setAlignment(null);
              stopTelescopeOrientation();
            }}
          >
            {t('guide.changeTarget')}
          </button>
        </div>
      </ScreenFrame>
    );
  return (
    <ScreenFrame
      title={t('guide.title')}
      onBack={closeTelescope}
      testId="telescope-screen"
      scrollKey={view}
    >
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {!accepted ? (
          <section className="rounded-3xl bg-surface p-5" data-testid="guide-intro">
            <h2 className="text-headline">{t('guide.mountTitle')}</h2>
            <svg viewBox="0 0 320 150" className="my-4 w-full text-accent" aria-hidden>
              <g stroke="currentColor" fill="none" strokeWidth="3">
                <path d="M58 116 206 30 225 64 77 148Z" />
                <rect x="125" y="36" width="42" height="80" rx="8" transform="rotate(60 146 76)" />
                <path d="m217 20 36-20m-7 0h7v9M173 52l30-18" />
              </g>
              <text x="210" y="120" fill="currentColor" fontSize="14">
                +Y ↑
              </text>
            </svg>
            <p className="leading-7 text-muted">{t('guide.mountHelp')}</p>
            <p className="mt-3 text-body-sm leading-6 text-muted">{t('guide.sensorMethod')}</p>
            <p className="mt-3 text-body-sm leading-6 text-danger">{t('guide.safety')}</p>
            <button
              className={BTN + ' mt-5 w-full'}
              data-testid="guide-accept"
              onClick={() => setAccepted(true)}
            >
              {t('guide.ready')}
            </button>
          </section>
        ) : (
          <>
            <details>
              <summary className="min-h-11 py-2 text-body-sm text-muted">
                {t('guideFlow.settings')}
              </summary>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  className="min-h-12 rounded-pill bg-surface-2 px-4 text-body-sm"
                  onClick={() => setView('equipment')}
                >
                  {p.mode === 'telescope' ? p.name : `${p.binocularMag}×${p.binocularAperture}`} ·{' '}
                  {t('guide.edit')}
                </button>
                <button
                  className="min-h-12 px-3 text-accent"
                  onClick={() =>
                    useSettingsStore.getState().setTheme(theme === 'night' ? 'dark' : 'night')
                  }
                >
                  {t('settings.nightMode')}
                </button>
              </div>
              <p className="mt-2 text-body-sm leading-6 text-muted">{t('guide.mountHelp')}</p>
            </details>
            {loadError ? (
              <div role="alert">
                {t('guide.loadError')}{' '}
                <button className={BTN} onClick={() => setRetry((x) => x + 1)}>
                  {t('study.retry')}
                </button>
              </div>
            ) : !cat || !pack ? (
              <p role="status">{t('common.loading')}</p>
            ) : (
              <>
                <section className="rounded-2xl bg-surface px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-caption text-muted">{t('guide.target')}</p>
                      <h2 className="mt-1 text-title">
                        {targetId ? displayName(cat, targetId, lang) : t('guide.chooseTarget')}
                      </h2>
                      {target && (
                        <p className="mt-2 text-body-sm text-muted">
                          {t('guide.targetPosition', {
                            alt: target.altDeg.toFixed(1),
                            az: target.azDeg.toFixed(1),
                          })}{' '}
                          · {t(target.altDeg > 0 ? 'guide.above' : 'guide.below')}
                        </p>
                      )}
                    </div>
                    <button
                      className="min-h-11 px-2 text-accent"
                      onClick={() => setChoosing(!choosing)}
                    >
                      {t('guide.change')}
                    </button>
                  </div>
                  {choosing && (
                    <div className="mt-4">
                      <input
                        className={INPUT}
                        placeholder={t('guide.search')}
                        aria-label={t('guide.search')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <div
                        className="mt-2 max-h-60 overflow-y-auto"
                        data-testid="guide-target-list"
                      >
                        {names
                          .filter((s) =>
                            (s.name + ' ' + s.id).toLowerCase().includes(query.toLowerCase()),
                          )
                          .slice(0, 30)
                          .map((s) => (
                            <button
                              key={s.id}
                              className="block min-h-12 w-full rounded-xl px-3 text-left hover:bg-surface-2"
                              onClick={() => choose(s.id)}
                            >
                              {s.name}{' '}
                              <span className="text-caption text-muted">
                                {s.id.replace('dso:', '')}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </section>
                <div className="grid grid-cols-3 gap-2" aria-label={t('guide.views')}>
                  {(['guide', 'finder', 'hop'] as const).map((v) => (
                    <button
                      className={
                        'min-h-14 rounded-2xl text-body-sm font-semibold ' +
                        (actualView === v || (v === 'finder' && actualView === 'eyepiece')
                          ? 'bg-accent text-accent-fg'
                          : 'bg-surface')
                      }
                      key={v}
                      aria-pressed={
                        actualView === v || (v === 'finder' && actualView === 'eyepiece')
                      }
                      onClick={() => setView(v)}
                      data-testid={'guide-view-' + v}
                    >
                      {t('guide.view.' + v)}
                    </button>
                  ))}
                </div>
                {view === 'guide' && p.mount !== 'goto' && (
                  <DirectionPanel
                    delta={delta}
                    eq={eq}
                    mount={p.mount}
                    inside={inside}
                    status={sensor.status}
                    hasTarget={!!target}
                    onStart={() => {
                      setAlignment(null);
                      setSamples([]);
                      setView('align');
                      void startTelescopeOrientation();
                    }}
                    onAlign={() => {
                      setView('align');
                      if (samples.length >= 2) {
                        setSamples([]);
                        setAlignId(null);
                      }
                    }}
                    onChart={() => {
                      setPreview(false);
                      setPan({ alt: 0, az: 0 });
                      setView('eyepiece');
                    }}
                  />
                )}
                {view === 'hop' && targetId && (
                  <StarHop
                    key={targetId + finderFov}
                    cat={cat}
                    pack={pack}
                    targetId={targetId}
                    date={date}
                    observer={site}
                    course={HOP_COURSES.find(
                      (c) => c.id === hashQuery().get('course') && c.target === targetId,
                    )}
                  />
                )}
                {view !== 'hop' && (
                  <>
                    {!(view === 'guide' && p.mount !== 'goto') && (
                      <div className="rounded-2xl border border-hairline p-4">
                        <p role="status" className="text-body-sm" data-testid="guide-status">
                          {t(usable ? 'guide.aligned' : 'guide.unaligned')}
                          {usable &&
                            ` · ${t('guide.residual', { value: usable.model.residualDeg.toFixed(1) })}`}
                        </p>
                        {usable && tick - Date.parse(usable.at) > 600000 && (
                          <p className="mt-2 text-body-sm text-accent">{t('guide.drift')}</p>
                        )}
                        {simulator && (
                          <p className="text-body-sm text-accent">{t('guide.simulation')}</p>
                        )}
                        {sensor.status !== 'active' ? (
                          <>
                            <button
                              className={BTN + ' mt-3 w-full'}
                              data-testid="guide-sensor"
                              onClick={() => {
                                setAlignment(null);
                                setSamples([]);
                                void startTelescopeOrientation();
                              }}
                            >
                              {t(
                                sensor.status === 'waiting' ? 'guide.waiting' : 'guide.startSensor',
                              )}
                            </button>
                            {(sensor.status === 'unavailable' || sensor.status === 'denied') && (
                              <p role="alert" className="mt-3 text-body-sm">
                                {t('guide.sensorUnavailable')}
                              </p>
                            )}
                          </>
                        ) : (
                          <button
                            className="min-h-11 text-body-sm text-accent"
                            onClick={() => {
                              setView('align');
                              if (samples.length >= 2) {
                                setSamples([]);
                                setAlignId(null);
                              }
                            }}
                          >
                            {t('guide.align')}
                          </button>
                        )}
                      </div>
                    )}
                    {view === 'align' && (
                      <section
                        className="rounded-3xl bg-surface p-5"
                        data-testid="alignment-wizard"
                      >
                        <h2 className="text-title">
                          {t('guide.alignStep', { n: Math.min(2, samples.length + 1) })}
                        </h2>
                        <p className="my-3 text-body-sm leading-6 text-muted">
                          {t('guide.alignHelp')}
                        </p>
                        {usable && (
                          <div className="mb-4 rounded-2xl bg-accent-soft p-3">
                            <p className="text-body-sm">{t('guideFlow.alignedNext')}</p>
                            <button
                              className={BTN + ' mt-3 w-full'}
                              data-testid="alignment-done"
                              onClick={() => setView('guide')}
                            >
                              {t('guide.finishAlignment')}
                            </button>
                            <p className="mt-2 text-caption text-muted">
                              {t('guideFlow.secondOptional')}
                            </p>
                          </div>
                        )}
                        {!candidates.length && (
                          <p role="status" className="my-3 text-body-sm">
                            {t('guideFlow.noStars')}
                          </p>
                        )}
                        <select
                          aria-label={t('guide.alignmentStar')}
                          data-testid="alignment-star"
                          className={INPUT}
                          value={selected?.id ?? ''}
                          onChange={(e) => setAlignId(e.target.value as ObjectId)}
                        >
                          {candidates.map((c) => (
                            <option value={c.id} key={c.id}>
                              {displayName(cat, c.id, lang)} · {c.altDeg.toFixed(0)}°
                            </option>
                          ))}
                        </select>
                        {samples.length < 2 ? (
                          <button
                            className={BTN + ' mt-4 w-full'}
                            disabled={!selected || sensor.status !== 'active' || busy}
                            data-testid="alignment-capture"
                            onClick={() => void capture()}
                          >
                            {t('guide.capture')}
                          </button>
                        ) : (
                          <button
                            className={BTN + ' mt-4 w-full'}
                            disabled={!selected || samples.some((s) => s.objectId === selected.id)}
                            onClick={verify}
                          >
                            {t('guide.verify')}
                          </button>
                        )}
                        {usable && (
                          <p
                            className="mt-3 text-body-sm text-accent"
                            data-testid="alignment-residual"
                          >
                            {t('guide.residual', { value: usable.model.residualDeg.toFixed(1) })}
                          </p>
                        )}
                        {checked !== null && (
                          <p role="status" className="mt-3">
                            {t('guide.checkResidual', { value: checked.toFixed(1) })}{' '}
                            {checked > 2 ? t('guide.drift') : ''}
                          </p>
                        )}
                        {error && (
                          <p role="alert" className="mt-3 text-danger">
                            {error}
                          </p>
                        )}
                      </section>
                    )}
                    {actualView === 'guide' && target && p.mount === 'goto' && (
                      <section className="rounded-3xl bg-surface p-5" data-testid="pointing-guide">
                        <div>
                          <h3 className="text-title">{t('guide.goto')}</h3>
                          <p className="mt-4 text-body leading-8 tabular-nums">
                            JNow · RA {(target.raDeg / 15).toFixed(4)}h · Dec{' '}
                            {target.decDeg.toFixed(3)}°
                          </p>
                          <button
                            className={BTN + ' mt-4 w-full'}
                            onClick={() => {
                              setError(null);
                              if (!navigator.clipboard) {
                                setError(t('guide.copyUnavailable'));
                                return;
                              }
                              void navigator.clipboard
                                .writeText(
                                  `JNow RA ${(target.raDeg / 15).toFixed(5)}h Dec ${target.decDeg.toFixed(4)}° Alt ${target.altDeg.toFixed(2)}° Az ${target.azDeg.toFixed(2)}°`,
                                )
                                .catch(() => setError(t('guide.error')));
                            }}
                          >
                            {t('guide.copyCoordinates')}
                          </button>
                          <button
                            className="min-h-14 w-full text-accent"
                            onClick={() => {
                              setPreview(true);
                              setView('eyepiece');
                            }}
                          >
                            {t('guide.gotoArrived')}
                          </button>
                        </div>
                      </section>
                    )}
                    {(actualView === 'finder' || actualView === 'eyepiece') && target && (
                      <section className="rounded-3xl bg-surface p-4" data-testid="guide-chart">
                        <div className="mb-4 flex flex-wrap gap-2">
                          <button
                            className="min-h-12 rounded-pill bg-surface-2 px-4 text-accent"
                            onClick={() => setView(actualView === 'finder' ? 'eyepiece' : 'finder')}
                          >
                            {t(actualView === 'finder' ? 'guide.eyepiece' : 'guide.finder')}
                          </button>
                          <button
                            className="min-h-12 rounded-pill bg-surface-2 px-4 text-accent"
                            onClick={() => {
                              setPreview(!preview);
                              setPan({ alt: 0, az: 0 });
                            }}
                          >
                            {t(preview || !usable ? 'guide.preview' : 'guide.live')}
                          </button>
                        </div>
                        <FinderChart
                          pack={pack}
                          cat={cat}
                          center={chartCenter}
                          target={target.direction}
                          date={date}
                          observer={site}
                          fovDeg={chartFov}
                          equatorial={p.mount === 'eq'}
                          orientation={
                            actualView === 'finder'
                              ? p.finderKind === 'optical'
                                ? 'rotate180'
                                : 'upright'
                              : p.mode === 'binoculars'
                                ? 'upright'
                                : p.orientation
                          }
                          rotationDeg={p.rotationDeg}
                          onCenter={(center) => {
                            const next = sceneToAltAz(center),
                              base = sceneToAltAz(target.direction);
                            setPreview(true);
                            setPan({ alt: next.altDeg - base.altDeg, az: next.azDeg - base.azDeg });
                          }}
                        />
                        <p className="mt-3 text-body-sm leading-6 text-muted">
                          {t('guide.chartLimit')}
                        </p>
                        <div className="mt-3 flex justify-center gap-2">
                          {(['←', '↑', '↓', '→'] as const).map((v, i) => (
                            <button
                              key={v}
                              aria-label={t('guide.pan') + ' ' + v}
                              className="h-12 w-12 rounded-xl bg-surface-2 text-title"
                              onClick={() => {
                                setPreview(true);
                                setPan((s) => ({
                                  alt:
                                    s.alt + (i === 1 ? chartFov / 3 : i === 2 ? -chartFov / 3 : 0),
                                  az: s.az + (i === 0 ? -chartFov / 3 : i === 3 ? chartFov / 3 : 0),
                                }));
                              }}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-caption text-muted">{t('guide.previewNote')}</p>
                        {(pan.alt !== 0 || pan.az !== 0) && (
                          <button
                            className="min-h-12 w-full text-accent"
                            onClick={() => setPan({ alt: 0, az: 0 })}
                          >
                            {t('guide.recenter')}
                          </button>
                        )}
                      </section>
                    )}
                  </>
                )}
                {targetId && (
                  <button
                    className="min-h-14 w-full rounded-pill bg-surface-2 px-4 text-accent"
                    onClick={() => {
                      useTelescopeStore.getState().setRings(true);
                      flyToObject(targetId, Math.max(3, finderFov * 1.3));
                      window.location.hash = '#/sky';
                    }}
                  >
                    {t('guide.showFov')}
                  </button>
                )}
                {error && view !== 'align' && (
                  <p role="alert" className="text-danger">
                    {error}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ScreenFrame>
  );
}
