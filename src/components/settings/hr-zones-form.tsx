'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Caption } from '@/components/ui/typography'
import { FormField, FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
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
      <Caption>
        Set your max and resting heart rate, then the upper limit (bpm) for each zone. Zone 5 is
        everything above Zone 4 up to max HR.
      </Caption>
      <div className="grid gap-3 sm:grid-cols-2">
        {HR_ZONE_FIELDS.map(({ key, name, label, placeholder }) => (
          <FormField key={key} label={label}>
            <Input
              name={name}
              type="number"
              min={1}
              max={250}
              placeholder={placeholder}
              defaultValue={preferences[key] ?? ''}
            />
          </FormField>
        ))}
      </div>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">HR zones saved.</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save HR zones'}
      </Button>
    </form>
  )
}
