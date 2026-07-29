'use client'

import type { WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import type { WorkoutBuilderPrefs } from '@/lib/workout-builder/workout-builder-prefs'
import { WorkoutBlockListV2 } from '@/components/workout-builder/workout-block-list-v2'

type WorkoutBlockBuilderProps = {
  structure: WorkoutStructure
  onChange: (structure: WorkoutStructure) => void
  sportType: WorkoutType
  athletePreferences?: AthletePreferences | null
  builderPrefs?: WorkoutBuilderPrefs | null
}

export function WorkoutBlockBuilder({
  structure,
  onChange,
  sportType,
  athletePreferences,
  builderPrefs,
}: WorkoutBlockBuilderProps) {
  return (
    <WorkoutBlockListV2
      structure={structure}
      onChange={onChange}
      sportType={sportType}
      athletePreferences={athletePreferences}
      builderPrefs={builderPrefs}
      compact
    />
  )
}
