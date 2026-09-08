import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { bodyKeyFromObjectId } from '@/astro/bodies';
import { altAzToScene, angularSeparation, sceneToAltAz } from '@/astro/coords';
import { riseTransitSetBody, riseTransitSetFixed } from '@/astro/events';
import { displayName, type Catalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { getSkyScene } from '@/features/sky/skyApi';
import { insideScreen, placeEdgeArrow } from '@/render/edgeArrow';
import { feedbackOk } from '@/sensors/feedback';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useSensorStore } from '@/state/sensorStore';
import { useSettingsStore } from '@/state/settingsStore';
import { formatRelative, formatTime } from '@/ui/format';

const TICK_MS = 80;
export const CENTER_DEG = 3;
const REARM_DEG = 5;
const EDGE_MARGIN = 30;

/** 화살표·링 옆 각거리 라벨 — 매 틱 움직이므로 블러 없이 반투명 표면(유리 금지) */
const HUD_LABEL =
  'whitespace-nowrap rounded-pill bg-surface/85 px-2 py-0.5 text-label tabular-nums';

interface GuideState {
  onScreen: boolean;
  x: number;
  y: number;
  angleDeg: number;
  sepDeg: number;
  altDeg: number;
  centered: boolean;
  name: string;
  /** 지평선 아래일 때 다음 뜨는 시각 */
  riseAt: Date | null | undefined;
}

/**
 * 찾아가기 오버레이(task-03 §3.3): 목표가 화면 밖이면 가장자리 화살표 + 남은 각거리, 안에 있으면 링 마커,
 * 중앙 3° 안이면 색 변화 + 피드백(한 번, 5° 밖으로 나가면 재무장). 지평선 아래면 뜨는 시각과 시간 이동 버튼.
 * 목표 pill은 AR 안내까지 포함한 HUD 줄 아래에 놓고, 실제 아래 끝을 ViewInfo와 공유한다.
 */
export function TargetGuide() {
  const { t } = useTranslation();
  const targetId = useSelectionStore((s) => s.targetId);
  const lang = useSettingsStore((s) => s.lang);
  const sound = useSensorStore((s) => s.sound);
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<GuideState | null>(null);
  const armed = useRef(true);
  const riseRef = useRef<{ id: ObjectId; at: Date | null } | null>(null);

  useEffect(() => {
    if (!targetId) return;
    const container = containerRef.current;
    const pill = pillRef.current;
    const sky = container?.parentElement;
    const controls = sky?.querySelector<HTMLElement>('[data-testid="ar-toggle-wrap"]');
    if (!container || !pill || !sky || !controls) return;

    // 권한 안내·센서 상태와 글자 확대에 따라 AR 묶음 높이가 달라진다.
    // 렌더 틱에서 재지 않고 크기가 바뀔 때만 실제 경계를 공유한다.
    const measure = () => {
      const top = sky.getBoundingClientRect().top;
      sky.style.setProperty(
        '--sky-controls-bottom',
        `${controls.getBoundingClientRect().bottom - top}px`,
      );
      sky.style.setProperty(
        '--sky-target-bottom',
        `${pill.getBoundingClientRect().bottom - top}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(controls);
    observer.observe(pill);
    observer.observe(sky);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      sky.style.removeProperty('--sky-controls-bottom');
      sky.style.removeProperty('--sky-target-bottom');
    };
  }, [targetId]);

  useEffect(() => {
    if (!targetId) return;
    let alive = true;
    const scene = getSkyScene();
    const cat: Catalog | null = scene?.catalog ?? null;
    const label = cat ? displayName(cat, targetId, lang) : targetId;
    const invQ = new THREE.Quaternion();
    const v = new THREE.Vector3();
    armed.current = true;

    const tick = () => {
      if (!alive) return;
      const sc = getSkyScene();
      const el = containerRef.current;
      if (!sc || !el) {
        setState(null);
        return;
      }
      const dir = sc.objectDirection(targetId);
      if (!dir) {
        setState(null);
        return;
      }
      const W = el.clientWidth;
      const H = el.clientHeight;
      const view = sc.controller.getView();
      const center = altAzToScene(view.altDeg, view.azDeg);
      const sepDeg = angularSeparation(dir, center);
      const { altDeg } = sceneToAltAz(dir);
      const px = sc.project(targetId);
      const onScreen = insideScreen(px, W, H, 8);
      let x: number;
      let y: number;
      let angleDeg = 0;
      if (onScreen && px) {
        x = px.x;
        y = px.y;
      } else {
        invQ.copy(sc.controller.camera.quaternion).invert();
        v.set(dir[0], dir[1], dir[2]).applyQuaternion(invQ);
        const p = placeEdgeArrow({ x: v.x, y: v.y, z: v.z }, W, H, EDGE_MARGIN);
        x = p.x;
        y = p.y;
        angleDeg = p.angleDeg;
      }
      const centered = sepDeg <= CENTER_DEG;
      if (centered && armed.current) {
        armed.current = false;
        feedbackOk({ sound });
      } else if (!centered && sepDeg > REARM_DEG) armed.current = true;

      let riseAt: Date | null | undefined;
      if (altDeg <= 0) {
        if (!riseRef.current || riseRef.current.id !== targetId) {
          const now = useClockStore.getState().now();
          const site = useLocationStore.getState().site;
          const bk = bodyKeyFromObjectId(targetId);
          let at: Date | null = null;
          if (bk) at = riseTransitSetBody(bk, site, now, 2).rise;
          else {
            const star = cat?.starById.get(targetId);
            const dso = cat?.dsoById.get(targetId);
            const j = star
              ? { ra: star.ra, dec: star.dec }
              : dso
                ? { ra: dso.ra, dec: dso.dec }
                : (() => {
                    const f = sc.objectJ2000(targetId);
                    return f ? { ra: f.raDeg, dec: f.decDeg } : null;
                  })();
            if (j) at = riseTransitSetFixed(j.ra, j.dec, site, now, undefined, 2).rise;
          }
          riseRef.current = { id: targetId, at };
        }
        riseAt = riseRef.current.at;
      } else riseRef.current = null;

      setState({ onScreen, x, y, angleDeg, sepDeg, altDeg, centered, riseAt, name: label });
    };
    const timer = window.setInterval(tick, TICK_MS);
    const first = window.setTimeout(tick, 0);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, [targetId, lang, sound]);

  if (!targetId) return null;
  const clear = () => useSelectionStore.getState().setTarget(null);
  const color = state?.centered ? 'var(--success)' : 'var(--marker)';

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0"
      data-testid="target-guide"
    >
      {state && !state.onScreen && (
        <div
          className="absolute flex flex-col items-center"
          style={{ left: state.x, top: state.y, transform: 'translate(-50%, -50%)' }}
          data-testid="target-arrow"
          data-angle={state.angleDeg.toFixed(0)}
          data-sep={state.sepDeg.toFixed(1)}
        >
          <svg
            width="34"
            height="34"
            viewBox="-17 -17 34 34"
            style={{ transform: `rotate(${state.angleDeg}deg)`, color }}
            aria-hidden
          >
            <polygon points="14,0 -8,-10 -4,0 -8,10" fill="currentColor" />
          </svg>
          <span className={HUD_LABEL} style={{ color }}>
            {t('target.remaining', { deg: state.sepDeg.toFixed(0) })}
          </span>
        </div>
      )}
      {state && state.onScreen && (
        <div
          className="absolute"
          style={{ left: state.x, top: state.y, transform: 'translate(-50%, -50%)' }}
          data-testid="target-ring"
          data-sep={state.sepDeg.toFixed(1)}
          data-centered={state.centered ? '1' : '0'}
        >
          <div
            className="h-14 w-14 rounded-full border-2 transition-[border-color,box-shadow] duration-150 ease-standard"
            style={{
              borderColor: color,
              boxShadow: state.centered ? `0 0 12px ${color}` : undefined,
            }}
          />
          <span
            className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap ${HUD_LABEL}`}
            style={{ color }}
          >
            {state.centered
              ? t('target.centered')
              : t('target.remaining', { deg: state.sepDeg.toFixed(1) })}
          </span>
        </div>
      )}
      <div
        ref={pillRef}
        className="pointer-events-auto absolute left-1/2 top-[calc(var(--sky-controls-bottom)+8px)] flex min-h-[44px] max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-[8px] rounded-pill glass-hud py-[4px] pl-[12px] pr-[4px] text-[0.75rem] leading-[1rem] text-fg shadow-float"
        data-testid="target-pill"
      >
        <span aria-hidden className="shrink-0" style={{ color }}>
          ◎
        </span>
        <div className="min-w-0">
          <span className="block truncate font-semibold" title={state?.name ?? targetId}>
            {state?.name ?? targetId}
          </span>
          {state && state.altDeg <= 0 && (
            <span className="block truncate text-fg/70" data-testid="target-below">
              {t('target.below')}
              {state.riseAt
                ? ` · ${t('target.risesAt', { time: formatTime(state.riseAt) })} (${formatRelative(useClockStore.getState().now().getTime(), state.riseAt.getTime(), lang)})`
                : state.riseAt === null
                  ? ` · ${t('target.noRise')}`
                  : ''}
            </span>
          )}
        </div>
        {state && state.altDeg <= 0 && state.riseAt && (
          <button
            type="button"
            className="inline-flex min-h-[44px] max-w-[40%] shrink-0 items-center justify-center rounded-pill bg-surface-3 px-[8px] text-center font-medium text-fg transition-transform duration-150 ease-standard active:scale-95"
            onClick={() => {
              const at = state.riseAt;
              if (at) useClockStore.getState().setManual(new Date(at.getTime() + 20 * 60_000), 0);
            }}
            data-testid="target-jump-time"
          >
            {t('target.jumpTime')}
          </button>
        )}
        <button
          type="button"
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill text-fg/80 transition-colors duration-150 active:bg-surface-2"
          onClick={clear}
          aria-label={t('target.clear')}
          data-testid="target-clear"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
