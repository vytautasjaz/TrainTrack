'use client'

import { useEffect, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import type { ExerciseMediaItem } from '@/lib/exercises/types'
import {
  exercisePoseKind,
  exercisePoseSequence,
  type ExercisePoseKind,
} from '@/lib/exercises/media'
import type { ExerciseMedia } from '@/lib/exercises/types'
import { cn } from '@/lib/utils'

const POSE_LABEL: Record<ExercisePoseKind, string> = {
  start: 'Start',
  peak: 'Finish',
  main: 'Hold',
  other: 'Pose',
}

const CYCLE_MS = 1400

type ExercisePoseSequenceProps = {
  media: ExerciseMedia | null
  alt: string
  className?: string
  /** Auto-flip between start/finish (preview). */
  autoPlay?: boolean
}

/**
 * Shows start → finish poses so the movement is readable in the L2 preview.
 * Tapping pauses/resumes; with one image falls back to a static frame.
 */
export function ExercisePoseSequence({
  media,
  alt,
  className,
  autoPlay = true,
}: ExercisePoseSequenceProps) {
  const frames = exercisePoseSequence(media)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setIndex(0)
    setFailed({})
    setPaused(false)
  }, [media])

  useEffect(() => {
    if (!autoPlay || paused || frames.length < 2) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % frames.length)
    }, CYCLE_MS)
    return () => window.clearInterval(id)
  }, [autoPlay, paused, frames.length])

  if (frames.length === 0) {
    return (
      <div
        className={cn(
          'flex aspect-square w-full items-center justify-center bg-[var(--tt-v2-light,#F5F6F7)] text-[var(--tt-ink-faint,#9ca3af)]',
          className,
        )}
      >
        <Dumbbell className="h-8 w-8" strokeWidth={1.5} aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    )
  }

  const active = frames[index] ?? frames[0]!
  const activeFailed = Boolean(failed[active.url])
  const pose = exercisePoseKind(active)
  const canCycle = frames.length > 1

  return (
    <div
      className={cn(
        'relative flex aspect-square w-full flex-col overflow-hidden bg-[var(--tt-v2-light,#F5F6F7)]',
        className,
      )}
    >
      <button
        type="button"
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onClick={() => {
          if (!canCycle) return
          setPaused((p) => !p)
          setIndex((i) => (i + 1) % frames.length)
        }}
        aria-label={
          canCycle
            ? paused
              ? `Show next pose of ${alt}`
              : `Pause pose animation of ${alt}`
            : alt
        }
      >
        {!activeFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- provider hotlinks
          <img
            key={active.url}
            src={active.url}
            alt={`${alt} — ${POSE_LABEL[pose]}`}
            className="max-h-full max-w-full object-contain transition-opacity duration-300"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            onError={() =>
              setFailed((prev) => ({ ...prev, [active.url]: true }))
            }
          />
        ) : (
          <Dumbbell
            className="h-8 w-8 text-[var(--tt-ink-faint,#9ca3af)]"
            strokeWidth={1.5}
            aria-hidden
          />
        )}
      </button>

      {canCycle ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/45 to-transparent px-2.5 pb-2 pt-6">
          <span className="rounded-[4px] bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {POSE_LABEL[pose]}
          </span>
          <div className="flex items-center gap-1">
            {frames.map((frame, i) => (
              <span
                key={frame.url}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  i === index ? 'bg-white' : 'bg-white/40',
                )}
                aria-hidden
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Start | Finish side-by-side. Single pose stays compact so copy stays above the fold. */
export function ExercisePosePair({
  media,
  alt,
  className,
}: {
  media: ExerciseMedia | null
  alt: string
  className?: string
}) {
  const frames = exercisePoseSequence(media)
  if (frames.length === 0) {
    return (
      <div
        className={cn(
          'mx-auto flex h-36 w-36 items-center justify-center rounded-[8px] bg-[var(--tt-v2-light,#F5F6F7)]',
          className,
        )}
      >
        <Dumbbell className="h-8 w-8 text-[var(--tt-ink-faint,#9ca3af)]" />
      </div>
    )
  }
  if (frames.length === 1) {
    const only = frames[0]!
    return (
      <div
        className={cn(
          'mx-auto flex h-40 w-40 max-w-[40%] items-center justify-center overflow-hidden rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-[var(--tt-v2-light,#F5F6F7)] sm:h-44 sm:w-44',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={only.url}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          loading="eager"
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-[var(--tt-v2-light-panel-line,#E3E6E9)]',
        className,
      )}
    >
      {frames.map((frame) => {
        const pose = exercisePoseKind(frame)
        return (
          <div
            key={frame.url}
            className="relative flex aspect-square max-h-[11.5rem] items-center justify-center bg-[var(--tt-v2-light,#F5F6F7)] sm:max-h-[13rem]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frame.url}
              alt={`${alt} — ${POSE_LABEL[pose]}`}
              className="max-h-full max-w-full object-contain"
              loading="eager"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-1.5 left-1.5 rounded-[3px] bg-black/55 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
              {POSE_LABEL[pose]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
