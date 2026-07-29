import type { WorkoutBlock, WorkoutSection, WorkoutStructure } from './types'
import { normalizeOrders } from './utils'

export type ListedBlock = {
  block: WorkoutBlock
  section: WorkoutSection
}

export function flattenStructure(structure: WorkoutStructure): ListedBlock[] {
  const items: ListedBlock[] = []
  for (const block of structure.warmup) {
    items.push({ block, section: 'warmup' })
  }
  for (const block of structure.mainSet) {
    items.push({ block, section: 'mainSet' })
  }
  for (const block of structure.cooldown) {
    items.push({ block, section: 'cooldown' })
  }
  return items
}

export function unflattenBlocks(items: ListedBlock[]): WorkoutStructure {
  // Flat block list only — warmup/mainSet/cooldown buckets are legacy storage.
  const mainSet = items.map(({ block }) => block)
  return {
    warmup: [],
    mainSet: normalizeOrders(mainSet),
    cooldown: [],
  }
}

export function updateListedBlock(
  items: ListedBlock[],
  flatIndex: number,
  block: WorkoutBlock,
): ListedBlock[] {
  const next = [...items]
  next[flatIndex] = { ...next[flatIndex], block }
  return next
}

export function moveListedBlock(items: ListedBlock[], from: number, to: number): ListedBlock[] {
  if (to < 0 || to >= items.length || from === to) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function removeListedBlock(items: ListedBlock[], flatIndex: number): ListedBlock[] {
  return items.filter((_, i) => i !== flatIndex)
}

export function insertListedBlock(
  items: ListedBlock[],
  flatIndex: number,
  entry: ListedBlock,
): ListedBlock[] {
  const next = [...items]
  next.splice(flatIndex, 0, entry)
  return next
}

export function appendListedBlock(items: ListedBlock[], entry: ListedBlock): ListedBlock[] {
  return [...items, entry]
}
