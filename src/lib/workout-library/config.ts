import { WorkoutType } from '@prisma/client'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { sportSupportsWorkoutBuilder } from '@/lib/workout-builder/session-modes'

export type LibraryBuilderKind = 'block' | 'swim' | 'text'

export type LibrarySportConfig = {
  type: WorkoutType
  slug: string
  label: string
  builderKind: LibraryBuilderKind
  description: string
}

const SLUG_BY_TYPE: Record<WorkoutType, string> = {
  RUN: 'run',
  BIKE: 'bike',
  SWIM: 'swim',
  STRENGTH: 'strength',
  HYROX: 'hyrox',
  TRIATHLON: 'triathlon',
  RECOVERY: 'recovery',
  REST: 'rest',
}

function builderKindFor(type: WorkoutType): LibraryBuilderKind {
  if (type === WorkoutType.SWIM) return 'swim'
  if (sportSupportsWorkoutBuilder(type)) return 'block'
  return 'text'
}

const LIBRARY_DESCRIPTIONS: Partial<Record<WorkoutType, string>> = {
  RUN: 'Structured interval builder or simple distance workouts',
  BIKE: 'Structured interval builder or simple distance workouts',
  SWIM: 'Set-based swim builder with strokes, pace, and rest',
  TRIATHLON: 'Brick and multi-sport structured sessions',
  STRENGTH: 'Text-based strength templates — duration and description',
  HYROX: 'Text-based HYROX templates — duration and description',
  RECOVERY: 'Light recovery session templates',
  REST: 'Rest day notes and templates',
}

/** Sports shown in the workout library navigation (ordered). */
export const LIBRARY_SPORTS: LibrarySportConfig[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
  WorkoutType.TRIATHLON,
  WorkoutType.STRENGTH,
  WorkoutType.HYROX,
  WorkoutType.RECOVERY,
].map((type) => ({
  type,
  slug: SLUG_BY_TYPE[type],
  label: WORKOUT_TYPE_LABELS[type],
  builderKind: builderKindFor(type),
  description: LIBRARY_DESCRIPTIONS[type] ?? 'Saved workout templates',
}))

export function sportSlug(type: WorkoutType): string {
  return SLUG_BY_TYPE[type]
}

export function parseSportSlug(slug: string): WorkoutType | null {
  const normalized = slug.toLowerCase()
  const entry = LIBRARY_SPORTS.find((s) => s.slug === normalized)
  if (entry) return entry.type
  if (normalized === 'rest') return WorkoutType.REST
  return null
}

export function getLibrarySportConfig(type: WorkoutType): LibrarySportConfig | undefined {
  return LIBRARY_SPORTS.find((s) => s.type === type)
}

export function librarySportHref(type: WorkoutType): string {
  return `/workouts/library/${sportSlug(type)}`
}

export function newTemplateHref(type: WorkoutType): string {
  const config = getLibrarySportConfig(type)
  if (!config) return '/workouts'
  switch (config.builderKind) {
    case 'swim':
    case 'block':
      return `/workouts/templates/builder/new?sport=${type}`
    case 'text':
      return `${librarySportHref(type)}#create`
  }
}

export function editTemplateHref(template: {
  id: string
  type: WorkoutType
  structure: unknown
  swimStructure: unknown
}): string {
  if (template.type === WorkoutType.SWIM || template.structure || template.swimStructure) {
    return `/workouts/templates/builder/${template.id}`
  }
  return `/workouts/templates/${template.id}/edit`
}

export function isStructuredTemplate(template: {
  structure: unknown
  swimStructure: unknown
}): boolean {
  return Boolean(template.structure) || Boolean(template.swimStructure)
}
