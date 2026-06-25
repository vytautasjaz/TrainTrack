'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateAthleteName } from '@/app/actions/preferences'

type AthleteNameFormProps = {
  name: string
}

export function AthleteNameForm({ name }: AthleteNameFormProps) {
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
        await updateAthleteName(formData)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save name.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Display name</span>
        <input
          name="name"
          type="text"
          required
          maxLength={120}
          defaultValue={name}
          className="input-field"
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && <p className="text-sm text-green-600">Name saved.</p>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save name'}
      </Button>
    </form>
  )
}
