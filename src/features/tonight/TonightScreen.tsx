import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { PhenomenaCard, MeteorCard } from '@/features/tonight/PhenomenaCard';
import { HighlightsCard, PlanCard, RecommendCard } from '@/features/tonight/RecommendCards';
import { SkyStatusCard } from '@/features/tonight/SkyStatusCard';
import { useTonight } from '@/features/tonight/useTonight';
import { WeatherCard } from '@/features/tonight/WeatherCard';
import { hoursIn } from '@/services/weather';
import { useSettingsStore } from '@/state/settingsStore';
import { useTonightStore, type WindowPreset } from '@/state/tonightStore';
import { Chip, ChipRow } from '@/ui/Chip';
import { formatTime } from '@/ui/format';

const PRESETS: WindowPreset[] = ['next2h', 'evening', 'lateNight', 'dawn', 'custom'];
const EQUIPMENT = ['naked', 'binoculars', 'telescope'] as const;

const HOUR_INPUT =
  'min-h-9 w-16 rounded-pill bg-surface-2 px-2 text-center text-body-sm font-medium tabular-nums outline-none transition-[background-color,box-shadow] duration-150 focus:bg-surface-3 focus-visible:shadow-[0_0_0_2px_var(--accent-glow)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/**
 * "오늘 밤" 탭: 추천 / 관측 조건 / 천문 일정으로 나누고 세부 설정은 필요할 때 펼친다(D-028).
 * 루트는 위·아래 여백을 두지 않는다 — App이 탭 라우트를 pt-status/pb-tab 스크롤 컨테이너로 감싼다.
 */
export function TonightScreen() {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<'picks' | 'conditions' | 'events'>('picks');
  const [filters, setFilters] = useState(false);
  const lang = useSettingsStore((s) => s.lang);
  const preset = useTonightStore((s) => s.preset);
  const equipment = useTonightStore((s) => s.equipment);
  const customFrom = useTonightStore((s) => s.customFromHour);
  const customTo = useTonightStore((s) => s.customToHour);
  const d = useTonight();
  const clouds =
    d.weather && d.night
      ? hoursIn(d.weather, {
          from: new Date(d.night.start.getTime() + 5 * 3_600_000),
          to: d.night.end,
        }).map((h) => ({ at: h.at, cloud: h.cloud }))
      : undefined;

  return (
    <section className="mx-auto max-w-3xl px-4" data-testid="tonight-screen">
      <div className="flex items-baseline justify-between gap-3 pt-2 pb-1">
        <h1 className="text-headline">{t('tonight.title')}</h1>
        <span className="min-w-0 truncate text-caption text-muted">{d.siteName}</span>
      </div>
      <p className="mb-4 text-body-sm text-muted">{t('nightSimple.intro')}</p>
      <div
        className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1"
        role="tablist"
        aria-label={t('tonight.title')}
      >
        {(['picks', 'conditions', 'events'] as const).map((key, i) => (
          <button
            key={key}
            role="tab"
            id={'tonight-tab-' + key}
            data-testid={'tonight-tab-' + key}
            aria-selected={panel === key}
            aria-controls={'tonight-panel-' + key}
            tabIndex={panel === key ? 0 : -1}
            className={
              'min-h-12 rounded-xl px-2 text-body-sm font-semibold ' +
              (panel === key ? 'bg-surface text-accent shadow-card' : 'text-muted')
            }
            onClick={() => setPanel(key)}
            onKeyDown={(e) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
              e.preventDefault();
              const keys = ['picks', 'conditions', 'events'] as const;
              const next =
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? 2
                    : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
              setPanel(keys[next]!);
              document.getElementById('tonight-tab-' + keys[next])?.focus();
            }}
          >
            {t('nightSimple.' + key)}
          </button>
        ))}
      </div>
      {panel !== 'events' && (
        <>
          <button
            className="mb-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 text-body-sm"
            aria-expanded={filters}
            data-testid="tonight-filters"
            onClick={() => setFilters(!filters)}
          >
            <span>
              {t('tonight.preset.' + preset)} · {t('object.equipment.' + equipment)}
            </span>
            <span className="shrink-0 text-accent">
              {t('nightSimple.change')} {filters ? '−' : '+'}
            </span>
          </button>
          {filters && (
            <div className="rounded-2xl border border-hairline p-3">
              <ChipRow label={t('tonight.window')}>
                {PRESETS.map((p) => (
                  <Chip
                    key={p}
                    role="tab"
                    selected={p === preset}
                    onClick={() => useTonightStore.getState().setPreset(p)}
                    testId={`preset-${p}`}
                  >
                    {t(`tonight.preset.${p}`)}
                  </Chip>
                ))}
              </ChipRow>
              {preset === 'custom' && (
                <div
                  className="flex items-center gap-3 py-1 text-body-sm"
                  data-testid="custom-window"
                >
                  <label className="flex items-center gap-1.5">
                    <span className="text-muted">{t('tonight.from')}</span>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={customFrom}
                      onChange={(e) =>
                        useTonightStore.getState().setCustom(Number(e.target.value), customTo)
                      }
                      className={HOUR_INPUT}
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-muted">{t('tonight.to')}</span>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={customTo}
                      onChange={(e) =>
                        useTonightStore.getState().setCustom(customFrom, Number(e.target.value))
                      }
                      className={HOUR_INPUT}
                    />
                  </label>
                </div>
              )}
              <ChipRow label={t('tonight.equipment')}>
                {EQUIPMENT.map((e) => (
                  <Chip
                    key={e}
                    role="tab"
                    tone="success"
                    selected={e === equipment}
                    onClick={() => useTonightStore.getState().setEquipment(e)}
                    testId={`equip-${e}`}
                  >
                    {t(`object.equipment.${e}`)}
                  </Chip>
                ))}
              </ChipRow>
            </div>
          )}
          {d.window && (
            <p
              className="pt-1 pb-3 text-caption text-muted tabular-nums"
              data-testid="window-label"
            >
              {t('tonight.windowLabel', {
                from: formatTime(d.window.from),
                to: formatTime(d.window.to),
              })}
            </p>
          )}
        </>
      )}
      <div
        key={panel}
        role="tabpanel"
        id={'tonight-panel-' + panel}
        aria-labelledby={'tonight-tab-' + panel}
        className="flex flex-col gap-4 pb-5"
      >
        {panel === 'conditions' && (
          <>
            {d.night ? (
              <SkyStatusCard night={d.night} now={d.now} lang={lang} clouds={clouds} />
            ) : (
              <p className="text-body-sm text-muted">{t('common.loading')}</p>
            )}
            {d.night && d.weather && (
              <WeatherCard
                night={d.night}
                weather={d.weather}
                summary={d.weatherSummary}
                window={d.window}
                lang={lang}
              />
            )}
          </>
        )}
        {panel === 'picks' && (
          <>
            {d.weatherSummary && (
              <button
                className="min-h-11 w-full px-1 text-left text-body-sm text-accent"
                onClick={() => setPanel('conditions')}
              >
                {t('nightSimple.conditionsHint')} →
              </button>
            )}
            <RecommendCard
              result={d.result}
              cat={d.cat}
              lang={lang}
              computing={d.computing}
              siteFiltered={d.result?.siteFiltered ?? false}
            />
            <details className="rounded-2xl border border-hairline p-4">
              <summary className="min-h-11 cursor-pointer content-center text-body font-semibold">
                {t('nightSimple.highlights')}
              </summary>
              <HighlightsCard
                result={d.result}
                cat={d.cat}
                lang={lang}
                phenomena={[...d.phenomena, ...d.nextMonthPhenomena]}
                now={d.now}
                showers={d.showers}
              />
            </details>
            <details className="rounded-2xl border border-hairline p-4">
              <summary className="min-h-11 cursor-pointer content-center text-body font-semibold">
                {t('nightSimple.plan')}
              </summary>
              <PlanCard result={d.result} cat={d.cat} lang={lang} />
            </details>
          </>
        )}
        {panel === 'events' && (
          <>
            <PhenomenaCard
              cat={d.cat}
              lang={lang}
              phenomena={d.phenomena}
              nextMonthPhenomena={d.nextMonthPhenomena}
              ym={d.ym}
              showers={d.showers}
              now={d.now}
            />
            <MeteorCard
              showers={d.showers}
              phenomena={d.phenomena}
              nextMonthPhenomena={d.nextMonthPhenomena}
              now={d.now}
              lang={lang}
            />
          </>
        )}
      </div>
    </section>
  );
}
