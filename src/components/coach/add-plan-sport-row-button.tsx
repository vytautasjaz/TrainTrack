'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { addExtraPlanSportRow } from '@/app/actions/athletes'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'

type AddPlanSportRowButtonProps = {
  athleteId: string
  weekStartKey: string
  availableSports: WorkoutType[]
  /** Quiet toolbar text control (week Filter · Rows group). */
  quiet?: boolean
}

export function AddPlanSportRowButton({
  athleteId,
  weekStartKey,
  availableSports,
  quiet = false,
}: AddPlanSportRowButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (availableSports.length === 0) return null

  function handleAdd(sport: WorkoutType) {
    const formData = new FormData()
    formData.set('athleteId', athleteId)
    formData.set('weekStart', weekStartKey)
    formData.set('sport', sport)
    startTransition(async () => {
      await addExtraPlanSportRow(formData)
      setOpen(false)
    })
  }

  return (
    <>
      {quiet ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-[4px] px-1.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          title="Add a sport row for this week only"
        >
          <Plus className="h-3 w-3 opacity-70" aria-hidden />
          Add row
        </button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add sport row
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add sport row</DialogTitle>
            <DialogDescription>
              Show an additional sport row for this week only.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {availableSports.map((sport) => (
              <Button
                key={sport}
                type="button"
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={() => handleAdd(sport)}
                className={WORKOUT_TYPE_COLORS[sport]}
              >
                {WORKOUT_TYPE_LABELS[sport]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
