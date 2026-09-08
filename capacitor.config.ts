import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'io.github.junhyoungparknobel.skylog',
  appName: '별관찰해쌀뚜',
  webDir: 'dist',
  backgroundColor: '#07090f',
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  ios: { contentInset: 'automatic', backgroundColor: '#07090f' },
};
export default config;
