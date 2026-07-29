'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Flag } from 'lucide-react'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
import { PlanWorkoutDataCard } from '@/components/plan/plan-workout-data-card'
import { usePlanWeekDnd } from '@/components/plan/plan-week-dnd'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  WORKOUT_TYPE_ICONS,
  RACE_PLAN_DOT_CLASS,
} from '@/lib/workout-display'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { cn } from '@/lib/utils'

type MonthWorkoutChipProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  /** `dot` = mobile dots, `icon` = md icons, `tile` = desktop sport icons, `micro` = tiny data cards */
  variant: 'dot' | 'icon' | 'tile' | 'micro'
}

export function MonthWorkoutChip({ workout, isCoach, variant }: MonthWorkoutChipProps) {
  const dnd = usePlanWeekDnd()
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const suppressClick = useRef(false)
  const canDrag = isCoach && !workout.isRace && Boolean(dnd)

  function handleDragStart(e: React.DragEvent) {
    if (!canDrag || !dnd) return
    suppressClick.current = true
    setDragging(true)
    dnd.setDragWorkout({
      id: workout.id,
      sport: workout.type,
      dateKey: workout.dateKey,
    })
    e.dataTransfer.effectAllowed = 'copyMove'
    e.dataTransfer.setData('text/plain', workout.id)
    e.stopPropagation()
  }

  function handleDragEnd() {
    setDragging(false)
    dnd?.setDragWorkout(null)
    window.setTimeout(() => {
      suppressClick.current = false
    }, 0)
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (suppressClick.current || dragging) return
    setOpen(true)
  }

  // Ultra-compact data cards for desktop month grid
  if (!workout.isRace && variant === 'micro') {
    return (
      <>
        <button
          type="button"
          draggable={canDrag}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          aria-label={`${WORKOUT_TYPE_LABELS[workout.type]}: ${workout.title}`}
          title={canDrag ? `${workout.title} — drag to another day` : workout.title}
          className={cn(
            'block w-full min-w-0 text-left',
            canDrag && 'cursor-grab active:cursor-grabbing',
            dragging && 'opacity-40',
          )}
        >
          <PlanWorkoutDataCard workout={workout} density="micro" />
        </button>
        <WorkoutDetailModal
          workout={workout}
          isCoach={isCoach}
          open={open}
          onOpenChange={setOpen}
        />
      </>
    )
  }

  let body: ReactNode
  let className: string

  if (workout.isRace) {
    if (variant === 'dot') {
      body = (
        <>
          <span
            className={cn('block h-2 w-2 rounded-full', RACE_PLAN_DOT_CLASS)}
            aria-hidden
          />
          <StravaSyncedIndicator workout={workout} variant="dot" />
        </>
      )
      className = 'relative rounded-full'
    } else if (variant === 'icon') {
      body = <Flag className="h-3 w-3 fill-amber-500/25" />
      className =
        'relative rounded-[6px] p-0.5 text-amber-600 transition hover:bg-amber-500/15'
    } else {
      body = <Flag className="h-2.5 w-2.5 fill-amber-500/25" strokeWidth={2} />
      className =
        'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-amber-500/15 text-amber-600 transition hover:bg-amber-500/25'
    }
  } else {
    const Icon = WORKOUT_TYPE_ICONS[workout.type]
    if (variant === 'dot') {
      body = (
        <>
          <span
            className={cn(
              'block h-2 w-2 rounded-full',
              workout.status === 'COMPLETED' && 'bg-[#86D39A]',
              workout.status === 'SKIPPED' && 'bg-[#F5A3A3]',
              workout.status !== 'COMPLETED' &&
                workout.status !== 'SKIPPED' &&
                'bg-neutral-400',
            )}
            aria-hidden
          />
          <StravaSyncedIndicator workout={workout} variant="dot" />
        </>
      )
      className = 'relative rounded-full'
    } else if (variant === 'icon') {
      body = (
        <>
          <Icon className="h-3 w-3" />
          <StravaSyncedIndicator workout={workout} variant="dot" />
        </>
      )
      className = cn(
        'relative rounded-[6px] p-0.5 transition',
        workout.status === 'COMPLETED' && 'text-[#16a34a]',
        workout.status === 'SKIPPED' && 'text-red-400',
        workout.status !== 'COMPLETED' &&
          workout.status !== 'SKIPPED' &&
          'text-neutral-500 hover:bg-muted/50 hover:text-foreground',
      )
    } else {
      // Desktop tile: sport icon only
      body = (
        <>
          <Icon className="h-2.5 w-2.5" strokeWidth={2} />
          <StravaSyncedIndicator workout={workout} variant="dot" />
        </>
      )
      className = cn(
        'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-border bg-card transition',
        workout.status === 'COMPLETED' &&
          'border-[#86D39A] bg-[#F3FAF5] text-[#16a34a]',
        workout.status === 'SKIPPED' &&
          'border-[#F5A3A3] bg-[#FDF2F2] text-red-400',
        workout.status !== 'COMPLETED' &&
          workout.status !== 'SKIPPED' &&
          'text-neutral-500 hover:bg-muted hover:text-foreground',
      )
    }
  }

  return (
    <>
      <button
        type="button"
        draggable={canDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        aria-label={
          workout.isRace
            ? `Race: ${workout.title}`
            : `${WORKOUT_TYPE_LABELS[workout.type]}: ${workout.title}`
        }
        title={canDrag ? `${workout.title} — drag to another day` : workout.title}
        className={cn(
          className,
          canDrag && 'cursor-grab active:cursor-grabbing',
          dragging && 'opacity-40',
        )}
      >
        {body}
      </button>
      {workout.isRace ? (
        <RaceDetailModal workout={workout} open={open} onOpenChange={setOpen} />
      ) : (
        <WorkoutDetailModal
          workout={workout}
          isCoach={isCoach}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}
