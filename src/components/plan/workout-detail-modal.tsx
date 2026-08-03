'use client'

import { WorkoutType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { CoachReplyBlock } from '@/components/plan/coach-reply-block'
import { MarkCoachReplyReadOnView } from '@/components/athlete/mark-coach-reply-read-on-view'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ItemActions } from '@/components/ui/item-actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AthleteWorkoutDetailCard } from '@/components/plan/athlete-workout-detail-card'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  athleteAddedFieldClass,
  isAthleteAddedWorkout,
} from '@/components/plan/plan-workout-item-shell'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'
import { formatRecoveryDayNote } from '@/lib/recovery-day'
import { saveRecoveryDay } from '@/app/actions/workout-builder'
import { deleteWorkout } from '@/app/actions/workouts'
import { HomeWorkoutCompleteSection } from '@/components/plan/home-workout-complete-section'
import { parseDateOnly } from '@/lib/dates'
import { useCurrentPath } from '@/hooks/use-current-path'

type WorkoutDetailModalProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatWorkoutDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function WorkoutDetailModal({
  workout,
  isCoach,
  open,
  onOpenChange,
}: WorkoutDetailModalProps) {
  const currentPath = useCurrentPath()
  const result = workout.result

  // Coaches jump straight into the editor (skip read-only preview).
  if (isCoach && workout.type !== WorkoutType.RECOVERY) {
    return (
      <WorkoutEditorDialog
        open={open}
        onOpenChange={onOpenChange}
        date={workout.dateKey}
        sport={workout.type}
        workout={workout}
      />
    )
  }

  const showAthleteAdded = isAthleteAddedWorkout(workout)

  if (workout.type === WorkoutType.RECOVERY) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="min-w-0">
                <DialogTitle>Recovery day</DialogTitle>
                <DialogDescription>{formatWorkoutDate(workout.dateKey)}</DialogDescription>
                <div className="mt-2">
                  <Badge className={WORKOUT_TYPE_COLORS[workout.type]}>
                    {WORKOUT_TYPE_LABELS[workout.type]}
                  </Badge>
                </div>
              </div>
              {isCoach && (
                <ItemActions
                  deleteAction={deleteWorkout}
                  deleteId={workout.id}
                  deleteIdField="workoutId"
                  deleteConfirmTitle="Remove recovery day?"
                  deleteConfirmMessage="This recovery day will be removed from the plan."
                  redirectTo={currentPath}
                />
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <section className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm">
              <p className="font-semibold text-violet-800 dark:text-violet-300">Coach comment</p>
              <p className="mt-1 text-muted-foreground">
                {formatRecoveryDayNote(workout.coachNotes)}
              </p>
            </section>

            {isCoach && (
              <section className="space-y-3 rounded-xl border border-border/60 p-3">
                <p className="text-sm font-semibold">Edit comment</p>
                <form
                  action={async (formData) => {
                    await saveRecoveryDay({
                      date: workout.dateKey,
                      coachNotes: String(formData.get('coachNotes') ?? '').trim() || undefined,
                      workoutId: workout.id,
                    })
                    onOpenChange(false)
                  }}
                  className="space-y-3"
                >
                  <Textarea
                    name="coachNotes"
                    defaultValue={workout.coachNotes ?? ''}
                    rows={4}
                    placeholder="Optional guidance for the athlete"
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    Save
                  </Button>
                </form>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <MarkCoachReplyReadOnView
        workoutId={workout.id}
        shouldMark={
          open && !isCoach && Boolean(result?.coachReply && !result?.coachReplyReadAt)
        }
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideCloseButton
          className={cn(
            'flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0',
            athleteAddedFieldClass(showAthleteAdded),
          )}
        >
          <DialogTitle className="sr-only">{workout.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {formatWorkoutDate(workout.dateKey)}
          </DialogDescription>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-3">
            <div className="space-y-4">
              <AthleteWorkoutDetailCard
                workout={workout}
                showStravaActions={!isCoach}
                onStravaChange={() => onOpenChange(false)}
              />
              {result?.athleteNotes?.trim() ? (
                <section className="border-t border-border/50 pt-4 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Your comment
                  </p>
                  <p className="mt-1.5 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    &ldquo;{result.athleteNotes.trim()}&rdquo;
                  </p>
                </section>
              ) : null}
              {result?.coachReply ? (
                <section className="border-t border-border/50 pt-4 text-sm">
                  <CoachReplyBlock reply={result.coachReply} />
                </section>
              ) : null}
            </div>
          </div>

          {!isCoach && (
            <div className="shrink-0 px-5 pb-4">
              <HomeWorkoutCompleteSection
                workout={workout}
                onClose={() => onOpenChange(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
