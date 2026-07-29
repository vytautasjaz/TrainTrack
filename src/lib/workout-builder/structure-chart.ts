import type { Target, WorkoutBlock, WorkoutStructure } from './types'
import {
  estimateBlockDurationMinutes,
  formatPlanBlockSummary,
  intervalRepMinutes,
  resolvePaceMinPerKm,
  segmentDurationMinutes,
} from './segment-estimation'
import { progressiveMidpointTarget } from './progressive'
import { segmentDistanceKm } from './utils'

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

export function buildStructureChart(structure: WorkoutStructure | null | undefined): StructureChartModel | null {
  if (!structure) return null

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
