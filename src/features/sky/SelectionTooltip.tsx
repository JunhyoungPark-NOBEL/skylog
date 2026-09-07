import { useTranslation } from 'react-i18next';
import type { ObjectInfo } from '@/render/SkyScene';

/**
 * 선택 툴팁 (task-01 §3.8): 이름·종류·등급·alt/az·별자리. "자세히" → 상세 시트(T3).
 * 떠 있는 유리 카드 — 위치는 SkyView의 하단 스택(시간 바 위)이 정한다.
 */
export function SelectionTooltip({
  info,
  onClose,
  onCenter,
  onDetails,
}: {
  info: ObjectInfo;
  onClose(): void;
  onCenter(): void;
  onDetails(): void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="pointer-events-auto rounded-xl glass-strong p-4 text-body-sm text-fg shadow-float squircle"
      data-testid="tooltip"
      role="status"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-body font-semibold" data-testid="tooltip-name">
            {info.name}
          </div>
          {info.secondary && (
            <div className="truncate text-caption text-fg/70">{info.secondary}</div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-caption text-fg/70">
            <span>{t(`sky.kind.${info.kind}`)}</span>
            {info.mag !== undefined && (
              <span className="tabular-nums">
                {t('sky.tooltip.mag')} {info.mag.toFixed(1)}
              </span>
            )}
            {info.conName && <span>{info.conName}</span>}
            {info.phase !== undefined && info.kind === 'moon' && (
              <span className="tabular-nums">
                {t('sky.tooltip.illum')} {(info.phase * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="mt-1 text-caption tabular-nums" data-testid="tooltip-altaz">
            {t('sky.tooltip.alt')} {info.altDeg.toFixed(1)}° · {t('sky.tooltip.az')}{' '}
            {info.azDeg.toFixed(1)}°
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-fg/80 transition-colors duration-150 active:bg-surface-2"
          aria-label={t('common.close')}
          data-testid="tooltip-close"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCenter}
          className="inline-flex min-h-10 items-center justify-center rounded-pill bg-surface-3 px-4 text-body-sm font-medium text-fg transition-transform duration-150 ease-standard active:scale-[0.97]"
          data-testid="tooltip-center"
        >
          {t('sky.tooltip.center')}
        </button>
        <button
          type="button"
          onClick={onDetails}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-pill bg-accent px-4 text-body-sm font-semibold text-accent-fg transition-transform duration-150 ease-standard active:scale-[0.97]"
          data-testid="tooltip-details"
        >
          {t('sky.tooltip.details')}
        </button>
      </div>
    </div>
  );
}
