'use client'

import {
  RaceIntent,
  RacePriority,
  TriathlonDistance,
} from '@prisma/client'
import { Calendar, Flag, ImagePlus, MapPin, Trash2 } from 'lucide-react'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RACE_PRIORITY_LABELS } from '@/lib/constants'
import {
  RACE_FORM_SPORT_GROUPS,
  courseTypeForSportId,
  distanceOptionGroupsForSport,
  distanceOptionsForSport,
  isHyroxDivisionId,
  raceFormSportFamily,
  resolveRaceType,
  resolveWorkoutSport,
  runDistanceFromRaceType,
  showsCustomDistance,
  showsTriCustomLegDistances,
  sportIdFromRace,
  type HyroxDivisionId,
  type RaceFormSportId,
  type RunDistancePreset,
} from '@/lib/race-form'
import { raceUsesLegs } from '@/lib/race-legs'
import { parseDateOnly, toDateKeyOrEmpty } from '@/lib/dates'
import { DateField } from '@/components/ui/date-field'
import { RaceLegsPlanFields } from '@/components/races/race-legs-fields'
import { RaceCoverCropDialog } from '@/components/races/race-cover-crop-dialog'
import { resolveRaceHeroImageUrl } from '@/lib/race-hero'
import { SIDEBAR_HERO_STYLE } from '@/lib/sidebar-hero'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import type { RaceLegView } from '@/lib/race-legs'
import type { RaceCourseType, RaceType, WorkoutType } from '@prisma/client'

const RACE_PRIORITIES = Object.keys(RACE_PRIORITY_LABELS) as RacePriority[]

const PREP_WEEK_OPTIONS = Array.from({ length: 52 }, (_, i) => i + 1)

function formatHeroDate(dateKey: string): string {
  if (!dateKey) return 'Add date'
  try {
    return parseDateOnly(dateKey).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return 'Add date'
  }
}

const PRIORITY_SEGMENT: Record<
  RacePriority,
  { active: string; idle: string }
> = {
  A: {
    active: 'border-red-400 bg-red-50 text-red-600',
    idle: 'border-border bg-background text-foreground hover:bg-muted/40',
  },
  B: {
    active: 'border-blue-400 bg-blue-50 text-blue-700',
    idle: 'border-border bg-background text-foreground hover:bg-muted/40',
  },
  C: {
    active: 'border-emerald-400 bg-emerald-50 text-emerald-800',
    idle: 'border-border bg-background text-foreground hover:bg-muted/40',
  },
}

const WATCHING_SEGMENT = {
  active: 'border-zinc-400 bg-zinc-100 text-zinc-700',
  idle: 'border-border bg-background text-foreground hover:bg-muted/40',
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
  hyroxDivision?: HyroxDivisionId | null
  customDistanceKm?: number | null
  coverImageUrl?: string | null
  legs?: RaceLegView[]
  raceId?: string
}

type RaceDetailsFieldsProps = {
  initial?: RaceFormInitialValues
  lockedIntent?: RaceIntent
  /** Editable hero (name/date/location) + labeled form fields below. */
  showSummary?: boolean
  /** Seamless modal top (no frame); use in Add Race dialog. */
  heroFlush?: boolean
  className?: string
}

export function RaceDetailsFields({
  initial,
  lockedIntent,
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

  const inferredFamily = raceFormSportFamily(inferredSport)
  const [sportId, setSportId] = useState<RaceFormSportId | null>(inferredSport)
  const [runDistance, setRunDistance] = useState<RunDistancePreset | null>(() => {
    if (!isEdit || !inferredSport || !inferredFamily) return null
    if (inferredFamily === 'RUN') {
      return initial?.type ? runDistanceFromRaceType(initial.type) : null
    }
    if (
      inferredFamily === 'BIKE' ||
      inferredFamily === 'SWIM' ||
      inferredFamily === 'OTHER'
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
  const [hyroxDistance, setHyroxDistance] = useState<HyroxDivisionId | null>(
    () =>
      inferredSport === 'HYROX' &&
      initial?.hyroxDivision &&
      isHyroxDivisionId(initial.hyroxDivision)
        ? initial.hyroxDivision
        : null,
  )
  const [intent, setIntent] = useState<RaceIntent>(
    lockedIntent ?? initial?.intent ?? RaceIntent.PLANNED,
  )
  const [name, setName] = useState(initial?.name ?? '')
  const [date, setDate] = useState(() => toDateKeyOrEmpty(initial?.date))
  const [location, setLocation] = useState(initial?.location ?? '')
  const [priority, setPriority] = useState<RacePriority>(
    initial?.priority ?? RacePriority.A,
  )
  const [customKm, setCustomKm] = useState(
    initial?.customDistanceKm != null ? String(initial.customDistanceKm) : '',
  )
  const [goal, setGoal] = useState(initial?.goal ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [prepWeeks, setPrepWeeks] = useState(
    initial?.preparationWeeks != null ? String(initial.preparationWeeks) : '',
  )
  const coverInputRef = useRef<HTMLInputElement>(null)
  const pickInputRef = useRef<HTMLInputElement>(null)
  const savedCoverUrl = initial?.coverImageUrl ?? null
  const [clearCover, setClearCover] = useState(false)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  const sportFamily = raceFormSportFamily(sportId)
  const courseType = courseTypeForSportId(sportId)
  const isWatching = intent === RaceIntent.WATCHING
  const heroImageUrl = resolveRaceHeroImageUrl({
    coverImageUrl: clearCover ? null : savedCoverUrl,
    pendingPreviewUrl,
  })
  const hasHeroImage = Boolean(heroImageUrl)
  const hasCustomCover =
    Boolean(pendingPreviewUrl) || (Boolean(savedCoverUrl) && !clearCover)

  function assignCoverFile(file: File) {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    const url = URL.createObjectURL(file)
    setPendingPreviewUrl(url)
    setClearCover(false)
    setCoverError(null)
    if (coverInputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      coverInputRef.current.files = dt.files
    }
  }

  function clearCustomCover() {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    setPendingPreviewUrl(null)
    setClearCover(Boolean(savedCoverUrl))
    setCoverError(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCoverError('Use a JPEG, PNG, or WebP image.')
      return
    }
    setCoverError(null)
    setCropFile(file)
  }
  const raceType = resolveRaceType({
    sportId,
    runDistance:
      sportFamily === 'RUN' ||
      sportFamily === 'BIKE' ||
      sportFamily === 'SWIM' ||
      sportFamily === 'OTHER'
        ? runDistance
        : null,
    triDistance: sportId === 'TRIATHLON' ? triDistance : null,
  })
  const sport = resolveWorkoutSport(sportId)
  const distanceOptions = distanceOptionsForSport(sportId)
  const distanceGroups = distanceOptionGroupsForSport(sportId)
  const showCustomKm = showsCustomDistance(sportId, runDistance, triDistance)
  const showTriLegDistances = showsTriCustomLegDistances(sportId, triDistance)

  const distanceSelectValue =
    sportFamily === 'RUN'
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
    const family = raceFormSportFamily(next)
    setRunDistance(
      family === 'BIKE' || family === 'SWIM' || family === 'OTHER' ? 'CUSTOM' : null,
    )
    setTriDistance(null)
    setHyroxDistance(null)
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
    if (sportFamily === 'RUN') {
      setRunDistance(value as RunDistancePreset)
      return
    }
    if (sportId === 'TRIATHLON') {
      setTriDistance(value as TriathlonDistance)
      return
    }
    if (sportId === 'HYROX') {
      setHyroxDistance(isHyroxDivisionId(value) ? value : null)
      return
    }
    setRunDistance(value === 'CUSTOM' ? 'CUSTOM' : null)
  }

  return (
    <div className={cn(heroFlush ? 'space-y-0' : 'space-y-4', className)}>
      <input type="hidden" name="type" value={raceType} />
      <input type="hidden" name="sport" value={sportId ? sport : ''} />
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
      {sportId === 'HYROX' && hyroxDistance ? (
        <input type="hidden" name="hyroxDivision" value={hyroxDistance} />
      ) : (
        <input type="hidden" name="hyroxDivision" value="" />
      )}
      {showCustomKm ? (
        <input type="hidden" name="customDistanceKm" value={customKm} />
      ) : (
        <input type="hidden" name="customDistanceKm" value="" />
      )}
      <input type="hidden" name="priority" value={priority} />
      <input type="hidden" name="intent" value={intent} />

      {showSummary ? (
        <>
          <input
            ref={coverInputRef}
            type="file"
            name="cover"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          {clearCover ? <input type="hidden" name="clearCover" value="1" /> : null}
          <input
            ref={pickInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onCoverPick}
          />
          <div
            className={cn(
              'relative isolate flex aspect-[3/1] flex-col justify-end overflow-hidden',
              heroFlush
                ? 'rounded-none border-0 border-b border-white/10 px-5 pb-5 pt-5 sm:px-6 sm:pb-6'
                : 'rounded-[10px] border border-white/10 px-4 pb-4 pt-4 sm:px-5',
            )}
            style={hasHeroImage ? undefined : SIDEBAR_HERO_STYLE}
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

            <div
              className={cn(
                'absolute z-10 flex items-center gap-1',
                heroFlush
                  ? 'right-11 top-3 sm:right-12'
                  : 'right-3 top-3 sm:right-4 sm:top-4',
              )}
            >
              {hasCustomCover ? (
                <button
                  type="button"
                  onClick={clearCustomCover}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-black/35 text-white transition-colors hover:bg-black/50"
                  aria-label="Remove cover photo"
                  title="Remove cover photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => pickInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black/35 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-black/50"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Cover
              </button>
            </div>

            <div className="relative z-[1] flex items-start gap-3 pr-20 sm:pr-24">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-white backdrop-blur-[2px]">
                <Flag className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/65">
                  {isWatching ? 'Watching' : 'Race'}
                </p>
                <p
                  className={cn(
                    'truncate text-[17px] font-semibold leading-snug text-white',
                    !name.trim() && 'opacity-45',
                  )}
                >
                  {name.trim() || 'Race name'}
                </p>
                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] leading-snug text-white/80">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    <span className={cn('truncate', !date && 'opacity-55')}>
                      {formatHeroDate(date)}
                    </span>
                  </span>
                  <span className="hidden h-3 w-px shrink-0 bg-white/25 sm:block" aria-hidden />
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    <span className={cn('truncate', !location.trim() && 'opacity-55')}>
                      {location.trim() || 'No location'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            {coverError ? (
              <p className="relative z-[1] mt-2 text-xs text-red-200">{coverError}</p>
            ) : null}
          </div>
          <RaceCoverCropDialog
            file={cropFile}
            open={Boolean(cropFile)}
            onOpenChange={(open) => {
              if (!open) setCropFile(null)
            }}
            onConfirm={(file) => {
              setCropFile(null)
              assignCoverFile(file)
            }}
          />
        </>
      ) : null}

      <div
        className={cn(
          'space-y-4',
          heroFlush && 'px-5 py-4 sm:px-6 sm:py-5',
        )}
      >
        <FormField label="Race name">
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus={!initial?.name}
            placeholder="Race name"
            autoComplete="off"
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Date">
            <DateField
              name="date"
              value={date}
              onChange={setDate}
              required
              placeholder="Pick a date"
            />
          </FormField>
          <FormField label="Location">
            <Input
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, country"
              autoComplete="off"
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Sport">
            <Select
              aria-label="Sport"
              required
              value={sportId ?? ''}
              onChange={(e) => {
                const v = e.target.value
                selectSport(v ? (v as RaceFormSportId) : null)
              }}
            >
              <option value="">Select</option>
              {RACE_FORM_SPORT_GROUPS.map((group) =>
                group.label ? (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  group.options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))
                ),
              )}
            </Select>
          </FormField>

          <FormField label="Distance">
            <Select
              aria-label="Distance"
              disabled={!sportId}
              required={
                sportFamily === 'HYROX' ||
                sportFamily === 'RUN' ||
                sportFamily === 'TRIATHLON'
              }
              value={distanceSelectValue}
              onChange={(e) => onDistanceChange(e.target.value)}
            >
              <option value="">Select</option>
              {distanceGroups
                ? distanceGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))
                : distanceOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
            </Select>
            {showCustomKm ? (
              <Input
                type="number"
                min={0.1}
                step="0.1"
                value={customKm}
                onChange={(e) => setCustomKm(e.target.value)}
                placeholder="Distance (km)"
                aria-label="Custom distance km"
                className="mt-2"
              />
            ) : null}
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-caption font-medium text-text-secondary">Priority</p>
            <div className="grid grid-cols-4 gap-2">
              {RACE_PRIORITIES.map((p) => {
                const active = !isWatching && priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setIntent(RaceIntent.PLANNED)
                      setPriority(p)
                    }}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-[8px] border text-sm font-semibold transition',
                      active ? PRIORITY_SEGMENT[p].active : PRIORITY_SEGMENT[p].idle,
                    )}
                    aria-pressed={active}
                    aria-label={`Priority ${p} — ${RACE_PRIORITY_LABELS[p]}`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setIntent(RaceIntent.WATCHING)}
                className={cn(
                  'flex h-10 items-center justify-center rounded-[8px] border px-1 text-[11px] font-semibold leading-tight transition sm:text-xs',
                  isWatching ? WATCHING_SEGMENT.active : WATCHING_SEGMENT.idle,
                )}
                aria-pressed={isWatching}
                aria-label="Watching"
              >
                Watching
              </button>
            </div>
          </div>

          <FormField label="Goal">
            <Input
              name="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Sub 3:30"
              autoComplete="off"
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Preparation time">
            <Select
              name="preparationWeeks"
              value={prepWeeks}
              onChange={(e) => setPrepWeeks(e.target.value)}
            >
              <option value="">Not set</option>
              {PREP_WEEK_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? 'week' : 'weeks'}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Link">
            <Input
              name="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              autoComplete="off"
            />
          </FormField>
        </div>

        {raceUsesLegs(raceType) ? (
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
