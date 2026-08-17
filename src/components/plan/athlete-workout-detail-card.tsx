'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  CalendarClock,
  Clock,
  ExternalLink,
  Flame,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Unlink,
  X,
} from 'lucide-react'
import { WorkoutStatus, WorkoutType } from '@prisma/client'
import { DialogClose } from '@/components/ui/dialog'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { SelfAddedBadge } from '@/components/plan/self-added-badge'
import { RescheduleBadge } from '@/components/plan/reschedule-badge'
import { RescheduleWorkoutModal } from '@/components/plan/reschedule-workout-modal'
import { SwimWorkoutBuilder } from '@/components/swim-workout/swim-workout-builder'
import {
  StravaDetachButton,
  StravaLinkPicker,
} from '@/components/plan/strava-activity-picker'
import { AthleteWorkoutQuickActions } from '@/components/plan/athlete-workout-quick-actions'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import { StatusPill } from '@/components/ui/status-pill'
import { WorkoutStructureChart } from '@/components/workout-builder/workout-structure-chart'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  athleteHasQuickLogActions,
  isStravaSynced,
} from '@/lib/plan-workout'
import { isStravaConnected } from '@/app/actions/strava'
import {
  approxMetricsFromTags,
  durationUnitFromTags,
  primaryMetricFromTags,
  secondaryMetricVisibleFromTags,
} from '@/lib/workout-approx-tags'
import {
  formatWorkoutCardDurationParts,
  getWorkoutCardSubtitle,
} from '@/lib/workout-card'
import { getWorkoutPlanMetrics } from '@/lib/workout-plan-metrics'
import { bikeKindFromTags, bikeKindLabel, bikePrimaryMetricFromTags } from '@/lib/bike-workout/defaults'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import {
  buildAthleteStructureDisplay,
  type PhaseBlockDisplay,
} from '@/lib/workout-builder/athlete-structure-display'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import { hasSwimStructureContent } from '@/lib/swim-workout/calculations'
import { getSportEditorConfig } from '@/lib/workout-editor/types'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { parseDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { PlanColorMode } from '@/lib/plan-sport-filter'

const SPORT_ACCENT: Record<WorkoutType, string> = {
  RUN: 'var(--color-sport-run)',
  BIKE: 'var(--color-sport-bike)',
  SWIM: 'var(--color-sport-swim)',
  STRENGTH: 'var(--color-sport-strength)',
  HYROX: 'var(--color-sport-hyrox)',
  TRIATHLON: 'var(--color-sport-tri)',
  RECOVERY: 'var(--color-sport-recovery)',
  REST: 'var(--color-sport-rest)',
}

function formatWorkoutDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function splitDistanceDisplay(distance: string): { value: string; unit: string } {
  const trimmed = distance.trim()
  const match = trimmed.match(/^(.+?)\s+(km|m)$/i)
  if (match) {
    return { value: match[1]!, unit: match[2]!.toLowerCase() }
  }
  return { value: trimmed, unit: '' }
}

function blockSubtitle(block: PhaseBlockDisplay) {
  if (block.intervalPreview) {
    const target = block.paceLabel ?? block.zoneLabel
    return `${block.intervalPreview.reps} × ${block.intervalPreview.work}${
      target ? ` @ ${target}` : ''
    }`
  }

  const target = block.paceLabel ?? block.zoneLabel
  return target ? `${block.primary} @ ${target}` : block.primary
}

function isHardIntensity(label: string | null): boolean {
  if (!label) return false
  return /hard|vo2|threshold|race|interval/i.test(label)
}

function HeroMetricColumn({
  label,
  value,
  unit,
  approximate,
  planned,
  icon,
}: {
  label: string
  value: string | null
  unit?: string | null
  approximate?: boolean
  planned?: string | null
  icon?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-1.5 text-center">
      <div className="inline-flex h-4 shrink-0 items-center justify-center gap-1 text-[#737986]">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1.5 flex h-9 w-full shrink-0 items-center justify-center gap-0.5">
        {approximate && value ? (
          <span className="text-sm font-semibold leading-none text-[#9aa0a8]">~</span>
        ) : null}
        <span
          className={cn(
            'max-w-full truncate text-[22px] font-bold leading-none tracking-tight tabular-nums text-[#111111]',
            !value && 'text-[#c9cbc7]',
          )}
        >
          {value || '—'}
        </span>
        {unit ? (
          <span className="text-[12px] font-semibold leading-none tracking-tight text-[#111111]">
            {unit}
          </span>
        ) : null}
      </div>
      {planned ? (
        <p className="mt-1 text-[11px] font-medium tabular-nums text-[#9aa0a8]">/ {planned}</p>
      ) : (
        <div className="mt-1 h-4 shrink-0" aria-hidden />
      )}
    </div>
  )
}

function StructureRow({
  block,
  sportColor,
}: {
  block: PhaseBlockDisplay
  sportColor: string
}) {
  const subtitle = blockSubtitle(block)
  const durationLabel = block.durationLabel
    ? block.durationApproximate
      ? block.durationLabel
      : block.durationLabel.replace(/^~/, '')
    : null

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#f4f4f3]/80">
      <div
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: sportColor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[#111111]">{block.title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[12px] text-[#737986]">{subtitle}</p>
        ) : null}
        {block.recoveryNote ? (
          <p className="mt-0.5 truncate text-[12px] text-[#9aa0a8]">{block.recoveryNote}</p>
        ) : null}
      </div>
      {durationLabel ? (
        <span className="shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums text-[#737986]">
          {durationLabel}
        </span>
      ) : null}
    </div>
  )
}

type AthleteWorkoutDetailCardProps = {
  workout: PlanWorkoutDetail
  className?: string
  /** When false (athlete modal), today/past workouts show Done/Skip in the hero. */
  isCoach?: boolean
  /** Athlete can link / detach Strava from the hero ⋮ menu. */
  showStravaActions?: boolean
  onStravaChange?: () => void
  /** Reschedule + Share live under the hero ⋮ menu (athlete modal). */
  showUtilityActions?: boolean
  /** Completed / Skipped chip next to Strava or Done/Skip (athlete modal only). */
  showStatusBadge?: boolean
  /** Matches training Color / Plain / Completion chrome. */
  colorMode?: PlanColorMode
  onShare?: () => void
  onRescheduleDone?: () => void
}

export function AthleteWorkoutDetailCard({
  workout,
  className,
  isCoach = true,
  showStravaActions = false,
  onStravaChange,
  showUtilityActions = false,
  showStatusBadge = false,
  colorMode = 'sport',
  onShare,
  onRescheduleDone,
}: AthleteWorkoutDetailCardProps) {
  const [stravaConnected, setStravaConnected] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [detachOpen, setDetachOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  useEffect(() => {
    if (!showStravaActions) return
    let cancelled = false
    void isStravaConnected()
      .then((value) => {
        if (!cancelled) setStravaConnected(value)
      })
      .catch(() => {
        if (!cancelled) setStravaConnected(false)
      })
    return () => {
      cancelled = true
    }
  }, [showStravaActions])

  const config = getSportEditorConfig(workout.type)
  const metrics = getWorkoutPlanMetrics(workout, workout.status)
  const subtitle = getWorkoutCardSubtitle(workout)
  const hasSwimStructure = hasSwimStructureContent(workout.swimStructure)
  const approx = approxMetricsFromTags(workout.tags)
  const stravaSynced = isStravaSynced(workout)
  const stravaUrl = workout.result?.stravaActivityUrl ?? null
  const showQuickLog = athleteHasQuickLogActions(workout, isCoach)
  const sportColor = SPORT_ACCENT[workout.type]
  const sportLabel = WORKOUT_TYPE_LABELS[workout.type]
  const completed = workout.status === WorkoutStatus.COMPLETED
  const skipped = workout.status === WorkoutStatus.SKIPPED
  const statusChrome = colorMode === 'completion'
  const accentColor =
    statusChrome && completed ? '#1b7a3d' : statusChrome && skipped ? '#b91c1c' : sportColor
  const accentSoft =
    statusChrome && completed ? '#86d39a' : statusChrome && skipped ? '#f5a3a3' : sportColor

  const canReschedule =
    showUtilityActions &&
    !workout.isRace &&
    !workout.isRescheduleGhost &&
    workout.type !== WorkoutType.REST &&
    workout.type !== WorkoutType.RECOVERY

  const showMenu =
    Boolean(stravaUrl) ||
    (showStravaActions && (stravaConnected || stravaSynced)) ||
    canReschedule ||
    Boolean(showUtilityActions && onShare)

  const primary =
    primaryMetricFromTags(workout.tags) ??
    (workout.type === WorkoutType.BIKE
      ? bikePrimaryMetricFromTags(workout.tags)
      : null) ??
    (config.showDistance ? 'distance' : 'duration')
  const secondaryVisible = secondaryMetricVisibleFromTags(workout.tags)

  const distanceOnCard =
    config.showDistance && (primary === 'distance' || secondaryVisible)
  const durationOnCard = primary === 'duration' || !config.showDistance || secondaryVisible

  const durationUnit =
    durationUnitFromTags(workout.tags) ?? config.durationUnitDefault

  const distanceParts = metrics.distance ? splitDistanceDisplay(metrics.distance) : null
  const plannedDistanceParts = metrics.plannedDistance
    ? splitDistanceDisplay(metrics.plannedDistance)
    : null

  const durationMinutes =
    workout.status === WorkoutStatus.COMPLETED &&
    workout.result?.actualDuration != null &&
    workout.result.actualDuration > 0
      ? Math.round(workout.result.actualDuration)
      : workout.plannedDuration != null && workout.plannedDuration > 0
        ? Math.round(workout.plannedDuration)
        : null
  const durationParts =
    durationMinutes != null
      ? formatWorkoutCardDurationParts(durationMinutes, durationUnit)
      : null
  const plannedDurationParts =
    metrics.showPlannedComparison &&
    workout.plannedDuration != null &&
    workout.plannedDuration > 0
      ? formatWorkoutCardDurationParts(Math.round(workout.plannedDuration), durationUnit)
      : null

  const bikeKind =
    workout.type === WorkoutType.BIKE ? bikeKindFromTags(workout.tags ?? []) : null
  const intensityLabel =
    workout.type === WorkoutType.SWIM
      ? null
      : bikeKind
        ? bikeKindLabel(bikeKind)
        : workout.sessionType
          ? getSessionTypeLabel(workout.sessionType, workout.type)
          : null

  const structureDisplay =
    !hasSwimStructure &&
    workout.structure &&
    hasStructureContent(workout.structure)
      ? buildAthleteStructureDisplay({
          structure: workout.structure,
          plannedDistance: workout.plannedDistance,
          plannedDuration: workout.plannedDuration,
          sportType: workout.type,
        })
      : null

  const hasBuilderStructure = Boolean(
    structureDisplay && structureDisplay.blocks.length > 0,
  )

  const fullDescription = workout.description?.trim() || null
  const showDescriptionDetails =
    Boolean(fullDescription) &&
    !hasSwimStructure &&
    !hasBuilderStructure

  const showMetricsRow =
    Boolean(intensityLabel) || distanceOnCard || durationOnCard

  const statusBadge =
    showStatusBadge && completed ? (
      <StatusPill tone="completed">Completed</StatusPill>
    ) : showStatusBadge && skipped ? (
      <StatusPill tone="skipped">Skipped</StatusPill>
    ) : null

  const dateLabel = formatWorkoutDate(workout.dateKey)
  const coachNotes = workout.coachNotes?.trim() || null

  return (
    <div className={cn(className)}>
      <div className="px-5 pb-4 pt-5">
        <div
          className={cn(
            'relative flex items-start gap-3',
            statusBadge && (showQuickLog || stravaSynced)
              ? 'pr-[13rem]'
              : showQuickLog || stravaSynced
                ? 'pr-[7.5rem]'
                : statusBadge
                  ? 'pr-[9rem]'
                  : 'pr-16',
          )}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background: `color-mix(in srgb, ${accentSoft} 12%, white)`,
              color: accentColor,
            }}
          >
            <WorkoutSportIcon
              type={workout.type}
              isRace={workout.isRace}
              size="xs"
              appearance="outline"
              className="!h-auto !w-auto !border-0 !bg-transparent"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h2 className="text-[18px] font-bold leading-snug text-[#111111]">
                {workout.title}
              </h2>
              {workout.selfLogged ? <SelfAddedBadge /> : null}
              <RescheduleBadge workout={workout} />
            </div>
            <p className="mt-0.5 text-[12px] text-[#737986]">
              <span className="font-semibold" style={{ color: accentColor }}>
                {sportLabel}
              </span>
              {' · '}
              {dateLabel}
              {subtitle && !showDescriptionDetails && !hasBuilderStructure ? (
                <>
                  {' · '}
                  {subtitle}
                </>
              ) : null}
            </p>
          </div>

          <div className="absolute right-0 top-0 z-10 flex items-center gap-1.5">
            {statusBadge}
            {stravaSynced ? (
              <StravaSyncedIndicator workout={workout} variant="wordmark" size="xs" />
            ) : showQuickLog ? (
              <AthleteWorkoutQuickActions
                workout={workout}
                isCoach={isCoach}
                size="sm"
              />
            ) : null}

            {showMenu ? (
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Workout actions"
                    className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    avoidCollisions={false}
                    className="z-[220] min-w-[12.5rem] overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-lg"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    {canReschedule ? (
                      <DropdownMenu.Item
                        onSelect={() => setRescheduleOpen(true)}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        Reschedule
                      </DropdownMenu.Item>
                    ) : null}
                    {showUtilityActions && onShare ? (
                      <DropdownMenu.Item
                        onSelect={() => onShare()}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Share card
                      </DropdownMenu.Item>
                    ) : null}
                    {stravaUrl ? (
                      <DropdownMenu.Item
                        onSelect={() => {
                          window.open(stravaUrl, '_blank', 'noopener,noreferrer')
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[#FC4C02]" />
                        View on Strava
                      </DropdownMenu.Item>
                    ) : null}
                    {showStravaActions && stravaConnected && !stravaSynced ? (
                      <DropdownMenu.Item
                        onSelect={() => setLinkOpen(true)}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <Link2 className="h-3.5 w-3.5 text-[#FC4C02]" />
                        Link Strava activity
                      </DropdownMenu.Item>
                    ) : null}
                    {showStravaActions && stravaSynced ? (
                      <DropdownMenu.Item
                        onSelect={() => setDetachOpen(true)}
                        className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                      >
                        <Unlink className="h-3.5 w-3.5 text-muted-foreground" />
                        Detach Strava activity
                      </DropdownMenu.Item>
                    ) : null}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : null}

            <DialogClose className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </div>

        {showStravaActions ? (
          <>
            <StravaLinkPicker
              workoutId={workout.id}
              hideTrigger
              open={linkOpen}
              onOpenChange={setLinkOpen}
              onLinked={onStravaChange}
            />
            <StravaDetachButton
              workoutId={workout.id}
              hideTrigger
              open={detachOpen}
              onOpenChange={setDetachOpen}
              onDetached={onStravaChange}
            />
          </>
        ) : null}

        {canReschedule ? (
          <RescheduleWorkoutModal
            workout={workout}
            open={rescheduleOpen}
            onOpenChange={setRescheduleOpen}
            onDone={onRescheduleDone}
          />
        ) : null}

        {showMetricsRow ? (
          <div className="mt-4 flex min-w-0 items-stretch overflow-hidden">
            {intensityLabel ? (
              <>
                <HeroMetricColumn
                  label="Workout type"
                  value={intensityLabel}
                  icon={
                    isHardIntensity(intensityLabel) ? (
                      <Flame className="h-3 w-3 text-[#B91C1C]" strokeWidth={2.25} />
                    ) : undefined
                  }
                />
                {distanceOnCard || durationOnCard ? (
                  <div className="w-px shrink-0 self-stretch bg-[#e2e3e1]" />
                ) : null}
              </>
            ) : null}

            {distanceOnCard ? (
              <>
                <HeroMetricColumn
                  label="Distance"
                  value={distanceParts?.value ?? null}
                  unit={distanceParts?.unit || config.distanceUnit}
                  approximate={approx.distance}
                  planned={
                    metrics.showPlannedComparison && plannedDistanceParts
                      ? `${plannedDistanceParts.value}${
                          plannedDistanceParts.unit
                            ? ` ${plannedDistanceParts.unit}`
                            : ''
                        }`
                      : null
                  }
                  icon={<Link2 className="h-3 w-3" strokeWidth={1.75} />}
                />
                {durationOnCard ? (
                  <div className="w-px shrink-0 self-stretch bg-[#e2e3e1]" />
                ) : null}
              </>
            ) : null}

            {durationOnCard ? (
              <HeroMetricColumn
                label="Time"
                value={durationParts?.value ?? null}
                unit={durationParts?.unit ?? null}
                approximate={approx.duration}
                planned={
                  metrics.showPlannedComparison && plannedDurationParts
                    ? `${plannedDurationParts.value} ${plannedDurationParts.unit}`
                    : null
                }
                icon={<Clock className="h-3 w-3" strokeWidth={1.75} />}
              />
            ) : null}
          </div>
        ) : null}

        {hasBuilderStructure && workout.structure ? (
          <div className="mt-4">
            <WorkoutStructureChart
              structure={workout.structure}
              size="md"
              showCaption
              tone={
                statusChrome && completed
                  ? 'completed'
                  : statusChrome && skipped
                    ? 'skipped'
                    : 'default'
              }
            />
          </div>
        ) : null}
      </div>

      {hasSwimStructure && workout.swimStructure ? (
        <section className="space-y-2 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
            Workout details
          </p>
          <SwimWorkoutBuilder
            sections={workout.swimStructure.sections}
            onChange={() => {}}
            readOnly
          />
        </section>
      ) : hasBuilderStructure && structureDisplay ? (
        <div className="divide-y divide-[#e2e3e1]/80">
          {structureDisplay.blocks.map((block) => (
            <StructureRow key={block.id} block={block} sportColor={sportColor} />
          ))}
        </div>
      ) : showDescriptionDetails && fullDescription ? (
        <section className="space-y-1.5 px-5 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
            Session plan
          </p>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#111111]">
            {fullDescription}
          </p>
        </section>
      ) : null}

      {coachNotes ? (
        <section className="space-y-1.5 px-5 py-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
            <MessageSquare className="h-3 w-3" strokeWidth={2.25} />
            Coach notes
            {workout.coachNotesPrivate ? (
              <span className="ml-0.5 font-medium normal-case tracking-normal">
                · private
              </span>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#111111]">
            {coachNotes}
          </p>
        </section>
      ) : null}
    </div>
  )
}
