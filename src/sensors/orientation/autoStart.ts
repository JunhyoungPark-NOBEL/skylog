import { sensorManager } from './manager';
import {
  needsOrientationPermission,
  orientationEventsSupported,
  requestOrientationPermission,
} from '../permissions';
import { useSensorStore, waitForSensorHydration } from '@/state/sensorStore';
import { requestWakeLock } from '../wakeLock';

let mounted = false;
let generation = 0;
let automaticAllowed = true;
let preferenceRevision = 0;

/** 권한 프롬프트를 호출하지 않는 자동 시작. 저장된 승인은 이벤트 수신으로 다시 검증한다. */
export async function tryAutomaticSkyOrientation(): Promise<void> {
  const token = generation;
  await waitForSensorHydration();
  if (
    !mounted ||
    !automaticAllowed ||
    token !== generation ||
    document.visibilityState === 'hidden'
  )
    return;
  const state = useSensorStore.getState();
  if (!state.autoStart || state.arActive) return;
  if (!state.simulator && !orientationEventsSupported()) {
    state.patch({ startup: 'unavailable', permission: 'unsupported' });
    return;
  }
  if (
    !state.simulator &&
    (state.orientationConsent === 'denied' ||
      (needsOrientationPermission() && state.orientationConsent !== 'granted'))
  ) {
    state.patch({
      startup: 'permission-required',
      permission: state.orientationConsent === 'denied' ? 'denied' : 'prompt',
    });
    return;
  }
  sensorManager.start();
}

/** SkyView가 카메라를 붙인 뒤 호출한다. 화면 이탈/백그라운드는 사용자 끄기 설정을 바꾸지 않는다. */
export function mountSkyOrientation(allowAutomatic = true): () => void {
  mounted = true;
  automaticAllowed = allowAutomatic;
  generation++;
  void tryAutomaticSkyOrientation();
  const visibility = () => {
    generation++;
    if (document.visibilityState === 'hidden') sensorManager.stop();
    else void tryAutomaticSkyOrientation();
  };
  document.addEventListener('visibilitychange', visibility);
  return () => {
    mounted = false;
    generation++;
    document.removeEventListener('visibilitychange', visibility);
    sensorManager.stop();
  };
}

/** 버튼 탭에서 즉시 권한 함수를 부른다. 늦은 응답은 떠난 화면의 센서를 다시 켜지 않는다. */
export async function enableSkyOrientationFromGesture() {
  const token = ++generation;
  const preference = ++preferenceRevision;
  automaticAllowed = true;
  const state = useSensorStore.getState();
  state.setSetting('autoStart', true);
  const permission = state.simulator ? 'granted' : await requestOrientationPermission(true);
  await waitForSensorHydration();
  if (preference === preferenceRevision) state.setSetting('autoStart', true);
  if (!mounted || token !== generation || document.visibilityState === 'hidden') return null;
  state.patch({ permission });
  if (!state.simulator && (permission === 'granted' || permission === 'denied'))
    state.setSetting('orientationConsent', permission);
  if (permission !== 'granted') {
    state.patch({ startup: permission === 'denied' ? 'permission-required' : 'unavailable' });
    return permission;
  }
  sensorManager.start();
  void requestWakeLock();
  return permission;
}

/** 공유 차트·원형 전체 하늘 같은 명시적 탐색은 현재 화면에서만 자동 추종을 멈춘다. */
export function setSkyOrientationAutomaticAllowed(allowed: boolean): void {
  automaticAllowed = allowed;
  generation++;
  if (!allowed) sensorManager.stop();
  else void tryAutomaticSkyOrientation();
}

export function disableSkyOrientation(): void {
  generation++;
  const preference = ++preferenceRevision;
  useSensorStore.getState().setSetting('autoStart', false);
  sensorManager.stop();
  void waitForSensorHydration().then(() => {
    if (preference === preferenceRevision) useSensorStore.getState().setSetting('autoStart', false);
  });
}
