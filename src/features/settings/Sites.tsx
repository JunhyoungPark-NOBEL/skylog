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
      <div className="p-4 text-sm">
        <div className="mb-3 rounded-xl border border-border bg-surface p-3">
          <div className="text-xs text-muted">{t('sites.current')}</div>
          <div className="font-semibold" data-testid="sites-current">
            {current.name}
          </div>
          <div className="font-mono text-xs text-muted">
            {formatLatLon(current.lat, current.lon)}
          </div>
          <button
            type="button"
            onClick={useGps}
            disabled={gps.status === 'requesting'}
            className="mt-2 min-h-10 rounded-full bg-accent px-4 text-accent-fg disabled:opacity-50"
            data-testid="sites-gps"
          >
            {gps.status === 'requesting' ? t('sites.gpsRequesting') : t('sites.useGps')}
          </button>
          {gps.status === 'ok' && gps.accuracyM !== null && (
            <span className="ml-2 text-xs text-muted" data-testid="sites-gps-acc">
              ±{Math.round(gps.accuracyM)} m
            </span>
          )}
          {gps.status === 'error' && (
            <p className="mt-1 text-xs text-danger" role="alert" data-testid="sites-gps-error">
              {gps.error}
            </p>
          )}
        </div>

        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
          {t('sites.saved')}
        </h2>
        <ul
          className="mb-3 divide-y divide-border rounded-xl border border-border"
          data-testid="sites-list"
        >
          {sites.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2">
              <button type="button" onClick={() => select(s)} className="min-h-10 flex-1 text-left">
                <span className="font-medium">{s.name}</span>
                {s.isDefault ? <span className="ml-1 text-xs text-accent">★</span> : null}
                <div className="font-mono text-[11px] text-muted">
                  {formatLatLon(s.lat, s.lon)}
                  {s.visibleAz?.[0] ? ` · ${s.visibleAz[0][0]}→${s.visibleAz[0][1]}°` : ''}
                  {s.minAltDeg ? ` · ≥${s.minAltDeg}°` : ''}
                </div>
              </button>
              {!s.isDefault && (
                <button
                  type="button"
                  onClick={() => void makeDefault(s)}
                  className="min-h-9 px-2 text-xs text-muted"
                  aria-label={t('sites.makeDefault')}
                >
                  ☆
                </button>
              )}
              <button
                type="button"
                onClick={() => startEdit(s)}
                className="min-h-9 px-2 text-xs"
                data-testid={`site-edit-${s.name}`}
              >
                {t('sites.edit')}
              </button>
              <button
                type="button"
                onClick={() => void remove(s)}
                className="min-h-9 px-2 text-xs text-danger"
                aria-label={t('sites.delete')}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {!draft && (
          <button
            type="button"
            onClick={() => startEdit()}
            className="min-h-11 w-full rounded-full border border-border"
            data-testid="site-add"
          >
            + {t('sites.add')}
          </button>
        )}

        {draft && (
          <form
            className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
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
              className="min-h-10 rounded border border-border bg-bg px-2"
              data-testid="site-name"
              required
            />
            <div className="flex gap-2">
              <input
                value={draft.lat}
                onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
                placeholder={t('sites.lat')}
                inputMode="decimal"
                className="min-h-10 w-1/2 rounded border border-border bg-bg px-2 font-mono"
                data-testid="site-lat"
              />
              <input
                value={draft.lon}
                onChange={(e) => setDraft({ ...draft, lon: e.target.value })}
                placeholder={t('sites.lon')}
                inputMode="decimal"
                className="min-h-10 w-1/2 rounded border border-border bg-bg px-2 font-mono"
                data-testid="site-lon"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={t('sites.pastePlaceholder')}
                className="min-h-10 flex-1 rounded border border-border bg-bg px-2 text-xs"
                data-testid="site-paste"
              />
              <button
                type="button"
                onClick={applyPaste}
                className="min-h-10 rounded-full bg-surface-2 px-3 text-xs"
                data-testid="site-paste-apply"
              >
                {t('sites.pasteApply')}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={draft.elevation}
                onChange={(e) => setDraft({ ...draft, elevation: e.target.value })}
                placeholder={t('sites.elevation')}
                inputMode="numeric"
                className="min-h-10 w-1/2 rounded border border-border bg-bg px-2 font-mono"
                data-testid="site-elev"
              />
              <select
                value={draft.bortle}
                onChange={(e) => setDraft({ ...draft, bortle: e.target.value })}
                className="min-h-10 w-1/2 rounded border border-border bg-bg px-2"
                aria-label="Bortle"
                data-testid="site-bortle"
              >
                <option value="">Bortle —</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((b) => (
                  <option key={b} value={b}>
                    Bortle {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted">{t('sites.rangeHint')}</div>
            <SkyRangePicker
              value={{ arc: draft.arc, minAltDeg: draft.minAltDeg }}
              onChange={(v) => setDraft({ ...draft, arc: v.arc, minAltDeg: v.minAltDeg })}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="min-h-11 rounded-full bg-surface-2 px-4"
              >
                {t('common.close')}
              </button>
              <button
                type="submit"
                className="min-h-11 flex-1 rounded-full bg-accent px-4 font-semibold text-accent-fg"
                data-testid="site-save"
              >
                {t('sites.save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </ScreenFrame>
  );
}
