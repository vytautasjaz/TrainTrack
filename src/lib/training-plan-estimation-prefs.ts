import type { AthletePreferences } from '@/lib/athlete-preferences'
import { preferencesForTrainingPlanLevel } from '@/lib/training-plan-athlete-level'
import { loadAthletePreferencesForBuilder } from '@/lib/workout-builder/load-athlete-preferences'

/**
 * Prefs used for plan-canvas distance/time estimates.
 * Linked athlete wins; otherwise level defaults; otherwise null (generic fallbacks).
 */
export async function resolveTrainingPlanEstimationPreferences(args: {
  forAthleteId?: string | null
  level?: string | null
}): Promise<{
  preferences: AthletePreferences | null
  source: 'athlete' | 'level' | 'none'
}> {
  if (args.forAthleteId) {
    const preferences = await loadAthletePreferencesForBuilder(args.forAthleteId)
    if (preferences) {
      return { preferences, source: 'athlete' }
    }
  }
  const fromLevel = preferencesForTrainingPlanLevel(args.level)
  if (fromLevel) return { preferences: fromLevel, source: 'level' }
  return { preferences: null, source: 'none' }
}
