import type { WorkoutType } from '@prisma/client'
import { formatBlockEssenceLines } from '@/lib/workout-builder/segment-estimation'
import { flattenStructure } from '@/lib/workout-builder/structure-list'
import type {
  WorkoutBlock,
  WorkoutCardSummary,
  WorkoutSection,
  WorkoutStructure,
} from '@/lib/workout-builder/types'
import {
  DEFAULT_DURATION_NOTATION,
  type DurationNotation,
} from '@/lib/workout-builder/duration-notation'

export type WorkoutCardEssenceOptions = {
  /** M/L week cards: every builder block. S: selected (or auto) work only. */
  includeAllBlocks?: boolean
  /**
   * Cap lines on dense cards; overflow becomes a final "+N more" row.
   * Full structure stays in the workout modal.
   */
  maxLines?: number
}

/**
 * Hierarchy roles for structure-aware card typography.
 * - section: WARM UP / STRENGTH
 * - block: SUPERSET / AMRAP (promoted header)
 * - blockMeta: soft line under section/block (e.g. "AMRAP · 12 min")
 * - exercise: name (+ optional right-aligned detail)
 * - rule: hairline between major groups
 */
export type WorkoutCardEssenceKind =
  | 'section'
  | 'block'
  | 'blockMeta'
  | 'exercise'
  | 'rule'
  | 'line'
  | 'more'

export type WorkoutCardEssenceRow = {
  kind: WorkoutCardEssenceKind
  text: string
  /** Right column for exercises, or soft meta under a block header. */
  detail?: string
}

export function essenceRowsFromLines(lines: string[]): WorkoutCardEssenceRow[] {
  return lines.map((text) =>
    /^\+\d+\s+more$/i.test(text.trim())
      ? { kind: 'more' as const, text: text.trim() }
      : { kind: 'line' as const, text },
  )
}

/** Keep card teaser short; full session lives in the detail modal. */
export function truncateWorkoutCardEssenceLines(
  lines: string[],
  maxLines?: number,
): string[] {
  if (maxLines == null || maxLines <= 0 || lines.length <= maxLines) {
    return lines
  }
  const kept = lines.slice(0, maxLines)
  const rest = lines.length - maxLines
  return [...kept, `+${rest} more`]
}

export function truncateWorkoutCardEssenceRows(
  rows: WorkoutCardEssenceRow[],
  maxLines?: number,
): WorkoutCardEssenceRow[] {
  if (maxLines == null || maxLines <= 0 || rows.length <= maxLines) {
    return rows
  }
  const kept = rows.slice(0, maxLines)
  const rest = rows.length - maxLines
  return [...kept, { kind: 'more', text: `+${rest} more` }]
}

function warmupCooldownPrefix(
  block: WorkoutBlock,
  section: WorkoutSection,
): 'WU' | 'CD' | null {
  if (section === 'warmup') return 'WU'
  if (section === 'cooldown') return 'CD'
  const name = block.name ?? ''
  if (/\bwarm[ -]?up\b/i.test(name)) return 'WU'
  if (/\bcool[ -]?down\b/i.test(name)) return 'CD'
  return null
}

function isWarmupOrCooldown(block: WorkoutBlock, section: WorkoutSection): boolean {
  return warmupCooldownPrefix(block, section) != null
}

function isDisplayableCardBlock(block: WorkoutBlock): boolean {
  return block.type !== 'RECOVERY' && block.type !== 'REST' && block.type !== 'FREE_TEXT'
}

export function isCardWorkBlock(block: WorkoutBlock): boolean {
  return (
    warmupCooldownPrefix(block, 'mainSet') == null && isDisplayableCardBlock(block)
  )
}

function isCardWorkItem(
  block: WorkoutBlock,
  section: WorkoutSection,
): boolean {
  return !isWarmupOrCooldown(block, section) && isDisplayableCardBlock(block)
}

function listedBlocks(structure: WorkoutStructure) {
  return flattenStructure(structure)
}

export function listCardWorkBlocks(structure: WorkoutStructure): WorkoutBlock[] {
  return listedBlocks(structure)
    .filter((item) => isCardWorkItem(item.block, item.section))
    .map((item) => item.block)
}

/** All meaningful main-set blocks in workout order (Auto mode). */
export function getAutomaticCardBlockIds(structure: WorkoutStructure): string[] {
  return listCardWorkBlocks(structure).map((block) => block.id)
}

/** Drop highlight ids that no longer exist (or are no longer card-eligible). */
export function pruneCardSummary(
  structure: WorkoutStructure,
): WorkoutCardSummary | undefined {
  const summary = structure.cardSummary
  if (!summary) return undefined

  const eligibleIds = new Set(getAutomaticCardBlockIds(structure))
  const highlightedBlockIds = (summary.highlightedBlockIds ?? []).filter((id) =>
    eligibleIds.has(id),
  )
  const essence = summary.essence?.trim() ? summary.essence : undefined

  if (!essence && highlightedBlockIds.length === 0) return undefined
  return {
    ...(essence ? { essence: summary.essence } : {}),
    ...(highlightedBlockIds.length > 0 ? { highlightedBlockIds } : {}),
  }
}

function formatListedEssenceLines(
  block: WorkoutBlock,
  section: WorkoutSection,
  sportType: WorkoutType,
  notation: DurationNotation,
): string[] {
  const lines = formatBlockEssenceLines(block, sportType, notation)
  const prefix = warmupCooldownPrefix(block, section)
  if (!prefix) return lines
  return lines.map((line) => `${prefix} ${line}`)
}

/**
 * Athlete-facing card lines. Override wins (one card line per textarea line).
 * Otherwise each marked builder block becomes its own line(s) — never joined
 * across blocks on one row.
 */
export function getWorkoutCardEssenceLines(
  structure: WorkoutStructure | null | undefined,
  sportType: WorkoutType,
  notation: DurationNotation = DEFAULT_DURATION_NOTATION,
  options: WorkoutCardEssenceOptions = {},
): string[] {
  if (!structure) return []

  const override = structure.cardSummary?.essence?.trim()
  if (override) {
    return override.split('\n').map((line) => line.trimEnd())
  }

  const selectedIds = structure.cardSummary?.highlightedBlockIds ?? []
  const hasManualSelection = selectedIds.length > 0
  const includeAllBlocks = Boolean(options.includeAllBlocks)

  const blocks = listedBlocks(structure).filter((item) => {
    if (includeAllBlocks) {
      if (item.block.type === 'FREE_TEXT' && !item.block.text?.trim()) return false
      return true
    }
    if (isWarmupOrCooldown(item.block, item.section)) return false
    if (!isCardWorkItem(item.block, item.section)) return false
    return !hasManualSelection || selectedIds.includes(item.block.id)
  })

  const lines = blocks.flatMap((item) =>
    formatListedEssenceLines(item.block, item.section, sportType, notation),
  )
  return truncateWorkoutCardEssenceLines(lines, options.maxLines)
}

export type WorkoutCardEssencePart = {
  core: string
  detail?: string
}

/** Quantity stays prominent; `@ intensity / rest` is the muted tail. */
export function splitWorkoutCardEssenceLine(line: string): WorkoutCardEssencePart {
  const trimmed = line.trim()
  if (!trimmed) return { core: '' }

  const at = trimmed.search(/\s+@\s+/)
  if (at !== -1) {
    return {
      core: trimmed.slice(0, at),
      detail: trimmed.slice(at).trimStart(),
    }
  }

  const slash = trimmed.search(/\s+\/\s+/)
  if (slash !== -1) {
    return {
      core: trimmed.slice(0, slash),
      detail: trimmed.slice(slash).trimStart(),
    }
  }

  return { core: trimmed }
}
