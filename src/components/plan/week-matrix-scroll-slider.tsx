'use client'

import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
} from 'react'
import type { PlanDay } from '@/lib/plan-week'
import { cn } from '@/lib/utils'

type WeekMatrixScrollSliderProps = {
  scrollRef: RefObject<HTMLDivElement | null>
  days: PlanDay[]
  className?: string
}

/**
 * Portrait Week chrome: visible scrubber so users know the matrix scrolls
 * sideways and roughly where they are in Mon–Sun.
 */
export function WeekMatrixScrollSlider({
  scrollRef,
  days,
  className,
}: WeekMatrixScrollSliderProps) {
  const [progress, setProgress] = useState({ left: 0, max: 0, ratio: 0 })

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const left = el.scrollLeft
    setProgress({
      left,
      max,
      ratio: max > 0 ? left / max : 0,
    })
  }, [scrollRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [scrollRef, measure, days])

  if (progress.max <= 1) return null

  const thumbPct = Math.min(
    100,
    Math.max(12, (scrollRef.current!.clientWidth / scrollRef.current!.scrollWidth) * 100),
  )
  const thumbLeft = progress.ratio * (100 - thumbPct)

  function onTrackPointer(clientX: number, track: HTMLElement) {
    const el = scrollRef.current
    if (!el || progress.max <= 0) return
    const rect = track.getBoundingClientRect()
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width)
    const usable = Math.max(1, rect.width * (1 - thumbPct / 100))
    const nextRatio = Math.min(1, Math.max(0, x / usable))
    el.scrollLeft = nextRatio * progress.max
  }

  return (
    <div
      className={cn(
        'tt-week-matrix-scroll-slider portrait:max-lg:block landscape:max-lg:hidden lg:hidden',
        className,
      )}
    >
      <div
        role="slider"
        aria-label="Scroll week days"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.ratio * 100)}
        tabIndex={0}
        className="relative mt-2 h-3 cursor-pointer touch-none rounded-full bg-[var(--tt-line,#ebebeb)]"
        onPointerDown={(e) => {
          const track = e.currentTarget
          track.setPointerCapture(e.pointerId)
          onTrackPointer(e.clientX, track)
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
          onTrackPointer(e.clientX, e.currentTarget)
        }}
        onKeyDown={(e) => {
          const el = scrollRef.current
          if (!el || progress.max <= 0) return
          const step = el.clientWidth * 0.35
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            el.scrollLeft = Math.min(progress.max, el.scrollLeft + step)
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            el.scrollLeft = Math.max(0, el.scrollLeft - step)
          } else if (e.key === 'Home') {
            e.preventDefault()
            el.scrollLeft = 0
          } else if (e.key === 'End') {
            e.preventDefault()
            el.scrollLeft = progress.max
          }
        }}
      >
        <div
          className="absolute top-0.5 h-2 rounded-full bg-[var(--tt-ink,#111)]"
          style={{ left: `${thumbLeft}%`, width: `${thumbPct}%` }}
        />
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-0.5 px-0.5">
        {days.map((day) => (
          <span
            key={day.dateKey}
            className={cn(
              'text-center text-[9px] font-semibold uppercase tracking-[0.04em]',
              day.isToday
                ? 'text-[var(--color-brand,#da2f36)]'
                : 'text-muted-foreground/70',
            )}
          >
            {day.dayLabel.slice(0, 1)}
          </span>
        ))}
      </div>
    </div>
  )
}
