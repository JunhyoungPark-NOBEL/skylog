import { useTranslation } from 'react-i18next';
import { useLayerStore } from '@/state/layerStore';

/**
 * 하늘 설정의 "실제 하늘" 토글. 켜져 있으면 현재 한계등급을 함께 표시한다.
 * 한계등급 동기화는 패널이 닫혀 있을 때도 SkyView에서 계속 실행한다.
 */
export function RealSkyToggle() {
  const { t } = useTranslation();
  const realSky = useLayerStore((s) => s.realSky);
  const limitingMag = useLayerStore((s) => s.limitingMag);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={realSky}
      aria-label={t('realSky.toggle')}
      onClick={() => useLayerStore.getState().set('realSky', !realSky)}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left text-body text-fg"
      data-testid="real-sky-toggle"
      data-limiting-mag={limitingMag.toFixed(1)}
    >
      <span className="min-w-0 flex-1">
        <span className="block">{t('sky.layer.realSky')}</span>
        <span className="mt-0.5 block text-caption text-muted">{t('sky.layer.realSkyHint')}</span>
        {realSky && (
          <span className="text-caption text-accent tabular-nums">{limitingMag.toFixed(1)}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-8 w-[52px] shrink-0 rounded-pill ${realSky ? 'bg-accent' : 'bg-surface-3'}`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-pill transition-transform ${realSky ? 'translate-x-5 bg-accent-fg' : 'bg-fg/90'}`}
        />
      </span>
    </button>
  );
}
