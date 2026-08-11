import { WorkoutType } from '@prisma/client'
import type { BuilderMode } from '@/lib/workout-builder/types'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { sportSupportsWorkoutBuilder } from '@/lib/workout-builder/session-modes'
import { sportUsesPlannedDistance } from '@/lib/plan-week-totals'

export type WorkoutPrimaryMetric = 'duration' | 'distance'
/** Unset until the athlete/coach types the first manual metric on a new workout. */
export type WorkoutPrimaryMetricState = WorkoutPrimaryMetric | null
export type DurationUnit = 'min' | 'hours'
export type DistanceUnit = 'km' | 'm'

export type WorkoutEditorMode = BuilderMode | 'plan'

export type SharedWorkoutEditorProps = {
  /** plan | workout (scheduled) | template (library) */
  mode?: WorkoutEditorMode
  sportType: WorkoutType
  date: string
  workout?: PlanWorkoutDetail | null
  /** Library template id when editing a template */
  entityId?: string
  athleteMode?: boolean
  /** Called after successful save (dialog closes / page redirects) */
  onSaved?: () => void
  onCancel?: () => void
  /** When false, render without dialog chrome (page mode) */
  embedded?: boolean
  className?: string
}

export type SportEditorConfig = {
  showDistance: boolean
  distanceUnit: DistanceUnit
  durationUnitDefault: DurationUnit
  allowDurationUnitToggle: boolean
  /** Use bike kind list instead of session types */
  useBikeKinds: boolean
  detailsKind: 'blocks' | 'swim' | 'notes'
  supportsBuilder: boolean
  descriptionOnly: boolean
}

export function getSportEditorConfig(sport: WorkoutType): SportEditorConfig {
  const showDistance = sportUsesPlannedDistance(sport)
  return {
    showDistance: sport === WorkoutType.SWIM ? true : showDistance,
    distanceUnit: sport === WorkoutType.SWIM ? 'm' : 'km',
    durationUnitDefault: sport === WorkoutType.BIKE ? 'hours' : 'min',
    allowDurationUnitToggle: true,
    useBikeKinds: sport === WorkoutType.BIKE,
    detailsKind:
      sport === WorkoutType.SWIM
        ? 'swim'
        : sportSupportsWorkoutBuilder(sport)
          ? 'blocks'
          : 'notes',
    supportsBuilder: sportSupportsWorkoutBuilder(sport) || sport === WorkoutType.SWIM,
    descriptionOnly: sport === WorkoutType.STRENGTH,
  }
}
