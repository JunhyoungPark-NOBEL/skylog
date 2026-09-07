import { useTranslation } from 'react-i18next';
import { useSensorStore } from '@/state/sensorStore';

/**
 * 데스크톱 시뮬레이터 (task-02 §4.3): 슬라이더 값을 SimulatorProvider가 30Hz로 발행한다.
 * 왼쪽 레이어 버튼 아래(HUD 둘째 줄)에 떠 있는 불투명 카드.
 */
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
    <label className="flex min-h-7 items-center gap-2 text-caption">
      <span className="w-16 text-muted">
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
        className="min-w-0 flex-1"
        data-testid={`sim-${key}`}
      />
      <span className="w-10 text-right tabular-nums">{sim[key]}</span>
    </label>
  );
  return (
    <div
      className="absolute left-3 top-[calc(var(--status-height)+env(safe-area-inset-top)+124px)] z-10 w-[min(18rem,70vw)] rounded-2xl bg-surface p-3 text-caption text-fg shadow-float squircle"
      data-testid="sim-panel"
    >
      <div className="mb-2 flex items-center gap-2 text-body-sm font-semibold">
        <span className="flex-1">{t('sensor.simulator')}</span>
        <label className="flex min-h-7 items-center gap-1.5 text-caption font-normal">
          <input
            type="checkbox"
            checked={absolute}
            onChange={(e) => setSim({ absolute: e.target.checked } as never)}
            className="accent-accent"
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
