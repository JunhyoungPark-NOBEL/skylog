import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const communityConfigured = !!url && !!key;
export const emailCodeEnabled = import.meta.env.VITE_COMMUNITY_EMAIL_CODE === 'true';
export const signupsReady = import.meta.env.VITE_COMMUNITY_SIGNUPS_READY === 'true';
let client: SupabaseClient | null = null;
export function communityClient(): SupabaseClient {
  if (!url || !key) throw new Error('NOT_CONNECTED');
  return (client ??= createClient(url, key, {
    auth: { storageKey: 'skylog.community.auth', detectSessionInUrl: false, flowType: 'pkce' },
  }));
}
export function useCommunityUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!communityConfigured);
  useEffect(() => {
    if (!communityConfigured) return;
    let alive = true;
    let authEvents = 0;
    const c = communityClient();
    void c.auth
      .getSession()
      .then(({ data }) => {
        if (alive && authEvents === 0) {
          setUser(data.session?.user ?? null);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive && authEvents === 0) setReady(true);
      });
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      authEvents += 1;
      if (alive) {
        setUser(session?.user ?? null);
        setReady(true);
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return { user, ready };
}
export async function communityAction(action: string, payload: Record<string, unknown>) {
  const result = await communityClient().rpc('sky_action', { action, payload });
  if (result.error) throw new Error(result.error.message);
}
export async function edgeAction(action: string, body: BodyInit | object): Promise<Response> {
  const c = communityClient();
  const { data } = await c.auth.getSession();
  const isForm = body instanceof FormData;
  const response = await fetch(
    `${url}/functions/v1/community?action=${encodeURIComponent(action)}`,
    {
      method: 'POST',
      headers: {
        apikey: key!,
        Authorization: `Bearer ${data.session?.access_token ?? key}`,
        ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
      },
      body:
        isForm || typeof body === 'string' || body instanceof Blob ? body : JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const detail: unknown = await response.json().catch(() => null);
    throw new Error(
      detail && typeof detail === 'object' && 'error' in detail && typeof detail.error === 'string'
        ? detail.error
        : 'REQUEST_FAILED',
    );
  }
  return response;
}
export function communityError(error: unknown): string {
  const msg = error instanceof Error ? error.message : '';
  if (msg.includes('RATE_LIMIT')) return 'social.rateLimit';
  if (msg.includes('ACCOUNT_UNAVAILABLE')) return 'social.accountUnavailable';
  if (msg.includes('REAUTH_REQUIRED')) return 'social.reauth';
  if (msg.includes('TOO_LARGE')) return 'social.backupTooLarge';
  if (msg.includes('email_address_not_authorized') || msg.includes('Email address not authorized'))
    return 'social.emailUnavailable';
  return 'social.error';
}
