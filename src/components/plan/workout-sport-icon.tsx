import { WorkoutType } from '@prisma/client'
import { Flag } from 'lucide-react'
import { WORKOUT_TYPE_COLORS } from '@/lib/constants'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'

type WorkoutSportIconProps = {
  type: WorkoutType
  isRace?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = {
  sm: { box: 'h-9 w-9 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-6 w-6' },
} as const

export function WorkoutSportIcon({
  type,
  isRace = false,
  size = 'md',
  className,
}: WorkoutSportIconProps) {
  const Icon = isRace ? Flag : WORKOUT_TYPE_ICONS[type]
  const s = sizeClass[size]

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center',
        s.box,
        isRace ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : WORKOUT_TYPE_COLORS[type],
        className,
      )}
      title={isRace ? 'Race' : undefined}
    >
      <Icon className={s.icon} strokeWidth={2} />
    </div>
  )
}
