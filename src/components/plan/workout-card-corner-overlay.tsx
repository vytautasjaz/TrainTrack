'use client'

import type { ReactNode } from 'react'
import { WorkoutStatus } from '@prisma/client'
import { AthleteWorkoutQuickActions } from '@/components/plan/athlete-workout-quick-actions'
import { WorkoutChatIndicator } from '@/components/plan/workout-chat-indicator'
import { workoutHasCoachingChat, type PlanWorkoutDetail } from '@/lib/plan-workout'
import type { WorkoutStatusIconSize } from '@/components/ui/workout-status-icon'
import { cn } from '@/lib/utils'

type WorkoutCardCornerOverlayProps = {
  workout: PlanWorkoutDetail
  isCoach: boolean
  showQuickActions: boolean
  status: WorkoutStatus
  onStatusChange: (status: WorkoutStatus) => void
  quickActionSize?: WorkoutStatusIconSize
  className?: string
  leading?: ReactNode
}

/** Done/Skip controls + chat stacked in the card top-right corner. */
export function WorkoutCardCornerOverlay({
  workout,
  isCoach,
  showQuickActions,
  status,
  onStatusChange,
  quickActionSize = 'xs',
  className,
  leading,
}: WorkoutCardCornerOverlayProps) {
  const showChat =
    workoutHasCoachingChat(workout) && (showQuickActions || Boolean(leading))
  if (!leading && !showQuickActions && !showChat) return null

  return (
    <div
      className={cn(
        'absolute z-10 flex flex-col items-end gap-0.5 opacity-80 transition group-hover/card:opacity-100',
        className,
      )}
    >
      {leading || showQuickActions ? (
        <div className="flex items-center gap-0.5">
          {leading}
          {showQuickActions ? (
            <AthleteWorkoutQuickActions
              workout={workout}
              isCoach={false}
              size={quickActionSize}
              displayStatus={status}
              onDisplayStatusChange={onStatusChange}
            />
          ) : null}
        </div>
      ) : null}
      {showChat ? (
        <WorkoutChatIndicator
          workout={workout}
          role={isCoach ? 'coach' : 'athlete'}
          size={quickActionSize === 'sm' ? 'sm' : 'xs'}
        />
      ) : null}
    </div>
  )
}

export function workoutCardCornerSpacerClass(
  workout: PlanWorkoutDetail,
  opts: { showQuickActions: boolean; showCoachMenu?: boolean },
): string {
  const hasChat = workoutHasCoachingChat(workout)
  if (!opts.showQuickActions && !opts.showCoachMenu) return ''
  const width = opts.showQuickActions ? 'w-14' : 'w-7'
  const height = hasChat && opts.showQuickActions ? 'min-h-8' : ''
  return cn('inline-block shrink-0', width, height)
}
