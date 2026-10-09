import type { WorkoutType } from '@prisma/client'
import { WorkoutType as SportEnum } from '@prisma/client'
import { getWorkoutCardEssenceLines } from '@/lib/workout-builder/card-summary'
import { DEFAULT_DURATION_NOTATION } from '@/lib/workout-builder/duration-notation'
import { normalizeStructureIntensities } from '@/lib/workout-builder/effort-presets'
import {
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
} from '@/lib/workout-builder/segment-estimation'
import type { WorkoutBlock, WorkoutStructure } from '@/lib/workout-builder/types'
import type { CandidateWorkout } from '@/lib/coach-engine/types'

/**
 * Structure is the single source of truth for athlete-facing copy.
 * Clears stale cardSummary.essence overrides and rebuilds description
 * from the actual blocks so subtitle / card / builder never diverge.
 */
export function syncCopyFromStructure(args: {
  structure: WorkoutStructure | null | undefined
  sport: WorkoutType
  title: string
  fallbackDescription?: string | null
  /** Include WU/CD blocks so library copy matches full structure. */
  includeAllBlocks?: boolean
}): {
  structure: WorkoutStructure | null
  description: string
  title: string
} {
  const structure = normalizeStructureIntensities(args.structure)
  if (!structure) {
    return {
      structure: null,
      description: args.fallbackDescription?.trim() || '',
      title: args.title,
    }
  }

  const cleaned: WorkoutStructure = {
    ...structure,
    cardSummary: (() => {
      // Full-structure sync must not keep a partial highlight that drifts from
      // plannedDistance after scaling (e.g. "4.4 km Steady" vs 15.5 km long).
      if (args.includeAllBlocks) return undefined
      const ids = structure.cardSummary?.highlightedBlockIds?.filter(Boolean)
      if (ids && ids.length > 0) return { highlightedBlockIds: ids }
      return undefined
    })(),
  }

  const lines = getWorkoutCardEssenceLines(
    cleaned,
    args.sport,
    DEFAULT_DURATION_NOTATION,
    {
      includeAllBlocks: Boolean(args.includeAllBlocks),
    },
  )
  const prescription = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' · ')

  const description =
    prescription || args.fallbackDescription?.trim() || ''

  return {
    structure: cleaned,
    description,
    title: syncTitleReps(args.title, cleaned),
  }
}

function primaryInterval(structure: WorkoutStructure): WorkoutBlock | null {
  return (
    structure.mainSet.find(
      (b) => b.type === 'INTERVAL' || b.type === 'REPETITION',
    ) ?? null
  )
}

/** Keep titles like "HM-specific 3×3 km" aligned with adapted rep count. */
function syncTitleReps(title: string, structure: WorkoutStructure): string {
  if (!/\d+\s*[×x]/i.test(title)) return title
  const block = primaryInterval(structure)
  const reps = block?.repetitions
  if (reps == null || reps < 1) return title
  return title.replace(/\d+\s*[×x]/gi, `${reps}×`)
}

function explicitBlockDistanceKm(block: WorkoutBlock): number {
  if (
    (block.type === 'CONTINUOUS' ||
      block.type === 'PROGRESSIVE' ||
      block.type === 'RECOVERY') &&
    block.durationType === 'distance' &&
    block.distance != null &&
    block.distance > 0
  ) {
    return block.distanceUnit === 'm' ? block.distance / 1000 : block.distance
  }
  if (block.type === 'INTERVAL' || block.type === 'REPETITION') {
    const reps = block.repetitions ?? 1
    let per = 0
    if (block.work?.mode === 'distance' && block.work.value > 0) {
      per +=
        block.work.unit === 'm' ? block.work.value / 1000 : block.work.value
    }
    if (block.recovery?.mode === 'distance' && block.recovery.value > 0) {
      const desc = (block.recovery.description ?? '').toLowerCase()
      if (!/rest|stand|walk/.test(desc)) {
        per +=
          block.recovery.unit === 'm'
            ? block.recovery.value / 1000
            : block.recovery.value
      }
    }
    return reps * per
  }
  return 0
}

/** Sum only authored distance blocks (no pace/speed invention). */
export function explicitStructureDistanceKm(
  structure: WorkoutStructure | null | undefined,
): number {
  if (!structure) return 0
  let total = 0
  for (const block of [
    ...structure.warmup,
    ...structure.mainSet,
    ...structure.cooldown,
  ]) {
    total += explicitBlockDistanceKm(block)
  }
  return Math.round(total * 10) / 10
}

function raceMainDistanceKm(
  structure: WorkoutStructure | null | undefined,
): number | null {
  if (!structure) return null
  for (const block of structure.mainSet) {
    const km = explicitBlockDistanceKm(block)
    if (km > 0) return Math.round(km * 10) / 10
  }
  return null
}

function sportTracksDistance(sport: WorkoutType): boolean {
  return (
    sport === SportEnum.RUN ||
    sport === SportEnum.BIKE ||
    sport === SportEnum.SWIM ||
    sport === SportEnum.TRIATHLON ||
    sport === SportEnum.HYROX
  )
}

/**
 * Align catalog meta (duration / distance / description) with builder structure.
 * Structure wins whenever it has content.
 */
export function alignCandidateWithStructure<
  T extends Pick<
    CandidateWorkout,
    | 'sport'
    | 'title'
    | 'description'
    | 'durationMin'
    | 'distanceKm'
    | 'tags'
    | 'structure'
  >,
>(candidate: T): T {
  const synced = syncCopyFromStructure({
    structure: candidate.structure,
    sport: candidate.sport,
    title: candidate.title,
    fallbackDescription: candidate.description,
    // Library catalog copy must reflect the full builder structure (WU + main + CD).
    includeAllBlocks: true,
  })

  if (!synced.structure) {
    return {
      ...candidate,
      description: synced.description || candidate.description,
      structure: null,
    }
  }

  const tags = candidate.tags ?? []
  const isRaceDay = tags.some((t) => /race-day/i.test(t))
  const estDur = estimateStructureDurationMinutes(
    synced.structure,
    null,
    candidate.sport,
  )
  const estDist = estimateStructureDistanceKm(
    synced.structure,
    null,
    candidate.sport,
  )
  const explicitDist = explicitStructureDistanceKm(synced.structure)

  let durationMin = candidate.durationMin
  let distanceKm = candidate.distanceKm

  if (candidate.sport === SportEnum.REST) {
    durationMin = 0
    distanceKm = null
  } else if (!sportTracksDistance(candidate.sport)) {
    distanceKm = null
    if (estDur > 0) durationMin = estDur
  } else if (isRaceDay) {
    // Official race distance only — do not sum WU/CD estimates.
    distanceKm =
      raceMainDistanceKm(synced.structure) ??
      (explicitDist > 0 ? explicitDist : candidate.distanceKm)
    if (estDur > 0) durationMin = estDur
  } else if (candidate.sport === SportEnum.SWIM) {
    // Prefer authored metres; swim duration needs CSS so estimates can be nonsense
    // without athlete prefs — only adopt when estimate looks plausible (~≥1:12/100).
    distanceKm =
      explicitDist > 0
        ? explicitDist
        : estDist > 0
          ? estDist
          : candidate.distanceKm
    const minPlausibleDur =
      distanceKm != null && distanceKm > 0 ? distanceKm * 12 : 0
    if (estDur > 0 && estDur >= minPlausibleDur) {
      durationMin = estDur
    }
  } else {
    // Builder Auto is the source of truth for session totals.
    if (estDur > 0) durationMin = estDur
    if (estDist > 0) distanceKm = estDist
    else if (explicitDist > 0) distanceKm = explicitDist
    else distanceKm = null
  }

  return {
    ...candidate,
    title: synced.title,
    description: synced.description || candidate.description,
    structure: synced.structure,
    durationMin,
    distanceKm,
  }
}

/**
 * Detect title/notes contradictions (e.g. "Easy long run" + "marathon pace").
 * Returns a cleaned coachNotes string, or null to clear.
 */
export function reconcileCoachNotesWithSession(args: {
  title: string
  description?: string | null
  sessionType?: string | null
  coachNotes?: string | null
  structure?: WorkoutStructure | null
}): string | null {
  const notes = args.coachNotes?.trim() || null
  if (!notes) return null

  const title = args.title.toLowerCase()
  const notesLower = notes.toLowerCase()
  const structureText = JSON.stringify(args.structure ?? {}).toLowerCase()
  const hasMpInNotes = /marathon\s*pace|\bmp\b/.test(notesLower)
  const hasMpInStructure = /marathon\s*pace|\bmp\b/.test(structureText)
  const titledEasy =
    /\beasy\b/.test(title) || args.sessionType === 'EASY_RUN' || args.sessionType === 'RECOVERY_RUN'

  if (titledEasy && hasMpInNotes && !hasMpInStructure) {
    // Notes claim MP but workout is easy — drop the contradiction.
    return args.description?.trim() || null
  }

  if (
    args.sessionType === 'LONG_RUN' &&
    /\beasy\b/.test(title) &&
    hasMpInNotes &&
    !hasMpInStructure
  ) {
    return args.description?.trim() || null
  }

  return notes
}

/**
 * Scale continuous/progressive time & distance blocks so structure totals
 * match a session-level volume scale (recovery / taper / floor).
 */
export function scaleStructureVolume(
  structure: WorkoutStructure | null | undefined,
  factor: number,
): WorkoutStructure | null {
  if (!structure) return null
  if (!(factor > 0) || Math.abs(factor - 1) < 0.02) return structure

  const scaleBlock = (block: WorkoutBlock): WorkoutBlock => {
    if (block.type !== 'CONTINUOUS' && block.type !== 'PROGRESSIVE') {
      return block
    }
    if (block.durationType === 'time' && block.time != null && block.time > 0) {
      return {
        ...block,
        time: Math.max(5, Math.round(block.time * factor)),
      }
    }
    if (
      block.durationType === 'distance' &&
      block.distance != null &&
      block.distance > 0
    ) {
      return {
        ...block,
        distance: Math.max(0.5, Math.round(block.distance * factor * 10) / 10),
      }
    }
    return block
  }

  return {
    ...structure,
    warmup: structure.warmup.map(scaleBlock),
    mainSet: structure.mainSet.map(scaleBlock),
    cooldown: structure.cooldown.map(scaleBlock),
  }
}
