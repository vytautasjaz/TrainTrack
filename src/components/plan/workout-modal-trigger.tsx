'use client'

import { useState, type ReactNode } from 'react'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { WorkoutDetailModal } from '@/components/plan/workout-detail-modal'
import { RaceDetailModal } from '@/components/plan/race-detail-modal'
import { cn } from '@/lib/utils'

type WorkoutModalTriggerProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  className?: string
  children: ReactNode
}

export function WorkoutModalTrigger({
  workout,
  isCoach,
  className,
  children,
}: WorkoutModalTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={cn('text-left', className)}
      >
        {children}
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
