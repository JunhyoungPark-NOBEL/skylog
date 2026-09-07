import { useTranslation } from 'react-i18next';
import type { ObjectInfo } from '@/render/SkyScene';

/** 선택 툴팁 (task-01 §3.8): 이름·종류·등급·alt/az·별자리. "자세히" → 상세 시트(T3). */
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
      className="absolute inset-x-2 bottom-14 z-10 rounded-2xl border border-border bg-overlay p-3 text-sm backdrop-blur-sm"
      data-testid="tooltip"
      role="status"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold" data-testid="tooltip-name">
            {info.name}
          </div>
          {info.secondary && <div className="truncate text-xs text-muted">{info.secondary}</div>}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            <span>{t(`sky.kind.${info.kind}`)}</span>
            {info.mag !== undefined && (
              <span>
                {t('sky.tooltip.mag')} {info.mag.toFixed(1)}
              </span>
            )}
            {info.conName && <span>{info.conName}</span>}
            {info.phase !== undefined && info.kind === 'moon' && (
              <span>
                {t('sky.tooltip.illum')} {(info.phase * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="mt-1 font-mono text-xs" data-testid="tooltip-altaz">
            {t('sky.tooltip.alt')} {info.altDeg.toFixed(1)}° · {t('sky.tooltip.az')}{' '}
            {info.azDeg.toFixed(1)}°
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-muted"
          aria-label={t('common.close')}
          data-testid="tooltip-close"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onCenter}
          className="min-h-9 rounded-full bg-surface-2 px-3 text-xs"
          data-testid="tooltip-center"
        >
          {t('sky.tooltip.center')}
        </button>
        <button
          type="button"
          onClick={onDetails}
          className="min-h-9 rounded-full bg-surface-2 px-3 text-xs"
          data-testid="tooltip-details"
        >
          {t('sky.tooltip.details')}
        </button>
      </div>
    </div>
  );
}
