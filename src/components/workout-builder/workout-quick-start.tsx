'use client'

import { SessionType, WorkoutType } from '@prisma/client'
import {
  buildQuickStartPreset,
  getQuickStartOptionsForSport,
  sportSupportsQuickStart,
} from '@/lib/workout-builder/quick-start'
import { cn } from '@/lib/utils'

type WorkoutQuickStartProps = {
  sportType?: WorkoutType
  selectedSessionType?: SessionType
  onSelect: (result: ReturnType<typeof buildQuickStartPreset>) => void
  className?: string
  compact?: boolean
}

export function WorkoutQuickStart({
  sportType = WorkoutType.RUN,
  selectedSessionType,
  onSelect,
  className,
  compact = false,
}: WorkoutQuickStartProps) {
  if (!sportSupportsQuickStart(sportType)) return null

  const options = getQuickStartOptionsForSport(sportType)

  return (
    <section className={cn('border-t border-border/50 pt-4', className)}>
      <div className="grid grid-cols-2 gap-x-1 gap-y-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.sessionType}
            type="button"
            onClick={() => onSelect(buildQuickStartPreset(option.sessionType, sportType))}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-3 text-center transition',
              selectedSessionType === option.sessionType
                ? 'text-brand'
                : 'text-foreground hover:text-brand',
              compact && 'py-2',
            )}
          >
            <span className={cn(compact ? 'text-lg' : 'text-xl')} aria-hidden>
              {option.icon}
            </span>
            <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
              {option.label}
            </span>
            {option.description && (
              <span className="text-xs text-muted-foreground">{option.description}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
