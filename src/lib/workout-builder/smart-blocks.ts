import type { WorkoutType } from '@prisma/client'
import type { WorkoutBlock, WorkoutSection } from './types'
import { createBlock, createSegment, newBlockId } from './utils'
import { defaultIntensityTargetType, isBikeSport } from './target-helpers'
import { resolveBlockIntensity } from './structure-chart'
import {
  intensityAccentStyles,
  intensityBandFromValue,
  INTENSITY_BAND_DISPLAY,
  type IntensityAccentStyles,
} from './intensity-colors'

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

/** Always-visible add buttons: bookends + core shapes (not under Custom). */
export const QUICK_ADD_BLOCK_OPTIONS: SmartBlockOption[] = [
  { kind: 'WARM_UP', label: 'Warm Up', section: 'warmup', group: 'core' },
  ...CORE_BLOCK_OPTIONS,
  { kind: 'COOL_DOWN', label: 'Cool Down', section: 'cooldown', group: 'core' },
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

/** Default effort for accent labels (athlete preview when only accent is known). */
const ACCENT_DEFAULT_INTENSITY: Record<SmartBlockAccent, number> = {
  rest: 0.14,
  notes: 0.14,
  recovery: 0.28,
  cooldown: 0.34,
  easy: 0.38,
  warmup: 0.44,
  tempo: 0.62,
  progressive: 0.7,
  race: 0.7,
  interval: 0.8,
  threshold: 0.8,
  repetition: 0.9,
  vo2: 0.94,
}

export type SmartBlockAccentStyles = IntensityAccentStyles

/** Preview / athlete card colors graded by recognized intensity. */
export type SmartBlockAccentDisplay = {
  bar: string
  border: string
  surface: string
  label: string
  iconWrap: string
  badge: string
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

export function smartBlockAccentDisplay(
  accent: SmartBlockAccent,
): SmartBlockAccentDisplay {
  const band = intensityBandFromValue(ACCENT_DEFAULT_INTENSITY[accent])
  return INTENSITY_BAND_DISPLAY[band]
}

export function smartBlockAccentStripeClass(
  block: WorkoutBlock,
  section?: WorkoutSection,
): string {
  return smartBlockAccentStyles(block, section).stripe
}

export function smartBlockAccentStyles(
  block: WorkoutBlock,
  section?: WorkoutSection,
): SmartBlockAccentStyles {
  return intensityAccentStyles(resolveBlockIntensity(block, section ?? 'mainSet'))
}

/** Default effort for quick-add chips (matches created block bands). */
export function intensityForAddBlockKind(kind: SmartBlockKind): number {
  switch (kind) {
    case 'WARM_UP':
      return 0.44
    case 'COOL_DOWN':
      return 0.34
    case 'CONTINUOUS':
    case 'EASY_RUN':
      return 0.4
    case 'RECOVERY':
      return 0.28
    case 'REST':
    case 'COACH_NOTES':
      return 0.14
    case 'PROGRESSIVE':
      return 0.7
    case 'TEMPO':
    case 'FARTLEK':
      return 0.62
    case 'INTERVALS':
    case 'THRESHOLD':
    case 'TEMPO_INTERVALS':
    case 'MARATHON_PACE':
      return 0.8
    case 'VO2_MAX':
    case 'RACE_PACE':
    case 'HILL_REPEATS':
    case 'STRIDES':
      return 0.94
    default:
      return 0.5
  }
}

export function duplicateBlock(block: WorkoutBlock, order: number): WorkoutBlock {
  return { ...block, id: newBlockId(), order }
}

export {
  formatProgressivePreview,
  formatStepEvery,
  progressiveMidpointTarget,
} from './progressive'
