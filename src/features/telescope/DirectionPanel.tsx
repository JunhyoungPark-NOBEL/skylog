import { useTranslation } from 'react-i18next';
import type { pointingDelta, equatorialDelta } from '@/astro/pointing';
import { EQUIPMENT_BUTTON as BTN } from './styles';

/** 정렬 전에는 다음 행동, 정렬 후에는 이동 방향을 같은 위치에 보여 준다. */
export function DirectionPanel({
  delta,
  eq,
  mount,
  inside,
  status,
  hasTarget,
  onStart,
  onAlign,
  onChart,
}: {
  delta: ReturnType<typeof pointingDelta> | null;
  eq: ReturnType<typeof equatorialDelta> | null;
  mount: 'altaz' | 'eq' | 'goto';
  inside: boolean;
  status: string;
  hasTarget: boolean;
  onStart(): void;
  onAlign(): void;
  onChart(): void;
}) {
  const { t } = useTranslation();
  const ready = !!delta && status === 'active';
  const horizontal = mount === 'eq' ? (eq?.haDeg ?? 0) : (delta?.azDeg ?? 0);
  const vertical = mount === 'eq' ? (eq?.decDeg ?? 0) : (delta?.altDeg ?? 0);
  const rotation = delta ? (Math.atan2(delta.horizontalDeg, delta.altDeg) * 180) / Math.PI : 0;
  return (
    <section
      className="rounded-3xl border border-accent/30 bg-accent-soft p-5"
      data-testid="direction-panel"
    >
      <p className="text-caption font-semibold text-accent">
        {t(ready ? 'guideFlow.stepMove' : 'guideFlow.stepPrepare')}
      </p>
      {!ready ? (
        <>
          <h2 className="mt-2 text-title">
            {t(
              !hasTarget
                ? 'guideFlow.needTarget'
                : status === 'active'
                  ? 'guideFlow.needStar'
                  : 'guideFlow.needSensor',
            )}
          </h2>
          <p className="my-3 text-body-sm leading-6 text-muted">
            {t(status === 'active' ? 'guideFlow.starHelp' : 'guideFlow.sensorHelp')}
          </p>
          {hasTarget && (
            <button
              className={BTN + ' w-full'}
              data-testid={status === 'active' ? 'direction-align' : 'guide-sensor'}
              disabled={status === 'waiting'}
              onClick={status === 'active' ? onAlign : onStart}
            >
              {t(
                status === 'active'
                  ? 'guideFlow.alignNow'
                  : status === 'waiting'
                    ? 'guide.waiting'
                    : 'guideFlow.start',
              )}
            </button>
          )}
          {(status === 'denied' || status === 'unavailable') && (
            <p role="alert" className="mt-3 text-body-sm">
              {t('guide.sensorUnavailable')}
            </p>
          )}
        </>
      ) : (
        <>
          <h2 className="mt-2 text-title" data-testid="direction-action">
            {t(
              inside
                ? 'guideFlow.near'
                : delta.nearZenith
                  ? 'guide.zenith'
                  : 'guideFlow.moveSlowly',
            )}
          </h2>
          <div className="my-3 flex items-center gap-5" data-testid="guide-arrows">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-bg/50 text-accent"
              aria-hidden
            >
              {inside ? (
                <span className="text-5xl">◎</span>
              ) : (
                <svg
                  viewBox="0 0 64 64"
                  className="h-16 w-16"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <path
                    d="M32 55V10M12 30l20-20 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1 tabular-nums">
              <p
                className="text-[32px] leading-tight font-semibold"
                data-testid="direction-horizontal"
              >
                {delta.nearZenith
                  ? '—'
                  : t(
                      mount === 'eq'
                        ? horizontal >= 0
                          ? 'guideFlow.west'
                          : 'guideFlow.east'
                        : horizontal >= 0
                          ? 'guideFlow.right'
                          : 'guideFlow.left',
                      {
                        value: (mount === 'eq'
                          ? Math.abs(horizontal) * 4
                          : Math.abs(horizontal)
                        ).toFixed(1),
                      },
                    )}
              </p>
              <p
                className="text-[32px] leading-tight font-semibold"
                data-testid="direction-vertical"
              >
                {t(vertical >= 0 ? 'guideFlow.up' : 'guideFlow.down', {
                  value: Math.abs(vertical).toFixed(1),
                })}
              </p>
            </div>
          </div>
          <p className="text-body-sm text-muted">
            {t(mount === 'eq' ? 'guide.eqHelp' : 'guide.azHelp')}
          </p>
          <p className="mt-3 text-title text-accent" data-testid="guide-separation">
            {t('guide.separation', { value: delta.separationDeg.toFixed(1) })}
          </p>
          {inside && <p className="mt-2 text-body-sm leading-6">{t('guideFlow.nearHelp')}</p>}
          <button className={BTN + ' mt-4 w-full'} onClick={onChart}>
            {t('guideFlow.openChart')}
          </button>
          <button className="mt-1 min-h-11 w-full text-body-sm text-accent" onClick={onAlign}>
            {t('guide.align')}
          </button>
        </>
      )}
    </section>
  );
}
