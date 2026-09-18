import type { SeasonPhase, WorkoutType } from '@prisma/client'
import {
  addDateOnlyDays,
  parseDateOnly,
  startOfWeekDateOnly,
  toDateKey,
  todayDateKey,
} from '@/lib/dates'
import { SEASON_PHASE_LABELS, displaySeasonPhaseName } from '@/lib/season-planner'

/** Serializable phase block for Training calendar chrome. */
export type TrainingPhaseBlock = {
  id: string
  sport: WorkoutType
  phase: SeasonPhase
  label: string | null
  startKey: string
  endKey: string
}

export type CurrentPhaseIndicator = {
  phaseKey: SeasonPhase
  phaseName: string
  weekCurrent: number
  weekTotal: number
  subtitle: string | null
}

/** Very light surfaces — workouts must stay visually primary.
 * Inline styles need real CSS (`in srgb`), not Tailwind’s `in_srgb` underscore form.
 */
export const TRAINING_PHASE_SURFACE: Record<
  SeasonPhase,
  { bg: string; border: string; label: string }
> = {
  BASE: {
    bg: 'color-mix(in srgb, #64748b 7%, white)',
    border: 'color-mix(in srgb, #64748b 28%, white)',
    label: '#64748b',
  },
  BUILD: {
    bg: 'color-mix(in srgb, #2563eb 7%, white)',
    border: 'color-mix(in srgb, #2563eb 32%, white)',
    label: '#2563eb',
  },
  PEAK: {
    bg: 'color-mix(in srgb, #7c3aed 7%, white)',
    border: 'color-mix(in srgb, #7c3aed 32%, white)',
    label: '#7c3aed',
  },
  RACE: {
    bg: 'color-mix(in srgb, #da2f36 7%, white)',
    border: 'color-mix(in srgb, #da2f36 32%, white)',
    label: '#da2f36',
  },
  RECOVERY: {
    bg: 'color-mix(in srgb, #059669 7%, white)',
    border: 'color-mix(in srgb, #059669 28%, white)',
    label: '#059669',
  },
  TRANSITION: {
    bg: 'color-mix(in srgb, #d97706 7%, white)',
    border: 'color-mix(in srgb, #d97706 28%, white)',
    label: '#d97706',
  },
  MAINTENANCE: {
    bg: 'color-mix(in srgb, #0f766e 7%, white)',
    border: 'color-mix(in srgb, #0f766e 28%, white)',
    label: '#0f766e',
  },
}

const SPORT_PRIORITY: WorkoutType[] = [
  'RUN',
  'TRIATHLON',
  'BIKE',
  'SWIM',
  'HYROX',
  'STRENGTH',
  'RECOVERY',
  'REST',
]

export function toTrainingPhaseBlock(raw: {
  id: string
  sport: WorkoutType
  phase: SeasonPhase
  label: string | null
  startDate: Date
  endDate: Date
}): TrainingPhaseBlock {
  return {
    id: raw.id,
    sport: raw.sport,
    phase: raw.phase,
    label: raw.label,
    startKey: toDateKey(raw.startDate),
    endKey: toDateKey(raw.endDate),
  }
}

export function phaseCoversDate(
  block: TrainingPhaseBlock,
  dateKey: string,
): boolean {
  return dateKey >= block.startKey && dateKey <= block.endKey
}

function sportRank(sport: WorkoutType): number {
  const i = SPORT_PRIORITY.indexOf(sport)
  return i === -1 ? 99 : i
}

/** Prefer latest-starting block, then primary sport. */
export function phaseForDate(
  blocks: TrainingPhaseBlock[],
  dateKey: string,
): TrainingPhaseBlock | null {
  const covering = blocks.filter((b) => phaseCoversDate(b, dateKey))
  if (covering.length === 0) return null
  covering.sort((a, b) => {
    if (a.startKey !== b.startKey) return b.startKey.localeCompare(a.startKey)
    return sportRank(a.sport) - sportRank(b.sport)
  })
  return covering[0]!
}

export function phaseWeekProgress(
  block: TrainingPhaseBlock,
  dateKey: string,
): { current: number; total: number } | null {
  if (!phaseCoversDate(block, dateKey)) return null
  const startMon = startOfWeekDateOnly(parseDateOnly(block.startKey))
  const endMon = startOfWeekDateOnly(parseDateOnly(block.endKey))
  const dateMon = startOfWeekDateOnly(parseDateOnly(dateKey))
  const total =
    Math.round((endMon.getTime() - startMon.getTime()) / (7 * 86400000)) + 1
  const current =
    Math.round((dateMon.getTime() - startMon.getTime()) / (7 * 86400000)) + 1
  return {
    current: Math.min(total, Math.max(1, current)),
    total: Math.max(1, total),
  }
}

export function isPhaseTransitionDay(
  blocks: TrainingPhaseBlock[],
  dateKey: string,
  prevDateKey: string | null,
): boolean {
  const here = phaseForDate(blocks, dateKey)
  if (!here) return false
  if (!prevDateKey) return true
  const prev = phaseForDate(blocks, prevDateKey)
  if (!prev) return true
  return prev.id !== here.id
}

export function currentPhaseIndicator(
  blocks: TrainingPhaseBlock[],
  focusDateKey: string = todayDateKey(),
): CurrentPhaseIndicator | null {
  const block = phaseForDate(blocks, focusDateKey)
  if (!block) return null
  const progress = phaseWeekProgress(block, focusDateKey)
  if (!progress) return null
  const typeLabel = SEASON_PHASE_LABELS[block.phase]
  const custom = block.label?.trim() || null
  return {
    phaseKey: block.phase,
    phaseName: displaySeasonPhaseName(block.phase, block.label),
    weekCurrent: progress.current,
    weekTotal: progress.total,
    subtitle: custom && custom !== typeLabel ? typeLabel : null,
  }
}

/** Focus date for header: today if in visible range, else range start. */
export function phaseIndicatorFocusKey(
  rangeStartKey: string,
  rangeEndKey: string,
  todayKey: string = todayDateKey(),
): string {
  if (todayKey >= rangeStartKey && todayKey <= rangeEndKey) return todayKey
  return rangeStartKey
}

export function previousDateKey(dateKey: string): string {
  return toDateKey(addDateOnlyDays(parseDateOnly(dateKey), -1))
}
