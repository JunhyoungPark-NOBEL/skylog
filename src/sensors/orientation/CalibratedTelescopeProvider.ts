import { useTelescopeOrientation } from '../telescopePose';
import { useTelescopeStore, profileKey } from '@/state/telescopeStore';
import { useLocationStore } from '@/state/locationStore';
import { calibratedHandheldQuaternion, usableTelescopeAlignment } from '../telescopeAlignment';
import { currentScreenAngle } from './math';
import type { OrientationProvider, OrientationSample } from './types';

export function currentTelescopeAlignment() {
  const st = useTelescopeStore.getState();
  return usableTelescopeAlignment(
    st.savedAlignment,
    useTelescopeOrientation.getState(),
    profileKey(st.profile),
    useLocationStore.getState().site,
    Date.now(),
  );
}
/** 설치 중인 상대 센서를 공유한다. 화면 전환 때문에 네이티브 센서의 기준을 재시작하지 않는다. */
export class CalibratedTelescopeProvider implements OrientationProvider {
  readonly name = 'CalibratedTelescope';
  private unsubscribe: (() => void) | null = null;
  isSupported() {
    return !!currentTelescopeAlignment();
  }
  start(onSample: (s: OrientationSample) => void, onError: (e: Error) => void) {
    const publish = () => {
      const alignment = currentTelescopeAlignment();
      const r = useTelescopeOrientation.getState();
      if (!alignment || !r.q) {
        this.stop();
        onError(new Error('Alignment session ended'));
        return;
      }
      const screen = currentScreenAngle();
      onSample({
        q: calibratedHandheldQuaternion(r.q, alignment.model.yawDeg, screen),
        northReference: 'true',
        compassHeadingDeg: null,
        compassAccuracyDeg: null,
        raw: { alpha: null, beta: null, gamma: null, absolute: true },
        screenAngleDeg: screen,
        timestampMs: r.sampleMs,
        provider: this.name,
      });
    };
    this.unsubscribe = useTelescopeOrientation.subscribe(publish);
    // 다음 입력에서 발행해 호출자의 provider 선택이 끝난 뒤에 실패를 알린다.
  }
  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
