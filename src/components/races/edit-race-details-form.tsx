'use client'

import { useTransition } from 'react'
import { Save } from 'lucide-react'
import { updateRace } from '@/app/actions/workouts'
import { Button } from '@/components/ui/button'
import {
  RaceDetailsFields,
  type RaceFormInitialValues,
} from '@/components/races/race-details-fields'

type EditRaceDetailsFormProps = {
  raceId: string
  returnTo: string
  initial: RaceFormInitialValues
}

export function EditRaceDetailsForm({
  raceId,
  returnTo,
  initial,
}: EditRaceDetailsFormProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await updateRace(formData)
        })
      }}
      className="overflow-hidden rounded-[10px] border border-border/70 bg-card shadow-sm"
    >
      <input type="hidden" name="raceId" value={raceId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <RaceDetailsFields
        initial={initial}
        showIntent={false}
        showSummary
        heroFlush
      />
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
        <Button type="submit" variant="brand" size="sm" disabled={isPending}>
          <Save className="h-3.5 w-3.5" />
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
