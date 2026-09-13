/** 자세의 두 단계 저역통과 + 이동 속도 적응. 천정에서도 Euler 방위각을 계산하지 않는다. */
import { Quaternion } from 'three';
import { angleBetween, slerpShortest } from '@/sensors/orientation/math';

export interface FilterOptions {
  tauMs: number;
  yawTauMs: number;
  deadbandDeg: number;
  fastRateDegPerSec: number;
  smoothYaw: boolean;
  anomalyJumpDeg: number;
  anomalyMaxDtMs: number;
}
export const DEFAULT_FILTER: FilterOptions = {
  tauMs: 180,
  yawTauMs: 300,
  deadbandDeg: 0.2,
  fastRateDegPerSec: 30,
  smoothYaw: false,
  anomalyJumpDeg: 15,
  anomalyMaxDtMs: 120,
};

/** 세계 Y축 twist를 별도 평활한다. 천정/북쪽 경계에서도 회전 표현이 끊기지 않는다. */
function smooth(from: Quaternion, to: Quaternion, gain: number, yawGain: number): Quaternion {
  if (gain === yawGain) return slerpShortest(from, to, gain);
  const delta = to.clone().multiply(from.clone().invert()).normalize();
  if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
  const twist = new Quaternion(0, delta.y, 0, delta.w);
  if (twist.lengthSq() < 1e-12) return slerpShortest(from, to, gain);
  twist.normalize();
  const swing = delta.clone().multiply(twist.clone().invert());
  return new Quaternion()
    .slerp(swing, gain)
    .multiply(new Quaternion().slerp(twist, yawGain))
    .multiply(from)
    .normalize();
}

export class OrientationFilter {
  private readonly opts: FilterOptions;
  private state: Quaternion | null = null;
  private stage: Quaternion | null = null;
  private output: Quaternion | null = null;
  private lastRaw: Quaternion | null = null;
  private accepted: Quaternion | null = null;
  private motionProbe: Quaternion | null = null;
  private pending: Quaternion | null = null;
  private lastMs = 0;
  private deadbandDeg: number;
  private zoomWeight = 0;
  private history: { t: number; q: Quaternion }[] = [];
  anomaly = false;
  rateDegPerSec = 0;
  constructor(opts: Partial<FilterOptions> = {}) {
    this.opts = { ...DEFAULT_FILTER, ...opts };
    this.deadbandDeg = this.opts.deadbandDeg;
  }
  get smoothYaw(): boolean {
    return this.opts.smoothYaw;
  }
  get current(): Quaternion | null {
    return this.state;
  }
  setDeadband(deg: number): void {
    if (Number.isFinite(deg)) this.deadbandDeg = Math.max(0.001, Math.min(0.2, deg));
  }
  setViewport(fovDeg: number, degreesPerPixel: number): void {
    if (!Number.isFinite(fovDeg) || !Number.isFinite(degreesPerPixel)) return;
    this.zoomWeight = Math.max(0, Math.min(1, Math.log2(60 / Math.max(3, fovDeg)) / 4));
    this.setDeadband(Math.min(0.025, degreesPerPixel * 0.2));
  }
  reset(): void {
    this.state = this.stage = this.output = this.lastRaw = this.accepted = this.pending = null;
    this.history = [];
    this.motionProbe = null;
    this.anomaly = false;
    this.rateDegPerSec = 0;
  }
  push(raw: Quaternion, tMs: number): Quaternion {
    if (!Number.isFinite(tMs) || !raw.toArray().every(Number.isFinite) || raw.lengthSq() < 1e-9)
      return this.output?.clone() ?? new Quaternion();
    if (this.state && tMs <= this.lastMs) return (this.output ?? this.state).clone();
    if (this.state && tMs - this.lastMs > 500) this.reset();
    const input = raw.clone().normalize();
    if (!this.state || !this.stage || !this.lastRaw || !this.accepted) {
      this.state = input.clone();
      this.stage = input.clone();
      this.output = input.clone();
      this.accepted = input.clone();
      this.lastRaw = input.clone();
      this.lastMs = tMs;
      this.history = [{ t: tMs, q: input.clone() }];
      this.motionProbe = input.clone();
      return input;
    }
    const dt = Math.max(1, tMs - this.lastMs),
      o = this.opts;
    const rotation = input.clone().multiply(this.lastRaw.clone().invert()).normalize();
    const verticalFraction =
      Math.abs(rotation.y) / Math.max(1e-8, Math.hypot(rotation.x, rotation.y, rotation.z));
    this.anomaly =
      o.smoothYaw &&
      dt <= o.anomalyMaxDtMs &&
      angleBetween(input, this.lastRaw) >= o.anomalyJumpDeg &&
      verticalFraction > 0.96;
    this.lastRaw = input.clone();
    this.lastMs = tMs;
    // 단발 방향 튐은 다음 측정으로 확인한다. 실제 큰 회전은 다음 샘플부터 지연 없이 추종한다.
    const jump = angleBetween(input, this.accepted);
    if (
      jump > Math.max(1.5, ((this.rateDegPerSec * dt) / 1000) * 3) &&
      (!this.pending || angleBetween(input, this.pending) > jump * 0.75)
    ) {
      this.pending = input;
      return this.output!.clone();
    }
    this.pending = null;
    this.accepted = input.clone();
    // 속도 판정용 자세는 먼저 잔떨림을 제거한다. 이동 중 손떨림이 있다는 이유로 추적을 붙잡지 않는다.
    this.motionProbe = slerpShortest(this.motionProbe ?? input, input, 1 - Math.exp(-dt / 100));
    this.history.push({ t: tMs, q: this.motionProbe.clone() });
    while (this.history.length > 1 && tMs - this.history[0]!.t > 500) this.history.shift();
    const oldest = this.history[0]!,
      span = Math.max(1, tMs - oldest.t);
    const net = angleBetween(oldest.q, this.motionProbe);
    this.rateDegPerSec = span >= 50 ? (net * 1000) / span : 0;
    let travel = 0;
    for (let i = 1; i < this.history.length; i++)
      travel += angleBetween(this.history[i - 1]!.q, this.history[i]!.q);
    const coherence = travel > 1e-6 ? Math.min(1, net / travel) : 0;
    // 반 초의 왕복 여부를 확인해 느린 손 흔들림이 평활 강도를 풀어 버리지 않게 한다.
    const intentionalRate = this.rateDegPerSec * coherence ** 3;
    const fast = intentionalRate > o.fastRateDegPerSec;
    const adaptation = 1 + (intentionalRate / 0.6) ** 2;
    const tau = (o.tauMs + 720 * this.zoomWeight) / adaptation / 2;
    const yawTau = ((o.smoothYaw ? o.yawTauMs : o.tauMs) + 720 * this.zoomWeight) / adaptation / 2;
    const gain = fast ? 1 : 1 - Math.exp(-dt / Math.max(1, tau));
    const yawGain = fast ? 1 : 1 - Math.exp(-dt / Math.max(1, yawTau));
    this.stage = smooth(this.stage, input, gain, yawGain);
    this.state = smooth(this.state, this.stage, gain, yawGain);
    if (this.output && !fast && angleBetween(this.output, this.state) < this.deadbandDeg)
      return this.output.clone();
    this.output = this.state.clone();
    return this.output.clone();
  }
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
