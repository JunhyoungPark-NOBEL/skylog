/**
 * 방향 센서 권한 (task-02 §3.2, G1 §A2). iOS 13+·Chrome 151+의 `DeviceOrientationEvent.requestPermission()`은
 * **사용자 제스처 안에서만** 호출한다(페이지 로드 시 자동 요청 금지). 메서드 존재로 iOS를 식별하지 않는다(기능 감지).
 */
export type OrientationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

type DOEStatic = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<'granted' | 'denied'>;
};

export function orientationEventsSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

export function needsOrientationPermission(): boolean {
  if (!orientationEventsSupported()) return false;
  return typeof (DeviceOrientationEvent as DOEStatic).requestPermission === 'function';
}

/** 사용자 탭 핸들러 안에서 호출. 권한 API가 없으면 'granted'로 간주(이벤트가 오는지는 Provider가 판정). */
export async function requestOrientationPermission(): Promise<OrientationPermissionState> {
  if (!orientationEventsSupported()) return 'unsupported';
  const req = (DeviceOrientationEvent as DOEStatic).requestPermission;
  if (typeof req !== 'function') return 'granted';
  try {
    const r = await req.call(DeviceOrientationEvent);
    return r === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/** iOS에서 거부된 뒤의 안내(설정 앱에 토글이 없다). */
export const ORIENTATION_DENIED_HELP_KEY = 'sensor.permission.deniedHelp';
