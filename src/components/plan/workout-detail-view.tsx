'use client'

import { useCallback, useImperativeHandle, useRef, useState, useTransition, type ReactNode, type Ref } from 'react'
import { X } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { CoachReplyBlock } from '@/components/plan/coach-reply-block'
import { MarkCoachReplyReadOnView } from '@/components/athlete/mark-coach-reply-read-on-view'
import { ItemActions } from '@/components/ui/item-actions'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { Textarea } from '@/components/ui/textarea'
import { PrivateNoteToggle } from '@/components/ui/private-note-toggle'
import { AthleteWorkoutDetailCard } from '@/components/plan/athlete-workout-detail-card'
import { CoachRescheduleReviewActions } from '@/components/plan/coach-reschedule-review-actions'
import { ExportWorkoutCardDialog } from '@/components/workout-block/export-workout-card-dialog'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { formatRecoveryDayNote } from '@/lib/recovery-day'
import { saveRecoveryDay } from '@/app/actions/workout-builder'
import { deleteWorkout } from '@/app/actions/workouts'
import { AskCoachSection, CoachWorkoutThreadSection } from '@/components/plan/ask-coach-section'
import { WorkoutResultFeedbackSummary } from '@/components/plan/workout-inline-feedback'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import {
  athleteCanLeaveWorkoutComment,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { coachOpensPlanWorkoutEditor } from '@/lib/plan-workout-modal'
import { parseDateOnly } from '@/lib/dates'
import { useCurrentPath } from '@/hooks/use-current-path'
import { useResolvedPlanColorMode } from '@/components/training/plan-sport-filter-context'
import { cn } from '@/lib/utils'

export function formatWorkoutDetailDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export type WorkoutDetailCloseHandle = {
  /** Attempt close; returns false when blocked by unsaved feedback. */
  tryClose: () => boolean
}

type WorkoutDetailViewProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  /** When false, skip mark-read (e.g. panel not visible). */
  active?: boolean
  onClose: () => void
  closeHandleRef?: Ref<WorkoutDetailCloseHandle | null>
  /** Optional chrome around the scroll body (e.g. dialog title hooks). */
  headerSlot?: ReactNode
  className?: string
  /** Show close control in the scroll header (panel). */
  showCloseButton?: boolean
  /** Dark hero for modal; light for list side panel. */
  heroTone?: 'dark' | 'light'
  /** Hide ask-coach / thread footer (e.g. roster split already shows chat). */
  hideCoachingThread?: boolean
}

/**
 * Shared workout detail body for modal and list-view side panel.
 */
export function WorkoutDetailView({
  workout,
  isCoach,
  active = true,
  onClose,
  closeHandleRef,
  headerSlot,
  className,
  showCloseButton = false,
  heroTone = 'dark',
  hideCoachingThread = false,
}: WorkoutDetailViewProps) {
  const currentPath = useCurrentPath()
  const colorMode = useResolvedPlanColorMode()
  const result = workout.result
  const [exportOpen, setExportOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leavingPending, setLeavingPending] = useState(false)
  const [recoverySaving, startRecoveryTransition] = useTransition()
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const feedbackDirtyRef = useRef(false)
  const saveFeedbackRef = useRef<(() => Promise<void>) | null>(null)

  const handleFeedbackDirtyChange = useCallback((dirty: boolean) => {
    feedbackDirtyRef.current = dirty
  }, [])

  function finishClose() {
    setLeaveOpen(false)
    feedbackDirtyRef.current = false
    onClose()
  }

  function requestClose() {
    if (feedbackDirtyRef.current) {
      setLeaveOpen(true)
      return false
    }
    finishClose()
    return true
  }

  useImperativeHandle(closeHandleRef, () => ({
    tryClose: requestClose,
  }))

  async function saveFeedbackAndClose() {
    const save = saveFeedbackRef.current
    if (!save) {
      finishClose()
      return
    }
    setLeavingPending(true)
    try {
      await save()
      finishClose()
    } catch {
      setLeaveOpen(false)
    } finally {
      setLeavingPending(false)
    }
  }

  const completionChrome = colorMode === 'completion'

  if (workout.type === WorkoutType.RECOVERY) {
    return (
      <div className={cn('relative flex min-h-0 flex-1 flex-col bg-white', className)}>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--tt-line,#ebebeb)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">Recovery day</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatWorkoutDetailDate(workout.dateKey)}
            </p>
            <div className="mt-2">
              <Badge className={WORKOUT_TYPE_COLORS[workout.type]}>
                {WORKOUT_TYPE_LABELS[workout.type]}
              </Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {isCoach ? (
              <ItemActions
                deleteAction={deleteWorkout}
                deleteId={workout.id}
                deleteIdField="workoutId"
                deleteConfirmTitle="Remove recovery day?"
                deleteConfirmMessage="This recovery day will be removed from the plan."
                redirectTo={currentPath}
              />
            ) : null}
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <section className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm">
            <p className="font-semibold text-violet-800 dark:text-violet-300">
              Coach comment
            </p>
            <p className="mt-1 text-muted-foreground">
              {formatRecoveryDayNote(workout.coachNotes)}
            </p>
          </section>

          {isCoach ? (
            <section className="space-y-3 rounded-xl border border-border/60 p-3">
              <p className="text-sm font-semibold">Edit comment</p>
              <form
                action={(formData) => {
                  setRecoveryError(null)
                  startRecoveryTransition(async () => {
                    try {
                      await saveRecoveryDay({
                        date: workout.dateKey,
                        coachNotes:
                          String(formData.get('coachNotes') ?? '').trim() ||
                          undefined,
                        coachNotesPrivate:
                          formData.get('coachNotesPrivate') === 'true',
                        workoutId: workout.id,
                      })
                      onClose()
                    } catch (err) {
                      setRecoveryError(
                        err instanceof Error
                          ? err.message
                          : 'Could not save comment',
                      )
                    }
                  })
                }}
                className="space-y-3"
              >
                <FormError message={recoveryError} />
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
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={recoverySaving}
                >
                  {recoverySaving ? 'Saving…' : 'Save'}
                </Button>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <>
      <MarkCoachReplyReadOnView
        workoutId={workout.id}
        shouldMark={
          active &&
          !isCoach &&
          Boolean(result?.coachReply && !result?.coachReplyReadAt)
        }
      />
      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white',
          className,
        )}
      >
        {headerSlot}

        {showCloseButton ? (
          <div className="absolute right-3 top-3 z-30">
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/90 text-muted-foreground shadow-sm ring-1 ring-black/5 transition hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : null}

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
            onStravaChange={requestClose}
            showUtilityActions={!isCoach}
            showStatusBadge={completionChrome}
            colorMode={colorMode}
            heroTone={heroTone}
            onShare={() => setExportOpen(true)}
            onRescheduleDone={requestClose}
            onClose={requestClose}
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
          {isCoach || !athleteCanLeaveWorkoutComment(workout, false) ? (
            <WorkoutResultFeedbackSummary workout={workout} isCoach={isCoach} />
          ) : null}
          {result?.coachReply ? (
            <section className="px-5 pb-4 pt-1 text-sm">
              <CoachReplyBlock reply={result.coachReply} />
            </section>
          ) : null}
        </div>

        {!hideCoachingThread ? (
          !isCoach ? (
            <AskCoachSection
              workout={workout}
              onClose={finishClose}
              onDirtyChange={handleFeedbackDirtyChange}
              saveRef={saveFeedbackRef}
            />
          ) : (
            <CoachWorkoutThreadSection workout={workout} />
          )
        ) : null}
      </div>

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
          onDiscard={finishClose}
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

/** True when list view can show this workout in the side panel (not editor/race). */
export function planWorkoutUsesListDetailPanel(
  isCoach: boolean,
  workout: PlanWorkoutDetail,
): boolean {
  if (workout.isRace) return false
  return !coachOpensPlanWorkoutEditor(isCoach, workout)
}
