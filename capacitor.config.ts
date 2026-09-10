import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'io.github.junhyoungparknobel.skylog',
  appName: '스카이야드',
  webDir: 'dist',
  backgroundColor: '#07090f',
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  ios: { contentInset: 'automatic', backgroundColor: '#07090f' },
};
export default config;
