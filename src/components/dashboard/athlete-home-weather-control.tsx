'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ListDayWeatherStrip } from '@/components/weather/list-day-weather'
import { WeekWeatherLocationControl } from '@/components/weather/week-weather-location-control'
import { updateAthleteWeatherLocation } from '@/app/actions/preferences'
import type { WeatherDaySummary, WeatherPlace } from '@/lib/weather/places'
import { cn } from '@/lib/utils'

type AthleteHomeWeatherControlProps = {
  weather: WeatherDaySummary | null
  locationName: string | null
  hasCoords: boolean
  className?: string
  tone?: 'light' | 'dark'
}

export function AthleteHomeWeatherControl({
  weather,
  locationName,
  hasCoords,
  className,
  tone = 'light',
}: AthleteHomeWeatherControlProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const dark = tone === 'dark'

  function savePlace(place: WeatherPlace) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('weatherLocationName', place.label)
      formData.set('weatherLat', String(place.lat))
      formData.set('weatherLon', String(place.lon))
      await updateAthleteWeatherLocation(formData)
      router.refresh()
    })
  }

  return (
    <div
      className={cn(
        'flex max-w-full flex-nowrap items-center justify-end gap-2',
        pending && 'opacity-70',
        className,
      )}
    >
      {weather ? (
        <ListDayWeatherStrip weather={weather} size="lg" />
      ) : hasCoords ? (
        <p
          className={cn(
            'shrink-0 text-[11px]',
            dark ? 'text-white/55' : 'text-[var(--tt-ink-faint,#9a9a9a)]',
          )}
        >
          Forecast unavailable
        </p>
      ) : (
        <p
          className={cn(
            'shrink-0 text-[11px]',
            dark ? 'text-white/55' : 'text-[var(--tt-ink-faint,#9a9a9a)]',
          )}
        >
          No forecast yet
        </p>
      )}
      <span
        className={cn(
          'mx-0.5 h-1 w-1 shrink-0 rounded-full',
          dark ? 'bg-white/30' : 'bg-[var(--tt-line-strong,#ddd)]',
        )}
        aria-hidden
      />
      <WeekWeatherLocationControl
        location={
          locationName
            ? { name: locationName }
            : hasCoords
              ? { name: 'Weather location' }
              : null
        }
        onSelect={savePlace}
        align="end"
        className={cn(
          'shrink-0 text-[12px]',
          dark
            ? 'text-white/70 decoration-white/30 hover:text-white'
            : 'text-[var(--tt-ink-soft,#6b6b6b)] decoration-[var(--tt-line-strong,#ddd)] hover:text-[var(--tt-ink,#111)]',
        )}
      />
    </div>
  )
}
