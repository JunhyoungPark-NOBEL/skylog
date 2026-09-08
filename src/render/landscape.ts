/** 시선을 내리면 지면을 투명하게 한다. 실제 관측 가능성·추천 계산에는 쓰지 않는다. */
export function landscapeFade(altitude: number): number {
  if (!Number.isFinite(altitude)) return 1;
  const x = Math.max(0, Math.min(1, -altitude / 28));
  return 1 - x * x * (3 - 2 * x);
}
export function effectiveGroundOpacity(
  opacity: number,
  landscape: boolean,
  altitude: number,
): number {
  return Math.max(0, Math.min(1, opacity)) * (landscape ? landscapeFade(altitude) : 1);
}
