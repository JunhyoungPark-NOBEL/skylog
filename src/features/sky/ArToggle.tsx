import { emitSkill } from '@/learn/runtime';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sensorManager } from '@/sensors/orientation/manager';
import { orientationEventsSupported } from '@/sensors/permissions';
import {
  disableSkyOrientation,
  enableSkyOrientationFromGesture,
} from '@/sensors/orientation/autoStart';
import { useSensorStore } from '@/state/sensorStore';
import { IconCompass } from '@/ui/icons';

/** 엄지가 닿는 하단: 주 조작 하나 + 필요할 때 여는 추적/보정 설정. */
export function ArToggle({ onAlign }: { onAlign(): void }) {
  const { t } = useTranslation();
  const active = useSensorStore((s) => s.arActive);
  const source = useSensorStore((s) => s.headingSource);
  const anomaly = useSensorStore((s) => s.anomaly);
  const paused = useSensorStore((s) => s.manualPauseUntil > 0);
  const permission = useSensorStore((s) => s.permission);
  const simulator = useSensorStore((s) => s.simulator);
  const mode = useSensorStore((s) => s.trackingMode);
  const startup = useSensorStore((s) => s.startup);
  const [help, setHelp] = useState<string | null>(null);
  const tracking = active && !paused;
  const toggle = async () => {
    if (active && paused) {
      sensorManager.resumeNow();
      return;
    }
    if (active) {
      disableSkyOrientation();
      setHelp(null);
      return;
    }
    if (!simulator && !orientationEventsSupported()) {
      setHelp(t('sensor.unsupported'));
      return;
    }
    const result = await enableSkyOrientationFromGesture();
    if (result === 'denied') {
      setHelp(t('sensor.permission.deniedHelp'));
      return;
    }
    if (result !== 'granted') return;
    setHelp(null);
    if (useSensorStore.getState().arActive && !simulator) void emitSkill('arMode');
  };
  const align = () => {
    sensorManager.resumeNow();
    onAlign();
  };
  const sourceText =
    !paused && source === 'relative'
      ? t('field.gyroAlign')
      : !paused && anomaly
        ? t('field.directionUncertain')
        : null;

  return (
    <div className="pointer-events-none flex w-full flex-col gap-2">
      <div className="order-2 flex items-center justify-end gap-2">
        <div
          className="pointer-events-auto flex min-w-0 items-center gap-2"
          data-testid="ar-toggle-wrap"
        >
          <button
            type="button"
            onClick={() => void toggle()}
            aria-pressed={tracking}
            aria-label={t(tracking ? 'sensorAuto.turnOff' : 'sensor.ar')}
            data-testid="ar-toggle"
            className="flex min-h-12 min-w-0 items-center gap-2 rounded-pill glass-hud px-3 text-body-sm font-semibold shadow-float aria-pressed:bg-accent-soft aria-pressed:text-accent"
          >
            <IconCompass size={22} />
            <span className="min-w-0 truncate">
              {t(
                startup === 'starting'
                  ? 'sensorAuto.connecting'
                  : tracking
                    ? 'sensorAuto.on'
                    : 'field.sensorOn',
              )}
            </span>
          </button>
        </div>
      </div>
      {(sourceText ||
        help ||
        (!active && (startup === 'unavailable' || startup === 'permission-required'))) && (
        <div
          className="pointer-events-auto order-1 max-h-[28dvh] overflow-y-auto rounded-2xl glass-strong p-3 text-body-sm shadow-float"
          data-testid="ar-status"
        >
          {sourceText && (
            <p data-testid="ar-source" className="text-caption">
              {sourceText}
            </p>
          )}
          {anomaly && (
            <p data-testid="ar-anomaly" className="mt-1 text-caption text-muted">
              {t('field.correctionHint')}
            </p>
          )}
          {active && !paused && (source === 'relative' || anomaly) && (
            <button
              type="button"
              onClick={align}
              className="mt-2 min-h-11 rounded-pill bg-accent-soft px-4 text-accent"
              data-testid="sensor-align"
            >
              {t('field.align')}
            </button>
          )}
          {!active && startup === 'unavailable' && (
            <p data-testid="ar-start-help">
              {t(mode === 'gyro' ? 'field.gyroUnavailable' : 'sensorAuto.unavailable')}
            </p>
          )}
          {!active && startup === 'permission-required' && (
            <p data-testid="ar-start-help">{t('field.permissionHint')}</p>
          )}
          {help && (
            <p role="alert" data-testid="ar-help">
              {help}
              {permission === 'denied' && ` ${t('sensor.permission.deniedIosSteps')}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
