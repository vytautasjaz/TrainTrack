'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { RecoveryDayModal } from '@/components/plan/recovery-day-modal'
import { WorkoutModalTrigger } from '@/components/plan/workout-modal-trigger'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { formatRecoveryDayNote } from '@/lib/recovery-day'
import { cn } from '@/lib/utils'

const RECOVERY_DOT = '#8b5cf6'

type RecoveryDaySectionProps = {
  dateKey: string
  workout?: PlanWorkoutDetail | null
  canEdit: boolean
  compact?: boolean
  hideEmptyAdd?: boolean
}

function RecoveryPlanCell({
  workout,
  canEdit,
  onOpen,
}: {
  workout: PlanWorkoutDetail
  canEdit: boolean
  onOpen: () => void
}) {
  const className = cn(
    'group flex w-full items-start gap-1 rounded-lg px-0.5 py-0.5 text-left landscape:max-lg:gap-0.5 lg:gap-1.5 lg:px-1',
    canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default',
  )

  const content = (
    <>
      <span
        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full landscape:max-lg:mt-0.5"
        style={{ backgroundColor: RECOVERY_DOT }}
      />
      <div className="min-w-0">
        <p className="min-w-0 truncate text-xs font-medium leading-snug group-hover:text-brand landscape:max-lg:text-[8px] landscape:max-lg:leading-tight">
          Recovery
        </p>
        <p className="truncate text-[10px] text-muted-foreground landscape:max-lg:text-[8px] lg:text-xs">
          {formatRecoveryDayNote(workout.coachNotes)}
        </p>
      </div>
    </>
  )

  if (canEdit) {
    return (
      <button type="button" onClick={onOpen} className={className}>
        {content}
      </button>
    )
  }

  return (
    <WorkoutModalTrigger workout={workout} isCoach={false} className={className}>
      {content}
    </WorkoutModalTrigger>
  )
}

export function RecoveryDaySection({
  dateKey,
  workout,
  canEdit,
  compact = false,
  hideEmptyAdd = false,
}: RecoveryDaySectionProps) {
  const [open, setOpen] = useState(false)

  const modal = canEdit ? (
    <RecoveryDayModal
      date={dateKey}
      workout={workout}
      open={open}
      onOpenChange={setOpen}
    />
  ) : null

  if (workout) {
    if (compact) {
      return (
        <>
          <RecoveryPlanCell workout={workout} canEdit={canEdit} onOpen={() => setOpen(true)} />
          {modal}
        </>
      )
    }

    return (
      <>
        <div
          className={cn(
            'rounded-xl border-l-[3px] px-3 py-2 text-sm',
            canEdit && 'cursor-pointer transition hover:opacity-90',
          )}
          style={{ borderColor: RECOVERY_DOT, backgroundColor: '#f5f3ff' }}
          onClick={canEdit ? () => setOpen(true) : undefined}
          role={canEdit ? 'button' : undefined}
          tabIndex={canEdit ? 0 : undefined}
        >
          <p className="font-medium text-foreground">Recovery</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatRecoveryDayNote(workout.coachNotes)}
          </p>
        </div>
        {modal}
      </>
    )
  }

  if (!canEdit) return null
  if (hideEmptyAdd) return null

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full min-h-[4.5rem] items-center justify-center rounded-lg transition-colors hover:bg-muted/20 landscape:max-lg:min-h-0 landscape:max-lg:py-2 lg:min-h-[5rem]"
          aria-label={`Mark recovery day on ${dateKey}`}
        >
          <Plus className="h-5 w-5 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-brand/40 landscape:max-lg:h-4 landscape:max-lg:w-4" />
        </button>
        {modal}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-muted-foreground transition hover:text-violet-700 dark:hover:text-violet-300"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span>Mark recovery</span>
      </button>
      {modal}
    </>
  )
}
