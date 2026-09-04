'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function sameArray(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Interpolate a number array toward `target` (arrow week change).
 * When `from` is set, the first painted frame is always `from` — never flashes `target`.
 */
export function useMorphArray(
  target: number[],
  from: number[] | null,
  durationMs = 480,
): number[] {
  const [display, setDisplay] = useState(() =>
    from && from.length === target.length ? from : target,
  )
  const displayRef = useRef(display)
  const rafRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (!from || from.length !== target.length) {
      if (!sameArray(displayRef.current, target)) {
        displayRef.current = target
        setDisplay(target)
      }
      return
    }

    // Paint `from` immediately (before browser paint), then ease to target.
    displayRef.current = from
    setDisplay(from)

    const startVals = [...from]
    const endVals = [...target]
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const e = easeOutCubic(t)
      const next = startVals.map((v, i) => v + (endVals[i]! - v) * e)
      displayRef.current = next
      setDisplay(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // Intentional: compare by value so new array identities don't restart the morph.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- from/target joined below
  }, [from?.join(','), target.join(','), durationMs])

  return display
}

/** Progress bar that can morph from a previous width (arrow nav) or snap (swipe). */
export function MorphProgressBar({
  pct,
  morphFrom,
  className,
}: {
  pct: number
  morphFrom?: number | null
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    if (morphFrom != null && morphFrom !== pct) {
      el.style.transition = 'none'
      el.style.width = `${morphFrom}%`
      void el.offsetWidth
      el.style.transition = 'width 500ms cubic-bezier(0.22, 1, 0.36, 1)'
      el.style.width = `${pct}%`
      return
    }

    el.style.transition = 'none'
    el.style.width = `${pct}%`
  }, [pct, morphFrom])

  return (
    <div
      ref={ref}
      className={cn('h-full rounded-full', className)}
      style={{ width: `${pct}%` }}
    />
  )
}
