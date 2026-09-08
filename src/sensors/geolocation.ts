/**
 * 위치 (task-02 §3.1): getCurrentPosition → watchPosition(정확도 개선 시 갱신, ≤100m면 중단, 최대 30초).
 * 오류는 거부/미지원/타임아웃/불가를 구분. 마지막 위치를 Dexie settings('sensor.lastFix')에 저장해 오프라인에서 재사용.
 * 주의: `coords.altitude`는 WGS84 타원체고(null 가능), `coords.heading`은 이동 방향이지 폰 방위가 아니다(G1 §A6-2).
 */
import { getSetting, setSetting } from '@/db/repos/settings';
import { isNative } from '@/native/motion';
import { Geolocation } from '@capacitor/geolocation';

export type GeoErrorKind = 'unsupported' | 'denied' | 'timeout' | 'unavailable';

export interface GeoFix {
  lat: number;
  lon: number;
  /** m, 없으면 null */
  elevation: number | null;
  accuracyM: number;
  /** epoch ms */
  timestamp: number;
}

export class GeoError extends Error {
  constructor(
    readonly kind: GeoErrorKind,
    message?: string,
  ) {
    super(message ?? kind);
  }
}

const LAST_FIX_KEY = 'sensor.lastFix';
const GOOD_ACCURACY_M = 100;

function toFix(p: GeolocationPosition): GeoFix {
  return {
    lat: p.coords.latitude,
    lon: p.coords.longitude,
    elevation: p.coords.altitude,
    accuracyM: p.coords.accuracy,
    timestamp: p.timestamp,
  };
}

function mapError(e: GeolocationPositionError): GeoError {
  if (e.code === e.PERMISSION_DENIED) return new GeoError('denied', e.message);
  if (e.code === e.TIMEOUT) return new GeoError('timeout', e.message);
  return new GeoError('unavailable', e.message);
}

export function geolocationSupported(): boolean {
  if (isNative()) return true;
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/**
 * 위치를 얻는다. 첫 응답을 즉시 콜백하고, 정확도가 100m보다 나쁘면 watchPosition으로 개선을 기다린다.
 * 반환된 함수로 중단할 수 있다.
 */
export function requestLocation(
  onFix: (fix: GeoFix, final: boolean) => void,
  onError: (err: GeoError) => void,
  opts: { timeoutMs?: number; improveMs?: number; highAccuracy?: boolean } = {},
): () => void {
  if (isNative()) {
    let stopped = false;
    void Geolocation.getCurrentPosition({
      enableHighAccuracy: opts.highAccuracy ?? true,
      timeout: opts.timeoutMs ?? 12000,
      maximumAge: 60000,
    })
      .then((p) => {
        if (stopped) return;
        const fix: GeoFix = {
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          elevation: p.coords.altitude,
          accuracyM: p.coords.accuracy,
          timestamp: p.timestamp,
        };
        void saveLastFix(fix);
        onFix(fix, true);
      })
      .catch((e: unknown) => {
        if (stopped) return;
        const code = typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '';
        onError(
          new GeoError(
            code === 'OS-PLUG-GLOC-0003'
              ? 'denied'
              : code === 'OS-PLUG-GLOC-0010'
                ? 'timeout'
                : 'unavailable',
          ),
        );
      });
    return () => {
      stopped = true;
    };
  }
  if (!geolocationSupported()) {
    onError(new GeoError('unsupported'));
    return () => {};
  }
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const improveMs = opts.improveMs ?? 30_000;
  let watchId: number | null = null;
  let stopped = false;
  let improveTimer = 0;

  const finish = (fix: GeoFix) => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    window.clearTimeout(improveTimer);
    void saveLastFix(fix);
    onFix(fix, true);
  };

  navigator.geolocation.getCurrentPosition(
    (p) => {
      if (stopped) return;
      const fix = toFix(p);
      if (fix.accuracyM <= GOOD_ACCURACY_M) {
        finish(fix);
        return;
      }
      onFix(fix, false);
      let best = fix;
      watchId = navigator.geolocation.watchPosition(
        (p2) => {
          if (stopped) return;
          const f2 = toFix(p2);
          if (f2.accuracyM < best.accuracyM) {
            best = f2;
            onFix(f2, false);
          }
          if (f2.accuracyM <= GOOD_ACCURACY_M) finish(f2);
        },
        () => {
          /* 개선 실패는 무시 — 첫 위치를 최종으로 */
        },
        { enableHighAccuracy: opts.highAccuracy ?? true, maximumAge: 0, timeout: improveMs },
      );
      improveTimer = window.setTimeout(() => {
        if (!stopped) finish(best);
      }, improveMs);
    },
    (e) => {
      if (!stopped) onError(mapError(e));
    },
    { enableHighAccuracy: opts.highAccuracy ?? true, timeout: timeoutMs, maximumAge: 60_000 },
  );

  return () => {
    stopped = true;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    window.clearTimeout(improveTimer);
  };
}

export async function saveLastFix(fix: GeoFix): Promise<void> {
  await setSetting(LAST_FIX_KEY, fix);
}

export async function loadLastFix(): Promise<GeoFix | undefined> {
  return getSetting<GeoFix>(LAST_FIX_KEY);
}
