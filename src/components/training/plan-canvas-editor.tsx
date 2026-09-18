'use client'

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookCopy,
  ChartColumn,
  ChevronLeft,
  Library,
  Minus,
  PanelRightOpen,
  Pencil,
  Plus,
} from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import {
  PlanCanvasDndProvider,
  PlanCanvasDndErrorBanner,
} from '@/components/training/plan-canvas-dnd'
import { PlanCanvasGrid } from '@/components/training/plan-canvas-grid'
import { PlanPhaseTimeline } from '@/components/training/plan-phase-timeline'
import {
  WeekCardSizeProvider,
  useWeekCardSize,
} from '@/components/plan/week-card-size-context'
import { WeekCardSizeSwitch } from '@/components/plan/week-card-size-switch'
import { PLAN_CANVAS_CARD_SIZE_STORAGE_KEY } from '@/lib/week-card-size'
import { PlanCanvasLibraryPanel } from '@/components/training/plan-canvas-library-panel'
import {
  TrainingLibraryProvider,
  useTrainingLibrary,
  type TrainingLibraryFolderItem,
  type TrainingLibraryTemplateItem,
} from '@/components/training/training-library-context'
import { ApplyTrainingPlanModal } from '@/components/training/apply-training-plan-modal'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  setTrainingPlanWeekCount,
  updateTrainingPlan,
} from '@/app/actions/training-plans'
import {
  notifyTrainingPlansChanged,
  type TrainingPlanEditorDetail,
} from '@/lib/training-plan'
import { PLANNER_SPORTS, PLANNER_SPORT_LABELS } from '@/lib/season-planner'
import { toUserMessage } from '@/lib/action-error'
import { ToolbarTextToggle } from '@/components/training/plan-sport-filter-bar'
import { useStoredFlag } from '@/hooks/use-stored-flag'
import { PLAN_CANVAS_STATS_COLLAPSED_STORAGE_KEY } from '@/lib/plan-calendar-layers'
import { cn } from '@/lib/utils'
import {
  TrainingPlanAudienceFields,
  type PlanAthleteOption,
} from '@/components/training/training-plan-audience-fields'
import {
  TRAINING_PLAN_ATHLETE_LEVEL_LABELS,
  parseTrainingPlanAthleteLevel,
} from '@/lib/training-plan-athlete-level'
import type { AthletePreferences } from '@/lib/athlete-preferences'

const LIBRARY_DOCK_PX = 320
const dockMotionClass =
  'transition-[width] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]'

function CardSizeToolbarControl() {
  const { cardSize, setCardSize } = useWeekCardSize()
  return <WeekCardSizeSwitch value={cardSize} onChange={setCardSize} />
}

function LibraryToggleButton() {
  const library = useTrainingLibrary()
  if (!library) return null
  return (
    <ToolbarTextToggle
      pressed={library.open}
      onClick={library.toggle}
      title={library.open ? 'Hide workout library' : 'Show workout library'}
      className="font-semibold text-foreground hover:text-foreground [&_svg]:opacity-100"
    >
      {library.open ? (
        <Library className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <PanelRightOpen className="h-3.5 w-3.5" aria-hidden />
      )}
    </ToolbarTextToggle>
  )
}

function PlanCanvasStatsToggle() {
  const [statsCollapsed, setStatsCollapsed] = useStoredFlag(
    PLAN_CANVAS_STATS_COLLAPSED_STORAGE_KEY,
    false,
  )
  const expanded = !statsCollapsed
  return (
    <ToolbarTextToggle
      pressed={expanded}
      onClick={() => setStatsCollapsed((prev) => !prev)}
      title={
        expanded
          ? 'Minimize weekly stats column'
          : 'Expand weekly stats column'
      }
    >
      <ChartColumn className="h-3 w-3" aria-hidden />
      Stats
    </ToolbarTextToggle>
  )
}

type PlanCanvasEditorProps = {
  plan: TrainingPlanEditorDetail
  templates: TrainingLibraryTemplateItem[]
  folders: TrainingLibraryFolderItem[]
  athleteId?: string
  athletes?: PlanAthleteOption[]
  estimationPreferences?: AthletePreferences | null
  estimationPrefsSource?: 'athlete' | 'level' | 'none'
  defaultStartWeekKey: string
}

function PlanCanvasShellLayout({ children }: { children: React.ReactNode }) {
  const library = useTrainingLibrary()
  const open = library?.open ?? false
  const planRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const [dockLeft, setDockLeft] = useState(0)
  const [dockTop, setDockTop] = useState(0)
  const [shrinkPx, setShrinkPx] = useState(0)

  useLayoutEffect(() => {
    function measure() {
      if (typeof window === 'undefined') return
      const plan = planRef.current
      if (!plan) return
      const planRect = plan.getBoundingClientRect()
      const spacerW = spacerRef.current?.getBoundingClientRect().width ?? 0
      const naturalRight = planRect.right + spacerW
      const spareRight = Math.max(0, window.innerWidth - naturalRight)
      setShrinkPx(open ? Math.max(0, LIBRARY_DOCK_PX - spareRight) : 0)
      setDockLeft(Math.round(planRect.right))
      const chrome = document.querySelector<HTMLElement>(
        '[data-app-sticky-chrome]',
      )
      setDockTop(Math.ceil(chrome?.getBoundingClientRect().bottom ?? 0))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (planRef.current) ro.observe(planRef.current)
    if (spacerRef.current) ro.observe(spacerRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [open])

  return (
    <div
      className={cn(
        'flex w-full min-w-0 max-w-none items-stretch',
        'lg:-ml-8 lg:w-[calc(100%+2rem)] lg:pl-8',
      )}
    >
      <div
        ref={planRef}
        className="min-w-0 flex-1 space-y-4 landscape:max-lg:space-y-3 lg:pr-8"
      >
        {children}
      </div>
      <div
        ref={spacerRef}
        aria-hidden
        className={cn('hidden shrink-0 lg:block', dockMotionClass)}
        style={{ width: open ? shrinkPx : 0 }}
      />
      <aside
        className={cn(
          'pointer-events-none fixed bottom-0 z-30 hidden overflow-hidden bg-white lg:block',
          'border-[var(--tt-line,#ebebeb)] shadow-[-1px_0_4px_rgba(0,0,0,0.015)]',
          dockMotionClass,
          open ? 'pointer-events-auto border-l' : 'border-l-0',
          open && shrinkPx === 0 && 'border-r',
        )}
        style={{
          top: dockTop,
          left: dockLeft,
          width: open ? LIBRARY_DOCK_PX : 0,
        }}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="h-full" style={{ width: LIBRARY_DOCK_PX }}>
          <PlanCanvasLibraryPanel />
        </div>
      </aside>
    </div>
  )
}

export function PlanCanvasEditor({
  plan,
  templates,
  folders,
  athleteId,
  athletes = [],
  estimationPreferences = null,
  estimationPrefsSource = 'none',
  defaultStartWeekKey,
}: PlanCanvasEditorProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [applyOpen, setApplyOpen] = useState(false)
  const [metaOpen, setMetaOpen] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [weekError, setWeekError] = useState<string | null>(null)
  const [removeWeekOpen, setRemoveWeekOpen] = useState(false)
  const [pendingWeekCount, setPendingWeekCount] = useState<number | null>(null)
  const [weekDraft, setWeekDraft] = useState(String(plan.weekCount))

  useEffect(() => {
    setWeekDraft(String(plan.weekCount))
  }, [plan.weekCount])

  const level = parseTrainingPlanAthleteLevel(plan.level)
  const audienceLabel = plan.forAthleteName
    ? `for ${plan.forAthleteName}`
    : level
      ? TRAINING_PLAN_ATHLETE_LEVEL_LABELS[level]
      : null
  const estimateHint =
    estimationPrefsSource === 'athlete'
      ? 'using athlete intensities'
      : estimationPrefsSource === 'level'
        ? 'using level paces'
        : 'generic estimates'

  function applyWeekCount(next: number) {
    if (next < 1 || next > 52) return
    setWeekError(null)
    startTransition(async () => {
      try {
        await setTrainingPlanWeekCount({ planId: plan.id, weekCount: next })
        notifyTrainingPlansChanged()
        setRemoveWeekOpen(false)
        setPendingWeekCount(null)
        router.refresh()
      } catch (err) {
        setWeekError(toUserMessage(err, 'Could not update weeks'))
        setWeekDraft(String(plan.weekCount))
      }
    })
  }

  function requestWeekCount(nextRaw: number) {
    const next = Math.min(52, Math.max(1, Math.floor(nextRaw)))
    if (!Number.isFinite(next)) {
      setWeekDraft(String(plan.weekCount))
      return
    }
    setWeekDraft(String(next))
    if (next === plan.weekCount) return

    if (next < plan.weekCount) {
      const hasContent =
        plan.sessions.some((s) => s.weekIndex >= next) ||
        plan.races.some((r) => r.weekIndex >= next)
      if (hasContent) {
        setPendingWeekCount(next)
        setRemoveWeekOpen(true)
        return
      }
    }
    applyWeekCount(next)
  }

  function requestRemoveWeek() {
    requestWeekCount(plan.weekCount - 1)
  }

  function commitWeekDraft() {
    const parsed = Number(weekDraft.replace(/[^\d]/g, ''))
    if (!Number.isFinite(parsed) || weekDraft.trim() === '') {
      setWeekDraft(String(plan.weekCount))
      return
    }
    requestWeekCount(parsed)
  }

  return (
    <TrainingLibraryProvider
      templates={templates}
      folders={folders}
      athleteId={athleteId}
      athletes={athletes}
    >
      <WeekCardSizeProvider storageKey={PLAN_CANVAS_CARD_SIZE_STORAGE_KEY}>
      <PlanCanvasDndProvider planId={plan.id}>
        <PlanCanvasShellLayout>
          <PlanCanvasDndErrorBanner className="mb-2" />
          <FormError message={weekError} className="mb-2" />

          <PageHeader className="mb-1 items-end">
            <div className="min-w-0">
              <PageHeaderEyebrow>
                <Link
                  href="/workouts/plans"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <ChevronLeft className="h-3 w-3" aria-hidden />
                  Training plans
                </Link>
              </PageHeaderEyebrow>
              <PageHeaderTitle className="mt-1">{plan.title}</PageHeaderTitle>
              <PageHeaderDescription>
                {plan.weekCount} weeks · relative Mon–Sun grid
                {audienceLabel ? ` · ${audienceLabel}` : ''}
                {` · ${estimateHint}`}
                {plan.sportFocus
                  ? ` · ${PLANNER_SPORT_LABELS[plan.sportFocus as keyof typeof PLANNER_SPORT_LABELS] ?? plan.sportFocus}`
                  : ''}
              </PageHeaderDescription>
            </div>
            <PageHeaderActions>
              <div className="flex flex-wrap items-center gap-1.5">
                <CardSizeToolbarControl />
                <PlanCanvasStatsToggle />
                <LibraryToggleButton />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMetaError(null)
                    setMetaOpen(true)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Rename
                </Button>
                <div className="inline-flex items-center gap-0.5 rounded-[6px] border border-[var(--tt-line-strong,#d4d4d4)] p-0.5">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] hover:bg-[var(--tt-sidebar,#f5f5f5)] disabled:opacity-40"
                    disabled={pending || plan.weekCount <= 1}
                    aria-label="Remove week"
                    onClick={requestRemoveWeek}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <label className="relative inline-flex min-w-[4.5rem] items-center justify-center">
                    <span className="sr-only">Plan length in weeks</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={weekDraft}
                      disabled={pending}
                      onChange={(e) =>
                        setWeekDraft(e.target.value.replace(/[^\d]/g, ''))
                      }
                      onBlur={commitWeekDraft}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        }
                        if (e.key === 'Escape') {
                          setWeekDraft(String(plan.weekCount))
                          e.currentTarget.blur()
                        }
                      }}
                      className="h-7 w-[3.25rem] rounded-[4px] border-0 bg-transparent px-0.5 text-center text-[11px] font-semibold tabular-nums outline-none focus:bg-[var(--tt-sidebar,#f5f5f5)] disabled:opacity-40"
                      aria-label="Weeks"
                    />
                    <span
                      className="pointer-events-none text-[11px] font-semibold text-muted-foreground"
                      aria-hidden
                    >
                      w
                    </span>
                  </label>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] hover:bg-[var(--tt-sidebar,#f5f5f5)] disabled:opacity-40"
                    disabled={pending || plan.weekCount >= 52}
                    aria-label="Add week"
                    onClick={() => requestWeekCount(plan.weekCount + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setApplyOpen(true)}
                >
                  <BookCopy className="h-3.5 w-3.5" aria-hidden />
                  Apply
                </Button>
                <Button type="button" size="sm" asChild>
                  <Link href="/workouts/plans">Done</Link>
                </Button>
              </div>
            </PageHeaderActions>
          </PageHeader>

          <p className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
            Add workouts with +, drag from the library, or drag a session into
            the library to save it. Phases are relative weeks — not calendar
            dates.
          </p>

          <PlanPhaseTimeline
            planId={plan.id}
            weekCount={plan.weekCount}
            phases={plan.phases}
          />

          <PlanCanvasGrid
            plan={plan}
            estimationPreferences={estimationPreferences}
          />

          <ApplyTrainingPlanModal
            open={applyOpen}
            onOpenChange={setApplyOpen}
            initialPlanId={plan.id}
            defaultStartWeekKey={defaultStartWeekKey}
            athleteId={athleteId}
            athletes={athletes}
          />

          <ConfirmDialog
            open={removeWeekOpen}
            onOpenChange={(open) => {
              setRemoveWeekOpen(open)
              if (!open) {
                setPendingWeekCount(null)
                setWeekDraft(String(plan.weekCount))
              }
            }}
            title={
              pendingWeekCount != null &&
              pendingWeekCount < plan.weekCount - 1
                ? `Shorten to ${pendingWeekCount} weeks?`
                : `Delete Week ${plan.weekCount}?`
            }
            description={
              pendingWeekCount != null &&
              pendingWeekCount < plan.weekCount - 1
                ? `Workouts and race placeholders in weeks ${pendingWeekCount + 1}–${plan.weekCount} will be removed from the plan.`
                : 'Any workouts in this week will be removed from the plan.'
            }
            confirmLabel={
              pendingWeekCount != null &&
              pendingWeekCount < plan.weekCount - 1
                ? 'Shorten plan'
                : 'Delete week'
            }
            pending={pending}
            onConfirm={() =>
              applyWeekCount(pendingWeekCount ?? plan.weekCount - 1)
            }
          />

          <Dialog
            open={metaOpen}
            onOpenChange={(open) => {
              if (!open) {
                setMetaOpen(false)
                setMetaError(null)
              }
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Plan details</DialogTitle>
                <DialogDescription>
                  Metadata only — already-applied calendar workouts stay as
                  copies.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  setMetaError(null)
                  const fd = new FormData(e.currentTarget)
                  startTransition(async () => {
                    try {
                      await updateTrainingPlan({
                        planId: plan.id,
                        title: String(fd.get('title') ?? ''),
                        description: String(fd.get('description') ?? '') || undefined,
                        sportFocus: (() => {
                          const raw = String(fd.get('sportFocus') ?? '')
                          return raw && raw !== 'none'
                            ? (raw as WorkoutType)
                            : null
                        })(),
                        level: String(fd.get('level') ?? '') || null,
                        forAthleteId: (() => {
                          const raw = String(fd.get('forAthleteId') ?? '')
                          return raw && raw !== 'none' ? raw : null
                        })(),
                      })
                      notifyTrainingPlansChanged()
                      setMetaOpen(false)
                      router.refresh()
                    } catch (err) {
                      setMetaError(toUserMessage(err, 'Could not save'))
                    }
                  })
                }}
              >
                <FormError message={metaError} />
                <FormField label="Title">
                  <Input name="title" required defaultValue={plan.title} />
                </FormField>
                <FormField label="Description (optional)">
                  <Input
                    name="description"
                    defaultValue={plan.description ?? ''}
                  />
                </FormField>
                <FormField label="Sport focus (optional)">
                  <Select
                    name="sportFocus"
                    defaultValue={plan.sportFocus ?? 'none'}
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
                  defaultLevel={plan.level}
                  defaultForAthleteId={plan.forAthleteId}
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setMetaOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </PlanCanvasShellLayout>
      </PlanCanvasDndProvider>
      </WeekCardSizeProvider>
    </TrainingLibraryProvider>
  )
}
