'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Clock, ExternalLink, Link2, MoreHorizontal, Unlink, X } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { DialogClose } from '@/components/ui/dialog'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { SwimWorkoutBuilder } from '@/components/swim-workout/swim-workout-builder'
import {
  StravaDetachButton,
  StravaLinkPicker,
} from '@/components/plan/strava-activity-picker'
import { StravaSyncedIndicator } from '@/components/plan/strava-synced-indicator'
import {
  WorkoutStatusIcon,
  workoutStatusKindFromLogType,
} from '@/components/ui/workout-status-icon'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  isStravaSynced,
  resolveAthleteLogType,
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
import { smartBlockAccentDisplay } from '@/lib/workout-builder/smart-blocks'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import { hasSwimStructureContent } from '@/lib/swim-workout/calculations'
import { getSportEditorConfig } from '@/lib/workout-editor/types'
import { parseDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'

function formatWorkoutDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function heroGradientClass(sportType: WorkoutType) {
  switch (sportType) {
    case WorkoutType.RUN:
      return 'from-white to-orange-100'
    case WorkoutType.BIKE:
      return 'from-white to-sky-100'
    case WorkoutType.SWIM:
      return 'from-white to-cyan-100'
    case WorkoutType.STRENGTH:
      return 'from-white to-emerald-100'
    case WorkoutType.HYROX:
      return 'from-white to-rose-100'
    case WorkoutType.TRIATHLON:
      return 'from-white to-violet-100'
    default:
      return 'from-white to-slate-100'
  }
}

function splitDistanceDisplay(distance: string): { value: string; unit: string } {
  const trimmed = distance.trim()
  const match = trimmed.match(/^(.+?)\s+(km|m)$/i)
  if (match) {
    return { value: match[1]!, unit: match[2]!.toLowerCase() }
  }
  return { value: trimmed, unit: '' }
}

function timelineSubtitle(block: PhaseBlockDisplay) {
  if (block.intervalPreview) {
    const target = block.paceLabel ?? block.zoneLabel
    const workLine = `${block.intervalPreview.reps} x ${block.intervalPreview.work}${
      target ? ` @ ${target}` : ''
    }`
    const recoveryLine = block.recoveryNote ?? `${block.intervalPreview.recovery} recovery`
    return { primary: workLine, secondary: recoveryLine }
  }

  const target = block.paceLabel ?? block.zoneLabel
  return { primary: target ? `${block.primary} @ ${target}` : block.primary, secondary: null }
}

function timelineDistanceLabel(block: PhaseBlockDisplay) {
  if (block.intervalPreview) {
    const work = block.intervalPreview.work
    const match = work.match(/(\d+(?:\.\d+)?)\s*(km|m)\b/i)
    if (!match) return null

    const distanceValue = Number(match[1])
    const unit = match[2].toLowerCase()
    const total = distanceValue * block.intervalPreview.reps
    if (unit === 'km') return `${Number(total.toFixed(1)).toString()} km`
    if (total >= 1000) return `${Number((total / 1000).toFixed(1)).toString()} km`
    return `${Math.round(total)} m`
  }

  const match = block.primary.match(/(\d+(?:\.\d+)?)\s*(km|m)\b/i)
  if (!match) return null
  return `${match[1]} ${match[2].toLowerCase()}`
}

function WorkoutDetailTimelineRow({ block }: { block: PhaseBlockDisplay }) {
  const accent = smartBlockAccentDisplay(block.accent)
  const subtitle = timelineSubtitle(block)
  const rightSecondaryLabel = timelineDistanceLabel(block)
  const durationLabel = block.durationLabel
    ? block.durationApproximate
      ? block.durationLabel
      : block.durationLabel.replace(/^~/, '')
    : null

  return (
    <div className="flex gap-0 border-b border-border/50 py-3.5 first:pt-2 last:border-b-0">
      <div className={cn('w-1 shrink-0 self-stretch rounded-full', accent.bar)} aria-hidden />
      <div className="flex min-w-0 flex-1 items-start gap-3.5 pl-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#111827]">{block.title}</p>
          {subtitle.primary ? (
            <p className="mt-0.5 truncate text-[13px] leading-snug text-[#6B7280]">
              {subtitle.primary}
            </p>
          ) : null}
          {subtitle.secondary ? (
            <p className="mt-0.5 truncate text-[13px] leading-snug text-[#6B7280]">
              {subtitle.secondary}
            </p>
          ) : null}
        </div>

        <div className="min-w-[4.75rem] pt-0.5 text-right">
          {durationLabel ? (
            <p className="text-[14px] font-semibold tabular-nums text-[#111827]">{durationLabel}</p>
          ) : null}
          {rightSecondaryLabel ? (
            <p className="mt-0.5 text-[13px] font-medium tabular-nums text-[#6B7280]">
              {rightSecondaryLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ReadOnlyMetricColumn({
  label,
  icon,
  value,
  unit,
  approximate,
  planned,
  isPrimary,
}: {
  label: string
  icon: ReactNode
  value: string | null
  unit: string | null
  approximate?: boolean
  planned?: string | null
  isPrimary: boolean
}) {
  return (
    <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-1.5 text-center">
      <div className="inline-flex h-4 shrink-0 items-center justify-center gap-1.5 text-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>

      <div className="mt-1.5 flex h-8 w-full shrink-0 items-center justify-center gap-0.5">
        {approximate && value ? (
          <span
            className={cn(
              'font-semibold leading-none text-muted-foreground',
              isPrimary ? 'text-xl' : 'text-sm',
            )}
          >
            ~
          </span>
        ) : null}
        <span
          className={cn(
            'tabular-nums leading-none tracking-tight text-[#111827]',
            isPrimary ? 'text-[32px] font-bold' : 'text-[18px] font-bold',
            !value && 'text-muted-foreground/40',
          )}
        >
          {value || '—'}
        </span>
        {unit ? (
          <span
            className={cn(
              'font-semibold leading-none tracking-tight text-[#111827]',
              isPrimary ? 'text-base' : 'text-[11px]',
            )}
          >
            {unit}
          </span>
        ) : null}
      </div>

      {planned ? (
        <p className="mt-1 text-[11px] font-medium tabular-nums text-[#9CA3AF]">
          / {planned}
        </p>
      ) : (
        <div className="mt-1.5 h-4 shrink-0" aria-hidden />
      )}
    </div>
  )
}

type AthleteWorkoutDetailCardProps = {
  workout: PlanWorkoutDetail
  className?: string
  /** Athlete can link / detach Strava from the hero ⋮ menu. */
  showStravaActions?: boolean
  onStravaChange?: () => void
}

export function AthleteWorkoutDetailCard({
  workout,
  className,
  showStravaActions = false,
  onStravaChange,
}: AthleteWorkoutDetailCardProps) {
  const [stravaConnected, setStravaConnected] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [detachOpen, setDetachOpen] = useState(false)

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
  const logType = resolveAthleteLogType(workout)
  const statusKind = logType ? workoutStatusKindFromLogType(logType) : null

  const showMenu =
    Boolean(stravaUrl) ||
    (showStravaActions && (stravaConnected || stravaSynced))

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
  const distanceIsPrimary = primary === 'distance' && config.showDistance
  const durationIsPrimary = !distanceIsPrimary

  const durationUnit =
    durationUnitFromTags(workout.tags) ?? config.durationUnitDefault

  const distanceParts = metrics.distance ? splitDistanceDisplay(metrics.distance) : null
  const plannedDistanceParts = metrics.plannedDistance
    ? splitDistanceDisplay(metrics.plannedDistance)
    : null

  const durationMinutes =
    workout.status === 'COMPLETED' &&
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

  const dateLabel = formatWorkoutDate(workout.dateKey)
  const showMetricsRow =
    Boolean(intensityLabel) || distanceOnCard || durationOnCard

  return (
    <div className={cn('space-y-5', className)}>
      <div
        className={cn(
          'relative -mx-5 -mt-3 rounded-none border-0 border-b border-black/20 bg-gradient-to-b px-5 pb-6 pt-5',
          heroGradientClass(workout.type),
        )}
      >
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 sm:right-4">
          {stravaSynced ? (
            <StravaSyncedIndicator workout={workout} variant="mark" size="xs" />
          ) : null}
          {statusKind && statusKind !== 'planned' ? (
            <WorkoutStatusIcon kind={statusKind} size="xs" />
          ) : null}

          {showMenu ? (
            <DropdownMenu.Root>
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
                  className="z-[220] min-w-[12.5rem] overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-lg"
                >
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
                      onSelect={(e) => {
                        e.preventDefault()
                        setLinkOpen(true)
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-foreground/[0.04]"
                    >
                      <Link2 className="h-3.5 w-3.5 text-[#FC4C02]" />
                      Link Strava activity
                    </DropdownMenu.Item>
                  ) : null}
                  {showStravaActions && stravaSynced ? (
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault()
                        setDetachOpen(true)
                      }}
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

        <p className="mb-2.5 pr-20 text-[13px] leading-snug text-[#6B7280]">{dateLabel}</p>

        <div className="flex items-start gap-3">
          <WorkoutSportIcon
            type={workout.type}
            isRace={workout.isRace}
            size="md"
            className="mt-0.5 shrink-0"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pr-8">
            <h2 className="text-[17px] font-semibold leading-snug text-[#111827]">
              {workout.title}
            </h2>
            {subtitle ? (
              <p className="text-[13px] leading-snug text-[#6B7280]">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {showMetricsRow ? (
          <div className="mt-[18px] flex min-w-0 items-stretch overflow-hidden">
            {intensityLabel ? (
              <>
                <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center overflow-hidden px-2 text-center">
                  <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Intensity
                  </span>
                  <div className="mt-1.5 flex h-8 w-full shrink-0 items-center justify-center overflow-hidden">
                    <span className="truncate text-[20px] font-bold leading-tight text-[#111827]">
                      {intensityLabel}
                    </span>
                  </div>
                  <div className="mt-1.5 h-4 shrink-0" aria-hidden />
                </div>
                {(distanceOnCard || durationOnCard) && (
                  <div className="w-px shrink-0 self-stretch bg-foreground/20" />
                )}
              </>
            ) : null}

            {distanceOnCard ? (
              <>
                <ReadOnlyMetricColumn
                  label="Distance"
                  icon={<Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
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
                  isPrimary={distanceIsPrimary}
                />
                {durationOnCard ? (
                  <div className="w-px shrink-0 self-stretch bg-foreground/20" />
                ) : null}
              </>
            ) : null}

            {durationOnCard ? (
              <ReadOnlyMetricColumn
                label="Time"
                icon={<Clock className="h-3.5 w-3.5" strokeWidth={1.75} />}
                value={durationParts?.value ?? null}
                unit={durationParts?.unit ?? null}
                approximate={approx.duration}
                planned={
                  metrics.showPlannedComparison && plannedDurationParts
                    ? `${plannedDurationParts.value} ${plannedDurationParts.unit}`
                    : null
                }
                isPrimary={durationIsPrimary}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {hasSwimStructure && workout.swimStructure ? (
        <section className="space-y-2 pt-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Workout Details
          </p>
          <SwimWorkoutBuilder
            sections={workout.swimStructure.sections}
            onChange={() => {}}
            readOnly
          />
        </section>
      ) : structureDisplay && structureDisplay.blocks.length > 0 ? (
        <section className="space-y-1.5 pt-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Workout Details
          </p>
          <div>
            {structureDisplay.blocks.map((block) => (
              <WorkoutDetailTimelineRow key={block.id} block={block} />
            ))}
          </div>
        </section>
      ) : workout.description?.trim() && !subtitle ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{workout.description.trim()}</p>
      ) : null}

      {workout.coachNotes?.trim() ? (
        <section className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Coach notes
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {workout.coachNotes.trim()}
          </p>
        </section>
      ) : null}
    </div>
  )
}
