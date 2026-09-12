import { emitSkill } from '@/learn/runtime';
import { useState, type ReactNode } from 'react';
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
export function ArToggle({
  onAlign,
  cameraControl,
}: {
  onAlign(): void;
  cameraControl: ReactNode;
}) {
  const { t } = useTranslation();
  const active = useSensorStore((s) => s.arActive);
  const source = useSensorStore((s) => s.headingSource);
  const calibration = useSensorStore((s) => s.calibration);
  const anomaly = useSensorStore((s) => s.anomaly);
  const paused = useSensorStore((s) => s.manualPauseUntil > 0);
  const permission = useSensorStore((s) => s.permission);
  const simulator = useSensorStore((s) => s.simulator);
  const mode = useSensorStore((s) => s.trackingMode);
  const startup = useSensorStore((s) => s.startup);
  const [settings, setSettings] = useState(false);
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
    setSettings(false);
    onAlign();
  };
  const setMode = (next: 'compass' | 'gyro') => {
    if (next === mode) return;
    useSensorStore.getState().setSetting('trackingMode', next);
    if (active) sensorManager.start();
  };
  const sourceText = paused
    ? t('field.manual')
    : calibration && settings
      ? t('field.alignedWith', { target: calibration.targetName })
      : source === 'relative'
        ? t('field.gyroAlign')
        : anomaly
          ? t('field.directionUncertain')
          : null;

  return (
    <div className="pointer-events-none flex w-full flex-col gap-2">
      <div className="order-2 flex items-center justify-between gap-2">
        {cameraControl}
        <div
          className="pointer-events-auto flex min-w-0 items-center gap-2"
          data-testid="ar-toggle-wrap"
        >
          <button
            type="button"
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill glass-hud text-body-lg"
            aria-label={t('field.sensorSettings')}
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
            data-testid="sensor-settings-toggle"
          >
            ⋯
          </button>
          <button
            type="button"
            onClick={() => void toggle()}
            aria-pressed={tracking}
            aria-label={t(tracking ? 'sensorAuto.turnOff' : paused ? 'sensor.resume' : 'sensor.ar')}
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
                    : paused
                      ? 'field.sensorResume'
                      : 'field.sensorOn',
              )}
            </span>
          </button>
        </div>
      </div>
      {(settings ||
        sourceText ||
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
          {active && paused && (
            <button
              type="button"
              onClick={() => sensorManager.resumeNow()}
              className="mt-2 min-h-11 rounded-pill bg-accent-soft px-4 text-accent"
              data-testid="ar-resume"
            >
              {t('sensor.resume')}
            </button>
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
          {settings && (
            <div className="mt-2 space-y-2" data-testid="sensor-settings">
              <fieldset>
                <legend className="mb-2 font-semibold">{t('field.trackingMethod')}</legend>
                {(['compass', 'gyro'] as const).map((value) => (
                  <label
                    key={value}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-2 has-checked:bg-accent-soft"
                  >
                    <input
                      type="radio"
                      name="tracking-method"
                      checked={mode === value}
                      onChange={() => setMode(value)}
                      data-testid={`sensor-mode-${value}`}
                    />
                    {t(`field.mode.${value}`)}
                  </label>
                ))}
              </fieldset>
              <p className="text-caption text-muted">
                {t(mode === 'gyro' ? 'field.gyroHint' : 'field.compassHint')}
              </p>
              {active && (
                <button
                  type="button"
                  onClick={align}
                  className="min-h-11 w-full rounded-pill bg-surface-3 px-3"
                  data-testid="sensor-align-settings"
                >
                  {t('field.align')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
