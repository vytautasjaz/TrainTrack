import type { Target, WorkoutBlock, WorkoutIncludeItem, WorkoutIncludeKind, WorkoutStructure } from './types'
import {
  estimateBlockDurationMinutes,
  formatPlanBlockSummary,
  intervalRepMinutes,
  resolvePaceMinPerKm,
  segmentDurationMinutes,
  FALLBACK_PACES,
} from './segment-estimation'
import { progressiveMidpointTarget } from './progressive'
import { hasStructureContent } from './utils'
import {
  INCLUDE_PLACEMENT_LABELS,
  INCLUDE_PLACEMENT_SPLIT,
  INCLUDE_PLACEMENTS,
  normalizeIncludePlacement,
} from './include-placement'

export type StructureChartSegmentKind =
  | 'warmup'
  | 'work'
  | 'recovery'
  | 'easy'
  | 'cooldown'
  | 'rest'

export type StructureChartSegment = {
  kind: StructureChartSegmentKind
  weight: number
  /** 0–1 profile height; higher = harder / faster pace */
  intensity: number
}

export type StructureChartModel = {
  segments: StructureChartSegment[]
  caption: string
}

const MAX_INTERVAL_STRIPES = 24
const MAX_PROGRESSIVE_STEPS = 16
const MIN_PROGRESSIVE_STEPS = 4

const KIND_INTENSITY: Record<StructureChartSegmentKind, number> = {
  rest: 0.14,
  recovery: 0.28,
  easy: 0.38,
  cooldown: 0.34,
  warmup: 0.44,
  work: 0.88,
}

function parsePaceMinPerKm(raw: string): number | null {
  const match = raw.trim().match(/(\d+):(\d{1,2})\s*\/?\s*km?/i)
  if (!match) return null
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null
  return minutes + seconds / 60
}

function paceToIntensity(minPerKm: number): number {
  if (minPerKm <= 3.5) return 0.96
  if (minPerKm <= 4.25) return 0.84
  if (minPerKm <= 5) return 0.68
  if (minPerKm <= 5.75) return 0.54
  if (minPerKm <= 6.5) return 0.42
  return 0.3
}

function intensityFromTargets(targets?: Target[]): number | null {
  if (!targets?.length) return null

  for (const target of targets) {
    const value = (target.value ?? '').toLowerCase()

    if (target.type === 'rpe') {
      const rpe = parseInt(value, 10)
      if (!Number.isNaN(rpe)) return Math.min(0.98, Math.max(0.15, rpe / 10))
    }

    if (target.type === 'heartRateZone' || /^z\s*[1-5]$/i.test(value.trim())) {
      const zone = parseInt(value.replace(/\D/g, ''), 10)
      if (zone >= 1 && zone <= 5) return [0.3, 0.45, 0.62, 0.8, 0.95][zone - 1]!
    }

    if (target.type === 'pace' || value.includes('/km') || value.includes('km')) {
      const pace = parsePaceMinPerKm(target.value ?? '')
      if (pace != null) return paceToIntensity(pace)
    }

    if (value.includes('vo2') || value.includes('interval') || value.includes('5k pace')) return 0.94
    if (value.includes('threshold') || value.includes('tempo') || value.includes('z4')) return 0.78
    if (value.includes('marathon') || value.includes('z3')) return 0.62
    if (value.includes('easy') || value.includes('z2')) return 0.4
    if (value.includes('recovery') || value.includes('z1')) return 0.28
  }

  return null
}

function segmentWeight(
  segment: WorkoutBlock['work'] | undefined,
  paceMinPerKm: number | null,
): number {
  return segmentDurationMinutes(segment, paceMinPerKm)
}

function blockDurationWeight(block: WorkoutBlock): number {
  switch (block.type) {
    case 'CONTINUOUS':
    case 'RECOVERY':
    case 'REST':
    case 'PROGRESSIVE':
      return estimateBlockDurationMinutes(block)
    case 'INTERVAL': {
      const { work, recovery } = intervalRepMinutes(block)
      const workWeight = work || 1
      return (block.repetitions ?? 1) * (workWeight + recovery)
    }
    case 'REPETITION': {
      const pace = resolvePaceMinPerKm(block.targets, 'work')
      const work = segmentWeight(block.work, pace) || 1
      return (block.repetitions ?? 1) * work
    }
    case 'FREE_TEXT':
      return block.text?.trim() ? 0.5 : 0
    default:
      return 0
  }
}

function targetLooksEasy(block: WorkoutBlock): boolean {
  const raw = (block.targets ?? [])
    .map((t) => `${t.value ?? ''} ${t.min ?? ''}`.toLowerCase())
    .join(' ')
  return (
    block.type === 'RECOVERY' ||
    raw.includes('easy') ||
    raw.includes('recovery') ||
    raw.includes('z1') ||
    raw.includes('z2')
  )
}

function segmentKindForBlock(
  block: WorkoutBlock,
  section: 'warmup' | 'mainSet' | 'cooldown',
): StructureChartSegmentKind {
  if (section === 'warmup') return 'warmup'
  if (section === 'cooldown') return 'cooldown'
  if (block.type === 'REST') return 'rest'
  if (block.type === 'RECOVERY' || targetLooksEasy(block)) return 'easy'
  if (block.type === 'FREE_TEXT') return 'easy'
  if (block.type === 'PROGRESSIVE') return 'work'
  return 'work'
}

function intensityForKind(
  kind: StructureChartSegmentKind,
  block?: WorkoutBlock,
): number {
  if (block?.type === 'PROGRESSIVE') {
    const mid = progressiveMidpointTarget(block)
    const fromMid = intensityFromTargets(mid ? [mid] : block.targets)
    if (fromMid != null) return fromMid
  }
  const fromTargets = block ? intensityFromTargets(block.targets) : null
  if (fromTargets != null && kind !== 'recovery' && kind !== 'rest') {
    return fromTargets
  }
  return KIND_INTENSITY[kind]
}

/** Start → end intensity for progressive ramp chart (0–1). */
function progressiveIntensityRange(block: WorkoutBlock): { start: number; end: number } {
  const startTarget = block.startIntensity ?? block.targets?.[0]
  const endTarget = block.endIntensity
  const start = intensityFromTargets(startTarget ? [startTarget] : undefined)
  const end = intensityFromTargets(endTarget ? [endTarget] : undefined)

  if (start != null && end != null) {
    // Ensure rising visual even if values are equal / inverted.
    if (end >= start) return { start, end: end === start ? Math.min(0.98, start + 0.12) : end }
    return { start: end, end: start }
  }
  if (start != null) return { start, end: Math.min(0.98, start + 0.22) }
  if (end != null) return { start: Math.max(0.22, end - 0.22), end }

  const mid = KIND_INTENSITY.work
  return { start: mid * 0.72, end: mid }
}

function progressiveStepCount(block: WorkoutBlock, totalWeight: number): number {
  const step = block.stepEvery
  if (step && step.value > 0) {
    if (step.mode === 'distance') {
      const distKm =
        block.distance != null && block.distance > 0
          ? block.distanceUnit === 'm'
            ? block.distance / 1000
            : block.distance
          : null
      const stepKm = step.unit === 'm' ? step.value / 1000 : step.value
      if (distKm != null && distKm > 0 && stepKm > 0) {
        return Math.max(2, Math.min(MAX_PROGRESSIVE_STEPS, Math.ceil(distKm / stepKm)))
      }
    }
    if (step.mode === 'time') {
      const mins = block.time != null && block.time > 0 ? block.time : totalWeight
      const stepMin = step.unit === 'sec' ? step.value / 60 : step.value
      if (mins > 0 && stepMin > 0) {
        return Math.max(2, Math.min(MAX_PROGRESSIVE_STEPS, Math.ceil(mins / stepMin)))
      }
    }
  }

  // Default visual: roughly one bar every ~4–5 minutes, clamped.
  return Math.max(
    MIN_PROGRESSIVE_STEPS,
    Math.min(MAX_PROGRESSIVE_STEPS, Math.round(totalWeight / 4.5) || 6),
  )
}

function expandProgressiveBlock(
  block: WorkoutBlock,
  section: 'warmup' | 'mainSet' | 'cooldown',
): StructureChartSegment[] {
  const weight = blockDurationWeight(block)
  if (weight <= 0) return []

  const kind = segmentKindForBlock(block, section)
  const { start, end } = progressiveIntensityRange(block)
  const steps = progressiveStepCount(block, weight)
  const stepWeight = weight / steps
  const segments: StructureChartSegment[] = []

  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 1 : i / (steps - 1)
    const intensity = start + (end - start) * t
    segments.push({
      kind,
      weight: stepWeight,
      intensity: Math.min(0.98, Math.max(0.12, intensity)),
    })
  }

  return segments
}

function recoveryIntensity(block: WorkoutBlock): number {
  const description = block.recovery?.description?.toLowerCase() ?? ''
  if (description.includes('walk') || description.includes('stand')) return 0.16
  if (description.includes('jog') || description.includes('easy')) return 0.26
  return KIND_INTENSITY.recovery
}

function expandBlock(
  block: WorkoutBlock,
  section: 'warmup' | 'mainSet' | 'cooldown',
): StructureChartSegment[] {
  if (block.type === 'PROGRESSIVE') {
    return expandProgressiveBlock(block, section)
  }

  if (block.type === 'INTERVAL') {
    const reps = block.repetitions ?? 1
    const { work, recovery } = intervalRepMinutes(block)
    const workWeight = work || 1
    const recoveryWeight = recovery
    const stripeReps = Math.min(reps, MAX_INTERVAL_STRIPES)
    const kind = segmentKindForBlock(block, section)
    const workIntensity = intensityForKind(kind, block)
    const segments: StructureChartSegment[] = []

    for (let i = 0; i < stripeReps; i++) {
      segments.push({ kind, weight: workWeight, intensity: workIntensity })
      if (recoveryWeight > 0) {
        segments.push({
          kind: 'recovery',
          weight: recoveryWeight,
          intensity: recoveryIntensity(block),
        })
      }
    }

    return segments
  }

  const weight = blockDurationWeight(block)
  if (weight <= 0) return []

  const kind = segmentKindForBlock(block, section)
  return [{ kind, weight, intensity: intensityForKind(kind, block) }]
}

function buildCaption(structure: WorkoutStructure): string {
  const parts = structure.mainSet
    .filter((block) => block.type !== 'FREE_TEXT' || block.text?.trim())
    .map((block) =>
      block.type === 'FREE_TEXT' ? block.text!.trim() : formatPlanBlockSummary(block),
    )
    .filter(Boolean)

  return parts.slice(0, 2).join(' · ')
}

const BASE_INTENSITY = KIND_INTENSITY.warmup

function includeItemMinutes(item: WorkoutIncludeItem): { work: number; recovery: number } {
  const work = segmentDurationMinutes(item.work, FALLBACK_PACES.interval) || 0.4
  const recovery = item.recovery
    ? segmentDurationMinutes(item.recovery, FALLBACK_PACES.recovery)
    : 0
  return { work, recovery }
}

function includeIntensity(kind: WorkoutIncludeKind): number {
  switch (kind) {
    case 'hill_sprint':
      return 0.96
    case 'strides':
    case 'pickup':
      return 0.9
    case 'drill':
      return 0.62
    default:
      return 0.86
  }
}

/** One contiguous include cluster (all reps together). */
function expandIncludeItem(item: WorkoutIncludeItem): StructureChartSegment[] {
  const reps = Math.min(Math.max(1, item.repetitions), MAX_INTERVAL_STRIPES)
  const { work, recovery } = includeItemMinutes(item)
  const intensity = includeIntensity(item.kind)
  const segments: StructureChartSegment[] = []
  for (let i = 0; i < reps; i++) {
    segments.push({ kind: 'work', weight: work, intensity })
    if (recovery > 0) {
      segments.push({
        kind: 'recovery',
        weight: recovery,
        intensity: KIND_INTENSITY.recovery,
      })
    }
  }
  return segments
}

function includeCaption(items: WorkoutIncludeItem[]): string {
  return items
    .map((item) => {
      const title = item.title.trim() || 'include'
      const where = INCLUDE_PLACEMENT_LABELS[normalizeIncludePlacement(item.placementHint)]
      return `${item.repetitions} x ${title.toLowerCase()} · ${where}`
    })
    .join(' · ')
}

function buildIncludeChart(
  items: WorkoutIncludeItem[],
  durationMinutes?: number,
): StructureChartModel | null {
  if (items.length === 0) return null

  const grouped = Object.fromEntries(
    INCLUDE_PLACEMENTS.map((placement) => [placement, [] as WorkoutIncludeItem[]]),
  ) as Record<(typeof INCLUDE_PLACEMENTS)[number], WorkoutIncludeItem[]>

  for (const item of items) {
    grouped[normalizeIncludePlacement(item.placementHint)].push(item)
  }

  const includeWeight = items.reduce((sum, item) => {
    const { work, recovery } = includeItemMinutes(item)
    return sum + Math.max(1, item.repetitions) * (work + recovery)
  }, 0)

  const planned = durationMinutes && durationMinutes > 0 ? durationMinutes : 0
  const easyTotal = Math.max(planned - includeWeight, includeWeight * 2.2, 24)

  const segments: StructureChartSegment[] = []
  let cursor = 0

  for (const placement of INCLUDE_PLACEMENTS) {
    const slotItems = grouped[placement]
    const at = INCLUDE_PLACEMENT_SPLIT[placement]
    if (slotItems.length === 0) continue

    if (at > cursor) {
      segments.push({
        kind: 'warmup',
        weight: (at - cursor) * easyTotal,
        intensity: BASE_INTENSITY,
      })
      cursor = at
    }
    for (const item of slotItems) {
      segments.push(...expandIncludeItem(item))
    }
  }

  if (cursor < 1) {
    segments.push({
      kind: 'warmup',
      weight: (1 - cursor) * easyTotal,
      intensity: BASE_INTENSITY,
    })
  }

  return { segments, caption: includeCaption(items) }
}

export function buildStructureChart(
  structure: WorkoutStructure | null | undefined,
  options?: { durationMinutes?: number },
): StructureChartModel | null {
  if (!structure) return null

  if (hasStructureContent(structure)) {
    const segments: StructureChartSegment[] = []

    for (const block of structure.warmup) {
      segments.push(...expandBlock(block, 'warmup'))
    }
    for (const block of structure.mainSet) {
      segments.push(...expandBlock(block, 'mainSet'))
    }
    for (const block of structure.cooldown) {
      segments.push(...expandBlock(block, 'cooldown'))
    }

    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)
    if (totalWeight <= 0) return null

    return {
      segments,
      caption: buildCaption(structure),
    }
  }

  return buildIncludeChart(structure.includeItems ?? [], options?.durationMinutes)
}
