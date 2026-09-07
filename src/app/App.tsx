import { useEffect } from 'react';
import { setLanguage } from '@/app/i18n';
import { navigate, useRoute } from '@/app/router';
import { applyTheme } from '@/app/theme';
import { StatusBar } from '@/app/StatusBar';
import { TabBar } from '@/app/TabBar';
import { AboutScreen } from '@/features/settings/AboutScreen';
import { DebugDataPage } from '@/features/debug/DebugDataPage';
import { LearnScreen } from '@/features/learn/LearnScreen';
import { LogScreen } from '@/features/log/LogScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { SensorDebugScreen } from '@/features/settings/SensorDebug';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { SitesScreen } from '@/features/settings/Sites';
import { initLocation } from '@/sensors/locationInit';
import { SkyView } from '@/features/sky/SkyView';
import { TonightScreen } from '@/features/tonight/TonightScreen';
import { releaseWakeLock, requestWakeLock } from '@/sensors/wakeLock';
import { useSettingsStore } from '@/state/settingsStore';
import { DebugHud } from '@/ui/DebugHud';

/** 앱 셸: 상태 바 + 라우트된 화면 + 하단 탭. 설정·정보·디버그는 전체 화면 라우트. */
export function App() {
  const route = useRoute();
  const theme = useSettingsStore((s) => s.theme);
  const lang = useSettingsStore((s) => s.lang);
  const keepAwake = useSettingsStore((s) => s.keepAwake);
  const debugHud = useSettingsStore((s) => s.debugHud);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    void setLanguage(lang);
  }, [lang]);
  useEffect(() => {
    if (keepAwake) void requestWakeLock();
    else void releaseWakeLock();
  }, [keepAwake]);
  useEffect(() => {
    void initLocation();
  }, []);

  if (route === 'settings') return <SettingsScreen onBack={() => navigate('sky')} />;
  if (route === 'about') return <AboutScreen onBack={() => navigate('settings')} />;
  if (route === 'sites') return <SitesScreen onBack={() => navigate('settings')} />;
  if (route === 'debug/data') return <DebugDataPage onBack={() => navigate('settings')} />;
  if (route === 'debug/sensors') return <SensorDebugScreen onBack={() => navigate('settings')} />;

  return (
    <div className="flex h-full flex-col bg-bg text-fg">
      <StatusBar />
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {route === 'sky' && <SkyView />}
        {route === 'search' && <SearchScreen />}
        {route === 'tonight' && <TonightScreen />}
        {route === 'log' && <LogScreen />}
        {route === 'learn' && <LearnScreen />}
      </main>
      <TabBar active={route} onSelect={(r) => navigate(r)} />
      {debugHud && <DebugHud />}
    </div>
  );
}
