'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { WorkoutStatus, WorkoutType } from '@prisma/client'
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
import { PrivateNoteToggle } from '@/components/ui/private-note-toggle'
import { AthleteWorkoutDetailCard } from '@/components/plan/athlete-workout-detail-card'
import { CoachRescheduleReviewActions } from '@/components/plan/coach-reschedule-review-actions'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import { ExportWorkoutCardDialog } from '@/components/workout-block/export-workout-card-dialog'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { formatRecoveryDayNote } from '@/lib/recovery-day'
import { saveRecoveryDay } from '@/app/actions/workout-builder'
import { deleteWorkout } from '@/app/actions/workouts'
import { AskCoachSection } from '@/components/plan/ask-coach-section'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { athleteCanLeaveWorkoutComment, type PlanWorkoutDetail } from '@/lib/plan-workout'
import { parseDateOnly } from '@/lib/dates'
import { useCurrentPath } from '@/hooks/use-current-path'
import { useResolvedPlanColorMode } from '@/components/training/plan-sport-filter-context'
import { WORKOUT_TYPE_CELL_TINT } from '@/lib/workout-display'

const SPORT_RAIL: Record<WorkoutType, string> = {
  RUN: 'var(--color-sport-run)',
  BIKE: 'var(--color-sport-bike)',
  SWIM: 'var(--color-sport-swim)',
  STRENGTH: 'var(--color-sport-strength)',
  HYROX: 'var(--color-sport-hyrox)',
  TRIATHLON: 'var(--color-sport-tri)',
  RECOVERY: 'var(--color-sport-recovery)',
  REST: 'var(--color-sport-rest)',
}

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
  const colorMode = useResolvedPlanColorMode()
  const result = workout.result
  const [exportOpen, setExportOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leavingPending, setLeavingPending] = useState(false)
  const [recoverySaving, startRecoveryTransition] = useTransition()
  const feedbackDirtyRef = useRef(false)
  const saveFeedbackRef = useRef<(() => Promise<void>) | null>(null)

  const handleFeedbackDirtyChange = useCallback((dirty: boolean) => {
    feedbackDirtyRef.current = dirty
  }, [])

  function closeModal() {
    setLeaveOpen(false)
    feedbackDirtyRef.current = false
    onOpenChange(false)
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true)
      return
    }
    if (feedbackDirtyRef.current) {
      setLeaveOpen(true)
      return
    }
    closeModal()
  }

  async function saveFeedbackAndClose() {
    const save = saveFeedbackRef.current
    if (!save) {
      closeModal()
      return
    }
    setLeavingPending(true)
    try {
      await save()
      closeModal()
    } catch {
      setLeaveOpen(false)
    } finally {
      setLeavingPending(false)
    }
  }

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

  const completed = workout.status === WorkoutStatus.COMPLETED
  const skipped = workout.status === WorkoutStatus.SKIPPED
  const completionChrome = colorMode === 'completion'
  const railColor = completionChrome
    ? completed
      ? '#86d39a'
      : skipped
        ? '#f5a3a3'
        : SPORT_RAIL[workout.type]
    : SPORT_RAIL[workout.type]

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
                  action={(formData) => {
                    startRecoveryTransition(async () => {
                      await saveRecoveryDay({
                        date: workout.dateKey,
                        coachNotes: String(formData.get('coachNotes') ?? '').trim() || undefined,
                        coachNotesPrivate: formData.get('coachNotesPrivate') === 'true',
                        workoutId: workout.id,
                      })
                      onOpenChange(false)
                    })
                  }}
                  className="space-y-3"
                >
                  <Textarea
                    name="coachNotes"
                    defaultValue={workout.coachNotes ?? ''}
                    rows={4}
                    placeholder="Optional guidance for the athlete"
                  />
                  <PrivateNoteToggle
                    hideFrom="athlete"
                    name="coachNotesPrivate"
                    defaultChecked={Boolean(workout.coachNotesPrivate)}
                  />
                  <Button type="submit" variant="secondary" size="sm" disabled={recoverySaving}>
                    {recoverySaving ? 'Saving…' : 'Save'}
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          hideCloseButton
          onPointerDownOutside={(e) => {
            if (leaveOpen) e.preventDefault()
          }}
          onFocusOutside={(e) => {
            if (leaveOpen) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            if (leaveOpen) e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            if (feedbackDirtyRef.current) {
              e.preventDefault()
              setLeaveOpen(true)
            }
          }}
          className={cn(
            'flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden border-0 p-0 shadow-[0_16px_48px_rgba(17,17,17,0.14)]',
            colorMode === 'sport'
              ? WORKOUT_TYPE_CELL_TINT[workout.type]
              : completionChrome && completed
                ? 'bg-[var(--color-tt-completed-bg)]'
                : completionChrome && skipped
                  ? 'bg-[var(--color-tt-skipped-bg)]'
                  : 'bg-card',
          )}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[4px]"
            style={{ background: railColor }}
            aria-hidden
          />

          <DialogTitle className="sr-only">{workout.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {formatWorkoutDate(workout.dateKey)}
          </DialogDescription>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {workout.isRescheduleGhost ? (
              <div className="mx-5 mt-4 rounded-[8px] border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Moved off this day</p>
                    <p className="mt-0.5 text-xs opacity-90">
                      This is the original plan placeholder.
                      {workout.rescheduledToDateKey
                        ? ` The workout is on ${workout.rescheduledToDateKey}.`
                        : ''}
                    </p>
                  </div>
                  <CoachRescheduleReviewActions
                    workout={workout}
                    isCoach={isCoach}
                    placement="inline"
                    className="shrink-0"
                  />
                </div>
              </div>
            ) : null}
            <AthleteWorkoutDetailCard
              workout={workout}
              isCoach={isCoach}
              showStravaActions={!isCoach && !workout.isRescheduleGhost}
              onStravaChange={() => handleOpenChange(false)}
              showUtilityActions={!isCoach}
              showStatusBadge={completionChrome}
              colorMode={colorMode}
              onShare={() => setExportOpen(true)}
              onRescheduleDone={() => handleOpenChange(false)}
            />
            {isCoach && !workout.isRescheduleGhost ? (
              <div className="flex justify-end px-5 pb-3">
                <CoachRescheduleReviewActions
                  workout={workout}
                  isCoach={isCoach}
                  placement="inline"
                />
              </div>
            ) : null}
            {result?.athleteNotes?.trim() &&
            (isCoach || !athleteCanLeaveWorkoutComment(workout, false)) ? (
              <section className="px-5 pb-4 pt-1 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {isCoach ? 'Athlete comment' : 'Your comment'}
                </p>
                <p className="mt-1.5 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  &ldquo;{result.athleteNotes.trim()}&rdquo;
                </p>
              </section>
            ) : null}
            {result?.coachReply ? (
              <section className="px-5 pb-4 pt-1 text-sm">
                <CoachReplyBlock reply={result.coachReply} />
              </section>
            ) : null}
          </div>

          {!isCoach ? (
            <AskCoachSection
              workout={workout}
              onClose={closeModal}
              onDirtyChange={handleFeedbackDirtyChange}
              saveRef={saveFeedbackRef}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {!isCoach ? (
        <UnsavedChangesDialog
          open={leaveOpen}
          onOpenChange={setLeaveOpen}
          pending={leavingPending}
          title="Save feedback?"
          description="You have unsaved feedback. Save it before leaving?"
          onSave={() => {
            void saveFeedbackAndClose()
          }}
          onDiscard={closeModal}
        />
      ) : null}

      {!isCoach ? (
        <ExportWorkoutCardDialog
          workout={workout}
          open={exportOpen}
          onOpenChange={setExportOpen}
        />
      ) : null}
    </>
  )
}
