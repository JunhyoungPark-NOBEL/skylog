/**
 * Screen Wake Lock 유틸 (C1). 미지원 브라우저(iOS < 16.4 등)에서는 no-op.
 * 탭이 백그라운드로 가면 잠금이 자동 해제되므로 visibilitychange 때 다시 요청한다.
 */

type WakeLockNavigator = Navigator & {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> };
};

let sentinel: WakeLockSentinel | null = null;
let wanted = false;
let listening = false;

export function isWakeLockSupported(nav: Navigator | undefined = globalThis.navigator): boolean {
  return (
    !!nav && 'wakeLock' in nav && typeof (nav as WakeLockNavigator).wakeLock?.request === 'function'
  );
}

async function acquire(): Promise<boolean> {
  const nav = globalThis.navigator as WakeLockNavigator | undefined;
  if (!nav?.wakeLock) return false;
  if (globalThis.document && document.visibilityState !== 'visible') return false;
  try {
    sentinel = await nav.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
    return true;
  } catch (err) {
    // 저전력 모드·권한 정책 등으로 거부될 수 있다. 조용히 실패.
    console.warn('[wakeLock] request failed', err);
    sentinel = null;
    return false;
  }
}

function onVisibility(): void {
  if (wanted && document.visibilityState === 'visible' && !sentinel) void acquire();
}

/** 화면 켜짐 유지를 요청한다. 지원하지 않으면 false. */
export async function requestWakeLock(): Promise<boolean> {
  wanted = true;
  if (!isWakeLockSupported()) return false;
  if (globalThis.document && !listening) {
    document.addEventListener('visibilitychange', onVisibility);
    listening = true;
  }
  if (sentinel) return true;
  return acquire();
}

export async function releaseWakeLock(): Promise<void> {
  wanted = false;
  if (globalThis.document && listening) {
    document.removeEventListener('visibilitychange', onVisibility);
    listening = false;
  }
  const s = sentinel;
  sentinel = null;
  if (s) {
    try {
      await s.release();
    } catch {
      /* 이미 해제됨 */
    }
  }
}

export function isWakeLockActive(): boolean {
  return sentinel !== null && !sentinel.released;
}

/** 테스트 전용 초기화 */
export function _resetWakeLockForTesting(): void {
  sentinel = null;
  wanted = false;
  if (globalThis.document && listening)
    document.removeEventListener('visibilitychange', onVisibility);
  listening = false;
}
