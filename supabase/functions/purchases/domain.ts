/** Google에서 받은 값만 전달한다. 앱이 보내는 결제 상태/가격은 신뢰하지 않는다. */
export const PACKAGE_NAME = 'io.github.junhyoungparknobel.skylog';
export const PRODUCT_ID = 'skyard_plus_lifetime';
export const PURCHASE_OPTION_ID = 'buy';
export type VerifiedPurchase = {
  state: 'purchased' | 'pending' | 'cancelled';
  acknowledged: boolean;
  obfuscatedAccountId: string;
  testPurchase: boolean;
};
const obj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
export function verifyGooglePurchase(
  value: unknown,
  expectedAccount: string,
  allowTest = false,
): VerifiedPurchase {
  if (!obj(value) || !obj(value.purchaseStateContext)) throw new Error('INVALID_GOOGLE_RESPONSE');
  if (
    !/^[a-f0-9]{64}$/.test(expectedAccount) ||
    value.obfuscatedExternalAccountId !== expectedAccount
  )
    throw new Error('PURCHASE_ACCOUNT_MISMATCH');
  if (!Array.isArray(value.productLineItem) || value.productLineItem.length !== 1)
    throw new Error('WRONG_PRODUCT');
  const item: unknown = value.productLineItem[0];
  if (!obj(item) || item.productId !== PRODUCT_ID || !obj(item.productOfferDetails))
    throw new Error('WRONG_PRODUCT');
  const offer = item.productOfferDetails;
  if (
    offer.purchaseOptionId !== PURCHASE_OPTION_ID ||
    offer.rentOfferDetails ||
    offer.preorderOfferDetails
  )
    throw new Error('WRONG_PURCHASE_OPTION');
  const rawState = value.purchaseStateContext.purchaseState;
  if (!['PURCHASED', 'PENDING', 'CANCELLED'].includes(String(rawState)))
    throw new Error('INVALID_PURCHASE_STATE');
  const testPurchase = value.testPurchaseContext !== undefined;
  if (testPurchase && !allowTest) throw new Error('TEST_PURCHASE_NOT_ALLOWED');
  if (rawState === 'PURCHASED' && offer.quantity !== 1) throw new Error('INVALID_QUANTITY');
  const cancelled =
    rawState === 'CANCELLED' || (rawState === 'PURCHASED' && offer.refundableQuantity === 0);
  if (
    !cancelled &&
    rawState === 'PURCHASED' &&
    offer.consumptionState !== 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED'
  )
    throw new Error('PURCHASE_CONSUMED');
  const acknowledgement = value.acknowledgementState;
  if (
    rawState === 'PURCHASED' &&
    !cancelled &&
    !['ACKNOWLEDGEMENT_STATE_PENDING', 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'].includes(
      String(acknowledgement),
    )
  )
    throw new Error('INVALID_ACKNOWLEDGEMENT');
  return {
    state: cancelled ? 'cancelled' : rawState === 'PURCHASED' ? 'purchased' : 'pending',
    acknowledged: acknowledgement === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    obfuscatedAccountId: expectedAccount,
    testPurchase,
  };
}
export function validPurchaseToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 20 &&
    value.length <= 4096 &&
    /^[A-Za-z0-9._~+/=:-]+$/.test(value)
  );
}

interface VerificationPorts {
  read(): Promise<unknown>;
  save(purchase: VerifiedPurchase): Promise<void>;
  acknowledge(): Promise<void>;
}
/** 귀속을 먼저 예약한다. ack 오류/동시 환불/재시도 뒤에도 DB는 취소 상태를 되살리지 않는다. */
export async function settlePurchase(ports: VerificationPorts, account: string, allowTest = false) {
  let verified = verifyGooglePurchase(await ports.read(), account, allowTest);
  await ports.save(verified);
  if (verified.state === 'purchased' && !verified.acknowledged) {
    await ports.acknowledge();
    // ack가 끝나는 동안 취소됐을 수 있으므로 Google을 다시 확인한다.
    verified = verifyGooglePurchase(await ports.read(), account, allowTest);
    await ports.save(verified);
    if (verified.state === 'purchased' && !verified.acknowledged)
      throw new Error('ACKNOWLEDGEMENT_PENDING');
  }
  return verified;
}
