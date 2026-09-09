import { useSyncExternalStore } from 'react';
import { communityClient } from './client';
import {
  loginError,
  NATIVE_LOGIN_URL,
  PUBLIC_LOGIN_URL,
  verifyEmailLink,
  writePendingEmail,
} from './auth';

export type LoginCallback =
  { kind: 'code'; code: string; flowId?: string } | { kind: 'error'; error: string };
const AUTH_PARAMS = [
  'code',
  'sb_flow_id',
  'error',
  'error_code',
  'error_description',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'token_hash',
  'type',
];

export function parseLoginCallback(raw: string): LoginCallback | null {
  if (raw.length > 8192) return { kind: 'error', error: 'auth.invalidLink' };
  try {
    const url = new URL(raw);
    const fragment = url.hash.slice(1);
    const hashParams = new URLSearchParams(
      fragment.startsWith('/') ? fragment.split('?')[1] : fragment,
    );
    const get = (key: string) => url.searchParams.get(key) ?? hashParams.get(key);
    if (
      AUTH_PARAMS.some(
        (key) => url.searchParams.getAll(key).length + hashParams.getAll(key).length > 1,
      )
    )
      return { kind: 'error', error: 'auth.invalidLink' };
    if (get('error') || get('error_code'))
      return { kind: 'error', error: loginError({ code: get('error_code') ?? get('error') }) };
    const code = get('code');
    if (code && /^[A-Za-z0-9_-]{10,2048}$/.test(code)) {
      const flowId = get('sb_flow_id');
      if (flowId && !/^[A-Za-z0-9_-]{1,128}$/.test(flowId))
        return { kind: 'error', error: 'auth.invalidLink' };
      return { kind: 'code', code, ...(flowId ? { flowId } : {}) };
    }
    // 이전 implicit 링크는 토큰을 URL에 남기지 않고 새 메일로 복구한다.
    if (code || get('access_token') || get('refresh_token') || get('token_hash'))
      return { kind: 'error', error: 'auth.expired' };
  } catch {
    /* 일반 앱 링크는 인증 처리 대상이 아니다. */
  }
  return null;
}

interface CallbackState {
  busy: boolean;
  error: string;
  recoveryUrl: string | null;
  nativeUrl: string | null;
}
const empty: CallbackState = { busy: false, error: '', recoveryUrl: null, nativeUrl: null };
let state: CallbackState = empty;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => state;
export function useLoginCallback() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
function publish(next: CallbackState) {
  state = next;
  listeners.forEach((listener) => listener());
}
export function clearLoginCallback() {
  publish(empty);
}

let lastCode: string | null = null;
let pending: Promise<void> | null = null;
let handoffTimer: ReturnType<typeof setTimeout> | undefined;
export async function exchangeLoginCode(
  callback: Extract<LoginCallback, { kind: 'code' }>,
): Promise<void> {
  const result = await communityClient().auth.exchangeCodeForSession(
    callback.code,
    callback.flowId ? { flowId: callback.flowId } : undefined,
  );
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error('NO_SESSION');
  writePendingEmail(null);
}
/** URL의 자격 증명을 렌더 전에 지우고, 실패한 외부 브라우저에만 한시적 앱 복귀를 제공한다. */
export function finishCommunityLogin(raw = window.location.href): Promise<void> {
  const callback = parseLoginCallback(raw);
  if (!callback) return Promise.resolve();
  const clean = new URL(window.location.href);
  AUTH_PARAMS.forEach((key) => clean.searchParams.delete(key));
  clean.hash = '#/account';
  window.history.replaceState(null, '', clean);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  // 뒤이어 들어온 오류 URL도 이미 진행 중인 확인 상태를 풀지 않는다.
  if (pending) return pending;
  if (callback.kind === 'error') {
    publish({ ...empty, error: callback.error });
    return Promise.resolve();
  }
  if (lastCode === callback.code) return pending ?? Promise.resolve();
  // 동일한 콜드 시작·URL 이벤트가 일회용 코드를 두 번 소비하지 않게 한다.
  lastCode = callback.code;
  clearTimeout(handoffTimer);
  publish({ ...empty, busy: true });
  pending = (async () => {
    try {
      await exchangeLoginCode(callback);
      clearLoginCallback();
    } catch (error) {
      lastCode = null;
      const key = loginError(error);
      const native = new URL(NATIVE_LOGIN_URL);
      const recovery = new URL(PUBLIC_LOGIN_URL);
      for (const url of [native, recovery]) {
        url.searchParams.set('code', callback.code);
        if (callback.flowId) url.searchParams.set('sb_flow_id', callback.flowId);
      }
      publish({
        ...empty,
        error: key,
        nativeUrl: key === 'auth.otherBrowser' ? native.href : null,
        recoveryUrl: key === 'auth.otherBrowser' ? recovery.href : null,
      });
    } finally {
      pending = null;
      handoffTimer = setTimeout(() => {
        lastCode = null;
        if (state.recoveryUrl) publish({ ...empty, error: 'auth.expired' });
      }, 5 * 60_000);
    }
  })();
  return pending;
}

/** 사용자가 붙여넣은 앱 복구 링크는 정해진 주소와 PKCE 코드만 받는다. */
export function pastedLoginCallback(raw: string): Extract<LoginCallback, { kind: 'code' }> | null {
  try {
    const url = new URL(raw.trim());
    const approved = [PUBLIC_LOGIN_URL, NATIVE_LOGIN_URL].some((base) => {
      const expected = new URL(base);
      return (
        url.protocol === expected.protocol &&
        url.hostname === expected.hostname &&
        url.port === expected.port &&
        url.pathname === expected.pathname
      );
    });
    if (!approved || url.username || url.password) return null;
    const callback = parseLoginCallback(url.href);
    return callback?.kind === 'code' ? callback : null;
  } catch {
    return null;
  }
}
export async function verifyPastedLogin(raw: string): Promise<void> {
  const callback = pastedLoginCallback(raw);
  if (callback) await exchangeLoginCode(callback);
  else await verifyEmailLink(raw);
  clearLoginCallback();
}
