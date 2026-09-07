import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hashQuery } from '@/app/router';
import type { ObjectId } from '@/catalog/objectId';
import { ArToggle } from '@/features/sky/ArToggle';
import { CalibrationWizard } from '@/features/sky/CalibrationWizard';
import { LayerPanel } from '@/features/sky/LayerPanel';
import { SensorSimPanel } from '@/features/sky/SensorSimPanel';
import { sensorManager } from '@/sensors/orientation/manager';
import { useSensorStore } from '@/state/sensorStore';
import { SelectionTooltip } from '@/features/sky/SelectionTooltip';
import { registerSkyScene } from '@/features/sky/skyApi';
import { TimeBar } from '@/features/sky/TimeBar';
import { SkyScene, type ObjectInfo } from '@/render/SkyScene';
import { useClockStore } from '@/state/clockStore';
import { useLayerStore } from '@/state/layerStore';
import { useLocationStore } from '@/state/locationStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useViewStore } from '@/state/viewStore';
import { IconLayers } from '@/ui/icons';

function formatView(alt: number, az: number, fov: number): string {
  return `${alt >= 0 ? '+' : ''}${alt.toFixed(1)}° / ${az.toFixed(1)}° · FOV ${fov.toFixed(0)}°`;
}

/** 화면 중심 alt/az·FOV 텍스트 — viewStore(≤10Hz 갱신)만 구독해 하늘 뷰 전체 리렌더를 막는다. */
function ViewInfo() {
  const alt = useViewStore((s) => s.centerAlt);
  const az = useViewStore((s) => s.centerAz);
  const fov = useViewStore((s) => s.fovDeg);
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-overlay px-3 py-1 font-mono text-[11px] text-muted"
      data-testid="view-info"
    >
      {formatView(alt, az, fov)}
    </div>
  );
}

/**
 * 하늘 뷰(T1): Three.js 씬 + HTML 라벨 오버레이 + 시간 바 + 레이어 패널 + 선택 툴팁.
 * React 상태와 렌더 루프는 분리: 씬은 스토어를 getState()로 읽고, 스토어 변경은 invalidate()만 호출한다.
 * 해시 쿼리(`#/sky?t=ISO&alt=&az=&fov=`)로 시각·시점을 고정할 수 있다(테스트·공유).
 */
export function SkyView() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SkyScene | null>(null);
  const [ready, setReady] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const simulator = useSensorStore((s) => s.simulator);
  const arActive = useSensorStore((s) => s.arActive);
  const [info, setInfo] = useState<ObjectInfo | null>(null);
  const theme = useSettingsStore((s) => s.theme);
  const lang = useSettingsStore((s) => s.lang);
  const showViewInfo = useLayerStore((s) => s.showViewInfo);
  const selectedId = useSelectionStore((s) => s.selectedId);

  // 씬 생성/파괴
  useEffect(() => {
    const canvas = canvasRef.current;
    const labels = labelsRef.current;
    if (!canvas || !labels) return;
    let lastStoreSync = 0;
    const scene = new SkyScene({
      canvas,
      labelContainer: labels,
      getTime: () => useClockStore.getState().now(),
      getObserver: () => useLocationStore.getState().site,
      getLayers: () => useLayerStore.getState(),
      getLang: () => {
        const l = useLayerStore.getState().labelLang;
        return l === 'auto' ? useSettingsStore.getState().lang : l;
      },
      isTimeRunning: () => {
        const c = useClockStore.getState();
        return c.mode === 'realtime' || c.rate !== 0;
      },
      onViewChange: (v) => {
        const now = performance.now();
        if (now - lastStoreSync > 100) {
          lastStoreSync = now;
          const vs = useViewStore.getState();
          vs.setCenter(v.altDeg, v.azDeg);
          vs.setFov(v.fovDeg);
        }
      },
      onSelect: (id) => {
        useSelectionStore.getState().select(id);
      },
      preserveDrawingBuffer: hashQuery().get('preserve') === '1',
    });
    sceneRef.current = scene;
    registerSkyScene(scene);
    sensorManager.attachCamera(scene.controller);
    scene.controller.onDragStart = () => {
      // 센서 모드에서 수동 드래그 → 5초 일시 정지(보정 미세 조정 중에는 dragHandler가 처리)
      if (useSensorStore.getState().arActive && !scene.controller.dragHandler)
        sensorManager.pauseForManual();
    };

    // 시점·시각: 해시 쿼리(#/sky?t=&alt=&az=&fov=&rate=) > viewStore. 해시가 바뀌면 다시 적용(공유 링크·테스트).
    const applyHash = () => {
      const q = hashQuery();
      const vs = useViewStore.getState();
      const alt = Number(q.get('alt') ?? vs.centerAlt);
      const az = Number(q.get('az') ?? vs.centerAz);
      const fov = Number(q.get('fov') ?? vs.fovDeg);
      scene.controller.setView({ altDeg: alt, azDeg: az, fovDeg: fov }, false);
      vs.setCenter(alt, az);
      vs.setFov(fov);
      const tParam = q.get('t');
      if (tParam) {
        const d = new Date(tParam);
        if (!Number.isNaN(d.getTime()))
          useClockStore.getState().setManual(d, Number(q.get('rate') ?? 0));
      }
      scene.invalidate();
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);

    scene.resize();
    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(canvas);
    scene.start();
    void scene.init().then(() => {
      setReady(true);
      const sel = hashQuery().get('select');
      if (sel) {
        scene.select(sel as ObjectId);
        scene.flyToObject(sel as ObjectId);
      }
    });

    const onVis = () => {
      if (document.visibilityState === 'visible') scene.start();
      else scene.stop();
    };
    document.addEventListener('visibilitychange', onVis);

    // 스토어 변경 → invalidate
    const unsubs = [
      useLayerStore.subscribe(() => scene.invalidate()),
      useLocationStore.subscribe(() => scene.invalidate()),
      useClockStore.subscribe(() => scene.invalidate()),
    ];

    return () => {
      window.removeEventListener('hashchange', applyHash);
      document.removeEventListener('visibilitychange', onVis);
      for (const u of unsubs) u();
      ro.disconnect();
      sensorManager.stop();
      sensorManager.attachCamera(null);
      registerSkyScene(null);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 테마 변경 → 팔레트 재적용
  useEffect(() => {
    sceneRef.current?.setPalette();
  }, [theme]);
  useEffect(() => {
    sceneRef.current?.invalidate();
  }, [lang]);

  // 선택 정보 갱신(1초마다 alt/az 갱신). 선택이 없으면 표시하지 않는다(파생).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !selectedId) return;
    const refresh = () => setInfo(scene.describe(selectedId));
    const first = window.setTimeout(refresh, 0);
    const id = window.setInterval(refresh, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [selectedId, ready, lang]);
  const shownInfo = selectedId && info && info.id === selectedId ? info : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg" data-testid="sky-view">
      <canvas ref={canvasRef} className="block h-full w-full" data-testid="sky-canvas" />
      <div
        ref={labelsRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        data-testid="sky-labels"
      />

      {!ready && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted"
          data-testid="sky-loading"
        >
          {t('common.loading')}
        </div>
      )}

      {showViewInfo && <ViewInfo />}

      <button
        type="button"
        aria-label={t('sky.layers')}
        onClick={() => setLayersOpen((o) => !o)}
        data-testid="open-layers"
        className="absolute left-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-overlay text-fg"
      >
        <IconLayers size={20} />
      </button>

      <ArToggle onOpenWizard={() => setWizardOpen(true)} />
      {simulator && arActive && <SensorSimPanel />}
      {wizardOpen && <CalibrationWizard onClose={() => setWizardOpen(false)} />}

      {layersOpen && <LayerPanel onClose={() => setLayersOpen(false)} />}

      {shownInfo && (
        <SelectionTooltip
          info={shownInfo}
          onClose={() => sceneRef.current?.select(null)}
          onCenter={() => sceneRef.current?.flyToObject(shownInfo.id)}
        />
      )}

      <TimeBar />
    </div>
  );
}
