'use client'

import { MessageSquare } from 'lucide-react'
import {
  workoutCoachingChatUnread,
  workoutHasCoachingChat,
  type PlanWorkoutDetail,
} from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type WorkoutChatIndicatorProps = {
  workout: PlanWorkoutDetail
  role: 'coach' | 'athlete'
  size?: 'xs' | 'sm'
  className?: string
}

export function WorkoutChatIndicator({
  workout,
  role,
  size = 'xs',
  className,
}: WorkoutChatIndicatorProps) {
  const chat = workout.coachingChat
  if (!workoutHasCoachingChat(workout) || !chat) return null

  const unread = workoutCoachingChatUnread(workout, role)
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-3 w-3'
  const label =
    chat.messageCount === 1
      ? unread
        ? '1 unread message about this workout'
        : '1 message about this workout'
      : unread
        ? `${chat.messageCount} messages about this workout · unread`
        : `${chat.messageCount} messages about this workout`

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        unread ? 'text-brand' : 'text-muted-foreground/65',
        className,
      )}
      title={label}
      aria-label={label}
    >
      <MessageSquare className={iconClass} strokeWidth={2} aria-hidden />
      {unread ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand ring-1 ring-white"
          aria-hidden
        />
      ) : null}
    </span>
  )
}
