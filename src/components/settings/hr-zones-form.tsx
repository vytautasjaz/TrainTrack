'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { HR_ZONE_FIELDS, type AthletePreferences } from '@/lib/athlete-preferences'
import { updateHrZones } from '@/app/actions/preferences'

type HrZonesFormProps = {
  preferences: AthletePreferences
}

export function HrZonesForm({ preferences }: HrZonesFormProps) {
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
        await updateHrZones(formData)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save HR zones.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set your max and resting heart rate, then the upper limit (bpm) for each zone. Zone 5 is
        everything above Zone 4 up to max HR.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {HR_ZONE_FIELDS.map(({ key, name, label, placeholder }) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <input
              name={name}
              type="number"
              min={1}
              max={250}
              placeholder={placeholder}
              defaultValue={preferences[key] ?? ''}
              className="input-field"
            />
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-green-600">HR zones saved.</p>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save HR zones'}
      </Button>
    </form>
  )
}
