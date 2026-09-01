import { AthleteHomeWeatherControl } from '@/components/dashboard/athlete-home-weather-control'
import type { WeatherDaySummary } from '@/lib/weather/places'

type AthleteDashboardHeaderProps = {
  greeting: string
  name: string
  showWeather?: boolean
  todayWeather?: WeatherDaySummary | null
  weatherLocationName?: string | null
  hasWeatherCoords?: boolean
}

export function AthleteDashboardHeader({
  greeting,
  name,
  showWeather = false,
  todayWeather = null,
  weatherLocationName = null,
  hasWeatherCoords = false,
}: AthleteDashboardHeaderProps) {
  return (
    <header
      className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-1 lg:pt-2"
      data-page-header
    >
      <p className="min-w-0 text-[0.8rem] font-medium uppercase leading-snug tracking-[0.04em] text-[var(--tt-ink-soft,#6b6b6b)]">
        {greeting},{' '}
        <span className="font-semibold text-[var(--tt-ink,#111)]">{name}</span>
      </p>
      {showWeather ? (
        <AthleteHomeWeatherControl
          weather={todayWeather}
          locationName={weatherLocationName}
          hasCoords={hasWeatherCoords}
        />
      ) : null}
    </header>
  )
}
