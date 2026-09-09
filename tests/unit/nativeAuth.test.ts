import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { finishCommunityLogin } from '@/community/callback';
import { initNativeAuth, isNativeLoginUrl } from '@/community/nativeAuth';
import { NATIVE_LOGIN_URL } from '@/community/auth';

vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), getLaunchUrl: vi.fn() } }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock('@/community/callback', () => ({ finishCommunityLogin: vi.fn() }));
let receive: (event: { url: string }) => void;
beforeEach(() => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(finishCommunityLogin).mockReset().mockResolvedValue();
  vi.mocked(App.getLaunchUrl).mockReset().mockResolvedValue(undefined);
  vi.mocked(App.addListener)
    .mockReset()
    .mockImplementation(async (_name, callback) => {
      receive = callback as unknown as (event: { url: string }) => void;
      return { remove: async () => {} };
    });
});
describe('네이티브 로그인 복귀', () => {
  it('앱 실행 중 URL 이벤트와 종료 후 최초 URL을 같은 콜백으로 전달한다', async () => {
    const url = `${NATIVE_LOGIN_URL}?code=fixture-cold-start`;
    vi.mocked(App.getLaunchUrl).mockResolvedValue({ url });
    await initNativeAuth();
    expect(App.addListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
    expect(finishCommunityLogin).toHaveBeenCalledWith(url);
    receive({ url: `${NATIVE_LOGIN_URL}?code=fixture-warm-start` });
    expect(finishCommunityLogin).toHaveBeenCalledTimes(2);
  });
  it('다른 호스트/경로·userinfo·웹 URL은 native 인증으로 전달하지 않는다', async () => {
    await initNativeAuth();
    for (const url of [
      NATIVE_LOGIN_URL.replace('://login', '://other'),
      `${NATIVE_LOGIN_URL}/other`,
      NATIVE_LOGIN_URL.replace('://', '://evil@'),
      'https://evil.invalid/?code=fixture-code',
    ]) {
      expect(isNativeLoginUrl(url)).toBe(false);
      receive({ url });
    }
    expect(finishCommunityLogin).not.toHaveBeenCalled();
  });
  it('일반 웹앱에서는 native 플러그인에 연결하지 않는다', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await initNativeAuth();
    expect(App.addListener).not.toHaveBeenCalled();
    expect(App.getLaunchUrl).not.toHaveBeenCalled();
  });
});
