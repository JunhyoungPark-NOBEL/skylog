import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sensorManager } from '@/sensors/orientation/manager';
import { orientationEventsSupported, requestOrientationPermission } from '@/sensors/permissions';
import { requestWakeLock } from '@/sensors/wakeLock';
import { useSensorStore } from '@/state/sensorStore';
import { IconCompass } from '@/ui/icons';

/**
 * AR(센서) 모드 토글 (task-02 §3.6). 권한 요청은 이 버튼의 탭 핸들러 안에서만 한다(iOS).
 * 상태 배지: 소스(절대/나침반 동기/상대/보정됨/수동), 보정 상태, 간섭 경고. 수동 일시 정지 중에는 "센서 복귀".
 */
export function ArToggle({ onOpenWizard }: { onOpenWizard(): void }) {
  const { t } = useTranslation();
  const arActive = useSensorStore((s) => s.arActive);
  const source = useSensorStore((s) => s.headingSource);
  const calibration = useSensorStore((s) => s.calibration);
  const anomaly = useSensorStore((s) => s.anomaly);
  const paused = useSensorStore((s) => s.manualPauseUntil > 0 && s.headingSource === 'manual');
  const permission = useSensorStore((s) => s.permission);
  const simulator = useSensorStore((s) => s.simulator);
  const provider = useSensorStore((s) => s.provider);
  const [help, setHelp] = useState<string | null>(null);

  const supported = simulator || orientationEventsSupported();

  const toggle = async () => {
    const st = useSensorStore.getState();
    if (st.arActive) {
      sensorManager.stop();
      return;
    }
    if (!supported) {
      setHelp(t('sensor.unsupported'));
      return;
    }
    // 권한: 사용자 제스처 안에서, 불필요한 await 없이 즉시 호출
    const perm = st.simulator ? 'granted' : await requestOrientationPermission();
    st.patch({ permission: perm });
    if (perm === 'denied') {
      setHelp(t('sensor.permission.deniedHelp'));
      return;
    }
    setHelp(null);
    sensorManager.start();
    void requestWakeLock();
  };

  const sourceText = (() => {
    if (!arActive) return null;
    if (paused) return t('sensor.source.manual');
    if (calibration)
      return t('sensor.calibrated', {
        target: calibration.targetName,
        ago: agoText(calibration.at, t),
      });
    if (source === 'absolute') return t('sensor.source.absolute');
    if (source === 'compass-sync') return t('sensor.source.compassSync');
    if (source === 'relative') return t('sensor.source.relative');
    return t('sensor.source.none');
  })();

  return (
    <div
      className="absolute right-2 top-2 flex flex-col items-end gap-1"
      data-testid="ar-toggle-wrap"
    >
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={arActive}
        aria-label={t('sensor.ar')}
        data-testid="ar-toggle"
        className="flex h-11 w-11 items-center justify-center rounded-full border"
        style={{
          background: arActive ? 'var(--accent)' : 'var(--overlay)',
          color: arActive ? 'var(--accent-fg)' : 'var(--fg)',
          borderColor: paused ? 'var(--danger)' : 'var(--border)',
        }}
      >
        <IconCompass size={22} />
      </button>
      {sourceText && (
        <div
          className="max-w-[60vw] rounded-full bg-overlay px-2 py-1 text-right text-[11px]"
          data-testid="ar-status"
        >
          <span data-testid="ar-source">{sourceText}</span>
          {provider === 'Simulator' && <span className="text-muted"> · SIM</span>}
          {anomaly && (
            <span className="ml-1 text-danger" data-testid="ar-anomaly">
              ⚠ {t('sensor.anomaly')}
            </span>
          )}
        </div>
      )}
      {arActive && (
        <div className="flex gap-1">
          {paused && (
            <button
              type="button"
              onClick={() => sensorManager.resumeNow()}
              className="min-h-9 rounded-full bg-accent px-3 text-[12px] text-accent-fg"
              data-testid="ar-resume"
            >
              {t('sensor.resume')}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenWizard}
            className="min-h-9 rounded-full bg-overlay px-3 text-[12px]"
            data-testid="ar-align"
          >
            {calibration ? t('sensor.realign') : t('sensor.align')}
          </button>
        </div>
      )}
      {help && (
        <div
          role="alert"
          className="max-w-[70vw] rounded-xl border border-border bg-overlay p-3 text-xs"
          data-testid="ar-help"
        >
          {help}
          {permission === 'denied' && (
            <p className="mt-1 text-muted">{t('sensor.permission.deniedIosSteps')}</p>
          )}
          <button
            type="button"
            onClick={() => setHelp(null)}
            className="mt-2 min-h-9 rounded-full bg-surface-2 px-3"
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
