import { useEffect, type ReactNode } from 'react';
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
import { ObjectSheet } from '@/features/object/ObjectSheet';
import { releaseWakeLock, requestWakeLock } from '@/sensors/wakeLock';
import { useSettingsStore } from '@/state/settingsStore';
import { DebugHud } from '@/ui/DebugHud';

/**
 * 스크롤되는 탭 화면 래퍼(D-021). 떠 있는 상태 캡슐·탭 pill 아래로 콘텐츠가 이어지도록
 * 위·아래 여백을 여기서만 잡는다 — 안쪽 화면은 자체 상·하 패딩을 두지 않는다.
 * 라우트마다 별도 슬롯에서 렌더되므로 탭을 바꾸면 스크롤 위치가 초기화된다.
 */
function TabScreen({ children }: { children: ReactNode }) {
  return <div className="scroll-fade-y pt-status pb-tab h-full overflow-y-auto">{children}</div>;
}

/** 앱 셸: 떠 있는 상태 캡슐 + 라우트된 화면 + 떠 있는 탭 pill. 설정·정보·디버그는 전체 화면 라우트. */
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
    <div className="relative h-full bg-bg text-fg">
      <StatusBar />
      {/* 본문은 뷰포트를 가득 채우고 크롬은 그 위에 떠 있다. 하늘 뷰는 가장자리까지(자체 pt-status/bottom-sky). */}
      <main className="relative isolate h-full overflow-hidden">
        {route === 'sky' && <SkyView />}
        {route === 'search' && (
          <TabScreen>
            <SearchScreen />
          </TabScreen>
        )}
        {route === 'tonight' && (
          <TabScreen>
            <TonightScreen />
          </TabScreen>
        )}
        {route === 'log' && (
          <TabScreen>
            <LogScreen />
          </TabScreen>
        )}
        {route === 'learn' && (
          <TabScreen>
            <LearnScreen />
          </TabScreen>
        )}
      </main>
      <TabBar active={route} onSelect={(r) => navigate(r)} />
      <ObjectSheet />
      {debugHud && <DebugHud />}
    </div>
  );
}
