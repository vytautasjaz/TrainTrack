'use client'

import type { WorkoutType } from '@prisma/client'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  FixedPortalMenu,
  FixedPortalMenuItem,
} from '@/components/ui/fixed-portal-menu'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

type WorkoutSportPickerProps = {
  sportType: WorkoutType
  sportOptions: WorkoutType[]
  onSportChange: (sport: WorkoutType) => void
  className?: string
}

/** Sport-branch control for the editor hero. */
export function WorkoutSportPicker({
  sportType,
  sportOptions,
  onSportChange,
  className,
}: WorkoutSportPickerProps) {
  return (
    <FixedPortalMenu
      role="listbox"
      aria-label="Sport"
      align="start"
      sideOffset={6}
      className={cn('shrink-0', className)}
      menuClassName="min-w-[10.5rem] overflow-hidden rounded-[10px] p-1"
      trigger={({ props }) => (
        <button
          {...props}
          aria-label={`Sport: ${WORKOUT_TYPE_LABELS[sportType]}. Change sport`}
          title="Change sport"
          className="rounded-xl outline-none ring-offset-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          <WorkoutSportIcon type={sportType} size="md" />
        </button>
      )}
    >
      {(close) =>
        sportOptions.map((sport) => {
          const selected = sport === sportType
          return (
            <FixedPortalMenuItem
              key={sport}
              role="option"
              selected={selected}
              className={cn(
                'rounded-[6px] px-2.5',
                selected && 'bg-foreground/[0.06]',
              )}
              onSelect={() => {
                onSportChange(sport)
                close()
              }}
            >
              <WorkoutSportIcon type={sport} size="xs" />
              <span className="flex-1">{WORKOUT_TYPE_LABELS[sport]}</span>
            </FixedPortalMenuItem>
          )
        })
      }
    </FixedPortalMenu>
  )
}
