import type { SessionType, WorkoutType } from '@prisma/client'
import { WorkoutType as SportEnum } from '@prisma/client'
import type {
  BlockType,
  BuilderWorkout,
  Segment,
  Target,
  WorkoutBlock,
  WorkoutIncludeItem,
  WorkoutStructure,
} from './types'
import { defaultIntensityTargetType, isBikeSport } from './target-helpers'

export function newBlockId() {
  return crypto.randomUUID()
}

export function createSegment(
  partial?: Partial<Segment>,
): Segment {
  return {
    mode: partial?.mode ?? 'time',
    value: partial?.value ?? 0,
    unit: partial?.unit ?? 'min',
    description: partial?.description,
  }
}

export function createBlock(
  type: BlockType,
  order: number,
  sportType: WorkoutType = SportEnum.RUN,
): WorkoutBlock {
  const base = { id: newBlockId(), order, type }
  const intensityType = defaultIntensityTargetType(sportType)
  const intervalTargetValue = isBikeSport(sportType) ? '250W' : '3:45/km'

  switch (type) {
    case 'CONTINUOUS':
      return {
        ...base,
        durationType: 'time',
        time: 30,
        targets: [{ type: 'rpe', value: 'Easy' }],
      }
    case 'INTERVAL':
      return {
        ...base,
        repetitions: 6,
        work: createSegment(
          isBikeSport(sportType)
            ? { mode: 'time', value: 5, unit: 'min' }
            : { mode: 'distance', value: 1000, unit: 'm' },
        ),
        recovery: createSegment({
          mode: 'time',
          value: 2,
          unit: 'min',
          // Intensity lives on targets[1] (Easy). Avoid run-only "jog" on bike.
          description: isBikeSport(sportType) ? undefined : 'jog',
        }),
        targets: [
          { type: intensityType, value: intervalTargetValue },
          { type: 'rpe', value: 'Easy' },
        ],
      }
    case 'REPETITION':
      return {
        ...base,
        repetitions: 6,
        work: createSegment({ mode: 'distance', value: 100, unit: 'm', description: 'strides' }),
      }
    case 'FREE_TEXT':
      return { ...base, text: '' }
    case 'RECOVERY':
      return {
        ...base,
        durationType: 'time',
        time: 5,
        targets: [{ type: 'rpe', value: 'Easy' }],
      }
    case 'REST':
      return {
        ...base,
        durationType: 'time',
        time: 2,
      }
    case 'PROGRESSIVE': {
      const startType = intensityType
      const startValue = isBikeSport(sportType) ? 'Z2' : '5:30'
      const endValue = isBikeSport(sportType) ? 'Z4' : '3:30'
      return {
        ...base,
        name: 'Progressive',
        durationType: isBikeSport(sportType) ? 'time' : 'distance',
        time: isBikeSport(sportType) ? 45 : undefined,
        distance: isBikeSport(sportType) ? undefined : 20,
        distanceUnit: 'km',
        startIntensity: { type: startType, value: startValue },
        endIntensity: { type: startType, value: endValue },
        stepEvery: isBikeSport(sportType)
          ? { mode: 'time', value: 5, unit: 'min' }
          : { mode: 'distance', value: 1, unit: 'km' },
        targets: [{ type: startType, value: startValue }],
      }
    }
    default:
      return base
  }
}

export function emptyStructure(): WorkoutStructure {
  return { warmup: [], mainSet: [], cooldown: [], includeItems: [] }
}

export function hasStructureContent(structure: WorkoutStructure): boolean {
  return (
    structure.warmup.length > 0 ||
    structure.mainSet.length > 0 ||
    structure.cooldown.length > 0
  )
}

export function normalizeOrders(blocks: WorkoutBlock[]): WorkoutBlock[] {
  return blocks.map((block, index) => ({ ...block, order: index }))
}

export function segmentToMinutes(segment?: Segment): number {
  if (!segment || segment.value <= 0) return 0
  if (segment.mode === 'time') {
    if (segment.unit === 'sec') return segment.value / 60
    return segment.value
  }
  return 0
}

export function segmentDistanceKm(segment?: Segment): number {
  if (!segment || segment.value <= 0 || segment.mode !== 'distance') return 0
  if (segment.unit === 'm') return segment.value / 1000
  return segment.value
}

export { estimateStructureDurationMinutes as estimateDurationMinutes } from './segment-estimation'

export function formatSegment(segment?: Segment): string {
  if (!segment || segment.value <= 0) return ''
  const unitLabel =
    segment.unit === 'min'
      ? 'min'
      : segment.unit === 'sec'
        ? 'sec'
        : segment.unit === 'km'
          ? 'km'
          : 'm'
  const base = `${segment.value} ${unitLabel}`
  return segment.description ? `${base} ${segment.description}` : base
}

/** Duration/distance only — no free-text description. */
export function formatSegmentQuantity(segment?: Segment): string {
  if (!segment || segment.value <= 0) return ''
  const unitLabel =
    segment.unit === 'min'
      ? 'min'
      : segment.unit === 'sec'
        ? 'sec'
        : segment.unit === 'km'
          ? 'km'
          : 'm'
  return `${segment.value} ${unitLabel}`
}

/** Run-only recovery wording that must never appear on bike workouts. */
const RUN_ONLY_RECOVERY_DESCRIPTION = /\b(jog|jogs|jogging|walk|walking|run|running|stride|strides)\b/i

/**
 * Interval recovery label for athlete/coach previews.
 * Prefers the recovery intensity (e.g. Easy) over segment description;
 * strips run-only words like "jog" on bike.
 */
export function formatIntervalRecoveryLabel(
  segment: Segment | undefined,
  targets: Target[] | undefined,
  sportType: WorkoutType,
): string {
  const quantity = formatSegmentQuantity(segment)
  const restValue = targets?.[1]?.value?.trim() ?? ''
  let description = segment?.description?.trim() ?? ''

  if (isBikeSport(sportType) && RUN_ONLY_RECOVERY_DESCRIPTION.test(description)) {
    description = ''
  }

  const qualifier = restValue || description
  if (quantity && qualifier) return `${quantity} ${qualifier}`
  return quantity || qualifier || ''
}

export function formatTargets(targets?: Target[]): string {
  if (!targets?.length) return ''
  return targets
    .map((t) => {
      if (t.value) return t.value
      if (t.min != null && t.max != null) return `${t.min}-${t.max}`
      return ''
    })
    .filter(Boolean)
    .join(' · ')
}

export function formatBlockSummary(block: WorkoutBlock): string {
  switch (block.type) {
    case 'CONTINUOUS':
    case 'RECOVERY':
    case 'REST': {
      const duration =
        block.durationType === 'distance'
          ? `${block.distance ?? 0} ${block.distanceUnit ?? 'km'}`
          : `${block.time ?? 0} min`
      const target = formatTargets(block.targets)
      return target ? `${duration} @ ${target}` : duration
    }
    case 'PROGRESSIVE': {
      const duration =
        block.durationType === 'distance'
          ? `${block.distance ?? 0} ${block.distanceUnit ?? 'km'}`
          : `${block.time ?? 0} min`
      const start = block.startIntensity?.value?.trim() || formatTargets(block.targets) || '—'
      const end = block.endIntensity?.value?.trim() || '—'
      const step = block.stepEvery
        ? ` · step every ${block.stepEvery.value} ${block.stepEvery.unit}`
        : ''
      return `${duration} · ${start} → ${end}${step}`
    }
    case 'INTERVAL': {
      const work = formatSegment(block.work)
      const recovery = formatIntervalRecoveryLabel(block.recovery, block.targets, SportEnum.RUN)
      const workTarget = block.targets?.[0] ? formatTargets([block.targets[0]]) : ''
      return `${block.repetitions ?? 1} x ${work}${workTarget ? ` @ ${workTarget}` : ''}${recovery ? ` · ${recovery} recovery` : ''}`
    }
    case 'REPETITION':
      return `${block.repetitions ?? 1} x ${formatSegment(block.work)}`
    case 'FREE_TEXT':
      return block.text?.trim() || 'Free text'
    default:
      return block.type
  }
}

export function parseStructure(raw: unknown): WorkoutStructure {
  if (!raw || typeof raw !== 'object') return emptyStructure()
  const s = raw as WorkoutStructure & { includeItems?: unknown }
  const includeItems: WorkoutIncludeItem[] = Array.isArray(s.includeItems)
    ? s.includeItems
        .filter((item): item is WorkoutIncludeItem => {
          if (!item || typeof item !== 'object') return false
          const candidate = item as Partial<WorkoutIncludeItem>
          return (
            typeof candidate.id === 'string' &&
            typeof candidate.title === 'string' &&
            typeof candidate.kind === 'string' &&
            typeof candidate.repetitions === 'number' &&
            candidate.work != null
          )
        })
        .map((item) => ({
          ...item,
          repetitions: Math.max(1, Math.round(item.repetitions)),
        }))
    : []
  return {
    warmup: Array.isArray(s.warmup) ? s.warmup : [],
    mainSet: Array.isArray(s.mainSet) ? s.mainSet : [],
    cooldown: Array.isArray(s.cooldown) ? s.cooldown : [],
    coachNotes: s.coachNotes,
    includeItems,
  }
}

export function defaultBuilderWorkout(
  sportType: WorkoutType = 'RUN',
  sessionType: SessionType = 'CUSTOM',
  scheduledDate?: string,
): BuilderWorkout {
  return {
    title: '',
    sportType,
    sessionType,
    scheduledDate,
    tags: [],
    structure: emptyStructure(),
  }
}
