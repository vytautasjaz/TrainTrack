'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Flag,
  Footprints,
  Layers,
  Link2,
  Pencil,
  Route,
  Target,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RaceHeroSummary, raceSummaryMeta } from '@/components/races/race-hero-summary'
import { RaceEditModal } from '@/components/races/race-edit-modal'
import { RaceStatCell } from '@/components/races/race-stat-cell'
import {
  RaceReportPanel,
  raceHasReportContent,
} from '@/components/races/race-report-panel'
import { ExpandShell } from '@/components/ui/expand-shell'
import { RaceAskCoachSection } from '@/components/races/race-ask-coach-section'
import { deleteRace } from '@/app/actions/workouts'
import { type SeasonRace } from '@/lib/season-races'
import { RACE_PRIORITY_LABELS } from '@/lib/constants'
import { weeksUntilRace } from '@/lib/season-planner'
import { cn, daysUntil } from '@/lib/utils'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import { resolveWorkoutSport } from '@/lib/race-form'
import type { RacePriority } from '@prisma/client'

const PRIORITY_DOT: Record<RacePriority, string> = {
  A: 'bg-[var(--color-accent,#e11d48)] text-white',
  B: 'bg-[#3182CE] text-white',
  C: 'bg-[#5B6B7A] text-white',
}

function formatHeroDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function countdownPrimary(weeks: number, days: number): string {
  if (weeks < 0) return 'Past'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  if (weeks === 0) return `${days} days`
  if (weeks === 1) return '1 week'
  return `${weeks} weeks`
}

type RaceDetailSheetProps = {
  race: SeasonRace | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after delete or successful edit so callers can refresh. */
  onChanged?: () => void
  returnTo?: string
  /** Coach viewing an athlete race — reply in existing race thread. */
  isCoach?: boolean
}

export function RaceDetailSheet({
  race,
  open,
  onOpenChange,
  onChanged,
  returnTo = '/season',
  isCoach = false,
}: RaceDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const showReport = race ? raceHasReportContent(race) : false

  useEffect(() => {
    if (!open || !race) return
    const hasReport = raceHasReportContent(race)
    // After a race with a report: expand report, keep details collapsed.
    // Before / no report: keep details open so the sheet isn't empty.
    setDetailsOpen(!hasReport)
    setReportOpen(hasReport)
  }, [open, race?.id])

  if (!race) return null

  const weeks = weeksUntilRace(race.date)
  const days = daysUntil(race.date)
  const { isWatching, sportId, sportLabel, distLabel, priorityLabel } =
    raceSummaryMeta(race)
  const workoutSport = resolveWorkoutSport(sportId)
  const SportIcon = workoutSport ? WORKOUT_TYPE_ICONS[workoutSport] : Footprints
  const dateLabel = formatHeroDate(race.date)
  const countdownLabel = countdownPrimary(weeks, days)

  return (
    <>
      <Dialog
        open={open && !editOpen}
        onOpenChange={(next) => {
          if (!next) onOpenChange(false)
        }}
      >
        <DialogContent
          className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[44rem] flex-col gap-0 overflow-hidden p-0"
          closeButtonClassName="text-white/85 hover:bg-white/15 hover:text-white"
        >
          <DialogTitle className="sr-only">{race.name}</DialogTitle>
          <DialogDescription className="sr-only">Race details</DialogDescription>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <RaceHeroSummary race={race} flush />

            <div className="border-t-2 border-border">
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
                className="flex w-full items-start gap-3 bg-muted/45 px-4 py-3.5 text-left transition hover:bg-muted/60 sm:px-5"
              >
                <Layers
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
                    Race details
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    General information about the race.
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    detailsOpen && 'rotate-180',
                  )}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>

              <ExpandShell open={detailsOpen}>
                <div className="border-t border-border/60 bg-border">
                  <div className="grid grid-cols-1 gap-px sm:grid-cols-3">
                    <RaceStatCell icon={SportIcon} label="Sport">
                      {sportLabel}
                    </RaceStatCell>
                    <RaceStatCell icon={Route} label="Distance">
                      {distLabel || '—'}
                    </RaceStatCell>
                    <RaceStatCell icon={Clock} label="Countdown">
                      <span>{countdownLabel}</span>
                      <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                        {dateLabel}
                      </span>
                    </RaceStatCell>
                    <RaceStatCell icon={Target} label="Goal">
                      {isWatching ? '—' : race.goal?.trim() || '—'}
                    </RaceStatCell>
                    <RaceStatCell icon={isWatching ? Eye : Flag} label="Priority">
                      {isWatching ? (
                        <span className="font-semibold">{priorityLabel}</span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                              PRIORITY_DOT[race.priority],
                            )}
                          >
                            {race.priority}
                          </span>
                          <span>{RACE_PRIORITY_LABELS[race.priority]}</span>
                        </span>
                      )}
                    </RaceStatCell>
                    <RaceStatCell icon={Link2} label="Link">
                      {race.url ? (
                        <a
                          href={race.url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-semibold text-brand hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        '—'
                      )}
                    </RaceStatCell>
                  </div>
                </div>
              </ExpandShell>
            </div>

            {showReport ? (
              <div className="border-t-2 border-border">
                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  aria-expanded={reportOpen}
                  className="flex w-full items-start gap-3 bg-muted/45 px-4 py-3.5 text-left transition hover:bg-muted/60 sm:px-5"
                >
                  <FileText
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
                      Race report
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      My results and splits from the race.
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      reportOpen && 'rotate-180',
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>

                <ExpandShell open={reportOpen}>
                  <RaceReportPanel
                    race={race}
                    showPlan
                    hideHeader
                    className="border-t border-border/60"
                  />
                </ExpandShell>
              </div>
            ) : null}

            <RaceAskCoachSection
              race={race}
              isCoach={isCoach}
              onFeedbackSaved={onChanged}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="brand"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RaceEditModal
        race={race}
        open={editOpen}
        onOpenChange={setEditOpen}
        returnTo={returnTo}
        onSaved={() => {
          setEditOpen(false)
          onChanged?.()
          onOpenChange(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this race?"
        description={`${race.name} will be removed from your season plan.`}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const fd = new FormData()
            fd.set('raceId', race.id)
            await deleteRace(fd)
            setDeleteOpen(false)
            onChanged?.()
            onOpenChange(false)
          })
        }}
      />
    </>
  )
}
