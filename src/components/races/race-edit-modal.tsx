'use client'

import { Save } from 'lucide-react'
import { updateRace } from '@/app/actions/workouts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RaceDetailsFields,
  type RaceFormInitialValues,
} from '@/components/races/race-details-fields'
import type { SeasonRace } from '@/lib/season-races'

function raceToInitial(race: SeasonRace): RaceFormInitialValues {
  return {
    name: race.name,
    date: race.date.toISOString().slice(0, 10),
    location: race.location,
    goal: race.goal,
    url: race.url,
    preparationWeeks: race.preparationWeeks,
    priority: race.priority,
    intent: race.intent,
    sport: race.sport,
    type: race.type,
    courseType: race.courseType,
    triathlonDistance: race.triathlonDistance,
    customDistanceKm: race.customDistanceKm,
    legs: race.legs,
    raceId: race.id,
  }
}

type RaceEditModalProps = {
  race: SeasonRace | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
  returnTo?: string
}

export function RaceEditModal({
  race,
  open,
  onOpenChange,
  onSaved,
  returnTo = '/races',
}: RaceEditModalProps) {
  if (!race) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[42rem] flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Edit race</DialogTitle>
        <DialogDescription className="sr-only">
          Edit {race.name}
        </DialogDescription>

        <form
          action={async (formData) => {
            await updateRace(formData)
            onSaved?.()
            onOpenChange(false)
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="raceId" value={race.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="skipRedirect" value="1" />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {open ? (
              <RaceDetailsFields
                key={race.id}
                initial={raceToInitial(race)}
                showIntent={false}
                showSummary
                heroFlush
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {'< Back'}
            </Button>
            <Button type="submit" variant="brand" size="sm">
              <Save className="h-3.5 w-3.5" />
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
