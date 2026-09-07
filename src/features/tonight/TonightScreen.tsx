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

const HOUR_INPUT =
  'min-h-9 w-16 rounded-pill bg-surface-2 px-2 text-center text-body-sm font-medium tabular-nums outline-none transition-[background-color,box-shadow] duration-150 focus:bg-surface-3 focus-visible:shadow-[0_0_0_2px_var(--accent-glow)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/**
 * "오늘 밤" 탭(task-03 §3.7): ① 하늘 상태 ② 날씨 ③ 하이라이트 ④ 추천 ⑤ 계획 ⑥ 이달의 현상 ⑦ 유성우
 * 루트는 위·아래 여백을 두지 않는다 — App이 탭 라우트를 pt-status/pb-tab 스크롤 컨테이너로 감싼다.
 */
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
      ? hoursIn(d.weather, {
          from: new Date(d.night.start.getTime() + 5 * 3_600_000),
          to: d.night.end,
        }).map((h) => ({ at: h.at, cloud: h.cloud }))
      : undefined;

  return (
    <section className="px-4" data-testid="tonight-screen">
      <div className="flex items-baseline justify-between gap-3 pt-2 pb-1">
        <h1 className="text-headline">{t('tonight.title')}</h1>
        <span className="min-w-0 truncate text-caption text-muted">{d.siteName}</span>
      </div>

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
        <div className="flex items-center gap-3 py-1 text-body-sm" data-testid="custom-window">
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
      {d.window && (
        <p className="pt-1 pb-3 text-caption text-muted tabular-nums" data-testid="window-label">
          {t('tonight.windowLabel', {
            from: formatTime(d.window.from),
            to: formatTime(d.window.to),
          })}
        </p>
      )}

      <div className="flex flex-col gap-3">
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
        <HighlightsCard
          result={d.result}
          cat={d.cat}
          lang={lang}
          phenomena={[...d.phenomena, ...d.nextMonthPhenomena]}
          now={d.now}
          showers={d.showers}
        />
        <RecommendCard
          result={d.result}
          cat={d.cat}
          lang={lang}
          computing={d.computing}
          siteFiltered={d.result?.siteFiltered ?? false}
        />
        <PlanCard result={d.result} cat={d.cat} lang={lang} />
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
      </div>
    </section>
  );
}
