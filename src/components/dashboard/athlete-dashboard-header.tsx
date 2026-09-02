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
    <>
      {/* Mobile — dark greeting hero (matches coach home) */}
      <header className="tt-home-mobile-hero md:hidden" data-home-hero>
        <div className="tt-home-mobile-hero-inner space-y-3">
          <div className="min-w-0">
            <h1 className="tt-home-mobile-hero-greeting">
              <span className="block">{greeting},</span>
              <span className="tt-home-mobile-hero-name">{name}</span>
            </h1>
            <p className="tt-home-mobile-hero-sub">
              Here&apos;s your training for today.
            </p>
          </div>
          {showWeather ? (
            <AthleteHomeWeatherControl
              weather={todayWeather}
              locationName={weatherLocationName}
              hasCoords={hasWeatherCoords}
              tone="dark"
              className="justify-start overflow-x-auto"
            />
          ) : null}
        </div>
      </header>

      {/* Desktop — compact greeting row */}
      <header
        className="mb-4 hidden flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-1 md:flex lg:pt-2"
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
    </>
  )
}
