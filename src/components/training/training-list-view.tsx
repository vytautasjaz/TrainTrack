'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import type { PlanDay } from '@/lib/plan-week'
import type { TrainingDay } from '@/lib/training-timeline'
import { todayKey } from '@/lib/training-timeline'
import { PlanMobileDayStack } from '@/components/plan/plan-mobile-day-stack'
import {
  dayHasRecovery,
  recoveryDayStripClass,
} from '@/lib/recovery-day'
import { dayHasRace, raceDayStripClass } from '@/lib/race-day'
import { cn } from '@/lib/utils'
import { Flag } from 'lucide-react'

const LIST_DAY_SECTION_ID = 'training-list-day'
const DAYS_PER_WEEK = 7

type TrainingListViewProps = {
  days: TrainingDay[]
  planDays: PlanDay[]
  isCoach: boolean
  canEditDayNotes?: boolean
  athleteId?: string
  header?: ReactNode
}

function chunkWeeks<T>(items: T[], size = DAYS_PER_WEEK): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function WeekDayGrid({
  weekDays,
  planDays,
  onDaySelect,
  columns = 7,
}: {
  weekDays: TrainingDay[]
  planDays: PlanDay[]
  onDaySelect: (dateKey: string) => void
  columns?: number
}) {
  const planDayByKey = new Map(planDays.map((d) => [d.dateKey, d]))

  return (
    <div
      className={cn(
        'grid w-full gap-0.5 sm:gap-1',
        columns === 14 ? 'grid-cols-[repeat(14,minmax(0,1fr))]' : 'grid-cols-7',
      )}
    >
      {weekDays.map((day) => {
        const planDay = planDayByKey.get(day.dateKey)
        const dayWorkouts = (planDay?.workouts ?? []).filter((w) => w.type !== 'REST')
        const isRaceDay = dayHasRace(dayWorkouts)
        const isRecovery = dayHasRecovery(dayWorkouts)
        const nonRecoveryWorkouts = dayWorkouts.filter((w) => w.type !== 'RECOVERY')
        const dayName = format(day.date, 'EEEE')
        const weekend = isWeekend(day.date)

        return (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onDaySelect(day.dateKey)}
            aria-label={`Scroll to ${dayName}`}
            className={cn(
              'flex w-full min-w-0 cursor-pointer flex-col items-center rounded-lg px-0.5 py-1 transition hover:opacity-90 active:scale-[0.98] lg:rounded-xl lg:px-1 lg:py-2',
              isRaceDay
                ? raceDayStripClass(day.isToday)
                : isRecovery
                  ? recoveryDayStripClass(day.isToday)
                  : day.isToday
                    ? 'bg-brand text-brand-foreground shadow-sm'
                    : weekend
                      ? 'border-2 border-muted-foreground/40 bg-muted shadow-[var(--shadow-card)]'
                      : 'bg-card shadow-[var(--shadow-card)]',
            )}
          >
            <p
              className={cn(
                'flex h-[2.2em] w-full items-center justify-center text-center text-[8px] font-semibold leading-[1.1] sm:text-[9px] lg:text-[10px]',
                isRaceDay || isRecovery || day.isToday
                  ? 'opacity-90'
                  : weekend
                    ? 'text-foreground/75'
                    : 'text-muted-foreground',
              )}
            >
              <span className="line-clamp-2">{dayName}</span>
            </p>
            <p className="text-sm font-bold tabular-nums lg:text-base">{format(day.date, 'd')}</p>
            <div className="mt-0.5 flex min-h-3 justify-center gap-0.5">
              {isRaceDay ? (
                <Flag className="h-2.5 w-2.5 fill-amber-500/30 text-amber-600 sm:h-3 sm:w-3 dark:text-amber-300" />
              ) : (
                !isRecovery &&
                nonRecoveryWorkouts.slice(0, 3).map((w) => (
                  <span
                    key={w.id}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      w.status === 'COMPLETED'
                        ? 'bg-green-400'
                        : w.status === 'SKIPPED'
                          ? 'bg-red-400'
                          : day.isToday
                            ? 'bg-white/80'
                            : 'bg-brand/60',
                    )}
                  />
                ))
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SwipeableWeekStrip({
  stripDays,
  weekChunks,
  planDays,
  onDaySelect,
}: {
  stripDays: TrainingDay[]
  weekChunks: TrainingDay[][]
  planDays: PlanDay[]
  onDaySelect: (dateKey: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeWeek, setActiveWeek] = useState(0)

  const updateActiveWeek = useCallback(() => {
    const el = scrollRef.current
    if (!el || weekChunks.length === 0) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveWeek(Math.min(Math.max(index, 0), weekChunks.length - 1))
  }, [weekChunks.length])

  return (
    <div className="border-b border-border/60 bg-background py-2">
      <div
        ref={scrollRef}
        onScroll={updateActiveWeek}
        className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {weekChunks.map((weekDays, index) => (
          <div
            key={weekDays[0]?.dateKey ?? index}
            className="w-full min-w-full shrink-0 snap-start snap-always"
          >
            <WeekDayGrid
              weekDays={weekDays}
              planDays={planDays}
              onDaySelect={onDaySelect}
            />
          </div>
        ))}
      </div>

      <div className="hidden lg:block">
        <WeekDayGrid
          weekDays={stripDays}
          columns={14}
          planDays={planDays}
          onDaySelect={onDaySelect}
        />
      </div>

      {weekChunks.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 lg:hidden">
          {weekChunks.map((week, index) => (
            <button
              key={week[0]?.dateKey ?? index}
              type="button"
              aria-label={`Show days ${index * DAYS_PER_WEEK + 1}–${index * DAYS_PER_WEEK + week.length}`}
              onClick={() => {
                const el = scrollRef.current
                if (!el) return
                el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
                setActiveWeek(index)
              }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                activeWeek === index ? 'w-4 bg-brand' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function filterListPlanDays(planDays: PlanDay[], rangeEndKey: string): PlanDay[] {
  const reference = todayKey()
  return planDays.filter((day) => day.dateKey >= reference && day.dateKey <= rangeEndKey)
}

function withFullDayNames(days: PlanDay[]): PlanDay[] {
  return days.map((day) => ({
    ...day,
    dayLabel: format(day.date, 'EEEE'),
  }))
}

function getAppHeaderHeight() {
  return document.querySelector('header')?.getBoundingClientRect().height ?? 48
}

function getBottomInset() {
  const bottomNav = document.querySelector('nav.fixed')
  if (!bottomNav) return 16
  const rect = bottomNav.getBoundingClientRect()
  if (rect.height === 0 || rect.bottom <= 0) return 16
  return window.innerHeight - rect.top + 8
}

export function TrainingListView({
  days,
  planDays,
  isCoach,
  canEditDayNotes = false,
  athleteId,
  header,
}: TrainingListViewProps) {
  const workoutsScrollRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<{ top: number; bottom: number; stripHeight: number } | null>(
    null,
  )

  const rangeEndKey = days[days.length - 1]?.dateKey ?? todayKey()
  const stripDays = useMemo(
    () => days.filter((day) => day.dateKey >= todayKey()),
    [days],
  )
  const visibleDays = useMemo(
    () => withFullDayNames(filterListPlanDays(planDays, rangeEndKey)),
    [planDays, rangeEndKey],
  )
  const weekChunks = useMemo(() => chunkWeeks(stripDays), [stripDays])

  useLayoutEffect(() => {
    const updateLayout = () => {
      setLayout({
        top: getAppHeaderHeight(),
        bottom: getBottomInset(),
        stripHeight: stripRef.current?.offsetHeight ?? 0,
      })
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)

    const headerEl = document.querySelector('header')
    const observer = new ResizeObserver(updateLayout)
    if (headerEl) observer.observe(headerEl)
    if (stripRef.current) observer.observe(stripRef.current)

    return () => {
      window.removeEventListener('resize', updateLayout)
      observer.disconnect()
    }
  }, [])

  const scrollToTrainingDay = useCallback((dateKey: string) => {
    const container = workoutsScrollRef.current
    const target = document.getElementById(`${LIST_DAY_SECTION_ID}-${dateKey}`)
    if (!container || !target) return

    const top = target.offsetTop - container.offsetTop - 8
    container.scrollTo({ top, behavior: 'smooth' })
  }, [])

  const panelTop = layout?.top ?? 48
  const panelBottom = layout?.bottom ?? 96

  return (
    <>
      {layout && (
        <div
          aria-hidden
          style={{ height: `calc(100dvh - ${layout.top}px - ${layout.bottom}px)` }}
        />
      )}

      <div
        className="fixed inset-x-0 z-30 flex flex-col bg-background lg:left-64"
        style={{ top: panelTop, bottom: panelBottom }}
      >
        <div ref={stripRef} className="mx-auto w-full min-w-0 max-w-6xl shrink-0 px-3 landscape:max-lg:px-2 lg:px-8">
          <SwipeableWeekStrip
            stripDays={stripDays}
            weekChunks={weekChunks}
            planDays={planDays}
            onDaySelect={scrollToTrainingDay}
          />
        </div>

        <div
          ref={workoutsScrollRef}
          className="mx-auto min-h-0 w-full min-w-0 max-w-6xl flex-1 overflow-y-auto overscroll-y-contain px-3 landscape:max-lg:px-2 lg:px-8"
        >
          {header && <div className="space-y-6 pb-4 pt-2 landscape:max-lg:space-y-3">{header}</div>}

          {visibleDays.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No upcoming days in the next 14 days.
            </p>
          ) : (
            <PlanMobileDayStack
              days={visibleDays}
              isCoach={isCoach}
              canEditDayNotes={canEditDayNotes}
              athleteId={athleteId}
              coachEditable={false}
              headerAddMenu
              daySectionIdPrefix={LIST_DAY_SECTION_ID}
              className="mx-auto w-full max-w-lg lg:max-w-none"
            />
          )}
        </div>
      </div>
    </>
  )
}
