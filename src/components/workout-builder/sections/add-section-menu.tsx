'use client'

import {
  SECTION_TYPE_LABELS,
  type WorkoutSectionType,
  workoutSectionTypeSchema,
} from '@/lib/workout-builder/structure-v2'
import {
  FlipMenu,
  FlipMenuGroupLabel,
  FlipMenuItem,
  FlipMenuSeparator,
} from '@/components/workout-builder/sections/flip-menu'

const SECTION_TYPES = workoutSectionTypeSchema.options

const SECTION_GROUPS: { label: string; types: WorkoutSectionType[] }[] = [
  {
    label: 'Session parts',
    types: ['WARMUP', 'MAIN_SET', 'COOLDOWN', 'RECOVERY'],
  },
  {
    label: 'Training',
    types: ['STRENGTH', 'CONDITIONING', 'HYROX_SIMULATION', 'CORE', 'FINISHER'],
  },
  { label: 'Other', types: ['CUSTOM'] },
]

type AddSectionMenuProps = {
  onAdd: (type: WorkoutSectionType) => void
  className?: string
  label?: string
  align?: 'start' | 'center'
}

export function AddSectionMenu({
  onAdd,
  className,
  label = 'Add section',
  align = 'start',
}: AddSectionMenuProps) {
  const known = SECTION_TYPES as readonly string[]

  return (
    <FlipMenu
      label={label}
      className={className}
      align={align}
      menuClassName="min-w-[12rem]"
    >
      {(close) =>
        SECTION_GROUPS.map((group, gi) => {
          const types = group.types.filter((t) => known.includes(t))
          if (types.length === 0) return null
          return (
            <div key={group.label}>
              {gi > 0 ? <FlipMenuSeparator /> : null}
              <FlipMenuGroupLabel>{group.label}</FlipMenuGroupLabel>
              {types.map((type) => (
                <FlipMenuItem
                  key={type}
                  onSelect={() => {
                    onAdd(type)
                    close()
                  }}
                >
                  {SECTION_TYPE_LABELS[type]}
                </FlipMenuItem>
              ))}
            </div>
          )
        })
      }
    </FlipMenu>
  )
}
