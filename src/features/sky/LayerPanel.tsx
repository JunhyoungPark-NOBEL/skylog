import { useTranslation } from 'react-i18next';
import { useLayerStore, type BooleanLayerKey, type LayerValues } from '@/state/layerStore';
import { ScrollArea } from '@/ui/ScrollArea';
import { Segmented } from '@/ui/Segmented';
import { Toggle } from '@/ui/Toggle';
import { useTelescopeStore } from '@/state/telescopeStore';
import { openTelescope } from '@/features/telescope/navigation';
import { useSelectionStore } from '@/state/selectionStore';
import { RealSkyToggle } from '@/features/sky/RealSkyToggle';
import { useSensorStore } from '@/state/sensorStore';
import { FovRingOptions } from '@/features/telescope/FovRingOptions';
import { navigate } from '@/app/router';

type AlphaKey = {
  [K in keyof LayerValues]: LayerValues[K] extends number ? K : never;
}[keyof LayerValues];

function Row({
  id,
  label,
  alphaKey,
  hint,
}: {
  id: BooleanLayerKey;
  label: string;
  alphaKey?: AlphaKey;
  hint?: string;
}) {
  const on = useLayerStore((s) => s[id]);
  const alpha = useLayerStore((s) => (alphaKey ? s[alphaKey] : 1));
  const set = useLayerStore((s) => s.set);
  return (
    <div>
      <Toggle
        id={`layer-${id}`}
        label={label}
        hint={hint}
        checked={on}
        onChange={(v) => set(id, v)}
      />
      {alphaKey && on && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={alpha}
          onChange={(e) => set(alphaKey, Number(e.target.value))}
          aria-label={`${label} opacity`}
          className="-mt-2 mb-2 ml-4 w-[calc(100%-2rem)]"
          data-testid={`layer-${alphaKey}`}
        />
      )}
    </div>
  );
}

/**
 * 레이어 토글 패널 (task-01 §5). 값은 layerStore(Dexie 저장).
 * 왼쪽에서 열리는 전체 높이 불투명 사이드 패널(유리 없음) — 헤더는 떠 있는 상태 캡슐 아래(pt-status),
 * 목록 끝은 떠 있는 탭 pill 아래로 이어진다(pb-tab + 아래쪽 페이드).
 */
export function LayerPanel({
  onClose,
  onOverview,
  onAlign,
}: {
  onClose(): void;
  onOverview(): void;
  onAlign(): void;
}) {
  const { t } = useTranslation();
  const labelLang = useLayerStore((s) => s.labelLang);
  const saturation = useLayerStore((s) => s.starSaturation);
  const realSky = useLayerStore((s) => s.realSky);
  const bortle = useLayerStore((s) => s.bortle);
  const groundOpacity = useLayerStore((s) => s.groundOpacity);
  const hopRoute = useTelescopeStore((s) => s.route);
  const set = useLayerStore((s) => s.set);
  const arActive = useSensorStore((s) => s.arActive);
  const calibrated = useSensorStore((s) => Boolean(s.calibration));
  return (
    <div
      className="absolute inset-y-0 left-0 z-20 flex w-[min(20rem,85vw)] flex-col overflow-hidden rounded-r-2xl bg-surface text-fg shadow-float squircle"
      data-testid="layer-panel"
      role="dialog"
      aria-label={t('sky.layers')}
    >
      <header className="hairline-b flex shrink-0 items-center gap-2 pt-status pr-2 pb-2 pl-5">
        <h2 className="flex-1 truncate text-title">{t('sky.layers')}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-fg/80 transition-colors duration-150 active:bg-surface-2"
          aria-label={t('common.close')}
          data-testid="close-layers"
        >
          ✕
        </button>
      </header>
      <ScrollArea className="pb-tab pt-2 text-body-sm" fadeBottom="28px" fadeColor="var(--surface)">
        <div className="grid grid-cols-2 gap-2 px-4 pb-3">
          <button
            type="button"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface-2 px-2 text-caption text-fg"
            onClick={onOverview}
            data-testid="sky-overview"
            title={t('sky.circularViewHelp')}
          >
            <span aria-hidden="true">⊕</span>
            {t('sky.circularView')}
          </button>
          <button
            type="button"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface-2 px-2 text-caption text-fg"
            onClick={() => openTelescope(useSelectionStore.getState().selectedId ?? undefined)}
            data-testid="sky-telescope"
          >
            <span aria-hidden="true">◎</span>
            {t('guide.title')}
          </button>
        </div>
        {arActive && (
          <button
            type="button"
            onClick={onAlign}
            className="mx-4 mb-3 flex min-h-11 w-[calc(100%-2rem)] items-center justify-center rounded-xl bg-surface-2 px-3 text-caption text-fg"
            data-testid="ar-align"
          >
            {calibrated ? t('sensor.realign') : t('sensor.align')}
          </button>
        )}
        <FovRingOptions />
        {hopRoute && (
          <button
            className="min-h-12 px-4 text-accent"
            onClick={() => useTelescopeStore.getState().setRoute(null)}
          >
            {t('guide.clearRoute')}
          </button>
        )}
        <RealSkyToggle />
        {realSky && (
          <div className="px-4 pb-3">
            <label htmlFor="layer-bortle" className="block text-caption text-muted">
              {bortle > 0 ? t('realSky.bortle', { n: bortle }) : t('realSky.bortleAuto')}
            </label>
            <input
              id="layer-bortle"
              type="range"
              min={0}
              max={9}
              step={1}
              value={bortle}
              onChange={(e) => set('bortle', Number(e.target.value))}
              className="w-full"
              data-testid="layer-bortle"
            />
          </div>
        )}
        <Row id="markers" label={t('sky.layer.markers')} />
        <Row
          id="constellationLines"
          label={t('sky.layer.constellationLines')}
          alphaKey="constellationLinesAlpha"
        />
        <Row
          id="constellationBounds"
          label={t('sky.layer.constellationBounds')}
          alphaKey="constellationBoundsAlpha"
        />
        <Row
          id="constellationNames"
          label={t('sky.layer.constellationNames')}
          alphaKey="constellationNamesAlpha"
        />
        <Row id="starLabels" label={t('sky.layer.starLabels')} />
        <Row id="dso" label={t('sky.layer.dso')} />
        <Row
          id="milkyWay"
          label={t('sky.layer.milkyWay')}
          alphaKey="milkyWayAlpha"
          hint={t('sky.layer.milkyWayHint')}
        />
        <Row id="altAzGrid" label={t('sky.layer.altAzGrid')} />
        <Row id="equator" label={t('sky.layer.equator')} />
        <Row id="ecliptic" label={t('sky.layer.ecliptic')} />
        <Row id="meridian" label={t('sky.layer.meridian')} />
        <div className="px-4 py-3">
          <label
            htmlFor="layer-ground-transparency"
            className="flex justify-between gap-2 text-body"
          >
            <span>{t('sky.layer.groundTransparency')}</span>
            <span className="tabular-nums">{Math.round((1 - groundOpacity) * 100)}%</span>
          </label>
          <input
            id="layer-ground-transparency"
            data-testid="layer-ground-transparency"
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round((1 - groundOpacity) * 100)}
            onChange={(e) => set('groundOpacity', 1 - Number(e.target.value) / 100)}
            className="min-h-11 w-full"
          />
          <p className="text-caption text-muted">{t('sky.layer.groundTransparencyHint')}</p>
        </div>
        <Row id="landscape" label={t('nightRefresh.landscape')} />
        <p className="px-4 pb-2 text-caption text-muted">{t('nightRefresh.landscapeHelp')}</p>
        <button
          type="button"
          onClick={() => navigate('profile')}
          className="mx-4 mb-3 min-h-11 rounded-xl bg-surface-2 px-4 text-body-sm text-accent"
        >
          {t('personal.garden')} <span aria-hidden="true">↗</span>
        </button>
        <Row id="atmosphere" label={t('sky.layer.atmosphere')} />
        <Row id="extinction" label={t('sky.layer.extinction')} />
        <Row id="magnifyBodies" label={t('sky.layer.magnifyBodies')} />
        <Row id="showViewInfo" label={t('sky.layer.viewInfo')} />
        <div className="px-4 pt-2">
          <label htmlFor="layer-saturation" className="block text-body">
            {t('sky.layer.starSaturation')}
          </label>
          <input
            id="layer-saturation"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={saturation}
            onChange={(e) => set('starSaturation', Number(e.target.value))}
            className="w-full"
          />
        </div>
        <Segmented
          label={t('sky.layer.labelLang')}
          value={labelLang}
          options={[
            { value: 'auto', label: t('sky.layer.labelLangAuto') },
            { value: 'ko', label: '한국어' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(v) => set('labelLang', v)}
        />
        <button
          type="button"
          data-testid="layer-reset"
          className="mx-4 mt-3 mb-4 flex min-h-11 w-[calc(100%-2rem)] items-center justify-center rounded-xl bg-surface-2 px-3 text-caption text-fg"
          onClick={() => useLayerStore.getState().reset()}
        >
          {t('sky.layer.reset')}
        </button>
      </ScrollArea>
    </div>
  );
}
