'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { SharedWorkoutEditor } from '@/components/workout-editor/shared-workout-editor'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { formatPlanSlotLabel, planSlotKey } from '@/lib/training-plan'
import type { WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'

type PlanSessionEditorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  weekIndex: number
  dayOfWeek: number
  sport: WorkoutType
  session?: PlanWorkoutDetail | null
  athletePreferences?: AthletePreferences | null
}

export function PlanSessionEditorDialog({
  open,
  onOpenChange,
  planId,
  weekIndex,
  dayOfWeek,
  sport,
  session = null,
  athletePreferences = null,
}: PlanSessionEditorDialogProps) {
  const router = useRouter()
  const title = session ? 'Edit plan workout' : 'Add plan workout'
  const slotKey = planSlotKey(weekIndex, dayOfWeek)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[min(64rem,calc(100%-1.5rem))] flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:w-auto"
        overlayClassName="bg-black/50"
        hideCloseButton
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {formatPlanSlotLabel(weekIndex, dayOfWeek)} · {sport.toLowerCase()}
        </DialogDescription>
        {open ? (
          <SharedWorkoutEditor
            key={`training-plan-${session?.id ?? 'new'}-${sport}-${slotKey}`}
            mode="training-plan"
            sportType={sport}
            date={slotKey}
            workout={session}
            planId={planId}
            weekIndex={weekIndex}
            dayOfWeek={dayOfWeek}
            athletePreferences={athletePreferences}
            onSaved={() => {
              onOpenChange(false)
              router.refresh()
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
