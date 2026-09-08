import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import type { Interval, ObservingNight } from '@/astro/night';
import { dewRisk, hoursIn, type WeatherForecast, type WeatherSummary } from '@/services/weather';
import { Card } from '@/ui/Card';
import { formatDuration, formatTime } from '@/ui/format';

interface Props {
  night: ObservingNight;
  weather: WeatherForecast;
  summary: WeatherSummary | null;
  window: Interval | null;
  lang: Lang;
}

const ROW_HEAD = 'whitespace-nowrap pr-2 text-left font-normal text-muted';

/** 날씨 카드(task-03 §3.5): 관측 창 요약 한 줄 + 시간별 구름(저/중/고) 막대 + 습도·결로·바람. 예보가 없으면 렌더하지 않는다. */
export function WeatherCard(props: Props) {
  const { t } = useTranslation();
  const { night, weather, summary, window: win } = props;
  const hours = hoursIn(
    weather,
    win ?? {
      from: new Date(night.start.getTime() + 6 * 3_600_000),
      to: new Date(night.start.getTime() + 19 * 3_600_000),
    },
  );
  if (!hours.length) return null;
  const cloud = Math.round(hours.reduce((sum, h) => sum + h.cloud, 0) / hours.length);
  const rain = Math.max(...hours.map((h) => h.precipProb));
  const wind = Math.max(...hours.map((h) => h.windKmh));
  const low = Math.round(Math.min(...hours.map((h) => h.tempC))),
    high = Math.round(Math.max(...hours.map((h) => h.tempC)));
  const wet = hours.find(dewRisk);
  const clear = summary?.clearWindow;
  return (
    <section
      data-testid="weather-card"
      className="overflow-hidden rounded-3xl bg-surface p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-caption text-muted">{t('nightRefresh.forecast')}</p>
          <p className="mt-1 text-headline tabular-nums">
            {low === high ? `${low}°` : `${low}–${high}°`}
          </p>
        </div>
        <WeatherGlyph cloud={cloud} size={54} />
      </div>
      <p className="mt-3 text-body font-semibold" data-testid="weather-summary">
        {clear
          ? t('nightRefresh.clear', {
              from: formatTime(clear.from, night.tz),
              to: formatTime(clear.to, night.tz),
            })
          : t('nightRefresh.cloudy')}
      </p>
      <div className="my-4 grid grid-cols-3 gap-2">
        {[
          [t('nightRefresh.cloud'), `${cloud}%`],
          [t('nightRefresh.rain'), `${Math.round(rain)}%`],
          [t('nightRefresh.wind'), `${(wind / 3.6).toFixed(1)} m/s`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-surface-2 px-2 py-3 text-center">
            <p className="text-caption text-muted">{label}</p>
            <p className="mt-1 text-body font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-2"
        data-drag-scroll="off"
        aria-label={t('nightRefresh.hourly')}
      >
        {hours.map((h) => (
          <div
            key={h.at.getTime()}
            className="flex min-w-16 shrink-0 flex-col items-center gap-2 rounded-2xl border border-hairline px-3 py-3"
          >
            <span className="text-caption text-muted">{formatTime(h.at, night.tz)}</span>
            <WeatherGlyph cloud={h.cloud} />
            <span className="text-body-sm font-semibold">{Math.round(h.tempC)}°</span>
            <span data-testid="weather-cloud" className="text-label text-muted">
              {Math.round(h.cloud)}% {t('nightRefresh.cloud')}
            </span>
          </div>
        ))}
      </div>
      {wet && (
        <p data-testid="weather-dew" className="mt-2 text-caption text-danger">
          {t('nightRefresh.dew', { time: formatTime(wet.at, night.tz) })}
        </p>
      )}
      <details className="mt-2" data-testid="weather-details">
        <summary className="flex min-h-11 cursor-pointer items-center text-body-sm font-semibold text-accent">
          {t('nightRefresh.weatherDetails')}{' '}
          <span className="ml-auto" aria-hidden>
            ＋
          </span>
        </summary>
        <WeatherDetails {...props} />
      </details>
      <p className="mt-2 text-label text-muted">
        {t('weather.updated', { time: formatTime(weather.fetchedAt) })} ·{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">
          Open-Meteo
        </a>{' '}
        (CC BY 4.0)
      </p>
    </section>
  );
}
function WeatherGlyph({ cloud, size = 26 }: { cloud: number; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="text-accent"
      aria-hidden="true"
    >
      {cloud < 35 ? (
        <>
          <path d="M25 19A11 11 0 0 1 13 7a10 10 0 1 0 12 12Z" />
          <path d="M24 4v6m-3-3h6" />
        </>
      ) : (
        <>
          <path d="M8 25a6 6 0 1 1 0-12 9 9 0 0 1 17 1 5.5 5.5 0 1 1 0 11Z" />
          {cloud < 70 && <path d="M10 10a7 7 0 0 1 9-6" />}
        </>
      )}
    </svg>
  );
}
function WeatherDetails({ night, weather, summary, window: win, lang }: Props) {
  const { t } = useTranslation();
  const span: Interval = {
    from: new Date(night.start.getTime() + 6 * 3_600_000),
    to: new Date(night.start.getTime() + 19 * 3_600_000),
  };
  const hours = hoursIn(weather, span);
  if (hours.length === 0) return null;
  const summaryText = (() => {
    if (!summary || !win) return null;
    if (summary.clearWindow) {
      const cw = summary.clearWindow;
      return t('weather.summaryClear', {
        from: formatTime(cw.from),
        to: formatTime(cw.to),
        cloud: Math.round(summary.minCloud),
      });
    }
    return t('weather.summaryCloudy', { cloud: Math.round(summary.meanCloud) });
  })();
  const dewHours = hours.filter(dewRisk);
  const maxWind = Math.max(...hours.map((h) => h.windKmh));
  const maxPrecip = Math.max(...hours.map((h) => h.precipProb));

  return (
    <Card
      title={t('weather.title')}
      aside={t('weather.updated', { time: formatTime(weather.fetchedAt) })}
      testId="weather-details-card"
    >
      {summaryText && <p className="text-body font-semibold">{summaryText}</p>}
      <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full border-separate border-spacing-0 text-label tabular-nums">
          <thead>
            <tr className="text-muted">
              <th className="w-10 pr-2 text-left font-normal" scope="row" />
              {hours.map((h) => (
                <th
                  key={h.at.getTime()}
                  className="min-w-6 pb-1 text-center font-normal"
                  scope="col"
                >
                  {formatTime(h.at).slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['cloudHigh', 'cloudMid', 'cloudLow'] as const).map((k) => (
              <tr key={k}>
                <th className={ROW_HEAD} scope="row">
                  {t(`weather.${k}`)}
                </th>
                {hours.map((h) => (
                  <td key={h.at.getTime()} className="p-0.5">
                    <div
                      className="mx-auto h-3 w-full rounded-xs"
                      style={{ background: 'var(--fg)', opacity: 0.08 + 0.8 * (h[k] / 100) }}
                      title={`${h[k]}%`}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className={ROW_HEAD} scope="row">
                {t('weather.cloud')}
              </th>
              {hours.map((h) => (
                <td key={h.at.getTime()} className="pt-1 text-center text-caption">
                  {Math.round(h.cloud)}
                </td>
              ))}
            </tr>
            <tr>
              <th className={ROW_HEAD} scope="row">
                {t('weather.humidity')}
              </th>
              {hours.map((h) => (
                <td
                  key={h.at.getTime()}
                  className={`text-center text-caption ${dewRisk(h) ? 'font-semibold text-danger' : ''}`}
                >
                  {Math.round(h.humidity)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
        {dewHours.length > 0 && (
          <li className="font-medium text-danger">
            <span aria-hidden>● </span>
            {t('weather.dew', { from: formatTime(dewHours[0]!.at), n: dewHours.length })}
          </li>
        )}
        <li>{t('weather.wind', { kmh: Math.round(maxWind) })}</li>
        {maxPrecip > 0 && <li>{t('weather.precip', { p: Math.round(maxPrecip) })}</li>}
        {summary && summary.dewRiskHours > 0 && win && (
          <li>
            {t('weather.dewInWindow', { dur: formatDuration(summary.dewRiskHours * 60, lang) })}
          </li>
        )}
      </ul>
      <p className="mt-2 text-label text-muted">Weather data by Open-Meteo.com (CC BY 4.0)</p>
    </Card>
  );
}
