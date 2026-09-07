import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Bortle, Site } from '@/db/types';
import {
  DAEJEON_PRESET,
  ensureDefaultSite,
  listSites,
  softDeleteSite,
  upsertSite,
} from '@/db/repos/sites';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { SkyRangePicker } from '@/features/settings/SkyRangePicker';
import { formatLatLon, parseLatLon } from '@/sensors/coordsParse';
import { requestLocation, type GeoError } from '@/sensors/geolocation';
import { useLocationStore } from '@/state/locationStore';
import { useSensorStore } from '@/state/sensorStore';
import { IconChevron } from '@/ui/icons';

interface Draft {
  id?: string;
  name: string;
  lat: string;
  lon: string;
  elevation: string;
  bortle: string;
  arc?: [number, number];
  minAltDeg: number;
}

const EMPTY: Draft = { name: '', lat: '', lon: '', elevation: '', bortle: '', minAltDeg: 0 };
const BORTLE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** 캡슐 입력창 — 불투명 외곽선 없이 표면 층 + 포커스 시 그림자 링 */
const FIELD =
  'min-h-11 w-full min-w-0 rounded-pill bg-surface-2 px-4 text-body text-fg placeholder:text-muted outline-none transition-[background-color,box-shadow] duration-150 ease-standard focus:bg-surface-3 focus-visible:shadow-[0_0_0_2px_var(--accent-glow)] appearance-none';
/** 주 버튼(캡슐) */
const BTN_PRIMARY =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill bg-accent px-5 text-body font-semibold text-accent-fg transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97] disabled:opacity-40';
/** 보조 버튼(캡슐) */
const BTN_SECONDARY =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-pill bg-surface-3 px-4 text-body-sm font-medium text-fg transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97] disabled:opacity-40';
/** 섹션 헤더 */
const SECTION = 'px-5 pb-2 pt-6 text-body-sm font-semibold text-muted';

/**
 * 관측지 관리 (task-02 §3.1): 목록(프리셋 + 현재 위치), 추가/편집/삭제, 기본 지정, 십진수·붙여넣기 좌표,
 * 보이는 하늘 범위(C15). 저장은 Dexie sites.
 */
export function SitesScreen({ onBack }: { onBack(): void }) {
  const { t } = useTranslation();
  const [sites, setSites] = useState<Site[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [paste, setPaste] = useState('');
  const gps = useSensorStore((s) => s.gps);
  const current = useLocationStore((s) => s.site);
  const currentId = useLocationStore((s) => s.siteId);

  const refresh = useCallback(async () => {
    await ensureDefaultSite();
    setSites(await listSites());
  }, []);
  useEffect(() => {
    const id = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const useGps = () => {
    useSensorStore
      .getState()
      .patch({ gps: { status: 'requesting', accuracyM: null, error: null } });
    requestLocation(
      (fix, final) => {
        useLocationStore.getState().setFromGps({
          lat: fix.lat,
          lon: fix.lon,
          elevation: fix.elevation,
          accuracyM: fix.accuracyM,
        });
        useSensorStore.getState().patch({
          gps: { status: final ? 'ok' : 'requesting', accuracyM: fix.accuracyM, error: null },
        });
      },
      (err: GeoError) => {
        useSensorStore
          .getState()
          .patch({ gps: { status: 'error', accuracyM: null, error: t(`sensor.geo.${err.kind}`) } });
      },
    );
  };

  const startEdit = (s?: Site) => {
    setPaste('');
    setDraft(
      s
        ? {
            id: s.id,
            name: s.name,
            lat: String(s.lat),
            lon: String(s.lon),
            elevation: s.elevation !== undefined ? String(s.elevation) : '',
            bortle: s.bortle !== undefined ? String(s.bortle) : '',
            arc: s.visibleAz?.[0],
            minAltDeg: s.minAltDeg ?? 0,
          }
        : {
            ...EMPTY,
            lat: current.lat.toFixed(4),
            lon: current.lon.toFixed(4),
            elevation: String(current.elevation),
          },
    );
  };

  const applyPaste = () => {
    const p = parseLatLon(paste);
    if (p && draft) setDraft({ ...draft, lat: String(p.lat), lon: String(p.lon) });
  };

  const save = async () => {
    if (!draft) return;
    const lat = Number(draft.lat);
    const lon = Number(draft.lon);
    if (
      !draft.name.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    )
      return;
    const bortle = draft.bortle ? (Number(draft.bortle) as Bortle) : undefined;
    const site = await upsertSite({
      ...(draft.id ? { id: draft.id } : {}),
      name: draft.name.trim(),
      lat,
      lon,
      ...(draft.elevation ? { elevation: Number(draft.elevation) } : {}),
      ...(bortle ? { bortle } : {}),
      ...(draft.arc ? { visibleAz: [draft.arc] } : { visibleAz: undefined }),
      minAltDeg: draft.minAltDeg,
      isDefault: sites.find((s) => s.id === draft.id)?.isDefault ? true : undefined,
    });
    if (currentId === site.id)
      useLocationStore
        .getState()
        .setSite(
          { name: site.name, lat: site.lat, lon: site.lon, elevation: site.elevation ?? 0 },
          site.id,
        );
    setDraft(null);
    await refresh();
  };

  const select = (s: Site) => {
    useLocationStore
      .getState()
      .setSite({ name: s.name, lat: s.lat, lon: s.lon, elevation: s.elevation ?? 0 }, s.id);
  };

  const makeDefault = async (s: Site) => {
    await upsertSite({ ...s, isDefault: true });
    select(s);
    await refresh();
  };

  const remove = async (s: Site) => {
    await softDeleteSite(s.id);
    if (currentId === s.id) useLocationStore.getState().setSite({ ...DAEJEON_PRESET }, null);
    await refresh();
  };

  return (
    <ScreenFrame title={t('sites.title')} onBack={onBack} testId="sites-screen">
      {/* 현재 관측지 */}
      <h2 className={SECTION}>{t('sites.current')}</h2>
      <div className="mx-4 rounded-lg bg-surface px-4 py-3 squircle">
        <div className="text-body font-semibold" data-testid="sites-current">
          {current.name}
        </div>
        <div className="mt-0.5 font-mono text-caption tabular-nums text-muted">
          {formatLatLon(current.lat, current.lon)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={useGps}
            disabled={gps.status === 'requesting'}
            className={BTN_PRIMARY}
            data-testid="sites-gps"
          >
            {gps.status === 'requesting' ? t('sites.gpsRequesting') : t('sites.useGps')}
          </button>
          {gps.status === 'ok' && gps.accuracyM !== null && (
            <span className="text-caption tabular-nums text-muted" data-testid="sites-gps-acc">
              ±{Math.round(gps.accuracyM)} m
            </span>
          )}
        </div>
        {gps.status === 'error' && (
          <p className="mt-2 text-caption text-danger" role="alert" data-testid="sites-gps-error">
            {gps.error}
          </p>
        )}
      </div>

      {/* 저장된 관측지 */}
      <h2 className={SECTION}>{t('sites.saved')}</h2>
      <ul
        className="mx-4 overflow-hidden rounded-lg bg-surface squircle [&>li+li]:hairline-t"
        data-testid="sites-list"
      >
        {sites.map((s) => (
          <li key={s.id} className="flex min-h-14 items-center gap-1 py-2 pl-4 pr-2">
            <button
              type="button"
              onClick={() => select(s)}
              className="min-h-10 min-w-0 flex-1 rounded-sm text-left transition-colors duration-150 active:bg-surface-2"
            >
              <span className="block truncate text-body">
                {s.name}
                {s.isDefault ? (
                  <span className="ml-1.5 text-caption text-accent" aria-hidden="true">
                    ★
                  </span>
                ) : null}
              </span>
              <span className="block truncate font-mono text-caption tabular-nums text-muted">
                {formatLatLon(s.lat, s.lon)}
                {s.visibleAz?.[0] ? ` · ${s.visibleAz[0][0]}→${s.visibleAz[0][1]}°` : ''}
                {s.minAltDeg ? ` · ≥${s.minAltDeg}°` : ''}
              </span>
            </button>
            {!s.isDefault && (
              <button
                type="button"
                onClick={() => void makeDefault(s)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-body text-muted transition-colors duration-150 active:bg-surface-2"
                aria-label={t('sites.makeDefault')}
              >
                ☆
              </button>
            )}
            <button
              type="button"
              onClick={() => startEdit(s)}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-pill px-3 text-body-sm font-medium text-accent transition-colors duration-150 active:bg-accent-soft"
              data-testid={`site-edit-${s.name}`}
            >
              {t('sites.edit')}
            </button>
            <button
              type="button"
              onClick={() => void remove(s)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-body text-danger transition-colors duration-150 active:bg-danger-soft"
              aria-label={t('sites.delete')}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {!draft && (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => startEdit()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-pill bg-accent-soft px-5 text-body font-semibold text-accent transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97]"
            data-testid="site-add"
          >
            + {t('sites.add')}
          </button>
        </div>
      )}

      {draft && (
        <form
          className="mx-4 mt-3 flex flex-col gap-2.5 rounded-xl bg-surface p-4 shadow-card squircle"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          data-testid="site-form"
        >
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t('sites.name')}
            aria-label={t('sites.name')}
            className={FIELD}
            data-testid="site-name"
            required
          />
          <div className="flex gap-2">
            <input
              value={draft.lat}
              onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
              placeholder={t('sites.lat')}
              aria-label={t('sites.lat')}
              inputMode="decimal"
              className={`${FIELD} flex-1 font-mono tabular-nums`}
              data-testid="site-lat"
            />
            <input
              value={draft.lon}
              onChange={(e) => setDraft({ ...draft, lon: e.target.value })}
              placeholder={t('sites.lon')}
              aria-label={t('sites.lon')}
              inputMode="decimal"
              className={`${FIELD} flex-1 font-mono tabular-nums`}
              data-testid="site-lon"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={t('sites.pastePlaceholder')}
              aria-label={t('sites.pastePlaceholder')}
              className={`${FIELD} flex-1 text-body-sm`}
              data-testid="site-paste"
            />
            <button
              type="button"
              onClick={applyPaste}
              className={`${BTN_SECONDARY} shrink-0`}
              data-testid="site-paste-apply"
            >
              {t('sites.pasteApply')}
            </button>
          </div>
          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block px-1 text-caption text-muted">
                {t('sites.elevation')}
              </span>
              <input
                value={draft.elevation}
                onChange={(e) => setDraft({ ...draft, elevation: e.target.value })}
                placeholder={t('sites.elevation')}
                inputMode="numeric"
                className={`${FIELD} font-mono tabular-nums`}
                data-testid="site-elev"
              />
            </label>
            <div className="min-w-0 flex-1">
              <span className="mb-1 block px-1 text-caption text-muted">{t('sites.bortle')}</span>
              <div className="relative">
                <select
                  value={draft.bortle}
                  onChange={(e) => setDraft({ ...draft, bortle: e.target.value })}
                  className={`${FIELD} pr-10`}
                  aria-label={t('sites.bortle')}
                  data-testid="site-bortle"
                >
                  <option value="">{t('sites.bortleNone')}</option>
                  {BORTLE_LEVELS.map((b) => (
                    <option key={b} value={b}>
                      {t('sites.bortleLevel', { n: b, desc: t(`sites.bortleDesc.${b}`) })}
                    </option>
                  ))}
                </select>
                <IconChevron
                  size={18}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-muted-2"
                />
              </div>
            </div>
          </div>

          <div className="mt-1 rounded-md bg-surface-2/70 px-3.5 py-3">
            <p className="mb-2 text-caption text-muted">{t('sites.rangeHint')}</p>
            <SkyRangePicker
              value={{ arc: draft.arc, minAltDeg: draft.minAltDeg }}
              onChange={(v) => setDraft({ ...draft, arc: v.arc, minAltDeg: v.minAltDeg })}
            />
          </div>

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className={`${BTN_SECONDARY} min-h-11 px-5 text-body`}
            >
              {t('common.close')}
            </button>
            <button type="submit" className={`${BTN_PRIMARY} flex-1`} data-testid="site-save">
              {t('sites.save')}
            </button>
          </div>
        </form>
      )}
    </ScreenFrame>
  );
}
