import type { WorkoutType } from '@prisma/client'
import type { WorkoutBlock, WorkoutSection } from './types'
import { createBlock, createSegment, newBlockId } from './utils'
import { defaultIntensityTargetType, isBikeSport } from './target-helpers'

/** Core add-block kinds shown above the divider. */
export type CoreBlockKind = 'CONTINUOUS' | 'INTERVALS' | 'PROGRESSIVE'

/** Preset add-block kinds shown below the divider. */
export type PresetBlockKind =
  | 'WARM_UP'
  | 'COOL_DOWN'
  | 'THRESHOLD'
  | 'VO2_MAX'
  | 'TEMPO'
  | 'TEMPO_INTERVALS'
  | 'FARTLEK'

/** Legacy kinds still used by session presets / older callers. */
export type LegacySmartBlockKind =
  | 'EASY_RUN'
  | 'RECOVERY'
  | 'MARATHON_PACE'
  | 'RACE_PACE'
  | 'HILL_REPEATS'
  | 'STRIDES'
  | 'REST'
  | 'COACH_NOTES'

export type SmartBlockKind = CoreBlockKind | PresetBlockKind | LegacySmartBlockKind

export type SmartBlockOption = {
  kind: SmartBlockKind
  label: string
  section: WorkoutSection
  group?: 'core' | 'preset'
}

export const CORE_BLOCK_OPTIONS: SmartBlockOption[] = [
  { kind: 'CONTINUOUS', label: 'Continuous', section: 'mainSet', group: 'core' },
  { kind: 'INTERVALS', label: 'Intervals', section: 'mainSet', group: 'core' },
  { kind: 'PROGRESSIVE', label: 'Progressive', section: 'mainSet', group: 'core' },
]

export const PRESET_BLOCK_OPTIONS: SmartBlockOption[] = [
  { kind: 'WARM_UP', label: 'Warm Up', section: 'warmup', group: 'preset' },
  { kind: 'COOL_DOWN', label: 'Cool Down', section: 'cooldown', group: 'preset' },
  { kind: 'THRESHOLD', label: 'Threshold intervals', section: 'mainSet', group: 'preset' },
  { kind: 'VO2_MAX', label: 'VO₂ Max intervals', section: 'mainSet', group: 'preset' },
  { kind: 'TEMPO', label: 'Tempo', section: 'mainSet', group: 'preset' },
  { kind: 'TEMPO_INTERVALS', label: 'Tempo intervals', section: 'mainSet', group: 'preset' },
  { kind: 'FARTLEK', label: 'Fartlek', section: 'mainSet', group: 'preset' },
]

/** @deprecated Prefer CORE_BLOCK_OPTIONS + PRESET_BLOCK_OPTIONS for the add menu. */
export const SMART_BLOCK_OPTIONS: SmartBlockOption[] = [
  ...CORE_BLOCK_OPTIONS,
  ...PRESET_BLOCK_OPTIONS,
  { kind: 'EASY_RUN', label: 'Easy Run', section: 'mainSet' },
  { kind: 'RECOVERY', label: 'Recovery', section: 'mainSet' },
  { kind: 'MARATHON_PACE', label: 'Marathon Pace', section: 'mainSet' },
  { kind: 'RACE_PACE', label: 'Race Pace', section: 'mainSet' },
  { kind: 'HILL_REPEATS', label: 'Hill Repeats', section: 'mainSet' },
  { kind: 'STRIDES', label: 'Strides', section: 'mainSet' },
  { kind: 'REST', label: 'Rest', section: 'mainSet' },
  { kind: 'COACH_NOTES', label: 'Coach Notes', section: 'mainSet' },
]

export function smartBlockOptionsForSection(section: WorkoutSection): SmartBlockOption[] {
  if (section === 'warmup') {
    return SMART_BLOCK_OPTIONS.filter((o) => o.section === 'warmup')
  }
  if (section === 'cooldown') {
    return SMART_BLOCK_OPTIONS.filter((o) => o.section === 'cooldown')
  }
  return SMART_BLOCK_OPTIONS.filter((o) => o.section === 'mainSet')
}

export function addBlockMenuOptions(_sportType: WorkoutType): {
  core: SmartBlockOption[]
  presets: SmartBlockOption[]
} {
  return { core: CORE_BLOCK_OPTIONS, presets: PRESET_BLOCK_OPTIONS }
}

export function labelForAddBlockOption(
  option: SmartBlockOption,
  sportType: WorkoutType,
): string {
  if (!isBikeSport(sportType)) return option.label
  switch (option.kind) {
    case 'WARM_UP':
      return 'Warm-up'
    case 'COOL_DOWN':
      return 'Cool-down'
    case 'THRESHOLD':
      return 'Threshold intervals'
    case 'VO2_MAX':
      return 'VO₂ Max intervals'
    case 'TEMPO':
      return 'Tempo'
    case 'TEMPO_INTERVALS':
      return 'Tempo intervals'
    case 'FARTLEK':
      return 'Fartlek'
    case 'EASY_RUN':
      return 'Easy Ride'
    default:
      return option.label
  }
}

function withName(block: WorkoutBlock, name: string): WorkoutBlock {
  return { ...block, name }
}

export function createCoreBlock(
  kind: CoreBlockKind,
  order: number,
  sportType: WorkoutType = 'RUN',
): WorkoutBlock {
  switch (kind) {
    case 'CONTINUOUS':
      return withName(createBlock('CONTINUOUS', order, sportType), 'Continuous')
    case 'INTERVALS':
      return withName(createBlock('INTERVAL', order, sportType), 'Intervals')
    case 'PROGRESSIVE':
      return createBlock('PROGRESSIVE', order, sportType)
    default:
      return withName(createBlock('CONTINUOUS', order, sportType), 'Continuous')
  }
}

export function createPresetBlock(
  kind: PresetBlockKind,
  order: number,
  sportType: WorkoutType = 'RUN',
): WorkoutBlock {
  return createSmartBlock(kind, order, sportType)
}

export function createSmartBlock(
  kind: SmartBlockKind,
  order: number,
  sportType: WorkoutType = 'RUN',
): WorkoutBlock {
  if (kind === 'CONTINUOUS' || kind === 'INTERVALS' || kind === 'PROGRESSIVE') {
    return createCoreBlock(kind, order, sportType)
  }

  const intensityType = defaultIntensityTargetType(sportType)
  const bike = isBikeSport(sportType)

  switch (kind) {
    case 'WARM_UP': {
      const block = createBlock('CONTINUOUS', order, sportType)
      if (bike) {
        block.durationType = 'time'
        block.time = 15
        block.targets = [{ type: 'rpe', value: 'Z2' }]
      } else {
        block.durationType = 'distance'
        block.distance = 3
        block.distanceUnit = 'km'
        block.targets = [{ type: 'rpe', value: 'Easy' }]
      }
      return withName(block, 'Warm Up')
    }
    case 'COOL_DOWN': {
      const block = createBlock('CONTINUOUS', order, sportType)
      if (bike) {
        block.durationType = 'time'
        block.time = 10
        block.targets = [{ type: 'rpe', value: 'Z2' }]
      } else {
        block.durationType = 'distance'
        block.distance = 3
        block.distanceUnit = 'km'
        block.targets = [{ type: 'rpe', value: 'Easy' }]
      }
      return withName(block, 'Cool Down')
    }
    case 'EASY_RUN': {
      const block = createBlock('CONTINUOUS', order, sportType)
      if (bike) {
        block.durationType = 'time'
        block.time = 60
        block.targets = [{ type: 'rpe', value: 'Z2' }]
      } else {
        block.durationType = 'distance'
        block.distance = 8
        block.distanceUnit = 'km'
        block.targets = [{ type: 'rpe', value: 'Easy' }]
      }
      return withName(block, bike ? 'Easy Ride' : 'Easy Run')
    }
    case 'RECOVERY': {
      const block = createBlock('RECOVERY', order, sportType)
      block.time = bike ? 45 : 5
      block.targets = [{ type: 'rpe', value: bike ? 'Z1' : 'Recovery' }]
      return withName(block, bike ? 'Recovery Ride' : 'Recovery')
    }
    case 'THRESHOLD': {
      const block = createBlock('INTERVAL', order, sportType)
      block.repetitions = bike ? 4 : 6
      block.work = createSegment(
        bike
          ? { mode: 'time', value: 10, unit: 'min' }
          : { mode: 'distance', value: 1000, unit: 'm' },
      )
      block.recovery = createSegment({
        mode: 'time',
        value: bike ? 2 : 60,
        unit: bike ? 'min' : 'sec',
        description: bike ? 'easy spin' : 'jog',
      })
      block.targets = [
        { type: intensityType, value: bike ? 'Threshold' : 'Threshold' },
        { type: 'rpe', value: 'Easy' },
      ]
      return withName(block, 'Threshold intervals')
    }
    case 'TEMPO': {
      const block = createBlock('CONTINUOUS', order, sportType)
      block.durationType = 'time'
      block.time = bike ? 40 : 30
      block.targets = [{ type: intensityType, value: 'Tempo' }]
      return withName(block, 'Tempo')
    }
    case 'TEMPO_INTERVALS': {
      const block = createBlock('INTERVAL', order, sportType)
      block.repetitions = bike ? 4 : 5
      block.work = createSegment(
        bike
          ? { mode: 'time', value: 8, unit: 'min' }
          : { mode: 'distance', value: 1600, unit: 'm' },
      )
      block.recovery = createSegment({
        mode: 'time',
        value: bike ? 3 : 90,
        unit: bike ? 'min' : 'sec',
        description: bike ? 'easy spin' : 'jog',
      })
      block.targets = [
        { type: intensityType, value: 'Tempo' },
        { type: 'rpe', value: 'Easy' },
      ]
      return withName(block, 'Tempo intervals')
    }
    case 'FARTLEK': {
      const block = createBlock('CONTINUOUS', order, sportType)
      block.durationType = 'time'
      block.time = bike ? 45 : 40
      block.targets = [{ type: 'rpe', value: 'Varied' }]
      block.notes =
        'Fartlek: mix hard surges and easy recovery by feel. Example: 1–3 min hard, equal easy.'
      return withName(block, 'Fartlek')
    }
    case 'VO2_MAX': {
      const block = createBlock('INTERVAL', order, sportType)
      block.repetitions = bike ? 6 : 8
      block.work = createSegment(
        bike
          ? { mode: 'time', value: 3, unit: 'min' }
          : { mode: 'distance', value: 400, unit: 'm' },
      )
      block.recovery = createSegment({
        mode: 'time',
        value: bike ? 3 : 90,
        unit: bike ? 'min' : 'sec',
        description: bike ? 'easy spin' : 'jog',
      })
      block.targets = [
        { type: intensityType, value: bike ? 'VO2' : 'VO2' },
        { type: 'rpe', value: 'Easy' },
      ]
      return withName(block, 'VO₂ Max intervals')
    }
    case 'MARATHON_PACE': {
      const block = createBlock('CONTINUOUS', order, sportType)
      if (bike) {
        block.durationType = 'time'
        block.time = 60
        block.targets = [{ type: intensityType, value: 'Endurance' }]
      } else {
        block.durationType = 'distance'
        block.distance = 10
        block.distanceUnit = 'km'
        block.targets = [{ type: 'pace', value: 'Marathon pace' }]
      }
      return withName(block, bike ? 'Endurance' : 'Marathon Pace')
    }
    case 'RACE_PACE': {
      const block = createBlock('CONTINUOUS', order, sportType)
      if (bike) {
        block.durationType = 'time'
        block.time = 60
        block.targets = [{ type: intensityType, value: 'Race' }]
      } else {
        block.durationType = 'distance'
        block.distance = 8
        block.distanceUnit = 'km'
        block.targets = [{ type: 'pace', value: 'Race pace' }]
      }
      return withName(block, bike ? 'Race Simulation' : 'Race Pace')
    }
    case 'HILL_REPEATS': {
      const block = createBlock('REPETITION', order, sportType)
      block.repetitions = bike ? 6 : 10
      block.work = createSegment({
        mode: 'time',
        value: bike ? 4 : 60,
        unit: bike ? 'min' : 'sec',
        description: bike ? 'climb' : 'uphill',
      })
      block.recovery = createSegment({
        mode: 'time',
        value: bike ? 3 : 2,
        unit: 'min',
        description: bike ? 'easy spin' : 'jog down',
      })
      if (bike) {
        block.targets = [{ type: intensityType, value: 'Hills' }]
      }
      return withName(block, 'Hill Repeats')
    }
    case 'STRIDES': {
      const block = createBlock('REPETITION', order, sportType)
      block.repetitions = 6
      block.work = createSegment({ mode: 'distance', value: 100, unit: 'm', description: 'strides' })
      block.recovery = createSegment({ mode: 'time', value: 60, unit: 'sec', description: 'walk' })
      return withName(block, 'Strides')
    }
    case 'REST':
      return withName(createBlock('REST', order, sportType), 'Rest')
    case 'COACH_NOTES':
      return withName(createBlock('FREE_TEXT', order, sportType), 'Coach Notes')
    default:
      return withName(createBlock('CONTINUOUS', order, sportType), 'Continuous')
  }
}

function targetMatches(block: WorkoutBlock, keywords: string[]): boolean {
  const values = [
    ...(block.targets ?? []).map((t) => t.value?.toLowerCase() ?? ''),
    block.startIntensity?.value?.toLowerCase() ?? '',
    block.endIntensity?.value?.toLowerCase() ?? '',
  ].join(' ')
  return keywords.some((k) => values.includes(k))
}

export function getBlockDisplayName(
  block: WorkoutBlock,
  section?: WorkoutSection,
  sportType?: WorkoutType,
): string {
  const named = block.name?.trim()
  if (named) return named
  return inferSmartBlockLabel(block, section, sportType).label
}

export function inferSmartBlockLabel(
  block: WorkoutBlock,
  _section?: WorkoutSection,
  sportType?: WorkoutType,
): { label: string } {
  const named = block.name?.trim()
  if (named) return { label: named }

  const bike = sportType ? isBikeSport(sportType) : false

  switch (block.type) {
    case 'INTERVAL':
      if (targetMatches(block, ['threshold', 'z4'])) return { label: 'Threshold intervals' }
      if (targetMatches(block, ['vo2', '5k', 'z5'])) return { label: 'VO₂ Max intervals' }
      if (targetMatches(block, ['tempo'])) return { label: 'Tempo intervals' }
      return { label: 'Intervals' }
    case 'PROGRESSIVE':
      return { label: 'Progressive' }
    case 'REPETITION':
      if (block.work?.description?.toLowerCase().includes('hill') || targetMatches(block, ['hill'])) {
        return { label: 'Hill Repeats' }
      }
      if (block.work?.description?.toLowerCase().includes('stride')) {
        return { label: 'Strides' }
      }
      return { label: 'Repetition' }
    case 'RECOVERY':
      return { label: bike ? 'Recovery Ride' : 'Recovery' }
    case 'REST':
      return { label: 'Rest' }
    case 'FREE_TEXT':
      return { label: 'Coach Notes' }
    case 'CONTINUOUS': {
      if (targetMatches(block, ['fartlek', 'varied'])) return { label: 'Fartlek' }
      if (targetMatches(block, ['marathon'])) {
        return { label: bike ? 'Endurance' : 'Marathon Pace' }
      }
      if (targetMatches(block, ['race'])) {
        return { label: bike ? 'Race Simulation' : 'Race Pace' }
      }
      if (targetMatches(block, ['tempo', 'sweet'])) {
        return { label: bike ? 'Tempo Ride' : 'Tempo' }
      }
      if (
        block.durationType === 'distance' &&
        (block.distance ?? 0) >= 15 &&
        targetMatches(block, ['easy'])
      ) {
        return { label: bike ? 'Long Ride' : 'Long Run' }
      }
      if (
        block.durationType === 'time' &&
        (block.time ?? 0) >= 120 &&
        targetMatches(block, ['easy', 'z2', 'endurance'])
      ) {
        return { label: bike ? 'Long Ride' : 'Long Run' }
      }
      if (targetMatches(block, ['easy', 'recovery', 'z1', 'z2'])) {
        return { label: bike ? 'Easy Ride' : 'Easy Run' }
      }
      return { label: 'Continuous' }
    }
    default:
      return { label: block.type }
  }
}

/** Left-edge color coding for workout detail block cards. */
export type SmartBlockAccent =
  | 'warmup'
  | 'cooldown'
  | 'easy'
  | 'tempo'
  | 'threshold'
  | 'vo2'
  | 'recovery'
  | 'rest'
  | 'notes'
  | 'race'
  | 'interval'
  | 'repetition'
  | 'progressive'

export const SMART_BLOCK_ACCENT_STRIPE: Record<SmartBlockAccent, string> = {
  warmup: 'bg-emerald-500',
  cooldown: 'bg-sky-500',
  easy: 'bg-teal-500',
  tempo: 'bg-amber-500',
  threshold: 'bg-red-500',
  vo2: 'bg-fuchsia-600',
  recovery: 'bg-rose-400',
  rest: 'bg-neutral-400',
  notes: 'bg-slate-500',
  race: 'bg-indigo-500',
  interval: 'bg-orange-500',
  repetition: 'bg-violet-500',
  progressive: 'bg-cyan-600',
}

export type SmartBlockAccentStyles = {
  stripe: string
  handle: string
  grip: string
}

export const SMART_BLOCK_ACCENT_STYLES: Record<SmartBlockAccent, SmartBlockAccentStyles> = {
  warmup: {
    stripe: 'bg-emerald-500',
    handle: 'bg-emerald-500/12',
    grip: 'text-emerald-600/45 group-hover/handle:text-emerald-600/70',
  },
  cooldown: {
    stripe: 'bg-sky-500',
    handle: 'bg-sky-500/12',
    grip: 'text-sky-600/45 group-hover/handle:text-sky-600/70',
  },
  easy: {
    stripe: 'bg-teal-500',
    handle: 'bg-teal-500/12',
    grip: 'text-teal-600/45 group-hover/handle:text-teal-600/70',
  },
  tempo: {
    stripe: 'bg-amber-500',
    handle: 'bg-amber-500/14',
    grip: 'text-amber-700/45 group-hover/handle:text-amber-700/70',
  },
  threshold: {
    stripe: 'bg-red-500',
    handle: 'bg-red-500/12',
    grip: 'text-red-600/45 group-hover/handle:text-red-600/70',
  },
  vo2: {
    stripe: 'bg-fuchsia-600',
    handle: 'bg-fuchsia-600/12',
    grip: 'text-fuchsia-700/45 group-hover/handle:text-fuchsia-700/70',
  },
  recovery: {
    stripe: 'bg-rose-400',
    handle: 'bg-rose-400/14',
    grip: 'text-rose-600/45 group-hover/handle:text-rose-600/70',
  },
  rest: {
    stripe: 'bg-neutral-400',
    handle: 'bg-neutral-500/10',
    grip: 'text-neutral-500/50 group-hover/handle:text-neutral-600/70',
  },
  notes: {
    stripe: 'bg-slate-500',
    handle: 'bg-slate-500/10',
    grip: 'text-slate-600/45 group-hover/handle:text-slate-600/70',
  },
  race: {
    stripe: 'bg-indigo-500',
    handle: 'bg-indigo-500/12',
    grip: 'text-indigo-600/45 group-hover/handle:text-indigo-600/70',
  },
  interval: {
    stripe: 'bg-orange-500',
    handle: 'bg-orange-500/12',
    grip: 'text-orange-600/45 group-hover/handle:text-orange-600/70',
  },
  repetition: {
    stripe: 'bg-violet-500',
    handle: 'bg-violet-500/12',
    grip: 'text-violet-600/45 group-hover/handle:text-violet-600/70',
  },
  progressive: {
    stripe: 'bg-cyan-600',
    handle: 'bg-cyan-600/12',
    grip: 'text-cyan-700/45 group-hover/handle:text-cyan-700/70',
  },
}

export function inferSmartBlockAccent(
  block: WorkoutBlock,
  _section?: WorkoutSection,
): SmartBlockAccent {
  const name = (block.name ?? '').toLowerCase()
  if (name.includes('warm')) return 'warmup'
  if (name.includes('cool')) return 'cooldown'
  if (name.includes('fartlek')) return 'tempo'
  if (name.includes('threshold')) return 'threshold'
  if (name.includes('vo2') || name.includes('vo₂')) return 'vo2'
  if (name.includes('tempo')) return 'tempo'
  if (name.includes('recovery')) return 'recovery'
  if (name.includes('race')) return 'race'

  // Intensity from targets / progressive start–end (harder end wins when both match)
  if (targetMatches(block, ['vo2', '5k', 'z5', 'sprint', 'max'])) return 'vo2'
  if (targetMatches(block, ['threshold', 'z4', 'hard'])) return 'threshold'
  if (targetMatches(block, ['tempo', 'sweet', 'z3', 'moderate'])) return 'tempo'
  if (targetMatches(block, ['marathon', 'race'])) return 'race'
  if (targetMatches(block, ['recovery', 'z1'])) return 'recovery'
  if (targetMatches(block, ['easy', 'z2'])) return 'easy'

  switch (block.type) {
    case 'INTERVAL':
      return 'interval'
    case 'PROGRESSIVE':
      return 'progressive'
    case 'REPETITION':
      return 'repetition'
    case 'RECOVERY':
      return 'recovery'
    case 'REST':
      return 'rest'
    case 'FREE_TEXT':
      return 'notes'
    case 'CONTINUOUS':
      return 'easy'
    default:
      return 'interval'
  }
}

/** Preview / athlete card colors graded by recognized intensity. */
export type SmartBlockAccentDisplay = {
  bar: string
  border: string
  surface: string
  label: string
  iconWrap: string
  badge: string
}

export const SMART_BLOCK_ACCENT_DISPLAY: Record<SmartBlockAccent, SmartBlockAccentDisplay> = {
  warmup: {
    bar: 'bg-emerald-500',
    border: 'border-l-emerald-500',
    surface: 'bg-emerald-500/[0.08]',
    label: 'text-emerald-700 dark:text-emerald-400',
    iconWrap: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  cooldown: {
    bar: 'bg-sky-500',
    border: 'border-l-sky-500',
    surface: 'bg-sky-500/[0.08]',
    label: 'text-sky-700 dark:text-sky-400',
    iconWrap: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
  easy: {
    bar: 'bg-teal-500',
    border: 'border-l-teal-500',
    surface: 'bg-teal-500/[0.08]',
    label: 'text-teal-700 dark:text-teal-400',
    iconWrap: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    badge: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  },
  tempo: {
    bar: 'bg-amber-500',
    border: 'border-l-amber-500',
    surface: 'bg-amber-500/[0.10]',
    label: 'text-amber-800 dark:text-amber-400',
    iconWrap: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-400',
  },
  threshold: {
    bar: 'bg-red-500',
    border: 'border-l-red-500',
    surface: 'bg-red-500/[0.08]',
    label: 'text-red-700 dark:text-red-400',
    iconWrap: 'bg-red-500/15 text-red-600 dark:text-red-400',
    badge: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  vo2: {
    bar: 'bg-fuchsia-600',
    border: 'border-l-fuchsia-600',
    surface: 'bg-fuchsia-600/[0.08]',
    label: 'text-fuchsia-800 dark:text-fuchsia-400',
    iconWrap: 'bg-fuchsia-600/15 text-fuchsia-700 dark:text-fuchsia-400',
    badge: 'bg-fuchsia-600/15 text-fuchsia-800 dark:text-fuchsia-400',
  },
  recovery: {
    bar: 'bg-rose-400',
    border: 'border-l-rose-400',
    surface: 'bg-rose-400/[0.10]',
    label: 'text-rose-700 dark:text-rose-400',
    iconWrap: 'bg-rose-400/15 text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-400/15 text-rose-700 dark:text-rose-400',
  },
  rest: {
    bar: 'bg-neutral-400',
    border: 'border-l-neutral-400',
    surface: 'bg-neutral-500/[0.06]',
    label: 'text-neutral-600 dark:text-neutral-400',
    iconWrap: 'bg-neutral-500/10 text-neutral-500',
    badge: 'bg-neutral-500/10 text-neutral-600',
  },
  notes: {
    bar: 'bg-slate-500',
    border: 'border-l-slate-500',
    surface: 'bg-slate-500/[0.08]',
    label: 'text-slate-700 dark:text-slate-400',
    iconWrap: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  },
  race: {
    bar: 'bg-indigo-500',
    border: 'border-l-indigo-500',
    surface: 'bg-indigo-500/[0.08]',
    label: 'text-indigo-700 dark:text-indigo-400',
    iconWrap: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  },
  interval: {
    bar: 'bg-orange-500',
    border: 'border-l-orange-500',
    surface: 'bg-orange-500/[0.08]',
    label: 'text-orange-700 dark:text-orange-400',
    iconWrap: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  },
  repetition: {
    bar: 'bg-violet-500',
    border: 'border-l-violet-500',
    surface: 'bg-violet-500/[0.08]',
    label: 'text-violet-700 dark:text-violet-400',
    iconWrap: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  },
  progressive: {
    bar: 'bg-cyan-600',
    border: 'border-l-cyan-600',
    surface: 'bg-cyan-600/[0.08]',
    label: 'text-cyan-800 dark:text-cyan-400',
    iconWrap: 'bg-cyan-600/15 text-cyan-700 dark:text-cyan-400',
    badge: 'bg-cyan-600/15 text-cyan-800 dark:text-cyan-400',
  },
}

export function smartBlockAccentDisplay(
  accent: SmartBlockAccent,
): SmartBlockAccentDisplay {
  return SMART_BLOCK_ACCENT_DISPLAY[accent]
}

export function smartBlockAccentStripeClass(
  block: WorkoutBlock,
  section?: WorkoutSection,
): string {
  const accent = inferSmartBlockAccent(block, section)
  return SMART_BLOCK_ACCENT_STRIPE[accent]
}

export function smartBlockAccentStyles(
  block: WorkoutBlock,
  section?: WorkoutSection,
): SmartBlockAccentStyles {
  const accent = inferSmartBlockAccent(block, section)
  return SMART_BLOCK_ACCENT_STYLES[accent]
}

export function duplicateBlock(block: WorkoutBlock, order: number): WorkoutBlock {
  return { ...block, id: newBlockId(), order }
}

export {
  formatProgressivePreview,
  formatStepEvery,
  progressiveMidpointTarget,
} from './progressive'
