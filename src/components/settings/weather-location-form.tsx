'use client'

import { useState, useTransition } from 'react'
import { MapPin } from 'lucide-react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { WeatherLocationSearch } from '@/components/weather/weather-location-search'
import {
  updateAthleteShowWeather,
  updateAthleteWeatherLocation,
} from '@/app/actions/preferences'
import type { WeatherPlace } from '@/lib/weather/places'
import { FormError } from '@/components/ui/form-error'
import { toUserMessage } from '@/lib/action-error'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { cn } from '@/lib/utils'

type WeatherLocationFormProps = {
  initial: {
    name: string | null
    lat: number | null
    lon: number | null
  }
  showWeather?: boolean
  embedded?: boolean
}

export function WeatherLocationForm({
  initial,
  showWeather: showWeatherInitial = true,
  embedded = false,
}: WeatherLocationFormProps) {
  const [name, setName] = useState(initial.name ?? '')
  const [lat, setLat] = useState(initial.lat != null ? String(initial.lat) : '')
  const [lon, setLon] = useState(initial.lon != null ? String(initial.lon) : '')
  const [savedName, setSavedName] = useState(initial.name ?? '')
  const [savedLat, setSavedLat] = useState(
    initial.lat != null ? String(initial.lat) : '',
  )
  const [savedLon, setSavedLon] = useState(
    initial.lon != null ? String(initial.lon) : '',
  )
  const [showWeather, setShowWeather] = useState(showWeatherInitial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selected = name && lat && lon ? name : null
  const hasSavedLocation = Boolean(savedName && savedLat && savedLon)
  const isDirty =
    name !== savedName || lat !== savedLat || lon !== savedLon

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

  const currentLocationCard = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[8px] border px-3 py-3',
        hasSavedLocation
          ? 'border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)]/70'
          : 'border-dashed border-[var(--tt-line-strong,#d9d9d9)] bg-transparent',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          hasSavedLocation
            ? 'bg-[var(--tt-ink,#111)] text-white'
            : 'bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink-faint,#9a9a9a)]',
        )}
      >
        <MapPin className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
          Current location
        </p>
        {hasSavedLocation ? (
          <>
            <p className="mt-0.5 text-[15px] font-semibold leading-snug text-[var(--tt-ink,#111)]">
              {savedName}
            </p>
            <p className="mt-0.5 text-[12px] tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
              {Number(savedLat).toFixed(3)}, {Number(savedLon).toFixed(3)}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
            No location set yet
          </p>
        )}
        {isDirty && selected ? (
          <p className="mt-1 text-[12px] font-medium text-[var(--tt-ink,#111)]">
            Pending: {name}
          </p>
        ) : null}
      </div>
    </div>
  )

  const locationForm = (
    <form
      action={(formData) => {
        setError(null)
        const intent = String(formData.get('intent') ?? 'save')
        startTransition(async () => {
          try {
            await updateAthleteWeatherLocation(formData)
            if (intent === 'clear') {
              setName('')
              setLat('')
              setLon('')
              setSavedName('')
              setSavedLat('')
              setSavedLon('')
            } else {
              setSavedName(name)
              setSavedLat(lat)
              setSavedLon(lon)
            }
          } catch (err) {
            setError(toUserMessage(err, 'Could not save weather location'))
          }
        })
      }}
      className="space-y-3"
    >
      {currentLocationCard}
      <input type="hidden" name="weatherLocationName" value={name} />
      <input type="hidden" name="weatherLat" value={lat} />
      <input type="hidden" name="weatherLon" value={lon} />
      <WeatherLocationSearch
        selectedLabel={selected}
        placeholder={hasSavedLocation ? 'Change location…' : 'Search for a city…'}
        onSelect={applyPlace}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="intent"
          value="save"
          disabled={!lat || !lon || isPending || !isDirty}
          className={cn(
            'h-9 rounded-[8px] bg-[var(--tt-ink,#111)] px-3 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40',
          )}
        >
          {isPending ? 'Saving…' : 'Save location'}
        </button>
        {hasSavedLocation || selected ? (
          <button
            type="submit"
            name="intent"
            value="clear"
            disabled={isPending}
            className="h-9 rounded-[8px] border border-[var(--tt-line,#ebebeb)] px-3 text-[13px] font-medium text-[var(--tt-ink-soft,#6b6b6b)] transition hover:text-[var(--tt-ink,#111)] disabled:opacity-40"
          >
            Clear
          </button>
        ) : null}
      </div>
    </form>
  )

  const visibility = (
    <label className="tt-integration-check">
      <input
        type="checkbox"
        checked={showWeather}
        disabled={isPending}
        onChange={(e) => selectShowWeather(e.target.checked)}
        className="h-4 w-4 rounded border-[var(--tt-line,#ebebeb)]"
      />
      <span>Show on Training plan</span>
    </label>
  )

  if (embedded) {
    return (
      <>
        <FormError message={error} />
        <SettingsPanel
          id="weather-visibility"
          title="Weather"
          description="Forecast data from yr.no (Norwegian Meteorological Institute)."
        >
          {visibility}
        </SettingsPanel>
        <SettingsPanel id="weather-location" title="Location">
          {locationForm}
        </SettingsPanel>
      </>
    )
  }

  return (
    <section className="card-elevated space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Weather</SectionTitle>
        <Caption>
          Forecast above workouts on your plan. Data from{' '}
          <a
            href="https://www.yr.no"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            yr.no
          </a>
          .
        </Caption>
      </div>
      <FormError message={error} />
      {visibility}
      {locationForm}
    </section>
  )
}
