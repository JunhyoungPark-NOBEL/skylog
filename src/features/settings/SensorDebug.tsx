import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore } from '@/state/sensorStore';
import { Segmented } from '@/ui/Segmented';
import { Toggle } from '@/ui/Toggle';

const f = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined ? '—' : v.toFixed(d);

/** 센서 디버그 패널 (task-02 §3.7): 원시값·Provider·필터 후·δ·주기·위치 + "복사" 덤프. 설정 토글 포함. */
export function SensorDebugScreen({ onBack }: { onBack(): void }) {
  const { t } = useTranslation();
  const s = useSensorStore();
  const loc = useLocationStore();
  const [copied, setCopied] = useState(false);
  // 시각·경과 시간은 렌더 중 impure 호출 대신 1초 틱 상태로
  const [tick, setTick] = useState({ epoch: 0, perf: 0 });
  useEffect(() => {
    const update = () => setTick({ epoch: Date.now(), perf: performance.now() });
    const id = window.setInterval(update, 1000);
    const first = window.setTimeout(update, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, []);

  const dump = [
    `skylog sensor dump ${tick.epoch ? new Date(tick.epoch).toISOString() : ''}`,
    `ua: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
    `standalone: ${typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches}`,
    `screen.orientation: ${s.raw.screenAngle}`,
    `provider: ${s.provider} permission: ${s.permission} arActive: ${s.arActive}`,
    `raw: alpha=${f(s.raw.alpha, 2)} beta=${f(s.raw.beta, 2)} gamma=${f(s.raw.gamma, 2)} absolute=${s.raw.absolute}`,
    `compass: heading=${f(s.raw.compassHeading, 2)} accuracy=${f(s.raw.compassAccuracy, 1)}`,
    `filtered: az=${f(s.filtered.azDeg, 2)} alt=${f(s.filtered.altDeg, 2)} roll=${f(s.filtered.rollDeg, 2)}`,
    `delta: ${f(s.deltaAzDeg, 2)} pitchOffset: ${f(s.pitchOffsetDeg, 2)} source: ${s.headingSource} anomaly: ${s.anomaly}`,
    `calibration: ${s.calibration ? `${s.calibration.targetName} δ=${s.calibration.deltaAzDeg.toFixed(2)} at ${new Date(s.calibration.at).toISOString()} residual=${s.calibration.residualDeg.toFixed(2)}` : 'none'}`,
    `declination: ${f(s.declinationDeg, 2)} applied=${s.applyDeclination} compassAxis=${s.compassAxis} keepLevel=${s.keepLevel}`,
    `eventHz: ${f(s.eventHz, 1)} lastSampleAge: ${s.lastSampleMs && tick.perf ? Math.round(tick.perf - s.lastSampleMs) : '—'} ms`,
    `location: ${loc.site.name} ${loc.site.lat.toFixed(5)},${loc.site.lon.toFixed(5)} elev=${loc.site.elevation} source=${loc.source} acc=${f(loc.accuracyM, 0)} gps=${s.gps.status} ${s.gps.error ?? ''}`,
  ].join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(dump);
      setCopied(true);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = dump;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopied(true);
    }
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScreenFrame title={t('sensor.debug.title')} onBack={onBack} testId="sensor-debug">
      <pre
        className="mx-4 mt-4 overflow-x-auto whitespace-pre-wrap rounded-md bg-surface-2 px-3.5 py-3 font-mono text-caption leading-relaxed text-fg tabular-nums"
        data-testid="sensor-dump"
      >
        {dump}
      </pre>
      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill bg-accent px-5 text-body font-semibold text-accent-fg transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97] disabled:opacity-40"
          data-testid="sensor-copy"
        >
          {copied ? t('sensor.debug.copied') : t('sensor.debug.copy')}
        </button>
      </div>

      <h2 className="px-5 pb-2 pt-6 text-body-sm font-semibold text-muted">
        {t('sensor.debug.settings')}
      </h2>
      <div className="mx-4 overflow-hidden rounded-lg bg-surface squircle [&>*+*]:hairline-t">
        <Toggle
          id="sensor-declination"
          label={t('sensor.settings.declination')}
          hint={t('sensor.settings.declinationHint', { d: f(s.declinationDeg, 1) })}
          checked={s.applyDeclination}
          onChange={(v) => s.setSetting('applyDeclination', v)}
        />
        <Toggle
          id="sensor-keeplevel"
          label={t('sensor.settings.keepLevel')}
          hint={t('sensor.settings.keepLevelHint')}
          checked={s.keepLevel}
          onChange={(v) => s.setSetting('keepLevel', v)}
        />
        <Toggle
          id="sensor-sound"
          label={t('sensor.settings.sound')}
          checked={s.sound}
          onChange={(v) => s.setSetting('sound', v)}
        />
        <Segmented
          label={t('sensor.settings.compassAxis')}
          value={s.compassAxis}
          options={[
            { value: 'top', label: t('sensor.settings.axisTop') },
            { value: 'back', label: t('sensor.settings.axisBack') },
          ]}
          onChange={(v) => s.setSetting('compassAxis', v)}
        />
        <Toggle
          id="sensor-simulator"
          label={t('sensor.simulator')}
          hint={t('sensor.simulatorHint')}
          checked={s.simulator}
          onChange={(v) => s.setSetting('simulator', v)}
        />
      </div>
    </ScreenFrame>
  );
}
