'use client'

import {
  BLOCK_TYPE_V2_LABELS,
  type WorkoutBlockTypeV2,
} from '@/lib/workout-builder/structure-v2'
import {
  FlipMenu,
  FlipMenuGroupLabel,
  FlipMenuItem,
  FlipMenuSeparator,
} from '@/components/workout-builder/sections/flip-menu'

/** Block types only — standalone exercises use a separate Add exercise action. */
const BLOCK_GROUPS: { label: string; types: WorkoutBlockTypeV2[] }[] = [
  { label: 'Strength', types: ['SET', 'SUPERSET', 'CIRCUIT'] },
  {
    label: 'Conditioning',
    types: ['EMOM', 'AMRAP', 'FOR_TIME', 'RACE_SIMULATION', 'CONTINUOUS'],
  },
  { label: 'Other', types: ['REST', 'FREE_TEXT'] },
]

type AddBlockMenuProps = {
  onAdd: (type: WorkoutBlockTypeV2) => void
  className?: string
  label?: string
}

export function AddBlockMenu({
  onAdd,
  className,
  label = 'Add block',
}: AddBlockMenuProps) {
  return (
    <FlipMenu label={label} className={className} menuClassName="min-w-[11rem]">
      {(close) =>
        BLOCK_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 ? <FlipMenuSeparator /> : null}
            <FlipMenuGroupLabel>{group.label}</FlipMenuGroupLabel>
            {group.types.map((type) => (
              <FlipMenuItem
                key={type}
                onSelect={() => {
                  onAdd(type)
                  close()
                }}
              >
                {BLOCK_TYPE_V2_LABELS[type]}
              </FlipMenuItem>
            ))}
          </div>
        ))
      }
    </FlipMenu>
  )
}
