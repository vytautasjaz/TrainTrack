/**
 * Athlete-facing effort labels used by the workout builder Effort picker.
 * Library seeds historically used Borg-style numeric RPE (1–10 / ranges like
 * "2–3"). Those are not selectable in the builder and read as cryptic zones.
 * Normalize everything to named efforts (or keep true pace prescriptions).
 */
import type { Target, WorkoutBlock, WorkoutStructure } from './types'

/** Canonical Effort dropdown values (builder + library). */
export const RPE_PRESETS = [
  'Recovery',
  'Easy',
  'Steady',
  'Moderate',
  'Tempo',
  'Threshold',
  'Hard',
  'Max',
] as const

export type EffortPreset = (typeof RPE_PRESETS)[number]

const EFFORT_SET = new Set<string>(
  RPE_PRESETS.map((e) => e.toLowerCase()),
)

/** Pace/text labels that are really named efforts, not clock paces. */
const NAMED_EFFORT_ALIASES: Record<string, EffortPreset> = {
  recovery: 'Recovery',
  easy: 'Easy',
  steady: 'Steady',
  'steady finish': 'Steady',
  moderate: 'Moderate',
  tempo: 'Tempo',
  threshold: 'Threshold',
  'cruise / lt': 'Threshold',
  'steady-tempo': 'Tempo',
  hard: 'Hard',
  strong: 'Hard',
  fast: 'Hard',
  'fast relaxed': 'Hard',
  'fast controlled': 'Hard',
  max: 'Max',
}

/** True race / absolute pace prescriptions — keep as `pace`, drop companion RPE. */
const RACE_OR_ABSOLUTE_PACE =
  /\b(pace|css|ftp|vo2|5k|10k|hm|half|marathon|mile|1500|3k|race-feel|goal race)\b|^\d{1,2}:\d{2}/i

function normalizeDash(raw: string): string {
  return raw.trim().replace(/\s*[-–—]\s*/g, '–')
}

/**
 * Map numeric RPE / ranges (Borg CR10-ish) to named Effort presets.
 * Ranges use the midpoint so 1–2 → Recovery and 2–3 → Easy.
 */
export function numericRpeToEffort(raw: string): EffortPreset | null {
  const value = normalizeDash(raw).toLowerCase()
  if (!value) return null

  // Single digit or range like 2–3 / 6-7
  const range = value.match(/^([0-9](?:\.\d+)?)\s*–\s*([0-9](?:\.\d+)?)$/)
  const single = value.match(/^([0-9](?:\.\d+)?)$/)
  const n = range
    ? (parseFloat(range[1]!) + parseFloat(range[2]!)) / 2
    : single
      ? parseFloat(single[1]!)
      : NaN
  if (!Number.isFinite(n) || n <= 0) return null

  if (n < 2) return 'Recovery'
  if (n < 3) return 'Easy'
  if (n < 4) return 'Steady'
  if (n < 5) return 'Moderate'
  if (n < 6) return 'Tempo'
  if (n < 7) return 'Threshold'
  if (n < 8) return 'Hard'
  return 'Max'
}

export function parseNamedEffort(raw: string): EffortPreset | null {
  const key = raw.trim().toLowerCase()
  if (!key) return null
  if (EFFORT_SET.has(key)) {
    return RPE_PRESETS.find((e) => e.toLowerCase() === key) ?? null
  }
  return NAMED_EFFORT_ALIASES[key] ?? null
}

export function isRaceOrAbsolutePace(raw: string): boolean {
  const v = raw.trim()
  if (!v) return false
  if (parseNamedEffort(v)) return false
  return RACE_OR_ABSOLUTE_PACE.test(v)
}

/** Collapse zone ranges like Z2–Z3 to a single selectable zone (higher end). */
export function normalizeZoneValue(raw: string): string {
  const value = normalizeDash(raw).toUpperCase().replace(/\s+/g, '')
  const range = value.match(/^Z?([1-6])–Z?([1-6])$/)
  if (range) {
    const high = Math.max(parseInt(range[1]!, 10), parseInt(range[2]!, 10))
    return `Z${high}`
  }
  const single = value.match(/^Z?([1-6])$/)
  if (single) return `Z${single[1]}`
  return raw.trim()
}

/**
 * Collapse dual targets like `{ pace: Easy } + { rpe: 2–3 }` into one
 * builder-friendly Effort (or keep a single race-pace target).
 */
export function normalizeTargetsForBuilder(
  targets: Target[] | undefined | null,
): Target[] | undefined {
  if (!targets?.length) return targets ?? undefined

  let namedEffort: EffortPreset | null = null
  /** Word labels (Easy) beat numeric RPE (2–3) when both are present. */
  let namedFromLabel = false
  let racePace: string | null = null
  const other: Target[] = []

  for (const t of targets) {
    const value = t.value?.trim() ?? ''
    if (!value && t.min == null && t.max == null) continue

    if (t.type === 'rpe') {
      const fromLabel = parseNamedEffort(value)
      if (fromLabel) {
        namedEffort = fromLabel
        namedFromLabel = true
        continue
      }
      const fromNumeric = value ? numericRpeToEffort(value) : null
      if (fromNumeric) {
        if (!namedFromLabel) namedEffort = fromNumeric
        continue
      }
      // Free-text rpe that isn't numeric — keep unless we already have better.
      if (value && !namedEffort) {
        other.push({ type: 'rpe', value })
      }
      continue
    }

    if (t.type === 'pace') {
      const asNamed = parseNamedEffort(value)
      if (asNamed) {
        namedEffort = asNamed
        namedFromLabel = true
        continue
      }
      if (isRaceOrAbsolutePace(value)) {
        racePace = value
        continue
      }
      other.push(t)
      continue
    }

    if (t.type === 'heartRateZone' && value) {
      other.push({ type: 'heartRateZone', value: normalizeZoneValue(value) })
      continue
    }

    other.push(t)
  }

  // Prefer race/absolute pace when present (HM Pace, 4:30/km, …).
  if (racePace) {
    return [{ type: 'pace', value: racePace }, ...other]
  }
  if (namedEffort) {
    // Named effort is the athlete-facing intensity; drop redundant zone when both exist.
    const withoutZone = other.filter((t) => t.type !== 'heartRateZone')
    return [{ type: 'rpe', value: namedEffort }, ...withoutZone]
  }
  return other.length > 0 ? other : undefined
}

export function normalizeTargetForBuilder(
  target: Target | undefined | null,
): Target | undefined {
  if (!target) return undefined
  const next = normalizeTargetsForBuilder([target])
  return next?.[0]
}

function normalizeBlockIntensities(block: WorkoutBlock): WorkoutBlock {
  const targets = normalizeTargetsForBuilder(block.targets)
  const startIntensity = normalizeTargetForBuilder(block.startIntensity)
  const endIntensity = normalizeTargetForBuilder(block.endIntensity)
  return {
    ...block,
    ...(targets !== undefined ? { targets } : { targets: undefined }),
    ...(startIntensity ? { startIntensity } : {}),
    ...(endIntensity ? { endIntensity } : {}),
  }
}

/** Rewrite structure intensities so builder Effort presets apply. */
export function normalizeStructureIntensities(
  structure: WorkoutStructure | null | undefined,
): WorkoutStructure | null {
  if (!structure) return null
  return {
    ...structure,
    warmup: structure.warmup.map(normalizeBlockIntensities),
    mainSet: structure.mainSet.map(normalizeBlockIntensities),
    cooldown: structure.cooldown.map(normalizeBlockIntensities),
  }
}
