import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AccountScreen from '@/features/community/AccountScreen';

const fixture = vi.hoisted(() => ({
  user: { id: 'existing-account', email: 'existing@example.invalid' },
  callback: {
    busy: false,
    error: '',
    recoveryUrl: null as string | null,
    nativeUrl: null as string | null,
  },
  signOut: vi.fn(),
  action: vi.fn(),
  clear: vi.fn(),
}));
vi.mock('@/community/client', () => ({
  communityConfigured: true,
  emailCodeEnabled: false,
  signupsReady: false,
  useCommunityUser: () => ({ user: fixture.user, ready: true }),
  communityAction: fixture.action,
  edgeAction: fixture.action,
  communityError: () => 'social.error',
  communityClient: () => ({
    auth: { signOut: fixture.signOut },
    from: (table: string) => {
      const result = {
        data: table === 'sky_members' ? { name: 'existing-member' } : [],
        error: null,
      };
      const promise = Promise.resolve(result);
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: () => promise,
        then: promise.then.bind(promise),
      };
      return query;
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  }),
}));
vi.mock('@/community/callback', () => ({
  useLoginCallback: () => fixture.callback,
  clearLoginCallback: () => {
    fixture.clear();
    fixture.callback = { busy: false, error: '', recoveryUrl: null, nativeUrl: null };
  },
  verifyPastedLogin: fixture.action,
}));
vi.mock('react-i18next', () => {
  const t = (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key;
  return { useTranslation: () => ({ t, i18n: { language: 'ko' } }) };
});

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fixture.callback = { busy: false, error: '', recoveryUrl: null, nativeUrl: null };
  fixture.signOut.mockReset();
  fixture.action.mockReset();
  fixture.clear.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
const mount = () => act(async () => root.render(<AccountScreen />));
const returnButton = () =>
  [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'auth.keepCurrentAccount',
  )!;

it('기존 계정이 있어도 콜백 확인 중 상태를 표시하고 계정 작업·새 메일 요청을 가린다', async () => {
  fixture.callback.busy = true;
  await mount();
  expect(host.textContent).toContain('existing@example.invalid');
  expect(host.querySelector('[role="status"]')?.textContent).toBe('auth.checking');
  expect(returnButton().disabled).toBe(true);
  expect(host.querySelector('input, form')).toBeNull();
  expect(host.textContent).not.toContain('social.signOut');
  expect(host.textContent).not.toContain('social.saveBackup');
  expect(fixture.signOut).not.toHaveBeenCalled();
});

it('다른 브라우저 복구를 기존 계정 위에 표시하고 돌아가기는 세션 변경 없이 안내만 닫는다', async () => {
  fixture.callback = {
    busy: false,
    error: 'auth.otherBrowser',
    recoveryUrl: 'https://junhyoungpark-nobel.github.io/skylog/?code=fixture-existing-account',
    nativeUrl: 'io.github.junhyoungparknobel.skylog://login?code=fixture-existing-account',
  };
  await mount();
  expect(host.querySelector('[role="alert"]')?.textContent).toBe('auth.otherBrowser');
  expect(host.textContent).toContain('auth.currentAccount');
  expect(host.textContent).toContain('auth.copyRecovery');
  expect(host.querySelector('input, form')).toBeNull();
  await act(async () => returnButton().click());
  await mount();
  expect(fixture.clear).toHaveBeenCalledOnce();
  expect(host.querySelector('[data-testid="signed-in-login-callback"]')).toBeNull();
  expect(host.textContent).toContain('existing@example.invalid');
  expect(host.textContent).toContain('existing-member');
  expect(fixture.signOut).not.toHaveBeenCalled();
  expect(fixture.action).not.toHaveBeenCalled();
});
