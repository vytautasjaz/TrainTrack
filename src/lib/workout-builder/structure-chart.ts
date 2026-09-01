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
  normalizeIncludePlacement,
} from './include-placement'
import { parsePaceMinPerKm } from '@/lib/athlete-preferences'

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

/** One workout block as a contiguous chart region (may contain many stripes). */
export type StructureChartBlockGroup = {
  id: string
  /** Index in flattenStructure order (warmup → main → cooldown). */
  index: number
  segments: StructureChartSegment[]
  weight: number
}

export type StructureChartModel = {
  segments: StructureChartSegment[]
  /** Present when chart regions map 1:1 to reorderable blocks. */
  blocks: StructureChartBlockGroup[] | null
  caption: string
}

const MAX_INTERVAL_STRIPES = 24
const MAX_PROGRESSIVE_STEPS = 16
const MIN_PROGRESSIVE_STEPS = 4

/** Defaults when no target text is set — kept clearly stepped. */
const KIND_INTENSITY: Record<StructureChartSegmentKind, number> = {
  rest: 0.14,
  recovery: 0.26,
  easy: 0.36,
  cooldown: 0.32,
  warmup: 0.4,
  work: 0.78,
}

/**
 * Map clock pace (min/km) → chart height.
 * Slow / easy paces stay low; threshold+ paces climb toward the top.
 */
function paceToIntensity(minPerKm: number): number {
  if (minPerKm <= 3.5) return 0.96
  if (minPerKm <= 4.0) return 0.9
  if (minPerKm <= 4.5) return 0.82
  if (minPerKm <= 5.0) return 0.68
  if (minPerKm <= 5.5) return 0.54
  if (minPerKm <= 6.0) return 0.42
  if (minPerKm <= 6.75) return 0.32
  return 0.24
}

/** Named effort / zone labels → height (harder patterns first). */
function intensityFromKeywords(raw: string): number | null {
  const value = raw.toLowerCase().trim()
  if (!value) return null

  if (/\b(vo\s*2|vo₂|v\.?o\.?\s*2|max|sprint|all[-\s]?out)\b/.test(value)) {
    return 0.96
  }
  if (/\bz\s*5\b|zone\s*5/.test(value)) return 0.95
  if (/\b(hard|race|5k|10k|interval)\b/.test(value)) return 0.9
  if (/\bz\s*4\b|zone\s*4|\b(threshold|critical|css)\b/.test(value)) return 0.82
  if (/\bz\s*3\b|zone\s*3|\b(tempo|sweet\s*spot|moderate|marathon)\b/.test(value)) {
    return 0.64
  }
  if (/\bz\s*2\b|zone\s*2|\b(easy|endurance|aerobic)\b/.test(value)) return 0.38
  if (
    /\bz\s*1\b|zone\s*1|\b(recovery|recover|jog|walk|stand|standing)\b/.test(value)
  ) {
    return 0.26
  }
  return null
}

function intensityFromSingleTarget(target: Target): number | null {
  const raw = (target.value ?? '').trim()
  const value = raw.toLowerCase()

  // Explicit zones (Z1–Z5) — strongest signal for height.
  const zoneMatch = value.match(/^z\s*([1-5])$/) ?? value.match(/^zone\s*([1-5])$/)
  if (zoneMatch || target.type === 'heartRateZone') {
    const zone = parseInt((zoneMatch?.[1] ?? value.replace(/\D/g, '')).slice(0, 1), 10)
    if (zone >= 1 && zone <= 5) {
      return [0.26, 0.38, 0.64, 0.82, 0.95][zone - 1]!
    }
  }

  const fromKeywords = intensityFromKeywords(raw)
  if (fromKeywords != null) return fromKeywords

  // Numeric RPE 1–10
  if (target.type === 'rpe') {
    const rpe = parseFloat(value)
    if (!Number.isNaN(rpe) && rpe > 0) {
      return Math.min(0.98, Math.max(0.18, rpe / 10))
    }
  }

  // Clock pace: "4:30", "4:30/km", m:ss
  if (
    target.type === 'pace' ||
    /\/\s*km/i.test(raw) ||
    /^\d{1,2}:\d{1,2}/.test(raw)
  ) {
    const pace = parsePaceMinPerKm(raw)
    if (pace != null) return paceToIntensity(pace)
  }

  // Bike watts
  if (target.type === 'power') {
    const watts = parseFloat(value.replace(/[^\d.]/g, ''))
    if (!Number.isNaN(watts) && watts > 0) {
      if (watts >= 320) return 0.96
      if (watts >= 280) return 0.9
      if (watts >= 240) return 0.82
      if (watts >= 200) return 0.64
      if (watts >= 160) return 0.42
      return 0.3
    }
  }

  // % FTP
  if (target.type === 'powerZone') {
    const pct = parseFloat(value.replace(/[^\d.]/g, ''))
    if (!Number.isNaN(pct) && pct > 0) {
      if (pct >= 110) return 0.96
      if (pct >= 100) return 0.9
      if (pct >= 90) return 0.82
      if (pct >= 75) return 0.64
      if (pct >= 60) return 0.42
      return 0.28
    }
  }

  // Heart rate bpm (rough bands)
  if (target.type === 'heartRate') {
    const hr = parseFloat(value.replace(/[^\d.]/g, ''))
    if (!Number.isNaN(hr) && hr > 40) {
      if (hr >= 175) return 0.92
      if (hr >= 165) return 0.8
      if (hr >= 150) return 0.64
      if (hr >= 135) return 0.42
      return 0.28
    }
  }

  return null
}

function intensityFromTargets(targets?: Target[]): number | null {
  if (!targets?.length) return null
  for (const target of targets) {
    const intensity = intensityFromSingleTarget(target)
    if (intensity != null) return intensity
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
  const name = (block.name ?? '').toLowerCase()
  // Flat builder stores all blocks in mainSet — name still marks bookends.
  if (section === 'warmup' || name.includes('warm')) return 'warmup'
  if (section === 'cooldown' || name.includes('cool')) return 'cooldown'
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

  // Prefer primary (work) target so Easy / Z1 / pace drive column height.
  const primary = block?.targets?.[0]
  const fromPrimary = primary ? intensityFromSingleTarget(primary) : null
  if (fromPrimary != null && kind !== 'recovery' && kind !== 'rest') {
    return fromPrimary
  }

  const fromTargets = block ? intensityFromTargets(block.targets) : null
  if (fromTargets != null && kind !== 'recovery' && kind !== 'rest') {
    return fromTargets
  }

  // Unspecified continuous effort should not look like hard intervals.
  if (kind === 'work' && block?.type === 'CONTINUOUS') return KIND_INTENSITY.easy
  return KIND_INTENSITY[kind]
}

/** Representative 0–1 effort for a whole block (builder rail + chart alignment). */
export function resolveBlockIntensity(
  block: WorkoutBlock,
  section: 'warmup' | 'mainSet' | 'cooldown' = 'mainSet',
): number {
  if (block.type === 'INTERVAL') {
    const kind = segmentKindForBlock(block, section)
    return intensityForKind(kind, block)
  }
  if (block.type === 'PROGRESSIVE') {
    const { start, end } = progressiveIntensityRange(block)
    return (start + end) / 2
  }
  const kind = segmentKindForBlock(block, section)
  return intensityForKind(kind, block)
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
  const restTarget = block.targets?.[1]
  const fromTarget = restTarget ? intensityFromSingleTarget(restTarget) : null
  // Use the rest target as-is so matching work/rest paces land at similar heights.
  // Only fall back to soft recovery defaults when no intensity is set.
  if (fromTarget != null) return fromTarget

  const description = block.recovery?.description?.toLowerCase() ?? ''
  if (description.includes('walk') || description.includes('stand')) return 0.16
  if (description.includes('jog') || description.includes('easy')) return 0.26
  const fromDescription = intensityFromKeywords(description)
  if (fromDescription != null) return fromDescription
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

  // Editor / list order: one draggable region per include item (same order as the list).
  const blocks: StructureChartBlockGroup[] = []
  for (let index = 0; index < items.length; index++) {
    const item = items[index]!
    const itemSegments = expandIncludeItem(item)
    if (itemSegments.length === 0) continue
    const weight = itemSegments.reduce((sum, segment) => sum + segment.weight, 0)
    blocks.push({
      id: item.id,
      index,
      segments: itemSegments,
      weight: Math.max(weight, 0.15),
    })
  }

  if (blocks.length === 0) return null

  const includeWeight = blocks.reduce((sum, block) => sum + block.weight, 0)
  const planned = durationMinutes && durationMinutes > 0 ? durationMinutes : 0
  const easyPad = Math.max(planned - includeWeight, includeWeight * 0.35, 8)

  // Soft easy bookends for silhouette context (not reorderable).
  const lead: StructureChartSegment = {
    kind: 'easy',
    weight: easyPad * 0.45,
    intensity: BASE_INTENSITY,
  }
  const trail: StructureChartSegment = {
    kind: 'easy',
    weight: easyPad * 0.55,
    intensity: BASE_INTENSITY,
  }

  const segments = [lead, ...blocks.flatMap((block) => block.segments), trail]

  return {
    segments,
    blocks,
    caption: includeCaption(items),
  }
}

export function buildStructureChart(
  structure: WorkoutStructure | null | undefined,
  options?: { durationMinutes?: number },
): StructureChartModel | null {
  if (!structure) return null

  if (hasStructureContent(structure)) {
    const blocks: StructureChartBlockGroup[] = []
    let index = 0

    const pushBlock = (
      block: WorkoutBlock,
      section: 'warmup' | 'mainSet' | 'cooldown',
    ) => {
      const segments = expandBlock(block, section)
      if (segments.length === 0) return
      const weight = segments.reduce((sum, segment) => sum + segment.weight, 0)
      blocks.push({
        id: block.id,
        index,
        segments,
        weight,
      })
      index += 1
    }

    for (const block of structure.warmup) {
      pushBlock(block, 'warmup')
    }
    for (const block of structure.mainSet) {
      pushBlock(block, 'mainSet')
    }
    for (const block of structure.cooldown) {
      pushBlock(block, 'cooldown')
    }

    const segments = blocks.flatMap((block) => block.segments)
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0)
    if (totalWeight <= 0) return null

    return {
      segments,
      blocks,
      caption: buildCaption(structure),
    }
  }

  return buildIncludeChart(structure.includeItems ?? [], options?.durationMinutes)
}
