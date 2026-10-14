'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import type { WorkoutStructureV2 } from '@/lib/workout-builder/structure-v2'
import {
  STRUCTURE_DRAG_MIME,
  applyStructureMove,
  encodeStructureDrag,
  structureDragHasType,
  type StructureDragSource,
  type StructureDropTarget,
} from '@/lib/workout-builder/structure-move'
import { sourcesEqual, targetsEqual } from '@/lib/workout-builder/structure-move-eq'

type StructureDndContextValue = {
  active: StructureDragSource | null
  highlight: StructureDropTarget | null
  beginDrag: (source: StructureDragSource, e: DragEvent) => void
  endDrag: () => void
  setHighlight: (target: StructureDropTarget | null) => void
  dropOn: (target: StructureDropTarget, e: DragEvent) => void
  isDraggingType: (
    e: DragEvent,
    kinds: StructureDragSource['kind'][],
  ) => boolean
}

const StructureDndContext = createContext<StructureDndContextValue | null>(
  null,
)

export function StructureDndProvider({
  structure,
  onChange,
  children,
}: {
  structure: WorkoutStructureV2
  onChange: (next: WorkoutStructureV2) => void
  children: ReactNode
}) {
  const [active, setActive] = useState<StructureDragSource | null>(null)
  const [highlight, setHighlightState] = useState<StructureDropTarget | null>(
    null,
  )
  const activeRef = useRef<StructureDragSource | null>(null)
  const highlightRef = useRef<StructureDropTarget | null>(null)
  const structureRef = useRef(structure)
  structureRef.current = structure

  const setHighlight = useCallback((target: StructureDropTarget | null) => {
    if (targetsEqual(highlightRef.current, target)) return
    highlightRef.current = target
    setHighlightState(target)
  }, [])

  const endDrag = useCallback(() => {
    activeRef.current = null
    highlightRef.current = null
    setActive(null)
    setHighlightState(null)
  }, [])

  const beginDrag = useCallback((source: StructureDragSource, e: DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(STRUCTURE_DRAG_MIME, encodeStructureDrag(source))
    e.dataTransfer.setData('text/plain', source.kind)
    activeRef.current = source
    setActive(source)
  }, [])

  const dropOn = useCallback(
    (target: StructureDropTarget, e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const source = activeRef.current
      if (!source) {
        endDrag()
        return
      }
      const next = applyStructureMove(structureRef.current, source, target)
      if (next) onChange(next)
      endDrag()
    },
    [endDrag, onChange],
  )

  const isDraggingType = useCallback(
    (e: DragEvent, kinds: StructureDragSource['kind'][]) => {
      const source = activeRef.current
      if (source) return kinds.includes(source.kind)
      if (!structureDragHasType(e.dataTransfer)) return false
      // MIME present but source unknown — accept listed kinds cautiously
      return kinds.length > 0
    },
    [],
  )

  const value = useMemo(
    () => ({
      active,
      highlight,
      beginDrag,
      endDrag,
      setHighlight,
      dropOn,
      isDraggingType,
    }),
    [
      active,
      highlight,
      beginDrag,
      endDrag,
      setHighlight,
      dropOn,
      isDraggingType,
    ],
  )

  return (
    <StructureDndContext.Provider value={value}>
      {children}
    </StructureDndContext.Provider>
  )
}

export function useStructureDnd(): StructureDndContextValue {
  const ctx = useContext(StructureDndContext)
  if (!ctx) {
    throw new Error('useStructureDnd must be used within StructureDndProvider')
  }
  return ctx
}

export function useStructureDndOptional(): StructureDndContextValue | null {
  return useContext(StructureDndContext)
}

export function sourcesActiveEqual(
  a: StructureDragSource | null,
  b: StructureDragSource | null,
): boolean {
  return sourcesEqual(a, b)
}
