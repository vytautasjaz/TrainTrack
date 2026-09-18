'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { DateField } from '@/components/ui/date-field'
import { Select } from '@/components/ui/select'
import {
  applyTrainingPlan,
  listTrainingPlans,
  previewApplyTrainingPlan,
  getTrainingPlanDetail,
  type ApplyConflictPolicy,
  type ApplyTrainingPlanPreview,
} from '@/app/actions/training-plans'
import type { TrainingPlanListItem } from '@/lib/training-plan'
import { DAY_OF_WEEK_SHORT, formatPlanPhaseDayRange } from '@/lib/training-plan'
import { startOfWeekDateOnly, parseDateOnly, toDateKey } from '@/lib/dates'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { SEASON_PHASE_LABELS } from '@/lib/season-planner'
import { cn } from '@/lib/utils'
import type { PlanAthleteOption } from '@/components/training/training-plan-audience-fields'

type ApplyScope = 'whole' | 'phase'

type PhaseOption = {
  id: string
  label: string
  startDay: number
  endDay: number
}

type ApplyTrainingPlanModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStartWeekKey?: string
  athleteId?: string
  athletes?: PlanAthleteOption[]
  initialPlanId?: string
}

export function ApplyTrainingPlanModal({
  open,
  onOpenChange,
  defaultStartWeekKey,
  athleteId: initialAthleteId,
  athletes = [],
  initialPlanId,
}: ApplyTrainingPlanModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([])
  const [planId, setPlanId] = useState(initialPlanId ?? '')
  const [targetAthleteId, setTargetAthleteId] = useState(
    initialAthleteId ?? '',
  )
  const [startWeekKey, setStartWeekKey] = useState(
    defaultStartWeekKey
      ? toDateKey(startOfWeekDateOnly(parseDateOnly(defaultStartWeekKey)))
      : '',
  )
  const [preview, setPreview] = useState<ApplyTrainingPlanPreview | null>(null)
  const [conflictPolicy, setConflictPolicy] =
    useState<ApplyConflictPolicy>('skip')
  const [applyPhases, setApplyPhases] = useState(false)
  const [applyScope, setApplyScope] = useState<ApplyScope>('whole')
  const [phaseId, setPhaseId] = useState('')
  const [phaseOptions, setPhaseOptions] = useState<PhaseOption[]>([])

  const selectedAthlete =
    athletes.find((a) => a.id === targetAthleteId) ?? null

  useEffect(() => {
    if (!open) return
    setError(null)
    setPreview(null)
    setTargetAthleteId((prev) => {
      if (initialAthleteId) return initialAthleteId
      if (prev && athletes.some((a) => a.id === prev)) return prev
      return athletes[0]?.id ?? ''
    })
    startTransition(async () => {
      try {
        const list = await listTrainingPlans()
        setPlans(list)
        if (initialPlanId) setPlanId(initialPlanId)
        else if (!planId && list[0]) setPlanId(list[0].id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load plans')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on open
  }, [open, initialPlanId, initialAthleteId])

  useEffect(() => {
    if (defaultStartWeekKey) {
      setStartWeekKey(
        toDateKey(startOfWeekDateOnly(parseDateOnly(defaultStartWeekKey))),
      )
    }
  }, [defaultStartWeekKey])

  useEffect(() => {
    if (!open || !planId) {
      setPhaseOptions([])
      setPhaseId('')
      return
    }
    let cancelled = false
    startTransition(async () => {
      try {
        const detail = await getTrainingPlanDetail(planId)
        if (cancelled) return
        const next = (detail?.phases ?? []).map((p) => {
          const name =
            p.label?.trim() ||
            SEASON_PHASE_LABELS[p.phase] ||
            String(p.phase)
          return {
            id: p.id,
            label: `${name} · ${formatPlanPhaseDayRange(p.startDay, p.endDay)}`,
            startDay: p.startDay,
            endDay: p.endDay,
          }
        })
        setPhaseOptions(next)
        setPhaseId((prev) =>
          next.some((p) => p.id === prev) ? prev : (next[0]?.id ?? ''),
        )
        if (next.length === 0) setApplyScope('whole')
      } catch {
        if (!cancelled) {
          setPhaseOptions([])
          setPhaseId('')
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, planId])

  function runPreview() {
    if (!planId || !startWeekKey) return
    if (!targetAthleteId) {
      setError('Select an athlete to apply this plan to')
      return
    }
    if (applyScope === 'phase' && !phaseId) {
      setError('Select a phase to apply')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const next = await previewApplyTrainingPlan({
          planId,
          startWeekKey,
          athleteId: targetAthleteId,
          phaseId: applyScope === 'phase' ? phaseId : null,
        })
        setPreview(next)
        setApplyPhases(false)
      } catch (err) {
        setPreview(null)
        setError(err instanceof Error ? err.message : 'Preview failed')
      }
    })
  }

  function runApply() {
    if (!planId || !startWeekKey || !preview || !targetAthleteId) return
    setError(null)
    startTransition(async () => {
      try {
        await applyTrainingPlan({
          planId,
          startWeekKey,
          athleteId: targetAthleteId,
          conflictPolicy,
          applyPhases,
          phaseId: preview.phaseId,
        })
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Apply failed')
      }
    })
  }

  const needsPolicy = preview != null && preview.conflictCount > 0
  const hasPhases = phaseOptions.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null)
          setPreview(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[min(90vh,40rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply training plan</DialogTitle>
          <DialogDescription>
            Place the whole plan or a single phase on an athlete’s calendar.
            Distances and intensities use that athlete’s preferences. Existing
            workouts are never overwritten silently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <FormError message={error} />

          {selectedAthlete ? (
            <div className="rounded-[8px] border border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Applying to
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {selectedAthlete.name}
              </p>
            </div>
          ) : null}

          <FormField label="Athlete">
            <Select
              value={targetAthleteId}
              onChange={(e) => {
                setTargetAthleteId(e.target.value)
                setPreview(null)
              }}
              required
            >
              <option value="" disabled>
                Select athlete…
              </option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Plan">
            <Select
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value)
                setPreview(null)
                setApplyScope('whole')
              }}
            >
              <option value="" disabled>
                Select a plan…
              </option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {p.weekCount}w · {p.sessionCount} sessions
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="What to apply">
            <div className="flex flex-col gap-1.5">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-[8px] border px-3 py-2 text-sm transition',
                  applyScope === 'whole'
                    ? 'border-foreground/40 bg-[var(--tt-sidebar,#f5f5f5)]'
                    : 'border-[var(--tt-line)] hover:border-[var(--tt-line-strong,#d4d4d4)]',
                )}
              >
                <input
                  type="radio"
                  name="applyScope"
                  className="mt-0.5"
                  checked={applyScope === 'whole'}
                  onChange={() => {
                    setApplyScope('whole')
                    setPreview(null)
                  }}
                />
                <span>
                  <span className="font-semibold">Whole plan</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    All weeks, sessions, and race placeholders
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-[8px] border px-3 py-2 text-sm transition',
                  !hasPhases && 'cursor-not-allowed opacity-50',
                  applyScope === 'phase'
                    ? 'border-foreground/40 bg-[var(--tt-sidebar,#f5f5f5)]'
                    : 'border-[var(--tt-line)] hover:border-[var(--tt-line-strong,#d4d4d4)]',
                )}
              >
                <input
                  type="radio"
                  name="applyScope"
                  className="mt-0.5"
                  disabled={!hasPhases}
                  checked={applyScope === 'phase'}
                  onChange={() => {
                    setApplyScope('phase')
                    setPreview(null)
                  }}
                />
                <span>
                  <span className="font-semibold">Single phase</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {hasPhases
                      ? 'Only sessions in the selected phase block'
                      : 'This plan has no phases yet'}
                  </span>
                </span>
              </label>
            </div>
          </FormField>

          {applyScope === 'phase' && hasPhases ? (
            <FormField label="Phase">
              <Select
                value={phaseId}
                onChange={(e) => {
                  setPhaseId(e.target.value)
                  setPreview(null)
                }}
              >
                {phaseOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}

          <FormField
            label={
              applyScope === 'phase'
                ? 'Phase start week (Monday)'
                : 'Plan start week (Monday)'
            }
          >
            <DateField
              key={`apply-start-${startWeekKey}`}
              name="startWeekKey"
              required
              defaultValue={startWeekKey || undefined}
              onChange={(v) => {
                setStartWeekKey(v)
                setPreview(null)
              }}
            />
          </FormField>

          {!preview ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  pending ||
                  !planId ||
                  !startWeekKey ||
                  !targetAthleteId ||
                  (applyScope === 'phase' && !phaseId)
                }
                onClick={runPreview}
              >
                {pending ? 'Loading…' : 'Preview'}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-[8px] border border-[var(--tt-line)] px-3 py-2.5">
                <p className="text-sm font-semibold">
                  {preview.title}
                  {preview.phaseLabel ? ` · ${preview.phaseLabel}` : null}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  For {selectedAthlete?.name ?? 'athlete'} · {preview.weekCount}{' '}
                  week{preview.weekCount === 1 ? '' : 's'} ·{' '}
                  {preview.sessions.length} sessions
                  {preview.racePlaceholderCount > 0
                    ? ` · ${preview.racePlaceholderCount} race${preview.racePlaceholderCount === 1 ? '' : 's'}`
                    : ''}{' '}
                  from week of {preview.startWeekMondayKey}
                </p>
                {(preview.conflictCount > 0 ||
                  preview.raceConflictCount > 0) && (
                  <p className="mt-2 text-[12px] font-medium text-[var(--tt-red,#da2f36)]">
                    {preview.conflictCount > 0
                      ? `${preview.conflictCount} day(s) already have workouts. `
                      : null}
                    {preview.raceConflictCount > 0
                      ? `${preview.raceConflictCount} session(s) land on a race day (warm-up/cool-down will still apply).`
                      : null}
                  </p>
                )}
              </div>

              {preview.races.length > 0 ? (
                <div className="max-h-28 space-y-1.5 overflow-y-auto text-[12px]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Races
                  </p>
                  {preview.races.map((r) => (
                    <div
                      key={r.raceId}
                      className="flex flex-wrap gap-x-2 border-b border-[var(--tt-line)]/60 py-1 last:border-0"
                    >
                      <span className="font-medium tabular-nums text-muted-foreground">
                        W{r.weekIndex + 1} {DAY_OF_WEEK_SHORT[r.dayOfWeek]}
                      </span>
                      <span>{r.name}</span>
                      {r.existingRaceNames.length > 0 ? (
                        <span className="text-[var(--tt-red,#da2f36)]">
                          skip — already has {r.existingRaceNames.join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">will create</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="max-h-40 space-y-1.5 overflow-y-auto text-[12px]">
                {preview.sessions.slice(0, 40).map((s) => (
                  <div
                    key={s.sessionId}
                    className="flex flex-wrap gap-x-2 border-b border-[var(--tt-line)]/60 py-1 last:border-0"
                  >
                    <span className="font-medium tabular-nums text-muted-foreground">
                      W{s.weekIndex + 1} {DAY_OF_WEEK_SHORT[s.dayOfWeek]}
                    </span>
                    <span>
                      {s.title}
                      <span className="text-muted-foreground">
                        {' '}
                        · {WORKOUT_TYPE_LABELS[s.type]}
                      </span>
                    </span>
                    {s.conflictWorkoutIds.length > 0 ? (
                      <span className="text-[var(--tt-red,#da2f36)]">
                        conflict
                      </span>
                    ) : null}
                    {s.raceNames.length > 0 ? (
                      <span className="text-[var(--tt-red,#da2f36)]">
                        race: {s.raceNames.join(', ')}
                      </span>
                    ) : null}
                  </div>
                ))}
                {preview.sessions.length > 40 ? (
                  <p className="text-muted-foreground">
                    +{preview.sessions.length - 40} more…
                  </p>
                ) : null}
              </div>

              {needsPolicy ? (
                <FormField label="Conflicts">
                  <Select
                    value={conflictPolicy}
                    onChange={(e) =>
                      setConflictPolicy(e.target.value as ApplyConflictPolicy)
                    }
                  >
                    <option value="skip">
                      Skip conflicting sessions (keep existing)
                    </option>
                    <option value="replace">
                      Replace conflicting sessions
                    </option>
                  </Select>
                </FormField>
              ) : null}

              {preview.phaseCount > 0 ? (
                <div className="space-y-2 rounded-[8px] border border-[var(--tt-line)] px-3 py-2.5">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={applyPhases}
                      onChange={(e) => setApplyPhases(e.target.checked)}
                    />
                    {preview.applyScope === 'phase'
                      ? 'Also add this phase on the season calendar?'
                      : 'Apply phase structure on the season calendar?'}
                  </label>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreview(null)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={runApply}
                >
                  {pending
                    ? 'Applying…'
                    : preview.applyScope === 'phase'
                      ? 'Apply phase'
                      : 'Apply plan'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
