'use client'

import { useTransition } from 'react'
import { X } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import { removeEmptyPlanSportRow } from '@/app/actions/athletes'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

type RemovePlanSportRowButtonProps = {
  athleteId: string
  weekStartKey: string
  sport: WorkoutType
  className?: string
}

export function RemovePlanSportRowButton({
  athleteId,
  weekStartKey,
  sport,
  className,
}: RemovePlanSportRowButtonProps) {
  const [isPending, startTransition] = useTransition()
  const sportLabel = WORKOUT_TYPE_LABELS[sport]

  function handleRemove() {
    const formData = new FormData()
    formData.set('athleteId', athleteId)
    formData.set('weekStart', weekStartKey)
    formData.set('sport', sport)
    startTransition(async () => {
      await removeEmptyPlanSportRow(formData)
    })
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition hover:bg-muted/70 hover:text-foreground disabled:opacity-50',
        className,
      )}
      aria-label={`Remove ${sportLabel} row for this week`}
      title={`Remove ${sportLabel} row`}
    >
      <X className="h-3 w-3" />
    </button>
  )
}
