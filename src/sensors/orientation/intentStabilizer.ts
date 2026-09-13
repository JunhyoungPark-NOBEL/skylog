import type { Quaternion } from 'three';
import { angleBetween } from './math';
import { clamp } from '@/astro/coords';

/** 화면용 정지/이동 판정. 측정 필터·보정 좌표에는 이 고정값을 되돌려 넣지 않는다. */
export class IntentStabilizer {
  private anchor: Quaternion | null = null;
  private output: Quaternion | null = null;
  private probe: Quaternion | null = null;
  private history: { q: Quaternion; t: number }[] = [];
  private lastMs = -Infinity;
  private intentSince: number | null = null;
  private quietSince: number | null = null;
  private releasedAt = -Infinity;
  private following = false;
  private radiusDeg = 0.8;

  get state(): 'holding' | 'following' {
    return this.following ? 'following' : 'holding';
  }
  get thresholdDeg(): number {
    return this.radiusDeg;
  }
  setViewport(fovDeg: number): void {
    if (Number.isFinite(fovDeg))
      this.radiusDeg = clamp(0.3 + Math.max(0, fovDeg) / 120, 0.325, 1.05);
  }
  reset(): void {
    this.anchor = this.output = this.probe = null;
    this.history = [];
    this.lastMs = this.releasedAt = -Infinity;
    this.intentSince = this.quietSince = null;
    this.following = false;
  }
  push(q: Quaternion, t: number): Quaternion | null {
    if (!Number.isFinite(t) || !q.toArray().every(Number.isFinite) || q.lengthSq() < 1e-9)
      return this.output?.clone() ?? null;
    if (t <= this.lastMs) return this.output?.clone() ?? null;
    if (t - this.lastMs > 250) this.reset();
    const input = q.clone().normalize();
    const dt = t - this.lastMs;
    this.lastMs = t;
    if (!this.output || !this.anchor) {
      this.anchor = input.clone();
      this.output = input.clone();
      this.probe = input.clone();
      this.history = [{ q: input, t }];
      return this.output.clone();
    }
    // 이동 판정에서 빠른 왕복 성분을 제거한다. 실제 표시 자세를 추가로 지연시키는 필터는 아니다.
    this.probe!.slerp(input, 1 - Math.exp(-dt / 100)).normalize();
    const probe = this.probe!;
    this.history.push({ q: probe.clone(), t });
    while (this.history.length > 2 && t - this.history[1]!.t > 320) this.history.shift();
    const first = this.history[0]!;
    const span = t - first.t;
    const net = angleBetween(first.q, probe);
    let travel = 0;
    for (let i = 1; i < this.history.length; i++)
      travel += angleBetween(this.history[i - 1]!.q, this.history[i]!.q);
    const coherence = travel > 1e-7 ? net / travel : 0;
    const speed = span > 0 ? (net * 1000) / span : 0;
    const offset = angleBetween(this.anchor, input);
    const displaced = offset > this.radiusDeg;
    // 작은 왕복 흔들림은 현재 시점을 유지한다. 빠르고 큰 이동에는 긴 정지 확인을 요구하지 않는다.
    const fast = displaced && speed > 25 && net > this.radiusDeg * 2;
    const directed = displaced && span >= 120 && coherence > 0.78 && net > this.radiusDeg * 0.15;
    if (!this.following) {
      if (fast || directed) this.intentSince ??= t;
      else this.intentSince = null;
      const confirmed = this.intentSince !== null && t - this.intentSince >= (fast ? 25 : 100);
      // 방향을 바꾼 뒤 고정한 경우에도 이전 시점에 영구적으로 붙잡아 두지 않는다.
      const relocated = offset > this.radiusDeg * 2 && span >= 300 && travel < this.radiusDeg * 0.1;
      if (!confirmed && !relocated) return this.output.clone();
      this.following = true;
      this.releasedAt = t;
      this.quietSince = null;
    }
    const remaining = angleBetween(this.output, input);
    const moving = speed > 0.35 && coherence > 0.65;
    if (!moving && remaining < this.radiusDeg) this.quietSince ??= t;
    else this.quietSince = null;
    if (this.quietSince !== null && t - this.quietSince >= 180) {
      this.following = false;
      this.anchor.copy(this.output);
      this.intentSince = this.quietSince = null;
      return this.output.clone();
    }
    // 큰 회전은 빠르게, 작은 이동은 완만하게 따라간다. 이동 시작에서 위치를 순간 이동시키지 않는다.
    const tau = speed > 30 || remaining > 10 ? 14 : 65;
    const ramp = tau === 14 ? 1 : clamp((t - this.releasedAt + dt) / 100, 0, 1);
    const gain = (1 - Math.exp(-dt / tau)) * ramp * ramp * (3 - 2 * ramp);
    this.output.slerp(input, gain).normalize();
    return this.output.clone();
  }
}
