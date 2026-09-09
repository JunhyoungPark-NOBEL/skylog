import { communityClient, communityUrl, emailVerificationClient } from './client';

export const NATIVE_LOGIN_URL = 'io.github.junhyoungparknobel.skylog://login';
export const PUBLIC_LOGIN_URL = 'https://junhyoungpark-nobel.github.io/skylog/';
export const LOGIN_RESEND_MS = 60_000;
const PENDING_KEY = 'skylog.community.pending-email';
let memoryPending: PendingEmail | null = null;
let memoryOnly = false;
export interface PendingEmail {
  email: string;
  sentAt: number;
}

/** 메일 주소와 요청 시각만 보관한다. 코드·확인 링크·세션 토큰은 저장하지 않는다. */
export function readPendingEmail(now = Date.now()): PendingEmail | null {
  let value: unknown = memoryPending;
  try {
    if (!memoryOnly) value = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null');
  } catch {
    /* 저장소 접근 거부 시 이번 실행의 요청 기록을 사용한다. */
  }
  try {
    if (
      value &&
      typeof value === 'object' &&
      'email' in value &&
      typeof value.email === 'string' &&
      value.email.length <= 254 &&
      'sentAt' in value &&
      typeof value.sentAt === 'number' &&
      value.sentAt <= now &&
      now - value.sentAt < 3_600_000
    )
      return { email: value.email, sentAt: value.sentAt };
  } catch {
    /* 저장소가 막혀도 현재 화면에서 로그인할 수 있다. */
  }
  return null;
}
export function writePendingEmail(pending: PendingEmail | null) {
  memoryPending = pending;
  try {
    if (pending) localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else localStorage.removeItem(PENDING_KEY);
    memoryOnly = false;
  } catch {
    /* 비공개 브라우징에서는 메모리 상태를 사용한다. */
    memoryOnly = true;
  }
}

export function loginError(error: unknown): string {
  const value = error && typeof error === 'object' ? error : {};
  const code = 'code' in value && typeof value.code === 'string' ? value.code : '';
  const name = 'name' in value && typeof value.name === 'string' ? value.name : '';
  const message = 'message' in value && typeof value.message === 'string' ? value.message : '';
  if (code === 'pkce_code_verifier_not_found' || name === 'AuthPKCECodeVerifierMissingError')
    return 'auth.otherBrowser';
  if (['otp_expired', 'flow_state_expired', 'flow_state_not_found'].includes(code))
    return 'auth.expired';
  if (code === 'bad_code_verifier' || /code verifier/i.test(message)) return 'auth.otherBrowser';
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    ('status' in value && value.status === 429)
  )
    return 'auth.rateLimit';
  if (code === 'email_address_not_authorized' || /Email address not authorized/i.test(message))
    return 'social.emailUnavailable';
  if (code === 'INVALID_LOGIN_LINK') return 'auth.invalidLink';
  if (code === 'EMAIL_MISMATCH') return 'auth.emailMismatch';
  if (code === 'NO_PENDING_EMAIL') return 'auth.requestFirst';
  if (code === 'AUTH_CHANGED') return 'auth.accountChanged';
  if (code === 'otp_disabled' || code === 'signup_disabled') return 'auth.unavailable';
  if (name === 'AuthRetryableFetchError' || error instanceof TypeError) return 'auth.network';
  return 'auth.failed';
}

/** 메일의 원본 확인 링크만 허용한다. 임의 URL을 열거나 fetch하지 않는다. */
export function emailLinkToken(raw: string, projectUrl: string): string | null {
  if (raw.length > 8192) return null;
  try {
    const link = new URL(raw.trim());
    const project = new URL(projectUrl);
    if (
      link.protocol !== 'https:' ||
      link.origin !== project.origin ||
      link.username ||
      link.password ||
      link.pathname !== '/auth/v1/verify'
    )
      return null;
    if (
      link.searchParams.getAll('token').length !== 1 ||
      link.searchParams.getAll('type').length !== 1
    )
      return null;
    if (!['email', 'magiclink', 'signup'].includes(link.searchParams.get('type') ?? ''))
      return null;
    const token = link.searchParams.get('token');
    return token && /^[A-Za-z0-9_-]{20,2048}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}
export async function verifyEmailLink(raw: string): Promise<void> {
  const token = communityUrl ? emailLinkToken(raw, communityUrl) : null;
  if (!token) throw Object.assign(new Error('INVALID_LOGIN_LINK'), { code: 'INVALID_LOGIN_LINK' });
  const expected = readPendingEmail();
  if (!expected) throw Object.assign(new Error('NO_PENDING_EMAIL'), { code: 'NO_PENDING_EMAIL' });
  const main = communityClient();
  const previous = await main.auth.getSession();
  if (previous.error) throw previous.error;
  // 유효한 타인 링크를 붙여넣더라도 현재 세션이 그 계정으로 바뀌지 않게 먼저 격리 검증한다.
  const verifier = emailVerificationClient();
  const result = await verifier.auth.verifyOtp({ token_hash: token, type: 'email' });
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error('NO_SESSION');
  if (result.data.user?.email?.toLowerCase() !== expected.email.toLowerCase())
    throw Object.assign(new Error('EMAIL_MISMATCH'), { code: 'EMAIL_MISMATCH' });
  // 확인 도중 다른 요청을 시작했거나 로그아웃한 경우에도 옛 요청의 세션을 적용하지 않는다.
  const latest = readPendingEmail();
  if (latest?.email !== expected.email || latest.sentAt !== expected.sentAt)
    throw Object.assign(new Error('NO_PENDING_EMAIL'), { code: 'NO_PENDING_EMAIL' });
  const current = await main.auth.getSession();
  if (current.error) throw current.error;
  if (current.data.session?.user.id !== previous.data.session?.user.id)
    throw Object.assign(new Error('AUTH_CHANGED'), { code: 'AUTH_CHANGED' });
  const applied = await main.auth.setSession({
    access_token: result.data.session.access_token,
    refresh_token: result.data.session.refresh_token,
  });
  if (applied.error) throw applied.error;
  if (!applied.data.session) throw new Error('NO_SESSION');
  writePendingEmail(null);
}
