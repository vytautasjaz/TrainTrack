import type {
  WorkoutBlock,
  WorkoutIncludeItem,
  WorkoutStructure,
} from './types'
import {
  BLOCK_TYPE_V2_LABELS,
  SECTION_TYPE_LABELS,
  type ExerciseItem,
  type WorkoutBlockV2,
  type WorkoutSectionType,
  type WorkoutSectionV2,
  type WorkoutStructureV2,
  workoutStructureV2Schema,
  newStructureId,
} from './structure-v2'
import { normalizeIncludePlacement } from './include-placement'
import type { WorkoutCardEssenceRow } from './card-summary'

function emptyStructure(): WorkoutStructure {
  return { warmup: [], mainSet: [], cooldown: [], includeItems: [] }
}

function newBlockId(): string {
  return crypto.randomUUID()
}

/** Legacy v1 bucket parse (missing version → v1). */
export function parseStructureV1(raw: unknown): WorkoutStructure {
  if (!raw || typeof raw !== 'object') return emptyStructure()
  const s = raw as WorkoutStructure & {
    includeItems?: unknown
    cardSummary?: unknown
  }
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
          placementHint: normalizeIncludePlacement(item.placementHint),
        }))
    : []
  return {
    warmup: Array.isArray(s.warmup) ? s.warmup : [],
    mainSet: Array.isArray(s.mainSet) ? s.mainSet : [],
    cooldown: Array.isArray(s.cooldown) ? s.cooldown : [],
    coachNotes: s.coachNotes,
    includeItems,
    cardSummary:
      s.cardSummary && typeof s.cardSummary === 'object'
        ? {
            essence:
              typeof (s.cardSummary as { essence?: unknown }).essence ===
              'string'
                ? (s.cardSummary as { essence: string }).essence
                : undefined,
            highlightedBlockIds: Array.isArray(
              (s.cardSummary as { highlightedBlockIds?: unknown })
                .highlightedBlockIds,
            )
              ? (
                  s.cardSummary as { highlightedBlockIds: unknown[] }
                ).highlightedBlockIds.filter(
                  (id): id is string => typeof id === 'string',
                )
              : undefined,
          }
        : undefined,
  }
}

/** True when raw JSON looks like structure v2 (version: 2 + items or legacy sections). */
export function isWorkoutStructureV2(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as { version?: unknown; items?: unknown; sections?: unknown }
  return (
    obj.version === 2 &&
    (Array.isArray(obj.items) || Array.isArray(obj.sections))
  )
}

/**
 * Parse + validate v2 structure. Returns null if invalid.
 */
export function parseStructureV2(raw: unknown): WorkoutStructureV2 | null {
  const result = workoutStructureV2Schema.safeParse(raw)
  return result.success ? result.data : null
}

/**
 * Normalize any stored JSON into either validated v2 or legacy v1 buckets.
 */
export function normalizeWorkoutStructure(
  raw: unknown,
):
  | { version: 2; structure: WorkoutStructureV2 }
  | { version: 1; structure: WorkoutStructure } {
  if (isWorkoutStructureV2(raw)) {
    const parsed = parseStructureV2(raw)
    if (parsed) return { version: 2, structure: parsed }
  }
  return { version: 1, structure: parseStructureV1(raw) }
}

function sectionBucket(
  type: WorkoutSectionType,
): 'warmup' | 'mainSet' | 'cooldown' {
  if (type === 'WARMUP') return 'warmup'
  if (type === 'COOLDOWN' || type === 'RECOVERY') return 'cooldown'
  return 'mainSet'
}

function formatPrescription(item: ExerciseItem): string {
  const p = item.prescription
  if (!p) return ''
  if (p.mode === 'UNTIMED') return ''
  if (p.value == null) {
    if (p.mode === 'REPS') return 'reps'
    if (p.mode === 'TIME') return 'time'
    if (p.mode === 'DISTANCE') return 'distance'
    return p.mode.toLowerCase()
  }
  if (p.mode === 'REPS') return `${p.value} reps`
  if (p.mode === 'TIME') {
    return p.unit === 'min' ? `${p.value} min` : `${p.value}${p.unit ?? 'sec'}`
  }
  if (p.mode === 'DISTANCE') {
    return p.unit ? `${p.value} ${p.unit}` : `${p.value}`
  }
  if (p.unit) return `${p.value}${p.unit}`
  return `${p.value}`
}

function formatLoad(item: ExerciseItem): string {
  const load = item.load
  if (!load) return ''
  if (load.type === 'BODYWEIGHT') return 'BW'
  if (load.type === 'COMPETITION') {
    return load.division ? `Comp ${load.division}` : 'Competition'
  }
  if (load.type === 'RPE' && load.value != null) return `RPE ${load.value}`
  if (load.type === 'PERCENT_1RM' && load.value != null) return `${load.value}%`
  if (load.type === 'CUSTOM' && load.value != null) return String(load.value)
  if (load.value != null) {
    // Only append unit when explicitly set — never assume kg.
    return load.unit ? `${load.value}${load.unit}` : String(load.value)
  }
  return ''
}

function formatExerciseRest(rest: {
  type?: string
  value?: number
  unit?: string
  label?: string
} | null | undefined): string | null {
  if (!rest) return null
  if (rest.type === 'TIME' && rest.value != null) {
    const unit = rest.unit ?? 'sec'
    return unit === 'sec' || unit === 's'
      ? `${rest.value}s rest`
      : `${rest.value} ${unit} rest`
  }
  if (rest.label?.trim()) return rest.label.trim()
  return null
}

/** Prescription + load only (no exercise name) — used when title already names the move. */
function formatExerciseDetail(item: ExerciseItem): string {
  const bits: string[] = []
  const rx = formatPrescription(item)
  const load = formatLoad(item)
  if (rx) bits.push(rx)
  if (load) bits.push(load)
  if (item.notes?.trim()) bits.push(item.notes.trim())
  return bits.join(' · ')
}

function formatExerciseCardParts(item: ExerciseItem): {
  name: string
  detail: string | null
} {
  const name = `${item.order ? `${item.order} ` : ''}${item.name?.trim() || item.exerciseId}`
  const detail = formatExerciseDetail(item)
  return { name, detail: detail || null }
}

function formatExerciseLine(item: ExerciseItem): string {
  const { name, detail } = formatExerciseCardParts(item)
  return detail ? `${name} · ${detail}` : name
}

function isLabeledBlockV2(block: WorkoutBlockV2): boolean {
  return block.type !== 'EXERCISE' && block.type !== 'CONTINUOUS' && block.type !== 'REST'
}

/** Short label + soft meta for card headers (e.g. SUPERSET / 3× · Rest 90 sec). */
function splitBlockV2CardHeader(block: WorkoutBlockV2): {
  title: string
  meta: string | null
} {
  const full = formatBlockV2Title(block)
  const label = BLOCK_TYPE_V2_LABELS[block.type] ?? block.type
  if (full === label) return { title: label, meta: null }
  if (full.startsWith(`${label} · `)) {
    return { title: label, meta: full.slice(label.length + 3) }
  }
  // "For Time · …" / "Race Simulation"
  const sep = full.indexOf(' · ')
  if (sep !== -1) {
    return { title: full.slice(0, sep), meta: full.slice(sep + 3) }
  }
  return { title: full, meta: null }
}

function appendV2ExerciseRows(
  rows: WorkoutCardEssenceRow[],
  block: WorkoutBlockV2,
) {
  if (block.type === 'FREE_TEXT') {
    const text = block.text?.trim()
    if (!text) return
    for (const raw of text.split('\n')) {
      const line = raw.trimEnd()
      if (!line.trim()) continue
      const mid = line.search(/\s+·\s+/)
      if (mid === -1) {
        rows.push({ kind: 'exercise', text: line })
      } else {
        rows.push({
          kind: 'exercise',
          text: line.slice(0, mid),
          detail: line.slice(mid).replace(/^\s+·\s+/, ''),
        })
      }
    }
    return
  }

  const blockRest =
    block.type === 'EXERCISE' || block.type === 'CONTINUOUS'
      ? formatExerciseRest(block.rest)
      : null

  for (const item of exercisesFromBlock(block)) {
    const { name, detail } = formatExerciseCardParts(item)
    if (!name.trim()) continue
    const withRest =
      blockRest && !detail?.includes('rest')
        ? detail
          ? `${detail} · ${blockRest}`
          : blockRest
        : detail
    rows.push({
      kind: 'exercise',
      text: name,
      ...(withRest ? { detail: withRest } : {}),
    })
  }
}

function appendV2BlockEssenceRows(
  rows: WorkoutCardEssenceRow[],
  block: WorkoutBlockV2,
) {
  if (block.type === 'REST') return

  if (isLabeledBlockV2(block)) {
    const { title, meta } = splitBlockV2CardHeader(block)
    // One line: bold label + regular meta (AMRAP · 12 min).
    rows.push({
      kind: 'block',
      text: title,
      ...(meta ? { detail: meta } : {}),
    })
    appendV2ExerciseRows(rows, block)
    return
  }

  appendV2ExerciseRows(rows, block)
}

/**
 * Structured athlete-facing rows for plan/training cards from structure v2.
 * Section headers, equal block headers (AMRAP / SUPERSET), name|detail rows.
 */
export function getStructureV2CardEssenceRows(
  structure: WorkoutStructureV2,
  _options: { includeAllBlocks?: boolean } = {},
): WorkoutCardEssenceRow[] {
  const rows: WorkoutCardEssenceRow[] = []

  for (const item of structure.items) {
    if (item.kind === 'block') {
      appendV2BlockEssenceRows(rows, item.block)
      continue
    }

    if (item.blocks.length === 0) continue

    const customTitle = item.name?.trim()
    const defaultTitle = SECTION_TYPE_LABELS[item.type]
    rows.push({
      kind: 'section',
      text: customTitle || defaultTitle,
    })

    for (const block of item.blocks) {
      if (block.type === 'REST') continue
      appendV2BlockEssenceRows(rows, block)
    }
  }

  return rows
}

/** Flat text lines (tests / copy sync). Prefer rows for UI. */
export function getStructureV2CardEssenceLines(
  structure: WorkoutStructureV2,
  options: { includeAllBlocks?: boolean } = {},
): string[] {
  return getStructureV2CardEssenceRows(structure, options).map((row) => {
    if (row.kind === 'rule') return ''
    if (row.detail) return `${row.text} · ${row.detail}`
    return row.text
  })
}

function exercisesFromBlock(block: WorkoutBlockV2): ExerciseItem[] {
  if ('exercises' in block && Array.isArray(block.exercises) && block.exercises.length) {
    return block.exercises
  }
  if ('exercise' in block && block.exercise) return [block.exercise]
  return []
}

function formatDurationSpec(d: {
  value: number
  unit: string
}): string {
  if (d.unit === 'min') return `${d.value} min`
  if (d.unit === 'sec') {
    if (d.value >= 60 && d.value % 60 === 0) return `${d.value / 60} min`
    return `${d.value} sec`
  }
  return `${d.value}${d.unit}`
}

function formatRestSuffix(block: WorkoutBlockV2): string | null {
  if (!('rest' in block) || !block.rest) return null
  const r = block.rest
  if (r.type === 'TIME' && r.value != null) {
    return `Rest ${formatDurationSpec({ value: r.value, unit: r.unit ?? 'sec' })}`
  }
  if (r.type === 'UNTIL_NEXT_MINUTE') return 'Rest to next min'
  if (r.label?.trim()) return r.label.trim()
  return null
}

/**
 * Athlete / editor Preview title for a v2 block — includes duration, rounds,
 * interval, time cap, and rest when set (e.g. "AMRAP · 12 min").
 */
export function formatBlockV2Title(block: WorkoutBlockV2): string {
  const exercises = exercisesFromBlock(block)
  const label = BLOCK_TYPE_V2_LABELS[block.type] ?? block.type
  const bits: string[] = []

  switch (block.type) {
    case 'EXERCISE':
    case 'CONTINUOUS': {
      const item = exercises[0]
      if (item?.name?.trim()) return item.name.trim()
      if (item?.exerciseId) return item.exerciseId
      return label
    }
    case 'SET':
    case 'CIRCUIT':
    case 'SUPERSET':
    case 'INTERVAL':
    case 'LADDER': {
      bits.push(label)
      if (block.rounds != null && block.rounds > 0) {
        bits.push(`${block.rounds}×`)
      }
      break
    }
    case 'EMOM': {
      bits.push('EMOM')
      const rounds = block.rounds
      const interval = block.interval
        ? formatDurationSpec(block.interval)
        : null
      if (rounds != null && rounds > 0 && interval) {
        bits.push(`${rounds} × ${interval}`)
      } else if (rounds != null && rounds > 0) {
        bits.push(`${rounds} rounds`)
      } else if (interval) {
        bits.push(interval)
      }
      break
    }
    case 'AMRAP': {
      bits.push('AMRAP')
      if (block.duration) bits.push(formatDurationSpec(block.duration))
      break
    }
    case 'FOR_TIME': {
      bits.push('For Time')
      if (block.rounds != null && block.rounds > 0) {
        bits.push(
          block.rounds === 1 ? '1 round' : `${block.rounds} rounds`,
        )
      }
      if (block.timeCap) {
        bits.push(`cap ${formatDurationSpec(block.timeCap)}`)
      }
      break
    }
    case 'RACE_SIMULATION':
      return 'Race Simulation'
    case 'REST': {
      const rest = formatRestSuffix(block)
      return rest ? `Rest · ${rest.replace(/^Rest\s+/i, '')}` : 'Rest'
    }
    case 'FREE_TEXT':
      return 'Notes'
    default:
      return label
  }

  const rest = formatRestSuffix(block)
  if (rest) bits.push(rest)
  return bits.join(' · ')
}

/** @deprecated Use formatBlockV2Title */
function displayNameForBlockV2(block: WorkoutBlockV2): string {
  return formatBlockV2Title(block)
}

/**
 * Body text for a projected v2 block.
 * Exercises are one-per-line with reps/load when present.
 */
export function summarizeBlockV2(block: WorkoutBlockV2): string {
  const exercises = exercisesFromBlock(block)

  switch (block.type) {
    case 'FREE_TEXT':
      return block.text?.trim() || ''
    case 'REST': {
      const r = block.rest
      if (r?.type === 'TIME' && r.value != null) {
        return `${r.value}${r.unit ?? 'sec'}`
      }
      return r?.label?.trim() || ''
    }
    case 'CONTINUOUS':
    case 'EXERCISE': {
      if (exercises.length === 0) return ''
      const restBit = formatExerciseRest(block.rest)
      // Title already shows the exercise name — body is prescription/effort/rest.
      if (exercises.length === 1) {
        const detail = formatExerciseDetail(exercises[0]!)
        if (restBit && !detail.includes('rest')) {
          return detail ? `${detail} · ${restBit}` : restBit
        }
        return detail
      }
      const lines = exercises.map(formatExerciseLine)
      if (restBit) lines.push(restBit)
      return lines.join('\n')
    }
    case 'EMOM':
    case 'AMRAP':
    case 'FOR_TIME':
    case 'RACE_SIMULATION':
    case 'SET':
    case 'CIRCUIT':
    case 'SUPERSET':
    case 'INTERVAL':
    case 'LADDER': {
      if (exercises.length === 0) return ''
      const lines = exercises.map(formatExerciseLine)
      const rest =
        'rest' in block &&
        block.rest?.type === 'TIME' &&
        block.rest.value != null
          ? `Rest ${block.rest.value}${block.rest.unit ?? 'sec'}`
          : null
      if (rest) lines.push(rest)
      return lines.join('\n')
    }
  }
}

function projectBlockV2ToV1(block: WorkoutBlockV2, order: number): WorkoutBlock {
  // Map continuous time/distance prescriptions when possible
  if (block.type === 'CONTINUOUS' || block.type === 'EXERCISE') {
    const item = exercisesFromBlock(block)[0]
    const prescription =
      item?.prescription ??
      ('prescription' in block ? block.prescription : undefined)
    if (prescription?.mode === 'TIME' && prescription.value != null) {
      const minutes =
        prescription.unit === 'sec'
          ? prescription.value / 60
          : prescription.value
      return {
        id: block.id || newBlockId(),
        order,
        type: 'CONTINUOUS',
        time: minutes,
        durationType: 'time',
        notes: block.notes,
        text: summarizeBlockV2(block),
        name: displayNameForBlockV2(block),
      }
    }
    if (prescription?.mode === 'DISTANCE' && prescription.value != null) {
      const unit = prescription.unit === 'm' ? 'm' : 'km'
      const distance =
        unit === 'm' && prescription.unit === 'm'
          ? prescription.value / 1000
          : prescription.value
      return {
        id: block.id || newBlockId(),
        order,
        type: 'CONTINUOUS',
        durationType: 'distance',
        distance: unit === 'm' ? prescription.value / 1000 : distance,
        distanceUnit: 'km',
        notes: block.notes,
        text: summarizeBlockV2(block),
        name: displayNameForBlockV2(block),
      }
    }
  }

  if (block.type === 'REST') {
    const r = block.rest
    const minutes =
      r?.type === 'TIME' && r.value != null
        ? r.unit === 'min'
          ? r.value
          : r.value / 60
        : 2
    return {
      id: block.id || newBlockId(),
      order,
      type: 'REST',
      name: 'Rest',
      durationType: 'time',
      time: minutes,
      notes: block.notes,
    }
  }

  // Strength-style blocks → FREE_TEXT with explicit display name (not "Coach Notes")
  return {
    id: block.id || newBlockId(),
    order,
    type: 'FREE_TEXT',
    name: displayNameForBlockV2(block),
    text: summarizeBlockV2(block),
    notes: block.notes,
  }
}

function pushProjectedBlock(
  target: WorkoutBlock[],
  block: WorkoutBlockV2,
) {
  target.push(projectBlockV2ToV1(block, target.length))
}

function sectionDisplayName(
  type: WorkoutSectionType,
  name?: string,
): string {
  const trimmed = name?.trim()
  if (trimmed) return trimmed
  return SECTION_TYPE_LABELS[type] ?? type
}

/**
 * Project v2 → temporary v1-like buckets for legacy display / estimation.
 * Emits section header rows + named blocks so athlete/preview UI shows
 * section/block titles instead of generic "Coach Notes".
 */
export function projectStructureV2ToV1(
  structure: WorkoutStructureV2,
): WorkoutStructure {
  const warmup: WorkoutBlock[] = []
  const mainSet: WorkoutBlock[] = []
  const cooldown: WorkoutBlock[] = []

  for (const item of structure.items) {
    if (item.kind === 'block') {
      pushProjectedBlock(mainSet, item.block)
      continue
    }
    const bucket = sectionBucket(item.type)
    const target =
      bucket === 'warmup' ? warmup : bucket === 'cooldown' ? cooldown : mainSet
    if (item.blocks.length === 0) continue

    // Section header (title-only row in athlete/preview lists)
    target.push({
      id: `section-${item.id}`,
      order: target.length,
      type: 'FREE_TEXT',
      name: sectionDisplayName(item.type, item.name),
      text: '',
    })
    for (const block of item.blocks) {
      pushProjectedBlock(target, block)
    }
  }

  return {
    warmup,
    mainSet,
    cooldown,
    coachNotes: structure.coachNotes,
    includeItems: [],
    cardSummary: structure.cardSummary
      ? {
          essence: structure.cardSummary.essence,
          highlightedBlockIds: structure.cardSummary.highlightedBlockIds,
        }
      : undefined,
  }
}

function migrateBlockV1ToV2(block: WorkoutBlock): WorkoutBlockV2 {
  const id = block.id || newStructureId()
  switch (block.type) {
    case 'CONTINUOUS':
    case 'RECOVERY': {
      const isDistance = block.durationType === 'distance'
      return {
        id,
        type: 'CONTINUOUS',
        notes: block.notes,
        exercise: {
          exerciseId: 'run',
          name: block.name ?? 'Continuous',
          prescription: isDistance
            ? {
                mode: 'DISTANCE',
                value: block.distance ?? 0,
                unit: block.distanceUnit === 'm' ? 'm' : 'km',
              }
            : {
                mode: 'TIME',
                value: block.time ?? 0,
                unit: 'min',
              },
          target: block.targets?.[0]
            ? {
                type:
                  block.targets[0].type === 'rpe'
                    ? 'RPE'
                    : block.targets[0].type === 'pace'
                      ? 'PACE'
                      : block.targets[0].type === 'heartRate' ||
                          block.targets[0].type === 'heartRateZone'
                        ? 'HEART_RATE'
                        : block.targets[0].type === 'power' ||
                            block.targets[0].type === 'powerZone'
                          ? 'POWER'
                          : 'CUSTOM',
                value: block.targets[0].value,
                min: block.targets[0].min,
                max: block.targets[0].max,
              }
            : undefined,
        },
      }
    }
    case 'INTERVAL':
    case 'REPETITION':
      return {
        id,
        type: 'INTERVAL',
        rounds: block.repetitions ?? 1,
        notes: block.notes,
        exercises: [
          {
            exerciseId: 'run',
            name: block.name ?? 'Work',
            prescription: block.work
              ? block.work.mode === 'distance'
                ? {
                    mode: 'DISTANCE',
                    value: block.work.value,
                    unit: block.work.unit === 'm' ? 'm' : 'km',
                  }
                : {
                    mode: 'TIME',
                    value: block.work.value,
                    unit: block.work.unit === 'sec' ? 'sec' : 'min',
                  }
              : undefined,
          },
        ],
        rest:
          block.recovery && block.recovery.mode === 'time'
            ? {
                type: 'TIME',
                value: block.recovery.value,
                unit: block.recovery.unit === 'sec' ? 'sec' : 'min',
              }
            : undefined,
      }
    case 'REST':
      return {
        id,
        type: 'REST',
        notes: block.notes,
        rest: {
          type: 'TIME',
          value: block.time ?? 2,
          unit: 'min',
        },
      }
    case 'FREE_TEXT':
      return {
        id,
        type: 'FREE_TEXT',
        text: block.text ?? '',
        notes: block.notes,
      }
    case 'PROGRESSIVE':
      return {
        id,
        type: 'CONTINUOUS',
        notes: block.notes,
        exercise: {
          exerciseId: 'run',
          name: block.name ?? 'Progressive',
          prescription:
            block.durationType === 'distance'
              ? {
                  mode: 'DISTANCE',
                  value: block.distance ?? 0,
                  unit: 'km',
                }
              : {
                  mode: 'TIME',
                  value: block.time ?? 0,
                  unit: 'min',
                },
          notes: 'Progressive ramp',
        },
      }
    default:
      return {
        id,
        type: 'FREE_TEXT',
        text: block.text ?? block.type,
        notes: block.notes,
      }
  }
}

function migrateSection(
  type: WorkoutSectionType,
  name: string,
  blocks: WorkoutBlock[],
): WorkoutSectionV2 {
  return {
    id: newStructureId(),
    type,
    name,
    blocks: blocks.map(migrateBlockV1ToV2),
  }
}

/**
 * Best-effort migrate v1 buckets → v2 sections (for editors / future use).
 * Not applied to DB rows in Phase 1.
 */
export function migrateWorkoutStructureV1ToV2(
  structure: WorkoutStructure,
): WorkoutStructureV2 {
  const items: WorkoutStructureV2['items'] = []
  if (structure.warmup.length > 0) {
    items.push({
      kind: 'section',
      ...migrateSection('WARMUP', 'Warm Up', structure.warmup),
    })
  }
  if (structure.mainSet.length > 0) {
    items.push({
      kind: 'section',
      ...migrateSection('MAIN_SET', 'Main Set', structure.mainSet),
    })
  }
  if (structure.cooldown.length > 0) {
    items.push({
      kind: 'section',
      ...migrateSection('COOLDOWN', 'Cool Down', structure.cooldown),
    })
  }
  return {
    version: 2,
    items,
    coachNotes: structure.coachNotes,
    cardSummary: structure.cardSummary
      ? {
          essence: structure.cardSummary.essence,
          highlightedBlockIds: structure.cardSummary.highlightedBlockIds,
        }
      : undefined,
  }
}

/**
 * Parse any stored structure into v1 buckets for legacy consumers.
 * v2 is projected; invalid v2 falls back to empty v1.
 */
export function parseStructureForDisplay(raw: unknown): WorkoutStructure {
  if (isWorkoutStructureV2(raw)) {
    const v2 = parseStructureV2(raw)
    if (v2) return projectStructureV2ToV1(v2)
    return emptyStructure()
  }
  return parseStructureV1(raw)
}

export function hasStructureContentRaw(raw: unknown): boolean {
  if (isWorkoutStructureV2(raw)) {
    const v2 = parseStructureV2(raw)
    if (!v2) return false
    return hasStructureV2Content(v2)
  }
  const v1 = parseStructureV1(raw)
  return (
    v1.warmup.length > 0 || v1.mainSet.length > 0 || v1.cooldown.length > 0
  )
}

export function hasStructureV2Content(
  structure?: WorkoutStructureV2 | null,
): boolean {
  if (!structure) return false
  return structure.items.some((item) =>
    item.kind === 'block' ? true : item.blocks.length > 0,
  )
}

/**
 * Resolve payload.structure for DB write: keep validated v2 as-is,
 * otherwise persist legacy v1 buckets. Metrics/diagram always get a v1 view.
 */
export function prepareStructureForPersist(raw: unknown): {
  shouldSave: boolean
  stored: WorkoutStructure | WorkoutStructureV2 | null
  display: WorkoutStructure
} {
  if (isWorkoutStructureV2(raw)) {
    const v2 = parseStructureV2(raw)
    if (!v2 || !hasStructureV2Content(v2)) {
      return {
        shouldSave: false,
        stored: null,
        display: emptyStructure(),
      }
    }
    return {
      shouldSave: true,
      stored: v2,
      display: projectStructureV2ToV1(v2),
    }
  }

  const v1 = parseStructureV1(raw)
  const hasBlocks =
    v1.warmup.length > 0 || v1.mainSet.length > 0 || v1.cooldown.length > 0
  const hasInclude = (v1.includeItems?.length ?? 0) > 0
  if (!hasBlocks && !hasInclude) {
    return {
      shouldSave: false,
      stored: null,
      display: emptyStructure(),
    }
  }
  return {
    shouldSave: true,
    stored: v1,
    display: v1,
  }
}
