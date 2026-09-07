import { useSyncExternalStore } from 'react';

/**
 * 해시 라우터 (DECISIONS D-011).
 * GitHub Pages 하위 경로(/skylog/)에서 새로고침·뒤로가기가 서버 설정 없이 동작하고,
 * PWA start_url이 고정되며, 탭 상태를 URL로 공유할 수 있어 선택했다.
 *   #/sky · #/search · #/tonight · #/log · #/learn · #/settings · #/about · #/debug/data
 */
export const TAB_ROUTES = ['sky', 'search', 'tonight', 'log', 'learn'] as const;
export type TabRoute = (typeof TAB_ROUTES)[number];
export type Route = TabRoute | 'settings' | 'about' | 'sites' | 'debug/data' | 'debug/sensors';

const ALL_ROUTES: readonly Route[] = [
  ...TAB_ROUTES,
  'settings',
  'about',
  'sites',
  'debug/data',
  'debug/sensors',
];

export function parseHash(hash: string): Route {
  const path = hash
    .replace(/^#\/?/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
  return (ALL_ROUTES as readonly string[]).includes(path) ? (path as Route) : 'sky';
}

/** 해시의 쿼리(`#/sky?t=…&alt=…`)를 읽는다. 테스트·공유 링크용. */
export function hashQuery(hash: string = globalThis.location?.hash ?? ''): URLSearchParams {
  const i = hash.indexOf('?');
  return new URLSearchParams(i >= 0 ? hash.slice(i + 1) : '');
}

export function toHash(route: Route): string {
  return `#/${route}`;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function getSnapshot(): Route {
  return parseHash(window.location.hash);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'sky');
}

export function navigate(route: Route, replace = false): void {
  const hash = toHash(route);
  if (window.location.hash === hash) return;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

export function isTabRoute(route: Route): route is TabRoute {
  return (TAB_ROUTES as readonly string[]).includes(route);
}
