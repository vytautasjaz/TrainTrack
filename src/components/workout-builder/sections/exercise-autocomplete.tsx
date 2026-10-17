'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { ExerciseLibraryDto } from '@/app/actions/exercises'
import { createCustomExercise } from '@/app/actions/exercises'
import { ExerciseThumbnail } from '@/components/exercises/exercise-thumbnail'
import { customExerciseId } from '@/lib/exercises/custom-id'
import { defaultPrescriptionMode } from '@/lib/exercises/prescription'
import { searchExercises } from '@/lib/exercises/search'
import type {
  ExerciseRecord,
  ExerciseSearchContext,
} from '@/lib/exercises/types'
import { cn } from '@/lib/utils'

const VIEWPORT_PAD = 8
const LIST_GAP = 4
const LIST_MAX_H = 240

function dtoToRecord(dto: ExerciseLibraryDto): ExerciseRecord {
  return {
    id: dto.id,
    canonicalName: dto.canonicalName,
    aliases: dto.aliases,
    searchTerms: [],
    category: dto.category,
    movementPattern: dto.movementPattern,
    equipment: dto.equipment,
    primaryMuscles: [],
    secondaryMuscles: [],
    prescriptionTypes: dto.prescriptionTypes,
    modalities: dto.modalities,
    coachingCues: [],
    commonMistakes: [],
    source: dto.source,
    isActive: true,
    usageCount: 0,
    popularity: 0,
  }
}

function thumbnailFor(id: string, library: ExerciseLibraryDto[]): string | null {
  return library.find((e) => e.id === id)?.thumbnailUrl ?? null
}

function metaLine(ex: ExerciseRecord): string {
  const parts: string[] = []
  if (ex.aliases[0]) parts.push(ex.aliases[0])
  if (ex.movementPattern && ex.movementPattern !== 'GENERAL') {
    parts.push(
      ex.movementPattern
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    )
  }
  if (ex.equipment[0]) {
    parts.push(
      ex.equipment[0]
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    )
  }
  return parts.join(' · ')
}

export type ExercisePick = {
  exerciseId: string
  name: string
  prescriptionTypes: string[]
  defaultMode: ReturnType<typeof defaultPrescriptionMode>
}

type ExerciseAutocompleteProps = {
  library: ExerciseLibraryDto[]
  value: string
  onValueChange: (name: string) => void
  onPick: (pick: ExercisePick) => void
  context?: ExerciseSearchContext
  className?: string
  inputClassName?: string
  placeholder?: string
  allowCustom?: boolean
}

type ListPlacement = {
  top: number
  left: number
  width: number
  maxHeight: number
}

/**
 * Portals the suggestion list to body so dialog / section overflow:hidden
 * cannot clip it (same pattern as FlipMenu).
 */
export function ExerciseAutocomplete({
  library,
  value,
  onValueChange,
  onPick,
  context = 'GENERAL',
  className,
  inputClassName,
  placeholder = 'Search exercise…',
  allowCustom = true,
}: ExerciseAutocompleteProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [creating, setCreating] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [placement, setPlacement] = useState<ListPlacement | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const corpus = useMemo(() => library.map(dtoToRecord), [library])

  const hits = useMemo(
    () => searchExercises(corpus, value, { context, limit: 8 }),
    [corpus, value, context],
  )

  const showCreate =
    allowCustom &&
    value.trim().length > 0 &&
    !hits.some(
      (h) =>
        h.exercise.canonicalName.toLowerCase() === value.trim().toLowerCase(),
    )

  const optionCount = hits.length + (showCreate ? 1 : 0)
  const listOpen = open && optionCount > 0

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [value, open])

  useLayoutEffect(() => {
    if (!listOpen || !inputRef.current) {
      setPlacement(null)
      return
    }

    function apply(next: ListPlacement) {
      setPlacement((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.maxHeight === next.maxHeight
          ? prev
          : next,
      )
    }

    function update(event?: Event) {
      if (
        event?.type === 'scroll' &&
        event.target instanceof Node &&
        listRef.current?.contains(event.target)
      ) {
        return
      }
      const input = inputRef.current
      if (!input) return
      const rect = input.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD
      const spaceAbove = rect.top - VIEWPORT_PAD
      const estimatedH = Math.min(
        LIST_MAX_H,
        Math.max(120, optionCount * 40 + 8),
      )
      const openDown =
        spaceBelow >= estimatedH + LIST_GAP || spaceBelow >= spaceAbove
      const maxHeight = Math.max(
        120,
        Math.min(LIST_MAX_H, openDown ? spaceBelow : spaceAbove),
      )
      const usedH = Math.min(estimatedH, maxHeight)
      let left = rect.left
      const width = Math.max(rect.width, 220)
      left = Math.min(left, window.innerWidth - width - VIEWPORT_PAD)
      left = Math.max(VIEWPORT_PAD, left)
      apply({
        left,
        width,
        maxHeight,
        top: openDown
          ? rect.bottom + LIST_GAP
          : rect.top - LIST_GAP - usedH,
      })
    }

    update()
    const frame = requestAnimationFrame(() => update())
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [listOpen, optionCount, value])

  useEffect(() => {
    if (!listOpen) return
    function onDoc(e: MouseEvent) {
      const t = e.target
      if (!(t instanceof Node)) return
      if (rootRef.current?.contains(t)) return
      if (listRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [listOpen])

  function pickHit(index: number) {
    const hit = hits[index]
    if (!hit) return
    onPick({
      exerciseId: hit.exercise.id,
      name: hit.exercise.canonicalName,
      prescriptionTypes: hit.exercise.prescriptionTypes,
      defaultMode: defaultPrescriptionMode(hit.exercise.prescriptionTypes),
    })
    onValueChange(hit.exercise.canonicalName)
    setOpen(false)
  }

  async function pickCustom() {
    const trimmed = value.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      const created = await createCustomExercise({ name: trimmed })
      onPick({
        exerciseId: created.id,
        name: created.canonicalName,
        prescriptionTypes: created.prescriptionTypes,
        defaultMode: defaultPrescriptionMode(created.prescriptionTypes),
      })
      onValueChange(created.canonicalName)
      setOpen(false)
    } catch {
      onPick({
        exerciseId: customExerciseId(trimmed),
        name: trimmed,
        prescriptionTypes: ['REPS', 'WEIGHT', 'RPE'],
        defaultMode: 'REPS',
      })
      onValueChange(trimmed)
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(optionCount - 1, h + 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!open || optionCount === 0) {
        void pickCustom()
        return
      }
      if (highlight < hits.length) pickHit(highlight)
      else void pickCustom()
    }
  }

  const list =
    listOpen && portalReady && placement
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            data-tt-exercise-autocomplete=""
            className="pointer-events-auto fixed z-[320] overflow-y-auto overscroll-contain rounded-[6px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white shadow-lg"
            style={{
              top: placement.top,
              left: placement.left,
              width: placement.width,
              maxHeight: placement.maxHeight,
            }}
            onWheel={(e) => e.stopPropagation()}
          >
            {hits.map((hit, index) => {
              const active = index === highlight
              return (
                <li key={hit.exercise.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-2.5 py-1.5 text-left',
                      active
                        ? 'bg-[var(--tt-v2-light,#F5F6F7)]'
                        : 'hover:bg-[var(--tt-v2-light,#F5F6F7)]',
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickHit(index)}
                  >
                    <ExerciseThumbnail
                      src={thumbnailFor(hit.exercise.id, library)}
                      alt=""
                      size="xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-[var(--tt-ink,#111315)]">
                        {hit.exercise.canonicalName}
                      </span>
                      {metaLine(hit.exercise) ? (
                        <span className="block truncate text-[10px] text-[var(--tt-ink-faint,#9ca3af)]">
                          {metaLine(hit.exercise)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
            {showCreate ? (
              <li role="option" aria-selected={highlight === hits.length}>
                <button
                  type="button"
                  disabled={creating}
                  className={cn(
                    'flex w-full px-2.5 py-1.5 text-left text-[12px] text-[var(--tt-ink-soft,#6b7280)]',
                    highlight === hits.length
                      ? 'bg-[var(--tt-v2-light,#F5F6F7)]'
                      : 'hover:bg-[var(--tt-v2-light,#F5F6F7)]',
                  )}
                  onMouseEnter={() => setHighlight(hits.length)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void pickCustom()}
                >
                  {creating ? 'Creating…' : `+ Create “${value.trim()}”`}
                </button>
              </li>
            ) : null}
            <li
              className="border-t border-[var(--tt-v2-light-panel-line,#E3E6E9)] px-2.5 py-1.5 text-[9px] leading-snug text-[var(--tt-ink-faint,#9ca3af)]"
              aria-hidden
            >
              Exercise data by{' '}
              <a
                href="https://repdb.co"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-current/40 underline-offset-2"
                onMouseDown={(e) => e.preventDefault()}
              >
                RepDB
              </a>
            </li>
          </ul>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <input
        ref={inputRef}
        value={value}
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(e) => {
          onValueChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
      />
      {list}
    </div>
  )
}
