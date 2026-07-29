'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Caption } from '@/components/ui/typography'
import { FormField, FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  BIKE_SPEED_ZONE_FIELDS,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { updateBikeSpeedZones } from '@/app/actions/preferences'

type BikeSpeedZonesFormProps = {
  preferences: AthletePreferences
}

function formatBikeSpeed(value: number | null | undefined): string {
  if (value == null || value <= 0) return ''
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function BikeSpeedZonesForm({ preferences }: BikeSpeedZonesFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateBikeSpeedZones(formData)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save bike speeds.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Caption>
        Enter bike speeds in km/h for each intensity. Used to estimate bike duration and distance.
        FTP powers %FTP intensity targets in the workout builder.
      </Caption>
      <FormField label="FTP (watts)" hint="Functional Threshold Power — used for % FTP targets">
        <Input
          name="bikeFtpWatts"
          type="number"
          min={50}
          max={600}
          inputMode="numeric"
          placeholder="250"
          defaultValue={preferences.bikeFtpWatts ?? ''}
          className="max-w-[8rem]"
        />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        {BIKE_SPEED_ZONE_FIELDS.map(({ key, name, label }) => (
          <FormField key={key} label={label}>
            <Input
              name={name}
              type="text"
              inputMode="decimal"
              placeholder="28.0"
              defaultValue={formatBikeSpeed(preferences[key])}
            />
          </FormField>
        ))}
      </div>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">Bike settings saved.</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save bike settings'}
      </Button>
    </form>
  )
}
