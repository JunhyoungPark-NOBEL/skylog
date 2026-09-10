import { describe, expect, it, vi } from 'vitest';
import {
  createEntitlementsController,
  parseEntitlementResponse,
} from '../../src/entitlements/controller';
import {
  canAccessPlus,
  PLUS_PRODUCT_ID,
  type BillingBridge,
  type MonetizationMode,
} from '../../src/entitlements/types';
import { settlePurchase, verifyGooglePurchase } from '../../supabase/functions/purchases/domain';

const owner = 'account-a';
const obfuscated = 'a'.repeat(64);
const response = (plus = false, id = owner) => ({
  accountId: id,
  hasPlus: plus,
  source: plus ? 'play' : 'none',
  validUntil: plus ? new Date(Date.now() + 3600000).toISOString() : null,
  productId: PLUS_PRODUCT_ID,
  billingReady: true,
  restoreReady: true,
});
function fixture(mode: MonetizationMode = 'live', android = true) {
  let account: string | null = owner;
  const billing: BillingBridge = {
    getProduct: vi.fn<BillingBridge['getProduct']>(async () => ({
      product: {
        id: PLUS_PRODUCT_ID,
        formattedPrice: '₩9,900',
        currencyCode: 'KRW',
        priceMicros: 9900000000,
      },
    })),
    purchase: vi.fn<BillingBridge['purchase']>(async () => ({
      state: 'purchased',
      purchases: [
        {
          productId: PLUS_PRODUCT_ID,
          purchaseToken: 'verified-token-00000000000000',
          state: 'purchased',
        },
      ],
    })),
    restore: vi.fn<BillingBridge['restore']>(async () => ({
      purchases: [
        {
          productId: PLUS_PRODUCT_ID,
          purchaseToken: 'verified-token-00000000000000',
          state: 'purchased',
        },
      ],
    })),
  };
  const request = vi.fn(async (action: string): Promise<unknown> =>
    action === 'prepare'
      ? { accountId: account, productId: PLUS_PRODUCT_ID, obfuscatedAccountId: obfuscated }
      : action === 'verify'
        ? { ...response(true, account ?? ''), purchaseState: 'purchased' }
        : response(false, account ?? ''),
  );
  const c = createEntitlementsController({
    mode,
    android,
    configured: true,
    account: async () => account,
    billing,
    request,
  });
  return {
    c,
    billing,
    request,
    setAccount: (id: string | null) => {
      account = id;
      c.setAccount(id);
    },
  };
}
describe('계정에 귀속된 심화 이용권', () => {
  it('베타 미리보기는 허용하지만 구매 권한이나 과금 흐름을 만들지 않는다', async () => {
    const { c, billing, request } = fixture('preview');
    request.mockRejectedValue(new Error('PURCHASES_ENDPOINT_NOT_DEPLOYED'));
    await c.refresh();
    expect(canAccessPlus(c.getSnapshot())).toBe(true);
    expect(c.getSnapshot().hasPlus).toBe(false);
    expect((await c.purchase()).status).toBe('unavailable');
    expect(billing.purchase).not.toHaveBeenCalled();
    expect((await c.restore()).status).toBe('unavailable');
    expect(c.getSnapshot()).toMatchObject({
      status: 'ready',
      accountId: owner,
      hasPlus: false,
      source: 'none',
      error: null,
      product: null,
      restoreAvailable: false,
    });
    expect(request).not.toHaveBeenCalled();
    expect(billing.getProduct).not.toHaveBeenCalled();
    expect(billing.restore).not.toHaveBeenCalled();
  });
  it('서버 설정이 없으면 네이티브 결제를 열지 않는다', async () => {
    const { c, billing, request } = fixture();
    request.mockResolvedValue({ ...response(), billingReady: false, restoreReady: false });
    expect((await c.purchase()).status).toBe('unavailable');
    expect(billing.purchase).not.toHaveBeenCalled();
  });
  it('네이티브 구매 완료만으로 권한을 주지 않고 서버 검증까지 기다린다', async () => {
    const { c, request } = fixture();
    let resolve: (v: unknown) => void = () => {};
    const pending = new Promise<unknown>((r) => {
      resolve = r;
    });
    request.mockImplementation(async (action) =>
      action === 'prepare'
        ? { accountId: owner, productId: PLUS_PRODUCT_ID, obfuscatedAccountId: obfuscated }
        : action === 'verify'
          ? pending
          : response(),
    );
    const purchase = c.purchase();
    await vi.waitFor(() =>
      expect(request).toHaveBeenCalledWith('verify', expect.anything(), owner),
    );
    expect(canAccessPlus(c.getSnapshot())).toBe(false);
    resolve({ ...response(true), purchaseState: 'purchased' });
    expect((await purchase).status).toBe('verified');
    expect(canAccessPlus(c.getSnapshot())).toBe(true);
  });
  it('구매 대화상자 중 계정 변경은 새 계정에 구매를 귀속시키지 않는다', async () => {
    const { c, billing, request, setAccount } = fixture();
    billing.purchase = vi.fn<BillingBridge['purchase']>(async () => {
      setAccount('account-b');
      return {
        state: 'purchased',
        purchases: [
          {
            productId: PLUS_PRODUCT_ID,
            purchaseToken: 'token-for-a-000000000000',
            state: 'purchased',
          },
        ],
      };
    });
    expect(await c.purchase()).toEqual({ status: 'error', error: 'ACCOUNT_CHANGED' });
    expect(c.getSnapshot().accountId).toBe('account-b');
    expect(canAccessPlus(c.getSnapshot())).toBe(false);
    expect(request.mock.calls.some((c) => c[0] === 'verify')).toBe(false);
  });
  it('이전 계정의 늦은 응답은 로그아웃한 화면을 다시 열지 않는다', async () => {
    const { c, request, setAccount } = fixture();
    let resolve: (v: unknown) => void = () => {};
    request.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const loading = c.refresh();
    await vi.waitFor(() => expect(request).toHaveBeenCalled());
    setAccount(null);
    resolve(response(true));
    await loading;
    expect(c.getSnapshot().accountId).toBeNull();
    expect(canAccessPlus(c.getSnapshot())).toBe(false);
  });
  it('서버의 다른 계정 응답 및 잘못된 유효기간은 거부한다', () => {
    expect(() => parseEntitlementResponse(response(true, 'account-b'), owner)).toThrow();
    expect(() =>
      parseEntitlementResponse({ ...response(true), validUntil: 'forever' }, owner),
    ).toThrow();
  });
  it('이전 계정 조회의 늦은 실패는 새 계정의 검증된 권한을 비우지 않는다', async () => {
    const { billing } = fixture();
    let rejectOld: (error: Error) => void = () => {};
    const account = vi.fn<() => Promise<string | null>>();
    account.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOld = reject;
        }),
    );
    account.mockResolvedValue('account-b');
    const c = createEntitlementsController({
      mode: 'live',
      configured: true,
      android: true,
      account,
      billing,
      request: async () => response(true, 'account-b'),
    });
    const old = c.refresh();
    await c.refresh();
    expect(c.getSnapshot().accountId).toBe('account-b');
    expect(canAccessPlus(c.getSnapshot())).toBe(true);
    rejectOld(new Error('OLD_ACCOUNT_FAILED'));
    await old;
    expect(c.getSnapshot().accountId).toBe('account-b');
    expect(canAccessPlus(c.getSnapshot())).toBe(true);
  });
  it('대기/사용자 취소/서버 환불을 완료 구매로 표현하지 않는다', async () => {
    const { c, billing, request } = fixture();
    billing.purchase = vi.fn<BillingBridge['purchase']>(async () => ({
      state: 'cancelled',
      purchases: [],
    }));
    expect((await c.purchase()).status).toBe('cancelled');
    request.mockImplementation(async (action) =>
      action === 'verify' ? { ...response(), purchaseState: 'pending' } : response(),
    );
    expect((await c.restore()).status).toBe('pending');
    expect(canAccessPlus(c.getSnapshot())).toBe(false);
    request.mockImplementation(async (action) =>
      action === 'verify' ? { ...response(), purchaseState: 'cancelled' } : response(),
    );
    expect((await c.restore()).status).toBe('cancelled');
  });
  it('판매 중지 중에도 검증 서버가 있으면 복원할 수 있다', async () => {
    const { c, request, billing } = fixture();
    request.mockImplementation(async (action) =>
      action === 'verify'
        ? { ...response(true), purchaseState: 'purchased' }
        : { ...response(), billingReady: false },
    );
    expect((await c.restore()).status).toBe('verified');
    expect(billing.purchase).not.toHaveBeenCalled();
  });
  it('웹에서는 새 Play 결제가 없고 서버 계정 권한만 이용한다', async () => {
    const { c, request, billing } = fixture('live', false);
    request.mockResolvedValue(response(true));
    await c.refresh();
    expect(c.getSnapshot().availability).toBe('unsupported-platform');
    expect(canAccessPlus(c.getSnapshot())).toBe(true);
    expect((await c.purchase()).status).toBe('unavailable');
    expect(billing.purchase).not.toHaveBeenCalled();
  });
  it('유효기간이 지난 응답이나 로컬 hasPlus만으로 심화를 열지 않는다', async () => {
    const { c, request } = fixture();
    request.mockResolvedValue({
      ...response(true),
      validUntil: new Date(Date.now() - 1000).toISOString(),
    });
    await c.refresh();
    expect(canAccessPlus(c.getSnapshot())).toBe(false);
    expect(canAccessPlus({ ...c.getSnapshot(), hasPlus: true, accountId: null })).toBe(false);
  });
  it('미완료 구매 처리 중 연속 구매 클릭은 한 번만 진행한다', async () => {
    const { c, billing } = fixture();
    let resolve: (v: Awaited<ReturnType<BillingBridge['purchase']>>) => void = () => {};
    billing.purchase = vi.fn<BillingBridge['purchase']>(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const first = c.purchase();
    await vi.waitFor(() => expect(billing.purchase).toHaveBeenCalledOnce());
    expect(await c.purchase()).toEqual({ status: 'unavailable', error: 'BUSY' });
    resolve({ state: 'cancelled', purchases: [] });
    await first;
  });
});

const googleValue = (state = 'PURCHASED', acknowledged = false) => ({
  productLineItem: [
    {
      productId: PLUS_PRODUCT_ID,
      productOfferDetails: {
        purchaseOptionId: 'buy',
        quantity: 1,
        refundableQuantity: 1,
        consumptionState: 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED',
      },
    },
  ],
  purchaseStateContext: { purchaseState: state },
  obfuscatedExternalAccountId: obfuscated,
  acknowledgementState: acknowledged
    ? 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
    : 'ACKNOWLEDGEMENT_STATE_PENDING',
});
describe('Google 구매 검증과 승인 경계', () => {
  it('정확한 상품·구매 옵션·계정·비소비 구매만 인정한다', () => {
    expect(verifyGooglePurchase(googleValue(), obfuscated).state).toBe('purchased');
    expect(() => verifyGooglePurchase(googleValue(), 'b'.repeat(64))).toThrow(
      'PURCHASE_ACCOUNT_MISMATCH',
    );
    const wrong = googleValue();
    wrong.productLineItem[0]!.productId = 'another' as typeof PLUS_PRODUCT_ID;
    expect(() => verifyGooglePurchase(wrong, obfuscated)).toThrow('WRONG_PRODUCT');
    const rent = googleValue();
    rent.productLineItem[0]!.productOfferDetails.purchaseOptionId = 'rent';
    expect(() => verifyGooglePurchase(rent, obfuscated)).toThrow('WRONG_PURCHASE_OPTION');
    const consumed = googleValue();
    consumed.productLineItem[0]!.productOfferDetails.consumptionState =
      'CONSUMPTION_STATE_CONSUMED';
    expect(() => verifyGooglePurchase(consumed, obfuscated)).toThrow('PURCHASE_CONSUMED');
  });
  it('테스트 구매는 서버의 명시적 허용 없이는 라이브 권한이 되지 않는다', () => {
    const value = { ...googleValue(), testPurchaseContext: { fopType: 'TEST' } };
    expect(() => verifyGooglePurchase(value, obfuscated)).toThrow('TEST_PURCHASE_NOT_ALLOWED');
    expect(verifyGooglePurchase(value, obfuscated, true).testPurchase).toBe(true);
  });
  it('취소와 전액 수량 환불은 취소 상태이며 대기는 승인하지 않는다', async () => {
    const refund = googleValue();
    refund.productLineItem[0]!.productOfferDetails.refundableQuantity = 0;
    expect(verifyGooglePurchase(refund, obfuscated).state).toBe('cancelled');
    const ack = vi.fn();
    const save = vi.fn();
    expect(
      (
        await settlePurchase(
          { read: async () => googleValue('PENDING'), save, acknowledge: ack },
          obfuscated,
        )
      ).state,
    ).toBe('pending');
    expect(ack).not.toHaveBeenCalled();
  });
  it('검증·귀속 예약·ack·재검증 순서이며 ack 실패 시 활성화하지 않는다', async () => {
    const calls: string[] = [];
    let reads = 0;
    await settlePurchase(
      {
        read: async () => {
          calls.push('read');
          return googleValue('PURCHASED', reads++ > 0);
        },
        save: async (p) => {
          calls.push(p.acknowledged ? 'save-active' : 'save-unacknowledged');
        },
        acknowledge: async () => {
          calls.push('ack');
        },
      },
      obfuscated,
    );
    expect(calls).toEqual(['read', 'save-unacknowledged', 'ack', 'read', 'save-active']);
    const save = vi.fn();
    await expect(
      settlePurchase(
        {
          read: async () => googleValue(),
          save,
          acknowledge: async () => {
            throw new Error('ACK_FAILED');
          },
        },
        obfuscated,
      ),
    ).rejects.toThrow('ACK_FAILED');
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0]?.[0].acknowledged).toBe(false);
  });
  it('ack 도중 환불된 토큰은 재검증 후 취소로 저장한다', async () => {
    let reads = 0;
    const save = vi.fn();
    const out = await settlePurchase(
      {
        read: async () => googleValue(reads++ ? 'CANCELLED' : 'PURCHASED', true),
        save,
        acknowledge: vi.fn(),
      },
      obfuscated,
    );
    // 이미 승인된 구매는 한 번만 검증한다.
    expect(out.state).toBe('purchased');
    reads = 0;
    const result = await settlePurchase(
      {
        read: async () => googleValue(reads++ ? 'CANCELLED' : 'PURCHASED', false),
        save,
        acknowledge: async () => {},
      },
      obfuscated,
    );
    expect(result.state).toBe('cancelled');
    expect(save.mock.calls.at(-1)?.[0].state).toBe('cancelled');
  });
});
