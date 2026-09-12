import type { Quaternion } from 'three';

/** 북 기준: 자북(WMM 적용 필요) / 진북 / 상대(임의 yaw) */
export type NorthReference = 'magnetic' | 'true' | 'relative';

/** 공통 출력 계약 (G1 §A7-1, task-02 §3.2). q는 (화면 회전 보정된) 기기 → **씬 프레임**(+X 동 +Y 천정 +Z 남). */
export interface OrientationSample {
  /** 씬 프레임 카메라 쿼터니언(카메라 −Z = 후면 카메라 시선). 아직 편각·보정 미적용. */
  q: Quaternion;
  northReference: NorthReference;
  /** 나침반 heading(도, 0=북 시계 방향) — iOS webkitCompassHeading 또는 절대 alpha에서 유도. null이면 없음 */
  compassHeadingDeg: number | null;
  /** 나침반 정확도(도). null = 미상. 음수 = 무효 */
  compassAccuracyDeg: number | null;
  /** 원시 오일러(도) — 디버그·동기화 조건 판정용 */
  raw: { alpha: number | null; beta: number | null; gamma: number | null; absolute: boolean };
  /** 화면 회전(도) */
  screenAngleDeg: number;
  /** performance.now() 기준 ms */
  timestampMs: number;
  provider: ProviderName;
}

export type ProviderName =
  | 'AbsoluteOrientationSensor'
  | 'RelativeOrientationSensor'
  | 'DeviceOrientationAbsolute'
  | 'DeviceOrientation'
  | 'Simulator'
  | 'NativeOrientation';

export interface OrientationProvider {
  readonly name: ProviderName;
  /** 지원 여부(기능 감지, 권한 요청 없음) */
  isSupported(): boolean;
  /** 시작. 권한 요청은 호출자가 사용자 제스처 안에서 먼저 처리한다. */
  start(onSample: (s: OrientationSample) => void, onError: (err: Error) => void): void;
  stop(): void;
}

/** heading 소스 표시(상태 바·디버그) */
export type HeadingSource =
  'absolute' | 'compass-sync' | 'relative' | 'aligned' | 'manual' | 'none';
