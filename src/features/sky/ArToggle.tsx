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

/**
 * AR(센서) 모드 토글 (task-02 §3.6). 권한 요청은 이 버튼의 탭 핸들러 안에서만 한다(iOS).
 * 상태 배지: 소스(절대/나침반 동기/상대/보정됨/수동), 보정 상태, 간섭 경고. 수동 일시 정지 중에는 "센서 복귀".
 * 정상 추종은 버튼 하나만 보이고, 권한·간섭·수동 일시 정지처럼 필요한 상태만 펼친다.
 */
export function ArToggle() {
  const { t } = useTranslation();
  const arActive = useSensorStore((s) => s.arActive);
  const source = useSensorStore((s) => s.headingSource);
  const calibration = useSensorStore((s) => s.calibration);
  const anomaly = useSensorStore((s) => s.anomaly);
  const paused = useSensorStore((s) => s.manualPauseUntil > 0 && s.headingSource === 'manual');
  const permission = useSensorStore((s) => s.permission);
  const simulator = useSensorStore((s) => s.simulator);
  const provider = useSensorStore((s) => s.provider);
  const startup = useSensorStore((s) => s.startup);
  const autoStart = useSensorStore((s) => s.autoStart);
  const [help, setHelp] = useState<string | null>(null);

  const supported = simulator || orientationEventsSupported();

  const toggle = async () => {
    const st = useSensorStore.getState();
    if (st.arActive) {
      disableSkyOrientation();
      setHelp(null);
      return;
    }
    if (!supported) {
      setHelp(t('sensor.unsupported'));
      return;
    }
    // 권한: 사용자 제스처 안에서, 불필요한 await 없이 즉시 호출
    const perm = await enableSkyOrientationFromGesture();
    if (perm === null) return;
    if (perm === 'denied') {
      setHelp(t('sensor.permission.deniedHelp'));
      return;
    }
    setHelp(null);
    if (useSensorStore.getState().arActive && !st.simulator) void emitSkill('arMode');
  };

  const sourceText = (() => {
    if (startup === 'starting') return t('sensorAuto.connecting');
    if (!arActive) return null;
    if (paused) return t('sensor.source.manual');
    if (calibration)
      return t('sensor.calibrated', {
        target: calibration.targetName,
        ago: agoText(calibration.at, t),
      });
    if (source === 'absolute') return anomaly ? t('sensor.source.absolute') : null;
    if (source === 'compass-sync') return anomaly ? t('sensor.source.compassSync') : null;
    if (source === 'relative') return t('sensorAuto.compassHelp');
    return t('sensor.source.none');
  })();
  const needsTap =
    !arActive && autoStart && (startup === 'permission-required' || startup === 'unavailable');

  return (
    <div
      className="absolute right-[12px] top-[calc(var(--status-height)+env(safe-area-inset-top)+12px)] z-10 flex flex-col items-end gap-[8px]"
      data-testid="ar-toggle-wrap"
    >
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={arActive}
        aria-label={t(
          arActive
            ? 'sensorAuto.turnOff'
            : needsTap
              ? permission === 'denied' || startup === 'unavailable'
                ? 'sensorAuto.retry'
                : 'sensorAuto.enable'
              : 'sensor.ar',
        )}
        data-testid="ar-toggle"
        className={`flex min-h-[44px] ${arActive || needsTap ? 'max-w-[70vw] gap-[8px] px-[12px] py-[8px] text-caption font-semibold' : 'h-[44px] w-[44px]'} items-center justify-center rounded-pill glass-hud text-fg transition-[transform,background-color,color] duration-150 ease-standard active:scale-95 aria-pressed:bg-accent-soft aria-pressed:text-accent ${
          paused ? 'shadow-[inset_0_0_0_1.5px_var(--danger),var(--elev-float)]' : 'shadow-float'
        }`}
      >
        <IconCompass size={22} />
        {arActive && <span>{t('sensorAuto.on')}</span>}
        {needsTap && (
          <span>
            {t(
              permission === 'denied' || startup === 'unavailable'
                ? 'sensorAuto.retry'
                : 'sensorAuto.enable',
            )}
          </span>
        )}
      </button>
      {needsTap && !help && (
        <p
          className="max-w-[65vw] rounded-xl glass-sm px-3 py-2 text-right text-caption leading-5 text-muted"
          data-testid="ar-start-help"
        >
          {t(
            permission === 'denied'
              ? 'sensor.permission.deniedHelp'
              : startup === 'unavailable'
                ? 'sensorAuto.unavailable'
                : 'sensorAuto.permissionHelp',
          )}
        </p>
      )}
      {sourceText && (
        <div
          className="max-w-[60vw] rounded-pill glass px-3 py-1.5 text-right text-caption text-fg shadow-float"
          data-testid="ar-status"
        >
          <span data-testid="ar-source">{sourceText}</span>
          {provider === 'Simulator' && <span className="text-fg/60"> · SIM</span>}
          {anomaly && (
            <span className="ml-1 font-medium text-danger" data-testid="ar-anomaly">
              ⚠ {t('sensor.anomaly')}
            </span>
          )}
        </div>
      )}
      {arActive && paused && (
        <div className="flex gap-2">
          {paused && (
            <button
              type="button"
              onClick={() => sensorManager.resumeNow()}
              className="inline-flex min-h-9 items-center justify-center rounded-pill bg-accent px-3.5 text-caption font-semibold text-accent-fg shadow-float transition-transform duration-150 ease-standard active:scale-[0.97]"
              data-testid="ar-resume"
            >
              {t('sensor.resume')}
            </button>
          )}
        </div>
      )}
      {help && (
        <div
          role="alert"
          className="max-h-[35dvh] max-w-[70vw] overflow-y-auto overscroll-contain rounded-md bg-surface p-[12px] text-caption text-fg shadow-float squircle"
          data-testid="ar-help"
        >
          {help}
          {permission === 'denied' && (
            <p className="mt-1 text-muted">{t('sensor.permission.deniedIosSteps')}</p>
          )}
          <button
            type="button"
            onClick={() => setHelp(null)}
            className="mt-[8px] inline-flex min-h-[44px] items-center justify-center rounded-pill bg-surface-3 px-[14px] text-caption font-medium text-fg transition-transform duration-150 ease-standard active:scale-[0.97]"
          >
            {t('common.close')}
          </button>
        </div>
      )}
    </div>
  );
}

function agoText(at: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  const min = Math.max(0, Math.round((Date.now() - at) / 60_000));
  return min < 1 ? t('sensor.justNow') : t('sensor.minutesAgo', { min });
}
