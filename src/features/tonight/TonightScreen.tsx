import { useTranslation } from 'react-i18next';
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

/** "오늘 밤" 탭(task-03 §3.7): ① 하늘 상태 ② 날씨 ③ 하이라이트 ④ 추천 ⑤ 계획 ⑥ 이달의 현상 ⑦ 유성우 */
export function TonightScreen() {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const preset = useTonightStore((s) => s.preset);
  const equipment = useTonightStore((s) => s.equipment);
  const customFrom = useTonightStore((s) => s.customFromHour);
  const customTo = useTonightStore((s) => s.customToHour);
  const d = useTonight();
  const clouds =
    d.weather && d.night
      ? hoursIn(d.weather, { from: new Date(d.night.start.getTime() + 5 * 3_600_000), to: d.night.end }).map((h) => ({ at: h.at, cloud: h.cloud }))
      : undefined;

  return (
    <section className="h-full overflow-y-auto px-4 pb-8 pt-3" data-testid="tonight-screen">
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-[22px] font-bold tracking-tight">{t('tonight.title')}</h1>
        <span className="text-xs text-muted">{d.siteName}</span>
      </div>

      <ChipRow label={t('tonight.window')}>
        {PRESETS.map((p) => (
          <Chip key={p} role="tab" selected={p === preset} onClick={() => useTonightStore.getState().setPreset(p)} testId={`preset-${p}`}>
            {t(`tonight.preset.${p}`)}
          </Chip>
        ))}
      </ChipRow>
      {preset === 'custom' && (
        <div className="mt-1 flex items-center gap-2 text-sm" data-testid="custom-window">
          <label className="flex items-center gap-1">
            <span className="text-muted">{t('tonight.from')}</span>
            <input
              type="number"
              min={0}
              max={23}
              value={customFrom}
              onChange={(e) => useTonightStore.getState().setCustom(Number(e.target.value), customTo)}
              className="w-14 rounded-sm border border-border bg-surface px-2 py-1 text-center font-mono"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted">{t('tonight.to')}</span>
            <input
              type="number"
              min={0}
              max={23}
              value={customTo}
              onChange={(e) => useTonightStore.getState().setCustom(customFrom, Number(e.target.value))}
              className="w-14 rounded-sm border border-border bg-surface px-2 py-1 text-center font-mono"
            />
          </label>
        </div>
      )}
      <ChipRow label={t('tonight.equipment')} className="mb-2">
        {EQUIPMENT.map((e) => (
          <Chip key={e} role="tab" tone="success" selected={e === equipment} onClick={() => useTonightStore.getState().setEquipment(e)} testId={`equip-${e}`}>
            {t(`object.equipment.${e}`)}
          </Chip>
        ))}
      </ChipRow>
      {d.window && (
        <p className="mb-3 text-xs text-muted" data-testid="window-label">
          {t('tonight.windowLabel', { from: formatTime(d.window.from), to: formatTime(d.window.to) })}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {d.night ? <SkyStatusCard night={d.night} now={d.now} lang={lang} clouds={clouds} /> : <p className="text-sm text-muted">{t('common.loading')}</p>}
        {d.night && d.weather && (
          <WeatherCard night={d.night} weather={d.weather} summary={d.weatherSummary} window={d.window} lang={lang} />
        )}
        <HighlightsCard result={d.result} cat={d.cat} lang={lang} phenomena={[...d.phenomena, ...d.nextMonthPhenomena]} now={d.now} showers={d.showers} />
        <RecommendCard result={d.result} cat={d.cat} lang={lang} computing={d.computing} siteFiltered={d.result?.siteFiltered ?? false} />
        <PlanCard result={d.result} cat={d.cat} lang={lang} />
        <PhenomenaCard cat={d.cat} lang={lang} phenomena={d.phenomena} nextMonthPhenomena={d.nextMonthPhenomena} ym={d.ym} showers={d.showers} now={d.now} />
        <MeteorCard showers={d.showers} phenomena={d.phenomena} nextMonthPhenomena={d.nextMonthPhenomena} now={d.now} lang={lang} />
      </div>
    </section>
  );
}
