'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookCopy, Layers, Pencil, Trash2, User } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import {
  deleteTrainingPlan,
  listTrainingPlans,
  updateTrainingPlan,
} from '@/app/actions/training-plans'
import { ApplyTrainingPlanModal } from '@/components/training/apply-training-plan-modal'
import { CreateTrainingPlanModal } from '@/components/training/create-training-plan-modal'
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
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  TRAINING_PLANS_CHANGED_EVENT,
  notifyTrainingPlansChanged,
  type TrainingPlanListItem,
} from '@/lib/training-plan'
import { PLANNER_SPORTS, PLANNER_SPORT_LABELS } from '@/lib/season-planner'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  TrainingPlanAudienceFields,
  type PlanAthleteOption,
} from '@/components/training/training-plan-audience-fields'
import {
  TRAINING_PLAN_ATHLETE_LEVEL_LABELS,
  parseTrainingPlanAthleteLevel,
} from '@/lib/training-plan-athlete-level'
import {
  LibraryFilterPicker,
  type LibraryFilterOption,
} from '@/components/workout-library/library-filter-picker'

/** all = every plan · general = no athlete · or an athlete id */
type AthleteFilter = 'all' | 'general' | string

type TrainingPlansLibraryListProps = {
  athleteId?: string
  defaultStartWeekKey?: string
  athletes?: PlanAthleteOption[]
  className?: string
}

type PlanGroup = {
  key: string
  label: string
  plans: TrainingPlanListItem[]
}

function planMetaLine(plan: TrainingPlanListItem): string {
  const parts = [
    `${plan.weekCount}w`,
    `${plan.sessionCount} sessions`,
  ]
  if (plan.phaseCount > 0) parts.push(`${plan.phaseCount} phases`)
  if (plan.sportFocus) parts.push(WORKOUT_TYPE_LABELS[plan.sportFocus])
  const level = parseTrainingPlanAthleteLevel(plan.level)
  if (level) parts.push(TRAINING_PLAN_ATHLETE_LEVEL_LABELS[level])
  return parts.join(' · ')
}

function PlanCard({
  plan,
  pending,
  showAthlete,
  onApply,
  onEdit,
  onDelete,
}: {
  plan: TrainingPlanListItem
  pending: boolean
  showAthlete: boolean
  onApply: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="rounded-[8px] border border-[var(--tt-line-strong,#d4d4d4)] bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(17,17,17,0.04)]">
      <div className="min-w-0">
        <Link
          href={`/workouts/plans/${plan.id}`}
          className="truncate text-[13px] font-semibold text-[var(--tt-ink,#111)] hover:underline"
        >
          {plan.title}
        </Link>
        <p className="mt-0.5 text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
          {planMetaLine(plan)}
          {showAthlete && plan.forAthleteName
            ? ` · for ${plan.forAthleteName}`
            : ''}
        </p>
        {plan.description?.trim() ? (
          <p className="mt-1 line-clamp-2 text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
            {plan.description.trim()}
          </p>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Link
          href={`/workouts/plans/${plan.id}`}
          className="inline-flex h-7 items-center gap-1 rounded-[6px] px-2 text-[11px] font-semibold text-[var(--tt-ink,#111)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
        >
          <Pencil className="h-3 w-3" strokeWidth={2} aria-hidden />
          Open
        </Link>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-[6px] px-2 text-[11px] font-semibold text-[var(--tt-ink,#111)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
          onClick={onApply}
        >
          <BookCopy className="h-3 w-3" strokeWidth={2} aria-hidden />
          Apply
        </button>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-[6px] px-2 text-[11px] font-semibold text-[var(--tt-ink,#111)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
          onClick={onEdit}
        >
          Rename
        </button>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-[6px] px-2 text-[11px] font-semibold text-[var(--tt-red,#da2f36)] transition hover:bg-[color-mix(in_srgb,var(--tt-red,#da2f36)_8%,white)]"
          disabled={pending}
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" strokeWidth={2} aria-hidden />
          Delete
        </button>
      </div>
    </li>
  )
}

export function TrainingPlansLibraryList({
  athleteId,
  defaultStartWeekKey,
  athletes = [],
  className,
}: TrainingPlansLibraryListProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [plans, setPlans] = useState<TrainingPlanListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [applyPlanId, setApplyPlanId] = useState<string | null>(null)
  const [editPlan, setEditPlan] = useState<TrainingPlanListItem | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilter>('all')

  function reload() {
    startTransition(async () => {
      try {
        setError(null)
        setPlans(await listTrainingPlans())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load plans')
      }
    })
  }

  useEffect(() => {
    reload()
    function onChanged() {
      reload()
    }
    window.addEventListener(TRAINING_PLANS_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(TRAINING_PLANS_CHANGED_EVENT, onChanged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const athleteNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of athletes) map.set(a.id, a.name)
    for (const p of plans) {
      if (p.forAthleteId && p.forAthleteName && !map.has(p.forAthleteId)) {
        map.set(p.forAthleteId, p.forAthleteName)
      }
    }
    return map
  }, [athletes, plans])

  const filterOptions = useMemo((): LibraryFilterOption[] => {
    const generalCount = plans.filter((p) => !p.forAthleteId).length
    const byAthlete = new Map<string, number>()
    for (const p of plans) {
      if (!p.forAthleteId) continue
      byAthlete.set(p.forAthleteId, (byAthlete.get(p.forAthleteId) ?? 0) + 1)
    }

    const athleteIds = new Set<string>([
      ...athletes.map((a) => a.id),
      ...byAthlete.keys(),
    ])

    const athleteOptions = [...athleteIds]
      .map((id) => ({
        value: id,
        label: athleteNameById.get(id) ?? 'Athlete',
        count: byAthlete.get(id) ?? 0,
        icon: <User className="h-3.5 w-3.5 text-[var(--tt-ink-faint,#9a9a9a)]" strokeWidth={1.75} />,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))

    return [
      {
        value: 'all',
        label: 'All plans',
        count: plans.length,
        icon: <Layers className="h-3.5 w-3.5 text-[var(--tt-ink-faint,#9a9a9a)]" strokeWidth={1.75} />,
      },
      {
        value: 'general',
        label: 'General',
        count: generalCount,
        icon: <Layers className="h-3.5 w-3.5 text-[var(--tt-ink-faint,#9a9a9a)]" strokeWidth={1.75} />,
      },
      ...athleteOptions,
    ]
  }, [athletes, athleteNameById, plans])

  const groups = useMemo((): PlanGroup[] => {
    const filtered =
      athleteFilter === 'all'
        ? plans
        : athleteFilter === 'general'
          ? plans.filter((p) => !p.forAthleteId)
          : plans.filter((p) => p.forAthleteId === athleteFilter)

    if (athleteFilter !== 'all') {
      const label =
        athleteFilter === 'general'
          ? 'General'
          : (athleteNameById.get(athleteFilter) ?? 'Athlete')
      return [{ key: athleteFilter, label, plans: filtered }]
    }

    const general = filtered.filter((p) => !p.forAthleteId)
    const byAthlete = new Map<string, TrainingPlanListItem[]>()
    for (const p of filtered) {
      if (!p.forAthleteId) continue
      const list = byAthlete.get(p.forAthleteId) ?? []
      list.push(p)
      byAthlete.set(p.forAthleteId, list)
    }

    const result: PlanGroup[] = []
    if (general.length > 0) {
      result.push({ key: 'general', label: 'General', plans: general })
    }
    const athleteKeys = [...byAthlete.keys()].sort((a, b) =>
      (athleteNameById.get(a) ?? '').localeCompare(athleteNameById.get(b) ?? ''),
    )
    for (const id of athleteKeys) {
      result.push({
        key: id,
        label: athleteNameById.get(id) ?? 'Athlete',
        plans: byAthlete.get(id) ?? [],
      })
    }
    return result
  }, [athleteFilter, athleteNameById, plans])

  const totalVisible = groups.reduce((n, g) => n + g.plans.length, 0)
  const showGroupHeaders = athleteFilter === 'all' && groups.length > 1

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="border-b border-[var(--tt-line,#e8e8e8)] px-3 py-2.5">
        <LibraryFilterPicker
          label="Browse"
          aria-label="Browse plans by athlete"
          value={athleteFilter}
          onValueChange={setAthleteFilter}
          options={filterOptions}
        />
        <p className="mt-1.5 text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
          General plans are reusable. Assign an athlete under Rename to keep
          tailored plans together.
        </p>
      </div>

      {error ? (
        <p className="px-4 py-2 text-[12px] text-[var(--tt-red,#da2f36)]">{error}</p>
      ) : null}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {plans.length === 0 && !pending ? (
          <p className="px-1 py-6 text-center text-[13px] text-[var(--tt-ink-faint,#9a9a9a)]">
            No multi-week plans yet. Use{' '}
            <button
              type="button"
              className="font-medium underline-offset-2 hover:underline"
              onClick={() => setCreateOpen(true)}
            >
              New plan
            </button>{' '}
            for a blank canvas, or <span className="font-medium">Save plan</span>{' '}
            on the calendar.
          </p>
        ) : null}

        {plans.length > 0 && totalVisible === 0 && !pending ? (
          <p className="px-1 py-6 text-center text-[13px] text-[var(--tt-ink-faint,#9a9a9a)]">
            {athleteFilter === 'general'
              ? 'No general plans yet. Create one without an athlete, or clear Tailor to athlete on an existing plan.'
              : `No plans for ${athleteNameById.get(athleteFilter) ?? 'this athlete'} yet. Create a plan and set Tailor to athlete, or move one via Rename.`}
          </p>
        ) : null}

        {groups.map((group) => (
          <section key={group.key} className="space-y-2">
            {showGroupHeaders || athleteFilter !== 'all' ? (
              <div className="flex items-center gap-2 px-0.5">
                {group.key === 'general' ? (
                  <Layers
                    className="h-3.5 w-3.5 text-[var(--tt-ink-faint,#9a9a9a)]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                ) : (
                  <User
                    className="h-3.5 w-3.5 text-[var(--tt-ink-faint,#9a9a9a)]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                )}
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-soft,#6b6b6b)]">
                  {group.label}
                </h3>
                <span className="text-[11px] tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
                  {group.plans.length}
                </span>
              </div>
            ) : null}
            <ul className="space-y-2">
              {group.plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  pending={pending}
                  showAthlete={!showGroupHeaders && athleteFilter === 'all'}
                  onApply={() => setApplyPlanId(plan.id)}
                  onEdit={() => {
                    setEditError(null)
                    setEditPlan(plan)
                  }}
                  onDelete={() => {
                    if (!confirm(`Delete plan “${plan.title}”?`)) return
                    startTransition(async () => {
                      try {
                        await deleteTrainingPlan(plan.id)
                        setPlans((prev) => prev.filter((p) => p.id !== plan.id))
                        notifyTrainingPlansChanged()
                        router.refresh()
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : 'Could not delete',
                        )
                      }
                    })
                  }}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <CreateTrainingPlanModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        athletes={athletes}
      />

      <ApplyTrainingPlanModal
        open={Boolean(applyPlanId)}
        onOpenChange={(open) => {
          if (!open) setApplyPlanId(null)
        }}
        initialPlanId={applyPlanId ?? undefined}
        defaultStartWeekKey={defaultStartWeekKey}
        athleteId={athleteId}
        athletes={athletes}
      />

      <Dialog
        open={Boolean(editPlan)}
        onOpenChange={(open) => {
          if (!open) {
            setEditPlan(null)
            setEditError(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Plan details</DialogTitle>
            <DialogDescription>
              Updates library metadata only. Open the plan to edit sessions and
              phases. Assign an athlete to file the plan under their name in the
              library.
            </DialogDescription>
          </DialogHeader>
          {editPlan ? (
            <form
              key={editPlan.id}
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                setEditError(null)
                const fd = new FormData(e.currentTarget)
                const title = String(fd.get('title') ?? '')
                const description = String(fd.get('description') ?? '')
                const sportRaw = String(fd.get('sportFocus') ?? '')
                const level = String(fd.get('level') ?? '')
                const forAthleteRaw = String(fd.get('forAthleteId') ?? '')
                startTransition(async () => {
                  try {
                    await updateTrainingPlan({
                      planId: editPlan.id,
                      title,
                      description: description || undefined,
                      sportFocus:
                        sportRaw && sportRaw !== 'none'
                          ? (sportRaw as WorkoutType)
                          : null,
                      level: level || null,
                      forAthleteId:
                        forAthleteRaw && forAthleteRaw !== 'none'
                          ? forAthleteRaw
                          : null,
                    })
                    notifyTrainingPlansChanged()
                    setEditPlan(null)
                    router.refresh()
                  } catch (err) {
                    setEditError(
                      err instanceof Error ? err.message : 'Could not save',
                    )
                  }
                })
              }}
            >
              <FormError message={editError} />
              <FormField label="Title">
                <Input name="title" required defaultValue={editPlan.title} />
              </FormField>
              <FormField label="Description (optional)">
                <Input
                  name="description"
                  defaultValue={editPlan.description ?? ''}
                />
              </FormField>
              <FormField label="Sport focus (optional)">
                <Select
                  name="sportFocus"
                  defaultValue={editPlan.sportFocus ?? 'none'}
                >
                  <option value="none">Any / mixed</option>
                  {PLANNER_SPORTS.map((s) => (
                    <option key={s} value={s}>
                      {PLANNER_SPORT_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <TrainingPlanAudienceFields
                athletes={athletes}
                defaultLevel={editPlan.level}
                defaultForAthleteId={editPlan.forAthleteId}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditPlan(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
