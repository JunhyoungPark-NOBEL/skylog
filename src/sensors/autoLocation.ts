import i18next from 'i18next';
import { App } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { isNative } from '@/native/motion';
import { requestLocation, type GeoError, type GeoErrorKind } from '@/sensors/geolocation';
import { initLocation } from '@/sensors/locationInit';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore } from '@/state/sensorStore';
import { useSettingsStore } from '@/state/settingsStore';

type Permission = 'granted' | 'denied' | 'prompt' | 'unknown';

async function locationPermission(): Promise<Permission> {
  try {
    if (isNative()) {
      const state = await Geolocation.checkPermissions();
      if (state.location === 'granted' || state.coarseLocation === 'granted') return 'granted';
      return state.location === 'denied' ? 'denied' : 'prompt';
    }
    if (navigator.permissions?.query)
      return (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    /* 권한 조회를 지원하지 않는 브라우저는 저장된 거부 여부를 사용한다. */
  }
  return 'unknown';
}

interface Dependencies {
  initialize(): Promise<void>;
  permission(): Promise<Permission>;
  request: typeof requestLocation;
  now(): number;
}

/** 위치는 시작/복귀 때 한 번만 요청한다. 화면을 떠나거나 관측지를 선택하면 늦은 응답까지 무효화한다. */
export class AutoLocationController {
  private readonly deps: Dependencies;
  private mounts = 0;
  private ready = false;
  private generation = 0;
  private mountGeneration = 0;
  private pending = false;
  private cancel: (() => void) | null = null;
  private lastFinishedAt = -Infinity;
  private removeListeners: (() => void) | null = null;

  constructor(deps: Partial<Dependencies> = {}) {
    this.deps = {
      initialize: initLocation,
      permission: locationPermission,
      request: requestLocation,
      now: Date.now,
      ...deps,
    };
  }

  mount(): () => void {
    this.mounts++;
    if (this.mounts === 1) {
      const token = ++this.mountGeneration;
      this.ready = false;
      const visibility = () => {
        if (document.visibilityState === 'hidden') this.stop();
        else void this.refresh();
      };
      document.addEventListener('visibilitychange', visibility);
      const settings = useSettingsStore.subscribe((state, previous) => {
        if (state.autoLocation === previous.autoLocation) return;
        if (!state.autoLocation) this.stop();
        else {
          this.lastFinishedAt = -Infinity;
          void this.refresh();
        }
      });
      const location = useLocationStore.subscribe((state, previous) => {
        if (!this.ready || state.site === previous.site || state.source === 'gps') return;
        useSettingsStore.getState().setLocationSite(state.siteId);
        this.stop();
      });
      let disposed = false;
      let removeNative: (() => void) | null = null;
      if (isNative())
        void App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void this.refresh();
          else this.stop();
        })
          .then((listener) => {
            if (disposed) void listener.remove();
            else
              removeNative = () => {
                void listener.remove();
              };
          })
          .catch(() => {});
      this.removeListeners = () => {
        disposed = true;
        document.removeEventListener('visibilitychange', visibility);
        settings();
        location();
        removeNative?.();
      };
      void this.deps
        .initialize()
        .catch(() => {
          /* DB 복원이 실패해도 기존 좌표로 앱을 사용할 수 있다. */
        })
        .then(() => {
          if (!this.mounts || token !== this.mountGeneration) return;
          this.ready = true;
          void this.refresh();
        });
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.mounts--;
      if (!this.mounts) {
        this.mountGeneration++;
        this.removeListeners?.();
        this.removeListeners = null;
        this.ready = false;
        this.stop();
      }
    };
  }

  private reportError(kind: GeoErrorKind): void {
    useSensorStore
      .getState()
      .patch({ gps: { status: 'error', accuracyM: null, error: i18next.t(`sensor.geo.${kind}`) } });
  }

  private stop(): void {
    this.generation++;
    this.pending = false;
    this.cancel?.();
    this.cancel = null;
    if (useSensorStore.getState().gps.status === 'requesting') {
      useSensorStore.getState().patch({ gps: { status: 'idle', accuracyM: null, error: null } });
    }
  }

  /** 수동 버튼은 저장된 거부 이력과 재요청 간격을 건너뛴다. 실제 OS 권한은 requestLocation이 확인한다. */
  async refresh(manual = false): Promise<void> {
    if (!this.mounts || document.visibilityState === 'hidden') return;
    if (manual) {
      this.stop();
      useSettingsStore.getState().setAutoLocation(true);
    } else if (
      !this.ready ||
      this.pending ||
      !useSettingsStore.getState().autoLocation ||
      this.deps.now() - this.lastFinishedAt < 30_000
    )
      return;
    const token = ++this.generation;
    this.pending = true;
    const active = () =>
      this.mounts > 0 && token === this.generation && useSettingsStore.getState().autoLocation;
    if (!manual) {
      const permission = await this.deps.permission();
      if (!active()) return;
      const prefs = useSettingsStore.getState();
      if (permission === 'granted') prefs.setLocationPermissionDenied(false);
      else if (permission === 'denied' || prefs.locationPermissionDenied) {
        prefs.setLocationPermissionDenied(true);
        this.pending = false;
        this.reportError('denied');
        return;
      }
    }
    if (!active()) return;
    useSensorStore
      .getState()
      .patch({ gps: { status: 'requesting', accuracyM: null, error: null } });
    const cancel = this.deps.request(
      (fix, final) => {
        if (!active()) return;
        useLocationStore.getState().setFromGps(fix);
        // GPS 사용에 성공한 뒤에는 예전에 고른 관측지로 되돌아가지 않는다.
        useSettingsStore.setState({ locationSiteId: null });
        useSettingsStore.getState().setLocationPermissionDenied(false);
        useSensorStore.getState().patch({
          gps: { status: final ? 'ok' : 'requesting', accuracyM: fix.accuracyM, error: null },
        });
        if (final) this.complete();
      },
      (error: GeoError) => {
        if (!active()) return;
        if (error.kind === 'denied') useSettingsStore.getState().setLocationPermissionDenied(true);
        this.complete();
        this.reportError(error.kind);
      },
      { improveMs: 0, timeoutMs: 12_000, highAccuracy: true },
    );
    if (active() && this.pending) this.cancel = cancel;
    else cancel();
  }

  private complete(): void {
    this.generation++;
    this.lastFinishedAt = this.deps.now();
    this.pending = false;
    this.cancel?.();
    this.cancel = null;
  }
}

const autoLocation = new AutoLocationController();
export function mountAutoLocation(): () => void {
  return autoLocation.mount();
}
export function requestCurrentLocation(): void {
  void autoLocation.refresh(true);
}
