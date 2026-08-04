'use client'

import { RaceIntent, RacePriority } from '@prisma/client'
import { Calendar, Flag, MapPin, MoreHorizontal } from 'lucide-react'
import {
  RACE_FORM_SPORTS,
  courseTypeLabel,
  distanceSummaryLabel,
  runDistanceFromRaceType,
  sportIdFromRace,
  type RaceFormSportId,
} from '@/lib/race-form'
import { RACE_INTENT_LABELS, RACE_PRIORITY_LABELS } from '@/lib/constants'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'
import type { SeasonRace } from '@/lib/season-races'
import { TriathlonDistance } from '@prisma/client'

const HERO_GRADIENT: Record<RacePriority, string> = {
  A: 'from-white to-red-100',
  B: 'from-white to-blue-100',
  C: 'from-white to-emerald-100',
}

const HERO_ICON: Record<RacePriority, string> = {
  A: 'bg-red-500/15 text-red-700',
  B: 'bg-blue-500/15 text-blue-700',
  C: 'bg-emerald-500/15 text-emerald-800',
}

const HERO_BADGE: Record<RacePriority, string> = {
  A: 'bg-red-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-emerald-500 text-white',
}

const HERO_MUTED: Record<RacePriority, string> = {
  A: 'text-red-800/55',
  B: 'text-blue-800/55',
  C: 'text-emerald-900/50',
}

const HERO_WATCHING = {
  gradient: 'from-white to-zinc-100',
  icon: 'bg-zinc-500/15 text-zinc-700',
  badge: 'bg-zinc-500 text-white',
  muted: 'text-zinc-700/55',
} as const

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function sportLabel(id: RaceFormSportId): string {
  return RACE_FORM_SPORTS.find((s) => s.id === id)?.label ?? id
}

type RaceHeroSummaryProps = {
  race: SeasonRace
  /** Flush to modal top edge. */
  flush?: boolean
  className?: string
}

export function RaceHeroSummary({ race, flush = true, className }: RaceHeroSummaryProps) {
  const isWatching = race.intent === RaceIntent.WATCHING
  const sportId = sportIdFromRace({
    sport: race.sport ?? 'RUN',
    type: race.type,
    courseType: race.courseType,
  })
  const runDistance =
    sportId === 'RUN' ? runDistanceFromRaceType(race.type) : null
  const triDistance =
    sportId === 'TRIATHLON'
      ? (race.triathlonDistance ?? TriathlonDistance.OLYMPIC)
      : null
  const legs = race.legs ?? []
  const distLabel = distanceSummaryLabel({
    sportId,
    runDistance: sportId === 'RUN' ? runDistance : sportId === 'BIKE' || sportId === 'SWIM' || sportId === 'OTHER' ? 'CUSTOM' : null,
    triDistance,
    customDistanceKm: race.customDistanceKm,
    customSwimKm: legs.find((l) => l.kind === 'SWIM')?.plannedDistanceKm,
    customBikeKm: legs.find((l) => l.kind === 'BIKE')?.plannedDistanceKm,
    customRunKm: legs.find((l) => l.kind === 'RUN')?.plannedDistanceKm,
  })
  const SportIcon =
    sportId === 'OTHER'
      ? MoreHorizontal
      : WORKOUT_TYPE_ICONS[
          RACE_FORM_SPORTS.find((s) => s.id === sportId)?.sport ?? 'RUN'
        ]

  const gradient = isWatching ? HERO_WATCHING.gradient : HERO_GRADIENT[race.priority]
  const iconBox = isWatching ? HERO_WATCHING.icon : HERO_ICON[race.priority]
  const muted = isWatching ? HERO_WATCHING.muted : HERO_MUTED[race.priority]
  const badge = isWatching ? HERO_WATCHING.badge : HERO_BADGE[race.priority]

  return (
    <div
      className={cn(
        'relative bg-gradient-to-b',
        flush
          ? 'rounded-none border-0 border-b border-black/20 pb-5 pl-5 pr-20 pt-5 sm:pl-6'
          : 'overflow-hidden rounded-[10px] border border-black/10 px-4 pb-4 pt-4 sm:px-5',
        gradient,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]',
            iconBox,
          )}
        >
          <Flag className="h-5 w-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1 pr-10">
          <p className={cn('mb-1 text-[10px] font-semibold uppercase tracking-wider', muted)}>
            Race
          </p>
          <p className="truncate text-[17px] font-semibold leading-snug text-[#111827]">
            {race.name}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-snug text-[#6B7280]">
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {formatDate(race.date)}
          </p>
          <p className={cn('mt-1 flex items-center gap-1.5 text-[13px] leading-snug', muted)}>
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">{race.location?.trim() || 'No location'}</span>
          </p>
        </div>

        <div
          className={cn(
            'absolute flex flex-col items-center gap-0.5',
            flush ? 'right-12 top-4 sm:right-14 sm:top-5' : 'right-3 top-3',
          )}
        >
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm',
              badge,
            )}
          >
            {isWatching ? 'W' : race.priority}
          </span>
          <span className={cn('text-[10px]', muted)}>
            {isWatching ? RACE_INTENT_LABELS.WATCHING : RACE_PRIORITY_LABELS[race.priority]}
          </span>
        </div>
      </div>

      <div className="mt-4 flex min-w-0 items-stretch overflow-hidden border-t border-black/10 pt-3">
        <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-1.5 text-center">
          <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sport
          </span>
          <div className="mt-1.5 flex h-8 w-full items-center justify-center">
            <div className="inline-flex max-w-full items-center gap-1">
              <SportIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate text-sm font-semibold">{sportLabel(sportId)}</span>
            </div>
          </div>
        </div>

        <div className="w-px shrink-0 self-stretch bg-foreground/20" />

        <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-1.5 text-center">
          <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Distance
          </span>
          <div className="mt-1.5 flex h-8 w-full items-center justify-center">
            <span className="truncate text-sm font-semibold">{distLabel || '—'}</span>
          </div>
        </div>

        <div className="w-px shrink-0 self-stretch bg-foreground/20" />

        <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-1.5 text-center">
          <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Type
          </span>
          <div className="mt-1.5 flex h-8 w-full items-center justify-center">
            <span className="truncate text-sm font-semibold">
              {race.courseType ? courseTypeLabel(race.courseType) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
