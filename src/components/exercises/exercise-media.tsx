'use client'

import { useEffect, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import type { ExerciseMediaItem } from '@/lib/exercises/types'
import { cn } from '@/lib/utils'

type ExerciseMediaProps = {
  item: ExerciseMediaItem | null
  alt: string
  className?: string
  /** Prefer GIF/video animation in preview/details; list thumbs stay static via ExerciseThumbnail. */
  animated?: boolean
}

export function ExerciseMedia({
  item,
  alt,
  className,
  animated = true,
}: ExerciseMediaProps) {
  const [failed, setFailed] = useState(false)
  const src = item?.url

  useEffect(() => {
    setFailed(false)
  }, [src])

  const show = Boolean(src) && !failed

  if (!show) {
    return (
      <div
        className={cn(
          'flex aspect-square w-full items-center justify-center rounded-[8px] bg-[var(--tt-v2-light,#F5F6F7)] text-[var(--tt-ink-faint,#9ca3af)]',
          className,
        )}
      >
        <Dumbbell className="h-8 w-8" strokeWidth={1.5} aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        // Square frame (RepDB 512²); object-contain so full art is never cropped.
        'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-[var(--tt-v2-light,#F5F6F7)]',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- provider hotlinks */}
      <img
        src={src!}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        // Always eager in modals/overflow panels — lazy waits for scroll there.
        loading="eager"
        decoding="async"
        fetchPriority={animated ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {item?.type === 'GIF' ? (
        <span className="absolute left-2 top-2 rounded-[4px] bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          GIF
        </span>
      ) : null}
    </div>
  )
}
