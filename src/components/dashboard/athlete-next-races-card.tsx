'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  HomeMobileSectionHeader,
} from '@/components/ui/mobile-accordion-body'
import { V2WidgetHeader } from '@/components/ui/v2'
import { typography, v2 } from '@/lib/design-tokens'
import { daysUntil } from '@/lib/utils'
import { cn } from '@/lib/utils'

/** Match WeekSwipePane trackpad / shift+wheel commit tuning. */
const WHEEL_COMMIT_PX = 48
const WHEEL_LOCK_MS = 380
const WHEEL_IDLE_MS = 160

export type AthleteNextRaceItem = {
  id: string
  name: string
  date: Date | string
  location?: string | null
}

const SHELL =
  'overflow-hidden rounded-[0.9rem] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-surface,#fff)] px-4 py-3.5 shadow-[var(--tt-shadow)] md:rounded-[10px] md:p-4'

function splitRaceName(name: string): { lead: string; accent: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return { lead: name, accent: '' }
  return {
    lead: parts.slice(0, -1).join(' '),
    accent: parts[parts.length - 1]!,
  }
}

function formatCountdown(days: number) {
  const dayLabel = days === 1 ? 'Day to go' : 'Days to go'
  if (days < 7) {
    return { primary: String(days), label: dayLabel, weeks: null as string | null }
  }
  const weeks = Math.floor(days / 7)
  const remDays = days % 7
  const weekPart = weeks === 1 ? '1 week' : `${weeks} weeks`
  const dayPart =
    remDays === 0
      ? null
      : remDays === 1
        ? '1 day'
        : `${remDays} days`
  return {
    primary: String(days),
    label: dayLabel,
    weeks: dayPart ? `${weekPart} ${dayPart}` : weekPart,
  }
}

/** Soft resistance past first/last slide so the push feels physical. */
function rubberBand(dx: number, atStart: boolean, atEnd: boolean): number {
  if ((atStart && dx > 0) || (atEnd && dx < 0)) {
    return dx * 0.35
  }
  return dx
}

export function AthleteNextRacesCard({
  races,
  title = 'Upcoming races',
  tone = 'default',
  className,
}: {
  races: AthleteNextRaceItem[]
  /** Section title — defaults to “Upcoming races”. */
  title?: string
  /** `v2` = light panel + eyebrow header for athlete home v2. */
  tone?: 'default' | 'v2'
  className?: string
}) {
  const isV2 = tone === 'v2'
  const shell = isV2
    ? cn(v2.surfaces.widgetLight, 'tt-v2-home-widget')
    : SHELL
  const viewportRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [dragPx, setDragPx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{
    pointerId: number
    startX: number
    lastX: number
    moved: boolean
  } | null>(null)
  const activeRef = useRef(active)
  const countRef = useRef(races.length)
  const goToRef = useRef<(index: number) => void>(() => {})
  const wheelAcc = useRef(0)
  const wheelLockUntil = useRef(0)
  const wheelIdleTimer = useRef<number | null>(null)
  const overscrollPrev = useRef<string | null>(null)
  const canSwipe = races.length > 1

  const goTo = useCallback(
    (index: number) => {
      setActive(Math.min(races.length - 1, Math.max(0, index)))
      setDragPx(0)
    },
    [races.length],
  )

  activeRef.current = active
  countRef.current = races.length
  goToRef.current = goTo

  useEffect(() => {
    const el = viewportRef.current
    if (!el || !canSwipe) return

    const lockHistorySwipe = () => {
      if (overscrollPrev.current != null) return
      overscrollPrev.current = document.documentElement.style.overscrollBehaviorX
      document.documentElement.style.overscrollBehaviorX = 'none'
    }
    const unlockHistorySwipe = () => {
      if (overscrollPrev.current == null) return
      document.documentElement.style.overscrollBehaviorX = overscrollPrev.current
      overscrollPrev.current = null
    }

    const onWheel = (e: WheelEvent) => {
      if (drag.current) return

      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)
      const useShiftY = e.shiftKey && absY > absX
      const dx = useShiftY ? e.deltaY : e.deltaX
      const dominant = Math.abs(dx)

      const horizontalIntent =
        useShiftY || (absX >= 2 && absX >= absY * 0.55)
      if (!horizontalIntent) return

      e.preventDefault()
      e.stopPropagation()

      if (!useShiftY && (dominant < 4 || absX < absY)) return

      const now = Date.now()
      if (now < wheelLockUntil.current) {
        wheelAcc.current = 0
        return
      }

      wheelAcc.current += dx
      if (wheelIdleTimer.current != null) {
        window.clearTimeout(wheelIdleTimer.current)
      }
      wheelIdleTimer.current = window.setTimeout(() => {
        wheelAcc.current = 0
        wheelIdleTimer.current = null
      }, WHEEL_IDLE_MS)

      const index = activeRef.current
      const max = countRef.current - 1
      if (wheelAcc.current >= WHEEL_COMMIT_PX && index < max) {
        wheelAcc.current = 0
        wheelLockUntil.current = now + WHEEL_LOCK_MS
        goToRef.current(index + 1)
      } else if (wheelAcc.current <= -WHEEL_COMMIT_PX && index > 0) {
        wheelAcc.current = 0
        wheelLockUntil.current = now + WHEEL_LOCK_MS
        goToRef.current(index - 1)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerenter', lockHistorySwipe)
    el.addEventListener('pointerleave', unlockHistorySwipe)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerenter', lockHistorySwipe)
      el.removeEventListener('pointerleave', unlockHistorySwipe)
      unlockHistorySwipe()
      if (wheelIdleTimer.current != null) {
        window.clearTimeout(wheelIdleTimer.current)
        wheelIdleTimer.current = null
      }
    }
  }, [canSwipe])

  function go(dir: -1 | 1) {
    goTo(active + dir)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canSwipe) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, a')) return
    const el = viewportRef.current
    if (!el) return
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      lastX: e.clientX,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
    setDragging(true)
    setDragPx(0)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || e.pointerId !== state.pointerId) return
    e.preventDefault()
    const raw = e.clientX - state.startX
    if (Math.abs(raw) > 6) state.moved = true
    state.lastX = e.clientX
    const atStart = active <= 0
    const atEnd = active >= races.length - 1
    setDragPx(rubberBand(raw, atStart, atEnd))
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    const el = viewportRef.current
    if (!state || e.pointerId !== state.pointerId) return
    drag.current = null
    setDragging(false)
    try {
      el?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }

    const width = Math.max(1, el?.clientWidth ?? 1)
    const threshold = Math.min(72, width * 0.18)
    const dx = state.moved ? state.lastX - state.startX : 0

    if (dx > threshold && active > 0) {
      goTo(active - 1)
    } else if (dx < -threshold && active < races.length - 1) {
      goTo(active + 1)
    } else {
      setDragPx(0)
    }
  }

  const raceNav =
    races.length > 1 ? (
      <>
        <button
          type="button"
          className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
          aria-label="Previous race"
          onClick={() => go(-1)}
          disabled={active <= 0}
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
        <span
          className={cn(
            typography.pageHeaderDescription,
            'px-1 text-center tabular-nums text-[var(--tt-ink,#111)]',
          )}
        >
          {active + 1} of {races.length}
        </span>
        <button
          type="button"
          className="rounded p-0.5 text-[var(--tt-ink-faint,#9a9a9a)] enabled:hover:text-[var(--tt-ink,#111)] disabled:opacity-30"
          aria-label="Next race"
          onClick={() => go(1)}
          disabled={active >= races.length - 1}
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </>
    ) : null

  if (races.length === 0) {
    return (
      <section className={cn(shell, className)}>
        {isV2 ? (
          <V2WidgetHeader title={title} />
        ) : (
          <HomeMobileSectionHeader title={title} collapsible={false} />
        )}
        <p className="mt-3 text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
          None scheduled
        </p>
        <Link
          href="/season"
          className={cn(
            'mt-3 inline-block text-[12px] font-medium underline-offset-2 hover:underline',
            isV2
              ? 'text-[var(--tt-v2-accent)]'
              : 'text-[var(--tt-ink,#111)]',
          )}
        >
          Open season →
        </Link>
      </section>
    )
  }

  return (
    <section className={cn(shell, className)}>
      {isV2 ? (
        <V2WidgetHeader title={title} trailing={raceNav} />
      ) : (
        <HomeMobileSectionHeader
          title={title}
          collapsible={false}
          trailing={raceNav}
        />
      )}

      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'relative tt-space-after-title overflow-hidden touch-pan-y',
          canSwipe && 'cursor-grab select-none',
          dragging && 'cursor-grabbing',
        )}
        style={{
          touchAction: canSwipe ? 'pan-y' : undefined,
          overscrollBehaviorX: canSwipe ? 'none' : undefined,
        }}
      >
        <div
          className={cn(
            'flex will-change-transform',
            dragging
              ? 'transition-none'
              : 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          )}
          style={{
            transform: `translate3d(calc(${-active * 100}% + ${dragPx}px), 0, 0)`,
          }}
        >
          {races.map((race, i) => {
            const days = Math.max(0, daysUntil(new Date(race.date)))
            const countdown = formatCountdown(days)
            const { lead, accent } = splitRaceName(race.name)
            const dateLabel = new Date(race.date).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })
            const isActive = i === active
            return (
              <div
                key={race.id}
                className="w-full min-w-full shrink-0"
                aria-hidden={!isActive}
              >
                <div
                  className={cn(
                    'flex items-start justify-between gap-3 px-0.5 transition-[opacity,transform,box-shadow] duration-200',
                    isV2
                      ? 'rounded-[var(--radius-md)]'
                      : 'rounded-[8px]',
                    dragging && isActive && 'scale-[0.985] shadow-[var(--tt-shadow-lift)]',
                    dragging && !isActive && 'opacity-70',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {isV2 ? (
                      <p className="line-clamp-2 min-h-[calc(1.4rem*1.375*2)] text-[1.4rem] font-extrabold leading-snug tracking-tight text-[var(--tt-v2-light-ink)]">
                        <span>{lead} </span>
                        {accent ? (
                          <span className="text-[var(--tt-v2-accent)]">
                            {accent}
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <p
                        className="text-[1.9rem] uppercase leading-none tracking-[-0.01em]"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        <span className="text-[var(--tt-ink,#111)]">{lead} </span>
                        {accent ? (
                          <span className="text-[var(--tt-red,#da2f36)]">{accent}</span>
                        ) : null}
                      </p>
                    )}
                    <p className="mt-1.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                      {dateLabel}
                    </p>
                    {isV2 || race.location ? (
                      <p
                        className={cn(
                          'text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]',
                          isV2 && 'min-h-[1.125rem]',
                        )}
                      >
                        {race.location ?? '\u00a0'}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    {isV2 ? (
                      <>
                        <p className="text-[2.15rem] font-semibold leading-none tracking-tight tabular-nums text-[var(--tt-v2-light-ink)]">
                          {countdown.primary}
                        </p>
                        <p className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--tt-v2-accent)]">
                          {countdown.label}
                        </p>
                      </>
                    ) : (
                      <>
                        <p
                          className="text-5xl uppercase leading-none tracking-[-0.01em] text-[var(--tt-ink,#111)]"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {countdown.primary}
                        </p>
                        <p className="mt-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-red,#da2f36)]">
                          {countdown.label}
                        </p>
                      </>
                    )}
                    {countdown.weeks || isV2 ? (
                      <p
                        className={cn(
                          'mt-0.5 text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]',
                          isV2 && 'min-h-[1rem]',
                        )}
                      >
                        {countdown.weeks ?? '\u00a0'}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {races.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {races.map((race, i) => (
            <button
              key={race.id}
              type="button"
              aria-label={`Show ${race.name}`}
              aria-current={i === active}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === active ? '1rem' : '0.35rem',
                background:
                  i === active
                    ? 'var(--tt-red,#da2f36)'
                    : 'var(--tt-line-strong,#ddd)',
              }}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
