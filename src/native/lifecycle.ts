import { App } from '@capacitor/app';
import { isNative } from './motion';
import { stopTelescopeOrientation } from '@/sensors/telescopeOrientation';
import { useSelectionStore } from '@/state/selectionStore';
import { sensorManager } from '@/sensors/orientation/manager';
import { useSensorStore } from '@/state/sensorStore';

/** 네이티브 뒤로 버튼은 앱 내 라우트만 이동한다. 백그라운드 후 망원경은 다시 정렬한다. */
export async function initNativeLifecycle() {
  if (!isNative()) return;
  let resumeAr = false;
  await App.addListener('pause', () => {
    resumeAr = useSensorStore.getState().arActive;
    stopTelescopeOrientation();
    sensorManager.stop();
  });
  await App.addListener('resume', () => {
    if (resumeAr) {
      resumeAr = false;
      sensorManager.start();
    }
  });
  await App.addListener('backButton', () => {
    const selection = useSelectionStore.getState();
    if (selection.sheetOpen) {
      selection.closeSheet();
      return;
    }
    if (window.location.hash.split('?')[0] !== '#/sky') {
      window.location.hash = '#/sky';
      return;
    }
    void App.minimizeApp();
  });
}
