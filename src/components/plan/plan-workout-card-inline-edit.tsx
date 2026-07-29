'use client'

import type { ReactNode } from 'react'
import { useEffect, useState, useTransition } from 'react'
import { WorkoutType } from '@prisma/client'
import { Clock } from 'lucide-react'
import { patchPlanWorkoutCard } from '@/app/actions/workouts'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  durationUnitFromTags,
  type WorkoutDurationUnit,
} from '@/lib/workout-approx-tags'
import {
  getWorkoutCardDuration,
  getWorkoutCardHero,
} from '@/lib/workout-card'
import { cn } from '@/lib/utils'

function resolveDurationUnit(workout: PlanWorkoutDetail): WorkoutDurationUnit {
  return (
    durationUnitFromTags(workout.tags) ??
    (workout.type === WorkoutType.BIKE ? 'hours' : 'min')
  )
}

function formatDurationInput(
  minutes: number | null,
  unit: WorkoutDurationUnit,
): string {
  if (minutes == null || minutes <= 0) return ''
  if (unit === 'hours') {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}:${String(m).padStart(2, '0')}`
  }
  return String(minutes)
}

function parseDurationInput(
  raw: string,
  unit: WorkoutDurationUnit,
): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (unit === 'hours') {
    if (trimmed.includes(':')) {
      const [hPart, mPart = '0'] = trimmed.split(':')
      const h = Number.parseInt(hPart, 10)
      const m = Number.parseInt(mPart, 10)
      if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) return null
      return h * 60 + m
    }
    const hours = Number.parseFloat(trimmed)
    if (!Number.isFinite(hours) || hours < 0) return null
    return Math.round(hours * 60)
  }
  const minutes = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(minutes) || minutes < 0) return null
  return minutes
}

function formatDistanceInput(workout: PlanWorkoutDetail): string {
  if (workout.type === WorkoutType.SWIM) {
    return workout.plannedDistanceMeters != null && workout.plannedDistanceMeters > 0
      ? String(workout.plannedDistanceMeters)
      : ''
  }
  if (workout.plannedDistance == null || workout.plannedDistance <= 0) return ''
  const rounded = Math.round(workout.plannedDistance * 100) / 100
  return String(rounded)
}

function stopEditEvent(e: React.SyntheticEvent) {
  e.stopPropagation()
}

function contentWidthCh(value: string, min = 2) {
  return `${Math.max(value.length, min)}ch`
}

type PlanWorkoutCardInlineEditProps = {
  workout: PlanWorkoutDetail
  titleClassName: string
  heroClassName: string
  unitClassName: string
  durationClassName: string
  clockClassName: string
  heroPadClassName: string | null
  showSubtitle: boolean
  showDuration: boolean
  subtitle: string | null
  subtitleClassName: string
  gapClassName: string
  /** Title row only — keeps actions aligned like the read-only card. */
  titleActions?: ReactNode
}

export function PlanWorkoutCardInlineEdit({
  workout,
  titleClassName,
  heroClassName,
  unitClassName,
  durationClassName,
  clockClassName,
  heroPadClassName,
  showSubtitle,
  showDuration,
  subtitle,
  subtitleClassName,
  gapClassName,
  titleActions,
}: PlanWorkoutCardInlineEditProps) {
  const durationUnit = resolveDurationUnit(workout)
  const isSwim = workout.type === WorkoutType.SWIM
  const hero = getWorkoutCardHero(workout)
  const durationLabel = showDuration ? getWorkoutCardDuration(workout) : null
  const distanceUnit =
    hero?.kind === 'distance' && hero.unit
      ? hero.unit
      : isSwim
        ? 'm'
        : 'km'

  const [title, setTitle] = useState(workout.title)
  const [distance, setDistance] = useState(() => formatDistanceInput(workout))
  const [duration, setDuration] = useState(() =>
    formatDurationInput(workout.plannedDuration, durationUnit),
  )
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setTitle(workout.title)
    setDistance(formatDistanceInput(workout))
    setDuration(formatDurationInput(workout.plannedDuration, resolveDurationUnit(workout)))
  }, [
    workout.id,
    workout.title,
    workout.plannedDistance,
    workout.plannedDistanceMeters,
    workout.plannedDuration,
    workout.tags,
    workout.type,
  ])

  function save(patch: Parameters<typeof patchPlanWorkoutCard>[0]) {
    startTransition(async () => {
      await patchPlanWorkoutCard(patch)
    })
  }

  function commitTitle() {
    const next = title.trim()
    if (!next || next === workout.title) {
      setTitle(workout.title)
      return
    }
    save({ workoutId: workout.id, title: next })
  }

  function commitDistance() {
    const raw = distance.trim()
    if (isSwim) {
      const meters = raw === '' ? null : Number.parseInt(raw, 10)
      if (raw !== '' && (!Number.isFinite(meters) || (meters ?? 0) < 0)) {
        setDistance(formatDistanceInput(workout))
        return
      }
      const next = meters != null && meters > 0 ? meters : null
      const prev =
        workout.plannedDistanceMeters != null && workout.plannedDistanceMeters > 0
          ? workout.plannedDistanceMeters
          : null
      if (next === prev) return
      save({ workoutId: workout.id, plannedDistanceMeters: next })
      return
    }

    const km = raw === '' ? null : Number.parseFloat(raw)
    if (raw !== '' && (!Number.isFinite(km) || (km ?? 0) < 0)) {
      setDistance(formatDistanceInput(workout))
      return
    }
    const next = km != null && km > 0 ? Math.round(km * 100) / 100 : null
    const prev =
      workout.plannedDistance != null && workout.plannedDistance > 0
        ? Math.round(workout.plannedDistance * 100) / 100
        : null
    if (next === prev) return
    save({ workoutId: workout.id, plannedDistance: next })
  }

  function commitDuration() {
    const next = parseDurationInput(duration, durationUnit)
    if (duration.trim() !== '' && next == null) {
      setDuration(formatDurationInput(workout.plannedDuration, durationUnit))
      return
    }
    const normalized = next != null && next > 0 ? next : null
    const prev =
      workout.plannedDuration != null && workout.plannedDuration > 0
        ? workout.plannedDuration
        : null
    if (normalized === prev) return
    save({ workoutId: workout.id, plannedDuration: normalized })
  }

  const inputShell =
    'm-0 min-h-0 min-w-0 max-w-full appearance-none bg-transparent p-0 outline-none rounded-sm border border-transparent hover:border-[#E5E7EB]/80 focus:border-brand/40'

  const heroIsDistance = !hero || hero.kind === 'distance'
  const heroValue = heroIsDistance ? distance : duration
  const setHeroValue = heroIsDistance ? setDistance : setDuration
  const commitHero = heroIsDistance ? commitDistance : commitDuration
  const heroUnitLabel =
    hero?.unit ??
    (heroIsDistance ? distanceUnit : durationUnit === 'hours' ? 'h' : 'min')

  return (
    <div
      data-inline-edit
      className={cn(
        'flex min-w-0 flex-1 flex-col',
        showSubtitle && subtitle ? gapClassName : 'gap-0',
        pending && 'opacity-80',
      )}
      onMouseDown={stopEditEvent}
      onClick={stopEditEvent}
      onPointerDown={stopEditEvent}
    >
      <div className="flex min-w-0 items-start justify-between gap-0.5">
        <input
          type="text"
          value={title}
          aria-label="Workout title"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className={cn(inputShell, 'min-w-0 flex-1 truncate px-0', titleClassName)}
        />
        {titleActions}
      </div>

      {showSubtitle && subtitle ? (
        <p className={cn('truncate text-[#6B7280]', subtitleClassName)}>{subtitle}</p>
      ) : null}

      {hero || heroValue ? (
        <div className={cn('flex items-baseline gap-0.5', heroPadClassName)}>
          {hero?.approximate ? (
            <span className={cn('font-medium text-[#6B7280]', unitClassName)}>~</span>
          ) : null}
          <input
            type="text"
            inputMode={heroIsDistance ? 'decimal' : 'numeric'}
            value={heroValue}
            aria-label={heroIsDistance ? 'Planned distance' : 'Planned duration'}
            onChange={(e) => setHeroValue(e.target.value)}
            onBlur={commitHero}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            style={{ width: contentWidthCh(heroValue || '0', 2) }}
            className={cn(inputShell, 'px-0 tabular-nums', heroClassName)}
          />
          {heroUnitLabel ? <span className={unitClassName}>{heroUnitLabel}</span> : null}
        </div>
      ) : null}

      {showDuration && durationLabel ? (
        <div className={cn('flex items-center gap-1 text-[#6B7280]', durationClassName)}>
          {hero?.kind === 'distance' || (!hero && heroIsDistance) ? (
            <Clock className={cn(clockClassName, 'shrink-0')} aria-hidden />
          ) : null}
          {hero?.kind === 'distance' || (!hero && heroIsDistance) ? (
            <>
              <input
                type="text"
                inputMode="numeric"
                value={duration}
                aria-label={
                  durationUnit === 'hours'
                    ? 'Planned duration (h:mm)'
                    : 'Planned duration (min)'
                }
                onChange={(e) => setDuration(e.target.value)}
                onBlur={commitDuration}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                style={{ width: contentWidthCh(duration || '0', 2) }}
                className={cn(inputShell, 'px-0 tabular-nums text-[#6B7280]', durationClassName)}
              />
              <span>{durationUnit === 'hours' ? 'h' : 'min'}</span>
            </>
          ) : (
            <>
              <input
                type="text"
                inputMode="decimal"
                value={distance}
                aria-label={`Planned distance (${distanceUnit})`}
                onChange={(e) => setDistance(e.target.value)}
                onBlur={commitDistance}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                style={{ width: contentWidthCh(distance || '0', 2) }}
                className={cn(inputShell, 'px-0 tabular-nums text-[#6B7280]', durationClassName)}
              />
              <span>{distanceUnit}</span>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
