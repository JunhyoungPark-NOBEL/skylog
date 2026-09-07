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
 */
export function TargetGuide() {
  const { t } = useTranslation();
  const targetId = useSelectionStore((s) => s.targetId);
  const lang = useSettingsStore((s) => s.lang);
  const sound = useSensorStore((s) => s.sound);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<GuideState | null>(null);
  const armed = useRef(true);
  const riseRef = useRef<{ id: ObjectId; at: Date | null } | null>(null);

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
          <span
            className="rounded-full bg-overlay px-2 py-0.5 font-mono text-[11px]"
            style={{ color }}
          >
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
            className="h-14 w-14 rounded-full border-2"
            style={{
              borderColor: color,
              boxShadow: state.centered ? `0 0 12px ${color}` : undefined,
            }}
          />
          <span
            className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-overlay px-2 py-0.5 font-mono text-[11px]"
            style={{ color }}
          >
            {state.centered
              ? t('target.centered')
              : t('target.remaining', { deg: state.sepDeg.toFixed(1) })}
          </span>
        </div>
      )}
      <div
        className="pointer-events-auto absolute left-1/2 top-14 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-overlay px-3 py-1 text-xs backdrop-blur-sm"
        data-testid="target-pill"
      >
        <span style={{ color }}>◎</span>
        <span className="max-w-40 truncate font-semibold">{state?.name ?? targetId}</span>
        {state && state.altDeg <= 0 && (
          <span className="text-muted" data-testid="target-below">
            {t('target.below')}
            {state.riseAt
              ? ` · ${t('target.risesAt', { time: formatTime(state.riseAt) })} (${formatRelative(useClockStore.getState().now().getTime(), state.riseAt.getTime(), lang)})`
              : state.riseAt === null
                ? ` · ${t('target.noRise')}`
                : ''}
          </span>
        )}
        {state && state.altDeg <= 0 && state.riseAt && (
          <button
            type="button"
            className="min-h-7 rounded-full bg-surface-2 px-2"
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
          className="min-h-7 rounded-full bg-surface-2 px-2"
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
