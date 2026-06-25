import type { SessionType, WorkoutType } from '@prisma/client'
import type {
  BlockType,
  BuilderWorkout,
  Segment,
  Target,
  WorkoutBlock,
  WorkoutStructure,
} from './types'

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

export function createBlock(type: BlockType, order: number): WorkoutBlock {
  const base = { id: newBlockId(), order, type }

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
        work: createSegment({ mode: 'distance', value: 1000, unit: 'm' }),
        recovery: createSegment({ mode: 'time', value: 2, unit: 'min', description: 'jog' }),
        targets: [{ type: 'pace', value: '3:45/km' }],
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
    default:
      return base
  }
}

export function emptyStructure(): WorkoutStructure {
  return { warmup: [], mainSet: [], cooldown: [] }
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

export function estimateDurationMinutes(structure: WorkoutStructure): number {
  let total = 0

  const addBlock = (block: WorkoutBlock) => {
    const reps = block.repetitions ?? 1

    switch (block.type) {
      case 'CONTINUOUS':
      case 'RECOVERY':
      case 'REST':
        if (block.durationType === 'time') total += block.time ?? 0
        break
      case 'INTERVAL':
        total += reps * (segmentToMinutes(block.work) + segmentToMinutes(block.recovery))
        break
      case 'REPETITION':
        total += reps * segmentToMinutes(block.work)
        break
      default:
        break
    }
  }

  for (const block of [...structure.warmup, ...structure.mainSet, ...structure.cooldown]) {
    addBlock(block)
  }

  return Math.round(total)
}

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
    case 'INTERVAL': {
      const work = formatSegment(block.work)
      const recovery = formatSegment(block.recovery)
      const target = formatTargets(block.targets)
      return `${block.repetitions ?? 1} x ${work}${target ? ` @ ${target}` : ''}${recovery ? ` · ${recovery} recovery` : ''}`
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
  const s = raw as WorkoutStructure
  return {
    warmup: Array.isArray(s.warmup) ? s.warmup : [],
    mainSet: Array.isArray(s.mainSet) ? s.mainSet : [],
    cooldown: Array.isArray(s.cooldown) ? s.cooldown : [],
    coachNotes: s.coachNotes,
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
