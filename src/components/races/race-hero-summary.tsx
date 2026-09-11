'use client'

import { RaceIntent } from '@prisma/client'
import { Calendar, Flag, MapPin } from 'lucide-react'
import {
  distanceSummaryLabel,
  raceFormSportFamily,
  raceFormSportLabel,
  runDistanceFromRaceType,
  sportIdFromRace,
} from '@/lib/race-form'
import { RACE_INTENT_LABELS, RACE_PRIORITY_LABELS } from '@/lib/constants'
import { resolveRaceHeroImageUrl } from '@/lib/race-hero'
import { SIDEBAR_HERO_STYLE } from '@/lib/sidebar-hero'
import { cn } from '@/lib/utils'
import type { SeasonRace } from '@/lib/season-races'
import { TriathlonDistance } from '@prisma/client'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function raceSummaryMeta(race: SeasonRace) {
  const isWatching = race.intent === RaceIntent.WATCHING
  const sportId = sportIdFromRace({
    sport: race.sport ?? 'RUN',
    type: race.type,
    courseType: race.courseType,
  })
  const sportFamily = raceFormSportFamily(sportId)
  const runDistance =
    sportFamily === 'RUN' ? runDistanceFromRaceType(race.type) : null
  const triDistance =
    sportId === 'TRIATHLON'
      ? (race.triathlonDistance ?? TriathlonDistance.OLYMPIC)
      : null
  const legs = race.legs ?? []
  const distLabel = distanceSummaryLabel({
    sportId,
    runDistance:
      sportFamily === 'RUN'
        ? runDistance
        : sportFamily === 'BIKE' || sportFamily === 'SWIM' || sportFamily === 'OTHER'
          ? 'CUSTOM'
          : null,
    triDistance,
    hyroxDistance: sportId === 'HYROX' ? (race.hyroxDivision ?? null) : null,
    customDistanceKm: race.customDistanceKm,
    customSwimKm: legs.find((l) => l.kind === 'SWIM')?.plannedDistanceKm,
    customBikeKm: legs.find((l) => l.kind === 'BIKE')?.plannedDistanceKm,
    customRunKm: legs.find((l) => l.kind === 'RUN')?.plannedDistanceKm,
  })

  return {
    isWatching,
    sportId,
    sportLabel: raceFormSportLabel(sportId),
    distLabel,
    priorityLabel: isWatching
      ? RACE_INTENT_LABELS.WATCHING
      : RACE_PRIORITY_LABELS[race.priority],
  }
}

type RaceHeroSummaryProps = {
  race: SeasonRace
  /** Flush to modal top edge. */
  flush?: boolean
  className?: string
}

export function RaceHeroSummary({ race, flush = true, className }: RaceHeroSummaryProps) {
  const { isWatching } = raceSummaryMeta(race)
  const heroImageUrl = resolveRaceHeroImageUrl({
    coverImageUrl: race.coverImageUrl,
  })

  return (
    <div
      className={cn(
        'relative isolate flex aspect-[3/1] flex-col justify-end overflow-hidden',
        flush
          ? 'rounded-none border-0 border-b border-white/10 px-5 pb-5 pt-5 sm:px-6 sm:pb-6'
          : 'rounded-[10px] border border-white/10 px-4 pb-4 pt-4 sm:px-5',
        className,
      )}
      style={heroImageUrl ? undefined : SIDEBAR_HERO_STYLE}
    >
      {heroImageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageUrl}
            alt=""
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-[72%_center]"
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#151827]/90 via-[#151827]/45 to-[#151827]/20"
            aria-hidden
          />
        </>
      ) : null}

      <div className="relative z-[1] flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-white backdrop-blur-[2px]">
          <Flag className="h-5 w-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/65">
            {isWatching ? 'Watching' : 'Race'}
          </p>
          <p className="truncate text-[17px] font-semibold leading-snug text-white">
            {race.name}
          </p>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] leading-snug text-white/80">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{formatDate(race.date)}</span>
            </span>
            <span className="hidden h-3 w-px shrink-0 bg-white/25 sm:block" aria-hidden />
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{race.location?.trim() || 'No location'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
