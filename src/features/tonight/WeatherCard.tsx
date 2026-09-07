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

/** 날씨 카드(task-03 §3.5): 관측 창 요약 한 줄 + 시간별 구름(저/중/고) 막대 + 습도·결로·바람. 예보가 없으면 렌더하지 않는다. */
export function WeatherCard({ night, weather, summary, window: win, lang }: Props) {
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
    <Card title={t('weather.title')} aside={t('weather.updated', { time: formatTime(weather.fetchedAt) })} testId="weather-card">
      {summaryText && (
        <p className="text-[15px] font-semibold" data-testid="weather-summary">
          {summaryText}
        </p>
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[11px]">
          <thead>
            <tr className="text-muted">
              <th className="w-10 pr-1 text-left font-normal" scope="row" />
              {hours.map((h) => (
                <th key={h.at.getTime()} className="min-w-6 text-center font-mono font-normal" scope="col">
                  {formatTime(h.at).slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['cloudHigh', 'cloudMid', 'cloudLow'] as const).map((k) => (
              <tr key={k}>
                <th className="pr-1 text-left font-normal text-muted" scope="row">
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
              <th className="pr-1 text-left font-normal text-muted" scope="row">
                {t('weather.cloud')}
              </th>
              {hours.map((h) => (
                <td key={h.at.getTime()} className="text-center font-mono" data-testid="weather-cloud">
                  {Math.round(h.cloud)}
                </td>
              ))}
            </tr>
            <tr>
              <th className="pr-1 text-left font-normal text-muted" scope="row">
                {t('weather.humidity')}
              </th>
              {hours.map((h) => (
                <td key={h.at.getTime()} className="text-center font-mono" style={{ color: dewRisk(h) ? 'var(--danger)' : undefined }}>
                  {Math.round(h.humidity)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {dewHours.length > 0 && (
          <li style={{ color: 'var(--danger)' }} data-testid="weather-dew">
            {t('weather.dew', { from: formatTime(dewHours[0]!.at), n: dewHours.length })}
          </li>
        )}
        <li>{t('weather.wind', { kmh: Math.round(maxWind) })}</li>
        {maxPrecip > 0 && <li>{t('weather.precip', { p: Math.round(maxPrecip) })}</li>}
        {summary && summary.dewRiskHours > 0 && win && (
          <li>{t('weather.dewInWindow', { dur: formatDuration(summary.dewRiskHours * 60, lang) })}</li>
        )}
      </ul>
      <p className="mt-2 text-[10px] text-muted">Weather data by Open-Meteo.com (CC BY 4.0)</p>
    </Card>
  );
}
