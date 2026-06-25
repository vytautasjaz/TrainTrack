'use client'

import { useState } from 'react'
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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <form action={selectAthleteForTraining}>
          <input type="hidden" name="athleteId" value={athlete.id} />
          <Button type="submit" variant="secondary" size="sm">
            <CalendarRange className="h-3.5 w-3.5" />
            Training
          </Button>
        </form>
      </div>
      <CoachEditAthleteModal athlete={athlete} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}
