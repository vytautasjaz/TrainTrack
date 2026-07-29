'use client'

import { Clock, ExternalLink, Flame, Home, Link2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DialogClose } from '@/components/ui/dialog'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { SwimWorkoutBuilder } from '@/components/swim-workout/swim-workout-builder'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  getWorkoutCardDuration,
  getWorkoutCardHero,
  getWorkoutCardSubtitle,
} from '@/lib/workout-card'
import { bikeEnvironmentFromTags } from '@/lib/bike-workout/defaults'
import { getWorkoutEditorSportTheme } from '@/lib/workout-editor/sport-theme'
import { getSessionIntensity } from '@/lib/workout-builder/session-intensity'
import {
  buildAthleteStructureDisplay,
  type PhaseBlockDisplay,
} from '@/lib/workout-builder/athlete-structure-display'
import { smartBlockAccentDisplay } from '@/lib/workout-builder/smart-blocks'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import { hasSwimStructureContent } from '@/lib/swim-workout/calculations'
import { swimEnvironmentShortLabel } from '@/lib/swim-workout/ui'
import { parseDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'

function formatWorkoutDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
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

type AthleteWorkoutDetailCardProps = {
  workout: PlanWorkoutDetail
  className?: string
  /** When false, hide the standalone Strava link (athlete modal shows it in the log section). */
  showStravaLink?: boolean
}

export function AthleteWorkoutDetailCard({
  workout,
  className,
  showStravaLink = true,
}: AthleteWorkoutDetailCardProps) {
  const theme = getWorkoutEditorSportTheme(workout.type)
  const hero = getWorkoutCardHero(workout, workout.status)
  const secondary = getWorkoutCardDuration(workout, workout.status)
  const subtitle = getWorkoutCardSubtitle(workout)
  const sessionIntensity = getSessionIntensity(workout.sessionType)
  const isIndoor =
    workout.type === 'BIKE' && bikeEnvironmentFromTags(workout.tags) === 'indoor'
  const swimEnv = workout.type === 'SWIM' ? workout.swimEnvironment : null
  const hasSwimStructure = hasSwimStructureContent(workout.swimStructure)

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

  const PrimaryIcon = hero?.kind === 'duration' ? Clock : Link2
  const dateLabel = formatWorkoutDate(workout.dateKey)
  const heroGradient =
    workout.type === 'RUN'
      ? 'from-white to-orange-100'
      : workout.type === 'BIKE'
        ? 'from-white to-sky-100'
        : workout.type === 'SWIM'
          ? 'from-white to-cyan-100'
          : 'from-white to-emerald-100'

  return (
    <div className={cn('space-y-5', className)}>
      {/* Borderless hero — soft sport wash, no outlined frame */}
      <div
        className={cn(
          'relative -mx-5 -mt-3 space-y-4 rounded-none border-0 border-b border-black/20 bg-gradient-to-b px-5 pb-6 pt-6',
          heroGradient,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <WorkoutSportIcon
              type={workout.type}
              isRace={workout.isRace}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[17px] font-semibold leading-snug text-[#111827]">
                  {workout.title}
                </h2>
                {sessionIntensity ? (
                  <Badge className={cn('gap-1', sessionIntensity.className)}>
                    <Flame className="h-3 w-3" aria-hidden />
                    {sessionIntensity.label}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-[#6B7280]">{dateLabel}</p>
            </div>
          </div>
          <DialogClose className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {hero ? (
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border',
                theme.controlOn,
              )}
              aria-hidden
            >
              <PrimaryIcon className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-1">
                {hero.approximate ? (
                  <span className="text-[28px] font-medium leading-none text-muted-foreground">
                    ~
                  </span>
                ) : null}
                <span className="text-[34px] font-bold leading-none tracking-tight text-[#111827] tabular-nums">
                  {hero.value}
                </span>
                {hero.unit ? (
                  <span className="text-[18px] font-medium leading-none text-[#111827]">
                    {hero.unit}
                  </span>
                ) : null}
              </div>

              {secondary ? (
                <div className="mt-2 flex items-center gap-1.5 text-[14px] font-medium">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" aria-hidden />
                  <span className="tabular-nums text-[#111827]">{secondary.actual}</span>
                  {secondary.planned ? (
                    <>
                      <span className="text-[#9CA3AF]">/</span>
                      <span className="tabular-nums text-[#9CA3AF]">{secondary.planned}</span>
                    </>
                  ) : null}
                </div>
              ) : null}

              {subtitle ? (
                <p className="mt-2 text-[13px] leading-snug text-[#6B7280]">{subtitle}</p>
              ) : null}
            </div>
          </div>
        ) : subtitle ? (
          <p className="text-[13px] leading-snug text-[#6B7280]">{subtitle}</p>
        ) : null}

        {(isIndoor || swimEnv) && (
          <div className="flex flex-wrap items-center gap-2">
            {isIndoor ? (
              <span
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-[6px] border px-2.5 text-[11px] font-medium',
                  theme.controlOn,
                )}
                title="Indoor"
                aria-label="Indoor"
              >
                <Home className="h-3.5 w-3.5" />
                Indoor
              </span>
            ) : null}
            {swimEnv ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-sky-800"
                aria-label={`Environment: ${swimEnvironmentShortLabel(swimEnv)}`}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    swimEnv === 'POOL' ? 'bg-sky-500' : 'bg-cyan-600',
                  )}
                  aria-hidden
                />
                {swimEnvironmentShortLabel(swimEnv)}
              </span>
            ) : null}
          </div>
        )}
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

      {showStravaLink && workout.result?.stravaActivityUrl ? (
        <a
          href={workout.result.stravaActivityUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FC4C02] hover:underline"
        >
          View on Strava
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
    </div>
  )
}
