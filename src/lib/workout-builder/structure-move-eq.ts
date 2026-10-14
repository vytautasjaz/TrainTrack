import type {
  BlockContainerRef,
  StructureDragSource,
  StructureDropTarget,
} from '@/lib/workout-builder/structure-move'

function containersEqual(
  a: BlockContainerRef | null | undefined,
  b: BlockContainerRef | null | undefined,
): boolean {
  if (a == null || b == null) return a === b
  if (a.kind !== b.kind) return false
  if (a.kind === 'root' && b.kind === 'root') {
    return a.rootIndex === b.rootIndex
  }
  if (a.kind === 'section' && b.kind === 'section') {
    return (
      a.sectionRootIndex === b.sectionRootIndex &&
      a.blockIndex === b.blockIndex
    )
  }
  return false
}

export function sourcesEqual(
  a: StructureDragSource | null | undefined,
  b: StructureDragSource | null | undefined,
): boolean {
  if (a == null || b == null) return a === b
  if (a.kind !== b.kind) return false
  if (a.kind === 'rootItem' && b.kind === 'rootItem') {
    return a.rootIndex === b.rootIndex
  }
  if (a.kind === 'sectionBlock' && b.kind === 'sectionBlock') {
    return (
      a.sectionRootIndex === b.sectionRootIndex &&
      a.blockIndex === b.blockIndex
    )
  }
  if (a.kind === 'exercise' && b.kind === 'exercise') {
    return (
      a.exerciseIndex === b.exerciseIndex &&
      containersEqual(a.container, b.container)
    )
  }
  return false
}

export function targetsEqual(
  a: StructureDropTarget | null | undefined,
  b: StructureDropTarget | null | undefined,
): boolean {
  if (a == null || b == null) return a === b
  if (a.kind !== b.kind) return false
  if (a.kind === 'root' && b.kind === 'root') {
    return a.insertAt === b.insertAt
  }
  if (a.kind === 'section' && b.kind === 'section') {
    return (
      a.sectionRootIndex === b.sectionRootIndex && a.insertAt === b.insertAt
    )
  }
  if (a.kind === 'blockExercises' && b.kind === 'blockExercises') {
    return (
      a.insertAt === b.insertAt &&
      containersEqual(a.container, b.container)
    )
  }
  return false
}
