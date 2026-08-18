'use client'

import { useState, useTransition } from 'react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { WeatherLocationSearch } from '@/components/weather/weather-location-search'
import { updateAthleteWeatherLocation } from '@/app/actions/preferences'
import type { WeatherPlace } from '@/lib/weather/places'

type WeatherLocationFormProps = {
  initial: {
    name: string | null
    lat: number | null
    lon: number | null
  }
}

export function WeatherLocationForm({ initial }: WeatherLocationFormProps) {
  const [name, setName] = useState(initial.name ?? '')
  const [lat, setLat] = useState(initial.lat != null ? String(initial.lat) : '')
  const [lon, setLon] = useState(initial.lon != null ? String(initial.lon) : '')
  const [isPending, startTransition] = useTransition()
  const selected = name && lat && lon ? name : null

  function applyPlace(place: WeatherPlace) {
    setName(place.label)
    setLat(String(place.lat))
    setLon(String(place.lon))
  }

  return (
    <section className="card-elevated space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Default weather location</SectionTitle>
        <Caption>
          Search Yr.no places and pick one. Used for week planning and dashboard forecasts. You can
          still override location in week view.
        </Caption>
      </div>
      <form
        action={(formData) => {
          startTransition(async () => {
            await updateAthleteWeatherLocation(formData)
          })
        }}
        className="space-y-3"
      >
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
