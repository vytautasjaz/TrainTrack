import {
  createEmptyBlockV2,
  createEmptyExerciseItem,
  type ExerciseItem,
  type WorkoutBlockV2,
  type WorkoutRootItemV2,
  type WorkoutStructureV2,
} from '@/lib/workout-builder/structure-v2'

export const STRUCTURE_DRAG_MIME = 'application/x-tt-structure-v2'

/** Where a multi-exercise (or EXERCISE) block lives. */
export type BlockContainerRef =
  | { kind: 'root'; rootIndex: number }
  | { kind: 'section'; sectionRootIndex: number; blockIndex: number }

export type StructureDragSource =
  | { kind: 'rootItem'; rootIndex: number }
  | { kind: 'sectionBlock'; sectionRootIndex: number; blockIndex: number }
  | { kind: 'exercise'; container: BlockContainerRef; exerciseIndex: number }

export type StructureDropTarget =
  | { kind: 'root'; insertAt: number }
  | { kind: 'section'; sectionRootIndex: number; insertAt: number }
  | { kind: 'blockExercises'; container: BlockContainerRef; insertAt: number }

type Extracted =
  | { type: 'rootItem'; item: WorkoutRootItemV2 }
  | { type: 'block'; block: WorkoutBlockV2 }
  | { type: 'exercise'; item: ExerciseItem }

export function exercisesOfBlock(block: WorkoutBlockV2): ExerciseItem[] {
  if ('exercises' in block && Array.isArray(block.exercises)) {
    return block.exercises
  }
  if ('exercise' in block && block.exercise) return [block.exercise]
  return []
}

export function withBlockExercises(
  block: WorkoutBlockV2,
  exercises: ExerciseItem[],
): WorkoutBlockV2 {
  if (block.type === 'CONTINUOUS' || block.type === 'EXERCISE') {
    return {
      ...block,
      exercise: exercises[0],
      exercises: exercises.length > 1 ? exercises : undefined,
    }
  }
  if (block.type === 'REST' || block.type === 'FREE_TEXT') return block
  return { ...block, exercises }
}

export function blockAcceptsExercises(block: WorkoutBlockV2): boolean {
  return block.type !== 'REST' && block.type !== 'FREE_TEXT'
}

export function isExerciseOnlyBlock(
  block: WorkoutBlockV2,
): block is Extract<WorkoutBlockV2, { type: 'EXERCISE' }> {
  return block.type === 'EXERCISE'
}

function exerciseFromBlock(block: WorkoutBlockV2): ExerciseItem | null {
  const list = exercisesOfBlock(block)
  return list[0] ?? null
}

function wrapExerciseAsBlock(item: ExerciseItem): WorkoutBlockV2 {
  const block = createEmptyBlockV2('EXERCISE')
  return {
    ...block,
    type: 'EXERCISE',
    exercise: { ...createEmptyExerciseItem(), ...item },
    exercises: undefined,
  }
}

function cloneItems(items: WorkoutRootItemV2[]): WorkoutRootItemV2[] {
  return items.map((item) =>
    item.kind === 'section'
      ? { ...item, blocks: [...item.blocks] }
      : { ...item, block: item.block },
  )
}

function getBlock(
  items: WorkoutRootItemV2[],
  container: BlockContainerRef,
): WorkoutBlockV2 | null {
  if (container.kind === 'root') {
    const item = items[container.rootIndex]
    if (!item || item.kind !== 'block') return null
    return item.block
  }
  const section = items[container.sectionRootIndex]
  if (!section || section.kind !== 'section') return null
  return section.blocks[container.blockIndex] ?? null
}

function setBlock(
  items: WorkoutRootItemV2[],
  container: BlockContainerRef,
  block: WorkoutBlockV2,
): WorkoutRootItemV2[] {
  const next = cloneItems(items)
  if (container.kind === 'root') {
    const item = next[container.rootIndex]
    if (!item || item.kind !== 'block') return items
    next[container.rootIndex] = { kind: 'block', block }
    return next
  }
  const section = next[container.sectionRootIndex]
  if (!section || section.kind !== 'section') return items
  const blocks = [...section.blocks]
  blocks[container.blockIndex] = block
  next[container.sectionRootIndex] = { ...section, blocks }
  return next
}

function sameContainer(a: BlockContainerRef, b: BlockContainerRef): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'root' && b.kind === 'root') return a.rootIndex === b.rootIndex
  if (a.kind === 'section' && b.kind === 'section') {
    return (
      a.sectionRootIndex === b.sectionRootIndex &&
      a.blockIndex === b.blockIndex
    )
  }
  return false
}

function removeSource(
  items: WorkoutRootItemV2[],
  source: StructureDragSource,
): { items: WorkoutRootItemV2[]; extracted: Extracted } | null {
  const next = cloneItems(items)

  if (source.kind === 'rootItem') {
    if (source.rootIndex < 0 || source.rootIndex >= next.length) return null
    const [item] = next.splice(source.rootIndex, 1)
    if (!item) return null
    return { items: next, extracted: { type: 'rootItem', item } }
  }

  if (source.kind === 'sectionBlock') {
    const section = next[source.sectionRootIndex]
    if (!section || section.kind !== 'section') return null
    if (
      source.blockIndex < 0 ||
      source.blockIndex >= section.blocks.length
    ) {
      return null
    }
    const blocks = [...section.blocks]
    const [block] = blocks.splice(source.blockIndex, 1)
    if (!block) return null
    next[source.sectionRootIndex] = { ...section, blocks }
    return { items: next, extracted: { type: 'block', block } }
  }

  const block = getBlock(next, source.container)
  if (!block || !blockAcceptsExercises(block)) return null
  const exercises = [...exercisesOfBlock(block)]
  if (
    source.exerciseIndex < 0 ||
    source.exerciseIndex >= exercises.length
  ) {
    return null
  }
  const [item] = exercises.splice(source.exerciseIndex, 1)
  if (!item) return null
  return {
    items: setBlock(next, source.container, withBlockExercises(block, exercises)),
    extracted: { type: 'exercise', item },
  }
}

function adjustInsertAfterRemove(
  source: StructureDragSource,
  target: StructureDropTarget,
  insertAt: number,
): number {
  let at = insertAt

  if (source.kind === 'rootItem' && target.kind === 'root') {
    if (source.rootIndex < at) at -= 1
  }

  if (
    source.kind === 'sectionBlock' &&
    target.kind === 'section' &&
    source.sectionRootIndex === target.sectionRootIndex &&
    source.blockIndex < at
  ) {
    at -= 1
  }

  if (
    source.kind === 'exercise' &&
    target.kind === 'blockExercises' &&
    sameContainer(source.container, target.container) &&
    source.exerciseIndex < at
  ) {
    at -= 1
  }

  // Root item removed before a section index we target
  if (source.kind === 'rootItem') {
    if (
      target.kind === 'section' &&
      source.rootIndex < target.sectionRootIndex
    ) {
      // sectionRootIndex in target is absolute; caller should use pre-remove indices
      // We adjust by returning a flag via remapping section index in insert —
      // handled in insertExtracted.
    }
  }

  return Math.max(0, at)
}

function remapSectionRootIndex(
  source: StructureDragSource,
  sectionRootIndex: number,
): number {
  if (source.kind === 'rootItem' && source.rootIndex < sectionRootIndex) {
    return sectionRootIndex - 1
  }
  return sectionRootIndex
}

function remapBlockContainer(
  source: StructureDragSource,
  container: BlockContainerRef,
): BlockContainerRef {
  if (container.kind === 'root') {
    let rootIndex = container.rootIndex
    if (source.kind === 'rootItem' && source.rootIndex < rootIndex) {
      rootIndex -= 1
    }
    return { kind: 'root', rootIndex }
  }
  const sectionRootIndex = remapSectionRootIndex(
    source,
    container.sectionRootIndex,
  )
  let blockIndex = container.blockIndex
  if (
    source.kind === 'sectionBlock' &&
    source.sectionRootIndex === container.sectionRootIndex &&
    source.blockIndex < container.blockIndex
  ) {
    blockIndex -= 1
  }
  return { kind: 'section', sectionRootIndex, blockIndex }
}

function toBlock(extracted: Extracted): WorkoutBlockV2 | null {
  if (extracted.type === 'block') return extracted.block
  if (extracted.type === 'exercise') return wrapExerciseAsBlock(extracted.item)
  if (extracted.type === 'rootItem' && extracted.item.kind === 'block') {
    return extracted.item.block
  }
  return null
}

function toExercise(extracted: Extracted): ExerciseItem | null {
  if (extracted.type === 'exercise') return extracted.item
  if (extracted.type === 'block' && isExerciseOnlyBlock(extracted.block)) {
    return exerciseFromBlock(extracted.block)
  }
  if (
    extracted.type === 'rootItem' &&
    extracted.item.kind === 'block' &&
    isExerciseOnlyBlock(extracted.item.block)
  ) {
    return exerciseFromBlock(extracted.item.block)
  }
  return null
}

function insertExtracted(
  items: WorkoutRootItemV2[],
  source: StructureDragSource,
  target: StructureDropTarget,
  extracted: Extracted,
): WorkoutRootItemV2[] | null {
  if (target.kind === 'root') {
    const at = adjustInsertAfterRemove(source, target, target.insertAt)
    const next = cloneItems(items)
    if (extracted.type === 'rootItem') {
      if (extracted.item.kind === 'section' || extracted.item.kind === 'block') {
        next.splice(at, 0, extracted.item)
        return next
      }
    }
    const block = toBlock(extracted)
    if (!block) return null
    next.splice(at, 0, { kind: 'block', block })
    return next
  }

  if (target.kind === 'section') {
    // Can't nest a section inside a section
    if (extracted.type === 'rootItem' && extracted.item.kind === 'section') {
      return null
    }
    const sectionRootIndex = remapSectionRootIndex(
      source,
      target.sectionRootIndex,
    )
    const at = adjustInsertAfterRemove(source, target, target.insertAt)
    const next = cloneItems(items)
    const section = next[sectionRootIndex]
    if (!section || section.kind !== 'section') return null
    const block = toBlock(extracted)
    if (!block) return null
    const blocks = [...section.blocks]
    const clamped = Math.min(Math.max(0, at), blocks.length)
    blocks.splice(clamped, 0, block)
    next[sectionRootIndex] = { ...section, blocks }
    return next
  }

  // blockExercises
  const exercise = toExercise(extracted)
  if (!exercise) return null
  const container = remapBlockContainer(source, target.container)
  const at = adjustInsertAfterRemove(source, target, target.insertAt)
  const block = getBlock(items, container)
  if (!block || !blockAcceptsExercises(block)) return null
  const exercises = [...exercisesOfBlock(block)]
  const clamped = Math.min(Math.max(0, at), exercises.length)
  exercises.splice(clamped, 0, exercise)
  return setBlock(items, container, withBlockExercises(block, exercises))
}

/** No-op / invalid moves return null. */
export function applyStructureMove(
  structure: WorkoutStructureV2,
  source: StructureDragSource,
  target: StructureDropTarget,
): WorkoutStructureV2 | null {
  // Reject obvious no-ops before mutate
  if (source.kind === 'rootItem' && target.kind === 'root') {
    if (!isMeaningfulRootMove(source.rootIndex, target.insertAt)) return null
  }
  if (
    source.kind === 'sectionBlock' &&
    target.kind === 'section' &&
    source.sectionRootIndex === target.sectionRootIndex
  ) {
    if (!isMeaningfulRootMove(source.blockIndex, target.insertAt)) return null
  }
  if (
    source.kind === 'exercise' &&
    target.kind === 'blockExercises' &&
    sameContainer(source.container, target.container)
  ) {
    if (!isMeaningfulRootMove(source.exerciseIndex, target.insertAt)) {
      return null
    }
  }

  const removed = removeSource(structure.items, source)
  if (!removed) return null
  const inserted = insertExtracted(
    removed.items,
    source,
    target,
    removed.extracted,
  )
  if (!inserted) return null
  return { ...structure, items: inserted }
}

function isMeaningfulRootMove(from: number, insertAt: number): boolean {
  return insertAt !== from && insertAt !== from + 1
}

export function encodeStructureDrag(source: StructureDragSource): string {
  return JSON.stringify(source)
}

export function decodeStructureDrag(
  raw: string | null | undefined,
): StructureDragSource | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StructureDragSource
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function structureDragHasType(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(STRUCTURE_DRAG_MIME)
}
