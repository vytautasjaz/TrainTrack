'use client'

import type { AthleteLogType } from '@prisma/client'
import { AthleteLogTypeValues } from '@/lib/athlete-log-type'
import { ATHLETE_LOG_TYPE_LABELS } from '@/lib/constants'
import { StravaMark } from '@/components/plan/strava-mark'
import {
  WorkoutStatusIcon,
  workoutStatusKindFromLogType,
} from '@/components/ui/workout-status-icon'
import { cn } from '@/lib/utils'

const LOG_OPTIONS: {
  type: AthleteLogType
  activeClass: string
}[] = [
  {
    type: AthleteLogTypeValues.COMPLETED,
    activeClass: 'text-success',
  },
  {
    type: AthleteLogTypeValues.SKIPPED,
    activeClass: 'text-destructive',
  },
  {
    type: AthleteLogTypeValues.ADJUSTED,
    activeClass: 'text-success',
  },
]

type AthleteLogStatusPickerProps = {
  value: AthleteLogType | null
  onChange: (type: AthleteLogType) => void
  disabled?: boolean
  /** When set, shows Strava as a leading status slot (opens activity on click). */
  stravaUrl?: string | null
}

export function AthleteLogStatusPicker({
  value,
  onChange,
  disabled,
  stravaUrl,
}: AthleteLogStatusPickerProps) {
  const showStrava = Boolean(stravaUrl)

  return (
    <div className={cn('grid gap-2', showStrava ? 'grid-cols-4' : 'grid-cols-3')}>
      {showStrava && stravaUrl ? (
        <a
          href={stravaUrl}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center text-[#FC4C02] transition hover:bg-[#FC4C02]/5"
          aria-label="View on Strava"
          title="View on Strava"
        >
          <StravaMark className="h-6 w-6" />
          <span className="text-xs font-semibold uppercase leading-tight tracking-wide">
            Strava
          </span>
        </a>
      ) : null}

      {LOG_OPTIONS.map(({ type, activeClass }) => {
        const selected = value === type
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition',
              disabled && 'cursor-not-allowed',
              disabled && !selected && 'opacity-45',
              selected ? activeClass : 'text-muted-foreground/45 hover:text-muted-foreground',
              disabled && !selected && 'hover:text-muted-foreground/45',
            )}
            aria-pressed={selected}
            aria-label={ATHLETE_LOG_TYPE_LABELS[type]}
          >
            <WorkoutStatusIcon
              kind={workoutStatusKindFromLogType(type)}
              size="md"
              active={selected}
              className={cn(selected && activeClass)}
              aria-hidden
            />
            <span
              className={cn(
                'text-xs font-medium leading-tight',
                selected ? cn('font-semibold', activeClass) : undefined,
              )}
            >
              {ATHLETE_LOG_TYPE_LABELS[type]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
