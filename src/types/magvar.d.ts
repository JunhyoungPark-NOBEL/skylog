/** magvar 2.x (MIT) — WMM2025 자기 편각. 타입 선언이 없어 직접 정의. */
declare module 'magvar' {
  /**
   * 자기 편각(도). 동편각 양수(자북이 진북의 동쪽), 서편각 음수.
   * @param latitude 위도(도), @param longitude 경도(도, 동경 +), @param altitudeKm 고도 km, @param when Date 또는 소수 연도
   */
  export function magvar(
    latitude: number,
    longitude: number,
    altitudeKm?: number,
    when?: Date | number,
  ): number;
  export function magneticField(
    latitude: number,
    longitude: number,
    altitudeKm?: number,
    when?: Date | number,
  ): { declination: number; inclination: number; totalIntensity: number };
}
