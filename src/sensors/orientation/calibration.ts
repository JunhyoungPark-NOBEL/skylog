/**
 * 보정(캘리브레이션) 순수 함수 (task-02 §3.5, G1 §A7-2/A7-3).
 * 모델: q_world = R_yaw(δ) · q_sensor (+ 피치 오프셋). δ = 세계 프레임 yaw 오프셋(나침반 오차 + iOS 상대 기준점 + 잔여 편각).
 * - solveYawOffset: 1-별(또는 여러 별) 정렬 샘플 → δ·피치 오프셋·잔차. T5의 폰-경통 정렬로 확장되도록 샘플 배열 인터페이스.
 * - compassSyncCandidate: iOS 상대 자세 + webkitCompassHeading(자북) → δ 후보(상단 축끼리 비교, 자세 조건 엄격).
 * - YawSync: 후보의 지수 평활(τ≈3s), 튀는 값 무시.
 */
import type { Quaternion } from 'three';
import { wrap180 } from '@/astro/coords';
import {
  applyPitchOffset,
  applyYawOffset,
  circularMeanDeg,
  deviceAxisInScene,
} from '@/sensors/orientation/math';

export interface AlignmentSample {
  /** 센서(오프셋 미적용) 카메라 방위·고도 */
  sensorAzDeg: number;
  sensorAltDeg: number;
  /** 정렬 대상의 실제 겉보기 방위·고도 */
  targetAzDeg: number;
  targetAltDeg: number;
  /** 대상 id/이름(기록용) */
  targetId?: string;
}

export interface YawOffsetSolution {
  deltaAzDeg: number;
  pitchOffsetDeg: number;
  /** 샘플별 방위 잔차의 최대 절대값(도). 1개면 0 */
  residualDeg: number;
  sampleCount: number;
}

/** 정렬 샘플들로 δ(방위 원형 평균)·피치 오프셋(평균)을 푼다. */
export function solveYawOffset(samples: AlignmentSample[]): YawOffsetSolution | null {
  if (samples.length === 0) return null;
  const diffs = samples.map((s) => wrap180(s.targetAzDeg - s.sensorAzDeg));
  const mean = circularMeanDeg(diffs);
  if (mean === null) return null;
  const deltaAzDeg = wrap180(mean);
  const pitch = samples.reduce((a, s) => a + (s.targetAltDeg - s.sensorAltDeg), 0) / samples.length;
  const residualDeg = Math.max(...diffs.map((d) => Math.abs(wrap180(d - deltaAzDeg))));
  return { deltaAzDeg, pitchOffsetDeg: pitch, residualDeg, sampleCount: samples.length };
}

/** 오프셋 적용: yaw 먼저, 그 다음 피치(카메라 오른쪽 축) */
export function applyOffset(q: Quaternion, deltaAzDeg: number, pitchOffsetDeg = 0): Quaternion {
  return applyPitchOffset(applyYawOffset(q, deltaAzDeg), pitchOffsetDeg);
}

export type CompassAxis = 'top' | 'back';

export interface CompassSyncInput {
  /** 상대 자세(씬, 오프셋 미적용) */
  qRel: Quaternion;
  compassHeadingDeg: number | null;
  compassAccuracyDeg: number | null;
  betaDeg: number | null;
  gammaDeg: number | null;
  screenAngleDeg: number;
  /** 편각(동 +). 나침반이 자북이면 더한다 */
  declinationDeg: number;
  /** 정지에 가까운가(각속도 < 10°/s 등) */
  quasiStatic: boolean;
  axis?: CompassAxis;
  maxAccuracyDeg?: number;
}

/**
 * δ 후보 = (진북 heading) − (같은 물리 축의 상대 방위). 조건 밖이면 null.
 * 상단 축(기본): |β| ≤ 60°, |γ| ≤ 45°, 투영 길이 ρ ≥ 0.5, accuracy 0..15°, 정지.
 */
export function compassSyncCandidate(input: CompassSyncInput): number | null {
  const axis = input.axis ?? 'top';
  const maxAcc = input.maxAccuracyDeg ?? 15;
  const H = input.compassHeadingDeg;
  const acc = input.compassAccuracyDeg;
  if (H === null || !Number.isFinite(H) || H < 0 || H >= 360) return null;
  if (acc === null || !Number.isFinite(acc) || acc < 0 || acc > maxAcc) return null;
  if (!input.quasiStatic) return null;
  if (input.betaDeg === null || input.gammaDeg === null) return null;
  if (axis === 'top' && (Math.abs(input.betaDeg) > 60 || Math.abs(input.gammaDeg) > 45))
    return null;
  const axisVec: [number, number, number] = axis === 'top' ? [0, 1, 0] : [0, 0, -1];
  const { azDeg, rho } = deviceAxisInScene(input.qRel, axisVec, input.screenAngleDeg);
  if (azDeg === null || rho < 0.5) return null;
  const trueHeading = H + input.declinationDeg;
  return wrap180(trueHeading - azDeg);
}

/** δ_sync 지수 평활(τ 기본 3초). 이전 값에서 15°/s 이상 튀면 무시(단, 초기값은 즉시). */
export class YawSync {
  value: number | null = null;
  private lastMs = 0;
  private samples: number[] = [];
  constructor(
    private readonly tauMs = 3000,
    private readonly maxRateDegPerSec = 15,
  ) {}

  update(candidateDeg: number | null, tMs: number): number | null {
    if (candidateDeg === null) return this.value;
    if (this.value === null) {
      // 초깃값: 처음 5개 후보의 원형 평균
      this.samples.push(candidateDeg);
      if (this.samples.length >= 5) {
        this.value = circularMeanDeg(this.samples.map((v) => ((v % 360) + 360) % 360));
        if (this.value !== null) this.value = wrap180(this.value);
      }
      this.lastMs = tMs;
      return this.value;
    }
    const dt = Math.max(1, tMs - this.lastMs);
    const diff = wrap180(candidateDeg - this.value);
    if (Math.abs(diff) / (dt / 1000) > this.maxRateDegPerSec && Math.abs(diff) > 5) {
      this.lastMs = tMs;
      return this.value; // 튀는 값 무시
    }
    const k = 1 - Math.exp(-dt / this.tauMs);
    this.value = wrap180(this.value + diff * k);
    this.lastMs = tMs;
    return this.value;
  }

  reset(): void {
    this.value = null;
    this.samples = [];
  }
}

export interface AlignmentCandidate {
  id: string;
  name: string;
  altDeg: number;
  azDeg: number;
  mag: number;
  kind: 'star' | 'planet' | 'moon' | 'sun';
}

/** 정렬 대상 추천: 고도 20~70°, 등급 ≤ 1.5 별 + 행성·달(태양 제외), 북극성은 항상. 밝은 순. */
export function pickAlignmentCandidates(
  all: AlignmentCandidate[],
  polarisId = 'star:HIP11767',
): AlignmentCandidate[] {
  const ok = all.filter((c) => {
    if (c.kind === 'sun') return false;
    if (c.id === polarisId) return c.altDeg > 5;
    if (c.altDeg < 20 || c.altDeg > 70) return false;
    if (c.kind === 'star') return c.mag <= 1.5;
    return true;
  });
  return ok.sort((a, b) => a.mag - b.mag).slice(0, 8);
}
