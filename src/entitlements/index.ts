import { Capacitor, registerPlugin } from '@capacitor/core';
import { useEffect, useSyncExternalStore } from 'react';
import { communityClient, communityConfigured, communityUrl } from '@/community/client';
import { createEntitlementsController } from './controller';
import type { BillingBridge } from './types';
import { canAccessPlus } from './types';
export { canAccessPlus, PLUS_PRODUCT_ID } from './types';
export type { EntitlementSnapshot, PurchaseActionResult, StoreProduct } from './types';

const billing = registerPlugin<BillingBridge>('SkyardBilling');
const mode = import.meta.env.VITE_SKYARD_MONETIZATION_MODE === 'live' ? 'live' : 'preview';
const controller = createEntitlementsController({
  mode,
  configured: communityConfigured,
  android: Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
  account: async () => (await communityClient().auth.getSession()).data.session?.user.id ?? null,
  billing,
  request: async (action, body, accountId) => {
    const { data } = await communityClient().auth.getSession();
    if (!data.session || data.session.user.id !== accountId) throw new Error('ACCOUNT_CHANGED');
    const response = await fetch(`${communityUrl}/functions/v1/purchases?action=${action}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const value: unknown = await response.json();
    if (!response.ok) {
      const code =
        value && typeof value === 'object' && 'error' in value && typeof value.error === 'string'
          ? value.error
          : '';
      throw new Error(/^[A-Z_]{3,60}$/.test(code) ? code : 'REQUEST_FAILED');
    }
    return value;
  },
});
let started = false;
function start() {
  if (started) return;
  started = true;
  if (communityConfigured)
    communityClient().auth.onAuthStateChange((_event, session) => {
      controller.setAccount(session?.user.id ?? null);
      // Supabase 인증 콜백 안에서 다른 auth Promise를 기다리지 않는다.
      queueMicrotask(() => void controller.refresh());
    });
  void controller.refresh();
  const refreshVisible = () => {
    if (document.visibilityState === 'visible') void controller.refresh();
  };
  document.addEventListener('visibilitychange', refreshVisible);
  window.setInterval(refreshVisible, 60000);
}
export function useEntitlements() {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    start();
  }, []);
  return state;
}
export const refreshEntitlements = () => {
  start();
  return controller.refresh();
};
export const purchasePlus = () => {
  start();
  return controller.purchase();
};
export const restorePlus = () => {
  start();
  return controller.restore();
};
export const getEntitlementsSnapshot = () => controller.getSnapshot();
export class PlusAccessError extends Error {
  readonly code: 'PLUS_REQUIRED' | 'ENTITLEMENTS_UNAVAILABLE';
  constructor(code: 'PLUS_REQUIRED' | 'ENTITLEMENTS_UNAVAILABLE') {
    super(code);
    this.name = 'PlusAccessError';
    this.code = code;
  }
}
/** 기록 쓰기 트랜잭션에 들어가기 전에 호출한다. 네트워크를 Dexie 트랜잭션 안에서 기다리지 않는다. */
export async function ensurePlusAccess(): Promise<void> {
  if (mode === 'preview') return;
  start();
  try {
    await controller.checkAccess();
  } catch {
    throw new PlusAccessError('ENTITLEMENTS_UNAVAILABLE');
  }
  if (!canAccessPlus(controller.getSnapshot()))
    throw new PlusAccessError(
      controller.getSnapshot().status === 'unavailable'
        ? 'ENTITLEMENTS_UNAVAILABLE'
        : 'PLUS_REQUIRED',
    );
}
