import '@/app/theme.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';
import { initNativeLifecycle } from '@/native/lifecycle';
import { finishCommunityLogin } from '@/community/callback';
import { initNativeAuth } from '@/community/nativeAuth';
import { App } from '@/app/App';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { initI18n } from '@/app/i18n';
import { applyTheme } from '@/app/theme';
import { useSettingsStore, waitForSettingsHydration } from '@/state/settingsStore';

// 서비스 워커: 새 버전이 있으면 자동 갱신(autoUpdate). 오프라인 준비 여부는 콘솔로만 알림.
if (!Capacitor.isNativePlatform())
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('[skylog] 오프라인 사용 준비 완료');
    },
    onRegisteredSW(_url, registration) {
      // 홈 화면 웹앱을 오래 켜 둔 iPhone에서도 복귀 시 배포된 버전을 확인한다.
      const checkForUpdate = () => {
        if (document.visibilityState === 'visible' && navigator.onLine)
          void registration?.update().catch(() => {
            // 오프라인/일시 네트워크 실패에서는 현재 설치된 앱을 계속 쓴다.
          });
      };
      document.addEventListener('visibilitychange', checkForUpdate);
      window.addEventListener('pageshow', checkForUpdate);
      window.addEventListener('online', checkForUpdate);
    },
  });

async function bootstrap(): Promise<void> {
  // 느린 인증 서버 응답이 하늘과 로그인 복구 화면의 시작까지 막지 않는다.
  void finishCommunityLogin();
  // 설정(Dexie settings 테이블)이 복원되기 전에는 스플래시를 유지한다 (D-010).
  await waitForSettingsHydration();
  const { theme, lang } = useSettingsStore.getState();
  applyTheme(theme);
  await initI18n(lang);
  await initNativeLifecycle();
  void initNativeAuth().catch(() => {
    /* 네이티브 링크 실패 시에도 코드/붙여넣기로 로그인한다. */
  });

  const root = document.getElementById('root');
  if (!root) throw new Error('#root not found');
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  document.getElementById('splash')?.remove();
}

void bootstrap();
