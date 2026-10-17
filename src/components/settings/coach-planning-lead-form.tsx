'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { updateCoachPlanningLeadDays } from '@/app/actions/preferences'

type CoachPlanningLeadFormProps = {
  planningLeadDays: number
  /** Compact control for a settings pref row. */
  compact?: boolean
}

export function CoachPlanningLeadForm({
  planningLeadDays,
  compact = false,
}: CoachPlanningLeadFormProps) {
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
        await updateCoachPlanningLeadDays(formData)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save.')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-3'}
    >
      <div className="flex items-center gap-2">
        <Input
          name="planningLeadDays"
          type="number"
          min={1}
          max={30}
          required
          defaultValue={planningLeadDays}
          className="w-20"
          aria-label="Planning lead days"
        />
        <span className="text-sm text-muted-foreground">days</span>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save'}
      </Button>
      {saved ? <FormMessage variant="success">Saved</FormMessage> : null}
      {error ? <FormMessage variant="error">{error}</FormMessage> : null}
    </form>
  )
}
