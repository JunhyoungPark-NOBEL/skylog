import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
export interface MotionReading {
  /** 기기 물리 프레임 → ENU, [x,y,z,w]. 화면 회전은 호출자가 한 번만 적용한다. */
  quaternion: [number, number, number, number];
  northReference: 'relative' | 'magnetic';
  /** 기기가 보고한 방위 오차. 미상은 생략하고 무효는 음수다. */
  headingAccuracyDeg?: number;
}
interface MotionPlugin {
  start(options: { relative: boolean; session: string }): Promise<void>;
  stop(options: { session: string }): Promise<void>;
  keepAwake(options: { enabled: boolean }): Promise<void>;
  addListener(
    event: 'orientation',
    callback: (reading: MotionReading & { session: string }) => void,
  ): Promise<PluginListenerHandle>;
}
export const nativeMotion = registerPlugin<MotionPlugin>('SkylogMotion');
export const isNative = () => Capacitor.isNativePlatform();

/** 늦게 완료되는 start/stop도 다음 사용자의 센서 세션을 종료하지 않도록 토큰을 보낸다. */
export function watchNativeMotion(
  relative: boolean,
  onReading: (r: MotionReading) => void,
  onError: (e: Error) => void,
): () => void {
  const session = crypto.randomUUID();
  let cancelled = false,
    listener: PluginListenerHandle | undefined;
  let received = false,
    timer = 0;
  const fail = (e: Error) => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(timer);
    void listener?.remove();
    void nativeMotion.stop({ session }).catch(() => {});
    onError(e);
  };
  void (async () => {
    listener = await nativeMotion.addListener('orientation', (r) => {
      if (
        !cancelled &&
        r.session === session &&
        r.quaternion.length === 4 &&
        r.quaternion.every(Number.isFinite)
      ) {
        received = true;
        clearTimeout(timer);
        onReading(r);
      }
    });
    if (cancelled) {
      await listener.remove();
      return;
    }
    await nativeMotion.start({ relative, session });
    if (cancelled) await nativeMotion.stop({ session });
    else if (!received)
      timer = window.setTimeout(() => {
        if (!cancelled && !received) fail(new Error('No motion samples'));
      }, 6000);
  })().catch((e) => {
    fail(e instanceof Error ? e : new Error(String(e)));
  });
  return () => {
    cancelled = true;
    clearTimeout(timer);
    void listener?.remove();
    void nativeMotion.stop({ session }).catch(() => {});
  };
}
