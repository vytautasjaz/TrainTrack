'use client'

import type { RaceLegKind } from '@prisma/client'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  RACE_LEG_LABELS,
  TRIATHLON_LEG_ORDER,
  raceLegSupportsStrava,
  type RaceLegView,
} from '@/lib/race-legs'
import { RaceStravaLinkPicker } from '@/components/races/race-strava-link-picker'
import { cn } from '@/lib/utils'

type RaceLegsPlanFieldsProps = {
  /** When editing an existing race, pass legs + raceId for Strava linking. */
  raceId?: string
  legs?: RaceLegView[]
  /** Triathlon Custom — planned swim/bike/run distances. */
  showDistances?: boolean
  className?: string
}

function legDistanceDefault(leg: RaceLegView | undefined, kind: RaceLegKind): string {
  if (!leg?.plannedDistanceKm || leg.plannedDistanceKm <= 0) return ''
  if (kind === 'SWIM') {
    return String(Math.round(leg.plannedDistanceKm * 1000))
  }
  const km = leg.plannedDistanceKm
  return km % 1 === 0 ? String(km) : String(Math.round(km * 10) / 10)
}

export function RaceLegsPlanFields({
  raceId,
  legs,
  showDistances = false,
  className,
}: RaceLegsPlanFieldsProps) {
  const byKind = new Map((legs ?? []).map((leg) => [leg.kind, leg]))

  return (
    <div className={cn('space-y-3 rounded-[6px] border border-border/70 bg-muted/20 p-3', className)}>
      <div>
        <p className="text-sm font-medium">Triathlon plan splits</p>
        <p className="text-xs text-muted-foreground">
          {showDistances
            ? 'Set custom distances and target times for swim, bike, and run.'
            : 'Target times for swim, transitions, bike, and run. Link Strava after the race from the report.'}
        </p>
      </div>
      <div className="space-y-2.5">
        {TRIATHLON_LEG_ORDER.map((kind) => {
          const leg = byKind.get(kind)
          const sportLeg = raceLegSupportsStrava(kind)
          return (
            <div
              key={kind}
              className="grid gap-2 rounded-[6px] border border-border/50 bg-card px-3 py-2.5 sm:grid-cols-[5rem_1fr]"
            >
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {RACE_LEG_LABELS[kind]}
              </p>
              <div className="space-y-2">
                {showDistances && sportLeg ? (
                  <FormField
                    label={kind === 'SWIM' ? 'Distance (m)' : 'Distance (km)'}
                    hint={
                      kind === 'SWIM'
                        ? 'e.g. 1500'
                        : kind === 'BIKE'
                          ? 'e.g. 40'
                          : 'e.g. 10'
                    }
                  >
                    <Input
                      name={
                        kind === 'SWIM'
                          ? `legPlannedDistanceM_${kind}`
                          : `legPlannedDistanceKm_${kind}`
                      }
                      type="number"
                      min={kind === 'SWIM' ? 1 : 0.1}
                      step={kind === 'SWIM' ? 1 : 0.1}
                      defaultValue={legDistanceDefault(leg, kind)}
                      placeholder={kind === 'SWIM' ? '1500' : kind === 'BIKE' ? '40' : '10'}
                      autoComplete="off"
                    />
                  </FormField>
                ) : null}
                <FormField
                  label="Target time"
                  hint={
                    raceLegSupportsStrava(kind) ? 'e.g. 1:05:00' : 'e.g. 3:30'
                  }
                >
                  <Input
                    name={`legPlannedTime_${kind}`}
                    defaultValue={leg?.plannedTime ?? ''}
                    placeholder={raceLegSupportsStrava(kind) ? '1:05:00' : '3:30'}
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Notes" hint="Optional">
                  <Input
                    name={`legPlannedNotes_${kind}`}
                    defaultValue={leg?.plannedNotes ?? ''}
                    placeholder="Pace, gear, focus…"
                    autoComplete="off"
                  />
                </FormField>
              </div>
            </div>
          )
        })}
      </div>
      {raceId ? (
        <p className="text-[11px] text-muted-foreground">
          Strava links for each sport leg are available when logging the race result.
        </p>
      ) : null}
    </div>
  )
}

type RaceLegsResultFieldsProps = {
  raceId: string
  legs: RaceLegView[]
  /** Athlete-only Strava linking controls. */
  allowStravaLink?: boolean
  className?: string
}

export function RaceLegsResultFields({
  raceId,
  legs,
  allowStravaLink = true,
  className,
}: RaceLegsResultFieldsProps) {
  const ordered = [...legs].sort((a, b) => a.sortOrder - b.sortOrder)
  const colCount = ordered.length

  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Split times
      </p>
      {/* Calculator-style horizontal splits: label · time · optional Strava */}
      <div
        className={cn(
          'tt-follow-fields grid gap-2 rounded-[6px] border border-border/60 bg-muted/5 px-2 py-2 sm:gap-0 sm:divide-x sm:divide-border/70 sm:px-0 sm:py-2',
          colCount >= 5
            ? 'grid-cols-2 sm:grid-cols-5'
            : colCount === 4
              ? 'grid-cols-2 sm:grid-cols-4'
              : colCount === 3
                ? 'grid-cols-3'
                : 'grid-cols-2',
        )}
      >
        {ordered.map((leg, index) => (
          <RaceLegResultCell
            key={leg.id}
            raceId={raceId}
            leg={leg}
            allowStravaLink={allowStravaLink}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

function RaceLegResultCell({
  raceId,
  leg,
  allowStravaLink,
  isFirst,
  isLast,
}: {
  raceId: string
  leg: RaceLegView
  allowStravaLink: boolean
  isFirst: boolean
  isLast: boolean
}) {
  const kind = leg.kind as RaceLegKind
  const supportsStrava = raceLegSupportsStrava(kind)

  return (
    <div
      className={cn(
        'min-w-0 space-y-0.5 text-center',
        isFirst && 'sm:pr-2 sm:pl-2',
        !isFirst && !isLast && 'sm:px-2',
        isLast && !isFirst && 'sm:pl-2 sm:pr-2',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {RACE_LEG_LABELS[kind]}
      </p>
      <Input
        name={`legResultTime_${kind}`}
        defaultValue={leg.resultTime ?? ''}
        placeholder={supportsStrava ? '1:05:00' : '3:30'}
        autoComplete="off"
        variant="ghost"
        align="center"
        className="h-7 min-h-0 w-full px-0 py-0 text-sm font-semibold tabular-nums tracking-tight"
        aria-label={`${RACE_LEG_LABELS[kind]} time`}
        title={
          leg.plannedTime
            ? `Plan ${leg.plannedTime}`
            : supportsStrava
              ? 'Filled from Strava when linked, or enter manually'
              : 'Transition time'
        }
      />
      <div className="flex h-6 items-center justify-center">
        {supportsStrava && allowStravaLink ? (
          <RaceStravaLinkPicker
            raceId={raceId}
            legId={leg.id}
            linkedUrl={leg.stravaActivityUrl}
            linkedName={leg.stravaActivityName}
            compact
            iconOnly
          />
        ) : supportsStrava && leg.stravaActivityUrl ? (
          <a
            href={leg.stravaActivityUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-medium text-[#FC4C02] hover:underline"
          >
            Strava
          </a>
        ) : (
          <span className="text-[10px] text-transparent" aria-hidden>
            —
          </span>
        )}
      </div>
    </div>
  )
}

type RaceLegsSummaryProps = {
  legs: RaceLegView[]
  showPlan?: boolean
  className?: string
}

export function RaceLegsSummary({ legs, showPlan = true, className }: RaceLegsSummaryProps) {
  if (legs.length === 0) return null
  const ordered = [...legs].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <ul className={cn('space-y-1.5 text-sm', className)}>
      {ordered.map((leg) => {
        const result = leg.resultTime?.trim() || null
        const plan = leg.plannedTime?.trim() || null
        if (!result && !plan && !leg.stravaActivityUrl) return null
        return (
          <li key={leg.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="w-10 shrink-0 text-xs font-semibold uppercase text-muted-foreground">
              {RACE_LEG_LABELS[leg.kind]}
            </span>
            <span className="font-medium">{result || '—'}</span>
            {showPlan && plan ? (
              <span className="text-xs text-muted-foreground">plan {plan}</span>
            ) : null}
            {leg.stravaActivityUrl ? (
              <a
                href={leg.stravaActivityUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#FC4C02] hover:underline"
              >
                Strava
              </a>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
