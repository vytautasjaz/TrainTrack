/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type DragEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Columns2, GripVertical } from 'lucide-react'
import {
  compareCopyLibrarySession,
  compareCopyLibraryWeek,
  compareCopyWeek,
  compareCopyWorkout,
  getCoachCompareAthleteWeek,
  getCoachCompareLibraryWeek,
  listCoachComparePlans,
  type CoachCompareAthletePane,
  type CoachCompareLibraryPane,
} from '@/app/actions/coach-compare'
import { WeekPlanWorkoutCard } from '@/components/plan/week-plan-workout-card'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { addDateOnlyDays, parseDateOnly, toDateKey } from '@/lib/dates'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { isCloneablePlanWorkout } from '@/lib/workout-clone'
import { cn } from '@/lib/utils'

type AthleteOption = { id: string; name: string }
type PlanOption = { id: string; title: string; weekCount: number }

type PaneSource =
  | { kind: 'athlete'; athleteId: string }
  | { kind: 'library'; planId: string; weekIndex: number }

type DragPayload =
  | {
      kind: 'workout'
      workoutId: string
      sourceAthleteId: string
      sport: string
    }
  | {
      kind: 'week'
      sourceAthleteId: string
      sourceWeekStartKey: string
    }
  | {
      kind: 'library-session'
      planSessionId: string
      sport: string
    }
  | {
      kind: 'library-week'
      planId: string
      weekIndex: number
    }

type CoachCompareViewProps = {
  initialAthleteId: string
  initialWeekStartKey: string
  athletes: AthleteOption[]
  weekHref: string
}

type PaneState = CoachCompareAthletePane | CoachCompareLibraryPane | null

export function CoachCompareView({
  initialAthleteId,
  initialWeekStartKey,
  athletes,
  weekHref,
}: CoachCompareViewProps) {
  const router = useRouter()
  const [weekStartKey, setWeekStartKey] = useState(initialWeekStartKey)
  const [leftSource, setLeftSource] = useState<PaneSource>({
    kind: 'athlete',
    athleteId: initialAthleteId,
  })
  const [rightSource, setRightSource] = useState<PaneSource>(() => {
    const other = athletes.find((a) => a.id !== initialAthleteId)
    return other
      ? { kind: 'athlete', athleteId: other.id }
      : { kind: 'athlete', athleteId: initialAthleteId }
  })
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [leftPane, setLeftPane] = useState<PaneState>(null)
  const [rightPane, setRightPane] = useState<PaneState>(null)
  const [drag, setDrag] = useState<DragPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    void listCoachComparePlans().then(setPlans)
  }, [])

  const loadPane = useCallback(
    async (source: PaneSource): Promise<PaneState> => {
      if (source.kind === 'athlete') {
        return getCoachCompareAthleteWeek({
          athleteId: source.athleteId,
          weekStartKey,
        })
      }
      return getCoachCompareLibraryWeek({
        planId: source.planId,
        weekStartKey,
        weekIndex: source.weekIndex,
      })
    },
    [weekStartKey],
  )

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadPane(leftSource), loadPane(rightSource)]).then(
      ([left, right]) => {
        if (cancelled) return
        setLeftPane(left)
        setRightPane(right)
      },
    )
    return () => {
      cancelled = true
    }
  }, [leftSource, rightSource, loadPane])

  function shiftWeek(delta: number) {
    const next = addDateOnlyDays(parseDateOnly(weekStartKey), delta * 7)
    setWeekStartKey(toDateKey(next))
  }

  function refreshPanes() {
    startTransition(async () => {
      const [left, right] = await Promise.all([
        loadPane(leftSource),
        loadPane(rightSource),
      ])
      setLeftPane(left)
      setRightPane(right)
      router.refresh()
    })
  }

  function runCopy(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        setDrag(null)
        refreshPanes()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not copy')
      }
    })
  }

  function onDropToAthlete(
    targetAthleteId: string,
    targetWeekStartKey: string,
    dateKey: string,
  ) {
    if (!drag) return
    if (drag.kind === 'workout') {
      if (drag.sourceAthleteId === targetAthleteId) return
      runCopy(() =>
        compareCopyWorkout({
          workoutId: drag.workoutId,
          targetAthleteId,
          dateKey,
        }),
      )
      return
    }
    if (drag.kind === 'week') {
      if (drag.sourceAthleteId === targetAthleteId) return
      runCopy(() =>
        compareCopyWeek({
          sourceAthleteId: drag.sourceAthleteId,
          sourceWeekStartKey: drag.sourceWeekStartKey,
          targetAthleteId,
          targetWeekStartKey,
        }),
      )
      return
    }
    if (drag.kind === 'library-session') {
      runCopy(() =>
        compareCopyLibrarySession({
          planSessionId: drag.planSessionId,
          targetAthleteId,
          dateKey,
        }),
      )
      return
    }
    if (drag.kind === 'library-week') {
      runCopy(() =>
        compareCopyLibraryWeek({
          planId: drag.planId,
          weekIndex: drag.weekIndex,
          targetAthleteId,
          targetWeekStartKey,
        }),
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Columns2 className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Compare plans</p>
          <Button asChild variant="ghost" size="sm">
            <a href={weekHref}>Exit</a>
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous week"
            onClick={() => shiftWeek(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[7rem] text-center text-sm tabular-nums">
            {weekStartKey}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next week"
            onClick={() => shiftWeek(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <FormError message={error} />
      {pending ? (
        <p className="text-xs text-muted-foreground">Updating…</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ComparePane
          label="Left"
          source={leftSource}
          pane={leftPane}
          athletes={athletes}
          plans={plans}
          onSourceChange={setLeftSource}
          drag={drag}
          setDrag={setDrag}
          onDropToAthlete={onDropToAthlete}
        />
        <ComparePane
          label="Right"
          source={rightSource}
          pane={rightPane}
          athletes={athletes}
          plans={plans}
          onSourceChange={setRightSource}
          drag={drag}
          setDrag={setDrag}
          onDropToAthlete={onDropToAthlete}
        />
      </div>
    </div>
  )
}

function ComparePane({
  label,
  source,
  pane,
  athletes,
  plans,
  onSourceChange,
  drag,
  setDrag,
  onDropToAthlete,
}: {
  label: string
  source: PaneSource
  pane: PaneState
  athletes: AthleteOption[]
  plans: PlanOption[]
  onSourceChange: (source: PaneSource) => void
  drag: DragPayload | null
  setDrag: (drag: DragPayload | null) => void
  onDropToAthlete: (
    targetAthleteId: string,
    targetWeekStartKey: string,
    dateKey: string,
  ) => void
}) {
  const isLibrary = source.kind === 'library'
  const athleteId = source.kind === 'athlete' ? source.athleteId : null
  const canReceive =
    Boolean(athleteId) &&
    Boolean(drag) &&
    (drag?.kind === 'library-session' ||
      drag?.kind === 'library-week' ||
      (drag?.kind === 'workout' && drag.sourceAthleteId !== athleteId) ||
      (drag?.kind === 'week' && drag.sourceAthleteId !== athleteId))

  function onSourceKindChange(kind: 'athlete' | 'library') {
    if (kind === 'athlete') {
      onSourceChange({
        kind: 'athlete',
        athleteId: athletes[0]?.id ?? '',
      })
      return
    }
    const plan = plans[0]
    if (!plan) return
    onSourceChange({ kind: 'library', planId: plan.id, weekIndex: 0 })
  }

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card">
      <header className="space-y-2 border-b border-border/60 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={source.kind}
            onChange={(e) =>
              onSourceKindChange(e.target.value as 'athlete' | 'library')
            }
          >
            <option value="athlete">Athlete</option>
            <option value="library" disabled={plans.length === 0}>
              Library plan
            </option>
          </select>
          {source.kind === 'athlete' ? (
            <select
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
              value={source.athleteId}
              onChange={(e) =>
                onSourceChange({ kind: 'athlete', athleteId: e.target.value })
              }
            >
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <select
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                value={source.planId}
                onChange={(e) =>
                  onSourceChange({
                    kind: 'library',
                    planId: e.target.value,
                    weekIndex: 0,
                  })
                }
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                value={source.weekIndex}
                onChange={(e) =>
                  onSourceChange({
                    ...source,
                    weekIndex: Number(e.target.value),
                  })
                }
              >
                {Array.from(
                  {
                    length:
                      plans.find((p) => p.id === source.planId)?.weekCount ?? 1,
                  },
                  (_, i) => (
                    <option key={i} value={i}>
                      W{i + 1}
                    </option>
                  ),
                )}
              </select>
            </>
          )}
        </div>

        {pane ? (
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              if (pane.kind === 'athlete') {
                setDrag({
                  kind: 'week',
                  sourceAthleteId: pane.athleteId,
                  sourceWeekStartKey: pane.weekStartKey,
                })
              } else {
                setDrag({
                  kind: 'library-week',
                  planId: pane.planId,
                  weekIndex: pane.weekIndex,
                })
              }
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onDragEnd={() => setDrag(null)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-brand/40 hover:text-foreground"
            title="Drag whole week to the other athlete pane"
          >
            <GripVertical className="h-3.5 w-3.5" />
            Drag week
          </button>
        ) : null}
      </header>

      <div className="space-y-2 p-3">
        {!pane ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          pane.days.map((day) => (
            <DayDropRow
              key={day.dateKey}
              dateKey={day.dateKey}
              label={`${day.dayLabel} ${day.dateLabel}`}
              workouts={day.workouts}
              isLibrary={isLibrary}
              athleteId={athleteId}
              canReceive={canReceive}
              setDrag={setDrag}
              onDrop={() => {
                if (!athleteId || !pane) return
                onDropToAthlete(athleteId, pane.weekStartKey, day.dateKey)
              }}
            />
          ))
        )}
      </div>
    </section>
  )
}

function DayDropRow({
  dateKey,
  label,
  workouts,
  isLibrary,
  athleteId,
  canReceive,
  setDrag,
  onDrop,
}: {
  dateKey: string
  label: string
  workouts: PlanWorkoutDetail[]
  isLibrary: boolean
  athleteId: string | null
  canReceive: boolean
  setDrag: (drag: DragPayload | null) => void
  onDrop: () => void
}) {
  const [over, setOver] = useState(false)

  function handleDragOver(e: DragEvent) {
    if (!canReceive) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setOver(true)
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 p-2 transition',
        canReceive && over && 'border-brand bg-brand/[0.06]',
        canReceive && !over && 'border-dashed',
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onDrop()
      }}
    >
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1.5">
        {workouts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70">—</p>
        ) : (
          workouts.map((workout) => {
            const cloneable =
              !workout.isRace && isCloneablePlanWorkout(workout)
            return (
              <div
                key={workout.id}
                draggable={cloneable}
                onDragStart={(e) => {
                  if (!cloneable) return
                  if (isLibrary) {
                    const sessionId = workout.id.startsWith('library:')
                      ? workout.id.slice('library:'.length)
                      : workout.id
                    setDrag({
                      kind: 'library-session',
                      planSessionId: sessionId,
                      sport: workout.type,
                    })
                  } else if (athleteId) {
                    setDrag({
                      kind: 'workout',
                      workoutId: workout.id,
                      sourceAthleteId: athleteId,
                      sport: workout.type,
                    })
                  }
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onDragEnd={() => setDrag(null)}
                className={cn(cloneable && 'cursor-grab active:cursor-grabbing')}
              >
                <WeekPlanWorkoutCard
                  workout={workout}
                  status={workout.status}
                  isCoach
                />
              </div>
            )
          })
        )}
      </div>
      <span className="sr-only">{dateKey}</span>
    </div>
  )
}
