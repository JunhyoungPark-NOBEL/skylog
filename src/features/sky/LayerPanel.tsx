import { useTranslation } from 'react-i18next';
import { useLayerStore, type BooleanLayerKey, type LayerValues } from '@/state/layerStore';
import { Segmented } from '@/ui/Segmented';
import { Toggle } from '@/ui/Toggle';

type AlphaKey = {
  [K in keyof LayerValues]: LayerValues[K] extends number ? K : never;
}[keyof LayerValues];

function Row({ id, label, alphaKey }: { id: BooleanLayerKey; label: string; alphaKey?: AlphaKey }) {
  const on = useLayerStore((s) => s[id]);
  const alpha = useLayerStore((s) => (alphaKey ? s[alphaKey] : 1));
  const set = useLayerStore((s) => s.set);
  return (
    <div>
      <Toggle id={`layer-${id}`} label={label} checked={on} onChange={(v) => set(id, v)} />
      {alphaKey && on && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={alpha}
          onChange={(e) => set(alphaKey, Number(e.target.value))}
          aria-label={`${label} opacity`}
          className="-mt-2 mb-1 ml-4 w-[calc(100%-2rem)]"
          data-testid={`layer-${alphaKey}`}
        />
      )}
    </div>
  );
}

/** 레이어 토글 패널 (task-01 §5). 값은 layerStore(Dexie 저장). */
export function LayerPanel({ onClose }: { onClose(): void }) {
  const { t } = useTranslation();
  const labelLang = useLayerStore((s) => s.labelLang);
  const saturation = useLayerStore((s) => s.starSaturation);
  const set = useLayerStore((s) => s.set);
  return (
    <div
      className="absolute inset-y-0 left-0 z-20 flex w-[min(20rem,85vw)] flex-col border-r border-border bg-overlay backdrop-blur-sm"
      data-testid="layer-panel"
      role="dialog"
      aria-label={t('sky.layers')}
    >
      <header className="safe-top flex min-h-12 shrink-0 items-center px-4">
        <h2 className="flex-1 text-sm font-semibold">{t('sky.layers')}</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 text-muted"
          aria-label={t('common.close')}
          data-testid="close-layers"
        >
          ✕
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pb-6 text-sm">
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
        <Row id="milkyWay" label={t('sky.layer.milkyWay')} alphaKey="milkyWayAlpha" />
        <Row id="altAzGrid" label={t('sky.layer.altAzGrid')} />
        <Row id="equator" label={t('sky.layer.equator')} />
        <Row id="ecliptic" label={t('sky.layer.ecliptic')} />
        <Row id="meridian" label={t('sky.layer.meridian')} />
        <Row id="ground" label={t('sky.layer.ground')} />
        <Row id="groundOpaque" label={t('sky.layer.groundOpaque')} />
        <Row id="atmosphere" label={t('sky.layer.atmosphere')} />
        <Row id="extinction" label={t('sky.layer.extinction')} />
        <Row id="magnifyBodies" label={t('sky.layer.magnifyBodies')} />
        <Row id="showViewInfo" label={t('sky.layer.viewInfo')} />
        <div className="px-4 pt-2">
          <label htmlFor="layer-saturation" className="block text-[15px]">
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
      </div>
    </div>
  );
}
