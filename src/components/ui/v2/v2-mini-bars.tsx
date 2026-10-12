'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const BAR_MAX_PX = 28
const BAR_MIN_PX = 3
const GROW_MS = 480
const GROW_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function heightsFromValues(values: number[]): number[] {
  const max = Math.max(...values, 0.01)
  return values.map((v) => Math.max(BAR_MIN_PX, (v / max) * BAR_MAX_PX))
}

/** Geometric mini bar chart — each column grows/shrinks to its new height. */
export function V2MiniBars({
  values,
  className,
  tone = 'accent',
}: {
  values: number[]
  className?: string
  tone?: 'accent' | 'muted'
}) {
  const target = heightsFromValues(values)
  const [heights, setHeights] = useState(target)
  const heightsRef = useRef(heights)
  const targetKeyRef = useRef(target.map((h) => h.toFixed(2)).join(','))
  const rafRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const key = target.map((h) => h.toFixed(2)).join(',')
    if (key === targetKeyRef.current) return

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const from = [...heightsRef.current]
    if (from.length !== target.length) {
      targetKeyRef.current = key
      heightsRef.current = target
      setHeights(target)
      return
    }

    targetKeyRef.current = key
    const start = performance.now()
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / GROW_MS)
      const e = easeOutCubic(t)
      const next = from.map((h, i) => h + (target[i]! - h) * e)
      heightsRef.current = next
      setHeights(next)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- target compared via key
  }, [target.map((h) => h.toFixed(2)).join(',')])

  return (
    <div
      className={cn('flex h-7 items-end gap-[2px]', className)}
      aria-hidden
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            'w-[3px] rounded-[var(--radius-xs)]',
            tone === 'accent'
              ? 'bg-[var(--tt-v2-accent)]'
              : 'bg-white/35',
          )}
          style={{ height: h }}
        />
      ))}
    </div>
  )
}

export function V2MiniRing({
  value,
  className,
}: {
  /** 0–1 */
  value: number
  className?: string
}) {
  const r = 12
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <svg
      width={36}
      height={36}
      viewBox="0 0 36 36"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="rgb(255 255 255 / 0.12)"
        strokeWidth="3.5"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--tt-v2-accent)"
        strokeWidth="3.5"
        strokeDasharray={`${pct * c} ${c}`}
        strokeLinecap="butt"
        transform="rotate(-90 18 18)"
        style={{
          transition: `stroke-dasharray ${GROW_MS}ms ${GROW_EASE}`,
        }}
      />
    </svg>
  )
}
