import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sceneToAltAz, type Vec3 } from '@/astro/coords';
import type { ObjectId } from '@/catalog/objectId';
import { SkyScene } from '@/render/SkyScene';
import { useClockStore } from '@/state/clockStore';
import { useLayerStore } from '@/state/layerStore';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore } from '@/state/sensorStore';
import { useSettingsStore } from '@/state/settingsStore';

/** 하늘 탭과 같은 천구를 쓰되 안내의 물리 +Y 방향으로 독립 카메라를 움직인다. */
export function GuideSky({
  targetId,
  pointing,
}: {
  targetId: ObjectId | null;
  pointing: Vec3 | null;
}) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const targetMarker = useRef<HTMLDivElement>(null);
  const scene = useRef<SkyScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!canvas.current || !labels.current) return;
    let alive = true;
    let sky: SkyScene;
    try {
      sky = new SkyScene({
        canvas: canvas.current,
        labelContainer: labels.current,
        getTime: () =>
          useSensorStore.getState().simulator ? useClockStore.getState().now() : new Date(),
        getObserver: () => useLocationStore.getState().site,
        getLayers: () => ({ ...useLayerStore.getState(), constellationNames: false }),
        getLang: () => useSettingsStore.getState().lang,
        isTimeRunning: () => true,
        onViewChange: () => {},
        onSelect: () => {},
      });
    } catch {
      queueMicrotask(() => {
        if (alive) setFailed(true);
      });
      return () => {
        alive = false;
      };
    }
    scene.current = sky;
    // 별 이름은 빈 하늘 구간에만 보이지만 목표 고리는 HUD와 무관하게 계속 표시한다.
    const ring = labels.current.querySelector('.sky-selection-ring');
    if (ring && targetMarker.current) targetMarker.current.appendChild(ring);
    // 안내 중 터치는 방향 HUD 버튼에만 사용한다. 미리보기 탐색은 별도의 시야 차트에서 제공한다.
    sky.controller.detach();
    sky.controller.setView({ altDeg: 35, azDeg: 180, fovDeg: 78 }, false);
    sky.resize();
    const resize = new ResizeObserver(() => sky.resize());
    resize.observe(canvas.current);
    const subscriptions = [
      useLayerStore.subscribe(() => sky.invalidate()),
      useLocationStore.subscribe(() => sky.invalidate()),
      useClockStore.subscribe(() => sky.invalidate()),
      useSettingsStore.subscribe(() => {
        sky.setPalette();
        sky.invalidate();
      }),
    ];
    const visibility = () => (document.visibilityState === 'hidden' ? sky.stop() : sky.start());
    document.addEventListener('visibilitychange', visibility);
    sky.start();
    void sky
      .init()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      subscriptions.forEach((unsubscribe) => unsubscribe());
      document.removeEventListener('visibilitychange', visibility);
      resize.disconnect();
      sky.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !scene.current) return;
    const sky = scene.current;
    sky.select(targetId);
    const target = targetId ? sky.describe(targetId) : null;
    const center = pointing ? sceneToAltAz(pointing) : target;
    if (center)
      sky.controller.setView({ altDeg: center.altDeg, azDeg: center.azDeg, fovDeg: 78 }, false);
    sky.invalidate();
  }, [pointing, targetId, ready]);
  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-testid="guide-sky"
      aria-label={t('guideAuto.skyLabel')}
    >
      <canvas ref={canvas} className="block h-full w-full" data-testid="guide-sky-canvas" />
      <div
        ref={labels}
        className="absolute inset-0 overflow-hidden"
        data-testid="guide-sky-labels"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 18%, black 23%, black 35%, transparent 43%)',
        }}
      />
      <div ref={targetMarker} className="absolute inset-0 overflow-hidden" />
      {(!ready || failed) && (
        <p role="status" className="absolute inset-x-4 top-1/3 text-center text-body-sm text-muted">
          {t(failed ? 'guide.loadError' : 'common.loading')}
        </p>
      )}
    </div>
  );
}
