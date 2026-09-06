import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useViewStore } from '@/state/viewStore';
import { IconSettings } from '@/ui/icons';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

/** 상단 얇은 상태 바: 위치명 · 시각 · 센서 상태 · 설정 버튼 */
export function StatusBar() {
  const { t } = useTranslation();
  const siteName = useLocationStore((s) => s.site.name);
  const clockMode = useClockStore((s) => s.mode);
  const offsetMs = useClockStore((s) => s.offsetMs);
  const notNow = clockMode === 'manual' || offsetMs !== 0;
  const viewMode = useViewStore((s) => s.mode);
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
      className="safe-top flex shrink-0 items-center gap-2 border-b border-border bg-surface px-3 text-xs text-muted"
      style={{ minHeight: 'var(--status-height)' }}
    >
      <span className="truncate text-fg" data-testid="status-site">
        {siteName}
      </span>
      <span className="text-border">·</span>
      <span
        data-testid="status-time"
        style={{
          color: notNow ? 'var(--accent)' : undefined,
          fontWeight: notNow ? 600 : undefined,
        }}
      >
        {time}
        {notNow ? ` (${t('status.manualTime')})` : ''}
      </span>
      <span className="text-border">·</span>
      <span data-testid="status-sensor">
        {viewMode === 'sensor' ? t('status.sensorOn') : t('status.sensorOff')}
      </span>
      <span className="flex-1" />
      <button
        type="button"
        aria-label={t('common.settings')}
        onClick={() => navigate('settings')}
        className="-mr-1 flex h-11 w-11 items-center justify-center text-fg"
        data-testid="open-settings"
      >
        <IconSettings size={20} />
      </button>
    </header>
  );
}
