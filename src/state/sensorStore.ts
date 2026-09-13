import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createDexieSettingsStorage } from '@/db/repos/settings';
import type { HeadingSource, ProviderName } from '@/sensors/orientation/types';
import type { CompassAxis } from '@/sensors/orientation/calibration';
import type { OrientationPermissionState } from '@/sensors/permissions';

/** 저장되는 설정 */
export interface SensorSettings {
  /** 자동 북 기준 / 자력계를 쓰지 않는 상대 자이로 + 별 정렬 */
  trackingMode: 'compass' | 'gyro';
  /** 현재 앱 실행 중의 자동 추적 선택. 새 실행에서는 항상 true로 시작한다. */
  autoStart: boolean;
  /** 앱에서 마지막으로 확인한 사용자 권한 응답. OS 권한을 대신하지 않는다. */
  orientationConsent: 'unknown' | 'granted' | 'denied';
  /** 절대 소스에 WMM 편각 적용 */
  applyDeclination: boolean;
  /** 롤 무시(수평 유지) */
  keepLevel: boolean;
  compassAxis: CompassAxis;
  /** 피드백 소리 */
  sound: boolean;
  /** 데스크톱 시뮬레이터 패널 */
  simulator: boolean;
  /** 마지막 보정(장소·기기별 재사용, SHOULD) */
  lastCalibration: CalibrationInfo | null;
}

export interface CalibrationInfo {
  deltaAzDeg: number;
  pitchOffsetDeg: number;
  targetId: string;
  targetName: string;
  at: number;
  residualDeg: number;
  siteName: string;
  lat?: number;
  lon?: number;
  provider?: ProviderName;
  northReference?: 'magnetic' | 'true' | 'relative';
}

export interface SensorRuntime {
  startup: 'idle' | 'permission-required' | 'starting' | 'active' | 'unavailable';
  arActive: boolean;
  provider: ProviderName | null;
  permission: OrientationPermissionState | 'unknown';
  headingSource: HeadingSource;
  compassAccuracyDeg: number | null;
  /** 현재 적용 중인 yaw 오프셋(도) */
  deltaAzDeg: number;
  pitchOffsetDeg: number;
  calibration: CalibrationInfo | null;
  /** 수동 드래그로 일시 정지된 시각(ms) — 0이면 아님 */
  manualPauseUntil: number;
  anomaly: boolean;
  declinationDeg: number | null;
  eventHz: number | null;
  raw: {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    absolute: boolean;
    compassHeading: number | null;
    compassAccuracy: number | null;
    screenAngle: number;
  };
  /** 필터 후 카메라 yaw/pitch/roll(도) */
  filtered: { azDeg: number | null; altDeg: number; rollDeg: number };
  lastSampleMs: number;
  /** 시뮬레이터 입력 */
  sim: {
    alpha: number;
    beta: number;
    gamma: number;
    compassHeading: number;
    compassAccuracy: number;
  };
  gps: {
    status: 'idle' | 'requesting' | 'ok' | 'error';
    accuracyM: number | null;
    error: string | null;
  };
  /** 보정 마법사 열림 */
  wizardOpen: boolean;
  wizardTargetId: string | null;
}

export interface SensorState extends SensorSettings, SensorRuntime {
  setSetting<K extends keyof SensorSettings>(key: K, value: SensorSettings[K]): void;
  patch(p: Partial<SensorRuntime>): void;
  setSim(p: Partial<SensorRuntime['sim']>): void;
}

export const DEFAULT_SENSOR_SETTINGS: SensorSettings = {
  trackingMode: 'compass',
  autoStart: true,
  orientationConsent: 'unknown',
  applyDeclination: true,
  keepLevel: false,
  compassAxis: 'top',
  sound: false,
  simulator: false,
  lastCalibration: null,
};

const DEFAULT_RUNTIME: SensorRuntime = {
  startup: 'idle',
  arActive: false,
  provider: null,
  permission: 'unknown',
  headingSource: 'none',
  compassAccuracyDeg: null,
  deltaAzDeg: 0,
  pitchOffsetDeg: 0,
  calibration: null,
  manualPauseUntil: 0,
  anomaly: false,
  declinationDeg: null,
  eventHz: null,
  raw: {
    alpha: null,
    beta: null,
    gamma: null,
    absolute: false,
    compassHeading: null,
    compassAccuracy: null,
    screenAngle: 0,
  },
  filtered: { azDeg: null, altDeg: 0, rollDeg: 0 },
  lastSampleMs: 0,
  sim: { alpha: 0, beta: 90, gamma: 0, compassHeading: 0, compassAccuracy: 5 },
  gps: { status: 'idle', accuracyM: null, error: null },
  wizardOpen: false,
  wizardTargetId: null,
};

export const SENSOR_PERSIST_NAME = 'sensor';

export const useSensorStore = create<SensorState>()(
  persist(
    (set) => ({
      ...DEFAULT_SENSOR_SETTINGS,
      ...DEFAULT_RUNTIME,
      setSetting: (key, value) => set({ [key]: value } as Partial<SensorSettings>),
      patch: (p) => set(p),
      setSim: (p) => set((s) => ({ sim: { ...s.sim, ...p } })),
    }),
    {
      name: SENSOR_PERSIST_NAME,
      version: 1,
      storage: createJSONStorage(() => createDexieSettingsStorage(SENSOR_PERSIST_NAME)),
      merge: (saved, current) => ({
        ...current,
        ...(saved as Partial<SensorSettings>),
        autoStart: current.autoStart,
      }),
      partialize: (s): Omit<SensorSettings, 'autoStart'> => ({
        trackingMode: s.trackingMode,
        orientationConsent: s.orientationConsent,
        applyDeclination: s.applyDeclination,
        keepLevel: s.keepLevel,
        compassAxis: s.compassAxis,
        sound: s.sound,
        simulator: s.simulator,
        lastCalibration: s.lastCalibration,
      }),
    },
  ),
);

export function waitForSensorHydration(): Promise<void> {
  if (useSensorStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useSensorStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
