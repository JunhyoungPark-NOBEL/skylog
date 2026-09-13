import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sensorManager } from '@/sensors/orientation/manager';
import { useSensorStore } from '@/state/sensorStore';
import { useLocationStore } from '@/state/locationStore';
import { ScrollArea } from '@/ui/ScrollArea';
import { RearCameraSettings } from './RearCameraView';
import { LayerPanel } from './LayerPanel';
import { SettingsContent } from '@/features/settings/SettingsScreen';
import type { RearCamera } from './useRearCamera';

/** 하늘 위에는 조작 하나씩만 남기고, 세부 설정은 요청할 때만 연다. */
export function SkySettings({
  camera,
  onOverview,
  onAlign,
  onClose,
}: {
  camera: RearCamera;
  onOverview(): void;
  onAlign(): void;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const [section, setSection] = useState<'sky' | 'gps' | 'app'>('sky');
  const startup = useSensorStore((s) => s.startup);
  const source = useSensorStore((s) => s.headingSource);
  const anomaly = useSensorStore((s) => s.anomaly);
  const permission = useSensorStore((s) => s.permission);
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
        <div
          className="flex shrink-0 gap-1 border-b border-hairline px-3 py-2"
          role="tablist"
          aria-label={t('compactSky.settingsSections')}
        >
          {(['sky', 'gps', 'app'] as const).map((value) => (
            <button
              type="button"
              role="tab"
              key={value}
              aria-selected={section === value}
              id={`settings-tab-${value}`}
              aria-controls="sky-settings-content"
              className="min-h-11 flex-1 rounded-pill px-3 text-body-sm aria-selected:bg-accent-soft aria-selected:text-accent"
              data-testid={value === 'app' ? 'app-settings' : `settings-${value}`}
              onClick={() => setSection(value)}
            >
              {t(`compactSky.section.${value}`)}
            </button>
          ))}
        </div>
        <ScrollArea key={section} className="min-h-0 flex-1" data-testid="settings-scroll">
          <div
            id="sky-settings-content"
            role="tabpanel"
            aria-labelledby={`settings-tab-${section}`}
            className="pb-5 text-body-sm"
          >
            {section === 'sky' && (
              <>
                <LayerPanel embedded onClose={onClose} onAlign={onAlign} onOverview={onOverview} />
                <div className="mx-4">
                  <RearCameraSettings camera={camera} />
                </div>
              </>
            )}
            {section === 'app' && <SettingsContent />}
            {section === 'gps' && (
              <div className="space-y-5 p-5">
                <section>
                  <h3 className="font-semibold">GPS</h3>
                  <p
                    className="mt-2 text-caption leading-6 text-muted"
                    data-testid="sensor-connection-status"
                  >
                    {t(
                      startup === 'unavailable'
                        ? 'sensorAuto.unavailable'
                        : startup === 'permission-required'
                          ? 'field.permissionHint'
                          : active
                            ? 'sensorAuto.on'
                            : 'sensor.ar',
                    )}
                    {permission === 'denied' && ` ${t('sensor.permission.deniedHelp')}`}
                  </p>
                  {active && (source === 'relative' || anomaly) && (
                    <p className="mt-2 text-caption text-accent" data-testid="ar-source">
                      {t(source === 'relative' ? 'field.gyroAlign' : 'field.directionUncertain')}
                    </p>
                  )}
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
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </dialog>
  );
}
