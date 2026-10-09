import {
  Prisma,
  SessionType,
  WorkoutType,
  type CoachEngineWorkout,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  listSeedWorkoutLibrary,
  setWorkoutLibraryCache,
} from '@/lib/coach-engine/library'
import { PROGRESSION_GRAPH } from '@/lib/coach-engine/library-v2'
import { alignCandidateWithStructure } from '@/lib/coach-engine/session-copy'
import type {
  AdaptationKey,
  CandidateWorkout,
  TrainingModelId,
} from '@/lib/coach-engine/types'
import { ADAPTATION_KEYS } from '@/lib/coach-engine/types'
import { parseStructure } from '@/lib/workout-builder/utils'
import { parseSwimStructure } from '@/lib/swim-workout/parse'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import type { SwimWorkoutStructure } from '@/lib/swim-workout/types'

const LOAD_LEVELS = new Set(['low', 'medium', 'high'])
const DIFFICULTIES = new Set(['easy', 'medium', 'medium_high', 'hard'])
const FAMILIES = new Set([
  'easy',
  'quality',
  'long',
  'strength',
  'race',
  'rest',
])

function asAdaptation(value: string): AdaptationKey {
  return (ADAPTATION_KEYS as readonly string[]).includes(value)
    ? (value as AdaptationKey)
    : 'aerobic_capacity'
}

function asLoad(value: string): CandidateWorkout['cardiovascularLoad'] {
  return LOAD_LEVELS.has(value)
    ? (value as CandidateWorkout['cardiovascularLoad'])
    : 'low'
}

function asDifficulty(value: string): CandidateWorkout['difficulty'] {
  return DIFFICULTIES.has(value)
    ? (value as CandidateWorkout['difficulty'])
    : 'easy'
}

function asFamily(value: string | null): CandidateWorkout['family'] {
  if (!value || !FAMILIES.has(value)) return undefined
  return value as CandidateWorkout['family']
}

export function rowToCandidate(row: CoachEngineWorkout): CandidateWorkout {
  const structure = row.structure
    ? parseStructure(row.structure)
    : null
  const swimStructure = row.swimStructure
    ? parseSwimStructure(row.swimStructure)
    : null
  return alignCandidateWithStructure({
    id: row.id,
    primaryAdaptation: asAdaptation(row.primaryAdaptation),
    sport: row.sport,
    sessionType: row.sessionType,
    title: row.title,
    description: row.description,
    durationMin: row.durationMin,
    distanceKm: row.distanceKm,
    cardiovascularLoad: asLoad(row.cardiovascularLoad),
    muscularLoad: asLoad(row.muscularLoad),
    mechanicalLoad: asLoad(row.mechanicalLoad),
    difficulty: asDifficulty(row.difficulty),
    tags: row.tags,
    intervalCount: row.intervalCount,
    intervalDurationMin: row.intervalDurationMin,
    recoveryMin: row.recoveryMin,
    methodologyTags: row.methodologyTags as TrainingModelId[],
    progressionTo: row.progressionTo,
    family: asFamily(row.family),
    structure,
    swimStructure,
  })
}

export function candidateToRowData(candidate: CandidateWorkout, sortOrder: number) {
  const structureJson = candidate.structure
    ? (candidate.structure as Prisma.InputJsonValue)
    : Prisma.DbNull
  const swimJson = candidate.swimStructure
    ? (candidate.swimStructure as Prisma.InputJsonValue)
    : Prisma.DbNull
  return {
    id: candidate.id,
    primaryAdaptation: candidate.primaryAdaptation,
    sport: candidate.sport,
    sessionType: candidate.sessionType,
    title: candidate.title,
    description: candidate.description,
    durationMin: candidate.durationMin,
    distanceKm: candidate.distanceKm,
    cardiovascularLoad: candidate.cardiovascularLoad,
    muscularLoad: candidate.muscularLoad,
    mechanicalLoad: candidate.mechanicalLoad,
    difficulty: candidate.difficulty,
    tags: candidate.tags,
    intervalCount: candidate.intervalCount,
    intervalDurationMin: candidate.intervalDurationMin,
    recoveryMin: candidate.recoveryMin,
    methodologyTags: candidate.methodologyTags ?? [],
    progressionTo:
      candidate.progressionTo ?? PROGRESSION_GRAPH[candidate.id] ?? [],
    family: candidate.family ?? null,
    isActive: true,
    sortOrder,
    structure: structureJson,
    swimStructure: swimJson,
  }
}

/** Load active DB workouts into the in-memory engine cache (seed fallback). */
export async function refreshWorkoutLibraryFromDb(): Promise<CandidateWorkout[]> {
  try {
    const rows = await prisma.coachEngineWorkout.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    if (rows.length === 0) {
      setWorkoutLibraryCache(null)
      return listSeedWorkoutLibrary()
    }
    const candidates = rows.map(rowToCandidate)
    setWorkoutLibraryCache(candidates)
    return candidates
  } catch {
    setWorkoutLibraryCache(null)
    return listSeedWorkoutLibrary()
  }
}

/** Upsert file seed into DB (admin "Reset from seed"). Overwrites builder structure from seed. */
export async function seedCoachEngineWorkoutsFromCode(): Promise<number> {
  const seed = listSeedWorkoutLibrary()
  let i = 0
  for (const candidate of seed) {
    const data = candidateToRowData(candidate, i)
    await prisma.coachEngineWorkout.upsert({
      where: { id: candidate.id },
      create: data,
      update: {
        ...data,
        isActive: true,
      },
    })
    i += 1
  }
  // Remove DB rows that are no longer in the seed catalog.
  const seedIds = seed.map((s) => s.id)
  await prisma.coachEngineWorkout.deleteMany({
    where: { id: { notIn: seedIds } },
  })
  await refreshWorkoutLibraryFromDb()
  return seed.length
}

export type CoachEngineWorkoutAdminRow = {
  id: string
  title: string
  sport: WorkoutType
  sessionType: SessionType
  primaryAdaptation: string
  durationMin: number
  distanceKm: number | null
  difficulty: string
  cardiovascularLoad: string
  tags: string[]
  isActive: boolean
  sortOrder: number
  description: string
  intervalCount: number | null
  intervalDurationMin: number | null
  recoveryMin: number | null
  methodologyTags: string[]
  progressionTo: string[]
  family: string | null
  hasStructure: boolean
  structure: WorkoutStructure | null
  swimStructure: SwimWorkoutStructure | null
}

export async function listCoachEngineWorkoutsAdmin(): Promise<
  CoachEngineWorkoutAdminRow[]
> {
  const rows = await prisma.coachEngineWorkout.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  return rows.map((r) => {
    const structure = r.structure ? parseStructure(r.structure) : null
    const swimStructure = r.swimStructure
      ? parseSwimStructure(r.swimStructure)
      : null
    const aligned = alignCandidateWithStructure({
      id: r.id,
      primaryAdaptation: asAdaptation(r.primaryAdaptation),
      sport: r.sport,
      sessionType: r.sessionType,
      title: r.title,
      description: r.description,
      durationMin: r.durationMin,
      distanceKm: r.distanceKm,
      cardiovascularLoad: asLoad(r.cardiovascularLoad),
      muscularLoad: asLoad(r.muscularLoad),
      mechanicalLoad: asLoad(r.mechanicalLoad),
      difficulty: asDifficulty(r.difficulty),
      tags: r.tags,
      intervalCount: r.intervalCount,
      intervalDurationMin: r.intervalDurationMin,
      recoveryMin: r.recoveryMin,
      structure,
      swimStructure,
    })
    return {
      id: r.id,
      title: aligned.title,
      sport: r.sport,
      sessionType: r.sessionType,
      primaryAdaptation: r.primaryAdaptation,
      durationMin: aligned.durationMin,
      distanceKm: aligned.distanceKm,
      difficulty: r.difficulty,
      cardiovascularLoad: r.cardiovascularLoad,
      tags: r.tags,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      description: aligned.description,
      intervalCount: r.intervalCount,
      intervalDurationMin: r.intervalDurationMin,
      recoveryMin: r.recoveryMin,
      methodologyTags: r.methodologyTags,
      progressionTo: r.progressionTo,
      family: r.family,
      hasStructure: Boolean(r.structure) || Boolean(r.swimStructure),
      structure: aligned.structure ?? structure,
      swimStructure,
    }
  })
}

export async function saveCoachEngineWorkoutStructure(args: {
  id: string
  title?: string
  description?: string | null
  sport?: WorkoutType
  sessionType?: SessionType
  durationMin?: number | null
  distanceKm?: number | null
  tags?: string[]
  structure: WorkoutStructure | null
  swimStructure?: SwimWorkoutStructure | null
}): Promise<void> {
  const id = args.id.trim()
  if (!id) throw new Error('Workout id required')

  const existing = await prisma.coachEngineWorkout.findUnique({ where: { id } })
  if (!existing) throw new Error(`Library workout ${id} not found`)

  const aligned = alignCandidateWithStructure({
    id,
    primaryAdaptation: asAdaptation(existing.primaryAdaptation),
    sport: args.sport ?? existing.sport,
    sessionType: args.sessionType ?? existing.sessionType,
    title: args.title ?? existing.title,
    description:
      args.description !== undefined
        ? (args.description ?? '')
        : existing.description,
    durationMin: args.durationMin ?? existing.durationMin,
    distanceKm:
      args.distanceKm !== undefined ? args.distanceKm : existing.distanceKm,
    cardiovascularLoad: asLoad(existing.cardiovascularLoad),
    muscularLoad: asLoad(existing.muscularLoad),
    mechanicalLoad: asLoad(existing.mechanicalLoad),
    difficulty: asDifficulty(existing.difficulty),
    tags: args.tags ?? existing.tags,
    intervalCount: existing.intervalCount,
    intervalDurationMin: existing.intervalDurationMin,
    recoveryMin: existing.recoveryMin,
    structure: args.structure,
    swimStructure: args.swimStructure ?? null,
  })

  await prisma.coachEngineWorkout.update({
    where: { id },
    data: {
      title: aligned.title,
      description: aligned.description,
      ...(args.sport != null ? { sport: args.sport } : {}),
      ...(args.sessionType != null ? { sessionType: args.sessionType } : {}),
      durationMin: aligned.durationMin,
      distanceKm: aligned.distanceKm,
      ...(args.tags != null ? { tags: args.tags } : {}),
      structure: aligned.structure
        ? (aligned.structure as Prisma.InputJsonValue)
        : Prisma.DbNull,
      swimStructure: args.swimStructure
        ? (args.swimStructure as Prisma.InputJsonValue)
        : Prisma.DbNull,
    },
  })
  await refreshWorkoutLibraryFromDb()
}
