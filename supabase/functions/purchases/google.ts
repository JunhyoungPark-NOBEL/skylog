import { PACKAGE_NAME, PRODUCT_ID } from './domain.ts';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}
let cached: { token: string; expires: number; email: string } | undefined;
const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
const encode = (value: object) => base64url(new TextEncoder().encode(JSON.stringify(value)));
export function serviceAccount(raw: string | undefined): ServiceAccount | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (
      !value ||
      typeof value !== 'object' ||
      !('client_email' in value) ||
      !('private_key' in value) ||
      typeof value.client_email !== 'string' ||
      !value.client_email.endsWith('.iam.gserviceaccount.com') ||
      typeof value.private_key !== 'string' ||
      !value.private_key.includes('BEGIN PRIVATE KEY')
    )
      return null;
    return { client_email: value.client_email, private_key: value.private_key };
  } catch {
    return null;
  }
}
async function accessToken(account: ServiceAccount) {
  if (cached && cached.email === account.client_email && cached.expires > Date.now() + 60000)
    return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const der = Uint8Array.from(
    atob(account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${base64url(new Uint8Array(signature))}`,
    }),
  });
  if (!response.ok) throw new Error('GOOGLE_AUTH_UNAVAILABLE');
  const result = await response.json();
  if (typeof result.access_token !== 'string' || typeof result.expires_in !== 'number')
    throw new Error('GOOGLE_AUTH_UNAVAILABLE');
  cached = {
    token: result.access_token,
    expires: Date.now() + Math.min(result.expires_in, 3600) * 1000,
    email: account.client_email,
  };
  return cached.token;
}
/** URL/token/Google 원문 오류를 로깅하거나 클라이언트로 돌려주지 않는다. */
export function googlePurchases(account: ServiceAccount, purchaseToken: string) {
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/`;
  async function request(path: string, post = false) {
    const response = await fetch(base + path, {
      method: post ? 'POST' : 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: `Bearer ${await accessToken(account)}`,
        'Content-Type': 'application/json',
      },
      ...(post ? { body: '{}' } : {}),
    });
    if (!response.ok)
      throw new Error(
        response.status === 404 || response.status === 410
          ? 'PURCHASE_NOT_FOUND'
          : 'GOOGLE_UNAVAILABLE',
      );
    return response;
  }
  return {
    read: async (): Promise<unknown> =>
      (await request(`productsv2/tokens/${encodeURIComponent(purchaseToken)}`)).json(),
    acknowledge: async () => {
      await request(
        `products/${PRODUCT_ID}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
        true,
      );
    },
  };
}
