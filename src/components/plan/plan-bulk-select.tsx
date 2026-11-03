'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { copyWorkoutsToAthletes } from '@/app/actions/workouts'
import { listCoachAthletesForAssign } from '@/app/actions/workout-builder'
import {
  CoachAthleteMultiPicker,
  type CoachAthleteOption,
} from '@/components/coach/coach-athlete-multi-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isCloneablePlanWorkout } from '@/lib/workout-clone'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

type PlanBulkSelectContextValue = {
  active: boolean
  setActive: (active: boolean) => void
  selectedIds: Set<string>
  toggle: (workout: PlanWorkoutDetail) => void
  isSelected: (workoutId: string) => boolean
  clear: () => void
  selectedCount: number
}

const PlanBulkSelectContext = createContext<PlanBulkSelectContextValue | null>(
  null,
)

export function PlanBulkSelectProvider({
  children,
  enabled,
}: {
  children: ReactNode
  enabled: boolean
}) {
  const [active, setActive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const setActiveSafe = useCallback(
    (next: boolean) => {
      setActive(next)
      if (!next) clear()
    },
    [clear],
  )

  const toggle = useCallback((workout: PlanWorkoutDetail) => {
    if (workout.isRace || !isCloneablePlanWorkout(workout)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(workout.id)) next.delete(workout.id)
      else next.add(workout.id)
      return next
    })
  }, [])

  const value = useMemo<PlanBulkSelectContextValue>(
    () => ({
      active: enabled && active,
      setActive: setActiveSafe,
      selectedIds,
      toggle,
      isSelected: (id) => selectedIds.has(id),
      clear,
      selectedCount: selectedIds.size,
    }),
    [active, clear, enabled, selectedIds, setActiveSafe, toggle],
  )

  return (
    <PlanBulkSelectContext.Provider value={value}>
      {children}
      {enabled ? <PlanBulkSelectChrome /> : null}
    </PlanBulkSelectContext.Provider>
  )
}

export function usePlanBulkSelect() {
  return useContext(PlanBulkSelectContext)
}

function PlanBulkSelectChrome() {
  const bulk = usePlanBulkSelect()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copyOpen, setCopyOpen] = useState(false)
  const [roster, setRoster] = useState<CoachAthleteOption[]>([])
  const [currentAthleteId, setCurrentAthleteId] = useState<string | null>(null)
  const [athleteIds, setAthleteIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  if (!bulk) return null

  async function openCopy() {
    setError(null)
    const result = await listCoachAthletesForAssign()
    setRoster(result.athletes)
    setCurrentAthleteId(result.currentAthleteId)
    setAthleteIds(
      result.athletes
        .map((a) => a.id)
        .filter((id) => id !== result.currentAthleteId),
    )
    setCopyOpen(true)
  }

  function handleCopy() {
    if (!bulk || athleteIds.length === 0 || bulk.selectedCount === 0) return
    setError(null)
    startTransition(async () => {
      try {
        await copyWorkoutsToAthletes({
          workoutIds: [...bulk.selectedIds],
          athleteIds,
        })
        setCopyOpen(false)
        bulk.clear()
        bulk.setActive(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not copy')
      }
    })
  }

  return (
    <>
      <div className="sticky bottom-3 z-40 flex justify-center px-3 pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg',
          )}
        >
          {!bulk.active ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => bulk.setActive(true)}
            >
              Select
            </Button>
          ) : (
            <>
              <span className="text-xs text-muted-foreground tabular-nums">
                {bulk.selectedCount} selected
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={bulk.selectedCount === 0}
                onClick={() => void openCopy()}
              >
                Copy to athletes…
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => bulk.setActive(false)}
              >
                Done
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy to athletes</DialogTitle>
            <DialogDescription>
              Copies {bulk.selectedCount} workout
              {bulk.selectedCount === 1 ? '' : 's'} onto each selected athlete on
              the same calendar dates.
            </DialogDescription>
          </DialogHeader>
          <CoachAthleteMultiPicker
            label="Target athletes"
            athletes={roster.filter((a) => a.id !== currentAthleteId)}
            selectedIds={athleteIds}
            onChange={setAthleteIds}
            currentAthleteId={null}
            emptyLabel="No other athletes on your roster."
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCopyOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || athleteIds.length === 0}
              onClick={handleCopy}
            >
              {pending ? 'Copying…' : 'Copy'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Checkbox overlay when bulk select is active. */
export function PlanBulkSelectCheckbox({
  workout,
  className,
}: {
  workout: PlanWorkoutDetail
  className?: string
}) {
  const bulk = usePlanBulkSelect()
  if (!bulk?.active) return null
  if (workout.isRace || !isCloneablePlanWorkout(workout)) return null
  const checked = bulk.isSelected(workout.id)
  return (
    <button
      type="button"
      className={cn(
        'absolute left-1.5 top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded border border-border bg-card shadow-sm',
        checked && 'border-brand bg-brand/15',
        className,
      )}
      aria-pressed={checked}
      aria-label={checked ? 'Deselect workout' : 'Select workout'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        bulk.toggle(workout)
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-[2px]',
          checked ? 'bg-brand' : 'bg-transparent',
        )}
      />
    </button>
  )
}
