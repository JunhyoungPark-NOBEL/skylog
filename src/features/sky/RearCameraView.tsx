import { useId, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/state/settingsStore';
import { useViewStore } from '@/state/viewStore';
import type { RearCamera } from './useRearCamera';

export function RearCameraView({
  camera,
  videoRef,
}: {
  camera: RearCamera;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const night = useSettingsStore((s) => s.theme === 'night');
  const fov = useViewStore((s) => s.fovDeg);
  const filterId = useId().replaceAll(':', '');
  // 확대할 때 영상도 함께 크롭한다. 기기별 실제 렌즈 화각은 조절 UI로 맞춘다.
  const scale = Math.max(
    0.05,
    Math.tan((camera.fov * Math.PI) / 720) / Math.tan((Math.min(fov, 179) * Math.PI) / 720),
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg width="0" height="0">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values=".3 .59 .11 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        data-testid="rear-camera-video"
        className="h-full w-full object-cover"
        style={{
          opacity: camera.status === 'on' ? camera.opacity : 0,
          transform: `scale(${scale})`,
          filter: night ? `url(#${filterId})` : undefined,
        }}
      />
    </div>
  );
}

export function RearCameraControls({ camera, onStart }: { camera: RearCamera; onStart(): void }) {
  const { t } = useTranslation();
  const active = camera.status !== 'off';
  const label = t(
    camera.status === 'starting'
      ? 'field.camera.cancel'
      : camera.status === 'on'
        ? 'field.camera.off'
        : 'field.camera.on',
  );
  return (
    <div className="pointer-events-auto" data-testid="camera-controls">
      <button
        type="button"
        className="flex min-h-11 items-center gap-2 rounded-pill glass-hud px-3 text-caption font-semibold"
        data-testid="camera-toggle"
        aria-label={label}
        aria-pressed={camera.status === 'on'}
        onClick={() => (active ? camera.stop() : onStart())}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M3 7h4l2-3h6l2 3h4v13H3z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        <span className="whitespace-normal text-left">{label}</span>
      </button>
    </div>
  );
}

export function RearCameraSettings({ camera }: { camera: RearCamera }) {
  const { t } = useTranslation();
  if (camera.status !== 'on' && !camera.error) return null;
  return (
    <div className="pointer-events-auto rounded-2xl glass-strong p-3 text-caption">
      {camera.error && (
        <p role="status" data-testid="camera-error">
          {t(`field.camera.error.${camera.error}`)}
        </p>
      )}
      {camera.status === 'on' && (
        <details data-testid="camera-settings">
          <summary className="cursor-pointer py-2 font-medium">
            {t('field.camera.settings')}
          </summary>
          <label className="mt-2 block">
            {t('field.camera.opacity')} · {Math.round(camera.opacity * 100)}%
            <input
              className="block h-11 w-full"
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={camera.opacity}
              onChange={(e) => camera.setOpacity(Number(e.target.value))}
            />
          </label>
          <label className="block">
            {t('field.camera.fov')} · {camera.fov}°
            <input
              className="block h-11 w-full"
              type="range"
              min="35"
              max="100"
              step="1"
              value={camera.fov}
              onChange={(e) => camera.setFov(Number(e.target.value))}
            />
          </label>
          <p className="text-muted">{t('field.camera.hint')}</p>
        </details>
      )}
    </div>
  );
}
