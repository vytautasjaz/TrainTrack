'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlanDay } from '@/lib/plan-week'
import { dayHasRecovery, recoveryDayStripClass } from '@/lib/recovery-day'
import { getDayRacePriority } from '@/lib/race-day'
import { cn } from '@/lib/utils'

const WEEK_SWIPE_THRESHOLD = 60

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

type PlanWeekDayStripProps = {
  days: PlanDay[]
  activeDateKey?: string | null
  onDaySelect: (dateKey: string) => void
  prevWeekHref?: string
  nextWeekHref?: string
  className?: string
}

export function PlanWeekDayStrip({
  days,
  activeDateKey,
  onDaySelect,
  prevWeekHref,
  nextWeekHref,
  className,
}: PlanWeekDayStripProps) {
  const touchStartX = useRef<number | null>(null)
  const showWeekNav = Boolean(prevWeekHref && nextWeekHref)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showWeekNav) return
    if ((e.target as HTMLElement).closest('button')) return
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!showWeekNav || !prevWeekHref || !nextWeekHref) return
    if ((e.target as HTMLElement).closest('button')) {
      touchStartX.current = null
      return
    }
    if (touchStartX.current === null) return
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < WEEK_SWIPE_THRESHOLD) return
    window.location.assign(delta < 0 ? nextWeekHref : prevWeekHref)
  }

  return (
    <div className={cn('flex items-center gap-2 py-1', className)}>
      {showWeekNav ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          asChild
        >
          <Link href={prevWeekHref!} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}

      <div
        className="min-w-0 flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid w-full grid-cols-7 gap-1">
          {days.map((day) => {
            const dayWorkouts = day.workouts.filter((w) => w.type !== 'REST')
            const racePriority = getDayRacePriority(dayWorkouts)
            const isRaceDay = racePriority != null
            const isRecovery = dayHasRecovery(dayWorkouts)
            const nonRecoveryWorkouts = dayWorkouts.filter((w) => w.type !== 'RECOVERY')
            const active = activeDateKey === day.dateKey
            const weekend = isWeekend(day.date)
            const dayName = day.dayLabel.slice(0, 3)

            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onDaySelect(day.dateKey)}
                aria-label={`Go to ${day.dayLabel}`}
                aria-current={active ? 'date' : undefined}
                className={cn(
                  'flex w-full min-w-0 cursor-pointer flex-col items-center rounded-xl px-0.5 py-2 transition active:scale-[0.98]',
                  isRecovery
                    ? recoveryDayStripClass(active || day.isToday)
                    : active
                      ? 'bg-foreground text-background'
                      : day.isToday
                        ? 'bg-foreground/12 text-foreground ring-1 ring-inset ring-foreground/20'
                        : weekend
                          ? 'border border-border/60 bg-muted/50'
                          : 'border border-border/40 bg-card',
                )}
              >
                <p
                  className={cn(
                    'text-[8px] font-semibold uppercase leading-none',
                    isRecovery || active
                      ? 'opacity-90'
                      : day.isToday
                        ? 'text-foreground/80'
                        : weekend
                          ? 'text-foreground/75'
                          : 'text-muted-foreground',
                  )}
                >
                  {dayName}
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums">
                  {format(day.date, 'd')}
                </p>
                <div className="mt-0.5 flex min-h-3 justify-center gap-0.5">
                  {isRaceDay ? (
                    <Flag
                      className={cn(
                        'h-2.5 w-2.5 fill-current/30',
                        racePriority === 'A' && 'text-red-600 dark:text-red-400',
                        racePriority === 'B' && 'text-blue-600 dark:text-blue-400',
                        racePriority === 'C' && 'text-emerald-600 dark:text-emerald-300',
                      )}
                    />
                  ) : (
                    !isRecovery &&
                    nonRecoveryWorkouts.slice(0, 3).map((w) => (
                      <span
                        key={w.id}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          w.status === 'COMPLETED'
                            ? 'bg-green-500'
                            : w.status === 'SKIPPED'
                              ? 'bg-muted-foreground/50'
                              : active
                                ? 'bg-background/80'
                                : 'bg-foreground/35',
                        )}
                      />
                    ))
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {showWeekNav ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          asChild
        >
          <Link href={nextWeekHref!} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
