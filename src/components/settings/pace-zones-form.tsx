'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  formatPaceMinPerKm,
  PACE_ZONE_FIELDS,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { updatePaceZones } from '@/app/actions/preferences'

type PaceZonesFormProps = {
  preferences: AthletePreferences
}

export function PaceZonesForm({ preferences }: PaceZonesFormProps) {
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
        await updatePaceZones(formData)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save paces.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your target paces in min/km (e.g. 5:30). These can later be used to estimate workout
        duration from distance.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {PACE_ZONE_FIELDS.map(({ key, name, label }) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <input
              name={name}
              type="text"
              inputMode="decimal"
              placeholder="5:30"
              defaultValue={formatPaceMinPerKm(preferences[key])}
              className="input-field"
            />
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-green-600">Paces saved.</p>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save paces'}
      </Button>
    </form>
  )
}
