import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { hashQuery, useHash } from '@/app/router';
import type { ObjectId } from '@/catalog/objectId';
import { ArToggle } from '@/features/sky/ArToggle';
import { useRearCamera } from './useRearCamera';
import { RearCameraView, RearCameraControls } from './RearCameraView';
import { CalibrationWizard } from '@/features/sky/CalibrationWizard';
import { SensorSimPanel } from '@/features/sky/SensorSimPanel';
import { useRealSkySync } from '@/features/sky/useRealSkySync';
import { sensorManager } from '@/sensors/orientation/manager';
import {
  mountSkyOrientation,
  setSkyOrientationAutomaticAllowed,
} from '@/sensors/orientation/autoStart';
import { useSensorStore } from '@/state/sensorStore';
import { SelectionTooltip } from '@/features/sky/SelectionTooltip';
import { TargetGuide } from '@/features/sky/TargetGuide';
import { openObject } from '@/features/object/objectApi';
import { registerSkyScene } from '@/features/sky/skyApi';
import { TimeBar } from '@/features/sky/TimeBar';
import { SkyScene, type ObjectInfo } from '@/render/SkyScene';
import { useClockStore } from '@/state/clockStore';
import { showsBelowHorizon, useLayerStore } from '@/state/layerStore';
import { effectiveGroundOpacity } from '@/render/landscape';
import { FovOverlay } from '@/features/telescope/FovOverlay';
import { useLocationStore } from '@/state/locationStore';
import { useLogStore, type LogState } from '@/state/logStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useViewStore } from '@/state/viewStore';
import { IconSettings } from '@/ui/icons';

import { HOP_COURSES } from '@/learn/hopCourses';
import { openTelescope } from '@/features/telescope/navigation';
import { SkySettings } from './SkySettings';
const TelescopeMode = lazy(() => import('@/features/telescope/TelescopeMode'));

function formatView(alt: number, az: number, fov: number): string {
  return `${alt >= 0 ? '+' : ''}${alt.toFixed(1)}° / ${az.toFixed(1)}° · FOV ${fov.toFixed(0)}°`;
}

/**
 * 화면 중심 alt/az·FOV 텍스트 — viewStore(≤10Hz 갱신)만 구독해 하늘 뷰 전체 리렌더를 막는다.
 * 상태 캡슐 아래 HUD 줄(레이어 버튼·AR 버튼 사이) 가운데. 찾아가기 pill이 같은 자리를 쓰므로 목표가 있으면 한 줄 아래로.
 */
function BelowHorizonHint() {
  const { t } = useTranslation();
  const altitude = useViewStore((s) => s.centerAlt);
  const opacity = useLayerStore((s) => s.groundOpacity);
  const landscape = useLayerStore((s) => s.landscape);
  const show = showsBelowHorizon({
    groundOpacity: effectiveGroundOpacity(opacity, landscape, altitude),
  });
  if (altitude >= 0 || !show) return null;
  return (
    <p
      data-testid="below-horizon-hint"
      className="self-center rounded-pill glass-sm px-3 py-2 text-center text-caption text-muted"
    >
      {t('sky.belowHorizonHint')}
    </p>
  );
}

function ViewInfo() {
  const { t } = useTranslation();
  const alt = useViewStore((s) => s.centerAlt);
  const az = useViewStore((s) => s.centerAz);
  const fov = useViewStore((s) => s.fovDeg);
  const hasTarget = useSelectionStore((s) => Boolean(s.targetId));
  const selected = useSelectionStore((s) => Boolean(s.selectedId));
  if (!selected && !hasTarget && fov < 180) return null;
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[calc(var(--sky-controls-bottom,64px)+8px)] z-10 flex h-7 -translate-x-1/2 items-center whitespace-nowrap rounded-pill glass-hud px-2 text-caption text-fg tabular-nums"
      style={hasTarget ? { top: 'calc(var(--sky-target-bottom) + 8px)' } : undefined}
      data-testid="view-info"
    >
      {fov >= 180 ? `${t('sky.circularView')} · 180°` : formatView(alt, az, fov)}
    </div>
  );
}

/**
 * 하늘 뷰(T1): Three.js 씬 + HTML 라벨 오버레이 + 시간 바 + 레이어 패널 + 선택 툴팁.
 * React 상태와 렌더 루프는 분리: 씬은 스토어를 getState()로 읽고, 스토어 변경은 invalidate()만 호출한다.
 * 해시 쿼리(`#/sky?t=ISO&alt=&az=&fov=`)로 시각·시점을 고정할 수 있다(테스트·공유).
 *
 * 레이아웃(D-021): 뷰는 뷰포트를 가득 채우고 크롬은 그 위에 떠 있다 — 위 HUD 줄은 상태 캡슐 아래
 * (`--status-height` + safe-area + 12px), 아래 컨트롤 스택(툴팁 → 실제 하늘 토글 → 시간 바)은 탭 pill 위(`bottom-sky`).
 */
export function SkyView() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SkyScene | null>(null);
  const rearVideoRef = useRef<HTMLVideoElement>(null);
  const rearCamera = useRearCamera(rearVideoRef);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hash = useHash();
  const scope = hashQuery(hash).get('scope');
  const hopPreview = HOP_COURSES.find((c) => c.id === hashQuery(hash).get('coursePreview'));
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const simulator = useSensorStore((s) => s.simulator);
  const arActive = useSensorStore((s) => s.arActive);
  const [info, setInfo] = useState<ObjectInfo | null>(null);
  const theme = useSettingsStore((s) => s.theme);
  const lang = useSettingsStore((s) => s.lang);
  const showViewInfo = useLayerStore((s) => s.showViewInfo);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const targetId = useSelectionStore((s) => s.targetId);
  const sheetOpen = useSelectionStore((s) => s.sheetOpen);
  // 표시 옵션 패널을 닫아도 실제 하늘의 한계등급은 시간·관측지를 계속 따라간다.
  useRealSkySync();

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
        // 10Hz로 제한하되, 애니메이션(flyTo·관성)이 끝나는 마지막 값은 반드시 반영한다
        if (now - lastStoreSync > 100 || !scene.controller.isAnimating()) {
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
      // 실제 한 손가락 드래그에서만 수동 탐색으로 전환한다. 자동 복귀는 없다.
      if (useSensorStore.getState().arActive && !scene.controller.dragHandler)
        sensorManager.pauseForManual();
    };
    const isFixedChart = () =>
      ['alt', 'az', 'fov', 'select', 't', 'scope', 'coursePreview'].some((key) =>
        hashQuery().has(key),
      );
    const stopAutoOrientation = mountSkyOrientation(!isFixedChart());

    // 시점·시각: 해시 쿼리(#/sky?t=&alt=&az=&fov=&rate=) > viewStore. 해시가 바뀌면 다시 적용(공유 링크·테스트).
    const applyHash = () => {
      const q = hashQuery();
      setSkyOrientationAutomaticAllowed(!isFixedChart());
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
    // ★/☆ 마커: logStore(본 것·시도·예정 집합)를 씬에 밀어 넣는다 — 마운트 시와 스토어 변경 시.
    // 카탈로그가 늦게 오면 씬(init)이 보관한 집합을 스스로 다시 해석한다.
    const syncMarkers = (s: LogState = useLogStore.getState()) => {
      scene.setMarkers({
        observed: s.observedSet,
        attempted: s.attemptedSet,
        bookmarked: s.bookmarkedSet,
      });
      scene.invalidate();
    };
    syncMarkers();
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
      useLogStore.subscribe((s) => syncMarkers(s)),
    ];

    return () => {
      window.removeEventListener('hashchange', applyHash);
      document.removeEventListener('visibilitychange', onVis);
      for (const u of unsubs) u();
      ro.disconnect();
      stopAutoOrientation();
      sensorManager.attachCamera(null);
      registerSkyScene(null);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    const sky = toolbar?.parentElement;
    if (!toolbar || !sky) return;
    const measure = () =>
      sky.style.setProperty(
        '--sky-controls-bottom',
        `${toolbar.getBoundingClientRect().bottom - sky.getBoundingClientRect().top}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  // 테마 변경 → 팔레트 재적용
  useEffect(() => {
    sceneRef.current?.setPalette();
  }, [theme]);
  useEffect(() => {
    sceneRef.current?.invalidate();
  }, [lang]);
  useEffect(() => {
    sceneRef.current?.setCameraOverlay(rearCamera.status === 'on');
  }, [rearCamera.status]);

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
  const shownInfo =
    !scope && selectedId && selectedId !== targetId && !sheetOpen && info && info.id === selectedId
      ? info
      : null;

  const overview = () => {
    if (scope) window.location.hash = '#/sky?alt=89.9&az=0&fov=220';
    setSkyOrientationAutomaticAllowed(false);
    sceneRef.current?.controller.flyTo({ altDeg: 89.9, azDeg: 0, fovDeg: 220 });
    sceneRef.current?.invalidate();
    setSettingsOpen(false);
  };
  const startCamera = () => {
    sceneRef.current?.controller.setView({ fovDeg: rearCamera.fov });
    void rearCamera.start();
  };
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-bg"
      data-testid="sky-view"
      style={{ '--tab-height': '0px', '--tab-inset': '8px' } as CSSProperties}
    >
      <RearCameraView camera={rearCamera} videoRef={rearVideoRef} />
      <canvas ref={canvasRef} className="relative block h-full w-full" data-testid="sky-canvas" />
      <div
        ref={labelsRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        data-testid="sky-labels"
      />

      {!ready && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-body-sm text-muted"
          data-testid="sky-loading"
        >
          {t('common.loading')}
        </div>
      )}

      {showViewInfo && <ViewInfo />}

      <div
        ref={toolbarRef}
        data-testid="sky-toolbar"
        className={`pointer-events-none absolute inset-x-[12px] top-[calc(env(safe-area-inset-top)+8px)] z-20 flex items-start justify-between gap-2 ${sheetOpen ? 'invisible' : ''}`}
      >
        <button
          type="button"
          aria-label={t('common.settings')}
          aria-expanded={settingsOpen}
          onClick={() => {
            setSettingsOpen(true);
          }}
          data-testid="open-settings"
          className="pointer-events-auto flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill glass-hud"
        >
          <IconSettings size={20} />
        </button>
        <div className="pointer-events-auto">
          <TimeBar readOnly={!!scope && !simulator} />
        </div>
      </div>
      {settingsOpen && (
        <SkySettings
          camera={rearCamera}
          onClose={() => setSettingsOpen(false)}
          onAlign={() => {
            setSettingsOpen(false);
            setWizardOpen(true);
          }}
          onOverview={overview}
        />
      )}
      {!scope && <FovOverlay />}
      {scope && ready && (
        <Suspense fallback={null}>
          <TelescopeMode embedded key={scope + ':' + hashQuery(hash).get('view')} />
        </Suspense>
      )}

      {simulator && arActive && <SensorSimPanel />}
      {wizardOpen && <CalibrationWizard onClose={() => setWizardOpen(false)} />}

      {!scope && <TargetGuide />}
      {!sheetOpen && !scope && (
        <div className="absolute right-[12px] bottom-sky z-20">
          <RearCameraControls compact camera={rearCamera} onStart={startCamera} />
        </div>
      )}

      {/* 평소에는 작은 시간 컨트롤만 보이고, 천체를 선택했을 때 정보를 더한다. */}
      {/* 시트가 열려 있으면 독을 숨긴다(유리 위 유리·불필요한 블러 방지). */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-sky z-10 flex justify-center px-3 ${sheetOpen ? 'invisible' : ''}`}
      >
        <div className="flex w-full max-w-md flex-col gap-2">
          <BelowHorizonHint />
          {hopPreview && (
            <button
              className="pointer-events-auto min-h-12 rounded-pill glass-hud px-4 text-body-sm text-accent"
              data-testid="hop-return"
              onClick={() => openTelescope(hopPreview.target, 'hop', hopPreview.id)}
            >
              {t('hopCourses.back')} →
            </button>
          )}
          {shownInfo && (
            <SelectionTooltip
              info={shownInfo}
              onClose={() => sceneRef.current?.select(null)}
              onCenter={() => sceneRef.current?.flyToObject(shownInfo.id)}
              onDetails={() => openObject(shownInfo.id, 'half')}
            />
          )}
          {!scope && <ArToggle />}
        </div>
      </div>
    </div>
  );
}
