import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { moonPhaseName } from '@/astro/bodies';
import { displayName, loadCatalog, type Catalog } from '@/catalog/catalog';
import { kindOf, type ObjectId } from '@/catalog/objectId';
import { deleteBlob, getBlob, putBlob } from '@/db/repos/blobs';
import {
  addObservation,
  deleteObservation,
  getObservation,
  restoreObservation,
  updateObservation,
  type ObservationInput,
} from '@/db/repos/observations';
import { getSetting, setSetting } from '@/db/repos/settings';
import { listSites } from '@/db/repos/sites';
import type {
  EquipmentKind,
  Observation,
  ObservationConditions,
  ObservationSite,
  Rating1to5,
  Site,
} from '@/db/types';
import { fromLocalInput, loadAutoFill, loadForecast, toLocalInput } from '@/features/log/autoFill';
import { useBlobUrl } from '@/features/log/imageUtils';
import { PhotoInput } from '@/features/log/PhotoInput';
import { SketchCanvas } from '@/features/log/SketchCanvas';
import {
  TAG_CATEGORIES,
  TAG_PRESETS,
  presetsFor,
  tagLabelKey,
  toggleTag,
  type TagCategory,
} from '@/features/log/tagPresets';
import type { ObservationFormProps } from '@/features/log/types';
import { useSiteRecord } from '@/features/settings/useSiteRecord';
import type { WeatherForecast } from '@/services/weather';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { showToast } from '@/state/logUiStore';
import { useSettingsStore } from '@/state/settingsStore';
import { Chip } from '@/ui/Chip';
import { compass16 } from '@/ui/format';
import { ScrollArea } from '@/ui/ScrollArea';
import { Segmented } from '@/ui/Segmented';

/* 디자인 브리프(D-021) 레시피 — 상세 시트와 같은 클래스 문자열 */
const ICON_BTN =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-fg/80 transition-[background-color,color] duration-150 ease-standard active:bg-surface-2';
const PRIMARY_BTN =
  'inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-1.5 rounded-pill bg-accent px-5 text-body-lg font-semibold text-accent-fg transition-[transform,opacity] duration-150 ease-standard active:scale-[0.97] disabled:opacity-40';
const SECONDARY_BTN =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-surface-3 px-4 text-body-sm font-medium text-fg transition-[background-color,color,transform,opacity] duration-150 ease-standard active:scale-[0.97] disabled:opacity-40 aria-pressed:bg-accent-soft aria-pressed:text-accent';
const TERTIARY_BTN =
  'inline-flex min-h-9 shrink-0 items-center justify-center rounded-pill px-3 text-body-sm font-medium text-accent transition-[background-color,transform] duration-150 ease-standard active:scale-[0.97] active:bg-accent-soft';
const DANGER_BTN =
  'inline-flex min-h-9 shrink-0 items-center justify-center rounded-pill bg-danger-soft px-3.5 text-body-sm font-semibold text-danger transition-[transform] duration-150 ease-standard active:scale-[0.97]';
const CHIP_BTN =
  'inline-flex min-h-10 items-center gap-1 rounded-pill bg-surface-2 px-3.5 text-body-sm font-medium text-fg transition-[background-color,color,transform] duration-150 ease-standard active:scale-95 aria-pressed:bg-accent aria-pressed:text-accent-fg';
const INPUT =
  'min-h-11 rounded-sm bg-surface-2 px-3 text-body text-fg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-accent';

const RATINGS: readonly Rating1to5[] = [1, 2, 3, 4, 5];
const EQUIPMENT_KINDS: readonly EquipmentKind[] = ['naked', 'binoculars', 'telescope'];
const LAST_EQUIPMENT_KEY = 'log.lastEquipment';
const AUTO_DEBOUNCE_MS = 250;

/** 인셋 그룹(D-021): 둥근 표면 한 층 + 행 사이 헤어라인 */
function Group({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <section
      className="mt-3 overflow-hidden rounded-lg bg-surface squircle [&>*+*]:hairline-t"
      data-testid={testId}
    >
      {children}
    </section>
  );
}

/** 라벨 위 + 내용 아래(칩 묶음용) */
function Field({
  label,
  hint,
  children,
  testId,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="px-4 py-3" data-testid={testId}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-caption text-muted">{label}</span>
        {hint && <span className="text-label text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** 라벨 왼쪽 + 컨트롤 오른쪽 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1 truncate text-body">{label}</span>
      {children}
    </div>
  );
}

function ScaleChips({
  value,
  onChange,
  testPrefix,
}: {
  value: Rating1to5 | undefined;
  onChange(next: Rating1to5 | undefined): void;
  testPrefix: string;
}) {
  return (
    <div className="flex gap-2" role="group">
      {RATINGS.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? undefined : n)}
          className={`${CHIP_BTN} min-w-11 justify-center px-0`}
          data-testid={`${testPrefix}-${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

interface AutoState {
  conditions: ObservationConditions;
  /** 대상이 카탈로그에 없어 계산하지 못함 */
  unavailable: boolean;
}

/**
 * 관측 기록 폼(task-04 §3.2). 호스트가 fixed inset-0 z-40 bg-bg를 준다.
 * 야외·어둠·장갑 전제: 칩 탭 위주, 텍스트는 마지막, 저장 버튼은 하단 고정·큼.
 * 이 세션에서 만든 blob(스케치·사진)은 저장하지 않고 닫으면 지우고, 뺀 blob은 저장할 때 지운다.
 */
export function ObservationForm({ request, onClose, onSaved }: ObservationFormProps) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const currentSite = useLocationStore((s) => s.site);
  const currentSiteId = useLocationStore((s) => s.siteId);
  const { bortle } = useSiteRecord();
  const objectId: ObjectId = request.objectId;
  const editing = request.observationId !== undefined;
  const kind = kindOf(objectId);

  const [cat, setCat] = useState<Catalog | null>(null);
  const [existing, setExisting] = useState<Observation | null>(null);
  const [ready, setReady] = useState(!editing);
  const [missing, setMissing] = useState(false);

  // 입력 상태
  const [outcome, setOutcome] = useState<Observation['outcome']>(request.outcome ?? 'seen');
  const [timeInput, setTimeInput] = useState(() => toLocalInput(useClockStore.getState().now()));
  const [site, setSite] = useState<ObservationSite>(() => ({
    lat: currentSite.lat,
    lon: currentSite.lon,
    elevation: currentSite.elevation,
    name: currentSite.name,
  }));
  const [siteId, setSiteId] = useState<string | null>(currentSiteId);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipmentKind, setEquipmentKind] = useState<EquipmentKind>('naked');
  const [magnification, setMagnification] = useState('');
  const [rating, setRating] = useState<Rating1to5 | undefined>(undefined);
  const [seeing, setSeeing] = useState<Rating1to5 | undefined>(undefined);
  const [transparency, setTransparency] = useState<Rating1to5 | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [sketchBlobId, setSketchBlobId] = useState<string | null>(null);
  const [photoBlobIds, setPhotoBlobIds] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);

  // 자동 조건
  const [auto, setAuto] = useState<AutoState | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [forecast, setForecast] = useState<WeatherForecast | null | undefined>(undefined);
  const initialTimeRef = useRef<string | null>(null);

  // 스케치 오버레이
  const [sketchOpen, setSketchOpen] = useState(false);
  const [sketchInitial, setSketchInitial] = useState<Blob | null>(null);
  const sketchUrl = useBlobUrl(sketchBlobId);

  // 저장·삭제
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteStage, setDeleteStage] = useState<0 | 1>(0);

  // 이 세션의 blob 추적
  const createdBlobs = useRef(new Set<string>());
  const removedBlobs = useRef(new Set<string>());
  const savedRef = useRef(false);

  const name = cat ? displayName(cat, objectId, lang) : objectId;

  /* ---------- 로드 ---------- */
  useEffect(() => {
    let alive = true;
    void loadCatalog().then((c) => {
      if (alive) setCat(c);
    });
    void listSites().then((rows) => {
      if (alive) setSites(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!editing) {
      void getSetting<EquipmentKind>(LAST_EQUIPMENT_KEY).then((k) => {
        if (alive && k && EQUIPMENT_KINDS.includes(k)) setEquipmentKind(k);
      });
      return () => {
        alive = false;
      };
    }
    void getObservation(request.observationId!).then((o) => {
      if (!alive) return;
      if (!o) {
        setMissing(true);
        setReady(true);
        return;
      }
      setExisting(o);
      setOutcome(o.outcome);
      const tv = toLocalInput(new Date(o.observedAt));
      initialTimeRef.current = tv;
      setTimeInput(tv);
      setSite(o.site);
      setSiteId(o.siteId ?? null);
      if (o.equipment) {
        setEquipmentKind(o.equipment.kind);
        if (o.equipment.magnification !== undefined)
          setMagnification(String(o.equipment.magnification));
      }
      setRating(o.rating);
      setSeeing(o.conditions?.seeing);
      setTransparency(o.conditions?.transparency);
      setTags(o.tags ?? []);
      setNotes(o.notes ?? '');
      setSketchBlobId(o.sketchBlobId ?? null);
      setPhotoBlobIds(o.photoBlobIds ?? []);
      if (o.conditions && o.conditions.altDeg !== undefined)
        setAuto({ conditions: o.conditions, unavailable: false });
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [editing, request.observationId]);

  // 날씨는 한 번만(캐시 1시간). 오프라인이면 null.
  useEffect(() => {
    let alive = true;
    void loadForecast(site).then((f) => {
      if (alive) setForecast(f);
    });
    return () => {
      alive = false;
    };
  }, [site]);

  // 고른 관측지의 광해 단계(저장된 관측지면 그 값, 아니면 현재 관측지 설정)
  const chosenSite = sites.find((s) => s.id === siteId);
  const bortleUsed = chosenSite?.bortle ?? bortle;

  // 자동 조건: 시각·관측지·광해·날씨가 바뀌면 다시 계산(디바운스). 편집 모드는 시각을 바꾸기 전까지 저장된 값을 쓴다.
  useEffect(() => {
    if (!ready || missing) return;
    if (
      editing &&
      initialTimeRef.current === timeInput &&
      existing?.conditions?.altDeg !== undefined
    )
      return;
    const at = fromLocalInput(timeInput);
    if (!at) return;
    let alive = true;
    const h = window.setTimeout(() => {
      setAutoBusy(true);
      void loadAutoFill(objectId, at, {
        observer: site,
        bortle: bortleUsed,
        forecast: forecast ?? null,
      })
        .then((r) => {
          if (!alive) return;
          setAuto({ conditions: r.conditions, unavailable: r.target === null });
        })
        .finally(() => {
          if (alive) setAutoBusy(false);
        });
    }, AUTO_DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(h);
    };
  }, [ready, missing, editing, existing, timeInput, objectId, site, bortleUsed, forecast]);

  // 저장하지 않고 사라지면(닫기·Esc) 이 세션에서 만든 blob을 지운다
  useEffect(() => {
    const created = createdBlobs.current;
    return () => {
      if (savedRef.current) return;
      for (const id of created) void deleteBlob(id);
    };
  }, []);

  /* ---------- 태그 ---------- */
  const primaryCats = useMemo(() => presetsFor(kind), [kind]);
  const otherCats = useMemo(
    () => TAG_CATEGORIES.filter((c) => !primaryCats.includes(c)),
    [primaryCats],
  );
  const visibleCats: TagCategory[] = showAllTags ? [...primaryCats, ...otherCats] : primaryCats;
  // 저장된 태그 중 프리셋에 없는 것(예: 다른 카테고리)도 보이게
  const extraTags = tags.filter((id) => !visibleCats.some((c) => TAG_PRESETS[c].includes(id)));

  /* ---------- 스케치 ---------- */
  const openSketch = async (edit: boolean) => {
    if (edit && sketchBlobId) {
      const rec = await getBlob(sketchBlobId);
      setSketchInitial(rec?.data ?? null);
    } else setSketchInitial(null);
    setSketchOpen(true);
  };
  const dropSketch = useCallback(() => {
    if (!sketchBlobId) return;
    if (createdBlobs.current.has(sketchBlobId)) {
      createdBlobs.current.delete(sketchBlobId);
      void deleteBlob(sketchBlobId);
    } else removedBlobs.current.add(sketchBlobId);
    setSketchBlobId(null);
  }, [sketchBlobId]);

  /* ---------- 저장 · 삭제 ---------- */
  const save = async () => {
    if (saving) return;
    const at = fromLocalInput(timeInput);
    if (!at) {
      setNotice(t('log.form.timeInvalid'));
      return;
    }
    setNotice(null);
    setSaving(true);
    try {
      const mag = Number(magnification);
      const conditions: ObservationConditions = { ...(auto?.conditions ?? existing?.conditions) };
      if (seeing) conditions.seeing = seeing;
      else delete conditions.seeing;
      if (transparency) conditions.transparency = transparency;
      else delete conditions.transparency;
      const input: ObservationInput = {
        objectId,
        observedAt: at.toISOString(),
        outcome,
        siteId: siteId ?? undefined,
        site,
        equipment: {
          kind: equipmentKind,
          ...(equipmentKind !== 'naked' && Number.isFinite(mag) && mag > 0
            ? { magnification: mag }
            : {}),
        },
        conditions,
        rating,
        notes: notes.trim(),
        tags,
        sketchBlobId: sketchBlobId ?? undefined,
        photoBlobIds: photoBlobIds.length ? photoBlobIds : undefined,
      };
      const saved = editing
        ? await updateObservation(request.observationId!, input)
        : await addObservation(input);
      if (!saved) {
        setMissing(true);
        return;
      }
      savedRef.current = true;
      for (const id of removedBlobs.current) void deleteBlob(id);
      void setSetting(LAST_EQUIPMENT_KEY, equipmentKind);
      showToast(t('log.form.saved'));
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const id = request.observationId;
    if (!id) return;
    await deleteObservation(id);
    // 이 세션에서 새로 만든 blob은 기록에 붙지 않았으므로 언마운트 정리로 지워진다(되살려도 원래 첨부는 그대로).
    showToast(t('log.form.deleted'), {
      label: t('log.form.undo'),
      onClick: () => void restoreObservation(id),
    });
    onClose();
  };

  /* ---------- 자동 조건 표시 ---------- */
  const autoChips: string[] = [];
  if (auto) {
    const c = auto.conditions;
    if (c.altDeg !== undefined && c.azDeg !== undefined)
      autoChips.push(
        t('log.auto.altAz', { alt: Math.round(c.altDeg), dir: compass16(c.azDeg, lang) }),
      );
    if (c.moonIllum !== undefined) {
      const phase =
        c.moonPhaseDeg !== undefined ? t(`tonight.moonPhase.${moonPhaseName(c.moonPhaseDeg)}`) : '';
      const illum = Math.round(c.moonIllum * 100);
      autoChips.push(
        c.moonSepDeg !== undefined
          ? t('log.auto.moon', { phase, illum, sep: Math.round(c.moonSepDeg) })
          : t('log.auto.moonSelf', { phase, illum }),
      );
    }
    if (c.cloudCover !== undefined && c.tempC !== undefined)
      autoChips.push(t('log.auto.weather', { cloud: c.cloudCover, temp: Math.round(c.tempC) }));
    if (c.humidity !== undefined) autoChips.push(t('log.auto.humidity', { h: c.humidity }));
    if (c.bortle !== undefined) autoChips.push(t('log.auto.bortle', { n: c.bortle }));
  }

  // 관측지 칩: 저장된 관측지 + "현재 위치"(저장된 관측지가 아닌 GPS·수동 위치이거나, 기록의 관측지가 저장된 것이 아닐 때)
  const siteChoices = useMemo(() => {
    const list = sites.filter((s) => !s.deletedAt);
    const showCurrent = siteId === null || !list.some((s) => s.id === currentSiteId);
    return { list, showCurrent };
  }, [sites, siteId, currentSiteId]);
  const pickCurrentSite = () => {
    setSiteId(null);
    setSite({
      lat: currentSite.lat,
      lon: currentSite.lon,
      elevation: currentSite.elevation,
      name: currentSite.name,
    });
  };

  return (
    <div className="flex h-full flex-col" data-testid="observation-form">
      <header className="safe-top hairline-b flex shrink-0 items-center gap-1 py-1 pl-1.5 pr-2">
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className={ICON_BTN}
          data-testid="obs-close"
        >
          ✕
        </button>
        <h1 className="min-w-0 flex-1 truncate text-title" data-testid="obs-title">
          {t('log.form.title', { name })}
        </h1>
        {editing && !missing && deleteStage === 0 && (
          <button
            type="button"
            className={`${TERTIARY_BTN} text-danger`}
            onClick={() => setDeleteStage(1)}
            data-testid="obs-delete"
          >
            {t('log.form.delete')}
          </button>
        )}
      </header>

      {deleteStage === 1 && (
        <div
          className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-danger-soft px-4 py-2"
          role="alertdialog"
          aria-label={t('log.form.deleteConfirm')}
          data-testid="obs-delete-confirm"
        >
          <span className="min-w-0 flex-1 text-body-sm text-fg">{t('log.form.deleteConfirm')}</span>
          <button
            type="button"
            className={`${TERTIARY_BTN} text-fg`}
            onClick={() => setDeleteStage(0)}
            data-testid="obs-delete-cancel"
          >
            {t('log.form.cancel')}
          </button>
          <button
            type="button"
            className={DANGER_BTN}
            onClick={() => void confirmDelete()}
            data-testid="obs-delete-yes"
          >
            {t('log.form.deleteYes')}
          </button>
        </div>
      )}

      <ScrollArea className="px-4 pb-6">
        {!ready && <p className="py-4 text-body-sm text-muted">{t('common.loading')}</p>}
        {ready && missing && (
          <p className="py-4 text-body-sm text-muted" data-testid="obs-missing">
            {t('log.form.notFound')}
          </p>
        )}
        {ready && !missing && (
          <>
            {/* 결과 · 시각 · 관측지 */}
            <Group>
              <div data-testid="obs-outcome" data-value={outcome}>
                <Segmented<Observation['outcome']>
                  label={t('log.form.outcome')}
                  value={outcome}
                  options={[
                    { value: 'seen', label: `★ ${t('log.form.seen')}` },
                    { value: 'notSeen', label: t('log.form.notSeen') },
                  ]}
                  onChange={setOutcome}
                />
              </div>
              <Row label={t('log.form.time')}>
                <input
                  type="datetime-local"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className={`${INPUT} max-w-[14rem]`}
                  data-testid="obs-time"
                />
              </Row>
              <Field label={t('log.form.site')} testId="obs-site">
                {siteChoices.list.length === 0 ? (
                  <span className="text-body">{site.name ?? t('log.form.currentSite')}</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {siteChoices.showCurrent && (
                      <Chip
                        selected={siteId === null}
                        onClick={pickCurrentSite}
                        testId="obs-site-current"
                      >
                        {(siteId === null ? site.name : currentSite.name) ??
                          t('log.form.currentSite')}
                      </Chip>
                    )}
                    {siteChoices.list.map((s) => (
                      <Chip
                        key={s.id}
                        selected={s.id === siteId}
                        onClick={() => {
                          setSiteId(s.id);
                          setSite({ lat: s.lat, lon: s.lon, elevation: s.elevation, name: s.name });
                        }}
                        testId={`obs-site-${s.id}`}
                      >
                        {s.name}
                      </Chip>
                    ))}
                  </div>
                )}
              </Field>
            </Group>

            {/* 관측 방법 */}
            <Group>
              <div data-testid="obs-equipment" data-value={equipmentKind}>
                <Segmented<EquipmentKind>
                  label={t('log.form.equipment')}
                  value={equipmentKind}
                  options={EQUIPMENT_KINDS.map((k) => ({
                    value: k,
                    label: t(`log.form.equip.${k}`),
                  }))}
                  onChange={setEquipmentKind}
                />
              </div>
              {equipmentKind !== 'naked' && (
                <Row label={t('log.form.magnification')}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={2000}
                    placeholder={t('log.form.magnificationPlaceholder')}
                    value={magnification}
                    onChange={(e) => setMagnification(e.target.value)}
                    className={`${INPUT} w-24 text-right`}
                    data-testid="obs-magnification"
                  />
                  <span className="text-body text-muted">×</span>
                </Row>
              )}
            </Group>

            {/* 평점 · 하늘 상태 */}
            <Group>
              <Field
                label={t('log.form.rating')}
                hint={t('log.form.ratingHint')}
                testId="obs-rating"
              >
                <div className="flex gap-1" role="group" aria-label={t('log.form.rating')}>
                  {RATINGS.map((n) => {
                    const on = rating !== undefined && n <= rating;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={rating === n}
                        aria-label={`${n}`}
                        onClick={() => setRating(rating === n ? undefined : n)}
                        className={`flex h-11 w-11 items-center justify-center rounded-pill text-headline transition-[transform,color] duration-150 ease-standard active:scale-90 ${
                          on ? 'text-marker' : 'text-muted'
                        }`}
                        data-testid={`obs-rating-${n}`}
                      >
                        {on ? '★' : '☆'}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label={t('log.form.seeing')} hint={t('log.form.seeingHint')}>
                <ScaleChips value={seeing} onChange={setSeeing} testPrefix="obs-seeing" />
              </Field>
              <Field label={t('log.form.transparency')} hint={t('log.form.transparencyHint')}>
                <ScaleChips
                  value={transparency}
                  onChange={setTransparency}
                  testPrefix="obs-transparency"
                />
              </Field>
            </Group>

            {/* 특징 태그 */}
            <Group testId="obs-tags">
              {visibleCats.map((c) => (
                <Field key={c} label={t(`log.tagCategory.${c}`)}>
                  <div className="flex flex-wrap gap-2">
                    {TAG_PRESETS[c].map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={tags.includes(id)}
                        onClick={() => setTags((prev) => toggleTag(prev, id))}
                        className={CHIP_BTN}
                        data-testid={`obs-tag-${id}`}
                      >
                        {t(tagLabelKey(id))}
                      </button>
                    ))}
                  </div>
                </Field>
              ))}
              {extraTags.length > 0 && (
                <Field label={t('log.form.tags')}>
                  <div className="flex flex-wrap gap-2">
                    {extraTags.map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed
                        onClick={() => setTags((prev) => toggleTag(prev, id))}
                        className={CHIP_BTN}
                        data-testid={`obs-tag-${id}`}
                      >
                        {t(tagLabelKey(id), { defaultValue: id })}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
              {otherCats.length > 0 && (
                <div className="px-4 py-2">
                  <button
                    type="button"
                    className={TERTIARY_BTN}
                    onClick={() => setShowAllTags((v) => !v)}
                    aria-expanded={showAllTags}
                    data-testid="obs-tags-more"
                  >
                    {showAllTags ? t('log.form.tagsLess') : t('log.form.tagsMore')}
                  </button>
                </div>
              )}
            </Group>

            {/* 자동 조건(읽기 전용) */}
            <Group testId="obs-auto">
              <Field label={t('log.form.auto')} hint={t('log.form.autoHint')}>
                {autoBusy && !auto && (
                  <span className="text-body-sm text-muted">{t('log.form.autoComputing')}</span>
                )}
                {!autoBusy && auto?.unavailable && (
                  <span className="text-body-sm text-muted">{t('log.form.autoNone')}</span>
                )}
                {autoChips.length > 0 && (
                  <div className="flex flex-wrap gap-2" data-busy={autoBusy ? '1' : undefined}>
                    {autoChips.map((s, i) => (
                      <Chip key={i} testId={`obs-auto-${i}`}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                )}
              </Field>
            </Group>

            {/* 스케치 · 사진 */}
            <Group>
              <Field label={t('log.form.sketch')} testId="obs-sketch">
                {sketchBlobId ? (
                  <div className="flex items-center gap-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-black">
                      {sketchUrl && (
                        <img
                          src={sketchUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          data-testid="obs-sketch-thumb"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={SECONDARY_BTN}
                        onClick={() => void openSketch(true)}
                        data-testid="obs-sketch-edit"
                      >
                        {t('log.form.sketchEdit')}
                      </button>
                      <button
                        type="button"
                        className={SECONDARY_BTN}
                        onClick={dropSketch}
                        data-testid="obs-sketch-remove"
                      >
                        {t('log.form.sketchRemove')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={SECONDARY_BTN}
                    onClick={() => void openSketch(false)}
                    data-testid="obs-sketch-open"
                  >
                    ✎ {t('log.form.sketchDraw')}
                  </button>
                )}
              </Field>
              <PhotoInput
                ids={photoBlobIds}
                onChange={(ids, change) => {
                  if (change.added) createdBlobs.current.add(change.added);
                  if (change.removed) {
                    if (createdBlobs.current.has(change.removed)) {
                      createdBlobs.current.delete(change.removed);
                      void deleteBlob(change.removed);
                    } else removedBlobs.current.add(change.removed);
                  }
                  setPhotoBlobIds(ids);
                }}
              />
            </Group>

            {/* 메모(텍스트는 마지막) */}
            <Group>
              <Field label={t('log.form.notes')}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={t('log.form.notesPlaceholder')}
                  className={`${INPUT} w-full resize-y py-2 tabular-nums`}
                  data-testid="obs-notes"
                />
              </Field>
            </Group>
          </>
        )}
      </ScrollArea>

      <footer className="safe-bottom hairline-t shrink-0 bg-bg px-4 pb-3 pt-2">
        {notice && (
          <p className="mb-2 text-caption text-danger" data-testid="obs-notice">
            {notice}
          </p>
        )}
        <button
          type="button"
          className={PRIMARY_BTN}
          disabled={!ready || missing || saving}
          onClick={() => void save()}
          data-testid="obs-save"
        >
          {saving ? t('log.form.saving') : t('log.form.save')}
        </button>
      </footer>

      {sketchOpen && (
        <div className="fixed inset-0 z-50 bg-bg" data-testid="obs-sketch-overlay">
          <SketchCanvas
            initial={sketchInitial}
            objectId={objectId}
            title={name}
            onCancel={() => setSketchOpen(false)}
            onSave={(result) => {
              setSketchOpen(false);
              void putBlob('sketch', result.blob, {
                width: result.width,
                height: result.height,
              }).then((rec) => {
                // 이전 스케치는 새 것으로 바꾼다(저장 전 취소하면 원래대로)
                dropSketch();
                createdBlobs.current.add(rec.id);
                setSketchBlobId(rec.id);
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
