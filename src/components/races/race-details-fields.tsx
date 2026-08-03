'use client'

import {
  RaceCourseType,
  RaceIntent,
  RacePriority,
  TriathlonDistance,
} from '@prisma/client'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Calendar, Flag, MapPin, MoreHorizontal } from 'lucide-react'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RACE_INTENT_LABELS, RACE_PRIORITY_LABELS } from '@/lib/constants'
import {
  RACE_FORM_SPORTS,
  courseTypeLabel,
  courseTypesForSport,
  distanceOptionsForSport,
  resolveRaceType,
  resolveWorkoutSport,
  runDistanceFromRaceType,
  showsCustomDistance,
  showsTriCustomLegDistances,
  sportIdFromRace,
  type RaceFormSportId,
  type RunDistancePreset,
} from '@/lib/race-form'
import { raceUsesLegs } from '@/lib/race-legs'
import { RaceLegsPlanFields } from '@/components/races/race-legs-fields'
import { PLANNER_PRIORITY_DOT } from '@/lib/season-planner'
import { WORKOUT_TYPE_ICONS } from '@/lib/workout-display'
import { cn } from '@/lib/utils'
import { useRef, useState } from 'react'
import type { RaceLegView } from '@/lib/race-legs'
import type { RaceType, WorkoutType } from '@prisma/client'

const RACE_PRIORITIES = Object.keys(RACE_PRIORITY_LABELS) as RacePriority[]

const HERO_GRADIENT: Record<RacePriority, string> = {
  A: 'from-white to-red-100',
  B: 'from-white to-blue-100',
  C: 'from-white to-amber-100',
}

const HERO_ICON: Record<RacePriority, string> = {
  A: 'bg-red-500/15 text-red-700',
  B: 'bg-blue-500/15 text-blue-700',
  C: 'bg-amber-500/15 text-amber-800',
}

const HERO_BADGE: Record<RacePriority, string> = {
  A: 'bg-red-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-amber-500 text-white',
}

const HERO_MUTED: Record<RacePriority, string> = {
  A: 'text-red-800/55',
  B: 'text-blue-800/55',
  C: 'text-amber-900/50',
}

const HERO_WATCHING = {
  gradient: 'from-white to-zinc-100',
  icon: 'bg-zinc-500/15 text-zinc-700',
  badge: 'bg-zinc-500 text-white',
  muted: 'text-zinc-700/55',
} as const

export type RaceFormInitialValues = {
  name?: string
  date?: string
  location?: string | null
  goal?: string | null
  url?: string | null
  preparationWeeks?: number | null
  priority?: RacePriority
  intent?: RaceIntent
  sport?: WorkoutType
  type?: RaceType
  courseType?: RaceCourseType | null
  triathlonDistance?: TriathlonDistance | null
  customDistanceKm?: number | null
  legs?: RaceLegView[]
  raceId?: string
}

type RaceDetailsFieldsProps = {
  initial?: RaceFormInitialValues
  lockedIntent?: RaceIntent
  showIntent?: boolean
  /** Hero card + Sport/Distance/Type metrics row. */
  showSummary?: boolean
  /** Seamless modal top (no frame); use in Add Race dialog. */
  heroFlush?: boolean
  className?: string
}

function formatSummaryDate(iso: string): string {
  if (!iso) return 'Add date'
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return 'Add date'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function RaceDetailsFields({
  initial,
  lockedIntent,
  showIntent = true,
  showSummary = true,
  heroFlush = false,
  className,
}: RaceDetailsFieldsProps) {
  const isEdit = Boolean(initial?.type || initial?.sport)
  const inferredSport = isEdit
    ? sportIdFromRace({
        sport: initial!.sport ?? 'RUN',
        type: initial!.type ?? 'MARATHON',
        courseType: initial?.courseType,
      })
    : null

  const [sportId, setSportId] = useState<RaceFormSportId | null>(inferredSport)
  const [runDistance, setRunDistance] = useState<RunDistancePreset | null>(() => {
    if (!isEdit || !inferredSport) return null
    if (inferredSport === 'RUN') {
      return initial?.type ? runDistanceFromRaceType(initial.type) : null
    }
    if (
      inferredSport === 'BIKE' ||
      inferredSport === 'SWIM' ||
      inferredSport === 'OTHER'
    ) {
      return initial?.customDistanceKm != null ? 'CUSTOM' : null
    }
    return null
  })
  const [triDistance, setTriDistance] = useState<TriathlonDistance | null>(
    () =>
      inferredSport === 'TRIATHLON'
        ? (initial?.triathlonDistance ?? null)
        : null,
  )
  const [hyroxDistance, setHyroxDistance] = useState<'STANDARD' | null>(
    () => (inferredSport === 'HYROX' ? 'STANDARD' : null),
  )
  const [courseType, setCourseType] = useState<RaceCourseType | null>(
    () => initial?.courseType ?? null,
  )
  const [intent, setIntent] = useState<RaceIntent>(
    lockedIntent ?? initial?.intent ?? RaceIntent.PLANNED,
  )
  const [name, setName] = useState(initial?.name ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [priority, setPriority] = useState<RacePriority>(
    initial?.priority ?? RacePriority.A,
  )
  const [customKm, setCustomKm] = useState(
    initial?.customDistanceKm != null ? String(initial.customDistanceKm) : '',
  )
  const dateInputRef = useRef<HTMLInputElement>(null)

  const isWatching = intent === RaceIntent.WATCHING
  const headerPriority = priority
  const heroGradient = isWatching ? HERO_WATCHING.gradient : HERO_GRADIENT[headerPriority]
  const heroIcon = isWatching ? HERO_WATCHING.icon : HERO_ICON[headerPriority]
  const heroMuted = isWatching ? HERO_WATCHING.muted : HERO_MUTED[headerPriority]
  const heroBadge = isWatching ? HERO_WATCHING.badge : HERO_BADGE[headerPriority]
  const raceType = resolveRaceType({
    sportId,
    runDistance:
      sportId === 'RUN' || sportId === 'BIKE' || sportId === 'SWIM' || sportId === 'OTHER'
        ? runDistance
        : null,
    triDistance: sportId === 'TRIATHLON' ? triDistance : null,
  })
  const sport = resolveWorkoutSport(sportId)
  const courseOptions = courseTypesForSport(sportId)
  const distanceOptions = distanceOptionsForSport(sportId)
  const showCustomKm = showsCustomDistance(sportId, runDistance, triDistance)
  const showTriLegDistances = showsTriCustomLegDistances(sportId, triDistance)

  const distanceSelectValue =
    sportId === 'RUN'
      ? (runDistance ?? '')
      : sportId === 'TRIATHLON'
        ? (triDistance ?? '')
        : sportId === 'HYROX'
          ? (hyroxDistance ?? '')
          : sportId
            ? (runDistance ?? '')
            : ''

  function selectSport(next: RaceFormSportId | null) {
    setSportId(next)
    setRunDistance(null)
    setTriDistance(null)
    setHyroxDistance(null)
    setCourseType(null)
    setCustomKm('')
  }

  function onDistanceChange(value: string) {
    if (!value) {
      setRunDistance(null)
      setTriDistance(null)
      setHyroxDistance(null)
      setCustomKm('')
      return
    }
    if (sportId === 'RUN') {
      setRunDistance(value as RunDistancePreset)
      return
    }
    if (sportId === 'TRIATHLON') {
      setTriDistance(value as TriathlonDistance)
      return
    }
    if (sportId === 'HYROX') {
      setHyroxDistance('STANDARD')
      return
    }
    setRunDistance(value === 'CUSTOM' ? 'CUSTOM' : null)
  }

  function openDatePicker() {
    const el = dateInputRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
      el.click()
    }
  }

  const metricSelectClass =
    'h-8 w-full max-w-full cursor-pointer appearance-none border-0 bg-transparent bg-none px-0 text-center text-sm font-semibold text-foreground outline-none focus:ring-0'

  const SportIcon = !sportId
    ? null
    : sportId === 'OTHER'
      ? MoreHorizontal
      : WORKOUT_TYPE_ICONS[sport]

  return (
    <div className={cn(heroFlush ? 'space-y-0' : 'space-y-4', className)}>
      <input type="hidden" name="type" value={raceType} />
      <input type="hidden" name="sport" value={sportId ? sport : ''} />
      <input type="hidden" name="name" value={name} required />
      <input type="hidden" name="date" value={date} required />
      <input type="hidden" name="location" value={location} />
      {courseType ? (
        <input type="hidden" name="courseType" value={courseType} />
      ) : (
        <input type="hidden" name="courseType" value="" />
      )}
      {sportId === 'TRIATHLON' && triDistance ? (
        <input type="hidden" name="triathlonDistance" value={triDistance} />
      ) : (
        <input type="hidden" name="triathlonDistance" value="" />
      )}
      {showCustomKm ? (
        <input type="hidden" name="customDistanceKm" value={customKm} />
      ) : (
        <input type="hidden" name="customDistanceKm" value="" />
      )}
      {!isWatching ? (
        <input type="hidden" name="priority" value={priority} />
      ) : (
        <input type="hidden" name="priority" value={RacePriority.C} />
      )}
      {showIntent && !lockedIntent ? null : (
        <input type="hidden" name="intent" value={intent} />
      )}

      {/* Hidden native date input for hero date control */}
      <input
        ref={dateInputRef}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />

      {showSummary ? (
        <div
          className={cn(
            'relative bg-gradient-to-b',
            heroFlush
              ? 'rounded-none border-0 border-b border-black/20 pb-5 pl-5 pr-20 pt-5 sm:pl-6'
              : 'overflow-hidden rounded-[10px] border border-black/10 px-4 pb-4 pt-4 sm:px-5',
            heroGradient,
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]',
                heroIcon,
              )}
            >
              <Flag className="h-5 w-5" strokeWidth={2} />
            </div>

            <div className="min-w-0 flex-1 pr-10">
              <p
                className={cn(
                  'mb-1 text-[10px] font-semibold uppercase tracking-wider',
                  heroMuted,
                )}
              >
                Race
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Race name"
                required
                autoFocus={!initial?.name}
                placeholder="Race name"
                className="w-full bg-transparent text-[17px] font-semibold leading-snug text-[#111827] outline-none placeholder:text-muted-foreground/45"
              />

              <button
                type="button"
                onClick={openDatePicker}
                className={cn(
                  'mt-1.5 flex items-center gap-1.5 text-left text-[13px] leading-snug transition hover:opacity-80',
                  date ? 'text-[#6B7280]' : heroMuted,
                )}
              >
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className={cn(!date && 'italic')}>{formatSummaryDate(date)}</span>
              </button>

              <div className="mt-1 flex items-center gap-1.5">
                <MapPin
                  className={cn('h-3.5 w-3.5 shrink-0 opacity-70', heroMuted)}
                />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  aria-label="Location"
                  placeholder="Add location"
                  className="min-w-0 flex-1 bg-transparent text-[13px] leading-snug text-[#6B7280] outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <div
              className={cn(
                'absolute',
                heroFlush ? 'right-12 top-4 sm:right-14 sm:top-5' : 'right-3 top-3',
              )}
            >
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="flex flex-col items-center gap-0.5 rounded-[8px] px-1 py-0.5 outline-none transition hover:bg-black/[0.04]"
                    title={isWatching ? 'Change status' : 'Change priority'}
                    aria-label={isWatching ? 'Change status' : 'Change priority'}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm',
                        heroBadge,
                      )}
                    >
                      {isWatching ? 'W' : priority}
                    </span>
                    <span className={cn('text-[10px]', heroMuted)}>
                      {isWatching ? 'Watching' : 'Priority'}
                    </span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    className="z-[220] min-w-[9.5rem] overflow-hidden rounded-[8px] border border-border/70 bg-white py-1 shadow-md"
                  >
                    {RACE_PRIORITIES.map((p) => (
                      <DropdownMenu.Item
                        key={p}
                        onSelect={() => {
                          setIntent(RaceIntent.PLANNED)
                          setPriority(p)
                        }}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs outline-none data-[highlighted]:bg-muted/60',
                          !isWatching && priority === p && 'bg-muted/40 font-semibold',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                            PLANNER_PRIORITY_DOT[p],
                          )}
                        >
                          {p}
                        </span>
                        {RACE_PRIORITY_LABELS[p]}
                      </DropdownMenu.Item>
                    ))}
                    <DropdownMenu.Item
                      onSelect={() => setIntent(RaceIntent.WATCHING)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 border-t border-border/50 px-3 py-1.5 text-xs outline-none data-[highlighted]:bg-muted/60',
                        isWatching && 'bg-muted/40 font-semibold',
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-500 text-[10px] font-bold text-white">
                        W
                      </span>
                      {RACE_INTENT_LABELS.WATCHING}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>

          {/* Sport / Distance / Type — workout-style metrics row */}
          <div className="mt-4 flex min-w-0 items-stretch overflow-hidden border-t border-black/10 pt-3">
            <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-1.5 text-center">
              <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sport
              </span>
              <div className="mt-1.5 flex h-8 w-full items-center justify-center">
                <div className="inline-flex max-w-full items-center gap-1">
                  {SportIcon ? (
                    <SportIcon
                      className="pointer-events-none h-3.5 w-3.5 shrink-0 text-foreground"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                  <select
                    aria-label="Sport"
                    required
                    value={sportId ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      selectSport(v ? (v as RaceFormSportId) : null)
                    }}
                    className={cn(
                      metricSelectClass,
                      'w-auto min-w-0',
                      !sportId && 'font-medium text-muted-foreground',
                    )}
                  >
                    <option value="">Select</option>
                    {RACE_FORM_SPORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="w-px shrink-0 self-stretch bg-foreground/20" />

            <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-1.5 text-center">
              <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Distance
              </span>
              <div className="mt-1.5 flex h-8 w-full flex-col items-center justify-center gap-1">
                <select
                  aria-label="Distance"
                  disabled={!sportId}
                  value={distanceSelectValue}
                  onChange={(e) => onDistanceChange(e.target.value)}
                  className={cn(
                    metricSelectClass,
                    !distanceSelectValue && 'font-medium text-muted-foreground',
                  )}
                >
                  <option value="">Select</option>
                  {distanceOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {showCustomKm ? (
                <input
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={customKm}
                  onChange={(e) => setCustomKm(e.target.value)}
                  placeholder="km"
                  aria-label="Custom distance km"
                  className="mt-1 w-full max-w-[5.5rem] border-0 border-b border-foreground/20 bg-transparent pb-0.5 text-center text-xs tabular-nums outline-none placeholder:text-muted-foreground/40 focus:border-foreground/40"
                />
              ) : null}
            </div>

            <div className="w-px shrink-0 self-stretch bg-foreground/20" />

            <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-1.5 text-center">
              <span className="flex h-4 shrink-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Type
              </span>
              <div className="mt-1.5 flex h-8 w-full items-center justify-center">
                <select
                  aria-label="Type"
                  disabled={!sportId}
                  value={courseType ?? ''}
                  onChange={(e) =>
                    setCourseType(
                      e.target.value ? (e.target.value as RaceCourseType) : null,
                    )
                  }
                  className={cn(
                    metricSelectClass,
                    !courseType && 'font-medium text-muted-foreground',
                  )}
                >
                  <option value="">Select</option>
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      {courseTypeLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'space-y-4',
          heroFlush && showSummary && 'px-5 py-4 sm:px-6 sm:py-5',
          !showSummary && heroFlush && 'px-5 py-4 sm:px-6',
        )}
      >
        {showIntent && !lockedIntent ? (
          <FormField label="Intent">
            <Select
              name="intent"
              required
              value={intent}
              onChange={(e) => setIntent(e.target.value as RaceIntent)}
            >
              <option value={RaceIntent.PLANNED}>{RACE_INTENT_LABELS.PLANNED}</option>
              <option value={RaceIntent.WATCHING}>{RACE_INTENT_LABELS.WATCHING}</option>
            </Select>
          </FormField>
        ) : null}

        {!isWatching ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Goal (optional)">
              <Input
                name="goal"
                placeholder="e.g. Sub 3:30"
                defaultValue={initial?.goal ?? ''}
              />
            </FormField>
            <FormField label="Preparation (weeks, optional)">
              <Input
                name="preparationWeeks"
                type="number"
                min={1}
                max={52}
                placeholder="e.g. 12"
                defaultValue={
                  initial?.preparationWeeks != null
                    ? String(initial.preparationWeeks)
                    : ''
                }
              />
            </FormField>
            <FormField label="Link (optional)">
              <Input
                name="url"
                type="url"
                placeholder="https://"
                defaultValue={initial?.url ?? ''}
              />
            </FormField>
          </div>
        ) : (
          <FormField label="Link" hint="Registration or race info URL">
            <Input
              name="url"
              type="url"
              placeholder="https://"
              defaultValue={initial?.url ?? ''}
            />
          </FormField>
        )}

        {!isWatching && raceUsesLegs(raceType) ? (
          <RaceLegsPlanFields
            key={`tri-legs-${showTriLegDistances ? 'custom' : 'preset'}`}
            raceId={initial?.raceId}
            legs={initial?.legs}
            showDistances={showTriLegDistances}
          />
        ) : null}
      </div>
    </div>
  )
}
