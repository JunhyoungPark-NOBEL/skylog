import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vector3 } from 'three';
import {
  pointingCameraQuaternion,
  type pointingDelta,
  type equatorialDelta,
} from '@/astro/pointing';
import type { ObjectId } from '@/catalog/objectId';
import { displayName } from '@/catalog/catalog';
import { getSkyScene } from '@/features/sky/skyApi';
import { insideScreen, placeEdgeArrow } from '@/render/edgeArrow';
import { useTelescopeOrientation, stopTelescopeOrientation } from '@/sensors/telescopeOrientation';
import { useSettingsStore } from '@/state/settingsStore';
import { useTelescopeStore, type SavedAlignment } from '@/state/telescopeStore';
import type { guideTarget } from './skyData';
import { FovOverlay } from './FovOverlay';

/** 메인 하늘 하나를 그대로 사용한다. 휴대폰 후면 대신 경통과 평행한 물리 +Y축을 추적한다. */
export function TelescopeSkyGuide({
  targetId,
  target,
  accepted,
  approximate,
  alignment,
  inside,
  delta,
  eq,
  mount,
  onAccept,
  onStart,
  onAlign,
  onClose,
  onEquipment,
  onChange,
  onChart,
}: {
  targetId: ObjectId;
  target: NonNullable<ReturnType<typeof guideTarget>>;
  accepted: boolean;
  approximate: boolean;
  alignment: SavedAlignment | null;
  inside: boolean;
  delta: ReturnType<typeof pointingDelta> | null;
  eq: ReturnType<typeof equatorialDelta> | null;
  mount: 'altaz' | 'eq' | 'goto';
  onAccept(): void;
  onStart(): void;
  onAlign(): void;
  onClose(): void;
  onEquipment(): void;
  onChange(): void;
  onChart(): void;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const reading = useTelescopeOrientation();
  const [paused, setPaused] = useState(false);
  const [more, setMore] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [marker, setMarker] = useState<{
    x: number;
    y: number;
    angle: number;
    visible: boolean;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const moving = accepted && !paused && reading.status === 'active' && (approximate || !!alignment);
  const scene = getSkyScene();
  const name = scene?.catalog ? displayName(scene.catalog, targetId, lang) : targetId;
  useEffect(() => {
    const sc = getSkyScene();
    if (!sc) return;
    const p = useTelescopeStore.getState().profile;
    sc.select(null);
    // 첫 화면은 목표 주변 예시다. 센서 입력이 오면 실제 경통 방향으로 바뀐다.
    sc.flyToObject(
      targetId,
      Math.max(8, (p.mode === 'binoculars' ? p.binocularFov : p.finderFov) * 2.4),
    );
    const previous = sc.controller.onDragStart;
    sc.controller.onDragStart = () => {
      sc.controller.setSensorQuaternion(null);
      setPaused(true);
    };
    return () => {
      sc.controller.onDragStart = previous;
      sc.controller.setSensorQuaternion(null);
    };
  }, [targetId]);
  useEffect(() => {
    const sc = getSkyScene();
    if (!sc) return;
    sc.controller.setSensorQuaternion(
      moving && reading.q ? pointingCameraQuaternion(reading.q, alignment?.model) : null,
    );
    sc.invalidate();
  }, [moving, reading.q, alignment]);
  useEffect(() => {
    const tick = () => {
      const sc = getSkyScene(),
        el = root.current;
      if (!sc || !el) return;
      const dir = sc.objectDirection(targetId);
      if (!dir) return;
      const { width: w, height: h } = el.getBoundingClientRect();
      const px = sc.project(targetId);
      const visible = insideScreen(px, w, h, 28);
      if (visible && px) setMarker({ x: px.x, y: px.y, angle: 0, visible });
      else {
        const local = new Vector3(...dir).applyQuaternion(
          sc.controller.camera.quaternion.clone().invert(),
        );
        const edge = placeEdgeArrow(local, w, h, 44);
        setMarker({
          x: edge.x,
          y: Math.max(150, Math.min(h - 200, edge.y)),
          angle: edge.angleDeg,
          visible: false,
        });
      }
    };
    const timer = window.setInterval(tick, 60);
    return () => window.clearInterval(timer);
  }, [targetId]);
  const horizontal = mount === 'eq' ? (eq?.haDeg ?? 0) : (delta?.azDeg ?? 0);
  const vertical = mount === 'eq' ? (eq?.decDeg ?? 0) : (delta?.altDeg ?? 0);
  return (
    <div
      ref={root}
      className="pointer-events-none absolute inset-0"
      data-testid="telescope-sky-guide"
    >
      <FovOverlay guide />
      {marker && (
        <div
          data-testid="scope-target-marker"
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-accent"
          style={{ left: marker.x, top: marker.y }}
        >
          {marker.visible ? (
            <span className="h-9 w-9 rounded-full border-2 border-current" />
          ) : (
            <svg
              width="34"
              height="34"
              viewBox="0 0 34 34"
              style={{ transform: `rotate(${marker.angle}deg)` }}
              aria-hidden
            >
              <path d="M31 17L5 4L11 17L5 30Z" fill="currentColor" />
            </svg>
          )}
        </div>
      )}
      <div
        className="pointer-events-auto absolute inset-x-3 top-[calc(var(--sky-controls-bottom,64px)+8px)] mx-auto flex max-w-md items-center gap-2 rounded-2xl glass-hud px-3 py-1"
        data-testid="scope-target"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-caption text-muted" data-testid="scope-status">
            {t(
              !accepted || !moving
                ? 'scopeSky.preview'
                : approximate
                  ? 'guideAuto.estimate'
                  : 'guideAuto.precise',
            )}
          </p>
        </div>
        <button
          className="min-h-11 min-w-11 rounded-pill"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          aria-label={t('guideFlow.settings')}
          data-testid="scope-options"
        >
          ⋯
        </button>
        <button
          className="min-h-11 min-w-11 rounded-pill"
          onClick={onClose}
          aria-label={t('scopeSky.close')}
          data-testid="scope-close"
        >
          ✕
        </button>
      </div>
      <div className="pointer-events-auto absolute inset-x-3 bottom-sky mx-auto max-w-md space-y-2">
        {more && (
          <div className="max-h-[35dvh] space-y-2 overflow-y-auto rounded-2xl glass-strong p-3">
            <p className="text-caption leading-6 text-muted">{t('scopeSky.phoneTop')}</p>
            <div className="grid grid-cols-2 gap-2">
              {' '}
              <button
                className="min-h-12 rounded-pill glass-hud px-4 text-body-sm"
                onClick={onAlign}
                data-testid="direction-align"
              >
                {t('field.align')}
              </button>
              <button className="min-h-11 rounded-xl bg-surface-2 px-2" onClick={onEquipment}>
                {t('guide.edit')}
              </button>
              <button className="min-h-11 rounded-xl bg-surface-2 px-2" onClick={onChange}>
                {t('guide.changeTarget')}
              </button>
              <button
                className="col-span-2 min-h-11 rounded-xl bg-surface-2 px-2"
                onClick={onChart}
                data-testid="scope-chart"
              >
                {t('scopeSky.chart')}
              </button>
            </div>
            <p className="text-caption text-muted">{t('scopeSky.rings')}</p>
            {mount === 'goto' && (
              <>
                <p className="text-body-sm tabular-nums">
                  JNow · RA {(target.raDeg / 15).toFixed(4)}h · Dec {target.decDeg.toFixed(3)}°
                </p>
                <button
                  className="min-h-11 w-full rounded-xl bg-surface-2 px-2"
                  onClick={() => {
                    setCopyError(null);
                    if (!navigator.clipboard) {
                      setCopyError(t('guide.copyUnavailable'));
                      return;
                    }
                    void navigator.clipboard
                      .writeText(
                        `JNow RA ${(target.raDeg / 15).toFixed(5)}h Dec ${target.decDeg.toFixed(4)}° Alt ${target.altDeg.toFixed(2)}° Az ${target.azDeg.toFixed(2)}°`,
                      )
                      .catch(() => setCopyError(t('guide.error')));
                  }}
                >
                  {t('guide.copyCoordinates')}
                </button>
                {copyError && (
                  <p role="alert" className="text-caption text-danger">
                    {copyError}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {!accepted ? (
          <section className="rounded-2xl glass-strong p-4" data-testid="guide-intro">
            <h2 className="font-semibold">{t('scopeSky.title')}</h2>
            <p className="my-2 text-body-sm leading-6 text-muted">{t('scopeSky.phoneTop')}</p>
            <p className="text-caption leading-5 text-danger">{t('guide.safety')}</p>
            <button
              className="mt-3 min-h-12 w-full rounded-pill bg-accent font-semibold text-accent-fg"
              onClick={onAccept}
              data-testid="guide-accept"
            >
              {t('guideAuto.start')}
            </button>
          </section>
        ) : (
          <>
            {target.altDeg <= 0 && (
              <p className="rounded-2xl glass-hud px-3 py-2 text-caption">{t('guide.below')}</p>
            )}
            {moving && delta && target.altDeg > 0 && (
              <div className="rounded-2xl glass-hud px-4 py-2" data-testid="scope-directions">
                {inside ? (
                  <p className="text-center font-semibold text-accent">
                    {t(approximate ? 'guideAuto.near' : 'guideFlow.near')}
                  </p>
                ) : (
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-body-sm tabular-nums">
                    <span data-testid="direction-horizontal">
                      {delta.nearZenith
                        ? t('guide.zenith')
                        : t(
                            mount === 'eq'
                              ? horizontal >= 0
                                ? 'guideFlow.west'
                                : 'guideFlow.east'
                              : horizontal >= 0
                                ? 'guideFlow.right'
                                : 'guideFlow.left',
                            { value: (Math.abs(horizontal) * (mount === 'eq' ? 4 : 1)).toFixed(1) },
                          )}
                    </span>
                    <span data-testid="direction-vertical">
                      {t(vertical >= 0 ? 'guideFlow.up' : 'guideFlow.down', {
                        value: Math.abs(vertical).toFixed(1),
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
            {more && !moving && reading.status !== 'off' && !paused && (
              <p role="status" className="rounded-xl glass-hud px-3 py-2 text-caption">
                {t(
                  reading.status === 'denied' || reading.status === 'unavailable'
                    ? 'guideAuto.missingSensor'
                    : reading.status === 'waiting'
                      ? 'guide.waiting'
                      : 'guideAuto.compassHelp',
                )}
              </p>
            )}
            <div className="flex justify-center gap-2">
              <button
                className="min-h-12 rounded-pill glass-hud px-4 text-body-sm aria-pressed:text-accent"
                data-testid="guide-sensor"
                aria-pressed={moving}
                aria-label={t(moving ? 'sensorAuto.turnOff' : 'sensor.ar')}
                onClick={() => {
                  if (moving) stopTelescopeOrientation();
                  else {
                    setPaused(false);
                    if (reading.status !== 'active') onStart();
                  }
                }}
              >
                GPS
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
