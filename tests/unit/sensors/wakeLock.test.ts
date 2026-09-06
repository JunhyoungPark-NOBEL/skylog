import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  _resetWakeLockForTesting,
  isWakeLockActive,
  isWakeLockSupported,
  releaseWakeLock,
  requestWakeLock,
} from '@/sensors/wakeLock';

function installFakeWakeLock() {
  const sentinel = {
    released: false,
    listeners: new Map<string, () => void>(),
    addEventListener(type: string, cb: () => void) {
      this.listeners.set(type, cb);
    },
    async release() {
      this.released = true;
      this.listeners.get('release')?.();
    },
  };
  const request = vi.fn(async () => sentinel);
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { sentinel, request };
}

afterEach(() => {
  _resetWakeLockForTesting();
  // @ts-expect-error 테스트용 정리
  delete navigator.wakeLock;
});

describe('wakeLock', () => {
  it('미지원 환경에서는 no-op으로 false를 돌려준다', async () => {
    expect(isWakeLockSupported()).toBe(false);
    expect(await requestWakeLock()).toBe(false);
    expect(isWakeLockActive()).toBe(false);
    await expect(releaseWakeLock()).resolves.toBeUndefined();
  });

  it('지원 환경에서는 요청·해제가 동작한다', async () => {
    const { sentinel, request } = installFakeWakeLock();
    expect(isWakeLockSupported()).toBe(true);
    expect(await requestWakeLock()).toBe(true);
    expect(request).toHaveBeenCalledWith('screen');
    expect(isWakeLockActive()).toBe(true);
    await releaseWakeLock();
    expect(sentinel.released).toBe(true);
    expect(isWakeLockActive()).toBe(false);
  });

  it('요청이 거부되면 조용히 false', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: vi.fn(async () => Promise.reject(new Error('NotAllowedError'))) },
      configurable: true,
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await requestWakeLock()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
