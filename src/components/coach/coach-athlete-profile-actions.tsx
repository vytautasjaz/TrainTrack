'use client'

import { useState, useTransition } from 'react'
import { CalendarRange, Pencil } from 'lucide-react'
import type { AthleteStatus, WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { CoachEditAthleteModal } from '@/components/coach/coach-edit-athlete-modal'
import { selectAthleteForTraining } from '@/app/actions/athletes'
import type { AthletePreferences } from '@/lib/athlete-preferences'

type CoachAthleteProfileActionsProps = {
  athlete: {
    id: string
    name: string
    status: AthleteStatus
    preferences: AthletePreferences
    planSportRows: WorkoutType[]
  }
}

export function CoachAthleteProfileActions({ athlete }: CoachAthleteProfileActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [trainingPending, startTrainingTransition] = useTransition()

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <form
          action={(formData) => {
            startTrainingTransition(async () => {
              await selectAthleteForTraining(formData)
            })
          }}
        >
          <input type="hidden" name="athleteId" value={athlete.id} />
          <Button type="submit" variant="secondary" size="sm" disabled={trainingPending}>
            <CalendarRange className="h-3.5 w-3.5" />
            {trainingPending ? 'Opening…' : 'Training'}
          </Button>
        </form>
      </div>
      <CoachEditAthleteModal athlete={athlete} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}
