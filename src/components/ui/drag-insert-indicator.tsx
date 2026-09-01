'use client'

import type { DragEvent } from 'react'
import { cn } from '@/lib/utils'

/** Horizontal line shown between items while dragging to reorder. */
export function DragInsertIndicator({
  show,
  className,
}: {
  show: boolean
  className?: string
}) {
  if (!show) return null
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 -translate-y-1/2',
        className,
      )}
    >
      <div className="h-0.5 rounded-full bg-[var(--tt-ink,#111111)] shadow-[0_0_0_1px_rgba(255,255,255,0.65)]" />
    </div>
  )
}

/** Vertical line between chart block regions while dragging. */
export function DragInsertIndicatorVertical({
  show,
  className,
}: {
  show: boolean
  className?: string
}) {
  if (!show) return null
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 left-0 z-20 -translate-x-1/2',
        className,
      )}
    >
      <div className="h-full w-0.5 rounded-full bg-[var(--tt-ink,#111111)] shadow-[0_0_0_1px_rgba(255,255,255,0.65)]" />
    </div>
  )
}

/** Insert slot (0…length) from pointer Y within a row. */
export function insertIndexFromDragEvent(
  e: DragEvent<HTMLElement>,
  index: number,
): number {
  const rect = e.currentTarget.getBoundingClientRect()
  return e.clientY < rect.top + rect.height / 2 ? index : index + 1
}

/** Insert slot (0…length) from pointer X within a chart region. */
export function insertIndexFromDragEventX(
  e: DragEvent<HTMLElement>,
  index: number,
): number {
  const rect = e.currentTarget.getBoundingClientRect()
  return e.clientX < rect.left + rect.width / 2 ? index : index + 1
}

/** True when dropping at `insertAt` would actually move `from`. */
export function isMeaningfulInsert(from: number, insertAt: number): boolean {
  return insertAt !== from && insertAt !== from + 1
}

/** Convert insert slot (before removal) to destination index after splice. */
export function targetIndexFromInsert(from: number, insertAt: number): number {
  return from < insertAt ? insertAt - 1 : insertAt
}

/** HTML5 DnD payload for dragging an add-block chip onto the workout list. */
export const WORKOUT_ADD_BLOCK_MIME = 'application/x-tt-add-block'

const ADD_BLOCK_TEXT_PREFIX = 'tt-add:'

export function encodeAddBlockDragData(kind: string): string {
  return `${ADD_BLOCK_TEXT_PREFIX}${kind}`
}

export function decodeAddBlockDragData(
  dataTransfer: DataTransfer,
): string | null {
  const mime = dataTransfer.getData(WORKOUT_ADD_BLOCK_MIME).trim()
  if (mime) return mime
  const text = dataTransfer.getData('text/plain').trim()
  if (text.startsWith(ADD_BLOCK_TEXT_PREFIX)) {
    return text.slice(ADD_BLOCK_TEXT_PREFIX.length) || null
  }
  return null
}
