import { WorkoutType } from '@prisma/client'
import { Flag } from 'lucide-react'
import { WORKOUT_TYPE_COLORS } from '@/lib/constants'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

type WorkoutSportIconProps = {
  type: WorkoutType
  isRace?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  appearance?: 'filled' | 'outline'
  className?: string
}

const sizeClass = {
  xs: { box: 'h-6 w-6 rounded-md', icon: 'h-3 w-3', outline: 'h-8 w-8 rounded-full' },
  sm: { box: 'h-9 w-9 rounded-lg', icon: 'h-4 w-4', outline: 'h-10 w-10 rounded-full' },
  md: { box: 'h-11 w-11 rounded-xl', icon: 'h-5 w-5', outline: 'h-11 w-11 rounded-full' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-6 w-6', outline: 'h-14 w-14 rounded-full' },
} as const

export function WorkoutSportIcon({
  type,
  isRace = false,
  size = 'md',
  appearance = 'filled',
  className,
}: WorkoutSportIconProps) {
  const Icon = isRace ? Flag : WORKOUT_TYPE_ICONS[type]
  const s = sizeClass[size]
  const colorClass = isRace
    ? 'text-amber-600 dark:text-amber-400'
    : WORKOUT_TYPE_COLORS[type].replace(/bg-\S+\s*/, '')

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center',
        appearance === 'outline'
          ? cn(s.outline, 'border border-border/60 bg-background', colorClass)
          : cn(s.box, isRace ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : WORKOUT_TYPE_COLORS[type]),
        className,
      )}
      title={isRace ? 'Race' : undefined}
    >
      <Icon className={s.icon} strokeWidth={2} />
    </div>
  )
}
