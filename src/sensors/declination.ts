/**
 * 자기 편각 (task-02 §3.5 MUST): WMM2025(`magvar` 2.x, MIT, 2025.0–2030.0).
 * 부호: 동편각 +, 서편각 −. 진북 방위 = 자북 방위 + D. 대전(2026) ≈ −8~−9°.
 * 적용 규칙(D-018): 절대 소스(Android absolute, iOS webkitCompassHeading — WebKit은 magneticHeading을 전달)에 **한 번만**.
 * 별 정렬 δ가 있으면 정렬이 편각을 흡수하므로 다시 더하지 않는다.
 */
import { magvar } from 'magvar';

export function declinationDeg(
  latDeg: number,
  lonDeg: number,
  elevationM = 0,
  date: Date = new Date(),
): number {
  // WMM 유효 기간 밖이면 경계 연도로 고정(모델 외삽 오류 방지)
  const year =
    date.getUTCFullYear() +
    (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / (365.25 * 86_400_000);
  const clamped = Math.min(2029.99, Math.max(2025.0, year));
  return magvar(latDeg, lonDeg, elevationM / 1000, clamped);
}
