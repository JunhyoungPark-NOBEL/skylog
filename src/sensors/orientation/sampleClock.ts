/** 부팅 시각을 performance 시각으로 정렬한다. 도착 지연을 측정 간격으로 오인하지 않는다. */
export class SampleClock {
  private offset: number | null = null;
  private lastSource = -Infinity;
  private lastMapped = -Infinity;

  map(sourceMs: number | undefined, arrivalMs: number): number | null {
    if (sourceMs === undefined) return arrivalMs; // 구형 네이티브 플러그인 호환
    if (!Number.isFinite(sourceMs) || sourceMs < 0 || sourceMs <= this.lastSource) return null;
    if (this.offset === null) this.offset = arrivalMs - sourceMs;
    // 첫 이벤트가 늦었다면 오차를 낮춘다. 지연이 늘었다고 시계를 앞으로 옮기지 않는다.
    this.offset = Math.min(this.offset, arrivalMs - sourceMs);
    this.lastSource = sourceMs;
    const mapped = sourceMs + this.offset;
    if (mapped <= this.lastMapped) return null;
    this.lastMapped = mapped;
    return mapped;
  }
}

/** DOM/Generic Sensor는 performance와 같은 시계다. 구형 epoch 시각만 변환한다. */
export function browserSampleTime(
  sourceMs: number | null | undefined,
  nowMs = performance.now(),
): number {
  if (sourceMs == null || !Number.isFinite(sourceMs) || sourceMs <= 0) return nowMs;
  const time = sourceMs > 1e12 ? sourceMs - performance.timeOrigin : sourceMs;
  return time >= 0 && time <= nowMs + 1 ? Math.min(time, nowMs) : nowMs;
}
