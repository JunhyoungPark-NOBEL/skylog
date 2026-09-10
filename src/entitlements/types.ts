export const PLUS_PRODUCT_ID = 'skyard_plus_lifetime';
export type MonetizationMode = 'preview' | 'live';
export type PlusSource = 'none' | 'play' | 'grant';
export interface StoreProduct {
  id: typeof PLUS_PRODUCT_ID;
  formattedPrice: string;
  currencyCode: string;
  priceMicros: number;
}
export interface EntitlementSnapshot {
  status: 'loading' | 'ready' | 'unavailable';
  accountId: string | null;
  mode: MonetizationMode;
  hasPlus: boolean;
  source: PlusSource;
  validUntil: string | null;
  availability: 'setup-required' | 'sign-in-required' | 'android-play' | 'unsupported-platform';
  product: StoreProduct | null;
  restoreAvailable: boolean;
  error: string | null;
  busy: boolean;
}
export interface EntitlementResponse {
  accountId: string;
  hasPlus: boolean;
  source: PlusSource;
  validUntil: string | null;
  billingReady: boolean;
  restoreReady: boolean;
  productId: typeof PLUS_PRODUCT_ID;
}
export interface NativePurchase {
  productId: string;
  purchaseToken: string;
  state: 'purchased' | 'pending';
}
export interface BillingBridge {
  getProduct(): Promise<{ product: StoreProduct }>;
  purchase(options: { obfuscatedAccountId: string }): Promise<{
    state: 'purchased' | 'pending' | 'cancelled' | 'already-owned';
    purchases: NativePurchase[];
  }>;
  restore(): Promise<{ purchases: NativePurchase[] }>;
}
export type PurchaseActionResult = {
  status: 'verified' | 'pending' | 'cancelled' | 'nothing-to-restore' | 'unavailable' | 'error';
  error?: string;
};

/** 베타 체험 허용은 구매 권한과 다르다. 기록·보상에는 이 판정을 적용하지 않는다. */
export function canAccessPlus(value: EntitlementSnapshot, now = Date.now()): boolean {
  if (value.mode === 'preview') return true;
  return !!(
    value.accountId &&
    value.hasPlus &&
    value.source !== 'none' &&
    value.validUntil &&
    Date.parse(value.validUntil) > now
  );
}
