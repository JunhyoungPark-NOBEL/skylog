import { useTranslation } from 'react-i18next';
import { useSensorStore } from '@/state/sensorStore';

/** 데스크톱 시뮬레이터 (task-02 §4.3): 슬라이더 값을 SimulatorProvider가 30Hz로 발행한다. */
export function SensorSimPanel() {
  const { t } = useTranslation();
  const sim = useSensorStore((s) => s.sim);
  const setSim = useSensorStore((s) => s.setSim);
  const absolute = (sim as { absolute?: boolean }).absolute ?? false;
  const row = (
    key: 'alpha' | 'beta' | 'gamma' | 'compassHeading' | 'compassAccuracy',
    min: number,
    max: number,
  ) => (
    <label className="flex items-center gap-2 text-[11px]">
      <span className="w-16 font-mono">
        {key === 'compassHeading' ? 'heading' : key === 'compassAccuracy' ? 'acc' : key}
      </span>
      <input
        id={`sim-${key}`}
        type="range"
        min={min}
        max={max}
        step={1}
        value={sim[key]}
        onChange={(e) => setSim({ [key]: Number(e.target.value) })}
        className="flex-1"
        data-testid={`sim-${key}`}
      />
      <span className="w-10 text-right font-mono">{sim[key]}</span>
    </label>
  );
  return (
    <div
      className="absolute left-2 top-16 z-10 w-[min(18rem,70vw)] rounded-xl border border-border bg-overlay p-2"
      data-testid="sim-panel"
    >
      <div className="mb-1 flex items-center text-[11px] font-semibold">
        <span className="flex-1">{t('sensor.simulator')}</span>
        <label className="flex items-center gap-1 font-normal">
          <input
            type="checkbox"
            checked={absolute}
            onChange={(e) => setSim({ absolute: e.target.checked } as never)}
            data-testid="sim-absolute"
          />
          absolute
        </label>
      </div>
      {row('alpha', 0, 360)}
      {row('beta', -180, 180)}
      {row('gamma', -90, 90)}
      {row('compassHeading', 0, 359)}
      {row('compassAccuracy', -1, 60)}
    </div>
  );
}
