import type { SeasonPhase } from '@prisma/client'
import {
  SEASON_PHASE_LABELS,
  displaySeasonPhaseName,
} from '@/lib/season-planner'

/** One training block inside a race preparation window (start → race). */
export type RacePrepBlock = {
  phase: SeasonPhase
  weeks: number
  /** Optional display name, e.g. "Race-specific" or "Taper". */
  label?: string | null
}

const PHASE_KEYS = new Set(
  Object.keys(SEASON_PHASE_LABELS) as SeasonPhase[],
)

/** Phases offered in the race-prep block editor (full SeasonPhase still allowed when parsing). */
export const RACE_PREP_BLOCK_PHASES: SeasonPhase[] = [
  'BASE',
  'BUILD',
  'PEAK',
  'RACE',
  'RECOVERY',
  'TRANSITION',
  'MAINTENANCE',
]

export function isSeasonPhase(value: unknown): value is SeasonPhase {
  return typeof value === 'string' && PHASE_KEYS.has(value as SeasonPhase)
}

export function sumPrepBlockWeeks(blocks: RacePrepBlock[]): number {
  return blocks.reduce((sum, b) => sum + Math.max(0, Math.round(b.weeks) || 0), 0)
}

export function prepBlockDisplayName(block: RacePrepBlock): string {
  return displaySeasonPhaseName(block.phase, block.label)
}

/** Normalize / validate stored or form JSON. Empty → null. Invalid → throw. */
export function parsePreparationBlocks(
  raw: unknown,
  totalWeeks: number | null | undefined,
): RacePrepBlock[] | null {
  if (raw == null || raw === '') return null

  let value: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      value = JSON.parse(trimmed)
    } catch {
      throw new Error('Preparation blocks must be valid JSON.')
    }
  }

  if (!Array.isArray(value)) {
    throw new Error('Preparation blocks must be a list.')
  }
  if (value.length === 0) return null

  const blocks: RacePrepBlock[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      throw new Error('Each preparation block is invalid.')
    }
    const row = item as Record<string, unknown>
    if (!isSeasonPhase(row.phase)) {
      throw new Error('Each preparation block needs a valid phase.')
    }
    const weeks =
      typeof row.weeks === 'number'
        ? row.weeks
        : typeof row.weeks === 'string'
          ? Number.parseInt(row.weeks, 10)
          : NaN
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
      throw new Error('Each preparation block needs 1–52 weeks.')
    }
    const label =
      typeof row.label === 'string' && row.label.trim()
        ? row.label.trim().slice(0, 80)
        : null
    blocks.push({ phase: row.phase, weeks: Math.round(weeks), label })
  }

  if (blocks.length === 0) return null

  const total =
    typeof totalWeeks === 'number' && totalWeeks > 0
      ? Math.min(52, Math.max(1, Math.round(totalWeeks)))
      : null
  if (total == null) {
    throw new Error('Set preparation weeks before adding blocks.')
  }
  const sum = sumPrepBlockWeeks(blocks)
  if (sum !== total) {
    throw new Error(
      `Preparation blocks must add up to ${total} weeks (currently ${sum}).`,
    )
  }
  return blocks
}

/** Safe parse for DB / client display — never throws; does not enforce sum. */
export function readPreparationBlocks(raw: unknown): RacePrepBlock[] | null {
  try {
    let value: unknown = raw
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (!trimmed) return null
      value = JSON.parse(trimmed)
    }
    if (!Array.isArray(value) || value.length === 0) return null
    const blocks: RacePrepBlock[] = []
    for (const item of value) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      if (!isSeasonPhase(row.phase)) continue
      const weeks =
        typeof row.weeks === 'number'
          ? Math.round(row.weeks)
          : typeof row.weeks === 'string'
            ? Number.parseInt(row.weeks, 10)
            : NaN
      if (!Number.isFinite(weeks) || weeks < 1) continue
      const label =
        typeof row.label === 'string' && row.label.trim()
          ? row.label.trim()
          : null
      blocks.push({ phase: row.phase, weeks, label })
    }
    return blocks.length > 0 ? blocks : null
  } catch {
    return null
  }
}

/**
 * Suggested split for a prep window (chronological: earliest → race week).
 * Mirrors a common Base → Build → Race-specific → Taper pattern.
 */
export function suggestPreparationBlocks(totalWeeks: number): RacePrepBlock[] {
  const n = Math.min(52, Math.max(1, Math.round(totalWeeks)))
  if (n === 1) {
    return [{ phase: 'RACE', weeks: 1, label: 'Race week' }]
  }
  if (n === 2) {
    return [
      { phase: 'BUILD', weeks: 1, label: null },
      { phase: 'RECOVERY', weeks: 1, label: 'Taper' },
    ]
  }
  if (n === 3) {
    return [
      { phase: 'BUILD', weeks: 1, label: null },
      { phase: 'PEAK', weeks: 1, label: 'Race-specific' },
      { phase: 'RECOVERY', weeks: 1, label: 'Taper' },
    ]
  }
  if (n === 4) {
    return [
      { phase: 'BASE', weeks: 1, label: null },
      { phase: 'BUILD', weeks: 1, label: null },
      { phase: 'PEAK', weeks: 1, label: 'Race-specific' },
      { phase: 'RECOVERY', weeks: 1, label: 'Taper' },
    ]
  }

  // Proportional: ~25% base, ~35% build, ~25% race-specific, ~15% taper (min 1 each).
  let taper = Math.max(1, Math.round(n * 0.12))
  let raceSpecific = Math.max(1, Math.round(n * 0.25))
  let base = Math.max(1, Math.round(n * 0.25))
  let build = n - taper - raceSpecific - base
  if (build < 1) {
    build = 1
    const overflow = taper + raceSpecific + base + build - n
    if (overflow > 0) {
      if (base > 1) base -= Math.min(base - 1, overflow)
      else if (raceSpecific > 1) raceSpecific -= Math.min(raceSpecific - 1, overflow)
      else taper = Math.max(1, taper - overflow)
    }
  }
  // Fix residual rounding so sum === n
  let sum = base + build + raceSpecific + taper
  while (sum > n) {
    if (build > 1) {
      build -= 1
    } else if (base > 1) {
      base -= 1
    } else if (raceSpecific > 1) {
      raceSpecific -= 1
    } else if (taper > 1) {
      taper -= 1
    } else break
    sum = base + build + raceSpecific + taper
  }
  while (sum < n) {
    build += 1
    sum += 1
  }

  return [
    { phase: 'BASE', weeks: base, label: null },
    { phase: 'BUILD', weeks: build, label: null },
    { phase: 'PEAK', weeks: raceSpecific, label: 'Race-specific' },
    { phase: 'RECOVERY', weeks: taper, label: 'Taper' },
  ]
}

/**
 * Map each week in the prep window (index 0 = first prep week, last = race week)
 * to its block. Returns null when blocks are absent or do not cover the window.
 */
export function prepBlockForWeekOffset(
  blocks: RacePrepBlock[] | null | undefined,
  weekOffsetFromStart: number,
  totalWeeks: number,
): RacePrepBlock | null {
  if (!blocks?.length || totalWeeks < 1) return null
  if (weekOffsetFromStart < 0 || weekOffsetFromStart >= totalWeeks) return null
  let cursor = 0
  for (const block of blocks) {
    const end = cursor + block.weeks
    if (weekOffsetFromStart < end) return block
    cursor = end
  }
  return null
}
