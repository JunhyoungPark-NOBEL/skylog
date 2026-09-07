import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SkyStatusCard } from '@/features/tonight/SkyStatusCard';
import { useObservingNight } from '@/features/tonight/useNight';
import { useClockStore } from '@/state/clockStore';
import { useSettingsStore } from '@/state/settingsStore';

/** "오늘 밤" 탭. T3a: 하늘 상태 카드(박명·달·어두운 창). T3b가 추천·날씨·천문 현상 카드를 추가한다. */
export function TonightScreen() {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const night = useObservingNight();
  const [now, setNow] = useState(() => useClockStore.getState().now());
  useEffect(() => {
    const tick = () => setNow(useClockStore.getState().now());
    const timer = window.setInterval(tick, 30_000);
    const unsub = useClockStore.subscribe(tick);
    return () => {
      window.clearInterval(timer);
      unsub();
    };
  }, []);

  return (
    <section className="h-full overflow-y-auto px-3 pb-6 pt-3" data-testid="tonight-screen">
      <h1 className="mb-2 px-1 text-lg font-semibold">{t('tonight.title')}</h1>
      {night ? (
        <SkyStatusCard night={night} now={now} lang={lang} />
      ) : (
        <p className="px-1 text-sm text-muted">{t('common.loading')}</p>
      )}
      <p className="mt-4 px-1 text-xs text-muted">{t('tonight.comingSoon')}</p>
    </section>
  );
}
