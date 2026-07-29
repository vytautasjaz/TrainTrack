'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { FormField, FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
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
      <FormField label="Display name">
        <Input name="name" type="text" required maxLength={120} defaultValue={name} />
      </FormField>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">Name saved.</FormMessage>}
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save name'}
      </Button>
    </form>
  )
}
