'use client'

import { useEffect, useMemo, useState } from 'react'
import { getExerciseThumbnailMap } from '@/app/actions/exercises'
import { ExerciseInfoTrigger } from '@/components/exercises/exercise-info-trigger'
import {
  readThumbnailCache,
  warmThumbnailUrls,
  writeThumbnailCache,
} from '@/lib/exercises/thumbnail-client-cache'
import {
  SECTION_TYPE_LABELS,
  type ExerciseItem,
  type WorkoutBlockV2,
  type WorkoutStructureV2,
} from '@/lib/workout-builder/structure-v2'
import { formatBlockV2Title } from '@/lib/workout-builder/structure-compat'
import { cn } from '@/lib/utils'

type StructureV2AthletePreviewProps = {
  structure: WorkoutStructureV2
  compactHero?: boolean
  className?: string
  /** From getPlanWorkoutDetail — paint icons without a second fetch. */
  initialThumbnails?: Record<string, string | null>
}

function exercisesOf(block: WorkoutBlockV2): ExerciseItem[] {
  if ('exercises' in block && Array.isArray(block.exercises) && block.exercises.length) {
    return block.exercises
  }
  if ('exercise' in block && block.exercise) return [block.exercise]
  return []
}

function prescriptionLine(item: ExerciseItem): string {
  const bits: string[] = []
  const p = item.prescription
  if (p && p.mode !== 'UNTIMED' && p.value != null) {
    if (p.mode === 'REPS') bits.push(`${p.value} reps`)
    else if (p.mode === 'TIME') bits.push(`${p.value}${p.unit ?? 'sec'}`)
    else if (p.mode === 'DISTANCE') bits.push(`${p.value}${p.unit ?? 'm'}`)
    else if (p.mode === 'CALORIES') bits.push(`${p.value} cal`)
    else if (p.mode === 'WEIGHT') bits.push(`${p.value}${p.unit ?? 'kg'}`)
  }
  const load = item.load
  if (load) {
    if (load.type === 'BODYWEIGHT') bits.push('BW')
    else if (load.type === 'RPE' && load.value != null) bits.push(`RPE ${load.value}`)
    else if (load.type === 'PERCENT_1RM' && load.value != null)
      bits.push(`${load.value}%`)
    else if (load.value != null) bits.push(`${load.value}${load.unit ?? 'kg'}`)
  }
  return bits.join(' · ')
}

function isLabeledBlock(block: WorkoutBlockV2): boolean {
  return block.type !== 'EXERCISE' && block.type !== 'CONTINUOUS'
}

function ExercisePreviewRow({
  item,
  thumbnailUrl,
}: {
  item: ExerciseItem
  thumbnailUrl?: string | null
}) {
  const name = item.name?.trim() || item.exerciseId
  const detail = prescriptionLine(item)
  const order = item.order?.trim()

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {item.exerciseId ? (
        <ExerciseInfoTrigger
          exerciseId={item.exerciseId}
          name={name}
          thumbnailUrl={thumbnailUrl}
          size="sm"
          fetchPriority="high"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--tt-ink,#111315)]">
          {order ? (
            <span className="mr-1.5 text-[11px] font-semibold text-[var(--tt-ink-faint,#9ca3af)]">
              {order}
            </span>
          ) : null}
          {name}
        </p>
        {detail ? (
          <p className="mt-0.5 text-[12px] tabular-nums text-[var(--tt-ink-soft,#6b7280)]">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function BlockPreview({
  block,
  thumbnails,
  padX,
  showBlockBreak,
}: {
  block: WorkoutBlockV2
  thumbnails: Record<string, string | null>
  padX: string
  /** Inset hairline before a named block (EMOM / AMRAP / …). */
  showBlockBreak: boolean
}) {
  const exercises = exercisesOf(block)
  const title = formatBlockV2Title(block)

  if (block.type === 'FREE_TEXT') {
    const text = block.text?.trim()
    if (!text) return null
    return (
      <div className={cn(padX, showBlockBreak && 'pt-2')}>
        {showBlockBreak ? <BlockBreak /> : null}
        <p className="whitespace-pre-wrap py-1.5 text-[13px] leading-relaxed text-[var(--tt-ink,#111315)]">
          {text}
        </p>
      </div>
    )
  }

  if (block.type === 'REST') {
    return (
      <div className={cn(padX, showBlockBreak && 'pt-2')}>
        {showBlockBreak ? <BlockBreak /> : null}
        <p className="py-1.5 text-[13px] font-medium tabular-nums text-[var(--tt-ink-soft,#6b7280)]">
          {title}
        </p>
      </div>
    )
  }

  const showLabel = isLabeledBlock(block)

  return (
    <div className={cn(padX, showBlockBreak && 'pt-2')}>
      {showBlockBreak ? <BlockBreak /> : null}
      {showLabel ? (
        <p className="pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-soft,#6b7280)]">
          {title}
        </p>
      ) : null}
      {exercises.length > 0 ? (
        <div>
          {exercises.map((item, index) => (
            <ExercisePreviewRow
              key={`${item.exerciseId}-${item.order ?? index}`}
              item={item}
              thumbnailUrl={thumbnails[item.exerciseId] ?? null}
            />
          ))}
        </div>
      ) : (
        <p className="py-1 text-[12px] text-[var(--tt-ink-faint,#9ca3af)]">
          No exercises
        </p>
      )}
      {block.notes?.trim() ? (
        <p className="mt-1 whitespace-pre-wrap text-[12px] text-[var(--tt-ink-soft,#6b7280)]">
          {block.notes.trim()}
        </p>
      ) : null}
    </div>
  )
}

/** Short inset hairline — no icon, shorter than section rules. */
function BlockBreak() {
  return (
    <div
      className="mb-2 mr-4 h-px bg-[var(--tt-v2-light-panel-line,#E3E6E9)]"
      aria-hidden
    />
  )
}

function seedThumbnails(
  ids: string[],
  initial?: Record<string, string | null>,
): Record<string, string | null> {
  if (initial && Object.keys(initial).length > 0) {
    writeThumbnailCache(initial)
  }
  const { known } = readThumbnailCache(ids)
  if (initial) {
    for (const [id, url] of Object.entries(initial)) {
      known[id] = url
    }
  }
  return known
}

/**
 * Athlete / editor Preview rendering for structure v2 — exercise rows with
 * thumbnails and progressive info (Preview → Details).
 */
export function StructureV2AthletePreview({
  structure,
  compactHero = false,
  className,
  initialThumbnails,
}: StructureV2AthletePreviewProps) {
  const sections = useMemo(() => {
    return structure.items.flatMap((item) => {
      if (item.kind === 'block') {
        return [
          {
            id: item.block.id,
            title: null as string | null,
            blocks: [item.block],
          },
        ]
      }
      if (item.blocks.length === 0) return []
      return [
        {
          id: item.id,
          title: item.name?.trim() || SECTION_TYPE_LABELS[item.type] || item.type,
          blocks: item.blocks,
        },
      ]
    })
  }, [structure.items])

  const exerciseIds = useMemo(() => {
    const ids: string[] = []
    for (const section of sections) {
      for (const block of section.blocks) {
        for (const item of exercisesOf(block)) {
          if (item.exerciseId) ids.push(item.exerciseId)
        }
      }
    }
    return [...new Set(ids)].sort()
  }, [sections])

  const exerciseIdsKey = exerciseIds.join('\0')

  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>(
    () => seedThumbnails(exerciseIds, initialThumbnails),
  )

  // Keep in sync when opening another workout / prefetch completes.
  useEffect(() => {
    if (!initialThumbnails) return
    writeThumbnailCache(initialThumbnails)
    setThumbnails((prev) => ({ ...prev, ...initialThumbnails }))
    warmThumbnailUrls(Object.values(initialThumbnails))
  }, [initialThumbnails])

  useEffect(() => {
    const ids = exerciseIdsKey ? exerciseIdsKey.split('\0') : []
    if (ids.length === 0) {
      setThumbnails({})
      return
    }

    const { known, missing } = readThumbnailCache(ids)
    if (Object.keys(known).length > 0) {
      setThumbnails((prev) => ({ ...known, ...prev }))
      warmThumbnailUrls(Object.values(known))
    }
    if (missing.length === 0) return

    let cancelled = false
    void getExerciseThumbnailMap(missing)
      .then((map) => {
        if (cancelled) return
        writeThumbnailCache(map)
        warmThumbnailUrls(Object.values(map))
        setThumbnails((prev) => ({ ...prev, ...map }))
      })
      .catch(() => {
        /* keep whatever we already have */
      })
    return () => {
      cancelled = true
    }
  }, [exerciseIdsKey])

  if (sections.length === 0) return null

  const padX = compactHero ? 'px-2.5' : 'px-5'

  return (
    <div className={cn(className)}>
      {sections.map((section, sectionIndex) => {
        const isNamedSection = Boolean(section.title)

        return (
          <section
            key={section.id}
            className={cn(
              sectionIndex > 0 &&
                'border-t border-[var(--tt-v2-light-panel-line,#E3E6E9)]',
              isNamedSection ? 'pb-3' : 'py-1',
            )}
          >
            {isNamedSection ? (
              <p
                className={cn(
                  'pb-1 pt-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--tt-ink,#111315)]',
                  padX,
                )}
              >
                {section.title}
              </p>
            ) : null}

            <div>
              {section.blocks.map((block, blockIndex) => {
                const prev = section.blocks[blockIndex - 1]
                // Break only when a named block starts (or after one) — plain
                // exercise rows stay as one continuous list.
                const showBlockBreak =
                  isNamedSection &&
                  blockIndex > 0 &&
                  (isLabeledBlock(block) || (prev != null && isLabeledBlock(prev)))

                return (
                  <BlockPreview
                    key={block.id}
                    block={block}
                    thumbnails={thumbnails}
                    padX={padX}
                    showBlockBreak={showBlockBreak}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
