'use client'

import { useRef, useState, type ReactNode } from 'react'
import { ExercisePreview } from '@/components/exercises/exercise-preview'
import { ExerciseDetails } from '@/components/exercises/exercise-details'
import { ExerciseThumbnail } from '@/components/exercises/exercise-thumbnail'

type ExerciseInfoTriggerProps = {
  exerciseId: string
  name: string
  thumbnailUrl?: string | null
  /** Compact thumb in autocomplete rows. */
  size?: 'xs' | 'sm' | 'md'
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Custom trigger instead of thumbnail (e.g. exercise name button). */
  children?: ReactNode
  className?: string
}

/**
 * Level 1 click target → Level 2 preview → Level 3 details.
 * Keeps progressive disclosure outside the workout row chrome.
 */
export function ExerciseInfoTrigger({
  exerciseId,
  name,
  thumbnailUrl,
  size = 'md',
  fetchPriority = 'auto',
  children,
  className,
}: ExerciseInfoTriggerProps) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsId, setDetailsId] = useState(exerciseId)

  function openPreview() {
    setPreviewOpen(true)
  }

  function openDetails(id = exerciseId) {
    setDetailsId(id)
    setPreviewOpen(false)
    setDetailsOpen(true)
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={openPreview}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            openPreview()
          }
        }}
        className={
          className ??
          'inline-flex shrink-0 rounded-[5px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30'
        }
        aria-label={children ? undefined : `Preview ${name}`}
      >
        {children ?? (
          <ExerciseThumbnail
            src={thumbnailUrl}
            alt={name}
            size={size}
            fetchPriority={fetchPriority}
          />
        )}
      </button>

      <ExercisePreview
        exerciseId={exerciseId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        anchorRef={anchorRef}
        onViewDetails={() => openDetails()}
      />

      <ExerciseDetails
        exerciseId={detailsId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onSelectExercise={(id) => openDetails(id)}
      />
    </>
  )
}
