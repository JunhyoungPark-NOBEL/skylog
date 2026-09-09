import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NATIVE_LOGIN_URL } from './auth';
import { finishCommunityLogin } from './callback';

export function isNativeLoginUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const expected = new URL(NATIVE_LOGIN_URL);
    return (
      url.protocol === expected.protocol &&
      url.hostname === expected.hostname &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.pathname === '' || url.pathname === '/')
    );
  } catch {
    return false;
  }
}
/** 앱이 켜진 경우와 종료된 경우를 모두 받는다. 임의 딥링크는 열지 않는다. */
export async function initNativeAuth(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const receive = ({ url }: { url: string }) => {
    if (isNativeLoginUrl(url)) void finishCommunityLogin(url);
  };
  await App.addListener('appUrlOpen', receive);
  const launch = await App.getLaunchUrl();
  if (launch) receive(launch);
}
