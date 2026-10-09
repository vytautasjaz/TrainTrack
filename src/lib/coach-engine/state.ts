import type {
  AthleteLevel,
  AthleteState,
  CollectedAthleteData,
  MetricWithConfidence,
} from '@/lib/coach-engine/types'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function parseAthleteLevel(raw: unknown): AthleteLevel {
  if (
    raw === 'beginner' ||
    raw === 'intermediate' ||
    raw === 'advanced' ||
    raw === 'elite'
  ) {
    return raw
  }
  return 'intermediate'
}

function metric(
  value: number | null,
  source: MetricWithConfidence['source'],
  confidence: number,
): MetricWithConfidence {
  return {
    value,
    source: value == null ? 'missing' : source,
    confidence: value == null ? 0 : confidence,
  }
}

/** Build a normalized AthleteState from collected training history. */
export function buildAthleteState(
  data: CollectedAthleteData,
  level: AthleteLevel,
): AthleteState {
  const recentWeeks = data.weekSummaries.slice(0, 4)
  const runKm = avg(
    recentWeeks.map((w) =>
      Math.max(w.completedDistanceKm, w.plannedDistanceKm * 0.5),
    ),
  )
  const sessionsPerWeek = avg(
    recentWeeks.map((w) => w.completed || w.planned * 0.6),
  )
  const avgWeeklyTss = avg(recentWeeks.map((w) => w.estimatedTss))

  const consistency =
    recentWeeks.length === 0
      ? 0.5
      : clamp01(
          avg(
            recentWeeks.map((w) =>
              w.planned > 0 ? w.completed / w.planned : 0.5,
            ),
          ),
        )

  const recentRpe = data.recentSessions
    .slice(0, 8)
    .map((s) => s.rpe)
    .filter((r): r is number => r != null && r > 0)
  const readinessScore =
    recentRpe.length === 0
      ? 0.72
      : clamp01(1 - (avg(recentRpe) - 5) / 10)

  const loadCardio = clamp01(avgWeeklyTss / 120) * 100
  const loadMechanical = clamp01(runKm / 70) * 100
  const loadMuscular = clamp01((loadCardio + loadMechanical) / 2)

  const olderKm = avg(
    data.weekSummaries.slice(4, 8).map((w) => w.completedDistanceKm),
  )
  let trend: AthleteState['performanceTrend']['running'] = 'unknown'
  if (recentWeeks.length >= 2 && olderKm > 0) {
    const delta = (runKm - olderKm) / olderKm
    if (delta > 0.08) trend = 'improving'
    else if (delta < -0.08) trend = 'declining'
    else trend = 'stable'
  } else if (recentWeeks.length >= 2) {
    trend = 'stable'
  }

  return {
    athleteId: data.athleteId,
    name: data.name,
    trainingLoad: {
      cardiovascular: Math.round(loadCardio),
      muscular: Math.round(loadMuscular),
      mechanical: Math.round(loadMechanical),
    },
    readiness: {
      score: Math.round(readinessScore * 100) / 100,
      confidence: recentRpe.length >= 4 ? 0.55 : 0.35,
    },
    recentVolume: {
      runningKmPerWeek: Math.round(runKm * 10) / 10,
      sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
      avgWeeklyTss: Math.round(avgWeeklyTss),
    },
    performanceTrend: { running: trend },
    consistency: Math.round(consistency * 100) / 100,
    level,
    metrics: {
      thresholdPace: metric(
        data.paces.threshold,
        'athlete_entered',
        data.paces.threshold != null ? 0.7 : 0,
      ),
      easyPace: metric(
        data.paces.easy,
        'athlete_entered',
        data.paces.easy != null ? 0.65 : 0,
      ),
      weeklyVolumeKm: metric(
        runKm > 0 ? Math.round(runKm * 10) / 10 : null,
        recentWeeks.length >= 4 ? 'estimated_from_history' : 'missing',
        recentWeeks.length >= 4 ? 0.75 : recentWeeks.length > 0 ? 0.45 : 0,
      ),
      ftpWatts: metric(
        data.bikeFtpWatts,
        'athlete_entered',
        data.bikeFtpWatts != null ? 0.7 : 0,
      ),
    },
  }
}
