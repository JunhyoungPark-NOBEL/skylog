import { Quaternion } from 'three';
import { angleBetween } from './math';

export interface FusionReading {
  quaternion: [number, number, number, number];
  timestampMs?: number;
  northReference: 'relative' | 'magnetic';
  headingAccuracyDeg?: number;
  /** Android: 자이로 자세와 저속 북쪽 기준을 분리한다. 구형/iOS 입력은 생략한다. */
  channel?: 'motion' | 'reference';
}
type Pose = { q: Quaternion; t: number };
type Reference = Pose & { accuracy?: number };

/**
 * ENU 물리 프레임에서 자이로 자세를 기준으로 삼고 북쪽 오프셋만 8초 시정수로 보정한다.
 * 같은 측정 시각의 두 자세를 짝지어 실제 기기 회전을 나침반 오차로 오인하지 않는다.
 * 초기 기준은 즉시 맞추되 이후 15° 넘는 불일치/나쁜 정확도는 기존 자이로 추적을 유지한다.
 */
export class NorthFusion {
  private motion: Pose[] = [];
  private references: Reference[] = [];
  private correction: Quaternion | null = null;
  private lastReference = -Infinity;
  private accuracy: number | undefined;

  reset(): void {
    this.motion = [];
    this.references = [];
    this.correction = null;
    this.lastReference = -Infinity;
    this.accuracy = undefined;
  }
  push(reading: FusionReading): FusionReading | null {
    if (!reading.channel) {
      this.reset();
      return reading;
    }
    const t = reading.timestampMs;
    if (t === undefined || !Number.isFinite(t) || !reading.quaternion.every(Number.isFinite))
      return null;
    const q = new Quaternion(...reading.quaternion);
    if (q.lengthSq() < 1e-9) return null;
    q.normalize();
    if (reading.channel === 'reference') {
      if (t <= this.lastReference || this.references.some((r) => r.t >= t)) return null;
      this.references.push({ q, t, accuracy: reading.headingAccuracyDeg });
      if (this.references.length > 12) this.references.shift();
      this.align();
      return null;
    }
    const last = this.motion.at(-1);
    if (last && t <= last.t) return null;
    if (last && t - last.t > 500) this.reset();
    this.motion.push({ q, t });
    while (this.motion.length > 2 && t - this.motion[1]!.t > 300) this.motion.shift();
    this.align();
    if (!this.correction) return null; // 상대 방위를 북쪽인 것처럼 표시하지 않는다.
    return {
      ...reading,
      channel: undefined,
      northReference: 'magnetic',
      headingAccuracyDeg: t - this.lastReference <= 1500 ? this.accuracy : undefined,
      quaternion: this.correction
        .clone()
        .multiply(q)
        .normalize()
        .toArray() as FusionReading['quaternion'],
    };
  }
  private align(): void {
    const first = this.motion[0],
      last = this.motion.at(-1);
    if (!first || !last) return;
    while (this.references.length && this.references[0]!.t <= last.t) {
      const ref = this.references.shift()!;
      if (ref.t < first.t || ref.t <= this.lastReference) continue;
      const dt = Number.isFinite(this.lastReference)
        ? Math.min(200, ref.t - this.lastReference)
        : 0;
      this.lastReference = ref.t;
      // 추적은 유지해도 설정의 품질 진단에는 최근 센서 정확도를 그대로 전달한다.
      this.accuracy = ref.accuracy;
      if (ref.accuracy !== undefined && (ref.accuracy < 0 || ref.accuracy > 25)) continue;
      let relative = first.q;
      for (let i = 1; i < this.motion.length; i++) {
        const b = this.motion[i]!,
          a = this.motion[i - 1]!;
        if (ref.t <= b.t) {
          relative = a.q.clone().slerp(b.q, (ref.t - a.t) / (b.t - a.t));
          break;
        }
      }
      const delta = ref.q.clone().multiply(relative.clone().invert()).normalize();
      // ENU의 수직축은 Z다. 화면 방향/기기 기울기와 무관한 twist만 사용한다.
      const yaw = new Quaternion(0, 0, delta.z, delta.w);
      if (yaw.lengthSq() < 1e-9) continue;
      yaw.normalize();
      if (!this.correction) this.correction = yaw;
      else if (angleBetween(this.correction, yaw) <= 15)
        this.correction.slerp(yaw, 1 - Math.exp(-dt / 8000)).normalize();
    }
  }
}
