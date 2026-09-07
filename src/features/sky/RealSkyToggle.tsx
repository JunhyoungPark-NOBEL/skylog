import { useTranslation } from 'react-i18next';
import { useRealSkySync } from '@/features/sky/useRealSkySync';
import { useLayerStore } from '@/state/layerStore';

/**
 * 하늘 뷰의 떠 있는 "실제 하늘" 토글(task-03 §3.9). 켜져 있으면 현재 한계등급을 함께 표시한다
 * (색만이 아니라 숫자·굵기로도 상태를 전달). 위치는 SkyView의 하단 스택(시간 바 위)이 정한다.
 */
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
      className="pointer-events-auto inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill glass px-4 text-body-sm font-medium text-fg shadow-float transition-[transform,background-color,color] duration-150 ease-standard active:scale-95 aria-checked:bg-accent-soft aria-checked:font-semibold aria-checked:text-accent"
      data-testid="real-sky-toggle"
      data-limiting-mag={limitingMag.toFixed(1)}
    >
      <span aria-hidden>◐</span>
      {t('realSky.short')}
      {realSky && <span className="tabular-nums">{limitingMag.toFixed(1)}</span>}
    </button>
  );
}
