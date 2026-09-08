import { communityClient } from './client';
/** 메일 링크의 일회용 코드를 같은 브라우저의 PKCE 검증자와 교환한다. URL에서 즉시 지운다. */
export async function finishCommunityLogin(code: string): Promise<void> {
  const clean = new URL(window.location.href);
  clean.searchParams.delete('code');
  clean.hash = '#/account';
  window.history.replaceState(null, '', clean);
  try {
    const result = await communityClient().auth.exchangeCodeForSession(code);
    if (result.error) throw result.error;
  } catch {
    window.location.hash = '#/account?auth_error=1';
  }
}
