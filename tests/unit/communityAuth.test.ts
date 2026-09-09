import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { communityClient, emailVerificationClient } from '@/community/client';
import {
  emailLinkToken,
  loginError,
  NATIVE_LOGIN_URL,
  PUBLIC_LOGIN_URL,
  readPendingEmail,
  verifyEmailLink,
  writePendingEmail,
} from '@/community/auth';
import {
  exchangeLoginCode,
  finishCommunityLogin,
  parseLoginCallback,
  pastedLoginCallback,
  verifyPastedLogin,
} from '@/community/callback';

vi.mock('@/community/client', () => ({
  communityClient: vi.fn(),
  emailVerificationClient: vi.fn(),
  communityUrl: 'https://auth-test.invalid',
}));
const token = 'a'.repeat(64);
const emailLink = `https://auth-test.invalid/auth/v1/verify?token=${token}&type=magiclink`;
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'me@example.invalid',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-09-09T00:00:00Z',
};
const jwt = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.fixture`;
const session = {
  access_token: jwt,
  refresh_token: 'fixture-refresh',
  token_type: 'bearer',
  expires_in: 3600,
  user,
};
let serial = 0;
let main: SupabaseClient;
let verifiedEmail: string;
let verificationError: string | null;
let holdVerification: (() => Promise<void>) | undefined;
let holdExchange: (() => Promise<void>) | undefined;
let requests: { path: string; body: Record<string, unknown> }[];
beforeEach(() => {
  localStorage.clear();
  writePendingEmail(null);
  history.replaceState(null, '', '/');
  verifiedEmail = user.email;
  verificationError = null;
  holdVerification = undefined;
  holdExchange = undefined;
  requests = [];
  serial++;
  const makeClient = (label: string) =>
    createClient('https://auth-test.invalid', 'fixture-key', {
      auth: {
        storageKey: `${label}-${serial}`,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: {
        fetch: async (input, init) => {
          const url = new URL(
            typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
          );
          requests.push({
            path: `${label}:${url.pathname}`,
            body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
          });
          if (url.pathname.endsWith('/verify')) {
            await holdVerification?.();
            if (verificationError)
              return Response.json(
                { code: verificationError, msg: 'Fixture expired' },
                { status: 403, headers: { 'x-supabase-api-version': '2024-01-01' } },
              );
            return Response.json({ ...session, user: { ...user, email: verifiedEmail } });
          }
          if (url.pathname.endsWith('/user')) return Response.json(user);
          if (url.pathname.endsWith('/token')) await holdExchange?.();
          return Response.json(session);
        },
      },
    });
  main = makeClient('main');
  vi.mocked(communityClient).mockReturnValue(main);
  vi.mocked(emailVerificationClient).mockImplementation(() => makeClient('isolated'));
});

describe('메일 로그인 복구', () => {
  it('localStorage가 차단되어도 같은 실행에서 요청한 메일 링크를 확인한다', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      writePendingEmail({ email: user.email, sentAt: Date.now() });
      expect(readPendingEmail()?.email).toBe(user.email);
      await verifyEmailLink(emailLink);
      expect((await main.auth.getSession()).data.session?.user.email).toBe(user.email);
    } finally {
      get.mockRestore();
      set.mockRestore();
      writePendingEmail(null);
    }
  });
  it('원본 메일 확인은 격리 client에서 하고 요청한 이메일과 일치할 때만 세션을 설치한다', async () => {
    writePendingEmail({ email: user.email, sentAt: Date.now() });
    await verifyEmailLink(emailLink);
    expect(requests.map((r) => r.path)).toEqual(['isolated:/auth/v1/verify', 'main:/auth/v1/user']);
    expect(requests[0]!.body).toMatchObject({ token_hash: token, type: 'email' });
    expect((await main.auth.getSession()).data.session?.user.email).toBe(user.email);
    expect(readPendingEmail()).toBeNull();
  });
  it('유효한 타인 링크는 기존 세션을 바꾸지 않는다', async () => {
    await main.auth.setSession({ access_token: jwt, refresh_token: 'original-refresh' });
    writePendingEmail({ email: user.email, sentAt: Date.now() });
    verifiedEmail = 'someone@example.invalid';
    await expect(verifyEmailLink(emailLink)).rejects.toThrow('EMAIL_MISMATCH');
    expect((await main.auth.getSession()).data.session?.refresh_token).toBe('original-refresh');
    expect(requests.filter((r) => r.path === 'main:/auth/v1/user')).toHaveLength(1);
  });
  it('이 앱에서 메일 요청한 기록이 없으면 원본 링크를 소비하지 않는다', async () => {
    await expect(verifyEmailLink(emailLink)).rejects.toThrow('NO_PENDING_EMAIL');
    expect(requests).toHaveLength(0);
  });
  it('검증 중 새 메일 요청으로 바뀌면 늦은 확인 세션을 설치하지 않는다', async () => {
    writePendingEmail({ email: user.email, sentAt: Date.now() });
    let release!: () => void;
    holdVerification = () =>
      new Promise<void>((done) => {
        release = done;
      });
    const result = verifyEmailLink(emailLink);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    writePendingEmail({ email: 'new@example.invalid', sentAt: Date.now() });
    release();
    await expect(result).rejects.toThrow('NO_PENDING_EMAIL');
    expect((await main.auth.getSession()).data.session).toBeNull();
  });
  it('격리 검증 중 다른 로그인이 완료되면 늦은 결과로 현재 세션을 덮어쓰지 않는다', async () => {
    writePendingEmail({ email: user.email, sentAt: Date.now() });
    let release!: () => void;
    holdVerification = () =>
      new Promise<void>((done) => {
        release = done;
      });
    const result = verifyEmailLink(emailLink);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await main.auth.setSession({ access_token: jwt, refresh_token: 'another-login-refresh' });
    release();
    await expect(result).rejects.toThrow('AUTH_CHANGED');
    expect((await main.auth.getSession()).data.session?.refresh_token).toBe(
      'another-login-refresh',
    );
  });
  it('만료된 링크는 로그인 성공으로 처리하거나 기존 세션에 저장하지 않는다', async () => {
    writePendingEmail({ email: user.email, sentAt: Date.now() });
    verificationError = 'otp_expired';
    await expect(verifyEmailLink(emailLink)).rejects.toMatchObject({ code: 'otp_expired' });
    expect((await main.auth.getSession()).data.session).toBeNull();
  });
  it('요청 주소만 복원하며 오래되거나 미래 시각인 저장값을 무시한다', () => {
    writePendingEmail({ email: user.email, sentAt: 1000 });
    expect(readPendingEmail(2000)?.email).toBe(user.email);
    expect(readPendingEmail(3_601_000)).toBeNull();
    expect(readPendingEmail(500)).toBeNull();
    expect(localStorage.getItem('skylog.community.pending-email')).not.toContain(token);
  });
  it('실제 SDK는 다른 브라우저의 verifier 없는 code를 서버에 보내지 않는다', async () => {
    await expect(
      exchangeLoginCode({ kind: 'code', code: 'fixture-pkce-code' }),
    ).rejects.toMatchObject({ name: 'AuthPKCECodeVerifierMissingError' });
    expect(requests).toHaveLength(0);
  });
  it('같은 앱의 요청 verifier로 native 콜드/실행 중 중복 이벤트를 한 번만 교환한다', async () => {
    await main.auth.signInWithOtp({ email: user.email });
    const callback = `${NATIVE_LOGIN_URL}?code=native-deduplicated-fixture-code`;
    await Promise.all([finishCommunityLogin(callback), finishCommunityLogin(callback)]);
    const exchanges = requests.filter((r) => r.path === 'main:/auth/v1/token');
    expect(exchanges).toHaveLength(1);
    expect(typeof exchanges[0]!.body.code_verifier).toBe('string');
    expect((await main.auth.getSession()).data.session?.user.email).toBe(user.email);
  });
  it('오류 콜백과 이전 토큰 URL을 즉시 정리하고 서버 오류 설명은 출력하지 않는다', async () => {
    history.replaceState(
      null,
      '',
      '/?keep=1#error=access_denied&error_code=otp_expired&error_description=private-message&access_token=secret',
    );
    await finishCommunityLogin();
    expect(location.href).not.toMatch(/secret|private-message|error_code/);
    expect(location.search).toBe('?keep=1');
    expect(location.hash).toBe('#/account');
    expect(requests).toHaveLength(0);
  });
  it('실패한 code를 다시 받으면 중복 방지에 갇히지 않고 재확인한다', async () => {
    const exchange = vi.spyOn(main.auth, 'exchangeCodeForSession');
    await finishCommunityLogin(`${PUBLIC_LOGIN_URL}?code=retry-fixture-code`);
    await finishCommunityLogin(`${PUBLIC_LOGIN_URL}?code=retry-fixture-code`);
    expect(exchange).toHaveBeenCalledTimes(2);
  });
  it('잘못된 복구 링크는 외부 URL로 이동하거나 요청하지 않는다', async () => {
    await expect(verifyPastedLogin('https://evil.invalid/?code=fixture-code')).rejects.toThrow(
      'INVALID_LOGIN_LINK',
    );
    expect(requests).toHaveLength(0);
  });
  it('확인 중 뒤늦게 들어온 오류 URL이 진행 중 상태를 풀거나 별도 결과를 만들지 않는다', async () => {
    await main.auth.signInWithOtp({ email: user.email });
    let release!: () => void;
    holdExchange = () =>
      new Promise<void>((done) => {
        release = done;
      });
    const first = finishCommunityLogin(`${NATIVE_LOGIN_URL}?code=held-fixture-code`);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const second = finishCommunityLogin(`${NATIVE_LOGIN_URL}#error_code=otp_expired`);
    expect(second).toBe(first);
    release();
    await first;
    expect((await main.auth.getSession()).data.session?.user.email).toBe(user.email);
  });
});

describe('로그인 링크 경계', () => {
  it('query와 hash 오류 및 code/flowId를 구분한다', () => {
    expect(parseLoginCallback(`${PUBLIC_LOGIN_URL}?code=fixture-code&sb_flow_id=flow-1`)).toEqual({
      kind: 'code',
      code: 'fixture-code',
      flowId: 'flow-1',
    });
    expect(parseLoginCallback(`${PUBLIC_LOGIN_URL}#/account?error_code=otp_expired`)).toEqual({
      kind: 'error',
      error: 'auth.expired',
    });
    expect(parseLoginCallback(`${PUBLIC_LOGIN_URL}#/sky`)).toBeNull();
  });
  it('허용된 웹/앱 주소의 code만 붙여넣기 복구로 받는다', () => {
    for (const base of [PUBLIC_LOGIN_URL, NATIVE_LOGIN_URL])
      expect(pastedLoginCallback(`${base}?code=fixture-code`)?.code).toBe('fixture-code');
    for (const url of [
      `${PUBLIC_LOGIN_URL}?code=fixture-code&code=another-code`,
      `${PUBLIC_LOGIN_URL}?code=fixture-code#code=another-code`,
      'https://evil@junhyoungpark-nobel.github.io/skylog/?code=fixture-code',
      'https://junhyoungpark-nobel.github.io/else/?code=fixture-code',
      'javascript:alert(1)',
      `${NATIVE_LOGIN_URL}/else?code=fixture-code`,
    ])
      expect(pastedLoginCallback(url)).toBeNull();
  });
  it('현재 프로젝트의 단일 email 토큰만 원본 확인 링크로 받는다', () => {
    expect(emailLinkToken(emailLink, 'https://auth-test.invalid')).toBe(token);
    for (const url of [
      emailLink.replace('auth-test.invalid', 'other.invalid'),
      emailLink.replace('https:', 'http:'),
      emailLink.replace('auth-test.invalid', 'me@auth-test.invalid'),
      `${emailLink}&token=${token}`,
      emailLink.replace('magiclink', 'recovery'),
      emailLink.replace('/verify?', '/verify/else?'),
    ])
      expect(emailLinkToken(url, 'https://auth-test.invalid')).toBeNull();
  });
  it('로그인 오류는 공개된 설명 키로만 매핑한다', () => {
    expect(loginError({ code: 'otp_expired', message: 'private' })).toBe('auth.expired');
    expect(loginError({ code: 'over_email_send_rate_limit' })).toBe('auth.rateLimit');
    expect(loginError(new TypeError('failed fetch'))).toBe('auth.network');
    expect(loginError(new Error('private token'))).toBe('auth.failed');
  });
});
