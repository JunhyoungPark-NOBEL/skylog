import '@/app/theme.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';
import { initNativeLifecycle } from '@/native/lifecycle';
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
  });

async function bootstrap(): Promise<void> {
  // 설정(Dexie settings 테이블)이 복원되기 전에는 스플래시를 유지한다 (D-010).
  await waitForSettingsHydration();
  const { theme, lang } = useSettingsStore.getState();
  applyTheme(theme);
  await initI18n(lang);
  await initNativeLifecycle();

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
