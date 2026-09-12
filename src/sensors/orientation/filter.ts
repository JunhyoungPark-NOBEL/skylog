/**
 * 자세 융합·필터 (task-02 §3.4).
 * - 쿼터니언 저역통과 + 화면 픽셀 기준 데드밴드, 움직일 때 시간 상수를 줄여 지연을 낮춘다.
 * - 천정에서 정의되지 않는 시선 방위각을 평활하지 않는다. 모든 자세에서 같은 3차원 회전을 쓴다.
 * - 급격한 세계 수직축 회전은 진단 후보일 뿐 자석 간섭으로 단정하거나 추적을 멈추지 않는다.
 * 목표(단위 테스트): 60Hz 합성 입력에서 정지 잔여 떨림 < 0.2°, 90° 스텝 후 2° 이내 도달 ≤ 150ms.
 */
import type { Quaternion } from 'three';
import { angleBetween, slerpShortest } from '@/sensors/orientation/math';

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
  private deadbandDeg: number;
  private zoomWeight = 0;
  /** 마지막 갱신에서 감지된 이상 여부 */
  anomaly = false;
  /** 마지막 추정 각속도(도/초) */
  rateDegPerSec = 0;

  constructor(opts: Partial<FilterOptions> = {}) {
    this.opts = { ...DEFAULT_FILTER, ...opts };
    this.deadbandDeg = this.opts.deadbandDeg;
  }

  get smoothYaw(): boolean {
    return this.opts.smoothYaw;
  }

  /** 줌이 바뀌어도 필터 이력을 지우지 않는다. */
  setDeadband(deg: number): void {
    this.deadbandDeg = Math.max(0.001, Math.min(0.2, deg));
  }

  /** 넓게 둘러볼 때는 빠르게, 확대해 멈춰 볼 때는 강하게 안정화한다. */
  setViewport(fovDeg: number, degreesPerPixel: number): void {
    if (!Number.isFinite(fovDeg) || !Number.isFinite(degreesPerPixel)) return;
    this.zoomWeight = Math.max(0, Math.min(1, Math.log2(60 / Math.max(3, fovDeg)) / 4));
    this.setDeadband(Math.min(0.035, degreesPerPixel * 0.3));
  }

  reset(): void {
    this.state = null;
    this.output = null;
    this.history = [];
    this.lastRaw = null;
    this.anomaly = false;
    this.rateDegPerSec = 0;
  }

  get current(): Quaternion | null {
    return this.state;
  }

  /** 새 샘플을 넣고 필터된 자세를 돌려준다. tMs는 단조 증가(performance.now()). */
  push(raw: Quaternion, tMs: number): Quaternion {
    const o = this.opts;
    if (this.state && tMs <= this.lastMs) return (this.output ?? this.state).clone();
    if (this.state && tMs - this.lastMs > 500) this.reset();
    if (!this.state || !this.lastRaw) {
      this.state = raw.clone();
      this.output = raw.clone();
      this.history = [{ t: tMs, q: raw.clone() }];
      this.lastRaw = raw.clone();
      this.lastMs = tMs;
      this.anomaly = false;
      return this.state.clone();
    }
    const dt = Math.max(1, tMs - this.lastMs);
    // 220ms 동안의 순변위와 총 회전량을 비교한다. 왕복하는 손떨림을 의도적 이동 속도로 오인하지 않는다.
    this.history.push({ t: tMs, q: raw.clone() });
    while (this.history.length > 1 && tMs - this.history[0]!.t > 220) this.history.shift();
    const oldest = this.history[0]!;
    const span = Math.max(1, tMs - oldest.t);
    this.rateDegPerSec = span >= 50 ? (angleBetween(oldest.q, raw) / span) * 1000 : 0;
    let travel = 0;
    for (let i = 1; i < this.history.length; i++)
      travel += angleBetween(this.history[i - 1]!.q, this.history[i]!.q);
    const coherence = travel > 1e-6 ? Math.min(1, angleBetween(oldest.q, raw) / travel) : 0;
    const intentionalRate = this.rateDegPerSec * coherence * coherence;

    // 상대 회전의 세계 Y축 성분으로 판정한다. 천정을 가로지르는 작은 회전은 180° yaw 점프가 아니다.
    const rotation = raw.clone().multiply(this.lastRaw.clone().invert()).normalize();
    const rotationDeg = (2 * Math.acos(Math.min(1, Math.abs(rotation.w))) * 180) / Math.PI;
    const axisLength = Math.hypot(rotation.x, rotation.y, rotation.z);
    const verticalFraction = axisLength > 1e-8 ? Math.abs(rotation.y) / axisLength : 0;
    this.anomaly =
      o.smoothYaw &&
      dt <= o.anomalyMaxDtMs &&
      rotationDeg >= o.anomalyJumpDeg &&
      verticalFraction > 0.96;

    this.lastRaw = raw.clone();
    this.lastMs = tMs;

    // 적응 이득 — 추정치는 항상 갱신(데드밴드는 출력에만: 첫 샘플 편향이 고정되지 않도록)
    // 1€ 필터의 속도 적응 원리(Casiez et al., CHI 2012)를 쿼터니언에 적용한다.
    // https://gery.casiez.net/1euro/ — 확대 정지 시 최대650ms, 일관된 이동 시 빠른 추종.
    const fast = intentionalRate > o.fastRateDegPerSec;
    const steadyTau = o.tauMs + 550 * this.zoomWeight;
    const tau = steadyTau / (1 + (intentionalRate / 1.5) ** 2);
    const gain = fast ? 1 : 1 - Math.exp(-dt / tau);
    const next = slerpShortest(this.state, raw, gain);
    this.state = next;
    // 출력 데드밴드: 추정치가 마지막 출력에서 0.2° 미만 움직였으면 출력을 유지(미세 떨림 제거)
    if (this.output && !fast && angleBetween(this.output, next) < this.deadbandDeg)
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
