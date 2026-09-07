/**
 * 자세 융합·필터 (task-02 §3.4).
 * - 쿼터니언 저역통과(slerp, 시간 상수 τ≈100ms) + 데드밴드 0.2° + 적응 이득(각속도 > 30°/s면 즉시 추종).
 * - 절대 소스는 yaw만 더 강하게 평활(τ_yaw≈500ms): 나침반 노이즈는 yaw에만 실리고 자이로 pitch/roll은 빠르다.
 * - 자기장 이상: 한 샘플 사이(≤120ms)에 yaw가 15° 이상 튀는데 pitch/roll 변화는 작으면(< 5°) 물리 회전이 아니라 간섭.
 * 목표(단위 테스트): 60Hz 합성 입력에서 정지 잔여 떨림 < 0.2°, 90° 스텝 후 2° 이내 도달 ≤ 150ms.
 */
import type { Quaternion } from 'three';
import { wrap180 } from '@/astro/coords';
import {
  angleBetween,
  applyYawOffset,
  quaternionToAltAz,
  slerpShortest,
} from '@/sensors/orientation/math';

export interface FilterOptions {
  tauMs: number;
  yawTauMs: number;
  deadbandDeg: number;
  fastRateDegPerSec: number;
  /** yaw 별도 평활 사용(절대 소스) */
  smoothYaw: boolean;
  anomalyJumpDeg: number;
  anomalyMaxDtMs: number;
}

export const DEFAULT_FILTER: FilterOptions = {
  tauMs: 100,
  yawTauMs: 500,
  deadbandDeg: 0.2,
  fastRateDegPerSec: 30,
  smoothYaw: false,
  anomalyJumpDeg: 15,
  anomalyMaxDtMs: 120,
};

export class OrientationFilter {
  private readonly opts: FilterOptions;
  private state: Quaternion | null = null;
  private lastRaw: Quaternion | null = null;
  private lastMs = 0;
  private yawState: number | null = null;
  /** 마지막 갱신에서 감지된 이상 여부 */
  anomaly = false;
  /** 마지막 추정 각속도(도/초) */
  rateDegPerSec = 0;

  constructor(opts: Partial<FilterOptions> = {}) {
    this.opts = { ...DEFAULT_FILTER, ...opts };
  }

  reset(): void {
    this.state = null;
    this.output = null;
    this.history = [];
    this.lastRaw = null;
    this.yawState = null;
    this.anomaly = false;
    this.rateDegPerSec = 0;
  }

  get current(): Quaternion | null {
    return this.state;
  }

  /** 새 샘플을 넣고 필터된 자세를 돌려준다. tMs는 단조 증가(performance.now()). */
  push(raw: Quaternion, tMs: number): Quaternion {
    const o = this.opts;
    if (!this.state || !this.lastRaw) {
      this.state = raw.clone();
      this.output = raw.clone();
      this.history = [{ t: tMs, q: raw.clone() }];
      this.lastRaw = raw.clone();
      this.lastMs = tMs;
      this.yawState = quaternionToAltAz(raw).azDeg;
      this.anomaly = false;
      return this.state.clone();
    }
    const dt = Math.max(1, tMs - this.lastMs);
    // 각속도는 한 샘플 차이가 아니라 ~100ms 창의 변위로 잰다(노이즈가 30°/s처럼 보이는 것을 막음)
    this.history.push({ t: tMs, q: raw.clone() });
    while (this.history.length > 1 && tMs - this.history[0]!.t > 120) this.history.shift();
    const oldest = this.history[0]!;
    const span = Math.max(1, tMs - oldest.t);
    this.rateDegPerSec = span >= 50 ? (angleBetween(oldest.q, raw) / span) * 1000 : 0;

    // 자기장 이상: yaw만 크게 튀고 pitch/roll은 그대로
    const prevAlt = quaternionToAltAz(this.lastRaw);
    const curAlt = quaternionToAltAz(raw);
    const yawJump =
      prevAlt.azDeg !== null && curAlt.azDeg !== null
        ? Math.abs(wrap180(curAlt.azDeg - prevAlt.azDeg))
        : 0;
    const pitchJump = Math.abs(curAlt.altDeg - prevAlt.altDeg);
    this.anomaly = dt <= o.anomalyMaxDtMs && yawJump >= o.anomalyJumpDeg && pitchJump < 5;

    this.lastRaw = raw.clone();
    this.lastMs = tMs;

    // 적응 이득 — 추정치는 항상 갱신(데드밴드는 출력에만: 첫 샘플 편향이 고정되지 않도록)
    const fast = this.rateDegPerSec > o.fastRateDegPerSec;
    const gain = fast ? 1 : 1 - Math.exp(-dt / o.tauMs);
    let next = slerpShortest(this.state, raw, gain);

    // yaw 별도 평활(절대 소스): 필터된 자세의 yaw를 더 느린 yaw 추정으로 바꾼다
    if (o.smoothYaw && !fast) {
      const rawYaw = curAlt.azDeg;
      const nextYaw = quaternionToAltAz(next).azDeg;
      if (rawYaw !== null && nextYaw !== null) {
        const yawGain = 1 - Math.exp(-dt / o.yawTauMs);
        const prevYaw = this.yawState ?? rawYaw;
        const smoothed = prevYaw + wrap180(rawYaw - prevYaw) * yawGain;
        this.yawState = ((smoothed % 360) + 360) % 360;
        next = applyYawOffset(next, wrap180(this.yawState - nextYaw));
      }
    } else {
      this.yawState = curAlt.azDeg;
    }
    this.state = next;
    // 출력 데드밴드: 추정치가 마지막 출력에서 0.2° 미만 움직였으면 출력을 유지(미세 떨림 제거)
    if (this.output && !fast && angleBetween(this.output, next) < o.deadbandDeg)
      return this.output.clone();
    this.output = next.clone();
    return next.clone();
  }

  private output: Quaternion | null = null;
  private history: { t: number; q: Quaternion }[] = [];
}

/** 이벤트 주기 측정(Hz) — 최근 N개 간격의 중앙값 */
export class RateMeter {
  private times: number[] = [];
  constructor(private readonly window = 30) {}
  push(tMs: number): void {
    this.times.push(tMs);
    if (this.times.length > this.window) this.times.shift();
  }
  get hz(): number | null {
    if (this.times.length < 3) return null;
    const gaps: number[] = [];
    for (let i = 1; i < this.times.length; i++) gaps.push(this.times[i]! - this.times[i - 1]!);
    gaps.sort((a, b) => a - b);
    const med = gaps[Math.floor(gaps.length / 2)]!;
    return med > 0 ? 1000 / med : null;
  }
  reset(): void {
    this.times = [];
  }
}
