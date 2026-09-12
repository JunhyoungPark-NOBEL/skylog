import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { sensorManager } from '@/sensors/orientation/manager';
import { useSensorStore } from '@/state/sensorStore';
import { useLocationStore } from '@/state/locationStore';
import { ScrollArea } from '@/ui/ScrollArea';
import { RearCameraControls, RearCameraSettings } from './RearCameraView';
import type { RearCamera } from './useRearCamera';

/** 하늘 위에는 조작 하나씩만 남기고, 세부 설정은 요청할 때만 연다. */
export function SkySettings({
  camera,
  onStartCamera,
  onAlign,
  onClose,
}: {
  camera: RearCamera;
  onStartCamera(): void;
  onAlign(): void;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const mode = useSensorStore((s) => s.trackingMode);
  const active = useSensorStore((s) => s.arActive);
  const calibration = useSensorStore((s) => s.calibration);
  const site = useLocationStore((s) => s.site);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const setMode = (next: 'compass' | 'gyro') => {
    if (next === mode) return;
    useSensorStore.getState().setSetting('trackingMode', next);
    if (active) sensorManager.start();
  };
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="sky-settings-title"
      data-testid="sky-settings"
      className="fixed inset-0 m-auto h-[min(42rem,90dvh)] w-[min(26rem,94vw)] overflow-hidden rounded-3xl border border-hairline bg-surface p-0 text-fg shadow-sheet backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-hairline px-5 py-2">
          <h2 id="sky-settings-title" className="flex-1 text-title">
            {t('common.settings')}
          </h2>
          <button
            onClick={onClose}
            className="h-11 w-11 rounded-full"
            aria-label={t('common.close')}
            data-testid="close-sky-settings"
          >
            ✕
          </button>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-5 text-body-sm">
            <section>
              <h3 className="font-semibold">{t('skyTools.gps')}</h3>
              <p className="mt-2 text-caption leading-6 text-muted">{t('skyTools.gpsHint')}</p>
              <p className="mt-1 text-caption text-muted" data-testid="status-site">
                {site.name}
              </p>
              <fieldset className="mt-3" data-testid="sensor-settings">
                <legend className="sr-only">{t('field.trackingMethod')}</legend>
                {(['compass', 'gyro'] as const).map((value) => (
                  <label
                    key={value}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 has-checked:bg-accent-soft"
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
              <p className="mt-2 text-caption leading-6 text-muted">
                {t(mode === 'gyro' ? 'field.gyroHint' : 'field.compassHint')}
              </p>
              <p className="mt-2 text-caption leading-6 text-muted">
                {t('skyTools.stabilization')}
              </p>
              {calibration && (
                <p className="mt-2 text-caption" data-testid="alignment-setting-status">
                  {t('field.alignedWith', { target: calibration.targetName })}
                </p>
              )}
              {active && (
                <button
                  onClick={() => {
                    sensorManager.resumeNow();
                    onAlign();
                  }}
                  className="mt-3 min-h-11 w-full rounded-pill bg-surface-2 px-3"
                  data-testid="sensor-align-settings"
                >
                  {t('field.align')}
                </button>
              )}
            </section>
            <section className="border-t border-hairline pt-4">
              <h3 className="mb-3 font-semibold">{t('field.camera.settings')}</h3>
              <RearCameraControls camera={camera} onStart={onStartCamera} />
              <RearCameraSettings camera={camera} />
            </section>
            <button
              className="min-h-12 w-full rounded-pill bg-surface-2 px-3"
              onClick={() => navigate('settings')}
              data-testid="app-settings"
            >
              {t('skyTools.appSettings')} →
            </button>
          </div>
        </ScrollArea>
      </div>
    </dialog>
  );
}
