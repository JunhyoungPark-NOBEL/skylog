import { emitSkill } from '@/learn/runtime';
import { useTranslation } from 'react-i18next';
import { sensorManager } from '@/sensors/orientation/manager';
import { orientationEventsSupported } from '@/sensors/permissions';
import {
  disableSkyOrientation,
  enableSkyOrientationFromGesture,
} from '@/sensors/orientation/autoStart';
import { useSensorStore } from '@/state/sensorStore';

/** 엄지가 닿는 하단: 주 조작 하나 + 필요할 때 여는 추적/보정 설정. */
export function ArToggle() {
  const { t } = useTranslation();
  const active = useSensorStore((s) => s.arActive);
  const paused = useSensorStore((s) => s.manualPauseUntil > 0);
  const simulator = useSensorStore((s) => s.simulator);
  const startup = useSensorStore((s) => s.startup);
  const tracking = active && !paused;
  const toggle = async () => {
    if (active && paused) {
      sensorManager.resumeNow();
      return;
    }
    if (active) {
      disableSkyOrientation();
      return;
    }
    if (!simulator && !orientationEventsSupported()) {
      useSensorStore.getState().patch({ startup: 'unavailable', permission: 'unsupported' });
      return;
    }
    const result = await enableSkyOrientationFromGesture();
    if (result === 'denied') {
      return;
    }
    if (result !== 'granted') return;
    if (useSensorStore.getState().arActive && !simulator) void emitSkill('arMode');
  };
  return (
    <div className="pointer-events-auto flex justify-center" data-testid="ar-toggle-wrap">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={tracking}
        aria-busy={startup === 'starting'}
        aria-label={t(tracking ? 'sensorAuto.turnOff' : 'sensor.ar')}
        title={t(tracking ? 'sensorAuto.turnOff' : 'sensor.ar')}
        data-testid="ar-toggle"
        className="flex h-[48px] min-w-[64px] items-center justify-center gap-1.5 rounded-pill glass-hud px-3 text-body-sm font-semibold shadow-float aria-pressed:bg-accent-soft aria-pressed:text-accent"
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${tracking ? 'bg-accent' : 'bg-muted'} ${startup === 'starting' ? 'animate-pulse motion-reduce:animate-none' : ''}`}
        />
        GPS
      </button>
    </div>
  );
}
