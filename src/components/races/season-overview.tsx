'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Circle, Minus, Plus, Star } from 'lucide-react'
import type { SeasonRace } from '@/lib/season-races'
import {
  DEFAULT_SEASON_ZOOM,
  SEASON_ZOOM_MAX,
  buildSeasonMonthRange,
  buildSeasonWeekTicks,
  filterRacesInRange,
  pickNextGoalRace,
  rangeProgress,
  seasonShowsWeekLabels,
  seasonShowsWeekTicks,
  seasonViewportMonths,
  utcDate,
} from '@/lib/season-races'
import { SeasonTimeline } from '@/components/races/season-timeline'
import { NextGoalCard } from '@/components/races/next-goal-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TimelineFilterKey = 'A' | 'B' | 'C' | 'WATCHING'

const DEFAULT_FILTERS: Record<TimelineFilterKey, boolean> = {
  A: true,
  B: true,
  C: true,
  WATCHING: true,
}

type SeasonOverviewProps = {
  races: SeasonRace[]
  upcoming: SeasonRace[]
  className?: string
}

function raceMatchesFilters(
  race: SeasonRace,
  filters: Record<TimelineFilterKey, boolean>,
): boolean {
  if (race.intent === 'WATCHING') return filters.WATCHING
  return filters[race.priority]
}

export function SeasonOverview({ races, upcoming, className }: SeasonOverviewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const didInitScroll = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startScroll: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)
  const [zoom, setZoom] = useState(DEFAULT_SEASON_ZOOM)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [dragging, setDragging] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const viewportMonths = seasonViewportMonths(zoom)
  const showWeekTicks = seasonShowsWeekTicks(zoom)
  const showWeekCountdown = seasonShowsWeekLabels(zoom)

  const today = utcDate(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  )
  const { months, rangeStart, rangeEnd, defaultViewportStart } = buildSeasonMonthRange(new Date())
  const defaultViewportStartMs = defaultViewportStart.getTime()
  const rangeStartMs = rangeStart.getTime()
  const rangeEndMs = rangeEnd.getTime()
  const visibleRaces = filterRacesInRange(races, rangeStart, rangeEnd).filter((race) =>
    raceMatchesFilters(race, filters),
  )
  const weekTicks = showWeekTicks ? buildSeasonWeekTicks(rangeStart, rangeEnd) : []
  const nextGoal = pickNextGoalRace(upcoming)
  const anyFilterOn = Object.values(filters).some(Boolean)

  function toggleFilter(key: TimelineFilterKey) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function scrollToViewportStart(start: Date, behavior: ScrollBehavior = 'auto') {
    const el = scrollerRef.current
    if (!el) return
    const progress = rangeProgress(start, rangeStart, rangeEnd)
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    el.scrollTo({ left: Math.min(maxScroll, progress * el.scrollWidth), behavior })
  }

  function updateScrollEdges() {
    const el = scrollerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }

  function scrollByMonths(delta: number) {
    const el = scrollerRef.current
    if (!el) return
    const monthWidth = el.clientWidth / viewportMonths
    el.scrollBy({ left: delta * monthWidth, behavior: 'smooth' })
  }

  function scrollToDefaultWindow() {
    scrollToViewportStart(defaultViewportStart, 'smooth')
  }

  function changeZoom(nextZoom: number) {
    const el = scrollerRef.current
    const clamped = Math.min(SEASON_ZOOM_MAX, Math.max(0, nextZoom))
    if (clamped === zoom) return

    const centerRatio = el
      ? (el.scrollLeft + el.clientWidth / 2) / Math.max(el.scrollWidth, 1)
      : 0.5

    setZoom(clamped)

    requestAnimationFrame(() => {
      const node = scrollerRef.current
      if (!node) return
      const nextWidth = node.scrollWidth
      node.scrollLeft = centerRatio * nextWidth - node.clientWidth / 2
      updateScrollEdges()
    })
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const el = scrollerRef.current
    if (!el) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    }
    suppressClickRef.current = false
    el.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const el = scrollerRef.current
    if (!drag || drag.pointerId !== event.pointerId || !el) return
    const dx = event.clientX - drag.startX
    if (Math.abs(dx) > 4) {
      drag.moved = true
      suppressClickRef.current = true
    }
    el.scrollLeft = drag.startScroll - dx
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const el = scrollerRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setDragging(false)
    if (drag.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    function syncEdges() {
      updateScrollEdges()
    }

    if (!didInitScroll.current) {
      scrollToViewportStart(defaultViewportStart)
      didInitScroll.current = true
    }

    syncEdges()
    el.addEventListener('scroll', syncEdges, { passive: true })
    window.addEventListener('resize', syncEdges)
    return () => {
      el.removeEventListener('scroll', syncEdges)
      window.removeEventListener('resize', syncEdges)
    }
  }, [defaultViewportStartMs, rangeStartMs, rangeEndMs, viewportMonths])

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[6px] border border-border bg-card',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Season overview</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Starts 4 weeks before today · week view by default
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-[6px] border border-border/70 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-[6px]"
              aria-label="Zoom out"
              disabled={zoom <= 0}
              onClick={() => changeZoom(zoom - 1)}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-[6px]"
              aria-label="Zoom in"
              disabled={zoom >= SEASON_ZOOM_MAX}
              onClick={() => changeZoom(zoom + 1)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-[6px]"
              aria-label="Scroll earlier"
              disabled={!canScrollLeft}
              onClick={() => scrollByMonths(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-[6px] px-2 text-xs"
              onClick={scrollToDefaultWindow}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-[6px]"
              aria-label="Scroll later"
              disabled={!canScrollRight}
              onClick={() => scrollByMonths(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-8">
        <div className="min-w-0">
          <div
            ref={scrollerRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={cn(
              'overflow-x-auto overscroll-x-contain pb-1 touch-pan-y',
              '[-ms-overflow-style:none] [scrollbar-width:thin]',
              '[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border',
              dragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
          >
            <div
              className="min-w-full"
              style={{
                width: `${(months.length / viewportMonths) * 100}%`,
              }}
            >
              <SeasonTimeline
                months={months}
                races={visibleRaces}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                today={today}
                weekTicks={weekTicks}
                showWeekTicks={showWeekTicks}
                showWeekCountdown={showWeekCountdown}
                suppressNavigationRef={suppressClickRef}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Show
            </span>
            <TimelineFilterChip
              active={filters.A}
              onClick={() => toggleFilter('A')}
              label="A Goal"
              icon={<Star className="h-3 w-3 text-rose-600" fill="currentColor" />}
            />
            <TimelineFilterChip
              active={filters.B}
              onClick={() => toggleFilter('B')}
              label="B Important"
              icon={<Circle className="h-2.5 w-2.5 fill-amber-600 text-amber-600" />}
            />
            <TimelineFilterChip
              active={filters.C}
              onClick={() => toggleFilter('C')}
              label="C Training"
              icon={<Circle className="h-2.5 w-2.5 fill-sky-600 text-sky-600" />}
            />
            <TimelineFilterChip
              active={filters.WATCHING}
              onClick={() => toggleFilter('WATCHING')}
              label="Watching"
              icon={
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-dashed border-muted-foreground/50">
                  <Circle className="h-1.5 w-1.5 text-muted-foreground/65" />
                </span>
              }
            />
            {!anyFilterOn && (
              <button
                type="button"
                className="ml-1 text-[10px] font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Reset
              </button>
            )}
          </div>

          {visibleRaces.length === 0 && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {anyFilterOn
                ? 'No races match the selected filters.'
                : 'Turn on at least one filter to show races.'}
            </p>
          )}
        </div>

        <NextGoalCard race={nextGoal} />
      </div>
    </section>
  )
}

function TimelineFilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-1 text-[10px] transition',
        active
          ? 'border-border bg-card font-medium text-foreground'
          : 'border-transparent bg-transparent text-muted-foreground/55 line-through decoration-muted-foreground/40',
      )}
    >
      <span className={cn(!active && 'opacity-40')}>{icon}</span>
      {label}
    </button>
  )
}
