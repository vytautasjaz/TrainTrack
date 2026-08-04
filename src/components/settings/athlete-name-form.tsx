'use client'

import { useState, useTransition } from 'react'
import { Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { updateAthleteName } from '@/app/actions/preferences'

type AthleteNameFormProps = {
  name: string
  /** Inline: show name + Edit; expand to save form when editing. */
  mode?: 'form' | 'inline'
}

export function AthleteNameForm({ name, mode = 'form' }: AthleteNameFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(name)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const formData = new FormData(e.currentTarget)
    const next = ((formData.get('name') as string) ?? '').trim()
    startTransition(async () => {
      try {
        await updateAthleteName(formData)
        setDisplayName(next || displayName)
        setSaved(true)
        if (mode === 'inline') setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save name.')
      }
    })
  }

  if (mode === 'inline' && !editing) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p className="min-w-0 truncate text-base font-semibold text-foreground">
          {displayName}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-muted-foreground"
          onClick={() => {
            setError(null)
            setSaved(false)
            setEditing(true)
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
    )
  }

  const fields = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        name="name"
        type="text"
        required
        maxLength={120}
        defaultValue={displayName}
        className="sm:flex-1"
        autoFocus={mode === 'inline'}
        aria-label="Display name"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        {mode === 'inline' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setEditing(false)
              setError(null)
            }}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === 'inline' ? fields : <FormField label="Display name">{fields}</FormField>}
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && mode !== 'inline' && (
        <FormMessage variant="success">Name saved.</FormMessage>
      )}
    </form>
  )
}
