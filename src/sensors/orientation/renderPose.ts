import { Quaternion } from 'three';
import { clamp } from '@/astro/coords';

export const MAX_POSE_BLEND_MS = 50;
export const POSE_DELAY_MS = 40;
const RESET_GAP_MS = 250;

/** 측정 시각의 자세 열을 40ms 뒤에서 재생한다. 이벤트가 몰려와도 매번 보간을 재시작하지 않는다. */
export class RenderPose {
  private samples: { q: Quaternion; time: number }[] = [];
  private output = new Quaternion();
  private lastChangeMs = -Infinity;
  reset(): void {
    this.samples = [];
    this.lastChangeMs = -Infinity;
  }
  get active(): boolean {
    return this.samples.length > 0;
  }
  /** 오래된/중복/무효 입력으로 표시 자세를 되감지 않는다. */
  push(q: Quaternion, time: number): boolean {
    if (!Number.isFinite(time) || !q.toArray().every(Number.isFinite) || q.lengthSq() < 1e-9)
      return false;
    const last = this.samples.at(-1);
    if (last && time <= last.time) return false;
    const fresh = !last || time - last.time > RESET_GAP_MS;
    if (fresh) this.reset();
    const normalized = q.clone().normalize();
    if (fresh || !last || 1 - Math.abs(normalized.dot(last.q)) > 1e-12) this.lastChangeMs = time;
    this.samples.push({ q: normalized, time });
    while (this.samples.length > 2 && time - this.samples[1]!.time > 1000) this.samples.shift();
    return fresh;
  }
  /** 호출 횟수/렌더 주기와 무관한 시간 기반 보간. 입력이 끊기면 마지막 자세를 유지한다. */
  sample(nowMs: number): Quaternion | null {
    const first = this.samples[0];
    if (!first) return null;
    const time = nowMs - POSE_DELAY_MS;
    if (time <= first.time) return this.output.copy(first.q);
    for (let i = 1; i < this.samples.length; i++) {
      const next = this.samples[i]!,
        prev = this.samples[i - 1]!;
      if (time <= next.time)
        return this.output
          .copy(prev.q)
          .slerp(next.q, clamp((time - prev.time) / (next.time - prev.time), 0, 1))
          .normalize();
    }
    return this.output.copy(this.samples.at(-1)!.q);
  }
  isMoving(nowMs: number): boolean {
    return this.active && nowMs < this.lastChangeMs + POSE_DELAY_MS;
  }
}
