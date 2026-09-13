import { useEffect, useLayoutEffect, lazy, Suspense, type ReactNode } from 'react';
import { setLanguage } from '@/app/i18n';
import { navigate, useRoute, useHash } from '@/app/router';
import { applyTheme } from '@/app/theme';
import { StatusBar } from '@/app/StatusBar';
import { TabBar } from '@/app/TabBar';
import { AboutScreen } from '@/features/settings/AboutScreen';
import { DebugDataPage } from '@/features/debug/DebugDataPage';
import { returnToLearning } from '@/features/learn/learnNavigation';
import { LearnScreen } from '@/features/learn/LearnScreen';
import { BackupScreen } from '@/features/log/BackupScreen';
import { LogScreen } from '@/features/log/LogScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { SensorDebugScreen } from '@/features/settings/SensorDebug';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { SitesScreen } from '@/features/settings/Sites';
import { mountAutoLocation } from '@/sensors/autoLocation';
import { SkyView } from '@/features/sky/SkyView';
import { TonightScreen } from '@/features/tonight/TonightScreen';
import { ObjectSheet } from '@/features/object/ObjectSheet';
import { ObservationFormHost } from '@/features/log/ObservationFormHost';
import { releaseWakeLock, requestWakeLock } from '@/sensors/wakeLock';
import { startLogSync } from '@/state/logStore';
import { useSettingsStore } from '@/state/settingsStore';
import { DebugHud } from '@/ui/DebugHud';
import { ScrollArea } from '@/ui/ScrollArea';
import { StoryHost } from '@/features/content/StoryHost';
import { QuizHost } from '@/features/learn/QuizHost';
import { startReadSync } from '@/content/readProgress';
import { ToastHost } from '@/ui/Toast';
import PlusScreen from '@/features/learn/PlusAccess';
const TelescopeMode = lazy(() => import('@/features/telescope/TelescopeMode'));
const ProfileScreen = lazy(() => import('@/features/personal/ProfileScreen'));
const CommunityScreen = lazy(() => import('@/features/community/CommunityScreen'));
const AccountScreen = lazy(() => import('@/features/community/AccountScreen'));
const ModerationScreen = lazy(() => import('@/features/community/ModerationScreen'));
const Equipment = lazy(() =>
  import('@/features/telescope/Equipment').then((m) => ({ default: m.Equipment })),
);

/**
 * 스크롤되는 탭 화면 래퍼(D-021·D-022). 떠 있는 상태 캡슐·탭 pill 아래로 콘텐츠가 이어지도록
 * 위·아래 여백을 여기서만 잡는다 — 안쪽 화면은 자체 상·하 패딩을 두지 않는다.
 * 마우스 드래그 스크롤·관성은 ScrollArea가 맡고, 아래쪽 페이드는 mask 대신 오버레이로 그린다.
 * 라우트마다 별도 슬롯에서 렌더되므로 탭을 바꾸면 스크롤 위치가 초기화된다.
 */
function TabScreen({ children }: { children: ReactNode }) {
  return (
    <ScrollArea className="pt-status pb-tab" fadeBottom="28px" data-testid="tab-screen">
      {children}
    </ScrollArea>
  );
}

/** 앱 셸: 떠 있는 상태 캡슐 + 라우트된 화면 + 떠 있는 탭 pill. 설정·정보·디버그는 전체 화면 라우트. */
export function App() {
  const route = useRoute();
  const hash = useHash();
  const theme = useSettingsStore((s) => s.theme);
  const lang = useSettingsStore((s) => s.lang);
  const keepAwake = useSettingsStore((s) => s.keepAwake);
  const debugHud = useSettingsStore((s) => s.debugHud);

  // 하늘의 passive effect가 팔레트를 읽기 전에 CSS 테마부터 적용한다.
  useLayoutEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    void setLanguage(lang);
  }, [lang]);
  useEffect(() => {
    if (keepAwake) void requestWakeLock();
    else void releaseWakeLock();
  }, [keepAwake]);
  useEffect(() => mountAutoLocation(), []);
  // 기록 파생 상태(★/☆ 집합)는 앱 전역에서 한 번만 DB를 구독한다(T4)
  useEffect(() => startLogSync(), []);
  useEffect(() => startReadSync(), []);

  if (['profile', 'community', 'account', 'moderation', 'plus'].includes(route))
    return (
      <Suspense
        fallback={
          <div role="status" className="p-6">
            …
          </div>
        }
      >
        {route === 'profile' && <ProfileScreen />}
        {route === 'community' && <CommunityScreen />}
        {route === 'account' && <AccountScreen />}
        {route === 'moderation' && <ModerationScreen />}
        {route === 'plus' && <PlusScreen />}
        <ToastHost />
      </Suspense>
    );

  if (route === 'settings')
    return (
      <SettingsScreen
        onBack={() => {
          if (new URLSearchParams(window.location.hash.split('?')[1]).get('from') === 'learn')
            returnToLearning();
          else navigate('sky');
        }}
      />
    );
  if (route === 'about') return <AboutScreen onBack={() => navigate('settings')} />;
  if (route === 'telescope')
    return (
      <Suspense
        fallback={
          <div role="status" className="p-6">
            …
          </div>
        }
      >
        <TelescopeMode key={hash} />
      </Suspense>
    );
  if (route === 'equipment')
    return (
      <Suspense
        fallback={
          <div role="status" className="p-6">
            …
          </div>
        }
      >
        <Equipment onBack={() => navigate('settings')} />
      </Suspense>
    );
  if (route === 'sites') return <SitesScreen onBack={() => navigate('settings')} />;
  if (route === 'backup')
    return (
      <>
        <BackupScreen onBack={() => navigate('settings')} />
        <ToastHost />
      </>
    );
  if (route === 'debug/data') return <DebugDataPage onBack={() => navigate('settings')} />;
  if (route === 'debug/sensors') return <SensorDebugScreen onBack={() => navigate('settings')} />;

  return (
    <div className="relative h-full bg-bg text-fg">
      {route !== 'learn' && <StatusBar />}
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
        {route === 'learn' && <LearnScreen />}
      </main>
      <TabBar active={route} onSelect={(r) => (r === 'learn' ? returnToLearning() : navigate(r))} />
      <ObjectSheet />
      <StoryHost />
      <ObservationFormHost />
      <QuizHost />
      <ToastHost />
      {debugHud && <DebugHud />}
    </div>
  );
}
