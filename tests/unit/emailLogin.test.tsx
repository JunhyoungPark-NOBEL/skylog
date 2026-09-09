import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailLogin } from '@/features/community/EmailLogin';
import { readPendingEmail, writePendingEmail } from '@/community/auth';

const mock = vi.hoisted(() => ({
  send: vi.fn(),
  verify: vi.fn(),
  paste: vi.fn(),
  codeEnabled: false,
  callback: {
    busy: false,
    error: '',
    recoveryUrl: null as string | null,
    nativeUrl: null as string | null,
  },
}));
vi.mock('@/community/client', () => ({
  communityClient: () => ({ auth: { signInWithOtp: mock.send, verifyOtp: mock.verify } }),
  get emailCodeEnabled() {
    return mock.codeEnabled;
  },
  signupsReady: false,
}));
vi.mock('@/community/callback', () => ({
  useLoginCallback: () => mock.callback,
  clearLoginCallback: vi.fn(),
  verifyPastedLogin: (raw: string) => mock.paste(raw),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));
let host: HTMLDivElement;
let root: Root;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  writePendingEmail(null);
  history.replaceState(null, '', '/#/account');
  mock.send.mockReset().mockResolvedValue({ error: null });
  mock.verify.mockReset().mockResolvedValue({ error: null, data: { session: {} } });
  mock.paste.mockReset().mockResolvedValue(undefined);
  mock.codeEnabled = false;
  mock.callback = { busy: false, error: '', recoveryUrl: null, nativeUrl: null };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () => root.render(<EmailLogin />));
}
function input(type: string) {
  return host.querySelector<HTMLInputElement>(`input[type="${type}"]`)!;
}
async function fill(field: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit(index = 0) {
  await act(async () =>
    host
      .querySelectorAll('form')
      [index]!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
}
function button(key: string) {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === key,
  )!;
}

describe('간단한 메일 로그인 화면', () => {
  it('설치 앱은 등록된 native URL로 메일 복귀를 요청한다', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    await mount();
    await fill(input('email'), 'me@example.invalid');
    await submit();
    expect(mock.send).toHaveBeenCalledWith({
      email: 'me@example.invalid',
      options: { emailRedirectTo: 'io.github.junhyoungparknobel.skylog://login' },
    });
  });
  it('전송 중 주소와 재전송·변경을 잠그고 중복 submit을 서버에 보내지 않는다', async () => {
    const send = deferred<{ error: null }>();
    mock.send.mockReturnValue(send.promise);
    await mount();
    await fill(input('email'), 'me@example.invalid');
    await submit();
    await submit();
    expect(input('email').matches(':disabled')).toBe(true);
    expect(mock.send).toHaveBeenCalledTimes(1);
    await act(async () => send.resolve({ error: null }));
    expect(readPendingEmail()?.email).toBe('me@example.invalid');
    expect(mock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { emailRedirectTo: expect.stringMatching(/^https?:\/\//) },
      }),
    );
  });
  it('메일 전송 뒤 재마운트해도 요청 주소와 확인 단계를 복원한다', async () => {
    writePendingEmail({ email: 'me@example.invalid', sentAt: Date.now() });
    await mount();
    expect(input('email').value).toBe('me@example.invalid');
    expect(host.textContent).toContain('auth.checkEmail');
    expect(
      [...host.querySelectorAll('button')].some(
        (b) => b.textContent?.startsWith('auth.resendWait') && b.disabled,
      ),
    ).toBe(true);
    expect(input('password').value).toBe('');
  });
  it('전송 실패는 대기 상태나 요청 기록을 만들지 않고 다시 입력할 수 있다', async () => {
    mock.send.mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } });
    await mount();
    await fill(input('email'), 'me@example.invalid');
    await submit();
    expect(readPendingEmail()).toBeNull();
    expect(input('email').matches(':disabled')).toBe(false);
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('auth.rateLimit');
  });
  it('화면을 나간 뒤 늦은 전송 응답으로 다른 화면의 요청 기록을 덮어쓰지 않는다', async () => {
    const send = deferred<{ error: null }>();
    mock.send.mockReturnValue(send.promise);
    await mount();
    await fill(input('email'), 'old@example.invalid');
    await submit();
    await act(async () => root.render(<p>elsewhere</p>));
    await act(async () => send.resolve({ error: null }));
    expect(readPendingEmail()).toBeNull();
    expect(host.textContent).toBe('elsewhere');
  });
  it('OTP 템플릿이 확인된 구성에서는 틀린 번호 후 같은 주소로 다시 확인할 수 있다', async () => {
    mock.codeEnabled = true;
    writePendingEmail({ email: 'me@example.invalid', sentAt: Date.now() });
    mock.verify.mockResolvedValueOnce({ error: { code: 'otp_expired' } });
    await mount();
    const code = host.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')!;
    await fill(code, '123456');
    await submit();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('auth.expired');
    expect(button('social.changeEmail').matches(':disabled')).toBe(false);
    await fill(code, '654321');
    await submit();
    expect(mock.verify).toHaveBeenLastCalledWith({
      email: 'me@example.invalid',
      token: '654321',
      type: 'email',
    });
    expect(readPendingEmail()).toBeNull();
  });
  it('복구 링크는 요청 즉시 지우며 실패해도 성공 메시지를 표시하지 않는다', async () => {
    const paste = deferred<void>();
    mock.paste.mockReturnValue(paste.promise);
    await mount();
    await fill(input('password'), 'https://fixture.invalid/secret');
    await submit(1);
    expect(input('password').value).toBe('');
    expect(input('password').matches(':disabled')).toBe(true);
    await act(async () => paste.reject({ code: 'EMAIL_MISMATCH' }));
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('auth.emailMismatch');
    expect(host.textContent).not.toContain('auth.signedIn');
  });
  it('느린 콜백 중에는 메일 재요청을 막고 브라우저 복구에는 새 요청을 접어 둔다', async () => {
    mock.callback = { busy: true, error: '', recoveryUrl: null, nativeUrl: null };
    await mount();
    await fill(input('email'), 'me@example.invalid');
    await submit();
    expect(mock.send).not.toHaveBeenCalled();
    mock.callback = {
      busy: false,
      error: 'auth.otherBrowser',
      recoveryUrl: 'https://fixture.invalid/code',
      nativeUrl: 'scheme://login',
    };
    await mount();
    expect(host.querySelector('details')?.open).toBe(false);
    expect(host.querySelector('a')).toBeNull();
    expect(button('auth.copyRecovery')).toBeTruthy();
  });
  it('이미 설치 앱 안에서 확인 실패한 경우 자기 자신으로 돌아가는 버튼을 반복하지 않는다', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android fixture');
    mock.callback = {
      busy: false,
      error: 'auth.otherBrowser',
      recoveryUrl: 'https://fixture.invalid/code',
      nativeUrl: 'scheme://login',
    };
    await mount();
    expect(host.querySelector('a')).toBeNull();
    expect(host.textContent).toContain('auth.requestLost');
    expect(host.textContent).not.toContain('auth.returnWeb');
    expect(host.textContent).not.toContain('auth.copyRecovery');
    expect(host.querySelector('details')?.open).toBe(true);
  });
});
