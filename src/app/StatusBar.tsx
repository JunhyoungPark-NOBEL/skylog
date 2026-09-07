import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore } from '@/state/sensorStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useViewStore } from '@/state/viewStore';
import { compass16 } from '@/ui/format';
import { IconSettings } from '@/ui/icons';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

/**
 * 상단 HUD 캡슐(D-021): 위치명 · 시각 · 센서 상태 · 설정 버튼.
 * 모든 탭 화면 위에 떠 있다(높이 = --status-height: 8px 위 여백 + 36px 캡슐). 콘텐츠 화면은 `pt-status`.
 */
export function StatusBar() {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const siteName = useLocationStore((s) => s.site.name);
  const clockMode = useClockStore((s) => s.mode);
  const offsetMs = useClockStore((s) => s.offsetMs);
  const notNow = clockMode === 'manual' || offsetMs !== 0;
  const viewMode = useViewStore((s) => s.mode);
  const accuracyM = useLocationStore((s) => s.accuracyM);
  const headingSource = useSensorStore((s) => s.headingSource);
  const calibrated = useSensorStore((s) => s.calibration !== null);
  const centerAz = useViewStore((s) => s.centerAz);
  const centerAlt = useViewStore((s) => s.centerAlt);
  const sensorText = (() => {
    if (viewMode !== 'sensor') return t('status.sensorOff');
    const dir = compass16(centerAz, lang);
    const src =
      headingSource === 'manual'
        ? t('status.manual')
        : calibrated
          ? t('status.aligned')
          : headingSource === 'compass-sync'
            ? t('status.compass')
            : headingSource === 'relative'
              ? t('status.relative')
              : t('status.absolute');
    return `${dir} ${centerAz.toFixed(0)}° / ${centerAlt.toFixed(0)}° · ${src}`;
  })();
  const [time, setTime] = useState(() => timeFmt.format(useClockStore.getState().now()));

  useEffect(() => {
    const tick = () => setTime(timeFmt.format(useClockStore.getState().now()));
    const id = window.setInterval(tick, 1000);
    // 시간 여행·오프셋 변경은 즉시 반영
    const unsub = useClockStore.subscribe(() => queueMicrotask(tick));
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, []);

  return (
    <header
      data-testid="status-bar"
      className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+8px)]"
    >
      <div className="glass pointer-events-auto flex h-9 max-w-full items-center gap-1 rounded-pill pl-4 pr-1 text-caption text-fg shadow-float">
        <span className="truncate font-medium" data-testid="status-site">
          {siteName}
          {accuracyM !== null ? (
            <span className="font-normal text-fg/70 tabular-nums"> ±{Math.round(accuracyM)}m</span>
          ) : null}
        </span>
        <span aria-hidden="true" className="text-fg/40">
          ·
        </span>
        <span
          data-testid="status-time"
          className={
            notNow
              ? 'shrink-0 font-semibold whitespace-nowrap text-accent tabular-nums'
              : 'shrink-0 whitespace-nowrap tabular-nums'
          }
        >
          {time}
          {notNow ? ` (${t('status.manualTime')})` : ''}
        </span>
        <span aria-hidden="true" className="text-fg/40">
          ·
        </span>
        <span data-testid="status-sensor" className="truncate tabular-nums">
          {sensorText}
        </span>
        <button
          type="button"
          aria-label={t('common.settings')}
          onClick={() => navigate('settings')}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-fg transition-[background-color,transform] duration-150 ease-standard before:absolute before:-inset-1 before:content-[''] active:scale-95 active:bg-surface-2"
          data-testid="open-settings"
        >
          <IconSettings size={20} />
        </button>
      </div>
    </header>
  );
}
