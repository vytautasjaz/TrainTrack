'use client'

import { useEffect, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

type ExerciseThumbnailProps = {
  src?: string | null
  alt: string
  size?: 'xs' | 'sm' | 'md'
  className?: string
  onClick?: () => void
  /**
   * Eager by default — `lazy` inside dialog/overflow panels often waits for
   * a scroll before the browser fetches (nested IntersectionObserver quirk).
   */
  loading?: 'eager' | 'lazy'
  /** Hint for above-the-fold thumbs in workout preview lists. */
  fetchPriority?: 'high' | 'low' | 'auto'
}

const SIZE = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
} as const

const ICON = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
} as const

/**
 * Compact static exercise image. Never shows a broken image —
 * falls back to a neutral icon placeholder.
 */
export function ExerciseThumbnail({
  src,
  alt,
  size = 'md',
  className,
  onClick,
  loading = 'eager',
  fetchPriority = 'auto',
}: ExerciseThumbnailProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const showImage = Boolean(src) && !failed

  const inner = showImage ? (
    // eslint-disable-next-line @next/next/no-img-element -- external provider URLs
    <img
      src={src!}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className="flex h-full w-full items-center justify-center bg-[var(--tt-v2-light,#F5F6F7)] text-[var(--tt-ink-faint,#9ca3af)]"
      aria-hidden={!onClick}
    >
      <Dumbbell className={ICON[size]} strokeWidth={1.75} />
    </span>
  )

  const box = cn(
    'inline-flex shrink-0 overflow-hidden rounded-[5px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white',
    SIZE[size],
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClick()
        }}
        className={cn(box, 'transition hover:border-[var(--tt-ink,#111)]/25')}
        aria-label={`Preview ${alt}`}
      >
        {inner}
      </button>
    )
  }

  return (
    <span className={box} aria-hidden={alt === ''}>
      {inner}
    </span>
  )
}
