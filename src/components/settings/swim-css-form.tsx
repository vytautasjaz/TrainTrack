'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Caption } from '@/components/ui/typography'
import { FormField, FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  formatSwimCssSecPer100m,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { updateSwimCss } from '@/app/actions/preferences'

type SwimCssFormProps = {
  preferences: AthletePreferences
}

export function SwimCssForm({ preferences }: SwimCssFormProps) {
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
        await updateSwimCss(formData)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save CSS.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Caption>
        Critical Swim Speed as time per 100m (e.g. 1:35). Used to estimate swim workout duration from
        distance.
      </Caption>
      <FormField label="CSS (per 100m)" hint="Format m:ss — same idea as run pace">
        <Input
          name="swimCss"
          type="text"
          inputMode="text"
          placeholder="1:35"
          defaultValue={formatSwimCssSecPer100m(preferences.swimCssSecPer100m)}
          className="max-w-[8rem]"
        />
      </FormField>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">CSS saved.</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save CSS'}
      </Button>
    </form>
  )
}
