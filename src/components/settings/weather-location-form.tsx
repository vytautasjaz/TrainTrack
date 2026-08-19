'use client'

import { useState, useTransition } from 'react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import { WeatherLocationSearch } from '@/components/weather/weather-location-search'
import {
  updateAthleteShowWeather,
  updateAthleteWeatherLocation,
} from '@/app/actions/preferences'
import type { WeatherPlace } from '@/lib/weather/places'
import { WeatherGlyph } from '@/components/weather/weather-glyph'
import { FormError } from '@/components/ui/form-error'
import { toUserMessage } from '@/lib/action-error'
import { cn } from '@/lib/utils'

type WeatherLocationFormProps = {
  initial: {
    name: string | null
    lat: number | null
    lon: number | null
  }
  showWeather?: boolean
}

const WEATHER_PREVIEW = [
  { label: 'Morning', glyph: 'clear-day', temp: '14°' },
  { label: 'Day', glyph: 'partly-cloudy-day', temp: '19°', precip: '15%' },
  { label: 'Evening', glyph: 'rain', temp: '16°', precip: '55%' },
] as const

export function WeatherLocationForm({
  initial,
  showWeather: showWeatherInitial = true,
}: WeatherLocationFormProps) {
  const [name, setName] = useState(initial.name ?? '')
  const [lat, setLat] = useState(initial.lat != null ? String(initial.lat) : '')
  const [lon, setLon] = useState(initial.lon != null ? String(initial.lon) : '')
  const [showWeather, setShowWeather] = useState(showWeatherInitial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const selected = name && lat && lon ? name : null

  function applyPlace(place: WeatherPlace) {
    setName(place.label)
    setLat(String(place.lat))
    setLon(String(place.lon))
  }

  function selectShowWeather(next: boolean) {
    if (next === showWeather) return
    setShowWeather(next)
    setError(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('showWeather', next ? '1' : '0')
        await updateAthleteShowWeather(formData)
      } catch (err) {
        setShowWeather(!next)
        setError(toUserMessage(err, 'Could not update weather preference'))
      }
    })
  }

  return (
    <section className="card-elevated space-y-4 p-5">
      <FormError message={error} />
      <div>
        <SectionTitle variant="ui">Weather</SectionTitle>
        <Caption>
          Forecast shows above workouts by default. You can hide it here, and still turn it on for
          this session in week view.
        </Caption>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground">Show weather above workouts</p>
        <SegmentedControl aria-label="Show weather above workouts" className="w-full sm:w-auto">
          <SegmentedControlItem
            type="button"
            active={showWeather}
            disabled={isPending}
            onClick={() => selectShowWeather(true)}
            className={cn('flex-1 px-3 sm:flex-none')}
          >
            On
          </SegmentedControlItem>
          <SegmentedControlItem
            type="button"
            active={!showWeather}
            disabled={isPending}
            onClick={() => selectShowWeather(false)}
            className={cn('flex-1 px-3 sm:flex-none')}
          >
            Off
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-foreground">Weather icons</p>
          <p className="text-xs text-muted-foreground">
            Meteocons monochrome style — used in week views above your workouts.
          </p>
        </div>
        <div className="rounded-md border border-border/70 bg-card p-2.5">
          <div className="space-y-1">
            {WEATHER_PREVIEW.map((slot) => (
              <div
                key={slot.label}
                className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-[11px]"
              >
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <WeatherGlyph
                    glyph={slot.glyph}
                    detail={`${slot.label} ${slot.temp}${'precip' in slot && slot.precip ? ` ${slot.precip}` : ''}`}
                    className="h-7 w-7"
                  />
                  {slot.label}
                </span>
                <span className="tabular-nums text-foreground/80">
                  {slot.temp}
                  {'precip' in slot && slot.precip ? ` · ${slot.precip}` : ''}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Icons by{' '}
            <a
              href="https://meteocons.com/"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              Meteocons
            </a>{' '}
            (MIT)
          </p>
        </div>
      </div>
      <form
        action={(formData) => {
          setError(null)
          startTransition(async () => {
            try {
              await updateAthleteWeatherLocation(formData)
            } catch (err) {
              setError(toUserMessage(err, 'Could not save weather location'))
            }
          })
        }}
        className="space-y-3"
      >
        <p className="text-xs font-medium text-foreground">Default location</p>
        <input type="hidden" name="weatherLocationName" value={name} />
        <input type="hidden" name="weatherLat" value={lat} />
        <input type="hidden" name="weatherLon" value={lon} />
        <WeatherLocationSearch selectedLabel={selected} onSelect={applyPlace} />
        {selected ? (
          <p className="text-sm text-foreground">
            {name}
            <span className="ml-2 text-xs text-muted-foreground">
              {Number(lat).toFixed(3)}, {Number(lon).toFixed(3)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No default location set.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={!lat || !lon || isPending}
            className="h-9 rounded-md bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-95 disabled:opacity-40"
          >
            {isPending ? 'Saving…' : 'Save location'}
          </button>
          {selected ? (
            <button
              type="submit"
              name="intent"
              value="clear"
              disabled={isPending}
              className="h-9 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
