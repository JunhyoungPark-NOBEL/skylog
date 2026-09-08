import { Quaternion } from 'three';
import { clamp } from '@/astro/coords';

const DEFAULT_INTERVAL_MS = 1000 / 30;
const RESET_GAP_MS = 250;
export const MAX_POSE_BLEND_MS = 50;

/**
 * 불규칙한 센서 자세를 렌더 시각에 맞춰 잇는다. 별도의 저역통과 필터나 미래 방향 예측은 하지 않는다.
 * 샘플 간격만큼(최대 50ms) 최단 경로로 보간하고, 동일 목표는 도착 시간을 뒤로 미루지 않는다.
 */
export class RenderPose {
  private present = false;
  private readonly from = new Quaternion();
  private readonly target = new Quaternion();
  private readonly output = new Quaternion();
  private readonly incoming = new Quaternion();
  private lastSampleMs = 0;
  private startMs = 0;
  private durationMs = 0;
  private intervalMs = DEFAULT_INTERVAL_MS;

  reset(): void {
    this.present = false;
    this.durationMs = 0;
    this.intervalMs = DEFAULT_INTERVAL_MS;
  }

  get active(): boolean {
    return this.present;
  }

  /** 첫 입력 또는 긴 공백 뒤 입력이면 true: 이전 세션의 자세에서 보간하지 않고 즉시 적용한다. */
  push(q: Quaternion, nowMs: number): boolean {
    this.incoming.copy(q).normalize();
    const gap = nowMs - this.lastSampleMs;
    if (!this.present || gap > RESET_GAP_MS || gap < 0) {
      this.present = true;
      this.from.copy(this.incoming);
      this.target.copy(this.incoming);
      this.lastSampleMs = this.startMs = nowMs;
      this.durationMs = 0;
      this.intervalMs = DEFAULT_INTERVAL_MS;
      return true;
    }
    if (gap > 0) this.intervalMs += 0.25 * (clamp(gap, 8, MAX_POSE_BLEND_MS) - this.intervalMs);
    this.lastSampleMs = nowMs;
    if (1 - Math.abs(this.incoming.dot(this.target)) < 1e-12) return false;
    this.from.copy(this.sample(nowMs)!);
    this.target.copy(this.incoming);
    this.startMs = nowMs;
    this.durationMs = clamp(this.intervalMs, 8, MAX_POSE_BLEND_MS);
    return false;
  }

  /** 반환 객체는 다음 호출에서 재사용하므로 호출자는 보관할 때 복사한다. */
  sample(nowMs: number): Quaternion | null {
    if (!this.present) return null;
    const progress =
      this.durationMs > 0 ? clamp((nowMs - this.startMs) / this.durationMs, 0, 1) : 1;
    return this.output.copy(this.from).slerp(this.target, progress).normalize();
  }

  isMoving(nowMs: number): boolean {
    return this.present && this.durationMs > 0 && nowMs - this.startMs < this.durationMs;
  }
}
