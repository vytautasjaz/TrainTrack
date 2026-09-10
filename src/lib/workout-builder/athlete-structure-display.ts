import type { WorkoutType } from '@prisma/client'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { Target, WorkoutBlock, WorkoutSection, WorkoutStructure } from './types'
import {
  estimateBlockDurationMinutes,
  estimateBlockDistanceKm,
  estimateMainSetWorkDistanceKm,
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
  effectiveIntervalSegment,
  formatSegmentDurationLabel,
  resolvePlannedWorkoutMetrics,
} from './segment-estimation'
import { formatEstimatedDistanceLabel, formatEstimatedDurationLabel } from './workout-summary'
import { formatIntervalRecoveryLabel, formatSegment, formatTargets } from './utils'
import { formatTargetSummary, recoveryTarget } from './target-helpers'
import { sportSupportsWorkoutBuilder } from './session-modes'
import { getBlockDisplayName, inferSmartBlockAccent, type SmartBlockAccent } from './smart-blocks'
import { flattenStructure } from './structure-list'

export type WorkoutSummaryMetric = {
  label: string
  value: string
}

export type PhaseBlockDisplay = {
  id: string
  /** Block name (Intervals, Warm Up, …) — not warm-up/main/cool section. */
  title: string
  primary: string
  paceLabel: string | null
  zoneLabel: string | null
  recoveryNote: string | null
  /** Coach note on this block (visible to athlete). */
  notes: string | null
  durationLabel: string | null
  /** True when duration is estimated from defaults/zones instead of explicit block entry. */
  durationApproximate: boolean
  /** Intensity-graded accent when recognized from name / targets. */
  accent: SmartBlockAccent
  intervalPreview: {
    work: string
    recovery: string
    reps: number
  } | null
}

function hasExactDurationInput(block: WorkoutBlock): boolean {
  switch (block.type) {
    case 'CONTINUOUS':
    case 'RECOVERY':
    case 'REST':
    case 'PROGRESSIVE':
      if (block.durationType === 'time') return (block.time ?? 0) > 0
      return false
    case 'INTERVAL':
      return (
        (block.repetitions ?? 1) > 0 &&
        block.work?.mode === 'time' &&
        (block.work?.value ?? 0) > 0 &&
        (!block.recovery || (block.recovery.mode === 'time' && (block.recovery.value ?? 0) > 0))
      )
    case 'REPETITION':
      return (block.repetitions ?? 1) > 0 && block.work?.mode === 'time' && (block.work?.value ?? 0) > 0
    default:
      return false
  }
}

export type PhaseSectionDisplay = {
  section: WorkoutSection
  label: string
  blocks: PhaseBlockDisplay[]
  durationMin: number
}

export type AthleteStructureDisplay = {
  metrics: WorkoutSummaryMetric[]
  /** @deprecated Prefer flat `blocks` — section buckets are legacy. */
  sections: PhaseSectionDisplay[]
  /** Ordered blocks only (no warm-up / main set / cool-down grouping). */
  blocks: PhaseBlockDisplay[]
}

const SECTION_LABELS: Record<WorkoutSection, string> = {
  warmup: 'Warm-up',
  mainSet: 'Main Set',
  cooldown: 'Cool-down',
}

function isQuantitativeTarget(target: Target, value: string): boolean {
  return (
    target.type === 'pace' ||
    target.type === 'power' ||
    target.type === 'speed' ||
    target.type === 'powerZone' ||
    value.includes('/km') ||
    /^\d+:\d{1,2}/.test(value) ||
    /^\d+(\.\d+)?\s*W$/i.test(value)
  )
}

/** Work intensity only — interval recovery lives in `targets[1]`. */
function workTargetsForBadges(block: WorkoutBlock): Target[] | undefined {
  if (block.type === 'PROGRESSIVE') {
    return [block.startIntensity, block.endIntensity, ...(block.targets ?? [])].filter(
      Boolean,
    ) as Target[]
  }
  if (block.type === 'INTERVAL' || block.type === 'REPETITION') {
    const work = block.targets?.[0]
    return work ? [work] : undefined
  }
  return block.targets
}

function extractTargetBadges(targets: Target[] | undefined): {
  paceLabel: string | null
  zoneLabel: string | null
} {
  if (!targets?.length) return { paceLabel: null, zoneLabel: null }

  let paceLabel: string | null = null
  let quantitative = false
  let zoneLabel: string | null = null

  for (const target of targets) {
    const value = (target.value ?? '').trim()
    if (!value) continue

    if (target.type === 'heartRateZone' || /^z\d/i.test(value)) {
      zoneLabel = value.toUpperCase().startsWith('Z') ? value.toUpperCase() : `Zone ${value}`
      continue
    }

    if (isQuantitativeTarget(target, value)) {
      paceLabel = formatTargetSummary(target) || value
      quantitative = true
      continue
    }

    if (
      !quantitative &&
      (target.type === 'rpe' ||
        target.type === 'heartRate' ||
        value.includes('/km') ||
        /\d+:\d{1,2}/.test(value))
    ) {
      paceLabel = formatTargetSummary(target) || value
    }
  }

  return { paceLabel, zoneLabel }
}

function formatBlockPrimary(block: WorkoutBlock): string {
  switch (block.type) {
    case 'CONTINUOUS':
    case 'RECOVERY':
    case 'REST':
    case 'PROGRESSIVE': {
      let duration = ''
      if (block.durationType === 'distance') {
        const unit = block.distanceUnit ?? 'km'
        const value = block.distance ?? 0
        if (unit === 'm') {
          duration =
            value >= 1000 ? `${Math.round((value / 1000) * 10) / 10} km` : `${value} m`
        } else {
          duration = `${value} km`
        }
      } else {
        duration = block.time ? `${block.time} min` : ''
      }

      if (block.type === 'PROGRESSIVE') {
        const start =
          formatTargetSummary(block.startIntensity) || formatTargets(block.targets) || ''
        const end = formatTargetSummary(block.endIntensity) || ''
        const ramp = start && end ? `${start} → ${end}` : start || end
        return [duration, ramp].filter(Boolean).join(' · ') || 'Progressive'
      }

      return duration || (block.type === 'REST' ? 'Rest' : 'Continuous')
    }
    case 'INTERVAL': {
      const work = formatSegment(effectiveIntervalSegment(block.work, 'work', block.targets))
      return `${block.repetitions ?? 1}x${work}`
    }
    case 'REPETITION':
      return `${block.repetitions ?? 1} x ${formatSegment(block.work)}`
    case 'FREE_TEXT':
      return block.text?.trim() || 'Notes'
    default:
      return block.type
  }
}

function buildIntervalPreview(block: WorkoutBlock, sportType: WorkoutType) {
  if (block.type !== 'INTERVAL') return null
  const work = formatSegment(
    effectiveIntervalSegment(block.work, 'work', block.targets, sportType),
  )
  const recovery = formatIntervalRecoveryLabel(
    effectiveIntervalSegment(block.recovery, 'recovery', block.targets, sportType),
    block.targets,
    sportType,
  )
  if (!work) return null
  return {
    work,
    recovery: recovery || 'Easy',
    reps: block.repetitions ?? 1,
  }
}

function buildRecoveryNote(block: WorkoutBlock, sportType: WorkoutType): string | null {
  if (block.type !== 'INTERVAL') return null

  const recovery = formatIntervalRecoveryLabel(
    effectiveIntervalSegment(block.recovery, 'recovery', block.targets, sportType),
    block.targets,
    sportType,
  )
  const restTarget = recoveryTarget(block.targets, sportType)
  const restLabel = formatTargets([restTarget])

  if (recovery) {
    if (restLabel && !recovery.toLowerCase().includes(restLabel.toLowerCase())) {
      return `${recovery} @ ${restLabel}`
    }
    return recovery
  }
  if (restLabel) return restLabel
  return null
}

function buildPhaseBlock(
  block: WorkoutBlock,
  sportType: WorkoutType,
  preferences?: AthletePreferences | null,
): PhaseBlockDisplay {
  const { paceLabel, zoneLabel } = extractTargetBadges(workTargetsForBadges(block))
  const durationMin = estimateBlockDurationMinutes(block, preferences, sportType)

  return {
    id: block.id,
    title: getBlockDisplayName(block, undefined, sportType),
    primary: formatBlockPrimary(block),
    paceLabel,
    zoneLabel,
    recoveryNote: buildRecoveryNote(block, sportType),
    notes: block.notes?.trim() || null,
    durationApproximate: !hasExactDurationInput(block),
    durationLabel: durationMin > 0 ? `~${formatSegmentDurationLabel(durationMin)}` : null,
    accent: inferSmartBlockAccent(block),
    intervalPreview: buildIntervalPreview(block, sportType),
  }
}

function buildPhaseSection(
  section: WorkoutSection,
  blocks: WorkoutBlock[],
  sportType: WorkoutType,
  preferences?: AthletePreferences | null,
): PhaseSectionDisplay | null {
  if (blocks.length === 0) return null

  let durationMin = 0
  for (const block of blocks) {
    durationMin += estimateBlockDurationMinutes(block, preferences, sportType)
  }

  return {
    section,
    label: SECTION_LABELS[section],
    blocks: blocks.map((block) => buildPhaseBlock(block, sportType, preferences)),
    durationMin,
  }
}

export function buildAthleteStructureDisplay({
  structure,
  plannedDistance,
  plannedDuration,
  sportType,
  preferences,
}: {
  structure: WorkoutStructure
  plannedDistance?: number | null
  plannedDuration?: number | null
  sportType: WorkoutType
  preferences?: AthletePreferences | null
}): AthleteStructureDisplay {
  const resolved = resolvePlannedWorkoutMetrics({
    plannedDistance: plannedDistance ?? undefined,
    plannedDuration: plannedDuration ?? undefined,
    structure,
    preferences,
    sportUsesDistance: sportSupportsWorkoutBuilder(sportType),
    sportType,
  })

  const distanceKm =
    resolved.plannedDistance ?? estimateStructureDistanceKm(structure, preferences, sportType)
  const durationMin =
    resolved.plannedDuration ?? estimateStructureDurationMinutes(structure, preferences, sportType)
  const qualityKm = estimateMainSetWorkDistanceKm(structure, preferences, sportType)

  const metrics: WorkoutSummaryMetric[] = []
  if (distanceKm > 0) {
    metrics.push({
      label: 'Distance',
      value: formatEstimatedDistanceLabel(distanceKm),
    })
  }
  if (durationMin > 0) {
    metrics.push({
      label: 'Time',
      value: formatEstimatedDurationLabel(durationMin),
    })
  }
  if (qualityKm > 0) {
    metrics.push({
      label: 'Quality',
      value: formatEstimatedDistanceLabel(qualityKm),
    })
  }

  const flatItems = flattenStructure(structure)
  const blocks = flatItems.map(({ block }) =>
    buildPhaseBlock(block, sportType, preferences),
  )

  const sections = (
    [
      buildPhaseSection('warmup', structure.warmup, sportType, preferences),
      buildPhaseSection('mainSet', structure.mainSet, sportType, preferences),
      buildPhaseSection('cooldown', structure.cooldown, sportType, preferences),
    ] as const
  ).filter((section): section is PhaseSectionDisplay => section != null)

  return { metrics, sections, blocks }
}

export function estimateSectionDistanceLabel(
  blocks: WorkoutBlock[],
  preferences?: AthletePreferences | null,
): string | null {
  let total = 0
  for (const block of blocks) {
    total += estimateBlockDistanceKm(block, preferences)
  }
  return total > 0 ? formatEstimatedDistanceLabel(total) : null
}

export type ListPhaseRow = {
  id: string
  label: string
  detail: string
  durationLabel: string | null
}

export function formatListDurationLabel(minutes: number): string {
  if (minutes <= 0) return ''
  const totalSecs = Math.round(minutes * 60)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

/** `4x1000 m @ 4:00/km, 90 sec Jog recovery` */
export function formatPhaseBlockDetail(block: PhaseBlockDisplay): string {
  const target = block.paceLabel ?? block.zoneLabel
  if (block.intervalPreview) {
    const work = `${block.intervalPreview.reps}x${block.intervalPreview.work}`
    const withTarget = target ? `${work} @ ${target}` : work
    const recovery = block.intervalPreview.recovery
    return recovery ? `${withTarget}, ${recovery}` : withTarget
  }
  if (target) return `${block.primary} @ ${target}`
  return block.primary
}

export function formatListPhaseDetail(block: PhaseBlockDisplay): string {
  const detail = formatPhaseBlockDetail(block)
  if (block.notes) {
    return detail ? `${detail} · ${block.notes}` : block.notes
  }
  return detail
}

export function buildListPhaseRows(display: AthleteStructureDisplay): ListPhaseRow[] {
  return display.blocks.map((block) => ({
    id: block.id,
    label: block.title,
    detail: formatListPhaseDetail(block),
    durationLabel: block.durationLabel,
  }))
}

