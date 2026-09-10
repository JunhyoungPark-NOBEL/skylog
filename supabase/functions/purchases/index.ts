// JWT는 getUser로 검증한다. 상품·검증 키·정기 조회가 준비되지 않은 기본값은 판매 중지다.
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { PRODUCT_ID, settlePurchase, validPurchaseToken } from './domain.ts';
import { googlePurchases, serviceAccount } from './google.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const googleAccount = serviceAccount(Deno.env.get('SKYARD_GOOGLE_SERVICE_ACCOUNT_JSON'));
const reconcileSecret = Deno.env.get('SKYARD_BILLING_RECONCILE_SECRET') ?? '';
const billingReady =
  Deno.env.get('SKYARD_BILLING_ENABLED') === 'true' &&
  !!googleAccount &&
  reconcileSecret.length >= 32;
const allowTest = Deno.env.get('SKYARD_BILLING_ALLOW_TEST_PURCHASES') === 'true';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
function must<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error('DATABASE_UNAVAILABLE');
  return result.data;
}
async function sha256(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
async function constantEqual(a: string, b: string) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let different = 0;
  for (let i = 0; i < x.length; i++) different |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return different === 0;
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length') ?? 0) > 8192) throw new Error('INVALID_REQUEST');
  const reader = request.body?.getReader();
  if (!reader) return {};
  let bytes = new Uint8Array(0);
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    if (bytes.length + part.value.length > 8192) {
      await reader.cancel();
      throw new Error('INVALID_REQUEST');
    }
    const next = new Uint8Array(bytes.length + part.value.length);
    next.set(bytes);
    next.set(part.value, bytes.length);
    bytes = next;
  }
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_REQUEST');
  return value as Record<string, unknown>;
}
async function status(owner: string) {
  const entitlement = must(await admin.rpc('sky_plus_status', { p_owner: owner }));
  if (!entitlement || typeof entitlement !== 'object') throw new Error('DATABASE_UNAVAILABLE');
  return {
    ...entitlement,
    accountId: owner,
    productId: PRODUCT_ID,
    billingReady,
    restoreReady: !!googleAccount,
  };
}
async function verify(owner: string, token: string, obfuscated: string) {
  if (!googleAccount) throw new Error('BILLING_NOT_CONFIGURED');
  const tokenHash = await sha256(token);
  const existing = must(
    await admin
      .from('sky_play_purchases')
      .select('owner,obfuscated_id')
      .eq('token_hash', tokenHash)
      .maybeSingle(),
  );
  if (existing && (existing.owner !== owner || existing.obfuscated_id !== obfuscated))
    throw new Error('PURCHASE_ACCOUNT_MISMATCH');
  const google = googlePurchases(googleAccount, token);
  return settlePurchase(
    {
      ...google,
      save: async (purchase) => {
        must(
          await admin.rpc('sky_save_play_purchase', {
            p_owner: owner,
            p_hash: tokenHash,
            p_token: token,
            p_obfuscated: obfuscated,
            p_state: purchase.state,
            p_ack: purchase.acknowledged,
            p_test: purchase.testPurchase,
          }),
        );
      },
    },
    obfuscated,
    allowTest,
  );
}
async function refreshOwned(owner: string) {
  if (!googleAccount) return;
  const old = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const rows = must(
    await admin
      .from('sky_play_purchases')
      .select('purchase_token,obfuscated_id,token_hash')
      .eq('owner', owner)
      .neq('state', 'cancelled')
      .lt('verified_at', old)
      .order('verified_at')
      .limit(5),
  );
  for (const row of rows ?? []) {
    try {
      await verify(owner, row.purchase_token, row.obfuscated_id);
    } catch {
      /* 서비스 장애는 승인도 취소도 만들지 않는다. 기존 임대는 만료된다. */
    }
  }
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: 'METHOD' }, 405);
  try {
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'reconcile') {
      // 별도 스케줄러 비밀로만 호출한다. 사용자 세션/공개 키로 호출할 수 없다.
      if (
        !googleAccount ||
        reconcileSecret.length < 32 ||
        !(await constantEqual(request.headers.get('x-skyard-reconcile') ?? '', reconcileSecret))
      )
        return json({ error: 'FORBIDDEN' }, 403);
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const rows = must(
        await admin
          .from('sky_play_purchases')
          .select('owner,purchase_token,obfuscated_id,token_hash')
          .not('owner', 'is', null)
          .neq('state', 'cancelled')
          .lt('checked_at', cutoff)
          .order('checked_at')
          .limit(50),
      );
      let verified = 0,
        failed = 0;
      for (const row of rows ?? []) {
        try {
          await verify(row.owner, row.purchase_token, row.obfuscated_id);
          verified++;
        } catch {
          failed++;
        }
        // 실패 한 건이 다음 배치의 다른 구매를 영원히 가리지 않도록 시도 시각만 갱신한다.
        must(
          await admin
            .from('sky_play_purchases')
            .update({ checked_at: new Date().toISOString() })
            .eq('token_hash', row.token_hash),
        );
      }
      return json({ checked: rows?.length ?? 0, verified, failed });
    }
    if (!['status', 'prepare', 'verify'].includes(action ?? ''))
      return json({ error: 'INVALID_ACTION' }, 400);
    const authToken = request.headers.get('authorization')?.replace(/^Bearer /i, '') ?? '';
    const auth = await admin.auth.getUser(authToken);
    const owner = auth.data.user?.id;
    if (auth.error || !owner) return json({ error: 'AUTH_REQUIRED' }, 401);
    const limit = await admin.rpc('sky_billing_allow', { p_owner: owner });
    if (limit.error)
      return json(
        {
          error: limit.error.message.includes('RATE_LIMIT') ? 'RATE_LIMIT' : 'DATABASE_UNAVAILABLE',
        },
        429,
      );
    if (action === 'status') {
      await refreshOwned(owner);
      return json(await status(owner));
    }
    if (action === 'prepare') {
      if (!billingReady) return json({ error: 'BILLING_NOT_CONFIGURED' }, 503);
      if ((await status(owner)).hasPlus) return json({ error: 'ALREADY_ENTITLED' }, 409);
      const obfuscatedAccountId = must(await admin.rpc('sky_billing_account', { p_owner: owner }));
      return json({ accountId: owner, productId: PRODUCT_ID, obfuscatedAccountId });
    }
    // 판매를 중단해도 이미 결제된 구매 확인/복원은 지원한다.
    if (!googleAccount) return json({ error: 'BILLING_NOT_CONFIGURED' }, 503);
    const input = await body(request);
    if (!validPurchaseToken(input.purchaseToken))
      return json({ error: 'INVALID_PURCHASE_TOKEN' }, 400);
    const obfuscated = must(await admin.rpc('sky_billing_account', { p_owner: owner }));
    if (typeof obfuscated !== 'string') throw new Error('DATABASE_UNAVAILABLE');
    const verified = await verify(owner, input.purchaseToken, obfuscated);
    return json({ ...(await status(owner)), purchaseState: verified.state });
  } catch (error) {
    const safe = new Set([
      'BILLING_NOT_CONFIGURED',
      'DATABASE_UNAVAILABLE',
      'PURCHASE_ACCOUNT_MISMATCH',
      'WRONG_PRODUCT',
      'WRONG_PURCHASE_OPTION',
      'INVALID_QUANTITY',
      'INVALID_PURCHASE_STATE',
      'PURCHASE_CONSUMED',
      'TEST_PURCHASE_NOT_ALLOWED',
      'ACKNOWLEDGEMENT_PENDING',
      'GOOGLE_AUTH_UNAVAILABLE',
      'GOOGLE_UNAVAILABLE',
      'PURCHASE_NOT_FOUND',
      'INVALID_REQUEST',
    ]);
    const code =
      error instanceof Error && safe.has(error.message) ? error.message : 'VERIFICATION_FAILED';
    return json({ error: code }, code === 'PURCHASE_ACCOUNT_MISMATCH' ? 409 : 503);
  }
});
