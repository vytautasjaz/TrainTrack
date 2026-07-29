'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import {
  copyWorkoutToDates,
  getAthleteDaySportsForMonth,
} from '@/app/actions/workouts'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type CopyPlanWorkoutModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workoutId: string
  workoutTitle: string
  sourceDateKey: string
}

function buildMonthDays(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end }).map((day) => ({
    date: day,
    dateKey: format(day, 'yyyy-MM-dd'),
    inMonth: isSameMonth(day, anchor),
    dayNumber: day.getDate(),
  }))
}

export function CopyPlanWorkoutModal({
  open,
  onOpenChange,
  workoutId,
  workoutTitle,
  sourceDateKey,
}: CopyPlanWorkoutModalProps) {
  const [pending, startTransition] = useTransition()
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const [y, m] = sourceDateKey.split('-').map(Number)
    return new Date(y, (m ?? 1) - 1, 1)
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [daySports, setDaySports] = useState<Record<string, WorkoutType[]>>({})

  useEffect(() => {
    if (!open) return
    const [y, m] = sourceDateKey.split('-').map(Number)
    setMonthAnchor(new Date(y, (m ?? 1) - 1, 1))
    setSelected(new Set())
  }, [open, sourceDateKey, workoutId])

  useEffect(() => {
    if (!open) return
    const year = monthAnchor.getFullYear()
    const month = monthAnchor.getMonth() + 1
    let cancelled = false
    void getAthleteDaySportsForMonth(year, month).then((map) => {
      if (!cancelled) setDaySports(map)
    })
    return () => {
      cancelled = true
    }
  }, [open, monthAnchor])

  const days = useMemo(() => buildMonthDays(monthAnchor), [monthAnchor])
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const selectedCount = selected.size

  function toggleDate(dateKey: string, inMonth: boolean) {
    if (!inMonth) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  function handleCopy() {
    if (selectedCount === 0) return
    startTransition(async () => {
      await copyWorkoutToDates({
        workoutId,
        dates: [...selected].sort(),
      })
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Copy workout</DialogTitle>
          <DialogDescription>
            Select one or more days to copy “{workoutTitle}”. Existing sessions on a day are
            shown and do not block copying.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() => setMonthAnchor((prev) => addMonths(prev, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-semibold tabular-nums">
              {format(monthAnchor, 'MMMM yyyy')}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() => setMonthAnchor((prev) => addMonths(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = selected.has(day.dateKey)
              const sports = daySports[day.dateKey] ?? []
              const isToday = day.dateKey === todayKey
              const isSource = day.dateKey === sourceDateKey

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  disabled={!day.inMonth}
                  onClick={() => toggleDate(day.dateKey, day.inMonth)}
                  className={cn(
                    'flex min-h-[3.75rem] flex-col items-stretch rounded-md border px-1 py-1 text-left transition',
                    day.inMonth
                      ? 'border-border/60 bg-card hover:border-brand/40'
                      : 'cursor-default border-transparent bg-transparent text-muted-foreground/40',
                    isToday && day.inMonth && 'border-brand/50 bg-brand/10',
                    isSelected &&
                      day.inMonth &&
                      'border-brand bg-brand/[0.12] ring-1 ring-brand/30',
                    isSource && day.inMonth && !isSelected && 'border-dashed border-muted-foreground/40',
                  )}
                  aria-pressed={isSelected}
                  aria-label={`${day.dateKey}${isSelected ? ', selected' : ''}`}
                >
                  <span
                    className={cn(
                      'text-[11px] font-medium tabular-nums',
                      day.inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                    )}
                  >
                    {day.dayNumber}
                  </span>
                  {sports.length > 0 ? (
                    <span className="mt-auto flex flex-wrap gap-0.5 pb-0.5">
                      {sports.slice(0, 4).map((type) => (
                        <WorkoutSportIcon
                          key={`${day.dateKey}-${type}`}
                          type={type}
                          size="xs"
                          className="!h-4 !w-4 !rounded-[3px]"
                        />
                      ))}
                      {sports.length > 4 ? (
                        <span className="text-[9px] text-muted-foreground">+{sports.length - 4}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="mt-auto" />
                  )}
                </button>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedCount === 0
              ? 'No days selected'
              : `${selectedCount} day${selectedCount === 1 ? '' : 's'} selected`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || selectedCount === 0}
            onClick={handleCopy}
          >
            {pending
              ? 'Copying…'
              : selectedCount === 0
                ? 'Copy'
                : `Copy to ${selectedCount} day${selectedCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
