import { WorkoutStatus, type WorkoutType } from '@prisma/client'
import { subWeeks } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { todayDateOnly, toDateKey } from '@/lib/dates'
import type {
  CollectedAthleteData,
  CollectedSession,
  CollectedWeek,
} from '@/lib/coach-engine/types'

function round1(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return Math.round(n * 10) / 10
}

function weekStartKey(date: Date): string {
  return toDateKey(
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() - ((date.getUTCDay() + 6) % 7),
      ),
    ),
  )
}

/** Rough session TSS when structured load is unavailable (v0.1 heuristic). */
export function estimateRoughSessionTss(args: {
  durationMin: number | null
  distanceKm: number | null
  rpe: number | null
  type: WorkoutType
}): number | null {
  const hours =
    args.durationMin != null && args.durationMin > 0
      ? args.durationMin / 60
      : args.distanceKm != null && args.distanceKm > 0
        ? args.distanceKm / 10
        : null
  if (hours == null || hours <= 0) return null
  const rpeIf =
    args.rpe != null && args.rpe > 0
      ? Math.min(1.15, Math.max(0.45, args.rpe / 10))
      : args.type === 'REST' || args.type === 'RECOVERY'
        ? 0.5
        : 0.7
  return Math.round(hours * rpeIf * rpeIf * 100)
}

/**
 * Empty history pack for general / imaginary athlete drafts.
 * Volume and zones come from the wizard brief overrides.
 */
export function emptyCollectedAthleteData(
  name = 'General athlete',
): CollectedAthleteData {
  return {
    athleteId: 'general',
    name,
    paces: {
      easy: null,
      tempo: null,
      threshold: null,
      vo2: null,
    },
    bikeFtpWatts: null,
    swimCssSecPer100m: null,
    hr: {
      max: null,
      resting: null,
    },
    races: [],
    recentSessions: [],
    weekSummaries: [],
  }
}

/** Normalize athlete DB rows into a coach-engine input pack. */
export async function collectAthleteData(
  athleteId: string,
  opts?: { lookbackWeeks?: number; maxSessions?: number },
): Promise<CollectedAthleteData> {
  const lookbackWeeks = Math.min(12, Math.max(4, opts?.lookbackWeeks ?? 10))
  const maxSessions = Math.min(40, Math.max(10, opts?.maxSessions ?? 24))
  const today = todayDateOnly()
  const rangeStart = subWeeks(today, lookbackWeeks)

  const athlete = await prisma.athlete.findUniqueOrThrow({
    where: { id: athleteId },
    select: {
      id: true,
      name: true,
      paceEasyMinPerKm: true,
      paceTempoMinPerKm: true,
      paceThresholdMinPerKm: true,
      paceVo2MaxMinPerKm: true,
      bikeFtpWatts: true,
      swimCssSecPer100m: true,
      hrMax: true,
      hrResting: true,
    },
  })

  const [races, workouts] = await Promise.all([
    prisma.race.findMany({
      where: {
        athleteId,
        date: { gte: today },
        resultsLogOnly: false,
      },
      orderBy: { date: 'asc' },
      take: 6,
      select: {
        name: true,
        date: true,
        type: true,
        sport: true,
        priority: true,
        goal: true,
      },
    }),
    prisma.workout.findMany({
      where: {
        athleteId,
        date: { gte: rangeStart, lte: today },
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        type: true,
        title: true,
        status: true,
        plannedDistance: true,
        plannedDuration: true,
        result: {
          select: {
            actualDistance: true,
            actualDuration: true,
            rpe: true,
          },
        },
      },
    }),
  ])

  const recentSessions: CollectedSession[] = []
  const weekMap = new Map<
    string,
    {
      planned: number
      completed: number
      skipped: number
      plannedDistanceKm: number
      completedDistanceKm: number
      estimatedTss: number
    }
  >()

  for (const w of workouts) {
    const durationMin =
      w.result?.actualDuration ?? w.plannedDuration ?? null
    const distanceKm =
      w.result?.actualDistance ?? w.plannedDistance ?? null
    const tss = estimateRoughSessionTss({
      durationMin,
      distanceKm,
      rpe: w.result?.rpe ?? null,
      type: w.type,
    })

    if (recentSessions.length < maxSessions) {
      recentSessions.push({
        date: toDateKey(w.date),
        type: w.type,
        title: w.title,
        status: w.status,
        plannedDistanceKm: round1(w.plannedDistance),
        plannedDurationMin: w.plannedDuration,
        actualDistanceKm: round1(w.result?.actualDistance ?? null),
        actualDurationMin: w.result?.actualDuration ?? null,
        rpe: w.result?.rpe ?? null,
        estimatedTss: tss,
      })
    }

    const key = weekStartKey(w.date)
    const bucket = weekMap.get(key) ?? {
      planned: 0,
      completed: 0,
      skipped: 0,
      plannedDistanceKm: 0,
      completedDistanceKm: 0,
      estimatedTss: 0,
    }
    bucket.planned += 1
    if (w.status === WorkoutStatus.COMPLETED) bucket.completed += 1
    if (w.status === WorkoutStatus.SKIPPED) bucket.skipped += 1
    bucket.plannedDistanceKm += w.plannedDistance ?? 0
    bucket.completedDistanceKm += w.result?.actualDistance ?? 0
    if (tss != null) bucket.estimatedTss += tss
    weekMap.set(key, bucket)
  }

  const weekSummaries: CollectedWeek[] = [...weekMap.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, lookbackWeeks)
    .map(([weekStart, b]) => ({
      weekStart,
      planned: b.planned,
      completed: b.completed,
      skipped: b.skipped,
      plannedDistanceKm: round1(b.plannedDistanceKm) ?? 0,
      completedDistanceKm: round1(b.completedDistanceKm) ?? 0,
      estimatedTss: Math.round(b.estimatedTss),
    }))

  return {
    athleteId: athlete.id,
    name: athlete.name,
    paces: {
      easy: athlete.paceEasyMinPerKm,
      tempo: athlete.paceTempoMinPerKm,
      threshold: athlete.paceThresholdMinPerKm,
      vo2: athlete.paceVo2MaxMinPerKm,
    },
    bikeFtpWatts: athlete.bikeFtpWatts,
    swimCssSecPer100m: athlete.swimCssSecPer100m,
    hr: {
      max: athlete.hrMax,
      resting: athlete.hrResting,
    },
    races: races.map((r) => ({
      name: r.name,
      date: toDateKey(r.date),
      type: r.type,
      sport: r.sport,
      priority: r.priority,
      goal: r.goal,
    })),
    recentSessions,
    weekSummaries,
  }
}
