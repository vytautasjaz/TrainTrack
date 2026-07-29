import { WorkoutType } from '@prisma/client'
import type { SegmentUnit, WorkoutBlock } from './types'
import {
  PRESET_BLOCK_OPTIONS,
  createSmartBlock,
  labelForAddBlockOption,
  type PresetBlockKind,
  type SmartBlockOption,
} from './smart-blocks'
import { isBikeSport } from './target-helpers'

export const WORKOUT_BUILDER_PRESET_KINDS: PresetBlockKind[] = PRESET_BLOCK_OPTIONS.map(
  (o) => o.kind as PresetBlockKind,
)

export const INTERVAL_PRESET_KINDS: ReadonlySet<PresetBlockKind> = new Set([
  'THRESHOLD',
  'VO2_MAX',
  'TEMPO_INTERVALS',
])

export function isIntervalPresetKind(kind: PresetBlockKind): boolean {
  return INTERVAL_PRESET_KINDS.has(kind)
}

export type PresetSeedOverride = {
  label?: string
  durationType?: 'time' | 'distance'
  time?: number
  distance?: number
  distanceUnit?: 'km' | 'm'
  repetitions?: number
  workValue?: number
  workUnit?: SegmentUnit
  recoveryValue?: number
  recoveryUnit?: SegmentUnit
  intensityType?: 'rpe' | 'pace' | 'power'
  intensityValue?: string
  notes?: string
}

export type SportBuilderPresetPrefs = {
  /** Enabled presets in menu order. Omit/empty → built-in defaults. */
  enabledOrder?: PresetBlockKind[]
  overrides?: Partial<Record<PresetBlockKind, PresetSeedOverride>>
}

export type WorkoutBuilderPrefs = {
  RUN?: SportBuilderPresetPrefs
  BIKE?: SportBuilderPresetPrefs
}

export type EditablePresetRow = {
  kind: PresetBlockKind
  enabled: boolean
  label: string
  durationType: 'time' | 'distance'
  durationValue: number
  durationUnit: SegmentUnit
  repetitions: number
  workValue: number
  workUnit: SegmentUnit
  recoveryValue: number
  recoveryUnit: SegmentUnit
  intensityType: 'rpe' | 'pace' | 'power'
  intensityValue: string
  notes: string
}

function sportKey(sportType: WorkoutType): 'RUN' | 'BIKE' | null {
  if (sportType === WorkoutType.RUN) return 'RUN'
  if (sportType === WorkoutType.BIKE) return 'BIKE'
  if (isBikeSport(sportType)) return 'BIKE'
  return null
}

function isPresetKind(value: unknown): value is PresetBlockKind {
  return (
    typeof value === 'string' &&
    WORKOUT_BUILDER_PRESET_KINDS.includes(value as PresetBlockKind)
  )
}

function cleanOverride(raw: unknown): PresetSeedOverride | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const next: PresetSeedOverride = {}

  if (typeof o.label === 'string' && o.label.trim()) next.label = o.label.trim()
  if (o.durationType === 'time' || o.durationType === 'distance') {
    next.durationType = o.durationType
  }
  if (typeof o.time === 'number' && o.time >= 0) next.time = o.time
  if (typeof o.distance === 'number' && o.distance >= 0) next.distance = o.distance
  if (o.distanceUnit === 'km' || o.distanceUnit === 'm') next.distanceUnit = o.distanceUnit
  if (typeof o.repetitions === 'number' && o.repetitions >= 1) {
    next.repetitions = Math.floor(o.repetitions)
  }
  if (typeof o.workValue === 'number' && o.workValue >= 0) next.workValue = o.workValue
  if (o.workUnit === 'sec' || o.workUnit === 'min' || o.workUnit === 'm' || o.workUnit === 'km') {
    next.workUnit = o.workUnit
  }
  if (typeof o.recoveryValue === 'number' && o.recoveryValue >= 0) {
    next.recoveryValue = o.recoveryValue
  }
  if (
    o.recoveryUnit === 'sec' ||
    o.recoveryUnit === 'min' ||
    o.recoveryUnit === 'm' ||
    o.recoveryUnit === 'km'
  ) {
    next.recoveryUnit = o.recoveryUnit
  }
  if (o.intensityType === 'rpe' || o.intensityType === 'pace' || o.intensityType === 'power') {
    next.intensityType = o.intensityType
  }
  if (typeof o.intensityValue === 'string') next.intensityValue = o.intensityValue.trim()
  if (typeof o.notes === 'string') next.notes = o.notes.trim()

  return Object.keys(next).length > 0 ? next : undefined
}

export function parseWorkoutBuilderPrefs(raw: unknown): WorkoutBuilderPrefs {
  if (!raw || typeof raw !== 'object') return {}
  const root = raw as Record<string, unknown>
  const result: WorkoutBuilderPrefs = {}

  for (const key of ['RUN', 'BIKE'] as const) {
    const sportRaw = root[key]
    if (!sportRaw || typeof sportRaw !== 'object') continue
    const sport = sportRaw as Record<string, unknown>
    const enabledOrder = Array.isArray(sport.enabledOrder)
      ? sport.enabledOrder.filter(isPresetKind)
      : undefined
    const overridesRaw =
      sport.overrides && typeof sport.overrides === 'object'
        ? (sport.overrides as Record<string, unknown>)
        : {}
    const overrides: SportBuilderPresetPrefs['overrides'] = {}
    for (const kind of WORKOUT_BUILDER_PRESET_KINDS) {
      const cleaned = cleanOverride(overridesRaw[kind])
      if (cleaned) overrides[kind] = cleaned
    }
    result[key] = {
      enabledOrder:
        enabledOrder && enabledOrder.length > 0
          ? [...new Set(enabledOrder)]
          : undefined,
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    }
  }

  return result
}

export function prefsForSport(
  prefs: WorkoutBuilderPrefs | null | undefined,
  sportType: WorkoutType,
): SportBuilderPresetPrefs | undefined {
  const key = sportKey(sportType)
  if (!key) return undefined
  return prefs?.[key]
}

export function resolvePresetMenuOptions(
  sportType: WorkoutType,
  prefs?: WorkoutBuilderPrefs | null,
): SmartBlockOption[] {
  const sportPrefs = prefsForSport(prefs, sportType)
  const order =
    sportPrefs?.enabledOrder && sportPrefs.enabledOrder.length > 0
      ? sportPrefs.enabledOrder
      : WORKOUT_BUILDER_PRESET_KINDS

  return order.map((kind) => {
    const base = PRESET_BLOCK_OPTIONS.find((o) => o.kind === kind)!
    const overrideLabel = sportPrefs?.overrides?.[kind]?.label?.trim()
    const defaultLabel = labelForAddBlockOption(base, sportType)
    return {
      ...base,
      label: overrideLabel || defaultLabel,
    }
  })
}

function unitMode(unit: SegmentUnit): 'time' | 'distance' {
  return unit === 'min' || unit === 'sec' ? 'time' : 'distance'
}

export function applyPresetSeedOverride(
  block: WorkoutBlock,
  kind: PresetBlockKind,
  override?: PresetSeedOverride,
): WorkoutBlock {
  if (!override) return block
  const next: WorkoutBlock = { ...block }

  if (override.label?.trim()) next.name = override.label.trim()
  if (override.notes != null) next.notes = override.notes || undefined

  if (isIntervalPresetKind(kind)) {
    if (override.repetitions != null) next.repetitions = override.repetitions
    if (override.workValue != null && override.workUnit) {
      next.work = {
        mode: unitMode(override.workUnit),
        value: override.workValue,
        unit: override.workUnit,
        description: next.work?.description,
      }
    }
    if (override.recoveryValue != null && override.recoveryUnit) {
      next.recovery = {
        mode: unitMode(override.recoveryUnit),
        value: override.recoveryValue,
        unit: override.recoveryUnit,
        description: next.recovery?.description,
      }
    }
  } else {
    if (override.durationType === 'distance') {
      next.durationType = 'distance'
      next.distance = override.distance ?? next.distance ?? 0
      next.distanceUnit = override.distanceUnit ?? next.distanceUnit ?? 'km'
      next.time = undefined
    } else if (override.durationType === 'time') {
      next.durationType = 'time'
      next.time = override.time ?? next.time ?? 0
      next.distance = undefined
    } else if (override.time != null) {
      next.durationType = 'time'
      next.time = override.time
    } else if (override.distance != null) {
      next.durationType = 'distance'
      next.distance = override.distance
      next.distanceUnit = override.distanceUnit ?? 'km'
    }
  }

  if (override.intensityType || override.intensityValue != null) {
    const type = override.intensityType ?? next.targets?.[0]?.type ?? 'rpe'
    const value =
      override.intensityValue ?? next.targets?.[0]?.value ?? ''
    const recovery = next.targets?.[1]
    next.targets = recovery
      ? [{ type, value }, recovery]
      : [{ type, value }]
  }

  return next
}

export function createPresetBlockWithPrefs(
  kind: PresetBlockKind,
  order: number,
  sportType: WorkoutType,
  prefs?: WorkoutBuilderPrefs | null,
): WorkoutBlock {
  const block = createSmartBlock(kind, order, sportType)
  const override = prefsForSport(prefs, sportType)?.overrides?.[kind]
  return applyPresetSeedOverride(block, kind, override)
}

/** Snapshot factory defaults into editable form rows (all kinds, enabled by default). */
export function defaultEditablePresetRows(sportType: WorkoutType): EditablePresetRow[] {
  return WORKOUT_BUILDER_PRESET_KINDS.map((kind) => {
    const block = createSmartBlock(kind, 0, sportType)
    const base = PRESET_BLOCK_OPTIONS.find((o) => o.kind === kind)!
    const interval = isIntervalPresetKind(kind)
    const work = block.work
    const recovery = block.recovery
    const target = block.targets?.[0]
    const intensityType =
      target?.type === 'pace' || target?.type === 'power' || target?.type === 'rpe'
        ? target.type
        : isBikeSport(sportType)
          ? 'power'
          : 'pace'

    if (interval) {
      return {
        kind,
        enabled: true,
        label: labelForAddBlockOption(base, sportType),
        durationType: 'time' as const,
        durationValue: 0,
        durationUnit: 'min' as const,
        repetitions: block.repetitions ?? 1,
        workValue: work?.value ?? 0,
        workUnit: work?.unit ?? 'min',
        recoveryValue: recovery?.value ?? 0,
        recoveryUnit: recovery?.unit ?? 'min',
        intensityType,
        intensityValue: target?.value ?? '',
        notes: block.notes ?? '',
      }
    }

    const durationType = block.durationType === 'distance' ? 'distance' : 'time'
    return {
      kind,
      enabled: true,
      label: block.name?.trim() || labelForAddBlockOption(base, sportType),
      durationType,
      durationValue:
        durationType === 'distance' ? (block.distance ?? 0) : (block.time ?? 0),
      durationUnit:
        durationType === 'distance'
          ? ((block.distanceUnit === 'm' ? 'm' : 'km') as SegmentUnit)
          : ('min' as SegmentUnit),
      repetitions: 1,
      workValue: 0,
      workUnit: 'min' as const,
      recoveryValue: 0,
      recoveryUnit: 'min' as const,
      intensityType,
      intensityValue: target?.value ?? '',
      notes: block.notes ?? '',
    }
  })
}

export function mergeEditablePresetRows(
  sportType: WorkoutType,
  prefs?: SportBuilderPresetPrefs | null,
): EditablePresetRow[] {
  const defaults = defaultEditablePresetRows(sportType)
  const enabledSet = new Set(
    prefs?.enabledOrder && prefs.enabledOrder.length > 0
      ? prefs.enabledOrder
      : WORKOUT_BUILDER_PRESET_KINDS,
  )

  const byKind = new Map(defaults.map((row) => [row.kind, row]))
  const ordered: EditablePresetRow[] = []

  const order =
    prefs?.enabledOrder && prefs.enabledOrder.length > 0
      ? [
          ...prefs.enabledOrder,
          ...WORKOUT_BUILDER_PRESET_KINDS.filter((k) => !prefs.enabledOrder!.includes(k)),
        ]
      : WORKOUT_BUILDER_PRESET_KINDS

  for (const kind of order) {
    const base = byKind.get(kind)
    if (!base) continue
    const override = prefs?.overrides?.[kind]
    const row: EditablePresetRow = {
      ...base,
      enabled: enabledSet.has(kind),
    }
    if (override?.label) row.label = override.label
    if (override?.notes != null) row.notes = override.notes
    if (override?.intensityType) row.intensityType = override.intensityType
    if (override?.intensityValue != null) row.intensityValue = override.intensityValue

    if (isIntervalPresetKind(kind)) {
      if (override?.repetitions != null) row.repetitions = override.repetitions
      if (override?.workValue != null) row.workValue = override.workValue
      if (override?.workUnit) row.workUnit = override.workUnit
      if (override?.recoveryValue != null) row.recoveryValue = override.recoveryValue
      if (override?.recoveryUnit) row.recoveryUnit = override.recoveryUnit
    } else {
      if (override?.durationType) row.durationType = override.durationType
      if (override?.durationType === 'distance' || override?.distance != null) {
        row.durationType = 'distance'
        row.durationValue = override.distance ?? row.durationValue
        row.durationUnit = override.distanceUnit ?? (row.durationUnit === 'm' ? 'm' : 'km')
      }
      if (override?.durationType === 'time' || override?.time != null) {
        if (override.durationType === 'time' || override.distance == null) {
          row.durationType = 'time'
          row.durationValue = override.time ?? row.durationValue
          row.durationUnit = 'min'
        }
      }
    }
    ordered.push(row)
  }

  return ordered
}

export function editableRowsToSportPrefs(
  rows: EditablePresetRow[],
  sportType: WorkoutType,
): SportBuilderPresetPrefs {
  const defaults = defaultEditablePresetRows(sportType)
  const defaultByKind = new Map(defaults.map((r) => [r.kind, r]))
  const enabledOrder = rows.filter((r) => r.enabled).map((r) => r.kind)
  const overrides: NonNullable<SportBuilderPresetPrefs['overrides']> = {}

  for (const row of rows) {
    const def = defaultByKind.get(row.kind)
    if (!def) continue
    const override: PresetSeedOverride = {}
    if (row.label.trim() && row.label.trim() !== def.label) {
      override.label = row.label.trim()
    }
    if ((row.notes || '') !== (def.notes || '')) {
      override.notes = row.notes.trim()
    }
    if (row.intensityType !== def.intensityType) {
      override.intensityType = row.intensityType
    }
    if (row.intensityValue !== def.intensityValue) {
      override.intensityValue = row.intensityValue
    }

    if (isIntervalPresetKind(row.kind)) {
      if (row.repetitions !== def.repetitions) override.repetitions = row.repetitions
      if (row.workValue !== def.workValue) override.workValue = row.workValue
      if (row.workUnit !== def.workUnit) override.workUnit = row.workUnit
      if (row.recoveryValue !== def.recoveryValue) override.recoveryValue = row.recoveryValue
      if (row.recoveryUnit !== def.recoveryUnit) override.recoveryUnit = row.recoveryUnit
    } else {
      if (row.durationType !== def.durationType) override.durationType = row.durationType
      if (row.durationType === 'distance') {
        if (row.durationValue !== def.durationValue || def.durationType !== 'distance') {
          override.distance = row.durationValue
          override.distanceUnit = row.durationUnit === 'm' ? 'm' : 'km'
          override.durationType = 'distance'
        }
        if (row.durationUnit !== def.durationUnit) {
          override.distanceUnit = row.durationUnit === 'm' ? 'm' : 'km'
          override.durationType = 'distance'
          override.distance = row.durationValue
        }
      } else if (
        row.durationValue !== def.durationValue ||
        def.durationType !== 'time'
      ) {
        override.time = row.durationValue
        override.durationType = 'time'
      }
    }

    if (Object.keys(override).length > 0) overrides[row.kind] = override
  }

  const defaultOrder = WORKOUT_BUILDER_PRESET_KINDS
  const orderChanged =
    enabledOrder.length !== defaultOrder.length ||
    enabledOrder.some((k, i) => k !== defaultOrder[i])

  return {
    enabledOrder: orderChanged || enabledOrder.length < defaultOrder.length
      ? enabledOrder
      : undefined,
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  }
}
