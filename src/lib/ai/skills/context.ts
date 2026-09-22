import {
  WorkoutStatus,
  type WorkoutType,
} from '@prisma/client'
import { subWeeks } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { todayDateOnly, toDateKey } from '@/lib/dates'

export type AthleteContextPack = {
  athlete: {
    id: string
    name: string
    paces: Record<string, number | null>
    bike: Record<string, number | null>
    swimCssSecPer100m: number | null
    hr: Record<string, number | null>
  }
  races: {
    name: string
    date: string
    type: string
    sport: string
    priority: string
    goal: string | null
  }[]
  recentSessions: {
    date: string
    type: WorkoutType
    title: string
    status: WorkoutStatus
    plannedDistance: number | null
    plannedDuration: number | null
    actualDistance: number | null
    actualDuration: number | null
    rpe: number | null
    feeling: number | null
    athleteNotes: string | null
  }[]
  weekSummaries: {
    weekStart: string
    planned: number
    completed: number
    skipped: number
    plannedDistanceKm: number
    completedDistanceKm: number
  }[]
  textSummary: string
}

function round1(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return Math.round(n * 10) / 10
}

/** Compact athlete history for LLM prompts (token-capped). */
export async function buildAthleteContextPack(
  athleteId: string,
  opts?: { lookbackWeeks?: number; maxSessions?: number },
): Promise<AthleteContextPack> {
  const lookbackWeeks = Math.min(12, Math.max(4, opts?.lookbackWeeks ?? 10))
  const maxSessions = Math.min(30, Math.max(10, opts?.maxSessions ?? 20))
  const today = todayDateOnly()
  const rangeStart = subWeeks(today, lookbackWeeks)

  const athlete = await prisma.athlete.findUniqueOrThrow({
    where: { id: athleteId },
    select: {
      id: true,
      name: true,
      paceRecoveryMinPerKm: true,
      paceEasyMinPerKm: true,
      paceTempoMinPerKm: true,
      paceThresholdMinPerKm: true,
      paceVo2MaxMinPerKm: true,
      bikeSpeedEasyKph: true,
      bikeSpeedTempoKph: true,
      bikeSpeedThresholdKph: true,
      bikeFtpWatts: true,
      swimCssSecPer100m: true,
      hrMax: true,
      hrResting: true,
      hrZone1Max: true,
      hrZone2Max: true,
      hrZone3Max: true,
      hrZone4Max: true,
    },
  })

  const [races, workouts, allInRange] = await Promise.all([
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
      take: maxSessions,
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
            feeling: true,
            athleteNotes: true,
          },
        },
      },
    }),
    prisma.workout.findMany({
      where: {
        athleteId,
        date: { gte: rangeStart, lte: today },
      },
      select: {
        date: true,
        status: true,
        plannedDistance: true,
        result: { select: { actualDistance: true } },
      },
    }),
  ])

  const recentSessions = workouts.map((w) => ({
    date: toDateKey(w.date),
    type: w.type,
    title: w.title,
    status: w.status,
    plannedDistance: round1(w.plannedDistance),
    plannedDuration: w.plannedDuration,
    actualDistance: round1(w.result?.actualDistance ?? null),
    actualDuration: w.result?.actualDuration ?? null,
    rpe: w.result?.rpe ?? null,
    feeling: w.result?.feeling ?? null,
    athleteNotes: w.result?.athleteNotes
      ? w.result.athleteNotes.slice(0, 240)
      : null,
  }))

  const weekMap = new Map<
    string,
    {
      planned: number
      completed: number
      skipped: number
      plannedDistanceKm: number
      completedDistanceKm: number
    }
  >()

  for (const w of allInRange) {
    const weekStart = toDateKey(
      new Date(
        Date.UTC(
          w.date.getUTCFullYear(),
          w.date.getUTCMonth(),
          w.date.getUTCDate() - ((w.date.getUTCDay() + 6) % 7),
        ),
      ),
    )
    const bucket = weekMap.get(weekStart) ?? {
      planned: 0,
      completed: 0,
      skipped: 0,
      plannedDistanceKm: 0,
      completedDistanceKm: 0,
    }
    bucket.planned += 1
    if (w.status === WorkoutStatus.COMPLETED) bucket.completed += 1
    if (w.status === WorkoutStatus.SKIPPED) bucket.skipped += 1
    bucket.plannedDistanceKm += w.plannedDistance ?? 0
    bucket.completedDistanceKm += w.result?.actualDistance ?? 0
    weekMap.set(weekStart, bucket)
  }

  const weekSummaries = [...weekMap.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, lookbackWeeks)
    .map(([weekStart, b]) => ({
      weekStart,
      planned: b.planned,
      completed: b.completed,
      skipped: b.skipped,
      plannedDistanceKm: round1(b.plannedDistanceKm) ?? 0,
      completedDistanceKm: round1(b.completedDistanceKm) ?? 0,
    }))

  const pack: AthleteContextPack = {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      paces: {
        recovery: athlete.paceRecoveryMinPerKm,
        easy: athlete.paceEasyMinPerKm,
        tempo: athlete.paceTempoMinPerKm,
        threshold: athlete.paceThresholdMinPerKm,
        vo2: athlete.paceVo2MaxMinPerKm,
      },
      bike: {
        easyKph: athlete.bikeSpeedEasyKph,
        tempoKph: athlete.bikeSpeedTempoKph,
        thresholdKph: athlete.bikeSpeedThresholdKph,
        ftpWatts: athlete.bikeFtpWatts,
      },
      swimCssSecPer100m: athlete.swimCssSecPer100m,
      hr: {
        max: athlete.hrMax,
        resting: athlete.hrResting,
        z1: athlete.hrZone1Max,
        z2: athlete.hrZone2Max,
        z3: athlete.hrZone3Max,
        z4: athlete.hrZone4Max,
      },
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
    textSummary: '',
  }

  pack.textSummary = formatContextPackForPrompt(pack)
  return pack
}

export function formatContextPackForPrompt(pack: AthleteContextPack): string {
  const lines: string[] = []
  lines.push(`Athlete: ${pack.athlete.name}`)
  lines.push(
    `Paces (min/km): easy=${pack.athlete.paces.easy ?? '—'} tempo=${pack.athlete.paces.tempo ?? '—'} threshold=${pack.athlete.paces.threshold ?? '—'}`,
  )
  lines.push(
    `Bike: FTP=${pack.athlete.bike.ftpWatts ?? '—'}W · Swim CSS=${pack.athlete.swimCssSecPer100m ?? '—'}s/100m`,
  )
  if (pack.races.length) {
    lines.push('Upcoming races:')
    for (const r of pack.races) {
      lines.push(
        `  - ${r.date} ${r.name} (${r.type}/${r.sport}, ${r.priority})${r.goal ? ` goal: ${r.goal}` : ''}`,
      )
    }
  }
  lines.push('Recent week compliance (newest first):')
  for (const w of pack.weekSummaries.slice(0, 8)) {
    const rate =
      w.planned > 0 ? Math.round((w.completed / w.planned) * 100) : 0
    lines.push(
      `  - week ${w.weekStart}: ${w.completed}/${w.planned} done (${rate}%), skip=${w.skipped}, dist ${w.completedDistanceKm}/${w.plannedDistanceKm} km`,
    )
  }
  lines.push('Recent sessions:')
  for (const s of pack.recentSessions.slice(0, 16)) {
    const notes = s.athleteNotes ? ` notes="${s.athleteNotes}"` : ''
    lines.push(
      `  - ${s.date} [${s.status}] ${s.type} ${s.title} plan=${s.plannedDistance ?? '—'}km/${s.plannedDuration ?? '—'}min actual=${s.actualDistance ?? '—'}km rpe=${s.rpe ?? '—'} feeling=${s.feeling ?? '—'}${notes}`,
    )
  }
  return lines.join('\n')
}
