'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  HomeMobileSectionHeader,
} from '@/components/ui/mobile-accordion-body'
import { daysUntil } from '@/lib/utils'
import { cn } from '@/lib/utils'

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
  return {
    primary: String(days),
    label: dayLabel,
    weeks: weeks === 1 ? '≈ 1 week' : `≈ ${weeks} weeks`,
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
  className,
}: {
  races: AthleteNextRaceItem[]
  className?: string
}) {
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

  const goTo = useCallback(
    (index: number) => {
      setActive(Math.min(races.length - 1, Math.max(0, index)))
      setDragPx(0)
    },
    [races.length],
  )

  function go(dir: -1 | 1) {
    goTo(active + dir)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (races.length < 2) return
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

  if (races.length === 0) {
    return (
      <section className={cn(SHELL, className)}>
        <HomeMobileSectionHeader title="Upcoming races" collapsible={false} />
        <p className="mt-3 text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
          None scheduled
        </p>
        <Link
          href="/season"
          className="mt-3 inline-block text-[12px] font-medium text-[var(--tt-ink,#111)] underline-offset-2 hover:underline"
        >
          Open season →
        </Link>
      </section>
    )
  }

  return (
    <section className={cn(SHELL, className)}>
      <HomeMobileSectionHeader
        title="Upcoming races"
        collapsible={false}
        subtitle={`${active + 1} of ${races.length}`}
        trailing={
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
        }
      />

      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'relative mt-3 overflow-hidden touch-pan-y',
          races.length > 1 && 'cursor-grab select-none',
          dragging && 'cursor-grabbing',
        )}
        style={{ touchAction: races.length > 1 ? 'pan-y' : undefined }}
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
                      'flex items-end justify-between gap-3 rounded-[8px] px-0.5 transition-[opacity,transform,box-shadow] duration-200',
                      dragging && isActive && 'scale-[0.985] shadow-[var(--tt-shadow-lift)]',
                      dragging && !isActive && 'opacity-70',
                    )}
                  >
                    <div className="min-w-0">
                      <p
                        className="text-[1.9rem] uppercase leading-none tracking-[-0.01em]"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        <span className="text-[var(--tt-ink,#111)]">{lead} </span>
                        {accent ? (
                          <span className="text-[var(--tt-red,#da2f36)]">{accent}</span>
                        ) : null}
                      </p>
                      <p className="mt-1.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                        {dateLabel}
                      </p>
                      {race.location ? (
                        <p className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                          {race.location}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className="text-5xl uppercase leading-none tracking-[-0.01em] text-[var(--tt-ink,#111)]"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {countdown.primary}
                      </p>
                      <p className="mt-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-red,#da2f36)]">
                        {countdown.label}
                      </p>
                      {countdown.weeks ? (
                        <p className="mt-0.5 text-[10px] text-[var(--tt-ink-faint,#9a9a9a)]">
                          {countdown.weeks}
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
