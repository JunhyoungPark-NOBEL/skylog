import {
  PLUS_PRODUCT_ID,
  type BillingBridge,
  type EntitlementResponse,
  type EntitlementSnapshot,
  type MonetizationMode,
  type NativePurchase,
  type PurchaseActionResult,
} from './types';

interface Ports {
  mode: MonetizationMode;
  configured: boolean;
  android: boolean;
  account(): Promise<string | null>;
  request(
    action: 'status' | 'prepare' | 'verify',
    body: object,
    accountId: string,
  ): Promise<unknown>;
  billing: BillingBridge;
}
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object';
export function parseEntitlementResponse(x: unknown, accountId: string): EntitlementResponse {
  if (
    !object(x) ||
    x.accountId !== accountId ||
    x.productId !== PLUS_PRODUCT_ID ||
    typeof x.hasPlus !== 'boolean' ||
    typeof x.billingReady !== 'boolean' ||
    typeof x.restoreReady !== 'boolean' ||
    !['none', 'play', 'grant'].includes(String(x.source)) ||
    !(
      x.validUntil === null ||
      (typeof x.validUntil === 'string' && Number.isFinite(Date.parse(x.validUntil)))
    ) ||
    (x.hasPlus && (x.source === 'none' || !x.validUntil)) ||
    (!x.hasPlus && x.source !== 'none')
  )
    throw new Error('INVALID_ENTITLEMENT_RESPONSE');
  return x as unknown as EntitlementResponse;
}

/** 서버 결과는 메모리에만 둔다. 백업/로컬 플래그로 권한을 만들 수 없다. */
export function createEntitlementsController(ports: Ports) {
  let generation = 0;
  let refreshSequence = 0;
  let operation = false;
  let lastChecked = 0;
  let snapshot: EntitlementSnapshot = {
    status: 'loading',
    accountId: null,
    mode: ports.mode,
    hasPlus: false,
    source: 'none',
    validUntil: null,
    availability: 'setup-required',
    product: null,
    restoreAvailable: false,
    error: null,
    busy: false,
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<EntitlementSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((fn) => fn());
  };
  const setAccount = (id: string | null) => {
    if (id === snapshot.accountId) return;
    generation++;
    lastChecked = 0;
    update({
      accountId: id,
      hasPlus: false,
      source: 'none',
      validUntil: null,
      product: null,
      restoreAvailable: false,
      availability: 'setup-required',
      status: 'loading',
      error: null,
    });
  };
  const assertAccount = async (id: string, version: number) => {
    const current = await ports.account();
    if (current !== snapshot.accountId) setAccount(current);
    if (current !== id || version !== generation) throw new Error('ACCOUNT_CHANGED');
  };
  const apply = (data: EntitlementResponse) =>
    update({
      status: 'ready',
      hasPlus: data.hasPlus,
      source: data.source,
      validUntil: data.validUntil,
      restoreAvailable: ports.mode === 'live' && ports.android && data.restoreReady,
      availability:
        ports.mode !== 'live' || !data.billingReady
          ? 'setup-required'
          : !ports.android
            ? 'unsupported-platform'
            : 'android-play',
      error: null,
    });
  async function refresh(force = false) {
    if (operation && !force) return;
    const sequence = ++refreshSequence;
    let id: string | null;
    try {
      id = ports.configured ? await ports.account() : null;
    } catch {
      if (sequence !== refreshSequence) return;
      if (ports.mode === 'preview') {
        setAccount(null);
        update({
          status: 'ready',
          hasPlus: false,
          source: 'none',
          validUntil: null,
          product: null,
          restoreAvailable: false,
          availability: 'setup-required',
          error: null,
        });
        return;
      }
      update({
        status: 'unavailable',
        hasPlus: false,
        source: 'none',
        validUntil: null,
        product: null,
        restoreAvailable: false,
        availability: 'setup-required',
        error: 'AUTH_UNAVAILABLE',
      });
      return;
    }
    if (sequence !== refreshSequence) return;
    setAccount(id);
    const version = generation;
    // 미배포 결제 서버를 조회하지 않는다. 베타 체험은 서버 구매 권한과 별개다.
    if (ports.mode === 'preview') {
      update({
        status: 'ready',
        hasPlus: false,
        source: 'none',
        validUntil: null,
        product: null,
        restoreAvailable: false,
        availability: 'setup-required',
        error: null,
      });
      return;
    }
    if (!ports.configured || !id) {
      update({
        status: 'ready',
        hasPlus: false,
        source: 'none',
        validUntil: null,
        product: null,
        restoreAvailable: false,
        availability: ports.configured ? 'sign-in-required' : 'setup-required',
      });
      return;
    }
    if (!force && snapshot.status === 'ready' && Date.now() - lastChecked < 15000) return;
    try {
      const data = parseEntitlementResponse(await ports.request('status', {}, id), id);
      await assertAccount(id, version);
      if (sequence !== refreshSequence) return;
      apply(data);
      lastChecked = Date.now();
      if (snapshot.availability === 'android-play') {
        const { product } = await ports.billing.getProduct();
        await assertAccount(id, version);
        if (sequence !== refreshSequence) return;
        if (
          product.id !== PLUS_PRODUCT_ID ||
          !product.formattedPrice ||
          !/^[A-Z]{3}$/.test(product.currencyCode) ||
          !Number.isSafeInteger(product.priceMicros) ||
          product.priceMicros <= 0
        )
          throw new Error('PRODUCT_UNAVAILABLE');
        update({ product });
      } else update({ product: null });
    } catch (error) {
      if (generation !== version || sequence !== refreshSequence) return;
      update({
        status: 'unavailable',
        availability: 'setup-required',
        product: null,
        error: error instanceof Error ? error.message : 'REQUEST_FAILED',
      });
      if (error instanceof Error && error.message === 'AUTH_REQUIRED')
        update({ hasPlus: false, source: 'none', validUntil: null, restoreAvailable: false });
      // 이미 검증된 짧은 임대의 남은 시간만 유지한다. canAccessPlus가 만료를 검사한다.
    }
  }
  async function verify(
    purchases: NativePurchase[],
    id: string,
    version: number,
  ): Promise<PurchaseActionResult> {
    const matching = purchases.filter((p) => p.productId === PLUS_PRODUCT_ID);
    if (matching.length > 5) throw new Error('INVALID_PURCHASES');
    if (!matching.length) return { status: 'nothing-to-restore' };
    let result: PurchaseActionResult = { status: 'pending' };
    for (const purchase of matching) {
      await assertAccount(id, version);
      // PURCHASED/PENDING은 모두 서버에서 다시 확인한다. 클라이언트 상태는 권한 근거가 아니다.
      const raw = await ports.request('verify', { purchaseToken: purchase.purchaseToken }, id);
      await assertAccount(id, version);
      const data = parseEntitlementResponse(raw, id);
      apply(data);
      if (
        !object(raw) ||
        !['purchased', 'pending', 'cancelled'].includes(String(raw.purchaseState))
      )
        throw new Error('INVALID_PURCHASE_STATE');
      if (raw.purchaseState === 'cancelled') result = { status: 'cancelled' };
      else if (raw.purchaseState === 'purchased' && data.hasPlus) result = { status: 'verified' };
    }
    return result;
  }
  async function action(restore: boolean): Promise<PurchaseActionResult> {
    if (operation) return { status: 'unavailable', error: 'BUSY' };
    operation = true;
    update({ busy: true, error: null });
    let id: string | null = null;
    let version = generation;
    try {
      await refresh(true);
      id = snapshot.accountId;
      version = generation;
      if (
        !id ||
        (restore
          ? !snapshot.restoreAvailable
          : snapshot.availability !== 'android-play' || !snapshot.product)
      )
        return { status: 'unavailable', error: snapshot.error ?? snapshot.availability };
      if (
        !restore &&
        snapshot.hasPlus &&
        snapshot.validUntil &&
        Date.parse(snapshot.validUntil) > Date.now()
      )
        return { status: 'verified' };
      await assertAccount(id, version);
      if (restore) return await verify((await ports.billing.restore()).purchases, id, version);
      const prepared = await ports.request('prepare', {}, id);
      await assertAccount(id, version);
      if (
        !object(prepared) ||
        prepared.accountId !== id ||
        prepared.productId !== PLUS_PRODUCT_ID ||
        typeof prepared.obfuscatedAccountId !== 'string' ||
        !/^[a-f0-9]{64}$/.test(prepared.obfuscatedAccountId)
      )
        throw new Error('BILLING_NOT_CONFIGURED');
      const result = await ports.billing.purchase({
        obfuscatedAccountId: prepared.obfuscatedAccountId,
      });
      await assertAccount(id, version);
      if (result.state === 'cancelled') return { status: 'cancelled' };
      if (result.state === 'already-owned')
        return await verify((await ports.billing.restore()).purchases, id, version);
      return await verify(result.purchases, id, version);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
      if (version === generation && id === snapshot.accountId) update({ error: message });
      return { status: 'error', error: message };
    } finally {
      operation = false;
      update({ busy: false });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    setAccount,
    refresh,
    async checkAccess() {
      const id = ports.configured ? await ports.account() : null;
      setAccount(id);
      await refresh();
    },
    purchase: () => action(false),
    restore: () => action(true),
  };
}
