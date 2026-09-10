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
    return override
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
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

  return blocks.flatMap((item) =>
    formatListedEssenceLines(item.block, item.section, sportType, notation),
  )
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
