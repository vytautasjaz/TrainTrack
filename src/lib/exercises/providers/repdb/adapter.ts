import { normalizeSearchText } from '@/lib/exercises/normalize'
import {
  indexKeysForName,
  lookupKeysForLocalName,
  matchKey,
  matchPriority,
} from '@/lib/exercises/providers/match-keys'
import type { ExerciseProvider } from '@/lib/exercises/providers/types'
import type { ExternalExercise } from '@/lib/exercises/providers/types'
import type { ExerciseMedia, ExerciseMediaItem } from '@/lib/exercises/types'

/**
 * RepDB free exercise dataset — https://github.com/RepDB/exercise-dataset
 *
 * License (LICENSE-DATA.md): free personal + commercial in-app use with
 * visible attribution "Exercise data by RepDB (repdb.co)". Do not republish
 * as a standalone dataset/API. We hotlink hosted WebP assets and enrich
 * existing TrainTrack rows in-place (no redistribution of the corpus).
 */
export const REPDB_HOMEPAGE = 'https://repdb.co'
export const REPDB_DATASET_URL = 'https://exercise-dataset.com'
export const REPDB_INDEX_URL = `${REPDB_DATASET_URL}/exercises.json`
export const REPDB_LICENSE = 'RepDB free tier (attribution required)'
export const REPDB_ATTRIBUTION = 'Exercise data by RepDB (repdb.co)'
export const REPDB_ATTRIBUTION_URL = 'https://repdb.co'

type RepdbFlatImages = {
  start?: string
  peak?: string
  main?: string
}

type RepdbRaw = {
  id: string
  name_en: string
  name_de?: string
  name_es?: string
  description_en?: string
  instructions_en?: string[]
  tips_en?: string[]
  category?: string
  difficulty?: string
  equipment?: string | null
  body_part?: string
  primary_muscles?: string[]
  secondary_muscles?: string[]
  force_type?: string
  mechanic?: string
  images?: { flat?: RepdbFlatImages }
}

function absoluteImageUrl(relative: string): string {
  const path = relative.replace(/^\//, '')
  return `${REPDB_DATASET_URL}/${path}`
}

function mapEquipment(raw: string | null | undefined): string[] {
  if (!raw) return ['BODYWEIGHT']
  const key = raw.toLowerCase().replace(/\s+/g, '_')
  const map: Record<string, string> = {
    barbell: 'BARBELL',
    dumbbell: 'DUMBBELL',
    kettlebell: 'KETTLEBELL',
    cable: 'CABLE',
    machine: 'MACHINE',
    band: 'BAND',
    bands: 'BAND',
    bodyweight: 'BODYWEIGHT',
    none: 'BODYWEIGHT',
    ab_wheel: 'OTHER',
    ez_bar: 'BARBELL',
    smith_machine: 'MACHINE',
    medicine_ball: 'MEDICINE_BALL',
    pull_up_bar: 'OTHER',
    bench: 'OTHER',
  }
  return [map[key] ?? raw.toUpperCase().replace(/\s+/g, '_')]
}

function mapMuscle(raw: string): string {
  return raw.toUpperCase().replace(/-/g, '_')
}

function mediaFromImages(flat: RepdbFlatImages | undefined): ExerciseMedia | null {
  if (!flat) return null
  // Start then peak so preview can animate the movement; main for holds/stretches.
  const ordered = [flat.start, flat.peak, flat.main].filter(
    (p): p is string => Boolean(p),
  )
  const unique = [...new Set(ordered)]
  if (unique.length === 0) return null
  const items: ExerciseMediaItem[] = unique.map((rel) => ({
    type: 'IMAGE' as const,
    url: absoluteImageUrl(rel),
    thumbnailUrl: absoluteImageUrl(rel),
    source: 'REPDB',
    license: REPDB_LICENSE,
    attribution: REPDB_ATTRIBUTION,
  }))
  return { items }
}

export function repdbRawToExternal(row: RepdbRaw): ExternalExercise {
  const instructions = (row.instructions_en ?? []).filter(Boolean)
  const tips = (row.tips_en ?? []).filter(Boolean)
  const aliases = [row.name_de, row.name_es].filter(
    (n): n is string => Boolean(n?.trim()),
  )

  return {
    source: 'OTHER',
    sourceId: row.id,
    name: row.name_en,
    aliases,
    category: (row.category ?? 'strength').toUpperCase(),
    movementPattern: row.force_type?.toUpperCase(),
    equipment: mapEquipment(row.equipment),
    primaryMuscles: (row.primary_muscles ?? []).map(mapMuscle),
    secondaryMuscles: (row.secondary_muscles ?? []).map(mapMuscle),
    prescriptionTypes: ['REPS', 'WEIGHT', 'RPE'],
    modalities: ['STRENGTH'],
    searchTerms: [normalizeSearchText(row.name_en)],
    shortDescription: row.description_en?.trim() || undefined,
    instructions: instructions.length ? instructions.join('\n') : undefined,
    coachingCues: tips.length ? tips.slice(0, 6) : instructions.slice(0, 3),
    commonMistakes: [],
    difficulty: row.difficulty ?? undefined,
    media: mediaFromImages(row.images?.flat),
    raw: row,
  }
}

export async function fetchRepdbIndex(): Promise<RepdbRaw[]> {
  const res = await fetch(REPDB_INDEX_URL, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  } as RequestInit)
  if (!res.ok) {
    throw new Error(`RepDB fetch failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as {
    exercises?: RepdbRaw[]
    count?: number
  }
  if (!Array.isArray(data.exercises)) {
    throw new Error('RepDB index missing exercises[]')
  }
  return data.exercises
}

/** Build name → best RepDB external row. */
export function buildRepdbNameIndex(
  rows: ExternalExercise[],
): Map<string, { external: ExternalExercise; priority: number }> {
  const byName = new Map<string, { external: ExternalExercise; priority: number }>()
  for (const external of rows) {
    const priority = matchPriority(external.name)
    for (const key of indexKeysForName(external.name)) {
      const prev = byName.get(key)
      if (!prev || priority < prev.priority) {
        byName.set(key, { external, priority })
      }
    }
  }
  return byName
}

export function matchRepdbExternal(
  byName: Map<string, { external: ExternalExercise; priority: number }>,
  canonicalName: string,
  aliases: string[] = [],
): ExternalExercise | null {
  for (const k of lookupKeysForLocalName(canonicalName, aliases)) {
    const found = byName.get(k)
    if (found) return found.external
  }
  // Extra: "Back Squat" ↔ "Barbell Back Squat" already covered; try compact id-ish
  const bare = matchKey(canonicalName)
  return byName.get(bare)?.external ?? null
}

export const repdbProvider: ExerciseProvider = {
  id: 'repdb',
  name: 'RepDB',
  source: 'OTHER',
  capabilities: {
    images: true,
    videos: false,
    instructions: true,
    muscles: true,
    equipment: true,
    // In-app enrich only — do not bulk-clone the corpus as our own dataset.
    allowRedistribution: false,
  },
  async import() {
    const rows = await fetchRepdbIndex()
    return rows.map(repdbRawToExternal)
  },
  toNormalized(external) {
    return {
      id: `repdb_${external.sourceId.replace(/-/g, '_')}`,
      canonicalName: external.name,
      aliases: external.aliases ?? [],
      searchTerms: external.searchTerms ?? [],
      category: external.category ?? 'STRENGTH',
      movementPattern: external.movementPattern ?? null,
      equipment: external.equipment ?? [],
      primaryMuscles: external.primaryMuscles ?? [],
      secondaryMuscles: external.secondaryMuscles ?? [],
      prescriptionTypes: external.prescriptionTypes ?? ['REPS', 'WEIGHT', 'RPE'],
      modalities: external.modalities ?? ['STRENGTH'],
      difficulty: external.difficulty ?? null,
      instructions: external.instructions ?? null,
      shortDescription: external.shortDescription ?? null,
      coachingCues: external.coachingCues ?? [],
      commonMistakes: external.commonMistakes ?? [],
      media: external.media ?? null,
      variationType: null,
      canonicalExerciseId: null,
      source: 'OTHER',
      sourceId: external.sourceId,
    }
  },
}
