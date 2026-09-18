'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SeasonPhase, WorkoutType } from '@prisma/client'
import { Layers, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'
import {
  createTrainingPlanPhase,
  updateTrainingPlanPhase,
  deleteTrainingPlanPhase,
} from '@/app/actions/training-plans'
import {
  PLANNER_SPORTS,
  PLANNER_SPORT_LABELS,
  SEASON_PHASE_LABELS,
  displaySeasonPhaseName,
  seasonPhaseFromName,
  type PlannerSport,
} from '@/lib/season-planner'
import {
  DAY_OF_WEEK_SHORT,
  PLAN_PHASE_COLOR_PRESETS,
  PLAN_PHASE_DEFAULT_COLORS,
  planPhaseWashBackground,
  dayOfWeekFromPlanDay,
  formatPlanPhaseDayRange,
  planDayCount,
  planDayIndex,
  resolvePlanPhaseColor,
  weekIndexFromPlanDay,
  isPlanPhaseOverlapError,
  type TrainingPlanPhaseDetail,
} from '@/lib/training-plan'
import { PlanPhaseRangeGrid } from '@/components/training/plan-phase-range-grid'
import { toUserMessage } from '@/lib/action-error'
import { cn } from '@/lib/utils'

const PHASE_NAME_OPTIONS = (
  Object.keys(SEASON_PHASE_LABELS) as SeasonPhase[]
).map((value) => ({
  value,
  label: SEASON_PHASE_LABELS[value],
}))

export type PlanPhaseModalState =
  | {
      mode: 'create'
      sport?: PlannerSport
      startDay?: number
      endDay?: number
    }
  | { mode: 'edit'; phase: TrainingPlanPhaseDetail }
  | null

type PlanPhaseModalProps = {
  planId: string
  weekCount: number
  phases: TrainingPlanPhaseDetail[]
  state: PlanPhaseModalState
  onOpenChange: (open: boolean) => void
}

export function PlanPhaseModal({
  planId,
  weekCount,
  phases,
  state,
  onOpenChange,
}: PlanPhaseModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [overlapConflict, setOverlapConflict] = useState(false)
  const open = Boolean(state)
  const editing = state?.mode === 'edit' ? state.phase : null
  const [name, setName] = useState(
    editing
      ? displaySeasonPhaseName(editing.phase, editing.label)
      : SEASON_PHASE_LABELS.BASE,
  )
  const [phaseType, setPhaseType] = useState<SeasonPhase>(
    editing?.phase ?? SeasonPhase.BASE,
  )
  const [color, setColor] = useState(
    resolvePlanPhaseColor(editing?.phase ?? SeasonPhase.BASE, editing?.color),
  )
  const [sport, setSport] = useState<WorkoutType>(
    editing?.sport ??
      (state?.mode === 'create' ? (state.sport ?? WorkoutType.RUN) : WorkoutType.RUN),
  )
  const [startWeek, setStartWeek] = useState(0)
  const [startDow, setStartDow] = useState(0)
  const [endWeek, setEndWeek] = useState(0)
  const [endDow, setEndDow] = useState(6)
  /** Secondary: pin start/end to a weekday instead of full weeks. */
  const [byDay, setByDay] = useState(false)

  useEffect(() => {
    if (!state) return
    if (state.mode === 'edit') {
      const nextName = displaySeasonPhaseName(
        state.phase.phase,
        state.phase.label,
      )
      const sDow = dayOfWeekFromPlanDay(state.phase.startDay)
      const eDow = dayOfWeekFromPlanDay(state.phase.endDay)
      setName(nextName)
      setPhaseType(state.phase.phase)
      setColor(resolvePlanPhaseColor(state.phase.phase, state.phase.color))
      setSport(state.phase.sport)
      setStartWeek(weekIndexFromPlanDay(state.phase.startDay))
      setStartDow(sDow)
      setEndWeek(weekIndexFromPlanDay(state.phase.endDay))
      setEndDow(eDow)
      setByDay(sDow !== 0 || eDow !== 6)
    } else {
      setName(SEASON_PHASE_LABELS.BASE)
      setPhaseType(SeasonPhase.BASE)
      setColor(PLAN_PHASE_DEFAULT_COLORS.BASE)
      setSport(state.sport ?? WorkoutType.RUN)
      const start = state.startDay ?? 0
      const end =
        state.endDay ?? Math.min(planDayCount(weekCount) - 1, start + 6)
      const sDow = dayOfWeekFromPlanDay(start)
      const eDow = dayOfWeekFromPlanDay(end)
      setStartWeek(weekIndexFromPlanDay(start))
      setStartDow(sDow)
      setEndWeek(weekIndexFromPlanDay(end))
      setEndDow(eDow)
      setByDay(sDow !== 0 || eDow !== 6)
    }
    setError(null)
    setOverlapConflict(false)
  }, [state, weekCount])

  function applyName(nextName: string, matchedPhase?: SeasonPhase | null) {
    setName(nextName)
    const matched = matchedPhase ?? seasonPhaseFromName(nextName)
    if (matched) {
      const prevDefault = PLAN_PHASE_DEFAULT_COLORS[phaseType]
      setPhaseType(matched)
      if (color === prevDefault || !editing?.color) {
        setColor(PLAN_PHASE_DEFAULT_COLORS[matched])
      }
    }
  }

  const weekOptions = Array.from({ length: weekCount }, (_, i) => i)
  const resolvedStartDay = byDay
    ? planDayIndex(startWeek, startDow)
    : planDayIndex(startWeek, 0)
  const resolvedEndDay = byDay
    ? planDayIndex(endWeek, endDow)
    : planDayIndex(endWeek, 6)
  const rangePreview = useMemo(
    () =>
      formatPlanPhaseDayRange(
        Math.min(resolvedStartDay, resolvedEndDay),
        Math.max(resolvedStartDay, resolvedEndDay),
      ),
    [resolvedStartDay, resolvedEndDay],
  )
  const customColorSelected = !(
    PLAN_PHASE_COLOR_PRESETS as readonly string[]
  ).includes(color)

  function save(resolveOverlaps = false) {
    setError(null)
    setOverlapConflict(false)
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a phase name')
      return
    }
    const nextStart = byDay
      ? planDayIndex(startWeek, startDow)
      : planDayIndex(startWeek, 0)
    const nextEnd = byDay
      ? planDayIndex(endWeek, endDow)
      : planDayIndex(endWeek, 6)
    if (nextEnd < nextStart) {
      setError(
        byDay
          ? 'End day must be on or after start day'
          : 'End week must be on or after start week',
      )
      return
    }
    const matched = seasonPhaseFromName(trimmed)
    const phase = matched ?? phaseType
    startTransition(async () => {
      try {
        if (editing) {
          await updateTrainingPlanPhase({
            phaseId: editing.id,
            phase,
            sport,
            label: trimmed,
            startDay: nextStart,
            endDay: nextEnd,
            color,
            resolveOverlaps,
          })
        } else {
          await createTrainingPlanPhase({
            planId,
            phase,
            sport,
            label: trimmed,
            startDay: nextStart,
            endDay: nextEnd,
            color,
            resolveOverlaps,
          })
        }
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        const message = toUserMessage(err, 'Could not save phase')
        setError(message)
        setOverlapConflict(isPlanPhaseOverlapError(message))
      }
    })
  }

  function remove() {
    if (!editing) return
    if (!confirm('Delete this phase from the plan?')) return
    startTransition(async () => {
      try {
        await deleteTrainingPlanPhase(editing.id)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(toUserMessage(err, 'Could not delete'))
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null)
          setOverlapConflict(false)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="mb-0 border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              style={{
                backgroundColor: planPhaseWashBackground(color, 28),
                color,
              }}
              aria-hidden
            >
              <Layers className="h-3 w-3" strokeWidth={2} />
            </span>
            {editing ? 'Edit phase' : 'Add phase'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Set name, sport, color, and day range for this plan phase.
          </DialogDescription>
        </DialogHeader>

        {state ? (
          <>
            <div className="space-y-3 px-5 py-3.5">
              <FormError message={error} />
              {overlapConflict ? (
                <div className="-mt-1 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => save(true)}
                  >
                    {pending
                      ? 'Updating…'
                      : 'Adjust overlapping phases & save'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Trims, splits, or removes phases that sit in this range.
                  </p>
                </div>
              ) : null}

              <FormField label="Name">
                <Combobox
                  value={name}
                  onChange={(next) => applyName(next)}
                  onSelectOption={(opt) =>
                    applyName(opt.label, opt.value as SeasonPhase)
                  }
                  options={PHASE_NAME_OPTIONS}
                  placeholder="e.g. Base, Marathon build…"
                  required
                  autoFocus={!editing}
                />
              </FormField>

              <div className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-end gap-3">
                <FormField label="Sport">
                  <Select
                    value={sport}
                    onChange={(e) => setSport(e.target.value as WorkoutType)}
                    required
                  >
                    {PLANNER_SPORTS.map((s) => (
                      <option key={s} value={s}>
                        {PLANNER_SPORT_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <div className="space-y-1">
                  <p className="text-[12px] font-medium text-[var(--tt-ink,#111)]">
                    Color
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    {PLAN_PHASE_COLOR_PRESETS.map((preset) => {
                      const selected = color === preset
                      return (
                        <button
                          key={preset}
                          type="button"
                          aria-label={`Color ${preset}`}
                          aria-pressed={selected}
                          className={cn(
                            'h-7 w-7 shrink-0 rounded-full transition',
                            selected
                              ? 'ring-2 ring-[var(--tt-ink,#111)] ring-offset-1'
                              : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]',
                          )}
                          style={{
                            backgroundColor: planPhaseWashBackground(
                              preset,
                              36,
                            ),
                          }}
                          onClick={() => setColor(preset)}
                        />
                      )
                    })}
                    <label
                      className={cn(
                        'relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[11px] font-semibold transition',
                        customColorSelected
                          ? 'ring-2 ring-[var(--tt-ink,#111)] ring-offset-1'
                          : 'border border-dashed border-[var(--tt-line-strong,#d4d4d4)] text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                      )}
                      style={
                        customColorSelected
                          ? {
                              backgroundColor: planPhaseWashBackground(
                                color,
                                36,
                              ),
                              color,
                            }
                          : undefined
                      }
                      title="Custom color"
                    >
                      <span aria-hidden>+</span>
                      <span className="sr-only">Custom color</span>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-[var(--tt-ink,#111)]">
                    Range
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {rangePreview}
                  </span>
                </div>

                <PlanPhaseRangeGrid
                  weekCount={weekCount}
                  phases={phases}
                  editingPhaseId={editing?.id}
                  selectionStart={Math.min(resolvedStartDay, resolvedEndDay)}
                  selectionEnd={Math.max(resolvedStartDay, resolvedEndDay)}
                  draftColor={color}
                  onSelectRange={(startDay, endDay) => {
                    const sDow = dayOfWeekFromPlanDay(startDay)
                    const eDow = dayOfWeekFromPlanDay(endDay)
                    setStartWeek(weekIndexFromPlanDay(startDay))
                    setEndWeek(weekIndexFromPlanDay(endDay))
                    setStartDow(sDow)
                    setEndDow(eDow)
                    setByDay(sDow !== 0 || eDow !== 6)
                    setError(null)
                    setOverlapConflict(false)
                  }}
                />

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={!byDay}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                      !byDay
                        ? 'bg-[var(--tt-ink,#111)] text-white'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                    onClick={() => {
                      setByDay(false)
                      setStartDow(0)
                      setEndDow(6)
                    }}
                  >
                    Full weeks
                  </button>
                  <button
                    type="button"
                    aria-pressed={byDay}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                      byDay
                        ? 'bg-[var(--tt-ink,#111)] text-white'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                    onClick={() => setByDay(true)}
                  >
                    By day
                  </button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Select
                      value={String(startWeek)}
                      onChange={(e) => setStartWeek(Number(e.target.value))}
                      className="h-7 w-[4.75rem] px-1.5 text-[11px]"
                      aria-label="Start week"
                    >
                      {weekOptions.map((w) => (
                        <option key={w} value={w}>
                          W{w + 1}
                        </option>
                      ))}
                    </Select>
                    <span className="text-[11px] text-muted-foreground">→</span>
                    <Select
                      value={String(endWeek)}
                      onChange={(e) => setEndWeek(Number(e.target.value))}
                      className="h-7 w-[4.75rem] px-1.5 text-[11px]"
                      aria-label="End week"
                    >
                      {weekOptions.map((w) => (
                        <option key={w} value={w}>
                          W{w + 1}
                        </option>
                      ))}
                    </Select>
                    {byDay ? (
                      <>
                        <Select
                          value={String(startDow)}
                          onChange={(e) =>
                            setStartDow(Number(e.target.value))
                          }
                          className="h-7 w-[3.75rem] px-1 text-[11px]"
                          aria-label="Start day"
                        >
                          {DAY_OF_WEEK_SHORT.map((label, i) => (
                            <option key={label} value={i}>
                              {label}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value={String(endDow)}
                          onChange={(e) => setEndDow(Number(e.target.value))}
                          className="h-7 w-[3.75rem] px-1 text-[11px]"
                          aria-label="End day"
                        >
                          {DAY_OF_WEEK_SHORT.map((label, i) => (
                            <option key={label} value={i}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={remove}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || !name.trim()}
                  onClick={() => save()}
                >
                  {pending ? 'Saving…' : editing ? 'Save' : 'Add phase'}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
