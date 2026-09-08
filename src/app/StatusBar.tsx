import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate, useRoute } from '@/app/router';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useSettingsStore } from '@/state/settingsStore';
import { IconSettings } from '@/ui/icons';

/**
 * 상단 HUD 캡슐: 위치명 · 설정. 다른 탭에는 시각도 표시한다.
 * 하늘의 시각은 TimeBar, 센서 상태는 ArToggle에 모아 같은 정보를 반복하지 않는다.
 * 캡슐과 --status-height가 같은 높이 규약을 쓰므로 글자 확대 시에도 아래 HUD·본문이 겹치지 않는다.
 */
export function StatusBar() {
  const { t } = useTranslation();
  const overSky = useRoute() === 'sky';
  const lang = useSettingsStore((s) => s.lang);
  const siteName = useLocationStore((s) => s.site.name);
  const clockMode = useClockStore((s) => s.mode);
  const offsetMs = useClockStore((s) => s.offsetMs);
  const notNow = clockMode === 'manual' || offsetMs !== 0;
  const accuracyM = useLocationStore((s) => s.accuracyM);
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Asia/Seoul',
      }),
    [lang],
  );
  const [time, setTime] = useState(() => timeFmt.format(useClockStore.getState().now()));

  useEffect(() => {
    if (overSky) return;
    const tick = () => setTime(timeFmt.format(useClockStore.getState().now()));
    queueMicrotask(tick);
    const id = window.setInterval(tick, 1000);
    // 시간 여행·오프셋 변경은 즉시 반영
    const unsub = useClockStore.subscribe(() => queueMicrotask(tick));
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [overSky, timeFmt]);

  return (
    <header
      data-testid="status-bar"
      className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center px-[12px] pt-[calc(env(safe-area-inset-top)+8px)]"
    >
      <div
        className={`${overSky ? 'glass-hud' : 'glass-sm'} pointer-events-auto flex h-[var(--status-capsule-height)] min-w-0 max-w-full items-center gap-[4px] rounded-pill pl-[12px] text-[0.75rem] leading-[1rem] text-fg shadow-card`}
      >
        <span
          className="min-w-0 truncate font-medium"
          data-testid="status-site"
          title={accuracyM !== null ? `${siteName} · ±${Math.round(accuracyM)}m` : siteName}
        >
          {siteName}
        </span>
        {!overSky && (
          <>
            <span aria-hidden="true" className="shrink-0 px-[4px] text-fg/40">
              ·
            </span>
            <span
              data-testid="status-time"
              title={`${time}${notNow ? ` (${t('status.manualTime')})` : ''}`}
              className={`min-w-0 truncate tabular-nums ${notNow ? 'font-semibold text-accent' : ''}`}
            >
              {time}
              {notNow ? ` (${t('status.manualTime')})` : ''}
            </span>
          </>
        )}
        <button
          type="button"
          aria-label={t('common.settings')}
          onClick={() => navigate('settings')}
          className="relative flex h-full min-h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill text-fg transition-colors duration-150 ease-standard active:bg-surface-2"
          data-testid="open-settings"
        >
          <IconSettings size={20} />
        </button>
      </div>
    </header>
  );
}
