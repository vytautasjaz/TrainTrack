import { clamp, round0, round1 } from '@/lib/training-load/workout-load/coefficients'
import type { WorkoutLoad } from '@/lib/training-load/workout-load/types'
import {
  isHighLoadDay,
  loadCategoryFromRecovery,
} from '@/lib/training-load/workout-load/calculate'

/**
 * Combine 0–100 load dimensions with diminishing returns.
 * 60 + 50 → 80 (not 110).
 */
export function combineNormalizedLoads(loads: number[]): number {
  if (loads.length === 0) return 0
  let product = 1
  for (const load of loads) {
    const x = clamp(load, 0, 100) / 100
    product *= 1 - x
  }
  return round0(clamp(100 * (1 - product), 0, 100))
}

export type DailyLoad = {
  tss: number
  cardiovascularLoad: number
  muscularLoad: number
  mechanicalLoad: number
  qualityLoad: number
  recoveryDemand: number
  loadCategory: ReturnType<typeof loadCategoryFromRecovery>
  isHighLoadDay: boolean
  qualitySessionCount: number
  sessionCount: number
  rawMechanicalLoad: number
  rawQualityLoad: number
}

export function aggregateDailyLoad(sessions: WorkoutLoad[]): DailyLoad {
  if (sessions.length === 0) {
    return {
      tss: 0,
      cardiovascularLoad: 0,
      muscularLoad: 0,
      mechanicalLoad: 0,
      qualityLoad: 0,
      recoveryDemand: 0,
      loadCategory: 'VERY_LOW',
      isHighLoadDay: false,
      qualitySessionCount: 0,
      sessionCount: 0,
      rawMechanicalLoad: 0,
      rawQualityLoad: 0,
    }
  }

  const tss = round1(sessions.reduce((sum, s) => sum + s.tss, 0))
  const cardiovascularLoad = combineNormalizedLoads(
    sessions.map((s) => s.cardiovascularLoad),
  )
  const muscularLoad = combineNormalizedLoads(
    sessions.map((s) => s.muscularLoad),
  )
  const mechanicalLoad = combineNormalizedLoads(
    sessions.map((s) => s.mechanicalLoad),
  )
  const qualityLoad = combineNormalizedLoads(
    sessions.map((s) => s.qualityLoad),
  )
  // Recovery: combine session recovery demands (not recompute from mixed dims).
  const recoveryDemand = combineNormalizedLoads(
    sessions.map((s) => s.recoveryDemand),
  )
  const rawMechanicalLoad = round1(
    sessions.reduce((sum, s) => sum + s.rawMechanicalLoad, 0),
  )
  const rawQualityLoad = round1(
    sessions.reduce((sum, s) => sum + s.rawQualityLoad, 0),
  )
  const qualitySessionCount = sessions.filter((s) => s.isQualitySession).length

  return {
    tss,
    cardiovascularLoad,
    muscularLoad,
    mechanicalLoad,
    qualityLoad,
    recoveryDemand,
    loadCategory: loadCategoryFromRecovery(recoveryDemand),
    isHighLoadDay: isHighLoadDay({
      recoveryDemand,
      mechanicalLoad,
      qualityLoad,
      tss,
    }),
    qualitySessionCount,
    sessionCount: sessions.length,
    rawMechanicalLoad,
    rawQualityLoad,
  }
}

export type WeeklyLoad = {
  weeklyTss: number
  weeklyQualityRaw: number
  weeklyMechanicalRaw: number
  weeklyMechanicalLoad: number
  highLoadDays: number
  qualitySessions: number
}

export function aggregateWeeklyLoad(
  dailyLoads: DailyLoad[],
  athleteTypicalWeeklyMechanicalRaw?: number | null,
): WeeklyLoad {
  const weeklyTss = round1(dailyLoads.reduce((sum, d) => sum + d.tss, 0))
  const weeklyQualityRaw = round1(
    dailyLoads.reduce((sum, d) => sum + d.rawQualityLoad, 0),
  )
  const weeklyMechanicalRaw = round1(
    dailyLoads.reduce((sum, d) => sum + d.rawMechanicalLoad, 0),
  )
  const baseline =
    athleteTypicalWeeklyMechanicalRaw && athleteTypicalWeeklyMechanicalRaw > 0
      ? athleteTypicalWeeklyMechanicalRaw
      : Math.max(weeklyMechanicalRaw, 50)
  const weeklyMechanicalLoad = round0(
    clamp((weeklyMechanicalRaw / baseline) * 100, 0, 150),
  )
  return {
    weeklyTss,
    weeklyQualityRaw,
    weeklyMechanicalRaw,
    weeklyMechanicalLoad,
    highLoadDays: dailyLoads.filter((d) => d.isHighLoadDay).length,
    qualitySessions: dailyLoads.reduce(
      (sum, d) => sum + d.qualitySessionCount,
      0,
    ),
  }
}

/** Map recovery / load category onto the coach-engine discrete class. */
export function sessionLoadClassFromWorkoutLoad(
  load: Pick<WorkoutLoad, 'loadCategory' | 'recoveryDemand' | 'isHighLoad'>,
): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
  switch (load.loadCategory) {
    case 'VERY_LOW':
    case 'LOW':
      return 'LOW'
    case 'MODERATE':
      return 'MODERATE'
    case 'HIGH':
      return 'HIGH'
    case 'VERY_HIGH':
      return 'VERY_HIGH'
  }
}
