import { useTranslation } from 'react-i18next';
import { useRealSkySync } from '@/features/sky/useRealSkySync';
import { useLayerStore } from '@/state/layerStore';

/** 하늘 뷰의 둥근 "실제 하늘" 토글 버튼(task-03 §3.9). 켜져 있으면 현재 한계등급을 함께 표시. */
export function RealSkyToggle() {
  const { t } = useTranslation();
  const realSky = useLayerStore((s) => s.realSky);
  const limitingMag = useLayerStore((s) => s.limitingMag);
  useRealSkySync();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={realSky}
      aria-label={t('realSky.toggle')}
      onClick={() => useLayerStore.getState().set('realSky', !realSky)}
      className="flex min-h-9 items-center gap-1.5 rounded-pill border px-3 text-xs font-semibold backdrop-blur-sm"
      style={{
        background: realSky ? 'var(--accent)' : 'var(--overlay)',
        color: realSky ? 'var(--accent-fg)' : 'var(--fg)',
        borderColor: realSky ? 'var(--accent)' : 'var(--border)',
      }}
      data-testid="real-sky-toggle"
      data-limiting-mag={limitingMag.toFixed(1)}
    >
      <span aria-hidden>◐</span>
      {t('realSky.short')}
      {realSky && <span className="font-mono opacity-80">{limitingMag.toFixed(1)}</span>}
    </button>
  );
}
