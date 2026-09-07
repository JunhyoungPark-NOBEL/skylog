import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { telescopes, eyepieces, binoculars } from '@/db/repos/equipment';
import { defaultImageOrientation } from '@/astro/finder';
import { eyepieceView, usefulMagnificationRange, fovFromFieldWidth } from '@/astro/optics';
import { telescopeLimitMag } from '@/astro/visibility';
import { emitSkill } from '@/learn/runtime';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { useTelescopeStore, type GuideProfile } from '@/state/telescopeStore';
import type { Telescope, Eyepiece, Binoculars } from '@/db/types';
import { EQUIPMENT_BUTTON, EQUIPMENT_INPUT } from './styles';

// 제조사 모델 외에는 광학 조합의 예시이며 실제 제품을 보유한다고 가정하지 않는다.
const PRESETS = [
  ['SVBONY SV48P', 90, 500, 'refractor'],
  ['70 / 700', 70, 700, 'refractor'],
  ['80 / 600 ED', 80, 600, 'refractor'],
  ['130 / 650', 130, 650, 'reflector'],
  ['200 / 1200 Dob', 200, 1200, 'reflector'],
  ['127 / 1500 Mak', 127, 1500, 'compound'],
] as const;
export function Equipment({ onBack }: { onBack(): void }) {
  const { t } = useTranslation();
  const [p, setP] = useState(() => useTelescopeStore.getState().profile);
  const [saved, setSaved] = useState(false),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<{
    telescopes: Telescope[];
    eyepieces: Eyepiece[];
    binoculars: Binoculars[];
  }>({ telescopes: [], eyepieces: [], binoculars: [] });
  useEffect(() => {
    void Promise.all([telescopes.list(), eyepieces.list(), binoculars.list()])
      .then(([a, b, c]) => setRows({ telescopes: a, eyepieces: b, binoculars: c }))
      .catch(() => setError(true));
  }, []);
  const patch = (value: Partial<GuideProfile>) => {
    setP((s) => ({ ...s, ...value }));
    setSaved(false);
  };
  const number = (key: keyof GuideProfile, min: number, max: number) => (
    <label className="block text-body-sm">
      {t('guide.fields.' + key)}
      <input
        data-testid={'equipment-' + key}
        type="number"
        min={min}
        max={max}
        step="any"
        required
        value={Number(p[key])}
        className={EQUIPMENT_INPUT}
        onChange={(e) => patch({ [key]: Number(e.target.value) })}
      />
    </label>
  );
  const select = <K extends keyof GuideProfile>(key: K, values: readonly GuideProfile[K][]) => (
    <label className="block text-body-sm">
      {t('guide.fields.' + key)}
      <select
        value={String(p[key])}
        className={EQUIPMENT_INPUT}
        onChange={(e) => {
          const value = e.target.value as GuideProfile[K];
          patch({
            [key]: value,
            ...(key === 'kind'
              ? { orientation: defaultImageOrientation(value as GuideProfile['kind'], p.diagonal) }
              : {}),
          });
        }}
      >
        {values.map((v) => (
          <option key={String(v)} value={String(v)}>
            {t('guide.values.' + String(v))}
          </option>
        ))}
      </select>
    </label>
  );
  const optics = eyepieceView(
    { apertureMm: p.apertureMm, focalLengthMm: p.focalLengthMm },
    { focalLengthMm: p.eyepieceMm, afovDeg: p.afovDeg },
  );
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const scope = await telescopes.upsert({
        id: p.telescopeId,
        name: p.name.trim() || 'Telescope',
        apertureMm: p.apertureMm,
        focalLengthMm: p.focalLengthMm,
        mountType: p.mount,
        opticalDesign: p.kind,
        diagonal: p.diagonal,
        imageOrientation: p.orientation,
        rotationDeg: p.rotationDeg,
        correctImageFinder: p.finderKind === 'raci',
        finder: { kind: p.finderKind === 'rdf' ? 'rdf' : 'optical', fovDeg: p.finderFov },
      });
      const eye = await eyepieces.upsert({
        id: p.eyepieceId,
        name: `${p.eyepieceMm}mm / ${p.afovDeg}°`,
        focalLengthMm: p.eyepieceMm,
        afovDeg: p.afovDeg,
      });
      const bino = await binoculars.upsert({
        id: p.binocularsId,
        name: `${p.binocularMag}×${p.binocularAperture}`,
        magnification: p.binocularMag,
        apertureMm: p.binocularAperture,
        fovDeg: p.binocularFov,
      });
      const next = { ...p, telescopeId: scope.id, eyepieceId: eye.id, binocularsId: bino.id };
      useTelescopeStore.getState().setProfile(next);
      useTelescopeStore.getState().setRings(true);
      setP(next);
      await emitSkill('fovSetup', {
        telescopeId: scope.id,
        eyepieceId: eye.id,
        fovDeg: optics.trueFovDeg,
      });
      setSaved(true);
      setRows({
        telescopes: await telescopes.list(),
        eyepieces: await eyepieces.list(),
        binoculars: await binoculars.list(),
      });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenFrame title={t('guide.equipment')} onBack={onBack} testId="equipment-screen">
      <form
        className="mx-auto max-w-2xl space-y-5 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <p className="text-body-sm leading-6 text-muted">{t('guide.defaults')}</p>
        {select('mode', ['telescope', 'binoculars'])}
        <details className="rounded-2xl bg-surface p-4">
          <summary className="min-h-11 cursor-pointer content-center">
            {t('guide.savedEquipment')}
          </summary>
          {rows.telescopes.map((row) => (
            <div className="flex gap-2" key={row.id}>
              <button
                type="button"
                className="min-h-11 flex-1 text-left text-accent"
                onClick={() =>
                  patch({
                    telescopeId: row.id,
                    name: row.name,
                    apertureMm: row.apertureMm,
                    focalLengthMm: row.focalLengthMm,
                    mount: row.mountType,
                    kind: row.opticalDesign ?? 'refractor',
                    diagonal: row.diagonal ?? true,
                    orientation:
                      row.imageOrientation ??
                      defaultImageOrientation(
                        row.opticalDesign ?? 'refractor',
                        row.diagonal ?? true,
                      ),
                    rotationDeg: row.rotationDeg ?? 0,
                    finderKind: row.correctImageFinder ? 'raci' : (row.finder?.kind ?? 'raci'),
                    finderFov: row.finder?.fovDeg ?? 6,
                  })
                }
              >
                {row.name}
              </button>
              <button
                type="button"
                className="min-h-11 px-3 text-muted"
                onClick={() => {
                  void telescopes
                    .remove(row.id)
                    .then(() => {
                      setRows((r) => ({
                        ...r,
                        telescopes: r.telescopes.filter((x) => x.id !== row.id),
                      }));
                      if (p.telescopeId === row.id) patch({ telescopeId: undefined });
                    })
                    .catch(() => setError(true));
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
          {rows.eyepieces.map((row) => (
            <div className="flex gap-2" key={row.id}>
              <button
                type="button"
                className="min-h-11 flex-1 text-left text-accent"
                onClick={() =>
                  patch({ eyepieceId: row.id, eyepieceMm: row.focalLengthMm, afovDeg: row.afovDeg })
                }
              >
                {row.name}
              </button>
              <button
                type="button"
                className="min-h-11 px-3 text-muted"
                onClick={() => {
                  void eyepieces
                    .remove(row.id)
                    .then(() => {
                      setRows((s) => ({
                        ...s,
                        eyepieces: s.eyepieces.filter((x) => x.id !== row.id),
                      }));
                      if (p.eyepieceId === row.id) patch({ eyepieceId: undefined });
                    })
                    .catch(() => setError(true));
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
          {rows.binoculars.map((row) => (
            <div className="flex gap-2" key={row.id}>
              <button
                type="button"
                className="min-h-11 flex-1 text-left text-accent"
                onClick={() =>
                  patch({
                    mode: 'binoculars',
                    binocularsId: row.id,
                    binocularMag: row.magnification,
                    binocularAperture: row.apertureMm,
                    binocularFov: row.fovDeg,
                  })
                }
              >
                {row.name} · {row.fovDeg}°
              </button>
              <button
                type="button"
                className="min-h-11 px-3 text-muted"
                onClick={() => {
                  void binoculars
                    .remove(row.id)
                    .then(() => {
                      setRows((s) => ({
                        ...s,
                        binoculars: s.binoculars.filter((x) => x.id !== row.id),
                      }));
                      if (p.binocularsId === row.id) patch({ binocularsId: undefined });
                    })
                    .catch(() => setError(true));
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="min-h-11 text-accent"
            onClick={() =>
              patch({ telescopeId: undefined, eyepieceId: undefined, binocularsId: undefined })
            }
          >
            {t('guide.newEquipment')}
          </button>
        </details>
        <div className="space-y-4 rounded-3xl bg-surface p-5">
          <h2 className="text-title">{t('object.equipment.telescope')}</h2>
          <label className="block text-body-sm">
            {t('guide.presets')}
            <select
              className={EQUIPMENT_INPUT}
              value=""
              onChange={(e) => {
                const v = PRESETS[Number(e.target.value)];
                if (v)
                  patch({
                    name: v[0],
                    apertureMm: v[1],
                    focalLengthMm: v[2],
                    kind: v[3],
                    orientation: defaultImageOrientation(v[3], p.diagonal),
                    telescopeId: undefined,
                  });
              }}
            >
              <option value="">{t('guide.choose')}</option>
              {PRESETS.map((v, i) => (
                <option value={i} key={v[0]}>
                  {v[0]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-body-sm">
            {t('guide.fields.name')}
            <input
              className={EQUIPMENT_INPUT}
              required
              maxLength={100}
              value={p.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {number('apertureMm', 20, 1000)}
            {number('focalLengthMm', 50, 10000)}
            {select('kind', ['refractor', 'reflector', 'compound'])}
            {select('mount', ['altaz', 'eq', 'goto'])}
          </div>
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={p.diagonal}
              onChange={(e) =>
                patch({
                  diagonal: e.target.checked,
                  orientation: defaultImageOrientation(p.kind, e.target.checked),
                })
              }
            />
            {t('guide.diagonal')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {number('eyepieceMm', 1, 100)}
            {number('afovDeg', 20, 120)}
          </div>
          <label className="block text-body-sm">
            {t('guide.eyepiecePresets')}
            <select
              className={EQUIPMENT_INPUT}
              value=""
              onChange={(e) => {
                const [f, a] = e.target.value.split('/').map(Number);
                patch({ eyepieceMm: f!, afovDeg: a!, eyepieceId: undefined });
              }}
            >
              <option value="">{t('guide.choose')}</option>
              {['32/52', '25/52', '17/52', '10/52', '6/52', '24/68', '14/82', '8/82'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {select('finderKind', ['rdf', 'optical', 'raci'])}
            {number('finderFov', 0.2, 30)}
            {select('orientation', ['upright', 'rotate180', 'mirror', 'flipBoth'])}
            {number('rotationDeg', -180, 180)}
          </div>
        </div>
        <div className="space-y-4 rounded-3xl bg-surface p-5">
          <h2 className="text-title">{t('object.equipment.binoculars')}</h2>
          <select
            aria-label={t('guide.binocularPresets')}
            className={EQUIPMENT_INPUT}
            value=""
            onChange={(e) => {
              const [m, a, f] = e.target.value.split('/').map(Number);
              patch({
                binocularMag: m!,
                binocularAperture: a!,
                binocularFov: f!,
                binocularsId: undefined,
              });
            }}
          >
            <option value="">{t('guide.binocularPresets')}</option>
            {['7/50/7.1', '8/42/8.2', '10/50/6.5', '10/42/6', '12/50/5.3', '15/70/4.4'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            {number('binocularMag', 1, 100)}
            {number('binocularAperture', 10, 300)}
            {number('binocularFov', 0.2, 30)}
            <label className="text-body-sm">
              {t('guide.fieldWidth')}
              <input
                type="number"
                min="1"
                max="500"
                className={EQUIPMENT_INPUT}
                onChange={(e) => {
                  if (e.target.value)
                    patch({
                      binocularFov:
                        Math.round(fovFromFieldWidth(Number(e.target.value)) * 100) / 100,
                    });
                }}
              />
            </label>
          </div>
        </div>
        <div
          className="rounded-3xl border border-accent bg-accent-soft p-5"
          data-testid="equipment-calculation"
        >
          <h2 className="text-title">{t('guide.calculation')}</h2>
          <p className="my-3 text-headline">
            {(p.mode === 'telescope' ? optics.magnification : p.binocularMag).toFixed(0)}× ·{' '}
            {(p.mode === 'telescope' ? optics.trueFovDeg : p.binocularFov).toFixed(2)}°
          </p>
          <p className="text-body-sm leading-7">
            {t('guide.optics', {
              pupil: (p.mode === 'telescope'
                ? optics.exitPupilMm
                : p.binocularAperture / p.binocularMag
              ).toFixed(1),
              limit: telescopeLimitMag(
                p.mode === 'telescope' ? p.apertureMm : p.binocularAperture,
              ).toFixed(1),
              dawes: (116 / (p.mode === 'telescope' ? p.apertureMm : p.binocularAperture)).toFixed(
                1,
              ),
              max: usefulMagnificationRange(p.apertureMm).max,
            })}
          </p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className={EQUIPMENT_BUTTON + ' w-full'}
          data-testid="equipment-save"
        >
          {t(saved ? 'guide.saved' : 'guide.save')}
        </button>
        {error && <p role="alert">{t('guide.error')}</p>}
      </form>
    </ScreenFrame>
  );
}
